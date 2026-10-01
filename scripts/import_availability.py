"""Import explicit availability ZIP/CSV sources into a dedicated offline database.

Multiple quarters/months are accepted. Station/date/hour observations deduplicate
exactly; conflicting quantities abort without replacing the published database.
No network access or rental data is needed.
"""
import argparse
import csv
import gzip
import io
import json
import sqlite3
import sys
import zipfile
from contextlib import closing
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.lib.files import fingerprint


def source_rows(path):
    """Stream the original CP949 archive rather than expanding it on disk."""
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if not name.lower().endswith('.csv'):
                    continue
                with archive.open(name) as binary:
                    yield from csv.DictReader(io.TextIOWrapper(binary, encoding='cp949', newline=''))
    else:
        opener = gzip.open if path.suffix == '.gz' else open
        with opener(path, 'rt', encoding='cp949', newline='') as stream:
            yield from csv.DictReader(stream)


def build(sources, output):
    sources = [path.resolve(strict=True) for path in sources]
    if len(set(sources)) != len(sources):
        raise ValueError('List each archive only once.')
    inputs = [dict(fingerprint(path), kind='availability') for path in sources]
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.build.sqlite3')
    if temporary.exists():
        temporary.unlink()
    try:
        with closing(sqlite3.connect(temporary)) as connection:
            connection.executescript('''
                PRAGMA journal_mode=OFF;
                CREATE TABLE availability(number TEXT,day TEXT,hour INTEGER,weekday INTEGER,bikes INTEGER,
                  PRIMARY KEY(number,day,hour)) WITHOUT ROWID;
                CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);
                CREATE TRIGGER conflicting_observation BEFORE INSERT ON availability
                WHEN EXISTS(SELECT 1 FROM availability WHERE number=NEW.number AND day=NEW.day AND hour=NEW.hour AND bikes<>NEW.bikes)
                BEGIN SELECT RAISE(ABORT,'Conflicting station/date/hour quantities in source archives'); END;
            ''')
            read = excluded = 0
            for source in sources:
                batch = []
                for row in source_rows(source):
                    read += 1
                    try:
                        date = datetime.fromisoformat(row['일시'][:10])
                        number = str(int(row['대여소번호']))
                        hour = int(row['시간대'])
                        bikes = int(row['거치대수량'])
                        if not 0 <= hour < 24 or bikes < 0:
                            raise ValueError()
                    except (KeyError, TypeError, ValueError):
                        excluded += 1
                        continue
                    batch.append((number, date.date().isoformat(), hour, int(date.weekday() < 5), bikes))
                    if len(batch) >= 50000:
                        connection.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)', batch)
                        batch.clear()
                connection.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)', batch)
                print('Imported availability:', source.name, flush=True)
            start, end, records = connection.execute('SELECT MIN(day),MAX(day),COUNT(*) FROM availability').fetchone()
            if not records:
                raise ValueError('No valid availability observations.')
            metadata = {'inputs': inputs, 'availability_start': start, 'availability_end': end,
                        'importer_version': 1, 'rows_read': read, 'excluded': excluded, 'records': records}
            connection.execute('INSERT INTO meta VALUES(?,?)', ('dataset', json.dumps(metadata)))
            connection.commit()
        temporary.replace(output)
        return metadata
    finally:
        if temporary.exists():
            temporary.unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/processed/availability.sqlite3')
    args = parser.parse_args()
    print(json.dumps(build(args.archive, args.output), indent=2))
