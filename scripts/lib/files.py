"""Small shared helpers for the offline static-data toolchain."""
import hashlib
import gzip
import json
import shutil
from pathlib import Path


def update_digest(digest, path):
    """Hash a file in bounded chunks, including when combining many assets."""
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)


def sha256_file(path):
    digest = hashlib.sha256()
    update_digest(digest, path)
    return digest.hexdigest()


def fingerprint(path):
    """Record exact source bytes without loading large archives into memory."""
    path = Path(path)
    return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': sha256_file(path)}


def gzip_file(source, destination):
    """Compress large tiles without retaining both copies in memory.

    Omit the local filename and timestamp so repeated builds produce the same
    public bytes, regardless of where the source file lives.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    with source.open('rb') as incoming, destination.open('wb') as outgoing:
        with gzip.GzipFile(fileobj=outgoing, filename='', mode='wb', mtime=0) as compressed:
            shutil.copyfileobj(incoming, compressed, length=1024 * 1024)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def write_gzip_json(path, value):
    """Write public JSON directly in its served format; no temporary plain copy."""
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')
    path.write_bytes(gzip.compress(content, mtime=0))
