"""Export only public assets and sufficient historical statistics; no secrets.

The resulting dist/site folder runs on an ordinary static HTTP server/Pages.
The SDK is obtained separately, pinned to valhalla-browser 0.2.1.
"""
import argparse
import gzip
import hashlib
import json
import math
import shutil
import sqlite3
import tempfile
from collections import defaultdict
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')


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
    history = dict(schema=1, stations=numbers, counts=counts, availability_start=dates[0], availability_end=dates[1],
        requested_months=months, window_start=start, observed_months=sorted({d[:7] for d in dates if d}),
        order='station, weekend then weekday, hour 0..23', sources=availability_sources,
        method='Recorded station/date/hour observations; missing excluded; weekday/weekend pooled; zero frequency.',
        minimum_observations=20, thresholds=[0.05, 0.2], source_url='https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do')
    # Actual observed months, not just the two endpoints.
    with closing(sqlite3.connect(f'file:{db}?mode=ro', uri=True)) as con:
        history['observed_months'] = [r[0] for r in con.execute('SELECT DISTINCT substr(day,1,7) FROM availability WHERE day>=? ORDER BY 1', (start,))]
    write_json(destination / 'history.json', history)
    return history


def export_streets(destination):
    from streets import StreetNames
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


def install_sdk(sdk, destination):
    runtime = json.loads((sdk / 'runtime.json').read_text())
    expected = runtime['artifacts']['public/wasm/valhalla.wasm']['sha256']
    if runtime['sdk'] != 'valhalla-browser@0.2.1' or hashlib.sha256((sdk / 'valhalla-browser.wasm').read_bytes()).hexdigest() != expected:
        raise ValueError('Unexpected SDK/runtime; use valhalla-browser 0.2.1.')
    destination.mkdir(parents=True)
    for name in ['index.js', 'worker.js', 'valhalla-browser.wasm', 'runtime.json']:
        shutil.copyfile(sdk / name, destination / name)
    shutil.copytree(sdk / 'licenses', destination / 'licenses')
    shutil.copyfile(sdk.parent / 'LICENSE', destination / 'LICENSE')
    # Upstream fixes correlation for every profile. Preserve this app's existing
    # pedestrian origin/station matching instead. Native WASM is unchanged.
    worker = destination / 'worker.js'
    text = worker.read_text()
    old = 'r.map(({lat:e,lon:t})=>({lat:e,lon:t,radius:30,minimum_reachability:0}))'
    new = 'r.map(({lat:e,lon:n},i)=>({lat:e,lon:n,...(t===`pedestrian`?{radius:i?50:30,rank_candidates:!!i,search_cutoff:100,...(i?{search_filter:{exclude_bridge:true}}:{})}:{})}))'
    if text.count(old) != 1:
        raise ValueError('SDK correlation patch no longer matches; inspect before upgrading.')
    text = text.replace(old, new)
    # Full tiles are pinned and SHA-256 verified by TileLoader. Accept ordinary
    # static hosts' ETags and transparent HTTP compression for FULL GETs only;
    # bounded decoded length + SHA-256 + native GraphId checks remain mandatory.
    # Range transport retains every upstream validator/encoding check.
    replacements = {
        'o=await fetch(e,{headers:r?{Range:i}:{},...p,signal:n})': 'o=await fetch(!r&&e.endsWith(`.gph`)?e+`.gz`:e,{headers:r?{Range:i}:{},...p,signal:n})',
        'o.headers.get(`ETag`)!==t.etag&&m(': 'r&&o.headers.get(`ETag`)!==t.etag&&m(',
        'e&&e!==`identity`&&m(`DATASET`,`Encoded graph responses are unsupported.`)': 'r&&e&&e!==`identity`&&m(`DATASET`,`Encoded graph responses are unsupported.`)',
        'i!==null&&i!==String(t.length)&&m(`DATASET`,`Content-Length mismatch.`)': 'r&&i!==null&&i!==String(t.length)&&m(`DATASET`,`Content-Length mismatch.`)',
    }
    for old, new in replacements.items():
        if text.count(old) != 1:
            raise ValueError('SDK full-tile delivery patch no longer matches; inspect before upgrading.')
        text = text.replace(old, new)
    old = 'let e=o.headers.get(`Content-Encoding`);r&&e&&e!==`identity`'
    new = 'let encoding=o.headers.get(`Content-Encoding`);r&&encoding&&encoding!==`identity`'
    if text.count(old) != 1:
        raise ValueError('SDK content-encoding patch no longer matches.')
    text = text.replace(old, new)
    old = 'bytes:await a(o,t.length,n),headers:Object.fromEntries'
    new = 'bytes:!r&&e.endsWith(`.gph`)?await(async()=>{const b=await a(o,t.length+65536,n,{exact:false});return b[0]===31&&b[1]===139?await a(new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream(`gzip`))),t.length,n):b})():await a(o,t.length,n),headers:Object.fromEntries'
    if text.count(old) != 1:
        raise ValueError('SDK compressed-tile patch no longer matches.')
    text = text.replace(old, new)
    worker.write_text('// Local correlation/full-tile delivery patches: see scripts/build_static.py; SDK licenses retained.\n' + text)


