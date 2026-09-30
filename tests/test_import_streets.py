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
