"""Nearest named street from a local OSM extract; no network lookups."""
import gzip
import json
import math
import sys
from array import array
from collections import defaultdict
from pathlib import Path

STREETS = Path(__file__).resolve().parent / 'data/processed/seoul_streets.json.gz'
CELL = .005
METRES_PER_DEGREE = 111195


def segment_distance(point, a, b):
    """Distance in metres to a street segment in a local planar projection."""
    longitude_scale = METRES_PER_DEGREE * math.cos(math.radians(point[0]))
    ax, ay = (a[1] - point[1]) * longitude_scale, (a[0] - point[0]) * METRES_PER_DEGREE
    bx, by = (b[1] - point[1]) * longitude_scale, (b[0] - point[0]) * METRES_PER_DEGREE
    return _projected_distance(ax, ay, bx, by)


def _projected_distance(ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    length = dx * dx + dy * dy
    t = max(0, min(1, -(ax * dx + ay * dy) / length)) if length else 0
    return math.hypot(ax + t * dx, ay + t * dy)


class StreetNames:
    def __init__(self, path=STREETS, streets=None):
        self.cells = defaultdict(lambda: array('I'))
        self.names = []
        self.geometry = array('d')
        if streets is None:
            if not path.exists():
                return  # The UI can still show a nearby station's actual name.
            with gzip.open(path, 'rt', encoding='utf-8') as stream:
                streets = json.load(stream)['streets']
        for name, points in streets:
            name = sys.intern(name)
            for a, b in zip(points, points[1:]):
                # Packed coordinates and cell IDs avoid retaining the large JSON
                # object graph after startup. Doubles preserve lookup precision.
                segment = len(self.names)
                self.names.append(name)
                self.geometry.extend((*a, *b))
                for lat in range(math.floor(min(a[0], b[0]) / CELL), math.floor(max(a[0], b[0]) / CELL) + 1):
                    for lng in range(math.floor(min(a[1], b[1]) / CELL), math.floor(max(a[1], b[1]) / CELL) + 1):
                        self.cells[lat, lng].append(segment)

    def lookup(self, lat, lng, radius=250):
        if not (math.isfinite(lat) and math.isfinite(lng) and 33 <= lat <= 39 and 124 <= lng <= 132):
            raise ValueError('Choose a location in or around Seoul.')
        lat_radius = radius / METRES_PER_DEGREE
        lng_radius = lat_radius / math.cos(math.radians(lat))
        closest = None
        best = radius
        seen = set()
        longitude_scale = METRES_PER_DEGREE * math.cos(math.radians(lat))
        geometry = self.geometry
        for row in range(math.floor((lat - lat_radius) / CELL), math.floor((lat + lat_radius) / CELL) + 1):
            for col in range(math.floor((lng - lng_radius) / CELL), math.floor((lng + lng_radius) / CELL) + 1):
                for segment in self.cells.get((row, col), []):
                    if segment in seen:
                        continue
                    seen.add(segment)
                    offset = segment * 4
                    distance = _projected_distance(
                        (geometry[offset + 1] - lng) * longitude_scale,
                        (geometry[offset] - lat) * METRES_PER_DEGREE,
                        (geometry[offset + 3] - lng) * longitude_scale,
                        (geometry[offset + 2] - lat) * METRES_PER_DEGREE)
                    if distance <= best:
                        closest, best = self.names[segment], distance
        return {'label': closest, 'distance_m': round(best) if closest else None,
                'source': 'OpenStreetMap', 'kind': 'nearest_street' if closest else None}
