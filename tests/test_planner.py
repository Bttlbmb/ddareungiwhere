import json
import sqlite3
import statistics
from contextlib import closing
import sys
import tempfile
import unittest
from unittest.mock import patch, Mock
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import SEOUL, Inventory, Planner, availability_counts, normalize, parse_pickup


class PlannerTests(unittest.TestCase):
    def test_bootstrap_only_reads_inventory_without_triggering_collection(self):
        planner = object.__new__(Planner)
        planner.metadata = {}
        planner.inventory = Mock()
        planner.inventory.snapshot.return_value = ([], {'refreshing': False})
        self.assertEqual(planner.bootstrap()['stations'], [])
        planner.inventory.refresh.assert_not_called()

    def test_first_live_refresh_is_not_throttled_at_clock_zero(self):
        inventory=Inventory()
        with patch('app.time.monotonic', return_value=0), patch('app.threading.Thread') as thread:
            inventory.refresh()
            thread.return_value.start.assert_called_once()
            self.assertTrue(inventory.refreshing)

    def test_pickup_uses_seoul_and_rejects_outside_horizon(self):
        clock = datetime(2026, 9, 30, 8, 0, tzinfo=SEOUL)
        self.assertEqual(parse_pickup('now', clock), clock)
        self.assertEqual(parse_pickup('2026-09-30T09:00', clock).hour, 9)
        self.assertEqual(parse_pickup('2026-09-30T00:00:00+00:00', clock).hour, 9)
        for value in ('2026-09-29T23:00', '2026-10-07T08:01', 'bad'):
            with self.assertRaises(ValueError):
                parse_pickup(value, clock)

    def test_unknown_inventory_is_not_zero(self):
        row = {'stationId':'ST-1','stationName':'1. Test','stationLatitude':'37.5','stationLongitude':'127','parkingBikeTotCnt':'bad'}
        self.assertIsNone(normalize(row)['bikes'])
        row['parkingBikeTotCnt'] = '0'
        self.assertEqual(normalize(row)['bikes'], 0)

    def test_archive_counts_own_dates_without_imputing_missing(self):
        with closing(sqlite3.connect(':memory:')) as con:
            con.execute('CREATE TABLE availability(number TEXT, day TEXT, hour INTEGER, weekday INTEGER, bikes INTEGER)')
            con.executemany('INSERT INTO availability VALUES(?,?,?,?,?)', [
                ('1','2025-10-01',8,1,0),('1','2025-10-02',8,1,4),
                ('2','2025-10-02',8,1,0),('1','2025-10-04',8,0,0),('1','2025-10-01',9,1,0)])
            expected = {'1': {'observations': 2, 'zero': 1}, '2': {'observations': 1, 'zero': 1},
                        '3': {'observations': 0, 'zero': 0}}
            result = availability_counts(con, ('1','2','3'), 8, 1)
            self.assertEqual(result, expected)
            self.assertEqual(availability_counts(con, ('1',), 8, 1)['1'], result['1'])
            self.assertEqual(availability_counts(con, ('1',), 8, 0)['1']['observations'], 1)
            self.assertEqual(availability_counts(con, (), 8, 1), {})

    def test_plan_keeps_five_rows_and_does_not_read_obsolete_rental_statistics(self):
        with tempfile.TemporaryDirectory() as folder:
            db = Path(folder) / 'test.sqlite3'
            with closing(sqlite3.connect(db)) as con, con:
                con.execute('CREATE TABLE meta(key TEXT,value TEXT)')
                con.execute('INSERT INTO meta VALUES(?,?)', ('dataset', '{}'))
                con.execute('CREATE TABLE availability(number TEXT,day TEXT,hour INTEGER,weekday INTEGER,bikes INTEGER)')
            inventory = Mock()
            stations = [dict(id=i,number=str(i),name=str(i),lat=37.5+i*.001,lng=127,
                             fresh=True,bikes=4,fetched_at=now_stamp)
                        for i in range(1,8) for now_stamp in [datetime.now(SEOUL).isoformat()]]
            inventory.snapshot.return_value = (stations, {})
            planner = Planner(inventory, db)
            query = dict(origin_lat='37.501',origin_lng='127',destination_lat='37.507',destination_lng='127',pickup='now')
            # There is deliberately no trips table: the runtime must not query it.
            result = planner.plan(query)
            self.assertEqual([s['id'] for s in result['departures']], [1,2,3,4,5])
            self.assertEqual(result['return_station']['id'], 7)
            self.assertEqual(result['suggested_id'], 1)
            self.assertNotIn('ride_summary', result)
            self.assertTrue(all('rides' not in s for s in result['departures']))
            for count in ('10','20'):
                with self.assertRaisesRegex(ValueError, 'five'):
                    planner.plan(dict(query,count=count))
            overridden = planner.plan(dict(query,departure='7',**{'return':'6'}))
            self.assertEqual(len(overridden['departures']),5)
            self.assertIn(7,[s['id'] for s in overridden['departures']])
            self.assertEqual(overridden['return_station']['id'],6)
            # Another pickup minute in the same group/hour reuses archive evidence.
            planner.plan(query)
            self.assertGreater(planner.history.cache_info().hits, 0)

    def test_full_dataset_matches_independent_audit(self):
        root=Path(__file__).resolve().parents[1]
        if not (root/'data/processed/planner.sqlite3').exists() or not (root/'data/processed/three_month_audit_results.json').exists():
            self.skipTest('Run data import for the real-data regression check.')
        planner=Planner(Inventory())
        audit=json.loads((root/'data/processed/three_month_audit_results.json').read_text())
        stations={s['number']:s for s in planner.inventory.stations.values()}
        for group in audit['groups']:
            end=stations[group['destination']]
            for number, expected in group['cohorts']['all_times']['stations'].items():
                start=stations[number]
                with closing(sqlite3.connect(root/'data/processed/planner.sqlite3')) as con:
                    durations = [row[0] for row in con.execute(
                        'SELECT minutes FROM trips WHERE origin=? AND destination=? GROUP BY signature',
                        (start['id'],end['id']))]
                self.assertEqual(len(durations),expected['n'],number)
                if durations:
                    self.assertAlmostEqual(statistics.mean(durations),expected['mean'],delta=.051)
                    self.assertEqual(statistics.median(durations),expected['median'])


if __name__ == '__main__':
    unittest.main()
