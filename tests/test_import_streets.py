import contextlib
import gzip
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import import_streets


class StreetImportTests(unittest.TestCase):
    def test_bilingual_names_preserve_geometry_and_prefer_explicit_language_tags(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            (root / 'scripts').mkdir()
            (root / 'data/raw').mkdir(parents=True)
            (root / 'scripts/seoul_streets.overpass').write_text('fixture query')
            (root / 'data/manifest.json').write_text('{"files":[]}')
            geometry = [{'lat': 37.5, 'lon': 127}, {'lat': 37.51, 'lon': 127}]
            source = root / 'data/raw/bilingual.json'
            source.write_text(json.dumps({'elements': [
                {'tags': {'name:en': 'Hangang-daero', 'name': '한강대로'}, 'geometry': geometry},
                {'tags': {'name:en': 'Sejong-daero', 'name': 'Sejong road', 'name:ko': '세종대로'}, 'geometry': geometry},
                {'tags': {'name': '이름뿐인길'}, 'geometry': geometry},
                {'tags': {'name:en': 'English only'}, 'geometry': geometry},
            ]}, ensure_ascii=False))
            with patch.object(import_streets, 'ROOT', root), patch(
                    'sys.argv', ['import_streets.py', '--source', str(source)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                import_streets.main()
            streets = json.loads(gzip.decompress((root / 'data/processed/seoul_streets.json.gz').read_bytes()))['streets']
            points = [[37.5, 127], [37.51, 127]]
            self.assertEqual(streets, [
                ['Hangang-daero', points, '한강대로'],
                ['Sejong-daero', points, '세종대로'],
                ['이름뿐인길', points],
                ['English only', points],
            ])

    def test_explicit_replacement_preserves_download_provenance(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            raw = root / 'data/raw'
            raw.mkdir(parents=True)
            (root / 'scripts').mkdir()
            (root / 'scripts/seoul_streets.overpass').write_text('fixture query')
            source = raw / 'seoul_streets_osm.json'
            source.write_text(json.dumps({'elements': [{
                'tags': {'name': 'New road'},
                'geometry': [{'lat': 37.5, 'lon': 127}, {'lat': 37.51, 'lon': 127}]}]}))
            # Explicit replacement must win over a previous default gzip source.
            source.with_suffix('.json.gz').write_bytes(gzip.compress(b'{}'))
            manifest = root / 'data/manifest.json'
            url = 'https://example.test/actual-download'
            manifest.write_text(json.dumps({'files': [{
                'path': str(source.relative_to(root)), 'url': url}]}))
            with patch.object(import_streets, 'ROOT', root), patch(
                    'sys.argv', ['import_streets.py', '--source', str(source)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                import_streets.main()
            output = root / 'data/processed/seoul_streets.json.gz'
            self.assertEqual(json.loads(gzip.decompress(output.read_bytes()))['streets'][0][0], 'New road')
            records = json.loads(manifest.read_text())['files']
            self.assertEqual(records[0]['url'], url)
            self.assertEqual(records[0]['bytes'], source.stat().st_size)
            self.assertEqual(len(records[0]['sha256']), 64)
