import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import check_release


class ReleaseCheckTests(unittest.TestCase):
    @staticmethod
    def repository(root):
        subprocess.run(['git', 'init', '-q', str(root)], check=True)
        (root / '.gitignore').write_text('data/raw/\n')
        (root / 'README.md').write_text('Documentation')
        (root / 'docs').mkdir()
        (root / 'docs/index.html').write_text('<title>Site</title>')

    def test_counts_committable_files_and_skips_ignored_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.repository(root)
            (root / 'data/raw').mkdir(parents=True)
            (root / 'data/raw/archive.zip').write_text('private')
            self.assertEqual(check_release.check(root), (3, len('Documentation') + len('<title>Site</title>') + len('data/raw/\n')))

    def test_rejects_private_files_even_when_force_added(self):
        for name in ['.env', 'data/processed/availability.sqlite3', 'data/raw/archive.zip']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.repository(root)
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_text('private')
                subprocess.run(['git', '-C', str(root), 'add', '-f', name], check=True)
                with self.assertRaisesRegex(ValueError, 'Private or source data'):
                    check_release.check(root)

    def test_rejects_oversized_assets_and_tolerates_deleted_tracked_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.repository(root)
            subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
            (root / 'README.md').unlink()
            with patch.object(check_release, 'MAX_FILE_BYTES', 10):
                with self.assertRaisesRegex(ValueError, 'GitHub file limit'):
                    check_release.check(root)
            self.assertEqual(check_release.check(root)[0], 2)
