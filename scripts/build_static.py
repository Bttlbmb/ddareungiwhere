"""Export only public assets and sufficient historical statistics; no secrets.

The resulting dist/site folder runs on an ordinary static HTTP server/Pages.
The SDK is obtained separately, pinned to valhalla-browser 0.2.1.
"""
import argparse
import gzip
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))
from scripts.lib.files import write_json
from scripts.lib.export_data import export_history, export_streets
from scripts.lib.sdk import install_sdk
from scripts.lib.localization import korean_page


def build(sdk, output, graph_url='', months=6, history_db=None):
    output = output.resolve()
    if output == ROOT or output in ROOT.parents:
        raise ValueError('Output must be a dedicated publication directory.')
    for value in [graph_url]:
        if value:
            parsed = urlsplit(value)
            if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.scheme not in ('http', 'https'):
                raise ValueError('Public URLs must have no credentials/query/fragment.')
            if parsed.scheme == 'http' and parsed.hostname not in ('localhost', '127.0.0.1'):
                raise ValueError('Public endpoints must use HTTPS.')
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.static-', dir=output.parent))
    try:
        for name in ['app.js', 'style.css', 'sitemap.xml']:
            shutil.copyfile(ROOT / 'web' / name, staging / name)
        catalog = json.loads((ROOT / 'web/i18n.json').read_text())
        app = (staging / 'app.js').read_text()
        marker = '/*__KOREAN_TRANSLATIONS__*/ {}'
        if app.count(marker) != 1:
            raise ValueError('Expected exactly one embedded translation catalog marker.')
        (staging / 'app.js').write_text(app.replace(marker, json.dumps(catalog, ensure_ascii=False, separators=(',', ':'))))
        for name in ['vendor', 'assets', 'static']:
            shutil.copytree(ROOT / 'web' / name, staging / name)
        html = (ROOT / 'web/index.html').read_text()
        html = html.replace('href="/', 'href="./').replace('src="/', 'src="./')
        html = html.replace('<script src="./app.js" defer></script>', '<script type="module" src="./static/start.mjs"></script>')
        (staging / 'index.html').write_text(html)
        (staging / 'ko').mkdir()
        (staging / '.nojekyll').touch()
        clean = json.loads((ROOT / 'data/inputs/stations.json').read_text())
        write_json(staging / 'data/stations.json', clean)
        stations_file = staging / 'data/stations.json'
        stations_file.with_suffix('.json.gz').write_bytes(gzip.compress(stations_file.read_bytes(), mtime=0))
        stations_file.unlink()
        history = export_history(history_db or ROOT / 'data/processed/availability.sqlite3', staging / 'data', months)
        shards = export_streets(staging / 'data')
        install_sdk(sdk, staging / 'vendor/valhalla')
        current = json.loads((ROOT / 'data/processed/browser-routing/current.json').read_text())
        source = ROOT / 'data/processed/browser-routing' / current['release']
        if not graph_url:
            target = staging / 'routing' / current['release']
            target.mkdir(parents=True)
            for name in ['manifest.json', 'config.json']:
                shutil.copyfile(source / name, target / name)
            for tile in (source / 'tiles').rglob('*.gph'):
                compressed = target / 'tiles' / tile.relative_to(source / 'tiles').with_suffix('.gph.gz')
                compressed.parent.mkdir(parents=True, exist_ok=True)
                compressed.write_bytes(gzip.compress(tile.read_bytes(), mtime=0))
            graph_url = f'./routing/{current["release"]}/manifest.json'
        write_json(staging / 'config.json', {'schema': 1, 'manifestUrl': graph_url})
        # Keep code and configuration coherent for returning Pages visitors.
        # Graph releases already have immutable paths; version the small UI files.
        module_paths = sorted((staging / 'static').glob('*.mjs'))
        revision_hash = hashlib.sha256()
        for path in [staging / 'config.json', staging / 'app.js', staging / 'style.css', *module_paths,
                     *sorted(p for p in (staging / 'data').rglob('*') if p.is_file()),
                     *sorted(p for p in (staging / 'vendor/valhalla').iterdir() if p.is_file())]:
            revision_hash.update(path.read_bytes())
        revision = revision_hash.hexdigest()[:16]
        for path in module_paths:
            text = re.sub(r"(['\"])(\.\.?/[^'\"]+\.(?:mjs|js))\1", lambda match: f'{match[1]}{match[2]}?v={revision}{match[1]}', path.read_text())
            path.write_text(text)
        html = (staging / 'index.html').read_text().replace('./static/start.mjs', f'./static/start.mjs?v={revision}').replace('./style.css', f'./style.css?v={revision}')
        (staging / 'index.html').write_text(html)
        (staging / 'ko/index.html').write_text(korean_page(html, catalog))
        # Street shards are requested explicitly compressed, including on Pages.
        for path in list(staging.rglob('*')):
            if path.is_file() and path.suffix in ('.json', '.js', '.mjs', '.css', '.wasm', '.html', '.gph'):
                if path.parent.name == 'streets':
                    compressed = path.with_suffix('.json.gz')
                    compressed.write_bytes(gzip.compress(path.read_bytes(), mtime=0))
                    path.unlink()
        if output.exists():
            # Only this generated directory is replaced; sources/data are untouched.
            if not (output / '.nojekyll').exists():
                raise ValueError('Existing output is not a generated site; refusing replacement.')
            shutil.rmtree(output)
        staging.rename(output)
        print(json.dumps({'output': str(output), 'stations': len(clean), 'historyGzipBytes': (output / 'data' / history['counts_url']).stat().st_size,
                          'availabilityMonths': history['observed_months'], 'streetShards': shards,
                          'graph': current['release'], 'bytes': sum(p.stat().st_size for p in output.rglob('*') if p.is_file())}, indent=2))
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, required=True, help='Unpacked package/dist from valhalla-browser@0.2.1')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/site')
    parser.add_argument('--graph-url', default='')
    parser.add_argument('--months', type=int, default=6)
    parser.add_argument('--history-db', type=Path, help='Optional dedicated availability database')
    args = parser.parse_args()
    if not 1 <= args.months <= 120:
        parser.error('--months must be between 1 and 120.')
    build(args.sdk, args.output, args.graph_url, args.months, args.history_db)
