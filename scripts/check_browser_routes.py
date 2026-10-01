"""Write a local-only browser/native route check page; never publish this page.

The matching native 3.8.3 actor supplies expected time/distance. Pedestrian
parity allows rounding of the additional endpoint-access distance, not detours.
"""
import argparse
import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAIRS = [('1911', '2110'), ('1911', '2122'), ('5651', '565'),
         ('565', '556'), ('102', '2715'), ('230', '2508')]


def main(native_lib):
    sys.path.insert(0, str(native_lib.resolve()))
    from valhalla import Actor
    from valhalla.__version__ import __commit_id__
    from scripts.build_browser_graph import REVISION
    import valhalla
    if valhalla.__version__ != '3.8.3' or not REVISION.startswith(__commit_id__.removeprefix('g')):
        raise ValueError('Route checks require the SDK-matching native Valhalla 3.8.3 revision.')
    release = json.loads((ROOT / 'data/processed/browser-routing/current.json').read_text())['release']
    folder = ROOT / 'data/processed/browser-routing' / release
    config = json.loads((folder / 'native-config.json').read_text())
    config['mjolnir'].update(tile_dir=str(folder / 'tiles'), tile_extract='')
    actor = Actor(config)
    stations = json.loads(gzip.decompress((ROOT / 'dist/site/data/stations.json.gz').read_bytes()))
    by_number = {station['number']: station for station in stations}
    fixtures = []
    for a, b in PAIRS:
        if a not in by_number or b not in by_number:
            continue
        origin, destination = by_number[a], by_number[b]
        for mode, station_at_origin in [('pedestrian', False), ('bicycle', False), ('pedestrian', True)]:
            locations = [dict(lat=point['lat'], lon=point['lng']) for point in (origin, destination)]
            if mode == 'pedestrian':
                locations[int(station_at_origin)].update(radius=30, rank_candidates=False, search_cutoff=100)
                locations[int(not station_at_origin)].update(radius=50, rank_candidates=True, search_cutoff=100,
                                    search_filter={'exclude_bridge': True})
            options = {'walking_speed': 5.1} if mode == 'pedestrian' else {'bicycle_type': 'hybrid', 'cycling_speed': 15}
            result = actor.route(dict(locations=locations, costing=mode, costing_options={mode: options}))
            fixtures.append(dict(origin=origin, destination=destination, mode=mode, stationAtOrigin=station_at_origin, expected=result['trip']['summary']))
    if not fixtures:
        raise ValueError('No route fixtures match this station catalogue.')
    html = '''<!doctype html><meta charset="utf-8"><title>Browser routing verification</title>
<h1>Browser routing verification</h1><pre id="output">Running…</pre><script type="module">
import {BrowserRoutes} from './static/routes.mjs';
const config=await(await fetch('./config.json')).json();
config.debugRoutes=true;
const engine=new BrowserRoutes(config,new URL('./',location.href)),results=[];
const output=document.querySelector('#output');
for(const fixture of FIXTURES){
  const started=performance.now();
  const estimate=await engine.estimate(fixture.origin,fixture.destination,fixture.mode,undefined,{stationAtOrigin:fixture.stationAtOrigin});
  const access=estimate.access_distance_m||0;
  const pass=!estimate.error&&Math.abs(estimate.minutes-fixture.expected.time/60-access/85)<0.0061
    &&Math.abs(estimate.distance_m-fixture.expected.length*1000-access)<=1;
  results.push({...fixture,estimate,pass,ms:performance.now()-started});
  output.textContent=JSON.stringify({results,samples:engine.samples,lastError:engine.lastError},null,2);
}
output.dataset.done='true';
output.dataset.passed=String(results.every(result=>result.pass));
</script>'''.replace('FIXTURES', json.dumps(fixtures))
    (ROOT / 'dist/site/__routing_check.html').write_text(html)
    print('Fixtures:', len(fixtures))


if __name__ == '__main__':
    sys.path.insert(0, str(ROOT))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native-lib', type=Path, required=True)
    main(parser.parse_args().native_lib)
