import gzip
import io
import json
import re
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urljoin

from scripts import build_static
from scripts.lib.localization import korean_page

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, pairs):
        self.tags.append((tag, dict(pairs)))


class LocalizationTests(unittest.TestCase):
    def test_korean_entry_is_translated_before_javascript_and_shares_assets(self):
        source = (ROOT / 'web/index.html').read_text().replace('href="/', 'href="./').replace('src="/', 'src="./')
        catalog = json.loads((ROOT / 'web/i18n.json').read_text())
        translated = korean_page(source, catalog)
        english, korean = Page(source), Page(translated)
        self.assertIn('<html lang="ko">', translated)
        self.assertIn('과거 자전거 없음 빈도', translated)
        self.assertIn('자전거 대여 시각 (한국 시간)', translated)
        self.assertNotIn('>Historical no-bike risk<', translated)
        for tags, base in [(english.tags, 'https://example.test/ddareungiwhere/'),
                           (korean.tags, 'https://example.test/ddareungiwhere/ko/')]:
            canonical = [attrs['href'] for tag, attrs in tags if attrs.get('rel') == 'canonical']
            self.assertEqual(canonical, [base.replace('https://example.test', 'https://bttlbmb.github.io')])
            alternates = {attrs['hreflang']: attrs['href'] for tag, attrs in tags if attrs.get('rel') == 'alternate'}
            self.assertEqual(set(alternates), {'en', 'ko', 'x-default'})
        def assets(page, base):
            return [urljoin(base, attrs['src'] if tag == 'script' else attrs['href']) for tag, attrs in page.tags
                    if tag == 'script' or attrs.get('rel') in ('stylesheet', 'icon', 'modulepreload')]
        self.assertEqual(assets(english, 'https://example.test/ddareungiwhere/'),
                         assets(korean, 'https://example.test/ddareungiwhere/ko/'))
        switch = next(attrs for tag, attrs in korean.tags if attrs.get('id') == 'language-switch')
        self.assertEqual(switch['data-language'], 'ko')
        self.assertEqual(switch['aria-label'], '영어로 전환')
        for page, base, selected in [(english, 'https://example.test/ddareungiwhere/', 'en'),
                                     (korean, 'https://example.test/ddareungiwhere/ko/', 'ko')]:
            link = next(attrs for tag, attrs in page.tags if attrs.get('id') == 'language-switch')
            other = 'en' if selected == 'ko' else 'ko'
            self.assertEqual(urljoin(base, link['href']), 'https://example.test/ddareungiwhere/' + ('ko/' if other == 'ko' else ''))
            self.assertEqual(link['hreflang'], other)
            self.assertEqual(link['data-language'], selected)
        self.assertIn('>ENG</span>', translated)
        self.assertIn('>한국어</span>', translated)
        error = next(attrs for tag, attrs in korean.tags if attrs.get('id') == 'error')
        self.assertIn('앱을 불러오지 못했습니다', error['data-load-error'])

    def test_build_preloads_only_the_exact_versioned_app_import_in_both_languages(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / 'web', root / 'web')
            (root / 'data/inputs').mkdir(parents=True)
            (root / 'data/inputs/stations.json').write_text('[]')
            (root / 'data/processed/browser-routing').mkdir(parents=True)
            (root / 'data/processed/browser-routing/current.json').write_text('{"release":"fixture"}')

            def export_history(database, destination, months):
                destination.mkdir(parents=True, exist_ok=True)
                metadata = {'counts_url': 'counts.bin.gz', 'observed_months': ['2025-12']}
                (destination / 'history.json').write_text(json.dumps(metadata))
                (destination / metadata['counts_url']).write_bytes(gzip.compress(bytes(4), mtime=0))
                return metadata

            def install_sdk(sdk, destination):
                destination.mkdir(parents=True)
                (destination / 'index.js').write_text('// SDK fixture\n')

            with patch.object(build_static, 'ROOT', root), \
                 patch.object(build_static, 'export_history', side_effect=export_history), \
                 patch.object(build_static, 'export_streets', return_value=0), \
                 patch.object(build_static, 'install_sdk', side_effect=install_sdk), \
                 redirect_stdout(io.StringIO()):
                output = root / 'site'
                urls = []
                for revision in range(2):
                    if revision:
                        app = root / 'web/app.js'
                        app.write_text(app.read_text() + '\n// Change the app revision.\n')
                    build_static.build(root / 'sdk', output, graph_url='https://example.test/graph/manifest.json')
                    start = (output / 'static/start.mjs').read_text()
                    imported = re.search(r"await import\(['\"]([^'\"]+)['\"]\)", start).group(1)
                    expected = urljoin('https://example.test/ddareungiwhere/static/start.mjs', imported)
                    self.assertRegex(expected, r'/app\.js\?v=[0-9a-f]{16}$')
                    urls.append(expected)
                    for path, base in [('index.html', 'https://example.test/ddareungiwhere/'),
                                       ('ko/index.html', 'https://example.test/ddareungiwhere/ko/')]:
                        with self.subTest(revision=revision, language=path):
                            page = Page((output / path).read_text())
                            hints = [(attrs['rel'], urljoin(base, attrs['href'])) for tag, attrs in page.tags
                                     if tag == 'link' and attrs.get('rel') in ('preload', 'modulepreload')]
                            self.assertEqual(hints, [('modulepreload', expected)])
                            scripts = [urljoin(base, attrs['src']) for tag, attrs in page.tags if tag == 'script']
                            self.assertNotIn(expected, scripts)
                self.assertNotEqual(urls[0], urls[1])

    def test_translations_retain_each_interpolated_value(self):
        catalog = json.loads((ROOT / 'web/i18n.json').read_text())
        for english, korean in catalog.items():
            with self.subTest(message=english):
                self.assertEqual(sorted(re.findall(r'\{(\w+)\}', english)),
                                 sorted(re.findall(r'\{(\w+)\}', korean)))
