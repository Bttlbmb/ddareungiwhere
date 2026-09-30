"""Losslessly archive monthly downloads, verifying every byte before removal."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHUNK = 1024 * 1024


def digest(stream):
    sha = hashlib.sha256()
    size = 0
    for block in iter(lambda: stream.read(CHUNK), b''):
        sha.update(block)
        size += len(block)
    return size, sha.hexdigest()


def compress(source):
    """Return verified archive metadata; never remove the source here."""
    target = source.with_suffix(source.suffix + '.gz')
    with source.open('rb') as stream:
        original_size, original_hash = digest(stream)
    if not target.exists():
        temporary = target.with_suffix('.gz.part')
        with temporary.open('xb') as output:
            try:
                with gzip.GzipFile(filename='', mode='wb', fileobj=output,
                                   compresslevel=6, mtime=0) as archive:
                    with source.open('rb') as stream:
                        for block in iter(lambda: stream.read(CHUNK), b''):
                            archive.write(block)
            except BaseException:
                temporary.unlink(missing_ok=True)
                raise
        try:
            with gzip.open(temporary, 'rb') as stream:
                restored = digest(stream)
            if restored != (original_size, original_hash):
                raise ValueError(f'Archive verification failed: {source.name}')
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    else:
        # Existing archives need full verification; newly written ones were checked above.
        with gzip.open(target, 'rb') as stream:
            if digest(stream) != (original_size, original_hash):
                raise ValueError(f'Archive differs from source: {target.name}')
    with target.open('rb') as stream:
        size, sha = digest(stream)
    return {'path': str(target.relative_to(ROOT)), 'bytes': size, 'sha256': sha,
            'compression': 'gzip', 'uncompressed': {
                'path': str(source.relative_to(ROOT)), 'bytes': original_size,
                'sha256': original_hash}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--remove-originals', action='store_true',
                        help='Remove CSVs only after full verification and manifest update.')
    args = parser.parse_args()
    manifest_path = ROOT / 'data/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    for source in sorted((ROOT / 'data/raw').glob('trips_20????.csv')):
        original_path = str(source.relative_to(ROOT))
        entry = next((item for item in manifest['files']
                      if item['path'] == original_path or
                      item.get('uncompressed', {}).get('path') == original_path), None)
        if entry is None:
            raise ValueError(f'Record download provenance first: {source.name}')
        record = compress(source)
        expected = entry.get('uncompressed', entry)
        if (expected['bytes'], expected['sha256']) != (
                record['uncompressed']['bytes'], record['uncompressed']['sha256']):
            raise ValueError(f'Source does not match recorded provenance: {source.name}')
        entry.update(record)
        # Derived inputs keep their original logical names: uncompressed.path
        # links those historical references to the lossless archive now stored.
        temporary = manifest_path.with_suffix('.json.part')
        temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        temporary.replace(manifest_path)
        if args.remove_originals:
            source.unlink()
        saved = record['uncompressed']['bytes'] - record['bytes']
        print(f'{source.name}: verified archive; {saved:,} bytes smaller', flush=True)


if __name__ == '__main__':
    main()
