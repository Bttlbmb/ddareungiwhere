"""Preview the generated site over HTTP, with compression and graph validators."""
import argparse
import gzip
import hashlib
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def handler(directory):
    directory = directory.resolve()
    class Handler(SimpleHTTPRequestHandler):
        etags = {}
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)
        def send_head(self):
            path = (directory / unquote(urlsplit(self.path).path).lstrip('/')).resolve()
            if not path.is_relative_to(directory):
                self.send_error(404);return None
            if path.is_dir():
                path = path / 'index.html'
            if not path.is_file():
                self.send_error(404);return None
            content_type = 'text/javascript' if path.suffix == '.mjs' else mimetypes.guess_type(path)[0] or 'application/octet-stream'
            compressed = Path(str(path) + '.gz')
            use_gzip = 'gzip' in self.headers.get('Accept-Encoding', '') and compressed.exists()
            served = compressed if use_gzip else path
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(served.stat().st_size))
            stat = path.stat()
            signature = (stat.st_mtime_ns, stat.st_size)
            cached = self.etags.get(path)
            if not cached or cached[0] != signature:
                with path.open('rb') as stream:
                    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                cached = (signature, '"' + digest + '"')
                self.etags[path] = cached
            self.send_header('ETag', cached[1])
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Content-Type-Options', 'nosniff')
            if use_gzip:
                self.send_header('Content-Encoding', 'gzip');self.send_header('Vary', 'Accept-Encoding')
            self.end_headers()
            return served.open('rb')
        def log_message(self, format, *args):
            pass
    return Handler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=63463)
    parser.add_argument('--directory', type=Path, default=ROOT / 'dist/site')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler(args.directory))
    print(f'Static preview: http://127.0.0.1:{server.server_port}/', flush=True)
    server.serve_forever()
