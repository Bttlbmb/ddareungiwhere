import gzip
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import compress_data


class CompressionTests(unittest.TestCase):
    def test_removal_requires_matching_provenance_and_updates_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / 'data/raw'
            raw.mkdir(parents=True)
            source = raw / 'trips_202606.csv'
            source.write_bytes(b'original')
            manifest_path = root / 'data/manifest.json'
            entry = {'path': 'data/raw/trips_202606.csv', 'bytes': 8,
                     'sha256': 'incorrect', 'url': 'https://example.test/source'}
            manifest_path.write_text(json.dumps({'files': [entry]}))
            with patch.object(compress_data, 'ROOT', root), patch(
                    'sys.argv', ['compress_data.py', '--remove-originals']):
                with self.assertRaises(ValueError):
                    compress_data.main()
                self.assertTrue(source.exists())
                entry['sha256'] = hashlib.sha256(b'original').hexdigest()
                manifest_path.write_text(json.dumps({'files': [entry]}))
                compress_data.main()
            self.assertFalse(source.exists())
            stored = json.loads(manifest_path.read_text())['files'][0]
            self.assertEqual(stored['url'], entry['url'])
            self.assertEqual(stored['uncompressed']['sha256'], entry['sha256'])
            self.assertTrue((root / stored['path']).exists())

    def test_verified_archive_preserves_bytes_and_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'trips_202606.csv'
            content = '대여일시,대여소\n2026-06-01,123\n'.encode('cp949') * 100
            source.write_bytes(content)
            with patch.object(compress_data, 'ROOT', root):
                record = compress_data.compress(source)
                self.assertEqual(compress_data.compress(source), record)
            self.assertEqual(source.read_bytes(), content)
            self.assertEqual(gzip.decompress((root / record['path']).read_bytes()), content)
            self.assertEqual(record['uncompressed']['bytes'], len(content))

    def test_existing_different_archive_never_overwrites_or_removes_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'trips_202606.csv'
            source.write_bytes(b'original')
            archive = root / 'trips_202606.csv.gz'
            archive.write_bytes(gzip.compress(b'different'))
            with patch.object(compress_data, 'ROOT', root):
                with self.assertRaises(ValueError):
                    compress_data.compress(source)
            self.assertEqual(source.read_bytes(), b'original')
            self.assertEqual(gzip.decompress(archive.read_bytes()), b'different')
