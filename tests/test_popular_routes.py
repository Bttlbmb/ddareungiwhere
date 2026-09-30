import unittest
from scripts.popular_routes import select_routes


class PopularRouteTests(unittest.TestCase):
    def test_ranked_selection_excludes_overlap_loops_and_unknown_stations(self):
        rows = [(1,1,100), (99,2,90), (1,2,80), (2,1,70), (3,1,60),
                (3,4,50), (5,6,40), (7,8,30), (9,10,20), (11,12,10)]
        stations = {i: {'lat':37.5 + i * .03, 'lng':127} for i in range(1,13)}
        routes = select_routes(rows, stations)
        self.assertEqual([r['rides'] for r in routes], [80,50,40,30,20])
        self.assertEqual(len({r[k] for r in routes for k in ('origin','destination')}),10)

    def test_short_route_does_not_reserve_its_station(self):
        stations = {1: {'lat':37.5,'lng':127}, 2: {'lat':37.501,'lng':127},
                    3: {'lat':37.53,'lng':127}}
        routes = select_routes([(1,2,100),(1,3,90)],stations)
        self.assertEqual(len(routes),1)
        self.assertEqual(routes[0]['destination'],3)
        self.assertGreaterEqual(routes[0]['distance_m'],2000)
