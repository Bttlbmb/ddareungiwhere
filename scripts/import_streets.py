"""Build a compact local street-name extract from the saved Overpass response."""
import gzip
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Explicit new Overpass response (.json or .json.gz).')
    args = parser.parse_args()
    source = args.source or ROOT / 'data/raw/seoul_streets_osm.json.gz'
    if not source.exists() and not args.source:
        source = ROOT / 'data/raw/seoul_streets_osm.json'
    source = source.resolve()
    if source.suffix == '.gz':
        with gzip.open(source, 'rt', encoding='utf-8') as stream:
            payload = json.load(stream)
    else:
        payload = json.loads(source.read_text())
    if payload.get('remark') or not payload.get('elements'):
        raise SystemExit('Street extract was empty or incomplete; keep the previous dataset.')
    streets = []
    for element in payload['elements']:
        tags = element.get('tags', {})
        name = tags.get('name:en') or tags.get('name')
        geometry = element.get('geometry', [])
        if name and len(geometry) >= 2:
            streets.append([name, [[p['lat'], p['lon']] for p in geometry]])
    if not streets:
        raise SystemExit('No named street geometry found.')
    output = ROOT / 'data/processed/seoul_streets.json.gz'
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.gz.part')
    content = {'source': 'OpenStreetMap contributors / Overpass API',
               'license': 'ODbL 1.0', 'timestamp': payload.get('osm3s', {}).get('timestamp_osm_base'),
               'query': (ROOT / 'scripts/seoul_streets.overpass').read_text(), 'streets': streets}
    temp.write_bytes(gzip.compress(json.dumps(content, ensure_ascii=False, separators=(',', ':')).encode(), mtime=0))
    temp.replace(output)
    manifest_path = ROOT / 'data/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    for path in (source, output):
        relative = str(path.relative_to(ROOT))
        previous = next((item for item in manifest['files'] if item['path'] == relative), {})
        manifest['files'] = [item for item in manifest['files'] if item['path'] != relative]
        with path.open('rb') as stream:
            sha = hashlib.file_digest(stream, 'sha256').hexdigest()
        manifest['files'].append({**previous, 'path': relative, 'bytes': path.stat().st_size,
            'sha256': sha,
            'source': 'OpenStreetMap contributors',
            'url': previous.get('url', 'https://overpass-api.de/api/interpreter'),
            'license': 'ODbL 1.0', 'source_timestamp': content['timestamp'],
            'query_file': 'scripts/seoul_streets.overpass',
            'scope': 'Named streets in the Seoul bounding box; nearest-street labels, not verified postal addresses'})
    temporary = manifest_path.with_suffix('.json.part')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(manifest_path)
    print(f'Imported {len(streets):,} named ways; compressed lookup {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
