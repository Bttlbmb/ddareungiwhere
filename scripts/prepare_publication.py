"""Synchronize an allowlisted static source/site checkout, including removals.

The source workspace is separate from the Git publication checkout. This tool
never commits, pushes, changes cloud accounts, or copies raw/private inputs.
"""
import argparse
import gzip
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['README.md', 'AGENTS.md', 'SPEC.md', 'DESIGN.md', 'ARCHITECTURE.md',
         'DECISIONS.md', 'plan.md', 'DATA_SOURCES.md', 'REVIEW.md', 'STATIC_SETUP.md',
         '.gitignore', 'requirements-routing.txt']
DIRECTORIES = ['web', 'scripts', 'tests']
REMOVED = ['app.py', 'routing.py', 'streets.py', 'worker', 'wrangler.jsonc',
           'project-notes', '.env.example', 'requirements.txt']
IGNORE = shutil.ignore_patterns('.git', '__pycache__', '*.pyc', 'node_modules', '.wrangler', '.dev.vars*', '__*.html')
MAX_FILE_BYTES = 100 * 1024 * 1024


def replace_tree(staged, destination):
    """Move a validated replacement into place, removing stale files."""
    if destination.exists():
        shutil.rmtree(destination)
    staged.rename(destination)


def contains_credential(path, keys):
    """Scan bounded chunks, including keys spanning a chunk boundary.

    Compressed public datasets receive the same scan as text assets; matching
    only the compressed bytes would miss an accidentally embedded credential.
    """
    if not keys:
        return False
    overlap = max(map(len, keys)) - 1
    opener = gzip.open if path.suffix == '.gz' else open
    tail = b''
    with opener(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            content = tail + chunk
            if any(key in content for key in keys):
                return True
            tail = content[-overlap:] if overlap else b''
    return False


def validate_tree(root, keys, excluded=()):
    """Check only public files; do not traverse Git's object database."""
    count = size = 0
    excluded = tuple(Path(name) for name in excluded)
    for folder, directories, names in os.walk(root):
        relative_folder = Path(folder).relative_to(root)
        directories[:] = [name for name in directories if name != '.git' and not any(
            (relative_folder / name).is_relative_to(item) for item in excluded)]
        for name in names:
            relative = relative_folder / name
            if name == '.git' or any(relative.is_relative_to(item) for item in excluded):
                continue
            path = root / relative
            if name.startswith(('.env', '.dev.vars')) or path.suffix == '.sqlite3' or 'raw' in relative.parts:
                raise ValueError('Private/source database in publication checkout.')
            file_bytes = path.stat().st_size
            if file_bytes >= MAX_FILE_BYTES:
                raise ValueError('Asset exceeds GitHub file limit.')
            if contains_credential(path, keys):
                raise ValueError('Credential found; publication prohibited.')
            count += 1
            size += file_bytes
    return count, size


def prepare(checkout):
    checkout = checkout.resolve()
    if checkout == ROOT or checkout in ROOT.parents or not (checkout / '.git').exists():
        raise ValueError('Choose a separate existing Git publication checkout.')
    remote = subprocess.check_output(['git', '-C', str(checkout), 'remote', 'get-url', 'origin'], text=True).strip()
    if remote not in ('https://github.com/Bttlbmb/ddareungiwhere.git', 'git@github.com:Bttlbmb/ddareungiwhere.git'):
        raise ValueError('Unexpected publication remote.')
    keys = []
    for path in ROOT.glob('.env*'):
        if path.name == '.env.example':
            continue
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.startswith('SEOUL_OPEN_DATA_API_KEY='):
                value = line.split('=', 1)[1].strip().strip('"\'')
                if value:
                    keys.append(value.encode())
    files = [*FILES, 'data/manifest.json']
    trees = [*DIRECTORIES, 'data/inputs', 'docs']
    # Validate a complete payload before touching the checkout. A bad asset,
    # missing input or credential must leave the user's working tree intact.
    with tempfile.TemporaryDirectory(prefix='.publication-', dir=checkout.parent) as folder:
        staged = Path(folder)
        for name in files:
            destination = staged / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, destination)
        for name in trees:
            source = ROOT / ('dist/site' if name == 'docs' else name)
            shutil.copytree(source, staged / name, ignore=IGNORE)
        count, size = validate_tree(staged, keys)
        retained_count, retained_size = validate_tree(checkout, keys, excluded=[*files, *trees, *REMOVED])
        count += retained_count
        size += retained_size
        for name in REMOVED:
            path = checkout / name
            if path.is_dir():
                shutil.rmtree(path)
            elif path.exists():
                path.unlink()
        for name in files:
            destination = checkout / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            (staged / name).replace(destination)
        for name in trees:
            replace_tree(staged / name, checkout / name)
    print(f'Prepared {count} files, {size:,} bytes; credential scan passed. No commit/push performed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkout', type=Path)
    prepare(parser.parse_args().checkout)
