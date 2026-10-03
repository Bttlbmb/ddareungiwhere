import contextlib
import gzip
import hashlib
import io
import json
import sqlite3
import struct
import tempfile
import unittest
from pathlib import Path
from scripts.lib.export_data import export_history
from scripts.import_availability import build


class StaticExportTests(unittest.TestCase):
    def test_six_month_window_preserves_exact_counts_and_missing_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            # URI punctuation in a local filename must not alter SQLite options.
            database = root / 'history #?.sqlite3'
            with sqlite3.connect(database) as connection:
                connection.executescript('''
                    CREATE TABLE availability(number TEXT,day TEXT,hour INTEGER,weekday INTEGER,bikes INTEGER);
                    CREATE TABLE meta(key TEXT,value TEXT);
                ''')
                connection.executemany('INSERT INTO availability VALUES(?,?,?,?,?)', [
                    ('10', '2025-06-01', 8, 0, 0),
                    ('10', '2025-07-01', 8, 1, 0),
                    ('10', '2025-10-01', 8, 1, 1),
                    ('10', '2025-12-01', 8, 1, 2),
                    ('20', '2025-12-06', 8, 0, 0),
                ])
                connection.execute('INSERT INTO meta VALUES(?,?)', ('dataset', json.dumps({'inputs': []})))
            destination = root / 'public'
            metadata = export_history(database, destination, 6)
            self.assertEqual(metadata['window_start'], '2025-07-01')
            self.assertEqual(metadata['observed_months'], ['2025-07', '2025-10', '2025-12'])
            self.assertEqual(metadata, json.loads((destination / 'history.json').read_text()))
            self.assertNotIn('counts', metadata)
            packed = gzip.decompress((destination / metadata['counts_url']).read_bytes())
            self.assertEqual(hashlib.sha256(packed).hexdigest(), metadata['counts_sha256'])
            counts = list(struct.iter_unpack('<HH', packed))
            self.assertEqual(len(counts), 2 * 48)
            self.assertEqual(counts[24 + 8], (3, 1))
            self.assertEqual(counts[48 + 8], (1, 1))
            self.assertEqual(counts[8], (0, 0))

    def test_export_rejects_unsupported_window_before_opening_database(self):
        for months in [0, 121]:
            with self.subTest(months=months), self.assertRaisesRegex(ValueError, 'between 1 and 120'):
                export_history(Path('missing.sqlite3'), Path('unused'), months)

    def test_availability_only_import_rejects_conflicts_and_preserves_published_database(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()):
            root = Path(directory)
            source = root / 'availability_2025_q4.csv'
            # This suffix previously made the staging file equal the output.
            output = root / 'available.build.sqlite3'
            header = '일시,대여소번호,시간대,거치대수량\n'
            source.write_bytes((header + '2025-12-01,10,8,0\n2025-12-01,10,8,0\n2025-12-02,10,8,2\n').encode('cp949'))
            metadata = build([source], output)
            self.assertEqual(metadata['records'], 2)
            before = output.read_bytes()
            source.write_bytes((header + '2025-12-01,10,8,0\n2025-12-01,10,8,1\n').encode('cp949'))
            with self.assertRaises(sqlite3.IntegrityError):
                build([source], output)
            self.assertEqual(output.read_bytes(), before)
            self.assertEqual(list(root.glob('.availability-*')), [])

    def test_import_cannot_overwrite_its_source_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'availability.csv'
            source.write_bytes(b'original source')
            with self.assertRaisesRegex(ValueError, 'source archive'):
                build([source], source)
            self.assertEqual(source.read_bytes(), b'original source')
