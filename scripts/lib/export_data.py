"""Exact historical sufficient statistics and lazily loaded street shards."""
import gzip
import hashlib
import json
import sqlite3
import struct
from collections import defaultdict
from contextlib import closing
from datetime import datetime
from pathlib import Path
from scripts.lib.files import write_json, write_gzip_json


def export_history(db, destination, months=6):
    """Export exact counts, with 48 little-endian uint16 pairs per station."""
    if not 1 <= months <= 120:
        raise ValueError('History window must be between 1 and 120 months.')
    # as_uri quotes spaces, # and ? rather than treating them as SQLite options.
    with closing(sqlite3.connect(Path(db).resolve().as_uri() + '?mode=ro', uri=True)) as con:
        end = con.execute('SELECT MAX(day) FROM availability').fetchone()[0]
        if not end:
            raise ValueError('Availability archive is empty.')
        last = datetime.fromisoformat(end)
        serial = last.year * 12 + last.month - months
        start = f'{serial // 12:04d}-{serial % 12 + 1:02d}-01'
        # Stream groups into small fixed station buffers. Zero-filled cells
        # preserve missing evidence without a large Python tuple/list graph.
        counts = {}
        for number, hour, weekday, observed, zero in con.execute('''
                SELECT number,hour,weekday,COUNT(*),SUM(bikes=0)
                FROM availability WHERE day>=? GROUP BY number,hour,weekday''', (start,)):
            if number not in counts:
                counts[number] = bytearray(48 * 4)
            struct.pack_into('<HH', counts[number], (weekday * 24 + hour) * 4, observed, zero)
        dates = con.execute('SELECT MIN(day),MAX(day) FROM availability WHERE day>=?', (start,)).fetchone()
        metadata = json.loads(con.execute("SELECT value FROM meta WHERE key='dataset'").fetchone()[0])
        observed_months = [r[0] for r in con.execute(
            'SELECT DISTINCT substr(day,1,7) FROM availability WHERE day>=? ORDER BY 1', (start,))]
    numbers = sorted(counts, key=int)
    packed = b''.join(counts[number] for number in numbers)
    availability_sources = [item for item in metadata.get('inputs', []) if item.get('kind') == 'availability' or item['name'].startswith('availability_')]
    counts_hash = hashlib.sha256(packed).hexdigest()
    counts_url = f'counts-{counts_hash[:16]}.bin.gz'
    destination.mkdir(parents=True, exist_ok=True)
    (destination / counts_url).write_bytes(gzip.compress(packed, mtime=0))
    history = dict(schema=2, stations=numbers, counts_url=counts_url, counts_sha256=counts_hash, availability_start=dates[0], availability_end=dates[1],
        requested_months=months, window_start=start, observed_months=observed_months,
        order='station, weekend then weekday, hour 0..23', sources=availability_sources,
        method='Recorded station/date/hour observations; missing excluded; weekday/weekend pooled; zero frequency.',
        minimum_observations=20, thresholds=[0.05, 0.2], source_url='https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do')
    write_json(destination / 'history.json', history)
    return history


def export_streets(destination):
    from scripts.lib.street_index import StreetNames
    streets = StreetNames()
    if not streets.cells:
        raise ValueError('Named street extract is missing or empty; run import_streets.py first.')
    shards = defaultdict(dict)
    for (row, col), ids in streets.cells.items():
        shard = shards[f'{row // 10}_{col // 10}']
        shard[f'{row},{col}'] = list(ids)
    for name, cells in shards.items():
        ids = sorted({i for cell in cells.values() for i in cell})
        segments = [[i, streets.names[i], *streets.geometry[i * 4:i * 4 + 4],
                     *([streets.names_ko[i]] if streets.names_ko[i] != streets.names[i] else [])] for i in ids]
        write_gzip_json(destination / 'streets' / f'{name}.json.gz', {'cells': cells, 'segments': segments})
    return len(shards)
