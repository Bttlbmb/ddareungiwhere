"""Refuse a release that would commit private files or oversized assets.

Checks every file Git would commit: tracked files plus untracked files that are
not ignored. It changes nothing, commits nothing and contacts no service.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE_BYTES = 100 * 1024 * 1024  # GitHub rejects pushed files of this size.


def release_files(root):
    names = subprocess.check_output(
        ['git', '-C', str(root), 'ls-files', '-co', '--exclude-standard', '-z'], text=True).split('\0')
    return [Path(name) for name in names if name and (root / name).is_file()]


def check(root=ROOT):
    """Return (file count, total bytes), or raise ValueError naming the first bad file."""
    count = size = 0
    for relative in release_files(root):
        parts = relative.parts
        # Ignored inputs must stay ignored even if someone force-adds them.
        if (relative.name.startswith(('.env', '.dev.vars')) or relative.suffix == '.sqlite3'
                or 'raw' in parts or parts[:2] == ('data', 'processed')):
            raise ValueError(f'Private or source data in release: {relative}')
        file_bytes = (root / relative).stat().st_size
        if file_bytes >= MAX_FILE_BYTES:
            raise ValueError(f'Asset exceeds the GitHub file limit: {relative}')
        count += 1
        size += file_bytes
    return count, size


if __name__ == '__main__':
    try:
        count, size = check()
    except ValueError as error:
        sys.exit(str(error))
    print(f'Checked {count} files, {size:,} bytes; no private or oversized files.')
