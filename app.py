"""Local Seoul bicycle planner. Run: python3 app.py"""
from __future__ import annotations

import argparse
import json
import math
import mimetypes
import os
import sqlite3
import threading
import time
import urllib.request
from contextlib import closing
from datetime import datetime, timedelta
from functools import lru_cache
from heapq import nsmallest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from zoneinfo import ZoneInfo
from streets import StreetNames
from routing import LocalRoutes

ROOT = Path(__file__).resolve().parent
WEB = ROOT / 'web'
DB = ROOT / 'data/processed/planner.sqlite3'
SEOUL = ZoneInfo('Asia/Seoul')
FRESH_SECONDS = 120


def now():
    return datetime.now(SEOUL)


def metres(a, b):
    p, q = math.radians(a[0]), math.radians(b[0])
    value = math.sin((q - p) / 2) ** 2 + math.cos(p) * math.cos(q) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 12742000 * math.asin(min(1, math.sqrt(value)))


def load_key(variable='SEOUL_OPEN_DATA_API_KEY'):
    key = os.environ.get(variable, '')
    path = ROOT / '.env.local'
    if not key and path.exists():
        for line in path.read_text().splitlines():
            name, sep, value = line.partition('=')
            if sep and name.strip() == variable:
                key = value.strip().strip('"\'')
    return key if key.isalnum() else ''


def normalize(row, fetched=None):
    try:
        sid = int(row['stationId'].removeprefix('ST-'))
        number, _, name = row['stationName'].partition('.')
        lat, lng = float(row['stationLatitude']), float(row['stationLongitude'])
        if not (33 <= lat <= 39 and 124 <= lng <= 132):
            return None
        try:
            bikes = int(row['parkingBikeTotCnt'])
            if bikes < 0:
                bikes = None
        except (ValueError, KeyError, TypeError):
            bikes = None
        return {'id': sid, 'number': str(int(number)), 'name': name.strip(),
                'lat': lat, 'lng': lng, 'bikes': bikes, 'fetched_at': fetched}
    except (ValueError, KeyError, TypeError):
        return None


def parse_pickup(value, clock=None):
    clock = clock or now()
    if not value or value == 'now':
        return clock
    try:
        selected = datetime.fromisoformat(value)
        selected = selected.replace(tzinfo=SEOUL) if selected.tzinfo is None else selected.astimezone(SEOUL)
    except ValueError:
        raise ValueError('Choose a valid pickup date and time.')
    if selected < clock - timedelta(minutes=1) or selected > clock + timedelta(days=7):
        raise ValueError('Choose a pickup time from now through the next seven days (Seoul time).')
    return selected


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Inventory:
    def __init__(self):
        self.lock = threading.Lock()
        self.stations = {}
        self.error = None
        self.refreshing = False
        self.last_attempt = float('-inf')
        self.last_success = None
        for path in sorted((ROOT / 'data/raw').glob('live_[123]_*.json')):
            for row in json.loads(path.read_text()).get('rentBikeStatus', {}).get('row', []):
                item = normalize(row)  # Historical extract supplies locations, never "live" counts.
                if item:
                    item['bikes'] = None
                    self.stations[item['id']] = item

    def refresh(self):
        with self.lock:
            if self.refreshing or time.monotonic() - self.last_attempt < 60:
                return
            self.refreshing = True
            self.last_attempt = time.monotonic()
        threading.Thread(target=self._fetch, daemon=True).start()

    def _fetch(self):
        error = None
        fresh = {}
        try:
            key = load_key()
            if not key:
                raise RuntimeError('Add your Seoul API key to .env.local to enable live bike counts.')
            opener = urllib.request.build_opener(NoRedirect)
            complete = False
            for start in range(1, 10001, 1000):
                # The provider's tested endpoint is HTTP; do not log credential-bearing URLs.
                req = urllib.request.Request(f'http://openapi.seoul.go.kr:8088/{key}/json/bikeList/{start}/{start + 999}/', headers={'User-Agent': 'SeoulBikeLocalMVP/1.0'})
                with opener.open(req, timeout=8) as response:
                    payload = json.load(response)
                block = payload.get('rentBikeStatus', {})
                code = payload.get('CODE') or block.get('RESULT', {}).get('CODE')
                if code == 'INFO-200':
                    complete = True
                    break
                if code != 'INFO-000' or not isinstance(block.get('row'), list) or not block['row']:
                    raise RuntimeError('The Seoul bike service did not return a usable station list. Try again shortly.')
                stamp = now().isoformat()
                for row in block['row']:
                    item = normalize(row, stamp)
                    if item:
                        if item['id'] in fresh:
                            raise RuntimeError('The live station pages overlapped. Try refreshing shortly.')
                        fresh[item['id']] = item
            if not complete or not fresh:
                raise RuntimeError('The live station list was incomplete. Try again shortly.')
            with self.lock:
                # Retain known locations; absence from today's response is not zero bikes.
                for item in self.stations.values():
                    if item['id'] not in fresh:
                        item['bikes'], item['fetched_at'] = None, None
                self.stations.update(fresh)
                self.last_success = now().isoformat()
        except RuntimeError as exc:
            error = str(exc)
        except Exception:
            # urllib exceptions may contain the secret URL: never serialize or log them.
            error = 'Live bike counts are unavailable. Saved locations and ride history still work.'
        finally:
            with self.lock:
                self.error = error
                self.refreshing = False

    def snapshot(self):
        with self.lock:
            stations = [dict(s) for s in self.stations.values()]
            state = {'refreshing': self.refreshing, 'error': self.error, 'fetched_at': self.last_success}
        return stations, state


