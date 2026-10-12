import json
import gzip
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts.lib.export_data import export_streets
from scripts.lib.street_index import StreetNames


class StreetTests(unittest.TestCase):
    def test_export_requires_retained_street_geometry(self):
        with tempfile.TemporaryDirectory() as folder, patch(
                'scripts.lib.street_index.StreetNames', return_value=StreetNames(streets=[])):
            with self.assertRaisesRegex(ValueError, 'missing or empty'):
                export_streets(Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_korean_names_do_not_change_geometry_or_cells_and_fall_back_to_english(self):
        source = [
            ['Long road', [[37.5, 127], [37.5, 127.02]], '긴길'],
            ['English only', [[37.6, 127.1], [37.601, 127.1]]],
        ]
        bilingual = StreetNames(streets=source)
        legacy = StreetNames(streets=[street[:2] for street in source])
        self.assertEqual(bilingual.geometry, legacy.geometry)
        self.assertEqual(bilingual.cells, legacy.cells)
        self.assertEqual(bilingual.names_ko, ['긴길', 'English only'])
        self.assertEqual(legacy.names_ko, legacy.names)

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

    def test_exported_cells_use_the_grid_the_browser_searches(self):
        # streets.mjs hardcodes 0.005-degree cells in 10-cell shards.
        streets = StreetNames(streets=[['Grid road', [[37.5001, 127.0001], [37.5001, 127.0121]]]])
        with tempfile.TemporaryDirectory() as folder, patch(
                'scripts.lib.street_index.StreetNames', return_value=streets):
            export_streets(Path(folder))
            shards = {path.name: json.loads(gzip.decompress(path.read_bytes()))
                      for path in (Path(folder) / 'streets').glob('*.json.gz')}
        self.assertEqual(list(shards), ['750_2540.json.gz'])
        self.assertEqual(sorted(shards['750_2540.json.gz']['cells']), ['7500,25400', '7500,25401', '7500,25402'])
