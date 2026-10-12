"""Spatial index of named street segments from the local OSM extract.

The build exports these cells as browser shards; lookups run in the browser.
"""
import gzip
import json
import math
import sys
from array import array
from collections import defaultdict
from pathlib import Path

STREETS = Path(__file__).resolve().parents[2] / 'data/processed/seoul_streets.json.gz'
CELL = .005


class StreetNames:
    def __init__(self, path=STREETS, streets=None):
        self.cells = defaultdict(lambda: array('I'))
        self.names = []
        self.names_ko = []
        self.geometry = array('d')
        if streets is None:
            if not path.exists():
                return  # The UI can still show a nearby station's actual name.
            with gzip.open(path, 'rt', encoding='utf-8') as stream:
                streets = json.load(stream)['streets']
        for street in streets:
            name, points = street[:2]
            name = sys.intern(name)
            name_ko = sys.intern((street[2] if len(street) > 2 else None) or name)
            for a, b in zip(points, points[1:]):
                # Packed coordinates and cell IDs avoid retaining the large JSON
                # object graph after startup. Doubles preserve lookup precision.
                segment = len(self.names)
                self.names.append(name)
                self.names_ko.append(name_ko)
                self.geometry.extend((*a, *b))
                for lat in range(math.floor(min(a[0], b[0]) / CELL), math.floor(max(a[0], b[0]) / CELL) + 1):
                    for lng in range(math.floor(min(a[1], b[1]) / CELL), math.floor(max(a[1], b[1]) / CELL) + 1):
                        self.cells[lat, lng].append(segment)
