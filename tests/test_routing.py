import json
import gc
import weakref
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock
from routing import LocalRoutes

A = dict(id=1, number='101', lat=37.55, lng=126.97)
B = dict(id=2, number='102', lat=37.56, lng=126.98)


class RoutingTests(unittest.TestCase):
    def test_cached_engine_does_not_keep_other_instances_alive(self):
        client = self.client('unused')
        client.route(A, B)
        reference = weakref.ref(client)
        del client
        gc.collect()
        self.assertIsNone(reference())

    def client(self, directory):
        client = LocalRoutes(directory)
        client.bounds = [37.47,126.85,37.69,127.15]
        client.actor = Mock()
        client.actor.route.return_value = {'trip':{'summary':{'time':512,'length':1.378},
                'legs': [{'shape': '_zzrfA_hsdqF_pR_pR'}]}}
        return client

    def test_city_bicycle_configuration_cache_direction_and_moved_station(self):
        client = self.client('unused')
        first = client.route(A,B)
        self.assertAlmostEqual(first['minutes'],512/60)
        self.assertEqual(first['distance_m'],1378)
        self.assertEqual(first['provider'],'Valhalla')
        self.assertEqual(client.route(A,B),first)
        client.actor.route.assert_called_once()
        request = client.actor.route.call_args.args[0]
        self.assertEqual(request['costing'],'bicycle')
        self.assertEqual(request['costing_options']['bicycle'],{'bicycle_type':'city','cycling_speed':15})
        client.route(B,A)
        client.route(dict(A,lng=126.99),B)
        self.assertEqual(client.actor.route.call_count,3)

    def test_outside_coverage_and_loops_do_not_run_engine(self):
        client = self.client('unused')
        self.assertIn('Outside',client.route(dict(A,lat=37.4),B)['error'])
        self.assertIn('error',client.route(A,A))
        self.assertIn('error',client.route(dict(A,lat=float('nan')),B))
        client.actor.route.assert_not_called()

    def test_walking_uses_pin_coordinates_and_separate_cache_from_cycling(self):
        client = self.client('unused')
        origin = {'lat': A['lat'], 'lng': A['lng']}
        first = client.walk(origin, B)
        self.assertAlmostEqual(first['minutes'], 512 / 60)
        self.assertEqual(first['provider'], 'Valhalla')
        request = client.actor.route.call_args.args[0]
        self.assertEqual(request['costing'], 'pedestrian')
        self.assertEqual(request['costing_options'], {'pedestrian': {'walking_speed': 5.1}})
        self.assertEqual(request['locations'][0], {'lat': A['lat'], 'lon': A['lng'],
                'radius': 30, 'rank_candidates': False, 'search_cutoff': 100})
        self.assertEqual(request['locations'][1]['search_filter'], {'exclude_bridge': True})
        self.assertEqual(client.walk(origin, B), first)
        client.actor.route.assert_called_once()
        client.route(A, B)
        client.walk(dict(origin, lng=126.99), B)
        self.assertEqual(client.actor.route.call_count, 3)

    def test_walking_zero_outside_coverage_and_failure_are_distinct(self):
        client = self.client('unused')
        self.assertEqual(client.walk(A, A)['minutes'], 0)
        self.assertIn('Outside', client.walk(dict(A, lat=37.4), B)['error'])
        client.actor.route.assert_not_called()
        client.actor.route.side_effect = RuntimeError('No path')
        self.assertIn('walking route unavailable', client.walk(A, B)['error'])

    def test_walking_counts_short_access_gaps_and_rejects_distant_snapping_without_capping_detours(self):
        client = self.client('unused')
        offset = dict(A, lat=A['lat'] + .0002)
        result = client.walk(offset, B)
        self.assertEqual(result['access_distance_m'], 22)
        self.assertGreater(result['minutes'], 512 / 60)
        self.assertIn('error', client.walk(dict(A, lat=A['lat'] + .01), B))
        client.actor.route.return_value['trip']['summary'] = {'time': 4200, 'length': 8}
        result = client.walk(dict(A, lat=A['lat'] + .0001), B)
        self.assertGreater(result['minutes'], 70)  # Genuine network detours remain visible.

    def test_engine_failure_is_not_cached_and_does_not_hide_station_pair(self):
        client = self.client('unused')
        client.actor.route.side_effect = [RuntimeError('No path'),{'trip':{'summary':{'time':300,'length':1.1}}}]
        failed = client.route(A,B)
        self.assertEqual(failed['origin_number'],'101')
        self.assertIn('unavailable',failed['error'])
        self.assertEqual(client.route(A,B)['minutes'],5)

    def test_missing_map_and_invalid_estimates_fail_gracefully(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIn('error',LocalRoutes(directory).route(A,B))
        client = self.client('unused')
        client.actor.route.return_value = {'trip':{'summary':{'time':float('nan'),'length':1}}}
        self.assertIn('error',client.route(A,B))

    def test_installed_graph_routes_seoul_station_to_city_hall(self):
        directory=Path(__file__).resolve().parents[1]/'data/processed/valhalla'
        if not (directory/'valhalla.json').exists():self.skipTest('Local graph not installed')
        try:import valhalla
        except ImportError:self.skipTest('Valhalla runtime not installed')
        client=LocalRoutes(directory)
        a=dict(A,lat=37.55664444,lng=126.97364044)
        b=dict(B,lat=37.5664711,lng=126.97925568)
        result=client.route(a,b)
        self.assertNotIn('error',result)
        self.assertGreater(result['minutes'],6)
        self.assertLess(result['minutes'],9)
        self.assertGreater(result['distance_m'],1400)
        self.assertLess(result['distance_m'],1800)
        # Guard against snapping central walking pins onto disconnected underground paths.
        walk = client.walk({'lat': 37.5665, 'lng': 126.978}, b)
        self.assertNotIn('error', walk)
        self.assertGreater(walk['minutes'], 0)
        self.assertLess(walk['minutes'], 10)

    def test_installed_graph_routes_westernmost_to_easternmost_station_both_directions(self):
        directory = Path(__file__).resolve().parents[1] / 'data/processed/valhalla'
        if not (directory / 'valhalla.json').exists():
            self.skipTest('Local graph not installed')
        try:
            import valhalla
        except ImportError:
            self.skipTest('Valhalla runtime not installed')
        client = LocalRoutes(directory)
        west = dict(A, number='1101', lat=37.58161163, lng=126.79859924)
        east = dict(B, number='3694', lat=37.55302811, lng=127.18075562)
        for start, end in ((west, east), (east, west)):
            route = client.route(start, end)
            self.assertNotIn('error', route)
            self.assertGreater(route['minutes'], 90)
            self.assertLess(route['minutes'], 400)
            self.assertGreater(route['distance_m'], 30000)
            self.assertLess(route['distance_m'], 80000)

    def test_oksu_walking_routes_do_not_snap_stations_to_overhead_bridge_paths(self):
        directory = Path(__file__).resolve().parents[1] / 'data/processed/valhalla'
        if not (directory / 'valhalla.json').exists():
            self.skipTest('Local graph not installed')
        try:
            import valhalla
        except ImportError:
            self.skipTest('Valhalla runtime not installed')
        client = LocalRoutes(directory)
        # A small pin offset reproduces the 4/55/53-minute report with old snapping.
        origin = {'lat': 37.54205322 - 8 / 111195, 'lng': 127.020401}
        for number, lat, lng, limit in (
                ('556', 37.54205322, 127.020401, 1),
                ('565', 37.54136658, 127.01776123, 6),
                ('5651', 37.53970718, 127.01789856, 10)):
            result = client.walk(origin, dict(B, number=number, lat=lat, lng=lng))
            self.assertNotIn('error', result)
            self.assertGreater(result['minutes'], 0)
            self.assertLess(result['minutes'], limit)
            self.assertLess(result['distance_m'], 850)
