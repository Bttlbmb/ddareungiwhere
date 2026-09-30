import math
import unittest
from streets import StreetNames, segment_distance


class StreetTests(unittest.TestCase):
    def test_nearest_segment_interior_not_just_nearest_vertex(self):
        streets = StreetNames(streets=[
            ['Long street', [[37.5, 127.0], [37.5, 127.02]]],
            ['Other street', [[37.501, 127.009], [37.501, 127.011]]]])
        result = streets.lookup(37.5001, 127.01)
        self.assertEqual(result['label'], 'Long street')
        self.assertAlmostEqual(result['distance_m'], 11, delta=1)

    def test_cell_boundaries_and_unknown_area(self):
        streets = StreetNames(streets=[['Nearby road', [[37.5, 127.0], [37.501, 127.0]]]])
        self.assertEqual(streets.lookup(37.5005, 126.9999)['label'], 'Nearby road')
        self.assertIsNone(streets.lookup(37.6, 127.1)['label'])
        self.assertIsNone(StreetNames(streets=[]).lookup(37.5, 127)['label'])

    def test_invalid_coordinates_and_zero_length_segment(self):
        for lat, lng in [(math.nan, 127), (37.5, math.inf), (0, 0)]:
            with self.assertRaises(ValueError):
                StreetNames(streets=[]).lookup(lat, lng)
        self.assertEqual(segment_distance((37.5, 127), (37.5, 127), (37.5, 127)), 0)
