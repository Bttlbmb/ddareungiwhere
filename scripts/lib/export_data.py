"""Exact historical sufficient statistics and lazily loaded street shards."""
import gzip
import hashlib
import json
import sqlite3
import struct
from collections import defaultdict
from contextlib import closing
from datetime import datetime
from scripts.lib.files import write_json


def export_history(db, destination, months=6):
    with closing(sqlite3.connect(f'file:{db}?mode=ro', uri=True)) as con:
        end = con.execute('SELECT MAX(day) FROM availability').fetchone()[0]
        if not end:
            raise ValueError('Availability archive is empty.')
        last = datetime.fromisoformat(end)
        serial = last.year * 12 + last.month - months
        start = f'{serial // 12:04d}-{serial % 12 + 1:02d}-01'
        rows = con.execute('''SELECT number,hour,weekday,COUNT(*),SUM(bikes=0)
            FROM availability WHERE day>=? GROUP BY number,hour,weekday''', (start,)).fetchall()
        dates = con.execute('SELECT MIN(day),MAX(day) FROM availability WHERE day>=?', (start,)).fetchone()
        metadata = json.loads(con.execute("SELECT value FROM meta WHERE key='dataset'").fetchone()[0])
    numbers = sorted({r[0] for r in rows}, key=int)
    index = {n: i for i, n in enumerate(numbers)}
    counts = [[0, 0] for _ in range(len(numbers) * 48)]
    for number, hour, weekday, observed, zero in rows:
        counts[index[number] * 48 + weekday * 24 + hour] = [observed, zero]
    availability_sources = [item for item in metadata.get('inputs', []) if item.get('kind') == 'availability' or item['name'].startswith('availability_')]
    packed = b''.join(struct.pack('<HH', observed, zero) for observed, zero in counts)
    counts_hash = hashlib.sha256(packed).hexdigest()
    counts_url = f'counts-{counts_hash[:16]}.bin.gz'
    destination.mkdir(parents=True, exist_ok=True)
    (destination / counts_url).write_bytes(gzip.compress(packed, mtime=0))
    history = dict(schema=2, stations=numbers, counts_url=counts_url, counts_sha256=counts_hash, availability_start=dates[0], availability_end=dates[1],
        requested_months=months, window_start=start, observed_months=sorted({d[:7] for d in dates if d}),
        order='station, weekend then weekday, hour 0..23', sources=availability_sources,
        method='Recorded station/date/hour observations; missing excluded; weekday/weekend pooled; zero frequency.',
        minimum_observations=20, thresholds=[0.05, 0.2], source_url='https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do')
    # Actual observed months, not just the two endpoints.
    with closing(sqlite3.connect(f'file:{db}?mode=ro', uri=True)) as con:
        history['observed_months'] = [r[0] for r in con.execute('SELECT DISTINCT substr(day,1,7) FROM availability WHERE day>=? ORDER BY 1', (start,))]
    write_json(destination / 'history.json', history)
    return {**history, 'counts': counts}  # Returned only for offline validation.


def export_streets(destination):
    from scripts.lib.street_index import StreetNames
    streets = StreetNames()
    shards = defaultdict(dict)
    for (row, col), ids in streets.cells.items():
        shard = shards[f'{row // 10}_{col // 10}']
        shard[f'{row},{col}'] = list(ids)
    for name, cells in shards.items():
        ids = sorted({i for cell in cells.values() for i in cell})
        segments = [[i, streets.names[i], *streets.geometry[i * 4:i * 4 + 4]] for i in ids]
        write_json(destination / 'streets' / f'{name}.json', {'cells': cells, 'segments': segments})
    return len(shards)


