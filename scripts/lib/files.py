"""Small shared helpers for the offline static-data toolchain."""
import hashlib
import json
from pathlib import Path


def fingerprint(path):
    """Record exact source bytes without loading large archives into memory."""
    path = Path(path)
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
