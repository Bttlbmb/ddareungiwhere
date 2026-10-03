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

    @staticmethod
    def prepare_fixture(root):
        (root / 'scripts').mkdir(parents=True)
        (root / 'data/raw').mkdir(parents=True)
        (root / 'data/processed').mkdir()
        (root / 'scripts/seoul_streets.overpass').write_text('fixture query')
        source = root / 'data/raw/replacement.json'
        source.write_text(json.dumps({'elements': [{
            'tags': {'name': 'Replacement road'},
            'geometry': [{'lat': 37.5, 'lon': 127}, {'lat': 37.51, 'lon': 127}]}]}))
        output = root / 'data/processed/seoul_streets.json.gz'
        output.write_bytes(gzip.compress(b'{"streets":[]}'))
        manifest = root / 'data/manifest.json'
        manifest.write_text('{"files":[]}')
        return source, output, manifest

    def test_external_source_is_rejected_before_replacing_dataset(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve() / 'project'
            source, output, manifest = self.prepare_fixture(root)
            external = root.parent / 'external.json'
            external.write_bytes(source.read_bytes())
            link = root / 'data/raw/external-link.json'
            link.symlink_to(external)
            before = output.read_bytes(), manifest.read_bytes()
            for selected in [external, link]:
                with self.subTest(source=selected):
                    with patch.object(import_streets, 'ROOT', root), patch(
                            'sys.argv', ['import_streets.py', '--source', str(selected)]):
                        with self.assertRaisesRegex(SystemExit, 'copy the response under data/raw'):
                            import_streets.main()
                    self.assertEqual((output.read_bytes(), manifest.read_bytes()), before)
                    self.assertFalse(output.with_suffix('.gz.part').exists())

    def test_unreadable_or_invalid_manifest_preserves_dataset(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            source, output, manifest = self.prepare_fixture(root)
            before = output.read_bytes()
            for content in ['broken JSON', '{}', '{"files":{}}', '{"files":[{}]}']:
                with self.subTest(manifest=content):
                    manifest.write_text(content)
                    with patch.object(import_streets, 'ROOT', root), patch(
                            'sys.argv', ['import_streets.py', '--source', str(source)]):
                        with self.assertRaisesRegex(SystemExit, 'manifest'):
                            import_streets.main()
                    self.assertEqual(output.read_bytes(), before)
                    self.assertEqual(manifest.read_text(), content)
                    self.assertFalse(output.with_suffix('.gz.part').exists())
            manifest.unlink()
            with patch.object(import_streets, 'ROOT', root), patch(
                    'sys.argv', ['import_streets.py', '--source', str(source)]):
                with self.assertRaisesRegex(SystemExit, 'manifest could not be read'):
                    import_streets.main()
            self.assertEqual(output.read_bytes(), before)

    def test_invalid_geometry_preserves_extract_and_provenance(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            source, output, manifest = self.prepare_fixture(root)
            before = output.read_bytes(), manifest.read_bytes()
            for point in [{'lat': float('nan'), 'lon': 127}, {'lat': 37.5}, {'lat': True, 'lon': 127}, {'lat': 91, 'lon': 127}]:
                with self.subTest(point=point):
                    source.write_text(json.dumps({'elements': [{
                        'tags': {'name': 'Broken road'},
                        'geometry': [point, {'lat': 37.51, 'lon': 127}]}]}))
                    with patch.object(import_streets, 'ROOT', root), patch(
                            'sys.argv', ['import_streets.py', '--source', str(source)]):
                        with self.assertRaisesRegex(SystemExit, 'coordinates'):
                            import_streets.main()
                    self.assertEqual((output.read_bytes(), manifest.read_bytes()), before)
                    self.assertFalse(output.with_suffix('.gz.part').exists())

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
