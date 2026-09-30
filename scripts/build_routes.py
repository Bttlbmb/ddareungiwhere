"""Rebuild the local bicycle graph from the saved OSM PBF; run with .venv/bin/python."""
import json
import subprocess
from pathlib import Path
import valhalla

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'data/processed/valhalla'

if __name__ == '__main__':
    tiles = DIRECTORY / 'tiles'
    tiles.mkdir(parents=True, exist_ok=True)
    config = valhalla.get_config(tile_dir=tiles, tile_extract='', verbose=False)
    config['mjolnir']['concurrency'] = 2
    path = DIRECTORY / 'valhalla.json'
    path.write_text(json.dumps(config))
    binary = Path(valhalla.__file__).parent / 'bin/valhalla_build_tiles'
    subprocess.run([str(binary), '-c', str(path), '-j', '2',
                    str(ROOT / 'data/raw/seoul-routing.osm.pbf')], check=True)
    print(f'Routing graph ready at {DIRECTORY}')
