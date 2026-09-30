import contextlib
import csv
import gzip
import io
import json
import sqlite3
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import import_data as importer


class ImportTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        self.raw, self.out = root / 'raw', root / 'processed'
        self.raw.mkdir()
        self.db = self.out / 'planner.sqlite3'
        patches = patch.multiple(importer, RAW=self.raw, OUT=self.out, DB=self.db)
        patches.start()
        self.addCleanup(patches.stop)
        for month in (4, 5, 6):
            self.write_month(month)

    def write_month(self, month, minutes=10):
        path = self.raw / f'trips_2026{month:02}.csv'
        fields = ['자전거번호', '대여일시', '반납일시', '대여대여소ID',
                  '반납대여소ID', '이용시간(분)', '이용거리(M)']
        with path.open('w', encoding='cp949', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(fields)
            row = ['bike', f'2026-{month:02}-01 08:00:00',
                   f'2026-{month:02}-01 08:{minutes:02}:00', 'ST-1', 'ST-2', minutes, '1000']
            writer.writerow(row)
            writer.writerow(row)  # Import retains duplicates for per-pair deduplication.
            writer.writerow(row[:5] + [0, '1000'])  # Invalid reported duration remains excluded.
        return path

    def write_archive(self, bikes):
        path = self.raw / 'availability_2025_q4.zip'
        # Fixed ZIP metadata ensures this fixture changes content without changing size.
        entry = zipfile.ZipInfo('data_2510.csv', date_time=(2025, 10, 1, 0, 0, 0))
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr(entry, f'일시,대여소번호,시간대,거치대수량\n2025-10-01,1,8,{bikes}\n'.encode('cp949'))
        return path

    def build(self):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            importer.build()
        return output.getvalue()

    def rows(self, table):
        with contextlib.closing(sqlite3.connect(self.db)) as con:
            return con.execute(f'SELECT * FROM {table} ORDER BY 1,2,3').fetchall()

    def metadata(self):
        with contextlib.closing(sqlite3.connect(self.db)) as con:
            return json.loads(con.execute("SELECT value FROM meta WHERE key='dataset'").fetchone()[0])

    def test_unchanged_sources_skip_parsing(self):
        self.write_archive(0)
        self.build()
        with patch.object(importer, 'open_trip_file', side_effect=AssertionError('Unchanged trips were reparsed')):
            self.assertIn('already built', self.build())
        meta = self.metadata()
        self.assertEqual(len(meta['inputs']), 4)
        self.assertTrue(all(len(source['sha256']) == 64 for source in meta['inputs']))

    def test_same_size_trip_change_rebuilds(self):
        self.build()
        before = self.metadata()['inputs']
        self.write_month(6, minutes=11)
        self.build()
        after = self.metadata()['inputs']
        self.assertEqual(before[-1]['bytes'], after[-1]['bytes'])
        self.assertNotEqual(before[-1]['sha256'], after[-1]['sha256'])
        self.assertEqual([row[4] for row in self.rows('trips') if row[3].startswith('2026-06')], [11, 11])

    def test_archive_add_change_and_remove_each_rebuild(self):
        self.build()
        self.assertEqual(self.rows('availability'), [])
        archive = self.write_archive(0)
        self.build()
        self.assertEqual(self.rows('availability'), [('1', '2025-10-01', 8, 1, 0)])
        before = self.metadata()['inputs'][-1]
        self.write_archive(4)
        self.build()
        after = self.metadata()['inputs'][-1]
        self.assertEqual(before['bytes'], after['bytes'])
        self.assertNotEqual(before['sha256'], after['sha256'])
        self.assertEqual(self.rows('availability')[0][-1], 4)
        archive.unlink()
        self.build()
        self.assertEqual(self.rows('availability'), [])
        self.assertIsNone(self.metadata()['availability_start'])
        self.assertEqual(len(self.metadata()['inputs']), 3)

    def test_gzip_and_plain_csv_produce_identical_trip_rows(self):
        self.build()
        expected, totals = self.rows('trips'), self.metadata()['totals']
        for path in list(self.raw.glob('*.csv')):
            with gzip.open(path.with_suffix('.csv.gz'), 'wb') as stream:
                stream.write(path.read_bytes())
            path.unlink()
        self.build()
        self.assertEqual(self.rows('trips'), expected)
        self.assertEqual(self.metadata()['totals'], totals)
        self.assertEqual(totals, {'rows': 9, 'eligible_rows': 6, 'excluded': 3})

    def test_newest_months_can_mix_plain_and_compressed_files(self):
        path = self.write_month(7)
        compressed = path.with_suffix('.csv.gz')
        with gzip.open(compressed, 'wb') as stream:
            stream.write(path.read_bytes())
        path.unlink()
        self.assertEqual([p.name for p in importer.trip_files()],
                         ['trips_202605.csv', 'trips_202606.csv', 'trips_202607.csv.gz'])

    def test_duplicate_month_representation_is_rejected(self):
        path = self.raw / 'trips_202606.csv'
        with gzip.open(path.with_suffix('.csv.gz'), 'wb') as stream:
            stream.write(path.read_bytes())
        with self.assertRaisesRegex(SystemExit, 'Ambiguous source for 202606'):
            self.build()

    def test_importer_and_schema_versions_each_invalidate_cache(self):
        for constant, field in [('IMPORTER_VERSION', 'importer_version'), ('SCHEMA_VERSION', 'schema_version')]:
            self.build()  # Restore both baseline versions before changing just one.
            with self.subTest(version=field), patch.object(importer, constant, getattr(importer, constant) + 1):
                self.assertNotIn('already built', self.build())
                self.assertEqual(self.metadata()[field], getattr(importer, constant))

    def test_failed_rebuild_preserves_published_database(self):
        self.build()
        before = self.db.read_bytes()
        self.write_month(6, minutes=11)
        with patch.object(importer, 'open_trip_file', side_effect=OSError('Unreadable source')):
            with self.assertRaisesRegex(OSError, 'Unreadable source'):
                self.build()
        self.assertEqual(self.db.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
