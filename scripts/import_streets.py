"""Build a compact local street-name extract from the saved Overpass response."""
import gzip
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def named_streets(payload):
    """Validate named ways before replacing the usable local extract."""
    if not isinstance(payload, dict) or payload.get('remark') or not isinstance(payload.get('elements'), list) or not payload['elements']:
        raise SystemExit('Street extract was empty or incomplete; keep the previous dataset.')
    streets = []
    for element in payload['elements']:
        if not isinstance(element, dict) or not isinstance(element.get('tags', {}), dict):
            raise SystemExit('Invalid street source element; keep the previous dataset.')
        tags = element.get('tags', {})
        name = tags.get('name:en') or tags.get('name')
        if not name:
            continue
        name_ko = tags.get('name:ko') or tags.get('name') or name
        geometry = element.get('geometry', [])
        if not isinstance(name, str) or not isinstance(name_ko, str) or not isinstance(geometry, list):
            raise SystemExit('Invalid street name or geometry; keep the previous dataset.')
        if len(geometry) < 2:
            continue
        points = []
        for point in geometry:
            if not isinstance(point, dict) or any(
                isinstance(point.get(key), bool) or not isinstance(point.get(key), (int, float)) or
                not math.isfinite(point[key]) or not -limit <= point[key] <= limit
                for key, limit in [('lat', 90), ('lon', 180)]
            ):
                raise SystemExit('Invalid street coordinates; keep the previous dataset.')
            points.append([point['lat'], point['lon']])
        street = [name, points]
        # Older two-field extracts remain valid. Store a second label only
        # when Korean differs from the English-preferred name.
        if name_ko != name:
            street.append(name_ko)
        streets.append(street)
    if not streets:
        raise SystemExit('No named street geometry found.')
    return streets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Project-local Overpass response (.json or .json.gz).')
    args = parser.parse_args()
    source = args.source or ROOT / 'data/raw/seoul_streets_osm.json.gz'
    if not source.exists() and not args.source:
        source = ROOT / 'data/raw/seoul_streets_osm.json'
    source = source.resolve()
    if not source.is_relative_to(ROOT):
        raise SystemExit('Street source must be inside this project; copy the response under data/raw first.')
    manifest_path = ROOT / 'data/manifest.json'
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit('Street manifest could not be read; keep the previous dataset.') from error
    if not isinstance(manifest, dict) or not isinstance(manifest.get('files'), list) or any(
            not isinstance(item, dict) or not isinstance(item.get('path'), str) for item in manifest['files']):
        raise SystemExit('Street manifest must contain a files list with recorded paths; keep the previous dataset.')
    if source.suffix == '.gz':
        with gzip.open(source, 'rt', encoding='utf-8') as stream:
            payload = json.load(stream)
    else:
        payload = json.loads(source.read_text(encoding='utf-8'))
    streets = named_streets(payload)
    output = ROOT / 'data/processed/seoul_streets.json.gz'
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.gz.part')
    content = {'source': 'OpenStreetMap contributors / Overpass API',
               'license': 'ODbL 1.0', 'timestamp': payload.get('osm3s', {}).get('timestamp_osm_base'),
               'query': (ROOT / 'scripts/seoul_streets.overpass').read_text(), 'streets': streets}
    temp.write_bytes(gzip.compress(json.dumps(content, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8'), mtime=0))
    for path in (source, output):
        relative = str(path.relative_to(ROOT))
        previous = next((item for item in manifest['files'] if item['path'] == relative), {})
        manifest['files'] = [item for item in manifest['files'] if item['path'] != relative]
        measured = temp if path == output else path
        with measured.open('rb') as stream:
            sha = hashlib.file_digest(stream, 'sha256').hexdigest()
        manifest['files'].append({**previous, 'path': relative, 'bytes': measured.stat().st_size,
            'sha256': sha,
            'source': 'OpenStreetMap contributors',
            'url': previous.get('url', 'https://overpass-api.de/api/interpreter'),
            'license': 'ODbL 1.0', 'source_timestamp': content['timestamp'],
            'query_file': 'scripts/seoul_streets.overpass',
            'scope': 'Named streets in the Seoul bounding box; nearest-street labels, not verified postal addresses'})
    temporary = manifest_path.with_suffix('.json.part')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temp.replace(output)
    temporary.replace(manifest_path)
    print(f'Imported {len(streets):,} named ways; compressed lookup {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
