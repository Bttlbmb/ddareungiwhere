"""Synchronize an allowlisted static source/site checkout, including removals.

The source workspace is separate from the Git publication checkout. This tool
never commits, pushes, changes cloud accounts, or copies raw/private inputs.
"""
import argparse
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['README.md', 'AGENTS.md', 'SPEC.md', 'DESIGN.md', 'ARCHITECTURE.md',
         'DECISIONS.md', 'plan.md', 'DATA_SOURCES.md', 'REVIEW.md', 'STATIC_SETUP.md',
         '.gitignore', 'requirements-routing.txt']
DIRECTORIES = ['web', 'scripts', 'tests']
REMOVED = ['app.py', 'routing.py', 'streets.py', 'worker', 'wrangler.jsonc',
           'project-notes', '.env.example', 'requirements.txt']
IGNORE = shutil.ignore_patterns('__pycache__', '*.pyc', 'node_modules', '.wrangler', '.dev.vars*', '__*.html')


def replace_tree(source, destination):
    """Build the replacement first; stale files must not survive publication."""
    temporary = destination.with_name(destination.name + '.staging')
    if temporary.exists():
        shutil.rmtree(temporary)
    shutil.copytree(source, temporary, ignore=IGNORE)
    if destination.exists():
        shutil.rmtree(destination)
    temporary.rename(destination)


def prepare(checkout):
    checkout = checkout.resolve()
    if checkout == ROOT or checkout in ROOT.parents or not (checkout / '.git').exists():
        raise ValueError('Choose a separate existing Git publication checkout.')
    remote = subprocess.check_output(['git', '-C', str(checkout), 'remote', 'get-url', 'origin'], text=True).strip()
    if remote not in ('https://github.com/Bttlbmb/ddareungiwhere.git', 'git@github.com:Bttlbmb/ddareungiwhere.git'):
        raise ValueError('Unexpected publication remote.')
    for name in REMOVED:
        path = checkout / name
        if path.is_dir():
            shutil.rmtree(path)
        elif path.exists():
            path.unlink()
    for name in FILES:
        shutil.copyfile(ROOT / name, checkout / name)
    for name in DIRECTORIES:
        replace_tree(ROOT / name, checkout / name)
    replace_tree(ROOT / 'data/inputs', checkout / 'data/inputs')
    shutil.copyfile(ROOT / 'data/manifest.json', checkout / 'data/manifest.json')
    replace_tree(ROOT / 'dist/site', checkout / 'docs')
    keys = []
    for path in ROOT.glob('.env*'):
        if path.name == '.env.example':
            continue
        for line in path.read_text().splitlines():
            if line.startswith('SEOUL_OPEN_DATA_API_KEY='):
                value = line.split('=', 1)[1].strip().strip('"\'')
                if value:
                    keys.append(value.encode())
    count = size = 0
    for path in checkout.rglob('*'):
        relative = path.relative_to(checkout)
        if '.git' in relative.parts or not path.is_file():
            continue
        if path.name.startswith('.env') or path.suffix == '.sqlite3' or 'raw' in relative.parts:
            raise ValueError('Private/source database in publication checkout.')
        content = path.read_bytes()
        if any(key in content for key in keys):
            raise ValueError('Credential found; publication prohibited.')
        if len(content) >= 100 * 1024 * 1024:
            raise ValueError('Asset exceeds GitHub file limit.')
        count += 1
        size += len(content)
    print(f'Prepared {count} files, {size:,} bytes; credential scan passed. No commit/push performed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkout', type=Path)
    prepare(parser.parse_args().checkout)
