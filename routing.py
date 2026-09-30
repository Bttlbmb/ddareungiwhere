"""Local Valhalla cycling and pedestrian estimates on a shared graph."""
import json
import math
import threading
from functools import lru_cache
from pathlib import Path


class LocalRoutes:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.lock = threading.Lock()
        self.actor = None
        self.bounds = None
        # Each engine owns its cache; cached methods must not retain other actors.
        self._estimate = lru_cache(maxsize=2048)(self._estimate)

    def route(self, origin, destination):
        base = {'origin_number': origin['number'], 'destination_number': destination['number'],
                'provider': 'Valhalla'}
        if origin['id'] == destination['id']:
            return dict(base, error='Choose different departure and return stations.')
        coordinates = (origin['lat'], origin['lng'], destination['lat'], destination['lng'])
        return dict(base, **self._route(coordinates, 'bicycle'))

    def walk(self, origin, station):
        coordinates = (origin['lat'], origin['lng'], station['lat'], station['lng'])
        return dict(provider='Valhalla', **self._route(coordinates, 'pedestrian'))

    def _route(self, coordinates, mode):
        label = 'walking' if mode == 'pedestrian' else 'cycling'
        # Actor shares graph readers and working state: serialize requests from HTTP threads.
        with self.lock:
            try:
                if self.bounds is None:
                    self.bounds = json.loads((self.directory / 'coverage.json').read_text())['bounds']
                south, west, north, east = self.bounds
                if not all(math.isfinite(v) for v in coordinates) or not all(
                        south <= lat <= north and west <= lng <= east
                        for lat, lng in (coordinates[:2], coordinates[2:])):
                    return {'error': f'Outside the local {label} map.'}
                if mode == 'pedestrian' and coordinates[:2] == coordinates[2:]:
                    return {'minutes': 0, 'distance_m': 0}
                if self.actor is None:
                    from valhalla import Actor
                    config = json.loads((self.directory / 'valhalla.json').read_text())
                    config['mjolnir']['tile_dir'] = str((self.directory / 'tiles').resolve())
                    self.actor = Actor(config)
                return self._estimate(coordinates, mode)
            except ImportError:
                return {'error': 'Local routing requires the project Python environment.'}
            except (OSError, ValueError, KeyError, TypeError, RuntimeError):
                return {'error': f'Local {label} route unavailable.'}

    def _estimate(self, coordinates, mode):
        a_lat, a_lng, b_lat, b_lng = coordinates
        options = ({'bicycle_type': 'city', 'cycling_speed': 15} if mode == 'bicycle'
                   else {'walking_speed': 5.1})
        locations = [{'lat': a_lat, 'lon': a_lng}, {'lat': b_lat, 'lon': b_lng}]
        if mode == 'pedestrian':
            for location in locations:
                location.update(radius=50, rank_candidates=True, search_cutoff=100)
            # At the start, consider nearby access paths rather than forcing a
            # tiny pin offset onto the opposite side of a disconnected sidewalk.
            locations[0].update(radius=30, rank_candidates=False)
            # Bike parking is at ground level. Do not attach it to an overhead
            # bridge path merely because its projected coordinates are closer.
            # This filters the endpoint only; bridges remain usable on the route.
            locations[1]['search_filter'] = {'exclude_bridge': True}
        route = self.actor.route({
            'locations': locations,
            'costing': mode, 'units': 'kilometers',
            'costing_options': {mode: options},
        })
        summary = route['trip']['summary']
        seconds, km = summary['time'], summary['length']
        if not all(isinstance(v, (int, float)) and math.isfinite(v) and v >= 0 for v in (seconds, km)):
            raise ValueError('Invalid route estimate')
        access_m = 0
        if mode == 'pedestrian':
            from valhalla.midgard.utils import decode_polyline
            legs = route['trip']['legs']
            if not legs:
                raise ValueError('Missing walking geometry')
            shape = decode_polyline(legs[0]['shape'], order='latlng')
            if not shape:
                raise ValueError('Missing walking geometry')
            for point, snapped in (((a_lat, a_lng), shape[0]), ((b_lat, b_lng), shape[-1])):
                gap = 111195 * math.hypot(point[0] - snapped[0],
                        (point[1] - snapped[1]) * math.cos(math.radians(point[0])))
                if not math.isfinite(gap) or gap > 100:
                    raise ValueError('Walking endpoint too far from mapped path')
                access_m += gap
            # Valhalla's summary omits gaps between pins and the mapped network.
            seconds += access_m / 5100 * 3600
            km += access_m / 1000
        return {'minutes': seconds / 60, 'distance_m': round(km * 1000),
                **({'access_distance_m': round(access_m)} if mode == 'pedestrian' else {})}
