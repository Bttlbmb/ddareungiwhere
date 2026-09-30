"""Prepare an existing publication checkout with an explicit public allowlist.

Run build_static.py first. This does not commit, push or alter Pages settings.
Credentials/raw datasets/local configuration are never copied.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES=['app.py','routing.py','streets.py','.gitignore','.env.example','STATIC_SETUP.md']
NOTES=['README.md','SPEC.md','DESIGN.md','ARCHITECTURE.md','DECISIONS.md','plan.md','DATA_SOURCES.md','REVIEW.md','DATA_AUDIT.md','METHODOLOGY_AUDIT.md','MODEL_AUDIT.md']
README='''# 따릉이 Where?

Static Seoul public-bike station comparison prototype. The browser compares five nearby departures, calculates walking/cycling estimates using Valhalla WebAssembly, and reads compact historical availability counts.

Site: https://bttlbmb.github.io/ddareungiwhere/

Enable **Settings → Pages → Deploy from a branch → main → /docs**. The generated site is in `docs/`; source is in `web/`, `worker/` and `scripts/`. Do not edit generated files to maintain application behavior: rebuild from source.

Live bike counts are currently disconnected. The prepared Cloudflare proxy keeps the Seoul credential server-side, but a supported secure upstream endpoint must be verified first. See [the account and deployment walkthrough](STATIC_SETUP.md).

History currently covers October–December 2025. The builder supports six calendar months when those source months are supplied. Historical bands are descriptive, not refill forecasts.

The publication includes an OSM-derived routing graph and street geometry, with contributor attribution and ODbL reference, and retained SDK/dependency licenses. It excludes credentials, raw station/count extracts, raw rental records and local SQLite. The existing Python app and build scripts require separately obtained local data/environment; this checkout does not automatically download them. Maintainer context and measurements are in [project notes](project-notes/README.md).

Verification: 37 Python checks and 30 Node checks passed in the source workspace; ten browser routes matched native Valhalla 3.8.3. See [dated validation](project-notes/REVIEW.md). The known Oksu pier walking detour and physical-phone performance remain open.
'''

def prepare(checkout):
    checkout=checkout.resolve()
    if checkout==ROOT or checkout in ROOT.parents or not (checkout/'.git').exists():
        raise ValueError('Choose a separate existing Git publication checkout.')
    remote=subprocess.check_output(['git','-C',str(checkout),'remote','get-url','origin'],text=True).strip()
    if remote not in ('https://github.com/Bttlbmb/ddareungiwhere.git','git@github.com:Bttlbmb/ddareungiwhere.git'):raise ValueError('Unexpected publication remote.')
    for name in FILES:
        if (ROOT/name).is_file():shutil.copyfile(ROOT/name,checkout/name)
    for name in ['web','scripts','worker','tests']:
        shutil.copytree(ROOT/name,checkout/name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc','node_modules','.wrangler','.dev.vars*'))
    # Workers Builds may start at the repository root. Generate this entry
    # from the canonical Worker config, so either root-directory choice works.
    worker_config=json.loads((ROOT/'worker/wrangler.jsonc').read_text())
    worker_config['main']='worker/src/worker.mjs'
    (checkout/'wrangler.jsonc').write_text('// Generated from worker/wrangler.jsonc by scripts/prepare_publication.py.\n'+json.dumps(worker_config,indent=2)+'\n')
    (checkout/'project-notes').mkdir(exist_ok=True)
    for name in NOTES:
        if (ROOT/name).is_file():shutil.copyfile(ROOT/name,checkout/'project-notes'/name)
    shutil.copyfile(ROOT/'STATIC_SETUP.md',checkout/'project-notes/STATIC_SETUP.md')
    if (ROOT/'docs').exists():shutil.copytree(ROOT/'docs',checkout/'project-notes/docs',dirs_exist_ok=True)
    # Include only generated public files; local diagnostic pages are excluded.
    shutil.copytree(ROOT/'dist/site',checkout/'docs',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__*'))
    (checkout/'README.md').write_text(README)
    setup=(checkout/'STATIC_SETUP.md').read_text().replace('[REVIEW.md](REVIEW.md)','[REVIEW.md](project-notes/REVIEW.md)')
    (checkout/'STATIC_SETUP.md').write_text(setup)
    # Scan every candidate public byte against the actual local key, without
    # ever printing the key or copying its source file.
    keys=[]
    for path in ROOT.glob('.env*'):
        if path.name=='.env.example':continue
        for line in path.read_text().splitlines():
            if line.startswith('SEOUL_OPEN_DATA_API_KEY='):
                value=line.split('=',1)[1].strip().strip('\"\'')
                if value:keys.append(value.encode())
    count=0
    for path in checkout.rglob('*'):
        relative=path.relative_to(checkout)
        if '.git' in relative.parts or not path.is_file():continue
        if path.name.startswith('.env') and path.name!='.env.example':raise ValueError('Private config in publication checkout.')
        content=path.read_bytes()
        if any(key in content for key in keys):raise ValueError('Credential found; publication prohibited.')
        if len(content)>=100*1024*1024:raise ValueError('Asset exceeds GitHub file limit.')
        count+=1
    print(f'Prepared {count} public files; credential scan passed. No commit/push performed.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('checkout',type=Path);args=parser.parse_args();prepare(args.checkout)
