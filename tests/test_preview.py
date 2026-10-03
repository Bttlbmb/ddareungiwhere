import gzip
import hashlib
import http.client
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

from scripts.preview_static import handler


class PreviewTests(unittest.TestCase):
    def test_preview_serves_explicit_gzip_bytes_and_restricts_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / 'site'
            public.mkdir()
            (public / 'index.html').write_bytes(b'<title>Preview</title>')
            script = b'export const value = 1;'
            (public / 'module.mjs').write_bytes(script)
            # Generated datasets use explicit gzip paths on GitHub Pages.
            compressed = gzip.compress(b'{"stations":[]}', mtime=0)
            (public / 'stations.json.gz').write_bytes(compressed)
            (root / 'outside.txt').write_text('Outside the public site')
            (public / 'outside-link.txt').symlink_to(root / 'outside.txt')
            (public / 'index-link').mkdir()
            (public / 'index-link/index.html').symlink_to(root / 'outside.txt')
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler(public))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
            try:
                connection.request('GET', '/module.mjs?v=fixture')
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(response.getheader('Content-Type'), 'text/javascript')
                self.assertEqual(response.read(), script)
                connection.request('GET', '/stations.json.gz', headers={'Accept-Encoding': 'gzip'})
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertIsNone(response.getheader('Content-Encoding'))
                self.assertEqual(response.getheader('ETag'), '"' + hashlib.sha256(compressed).hexdigest() + '"')
                self.assertEqual(response.read(), compressed)
                for path in ['/../outside.txt', '/%2e%2e/outside.txt', '/outside-link.txt',
                             '/index-link', '/index-link/']:
                    connection.request('GET', path)
                    response = connection.getresponse()
                    self.assertEqual(response.status, 404)
                    response.read()
            finally:
                connection.close()
                server.shutdown()
                server.server_close()
                thread.join()
