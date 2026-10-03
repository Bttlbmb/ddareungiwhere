import contextlib
import hashlib
import io
import json
import struct
import subprocess
import tempfile
import types
import unittest
import tarfile
from pathlib import Path
from unittest.mock import patch

from scripts import build_browser_graph


class GraphBuildTests(unittest.TestCase):
    @staticmethod
    def fixture(root):
        (root / 'data/raw').mkdir(parents=True)
        (root / 'data/inputs').mkdir()
        (root / 'data/raw/seoul-routing.osm.pbf').write_bytes(b'fixture map input')
        (root / 'data/inputs/routing-coverage.json').write_text(json.dumps({'bounds': [37.4, 126.7, 37.7, 127.3]}))
        native = types.ModuleType('valhalla')
        native.__version__ = '3.8.3'
        native.__file__ = str(root / 'native/__init__.py')
        native.get_config = lambda **kwargs: {section: dict(kwargs) if section == 'mjolnir' else {}
                                            for section in ['mjolnir', 'loki', 'thor', 'odin']}
        version = types.ModuleType('valhalla.__version__')
        version.__commit_id__ = build_browser_graph.REVISION
        return {'valhalla': native, 'valhalla.__version__': version}

    @staticmethod
    def native_commands(command, check):
        # Small synthetic tiles exercise release/storage logic without parsing
        # map data or invoking the optional native routing package.
        config = json.loads(Path(command[command.index('-c') + 1]).read_text())
        tiles = Path(config['mjolnir']['tile_dir'])
        tile = tiles / '0/000.gph'
        if 'valhalla_build_tiles' in command[0]:
            tile.parent.mkdir()
            tile.write_bytes(b'fixture graph tile')
            return
        content = tile.read_bytes()
        # One tar header + padded index precede the tile header/data.
        index = struct.pack('<QII', 1536, 1, len(content))
        with tarfile.open(config['mjolnir']['tile_extract'], 'w') as archive:
            for name, value in [('index.bin', index), ('0/000.gph', content)]:
                member = tarfile.TarInfo(name)
                member.size = len(value)
                archive.addfile(member, io.BytesIO(value))

    def test_release_retains_tiles_and_archive_provenance_without_duplicate_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            native = self.fixture(root)
            with patch.object(build_browser_graph, 'ROOT', root), patch.dict('sys.modules', native), \
                 patch.object(build_browser_graph.subprocess, 'run', side_effect=self.native_commands), \
                 contextlib.redirect_stdout(io.StringIO()):
                release = build_browser_graph.build()
            manifest = json.loads((release / 'manifest.json').read_text())
            tile = release / 'tiles/0/000.gph'
            self.assertEqual(manifest['tiles']['1']['sha256'], hashlib.sha256(tile.read_bytes()).hexdigest())
            self.assertEqual(manifest['archive']['url'], 'graph.tar')
            self.assertEqual(len(manifest['archive']['headerSha256']), 64)
            self.assertFalse((release / 'graph.tar').exists())
            self.assertTrue((release / 'native-config.json').exists())
            self.assertEqual(json.loads((release.parent / 'current.json').read_text()), {'release': release.name})
            self.assertEqual(list(release.parent.glob('build-*')), [])

    def test_failed_native_build_removes_staging_and_preserves_current_release(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            native = self.fixture(root)
            output = root / 'data/processed/browser-routing'
            output.mkdir(parents=True)
            current = output / 'current.json'
            current.write_text('{"release":"previous"}')
            before = current.read_bytes()
            with patch.object(build_browser_graph, 'ROOT', root), patch.dict('sys.modules', native), \
                 patch.object(build_browser_graph.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'fixture build')), \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(subprocess.CalledProcessError):
                    build_browser_graph.build()
            self.assertEqual(current.read_bytes(), before)
            self.assertEqual(list(output.glob('build-*')), [])