def connect(db=DB):
    return sqlite3.connect(f'file:{db}?mode=ro', uri=True)


def availability_counts(con, numbers, hour, weekday):
    """Station-specific archive counts; missing dates are not imputed."""
    if not numbers:
        return {}
    placeholders = ','.join('?' for _ in numbers)
    rows = con.execute(f"""SELECT number,COUNT(*),SUM(bikes=0) FROM availability
        WHERE number IN ({placeholders}) AND hour=? AND weekday=? GROUP BY number""",
        (*numbers, hour, weekday))
    result = {number: {'observations': 0, 'zero': 0} for number in numbers}
    for number, observations, zero in rows:
        result[number] = {'observations': observations, 'zero': zero}
    return result


class Planner:
    def __init__(self, inventory, db=DB):
        self.inventory, self.db = inventory, db
        self.history = lru_cache(maxsize=128)(self.history)
        with closing(connect(db)) as con:
            self.metadata = json.loads(con.execute("SELECT value FROM meta WHERE key='dataset'").fetchone()[0])

    def bootstrap(self):
        # Initial map setup uses saved locations; live fetches require an action.
        stations, live = self.inventory.snapshot()
        path = ROOT / 'data/processed/popular_routes.json'
        popular = json.loads(path.read_text()) if path.exists() else []
        return {'stations': stations, 'live': live, 'history': self.metadata, 'now': now().isoformat(), 'popular_routes': popular}

    def history(self, numbers, hour, weekday):
        with closing(connect(self.db)) as con:
            return availability_counts(con, numbers, hour, weekday)

    def plan(self, query):
        def point(prefix):
            try:
                p = float(query[prefix + '_lat']), float(query[prefix + '_lng'])
            except (KeyError, ValueError):
                raise ValueError('Choose both an origin and a destination on the map.')
            if not all(math.isfinite(v) for v in p) or not (33 <= p[0] <= 39 and 124 <= p[1] <= 132):
                raise ValueError('Choose map points in or around Seoul.')
            return p
        origin, destination = point('origin'), point('destination')
        clock = now()
        pickup = parse_pickup(query.get('pickup'), clock)
        try:
            count = int(query.get('count', '5'))
        except ValueError:
            raise ValueError('Choose a valid number of stations.')
        if count != 5:
            raise ValueError('Compare five nearby stations.')
        self.inventory.refresh()
        stations, live = self.inventory.snapshot()
        if not stations:
            raise ValueError('Station locations are unavailable. Refresh once the bike service returns.')
        by_id = {s['id']: s for s in stations}
        departures = nsmallest(count, stations, key=lambda s: metres(origin, (s['lat'], s['lng'])))
        selected_return = min(stations, key=lambda s: metres(destination, (s['lat'], s['lng'])))
        for parameter in ('return', 'departure'):
            if query.get(parameter):
                try:
                    station = by_id[int(query[parameter])]
                except (KeyError, ValueError):
                    raise ValueError('That station is unavailable. Choose another station.')
                if parameter == 'return':
                    selected_return = station
                elif station not in departures:
                    # Keep five rows even for an explicit API override.
                    departures[-1] = station
                    departures.sort(key=lambda s: metres(origin, (s['lat'], s['lng'])))
        selected_return = dict(selected_return)
        selected_return['distance_m'] = round(metres(destination, (selected_return['lat'], selected_return['lng'])))
        availability = self.history(tuple(sorted({s['number'] for s in departures})),
                                    pickup.hour, int(pickup.weekday() < 5))
        for s in departures:
            s['distance_m'] = round(metres(origin, (s['lat'], s['lng'])))
            s['availability'] = availability[s['number']]
            stamp = s['fetched_at']
            s['fresh'] = bool(stamp and s['bikes'] is not None and
                              (clock - datetime.fromisoformat(stamp)).total_seconds() <= FRESH_SECONDS)
        immediate = (pickup - clock).total_seconds() <= 15 * 60
        eligible = [s for s in departures if s['fresh'] and s['bikes'] > 0 and s['id'] != selected_return['id']]
        suggestion = eligible[0]['id'] if immediate and eligible else None
        # A descriptive archived comparison is not a future availability forecast.
        return {'departures': departures, 'return_station': selected_return,
                'origin': {'lat': origin[0], 'lng': origin[1]},
                'pickup': pickup.isoformat(), 'hour': pickup.hour, 'day_group': 'Weekdays' if pickup.weekday() < 5 else 'Weekends',
                'immediate': immediate, 'suggested_id': suggestion,
                'live': live}


