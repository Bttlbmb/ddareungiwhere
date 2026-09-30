import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from scripts.build_static import export_history
from scripts.import_availability import build


class StaticExportTests(unittest.TestCase):
    def test_six_month_window_preserves_exact_counts_and_missing_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);db=root/'history.sqlite3'
            with sqlite3.connect(db) as con:
                con.executescript('CREATE TABLE availability(number TEXT,day TEXT,hour INTEGER,weekday INTEGER,bikes INTEGER); CREATE TABLE meta(key TEXT,value TEXT);')
                con.executemany('INSERT INTO availability VALUES(?,?,?,?,?)',[
                    ('10','2025-06-01',8,0,0),('10','2025-07-01',8,1,0),('10','2025-12-01',8,1,2),('20','2025-12-06',8,0,0)])
                con.execute('INSERT INTO meta VALUES(?,?)',('dataset',json.dumps({'inputs':[]})))
            output=export_history(db,root/'public',6)
            self.assertEqual(output['window_start'],'2025-07-01')
            self.assertEqual(output['counts'][24+8],[2,1])
            self.assertEqual(output['counts'][48+8],[1,1])
            self.assertEqual(output['counts'][8],[0,0])

    def test_availability_only_import_rejects_conflicts_and_preserves_published_database(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'availability_2025_q4.csv';output=root/'available.sqlite3'
            header='일시,대여소번호,시간대,거치대수량\n'
            source.write_bytes((header+'2025-12-01,10,8,0\n2025-12-01,10,8,0\n2025-12-02,10,8,2\n').encode('cp949'))
            meta=build([source],output);self.assertEqual(meta['records'],2);before=output.read_bytes()
            source.write_bytes((header+'2025-12-01,10,8,0\n2025-12-01,10,8,1\n').encode('cp949'))
            with self.assertRaises(sqlite3.IntegrityError):build([source],output)
            self.assertEqual(output.read_bytes(),before)
