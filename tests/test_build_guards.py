import gzip
import tempfile
import unittest
from pathlib import Path

from scripts import build_static
from scripts.lib.files import gzip_file, write_gzip_json


class BuildGuardTests(unittest.TestCase):
    def test_graph_url_must_be_public_https_without_credentials_or_query(self):
        for url in ['http://example.test/manifest.json', 'https://user:secret@example.test/manifest.json',
                    'https://example.test/manifest.json?token=1', 'https://example.test/manifest.json#frag', 'https:///x']:
            with self.subTest(url=url), tempfile.TemporaryDirectory() as directory:
                with self.assertRaisesRegex(ValueError, 'Public (URLs|endpoints)'):
                    build_static.build(Path(directory) / 'sdk', Path(directory) / 'site', graph_url=url)

    def test_output_must_be_a_generated_site_and_not_the_project(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / 'site'
            folder.mkdir()
            (folder / 'keep.txt').write_text('not generated')
            with self.assertRaisesRegex(ValueError, 'not a generated site'):
                build_static.build(Path(directory) / 'sdk', folder)
            self.assertEqual((folder / 'keep.txt').read_text(), 'not generated')
        with self.assertRaisesRegex(ValueError, 'dedicated site directory'):
            build_static.build(Path('sdk'), build_static.ROOT)

    def test_public_gzip_files_carry_no_timestamp_so_rebuilds_match(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_gzip_json(root / 'data.json.gz', {'value': 1})
            (root / 'tile.gph').write_bytes(b'tile')
            gzip_file(root / 'tile.gph', root / 'tile.gph.gz')
            for name in ['data.json.gz', 'tile.gph.gz']:
                with self.subTest(name=name):
                    self.assertEqual((root / name).read_bytes()[4:8], b'\0\0\0\0')
            self.assertEqual(gzip.decompress((root / 'tile.gph.gz').read_bytes()), b'tile')
