"""Rebuild the five popular, non-overlapping directional station routes."""
import json
import sqlite3
import sys
from contextlib import closing
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import DB, ROOT, Inventory, metres


def select_routes(rows, stations, limit=5, minimum_distance=2000):
    used, selected = set(), []
    for origin, destination, rides in rows:
        if origin == destination or origin not in stations or destination not in stations:
            continue
        if origin in used or destination in used:
            continue
        a, b = stations[origin], stations[destination]
        distance = metres((a['lat'], a['lng']), (b['lat'], b['lng']))
        if distance < minimum_distance:
            continue
        selected.append(dict(origin=origin, destination=destination, rides=rides, distance_m=round(distance)))
        used.update((origin, destination))
        if len(selected) == limit:
            break
    return selected


if __name__ == '__main__':
    with closing(sqlite3.connect(f'file:{DB}?mode=ro', uri=True)) as con:
        rows = con.execute('SELECT origin,destination,COUNT(DISTINCT signature) AS n FROM trips WHERE origin != destination GROUP BY origin,destination ORDER BY n DESC,origin,destination')
        routes = select_routes(rows, Inventory().stations)
    path = ROOT / 'data/processed/popular_routes.json'
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(routes))
    temporary.replace(path)
    print(f'Saved {len(routes)} popular routes to {path}')
