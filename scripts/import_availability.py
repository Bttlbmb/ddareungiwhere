"""Import explicit availability ZIP/CSV sources without rebuilding rental history.

Accepts multiple quarters/months, preserves station/date/hour uniqueness and
rejects conflicting duplicate observations. No network access or trip queries.
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
from scripts.import_data import fingerprint


def source_rows(path):
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if not name.lower().endswith('.csv'):continue
                with archive.open(name) as binary:
                    yield from csv.DictReader(io.TextIOWrapper(binary, encoding='cp949', newline=''))
    else:
        opener = gzip.open if path.suffix == '.gz' else open
        with opener(path, 'rt', encoding='cp949', newline='') as stream:
            yield from csv.DictReader(stream)


def build(sources, output):
    sources = [p.resolve(strict=True) for p in sources]
    if len(set(sources)) != len(sources):raise ValueError('List each archive only once.')
    inputs = [dict(fingerprint(p), kind='availability') for p in sources]
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.build.sqlite3')
    if temp.exists():temp.unlink()
    try:
        with closing(sqlite3.connect(temp)) as con:
            con.executescript('''
                PRAGMA journal_mode=OFF;
                CREATE TABLE availability(number TEXT,day TEXT,hour INTEGER,weekday INTEGER,bikes INTEGER,
                  PRIMARY KEY(number,day,hour)) WITHOUT ROWID;
                CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);
                CREATE TRIGGER conflicting_observation BEFORE INSERT ON availability
                WHEN EXISTS(SELECT 1 FROM availability WHERE number=NEW.number AND day=NEW.day AND hour=NEW.hour AND bikes<>NEW.bikes)
                BEGIN SELECT RAISE(ABORT,'Conflicting station/date/hour quantities in source archives'); END;
            ''')
            read=excluded=0
            for source in sources:
                batch=[]
                for row in source_rows(source):
                    read+=1
                    try:
                        date=datetime.fromisoformat(row['일시'][:10]);day=date.date().isoformat()
                        number=str(int(row['대여소번호']));hour=int(row['시간대']);bikes=int(row['거치대수량'])
                        if not 0<=hour<24 or bikes<0:raise ValueError()
                    except (KeyError,TypeError,ValueError):excluded+=1;continue
                    batch.append((number,day,hour,int(date.weekday()<5),bikes))
                    if len(batch)>=50000:
                        con.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)',batch);batch.clear()
                con.executemany('INSERT OR IGNORE INTO availability VALUES(?,?,?,?,?)',batch)
                print('Imported availability:',source.name,flush=True)
            start,end,records=con.execute('SELECT MIN(day),MAX(day),COUNT(*) FROM availability').fetchone()
            if not records:raise ValueError('No valid availability observations.')
            meta={'inputs':inputs,'availability_start':start,'availability_end':end,'importer_version':1,
                  'rows_read':read,'excluded':excluded,'records':records}
            con.execute('INSERT INTO meta VALUES(?,?)',('dataset',json.dumps(meta)));con.commit()
            monthly = con.execute('''SELECT number,substr(day,1,7),hour,weekday,COUNT(*),SUM(bikes=0)
                FROM availability GROUP BY number,substr(day,1,7),hour,weekday''').fetchall()
        temp.replace(output)
        output.with_suffix('.monthly.json').write_text(json.dumps({'sources':inputs,'columns':['station','month','hour','weekday','observations','zero'],'counts':monthly},separators=(',',':'))+'\n')
        return meta
    finally:
        if temp.exists():temp.unlink()


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,action='append',required=True)
    parser.add_argument('--output',type=Path,default=ROOT/'data/processed/availability.sqlite3')
    args=parser.parse_args()
    print(json.dumps(build(args.archive,args.output),indent=2))