def build(sdk, output, live_url='', graph_url='', months=6, history_db=None):
    import sys
    sys.path.insert(0, str(ROOT))
    from app import Inventory
    output = output.resolve()
    if output == ROOT or output in ROOT.parents:
        raise ValueError('Output must be a dedicated publication directory.')
    for value in [live_url, graph_url]:
        if value:
            parsed = urlsplit(value)
            if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.scheme not in ('http', 'https'):
                raise ValueError('Public URLs must have no credentials/query/fragment.')
            if parsed.scheme == 'http' and parsed.hostname not in ('localhost', '127.0.0.1'):
                raise ValueError('Public endpoints must use HTTPS.')
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.static-', dir=output.parent))
    try:
        for name in ['app.js', 'style.css']:
            shutil.copyfile(ROOT / 'web' / name, staging / name)
        for name in ['vendor', 'assets', 'static']:
            shutil.copytree(ROOT / 'web' / name, staging / name)
        html = (ROOT / 'web/index.html').read_text()
        html = html.replace('href="/', 'href="./').replace('src="/', 'src="./')
        html = html.replace('<script src="./app.js" defer></script>', '<script type="module" src="./static/start.mjs"></script>')
        (staging / 'index.html').write_text(html)
        (staging / '.nojekyll').touch()
        stations, _ = Inventory().snapshot()
        # This is an explicit allowlist, not a copy of the raw inventory files.
        clean = [{k: s[k] for k in ['id', 'number', 'name', 'lat', 'lng']} for s in stations]
        write_json(staging / 'data/stations.json', clean)
        write_json(staging / 'data/popular_routes.json', json.loads((ROOT / 'data/processed/popular_routes.json').read_text()))
        history = export_history(history_db or ROOT / 'data/processed/planner.sqlite3', staging / 'data', months)
        shards = export_streets(staging / 'data')
        install_sdk(sdk, staging / 'vendor/valhalla')
        current = json.loads((ROOT / 'data/processed/browser-routing/current.json').read_text())
        source = ROOT / 'data/processed/browser-routing' / current['release']
        if not graph_url:
            target = staging / 'routing' / current['release']
            target.mkdir(parents=True)
            for name in ['manifest.json', 'config.json']:
                shutil.copyfile(source / name, target / name)
            shutil.copytree(source / 'tiles', target / 'tiles')
            graph_url = f'./routing/{current["release"]}/manifest.json'
        write_json(staging / 'config.json', {'schema': 1, 'liveSource': 'proxy' if live_url else 'seoul-website', 'liveUrl': live_url or None, 'manifestUrl': graph_url})
        # Optional gzip siblings for servers that support content negotiation.
        for path in list(staging.rglob('*')):
            if path.is_file() and path.suffix in ('.json', '.js', '.mjs', '.css', '.wasm', '.html', '.gph'):
                Path(str(path) + '.gz').write_bytes(gzip.compress(path.read_bytes(), mtime=0))
        if output.exists():
            # Only this generated directory is replaced; sources/data are untouched.
            if not (output / '.nojekyll').exists():
                raise ValueError('Existing output is not a generated site; refusing replacement.')
            shutil.rmtree(output)
        staging.rename(output)
        print(json.dumps({'output': str(output), 'stations': len(clean), 'historyGzipBytes': (output / 'data/history.json.gz').stat().st_size,
                          'availabilityMonths': history['observed_months'], 'streetShards': shards,
                          'graph': current['release'], 'bytes': sum(p.stat().st_size for p in output.rglob('*') if p.is_file())}, indent=2))
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, required=True, help='Unpacked package/dist from valhalla-browser@0.2.1')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/site')
    parser.add_argument('--live-url', default='')
    parser.add_argument('--graph-url', default='')
    parser.add_argument('--months', type=int, default=6)
    parser.add_argument('--history-db', type=Path, help='Optional dedicated availability database')
    args = parser.parse_args()
    if not 1 <= args.months <= 120:
        parser.error('--months must be between 1 and 120.')
    build(args.sdk, args.output, args.live_url, args.graph_url, args.months, args.history_db)
