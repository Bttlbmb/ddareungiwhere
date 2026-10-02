import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

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
                    if tag == 'script' or attrs.get('rel') in ('stylesheet', 'icon')]
        self.assertEqual(assets(english, 'https://example.test/ddareungiwhere/'),
                         assets(korean, 'https://example.test/ddareungiwhere/ko/'))
        switch = next(attrs for tag, attrs in korean.tags if attrs.get('id') == 'language-switch')
        self.assertEqual(switch['data-language'], 'ko')
        self.assertEqual(switch['aria-label'], '언어')
        for page, base, selected in [(english, 'https://example.test/ddareungiwhere/', 'en'),
                                     (korean, 'https://example.test/ddareungiwhere/ko/', 'ko')]:
            for language in ('en', 'ko'):
                link = next(attrs for tag, attrs in page.tags if attrs.get('id') == f'language-{language}')
                self.assertEqual(urljoin(base, link['href']), 'https://example.test/ddareungiwhere/' + ('ko/' if language == 'ko' else ''))
                self.assertEqual(link['hreflang'], language)
                self.assertEqual(link['aria-current'], str(language == selected).lower())
        self.assertIn('>ENG</a>', translated)
        self.assertIn('>한국어</a>', translated)
        error = next(attrs for tag, attrs in korean.tags if attrs.get('id') == 'error')
        self.assertIn('앱을 불러오지 못했습니다', error['data-load-error'])

    def test_translations_retain_each_interpolated_value(self):
        catalog = json.loads((ROOT / 'web/i18n.json').read_text())
        for english, korean in catalog.items():
            with self.subTest(message=english):
                self.assertEqual(sorted(re.findall(r'\{(\w+)\}', english)),
                                 sorted(re.findall(r'\{(\w+)\}', korean)))
