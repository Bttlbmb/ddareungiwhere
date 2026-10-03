import math
import json
import gzip
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts.lib.export_data import export_streets
from scripts.lib.street_index import StreetNames, segment_distance


class StreetTests(unittest.TestCase):
    def test_export_requires_retained_street_geometry(self):
        with tempfile.TemporaryDirectory() as folder, patch(
                'scripts.lib.street_index.StreetNames', return_value=StreetNames(streets=[])):
            with self.assertRaisesRegex(ValueError, 'missing or empty'):
                export_streets(Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_bilingual_names_select_the_same_segment_and_legacy_names_fall_back(self):
        source = [
            ['Long road', [[37.5, 127], [37.5, 127.02]], '긴길'],
            ['Other road', [[37.501, 127.009], [37.501, 127.011]], '다른길'],
            ['English only', [[37.6, 127.1], [37.601, 127.1]]],
        ]
        bilingual = StreetNames(streets=source)
        legacy = StreetNames(streets=[street[:2] for street in source])
        self.assertEqual(bilingual.geometry, legacy.geometry)
        self.assertEqual(bilingual.cells, legacy.cells)
        for lat, lng, expected_ko in [(37.5001, 127.01, '긴길'), (37.501, 127.01, '다른길'),
                                     (37.6005, 127.1, 'English only'), (37.7, 127.2, None)]:
            with self.subTest(point=(lat, lng)):
                old = legacy.lookup(lat, lng)
                result = bilingual.lookup(lat, lng)
                self.assertEqual(result['label_ko'], expected_ko)
                self.assertEqual(old['label_ko'], old['label'])
                self.assertEqual({key: value for key, value in result.items() if key != 'label_ko'},
                                 {key: value for key, value in old.items() if key != 'label_ko'})

    def test_export_adds_korean_without_changing_segments_or_cell_ids(self):
        streets = StreetNames(streets=[
            ['Long road', [[37.5, 127], [37.5, 127.02]], '긴길'],
            ['English only', [[37.501, 127], [37.501, 127.02]]],
        ])
        with tempfile.TemporaryDirectory() as folder, patch(
                'scripts.lib.street_index.StreetNames', return_value=streets):
            destination = Path(folder)
            count = export_streets(destination)
            shards = list((destination / 'streets').glob('*.json.gz'))
            self.assertEqual(count, len(shards))
            for shard in shards:
                payload = json.loads(gzip.decompress(shard.read_bytes()))
                for segment in payload['segments']:
                    segment_id, name, *rest = segment
                    self.assertEqual(name, streets.names[segment_id])
                    self.assertEqual(rest[:4], list(streets.geometry[segment_id * 4:segment_id * 4 + 4]))
                    self.assertEqual(rest[4:], ['긴길'] if segment_id == 0 else [])
                for key, ids in payload['cells'].items():
                    self.assertEqual(ids, list(streets.cells[tuple(map(int, key.split(',')))]))

    def test_nearest_segment_interior_not_just_nearest_vertex(self):
        streets = StreetNames(streets=[
            ['Long street', [[37.5, 127.0], [37.5, 127.02]]],
            ['Other street', [[37.501, 127.009], [37.501, 127.011]]]])
        result = streets.lookup(37.5001, 127.01)
        self.assertEqual(result['label'], 'Long street')
        self.assertAlmostEqual(result['distance_m'], 11, delta=1)

    def test_cell_boundaries_and_unknown_area(self):
        streets = StreetNames(streets=[['Nearby road', [[37.5, 127.0], [37.501, 127.0]]]])
        self.assertEqual(streets.lookup(37.5005, 126.9999)['label'], 'Nearby road')
        self.assertIsNone(streets.lookup(37.6, 127.1)['label'])
        self.assertIsNone(StreetNames(streets=[]).lookup(37.5, 127)['label'])

    def test_invalid_coordinates_and_zero_length_segment(self):
        for lat, lng in [(math.nan, 127), (37.5, math.inf), (0, 0)]:
            with self.assertRaises(ValueError):
                StreetNames(streets=[]).lookup(lat, lng)
        self.assertEqual(segment_distance((37.5, 127), (37.5, 127), (37.5, 127)), 0)
