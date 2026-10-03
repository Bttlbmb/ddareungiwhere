"""Build a separate, immutable Valhalla 3.8.3 dataset for browser routing.

Uses the saved PBF, never downloads a map.
Install pyvalhalla==3.8.3 in a separate directory/environment first.
"""
import argparse
import hashlib
import json
import struct
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.lib.files import sha256_file as digest

REVISION = 'a60c7cbfc83e073f50887cd27e0109d02e6b64e5'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode()


def build(native_lib=None):
    if native_lib:
        sys.path.insert(0, str(Path(native_lib).resolve()))
    import valhalla
    from valhalla.__version__ import __commit_id__
    if valhalla.__version__ != '3.8.3' or not REVISION.startswith(__commit_id__.removeprefix('g')):
        raise SystemExit('Use pyvalhalla 3.8.3 built from the SDK-pinned revision in a separate environment.')
    output = ROOT / 'data/processed/browser-routing'
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='build-', dir=output) as folder:
        work = Path(folder)
        tiles = work / 'tiles'
        tiles.mkdir()
        config = valhalla.get_config(tile_dir=str(tiles), tile_extract='', verbose=False)
        config['mjolnir'].update(concurrency=2, include_driving=False, include_bicycle=True,
            include_pedestrian=True, hierarchy=True, shortcuts=True)
        config['mjolnir'].pop('tile_extract', None)
        native_config = work / 'native-config.json'
        native_config.write_bytes(encoded(config))
        pbf = ROOT / 'data/raw/seoul-routing.osm.pbf'
        binary = Path(valhalla.__file__).parent / 'bin/valhalla_build_tiles'
        print('Building walking/cycling graph:', work, flush=True)
        subprocess.run([str(binary), '-c', str(native_config), str(pbf)], check=True)
        config['mjolnir']['tile_extract'] = str(work / 'graph.tar')
        native_config.write_bytes(encoded(config))
        subprocess.run([sys.executable, str(Path(valhalla.__file__).parent / 'valhalla_build_extract.py'),
                        '-c', str(native_config)], check=True)
        entries = {}
        with tarfile.open(work / 'graph.tar', 'r:') as archive:
            members = archive.getmembers()
            if members[0].name != 'index.bin':
                raise ValueError('Native archive is missing its index.')
            index = archive.extractfile(members[0]).read()
            by_offset = {m.offset_data: m for m in members[1:] if m.name.endswith('.gph')}
            for offset, tile_id, size in struct.iter_unpack('<QII', index):
                member = by_offset[offset]
                path = tiles / member.name
                if member.size != size:
                    raise ValueError('Native archive index mismatch.')
                entries[str(tile_id)] = dict(path=member.name, offset=str(offset), size=str(size), sha256=digest(path))
        runtime = json.loads(json.dumps(config))
        runtime['mjolnir'].update(tile_dir='', tile_extract='', tile_url='', admin='', timezone='')
        runtime['loki'].update(use_connectivity=False, actions=['route'])
        for section in ['mjolnir', 'loki', 'thor', 'odin']:
            runtime[section]['logging'] = {'type': '', 'color': False}
        (work / 'config.json').write_bytes(encoded(runtime))
        coverage = json.loads((ROOT / 'data/inputs/routing-coverage.json').read_text())
        south, west, north, east = coverage['bounds']
        archive_hash = digest(work / 'graph.tar')
        release = f"seoul-bike-walk-hierarchy-{archive_hash[:16]}"
        with (work / 'graph.tar').open('rb') as stream:
            header_hash = hashlib.sha256(stream.read(512)).hexdigest()
        manifest = dict(schema=1, release=release, valhallaRevision=REVISION, valhallaVersion='3.8.3',
            costings=['bicycle', 'pedestrian'], coverage=[west, south, east, north],
            source={'kind': 'openstreetmap', 'sha256': digest(pbf), 'attribution': '© OpenStreetMap contributors, ODbL 1.0',
                    'licenseUrl': 'https://www.openstreetmap.org/copyright'},
            build={'includedModes': ['bicycle', 'pedestrian'], 'nativePackage': 'pyvalhalla==3.8.3', 'hierarchy': True},
            config={'url': 'config.json', 'sha256': digest(work / 'config.json')},
            archive={'url': 'graph.tar', 'size': str((work / 'graph.tar').stat().st_size), 'etag': f'"{archive_hash}"',
                     'headerSha256': header_hash, 'indexSize': str(len(index)), 'indexSha256': hashlib.sha256(index).hexdigest()},
            tiles=entries)
        (work / 'manifest.json').write_bytes(encoded(manifest))
        (work / 'coverage.json').write_bytes(encoded(coverage))
        sizes = [int(t['size']) for t in entries.values()]
        report = dict(release=release, tiles=len(sizes), bytes=sum(sizes), largestTileBytes=max(sizes), hierarchy=True)
        (work / 'build-report.json').write_bytes(encoded(report))
        # The archive is needed only to derive release identity and index metadata.
        # Publication and native diagnostics use the retained individual tiles;
        # keep its descriptors in the manifest without storing a duplicate graph.
        (work / 'graph.tar').unlink()
        destination = output / release
        if destination.exists():
            # An identical graph release may already exist; preserve the first build.
            if digest(destination / 'config.json') != digest(work / 'config.json'):
                raise ValueError('Existing release differs; refusing to replace it.')
        else:
            work.rename(destination)
        (output / 'current.json').write_bytes(encoded({'release': release}))
        print(json.dumps(report, indent=2), flush=True)
        return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native-lib', type=Path)
    args = parser.parse_args()
    build(args.native_lib)
