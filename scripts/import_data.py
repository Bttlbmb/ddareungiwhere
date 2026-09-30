"""Build the local, indexed MVP dataset. Standard library only; no network calls."""
import csv
import gzip
import hashlib
import json
import re
import sqlite3
import zipfile
from collections import Counter
from contextlib import closing
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'raw'
OUT = ROOT / 'data' / 'processed'
DB = OUT / 'planner.sqlite3'
IMPORTER_VERSION = 2
SCHEMA_VERSION = 1


def trip_files():
    """Choose the newest three monthly sources, never both encodings of a month."""
    months = {}
    for path in RAW.iterdir():
        match = re.fullmatch(r'trips_(20\d{2}(?:0[1-9]|1[0-2]))\.csv(?:\.gz)?', path.name)
        if not match or not path.is_file():
            continue
        month = match[1]
        if month in months:
            raise SystemExit(f'Ambiguous source for {month}: keep either the .csv or .csv.gz file, not both.')
        months[month] = path
    if len(months) < 3:
        raise SystemExit('Place three complete monthly trips_YYYYMM.csv or .csv.gz files in data/raw first.')
    return [months[month] for month in sorted(months)[-3:]]


def fingerprint(path):
    """Hash source bytes incrementally, including the compressed representation."""
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def open_trip_file(path):
    if path.suffix == '.gz':
        return gzip.open(path, 'rt', encoding='cp949', newline='')
    return path.open(encoding='cp949', newline='')


def station_id(value):
    match = re.fullmatch(r'ST-(\d+)', value.strip())
    return int(match[1]) if match else None


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    files = trip_files()
    archive = RAW / 'availability_2025_q4.zip'
    fingerprints = [fingerprint(p) for p in files + ([archive] if archive.exists() else [])]
    if DB.exists():
        with closing(sqlite3.connect(DB)) as con:
            old = json.loads(con.execute("SELECT value FROM meta WHERE key='dataset'").fetchone()[0])
        if (old.get('inputs') == fingerprints
                and old.get('importer_version') == IMPORTER_VERSION
                and old.get('schema_version') == SCHEMA_VERSION):
            print('Dataset already built for these inputs and importer/schema versions.', flush=True)
            return
    # Publish atomically, keeping the previous usable database during a rebuild.
    temp = OUT / 'planner.build.sqlite3'
    if temp.exists():
        temp.unlink()
    with closing(sqlite3.connect(temp)) as con:
        con.executescript('''
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            PRAGMA cache_size=-64000;
            CREATE TABLE trips (origin INTEGER, destination INTEGER, signature BLOB,
                started TEXT, minutes INTEGER, elapsed REAL, distance REAL);
            CREATE TABLE availability (number TEXT, day TEXT, hour INTEGER,
                weekday INTEGER, bikes INTEGER, PRIMARY KEY(number,day,hour)) WITHOUT ROWID;
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
        ''')
        totals = Counter()
        sources = []
        for path in files:
            counts = Counter()
            batch = []
            first, last = None, None
            with open_trip_file(path) as f:
                for row in csv.DictReader(f):
                    counts['rows'] += 1
                    try:
                        origin = station_id(row['대여대여소ID'])
                        destination = station_id(row['반납대여소ID'])
                        start = datetime.fromisoformat(row['대여일시'])
                        end = datetime.fromisoformat(row['반납일시'])
                        minutes = int(row['이용시간(분)'])
                        elapsed = (end - start).total_seconds() / 60
                        distance = float(row['이용거리(M)'])
                        if origin is None or destination is None or minutes <= 0 or elapsed <= 0 or abs(minutes - elapsed) >= 1:
                            counts['excluded'] += 1
                            continue
                    except (KeyError, ValueError, TypeError):
                        counts['excluded'] += 1
                        continue
                    # Whole-trip fingerprint, not a persistent bicycle/rider identifier.
                    identity = '\x1f'.join(row[k] for k in ['자전거번호', '대여일시', '반납일시', '대여대여소ID', '반납대여소ID', '이용시간(분)', '이용거리(M)'])
                    signature = hashlib.blake2b(identity.encode(), digest_size=16).digest()
                    stamp = start.isoformat(sep=' ')
                    first = min(first, stamp) if first else stamp
                    last = max(last, stamp) if last else stamp
                    batch.append((origin, destination, signature, stamp, minutes, elapsed, distance))
                    counts['eligible_rows'] += 1
                    if len(batch) >= 50000:
                        con.executemany('INSERT INTO trips VALUES(?,?,?,?,?,?,?)', batch)
                        con.commit()
                        batch.clear()
                    if counts['rows'] % 1000000 == 0:
                        print(path.name, counts['rows'], 'rows inspected', flush=True)
            con.executemany('INSERT INTO trips VALUES(?,?,?,?,?,?,?)', batch)
            con.commit()
            totals.update(counts)
            sources.append({'file': path.name, **counts, 'first': first, 'last': last})
            print(path.name, dict(counts), flush=True)
        print('Indexing directed station pairs…', flush=True)
        con.execute('CREATE INDEX trip_pair ON trips(origin,destination)')
        dates = {}
        if archive.exists():
            with zipfile.ZipFile(archive) as z:
                import io
                for entry in z.infolist():
                    if entry.is_dir() or not entry.filename.endswith('.csv'):
                        continue
                    batch = []
                    with z.open(entry) as binary:
                        for row in csv.DictReader(io.TextIOWrapper(binary, encoding='cp949')):
                            try:
                                day = row['일시'][:10]
                                if day not in dates:
                                    dates[day] = datetime.fromisoformat(day).weekday() < 5
                                weekday = dates[day]
                                number = str(int(row['대여소번호']))
                                hour, bikes = int(row['시간대']), int(row['거치대수량'])
                                if not 0 <= hour < 24 or bikes < 0:
                                    continue
                                batch.append((number, day, hour, int(weekday), bikes))
                            except (ValueError, KeyError):
                                continue
                            if len(batch) >= 50000:
                                con.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)', batch)
                                con.commit()
                                batch.clear()
                    con.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)', batch)
                    con.commit()
                    print('Imported inventory:', entry.filename.rsplit('/', 1)[-1], flush=True)
        metadata = {'inputs': fingerprints, 'importer_version': IMPORTER_VERSION,
            'schema_version': SCHEMA_VERSION, 'sources': sources, 'totals': dict(totals),
            'start': min(s['first'] for s in sources)[:10], 'end': max(s['last'] for s in sources)[:10],
            'availability_start': min(dates) if dates else None, 'availability_end': max(dates) if dates else None,
            'created_at': datetime.now().astimezone().isoformat(),
            'method': 'Positive reported/elapsed minutes; difference <1 minute. Pair queries deduplicate whole-trip fingerprints. All pickup times; no long-rental trimming.'}
        con.execute('INSERT INTO meta VALUES(?,?)', ('dataset', json.dumps(metadata)))
        con.commit()
        con.execute('PRAGMA optimize')
    temp.replace(DB)
    (OUT / 'planner_import.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('Ready:', DB, DB.stat().st_size, 'bytes', flush=True)


if __name__ == '__main__':
    build()
