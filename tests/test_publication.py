import contextlib
import gzip
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import prepare_publication


class PublicationTests(unittest.TestCase):
    @staticmethod
    def fixture(root):
        source = root / 'source'
        checkout = root / 'checkout'
        for path in ['scripts', 'data/inputs', 'dist/site']:
            (source / path).mkdir(parents=True)
        (source / 'README.md').write_text('Current documentation')
        (source / 'scripts/tool.py').write_text('# Current offline tool')
        (source / 'data/inputs/stations.json').write_text('[]')
        (source / 'data/manifest.json').write_text('{"files":[]}')
        (source / 'dist/site/index.html').write_text('<title>Current site</title>')
        (checkout / '.git').mkdir(parents=True)
        (checkout / 'docs').mkdir()
        (checkout / 'docs/stale.js').write_text('// Obsolete')
        (checkout / 'README.md').write_text('Previous documentation')
        (checkout / 'personal-note.txt').write_text('Keep my local note')
        (checkout / 'app.py').write_text('# Retired server')
        return source, checkout

    @staticmethod
    def files(root):
        return {str(path.relative_to(root)): path.read_bytes() for path in root.rglob('*') if path.is_file()}

    def prepare(self, source, checkout):
        with patch.object(prepare_publication, 'ROOT', source), \
             patch.object(prepare_publication, 'FILES', ['README.md']), \
             patch.object(prepare_publication, 'DIRECTORIES', ['scripts']), \
             patch.object(prepare_publication.subprocess, 'check_output', return_value='git@github.com:Bttlbmb/ddareungiwhere.git\n'), \
             contextlib.redirect_stdout(io.StringIO()):
            prepare_publication.prepare(checkout)

    def test_publication_replaces_stale_files_and_preserves_unmanaged_work(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, checkout = self.fixture(root)
            (source / 'dist/site/__routing_check.html').write_text('Private diagnostic')
            self.prepare(source, checkout)
            self.assertEqual((checkout / 'README.md').read_text(), 'Current documentation')
            self.assertEqual((checkout / 'personal-note.txt').read_text(), 'Keep my local note')
            self.assertTrue((checkout / 'docs/index.html').exists())
            self.assertFalse((checkout / 'app.py').exists())
            self.assertFalse((checkout / 'docs/stale.js').exists())
            self.assertFalse((checkout / 'docs/__routing_check.html').exists())
            self.assertEqual(list(root.glob('.publication-*')), [])

    def test_rejected_payload_does_not_modify_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, checkout = self.fixture(root)
            before = self.files(checkout)
            key = 'fixture-seoul-credential'
            (source / '.env').write_text('SEOUL_OPEN_DATA_API_KEY=' + key)
            (source / 'dist/site/data.json.gz').write_bytes(gzip.compress(key.encode()))
            with self.assertRaisesRegex(ValueError, 'Credential found'):
                self.prepare(source, checkout)
            self.assertEqual(self.files(checkout), before)
            self.assertEqual(list(root.glob('.publication-*')), [])

    def test_missing_source_does_not_modify_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, checkout = self.fixture(root)
            before = self.files(checkout)
            (source / 'data/manifest.json').unlink()
            with self.assertRaises(FileNotFoundError):
                self.prepare(source, checkout)
            self.assertEqual(self.files(checkout), before)

    def test_credential_spanning_scan_chunks_is_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'asset.js'
            key = b'credential-at-boundary'
            path.write_bytes(b'x' * (1024 * 1024 - 5) + key + b'end')
            self.assertTrue(prepare_publication.contains_credential(path, [key]))
            self.assertFalse(prepare_publication.contains_credential(path, [b'absent']))
