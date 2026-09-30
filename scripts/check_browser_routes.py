"""Write a local-only browser/native route check page; never publish this page."""
import argparse,sys,json
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--native-lib',type=Path,required=True)
args=parser.parse_args()
sys.path.insert(0,str(args.native_lib.resolve()))
from valhalla import Actor
root=Path(__file__).resolve().parents[1]
release=json.loads((root/'data/processed/browser-routing/current.json').read_text())['release']
folder=root/'data/processed/browser-routing'/release
config=json.loads((folder/'native-config.json').read_text());config['mjolnir']['tile_dir']=str(folder/'tiles');config['mjolnir']['tile_extract']=''
actor=Actor(config)
stations=json.loads((root/'dist/site/data/stations.json').read_text());by={s['number']:s for s in stations}
pairs=[('1911','2110'),('1911','2122'),('5651','565'),('565','556'),('102','2715'),('230','2508')]
fixtures=[]
for a,b in pairs:
 if a not in by or b not in by:continue
 for mode in ['pedestrian','bicycle']:
  origin,destination=by[a],by[b];locs=[dict(lat=origin['lat'],lon=origin['lng']),dict(lat=destination['lat'],lon=destination['lng'])]
  if mode=='pedestrian':
   locs[0].update(radius=30,rank_candidates=False,search_cutoff=100)
   locs[1].update(radius=50,rank_candidates=True,search_cutoff=100,search_filter={'exclude_bridge':True})
  opts={'walking_speed':5.1} if mode=='pedestrian' else {'bicycle_type':'hybrid','cycling_speed':15}
  try: result=actor.route(dict(locations=locs,costing=mode,costing_options={mode:opts}));expected=result['trip']['summary']
  except Exception:expected=None
  fixtures.append(dict(origin=origin,destination=destination,mode=mode,expected=expected))
html='''<!doctype html><meta charset="utf-8"><title>Browser routing verification</title><h1>Browser routing verification</h1><pre id="output">Running…</pre><script type="module">
import {BrowserRoutes} from './static/routes.mjs';
const config=await(await fetch('./config.json')).json();const engine=new BrowserRoutes(config,new URL('./',location.href));const results=[];
for(const f of FIXTURES){const started=performance.now();const estimate=await engine.estimate(f.origin,f.destination,f.mode);results.push({...f,estimate,ms:performance.now()-started});document.querySelector('#output').textContent=JSON.stringify({results,samples:engine.samples,lastError:engine.lastError},null,2);}
document.querySelector('#output').dataset.done='true';
</script>'''.replace('FIXTURES',json.dumps(fixtures))
(root/'dist/site/__routing_check.html').write_text(html)
print('Fixtures:',len(fixtures))