def make_handler(planner):
    streets = StreetNames()
    routes = LocalRoutes(ROOT / 'data/processed/valhalla')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def respond(self, status, data, kind='application/json; charset=utf-8'):
            body = json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode() if kind.startswith('application/json') else data
            self.send_response(status)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
            # Local development serves changing assets at stable URLs. Never reuse
            # an old HTML/CSS/JS response alongside a newer version of the app.
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            host = self.headers.get('Host', '').split(':')[0]
            if host not in ('localhost', '127.0.0.1'):
                return self.respond(403, {'error': 'This service is local only.'})
            parsed = urlsplit(self.path)
            try:
                if parsed.path == '/api/bootstrap':
                    return self.respond(200, planner.bootstrap())
                if parsed.path == '/api/live':
                    if parse_qs(parsed.query).get('refresh') != ['0']:
                        planner.inventory.refresh()
                    stations, live = planner.inventory.snapshot()
                    return self.respond(200, {'stations': stations, 'live': live})
                if parsed.path == '/api/plan':
                    query = {k: v[-1] for k, v in parse_qs(parsed.query).items()}
                    result = planner.plan(query)
                    for station in result['departures']:
                        station['cycling_route'] = routes.route(station, result['return_station'])
                        station['walking_route'] = routes.walk(result['origin'], station)
                    return self.respond(200, result)
                if parsed.path == '/api/place-label':
                    query = parse_qs(parsed.query)
                    try:
                        lat, lng = float(query['lat'][-1]), float(query['lng'][-1])
                    except (KeyError, ValueError):
                        raise ValueError('Choose a valid map location.')
                    return self.respond(200, streets.lookup(lat, lng))
                allowed = {'/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css',
                           '/assets/looking-wheels.svg': 'assets/looking-wheels.svg',
                           '/vendor/leaflet.js': 'vendor/leaflet.js', '/vendor/leaflet.css': 'vendor/leaflet.css'}
                if parsed.path not in allowed:
                    return self.respond(404, {'error': 'Not found.'})
                path = WEB / allowed[parsed.path]
                return self.respond(200, path.read_bytes(), (mimetypes.guess_type(str(path))[0] or 'application/octet-stream') + '; charset=utf-8')
            except ValueError as exc:
                return self.respond(400, {'error': str(exc)})
            except (sqlite3.Error, OSError):
                return self.respond(503, {'error': 'Local data is unavailable. Run python3 scripts/import_data.py, then restart the app.'})
    return Handler


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8767)
    args = parser.parse_args()
    if not DB.exists():
        raise SystemExit('Build the local history first: python3 scripts/import_data.py')
    inventory = Inventory()
    planner = Planner(inventory)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(planner))
    print(f'Seoul bike planner → http://localhost:{server.server_address[1]}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
