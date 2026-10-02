"""Render the Korean HTML entry from the shared template and text catalog."""
from html import escape
from html.parser import HTMLParser


class KoreanPage(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, catalog):
        super().__init__(convert_charrefs=False)
        self.catalog = catalog
        self.output = []
        self.frames = []

    def handle_decl(self, decl):
        self.output.append(f'<!{decl}>')

    def handle_comment(self, text):
        self.output.append(f'<!--{text}-->')

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        parent_translated = any(self.frames)
        key = attrs.get('data-i18n')
        if key and parent_translated:
            raise ValueError('Translated elements must be text-only leaves.')
        for name, value in pairs:
            if name in ('href', 'src') and value and value.startswith('./'):
                attrs[name] = '../' + value[2:]
            if name.startswith('data-i18n-'):
                attrs[name[len('data-i18n-'):]] = self.catalog[value]
        if tag == 'html':
            attrs['lang'] = 'ko'
        if attrs.get('id') == 'canonical-url':
            attrs['href'] = 'https://bttlbmb.github.io/ddareungiwhere/ko/'
        if attrs.get('id') == 'home-link':
            attrs['href'] = './'
        if attrs.get('id') == 'language-switch':
            attrs.update(href='../', lang='en', hreflang='en', **{'data-language': 'ko'})
            attrs['aria-label'] = self.catalog['Switch to English']
        if attrs.get('id') == 'error':
            attrs['data-load-error'] = self.catalog[attrs['data-load-error']]
        serialized = ''.join(f' {name}' if value is None else f' {name}="{escape(value, quote=True)}"' for name, value in attrs.items())
        if not parent_translated:
            self.output.append(f'<{tag}{serialized}>')
            if key:
                self.output.append(escape(self.catalog[key]))
        if tag not in self.VOID:
            self.frames.append(bool(key) or parent_translated)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.frames:
            self.frames.pop()
        if not any(self.frames):
            self.output.append(f'</{tag}>')

    def handle_data(self, text):
        if not any(self.frames):
            self.output.append(text)

    def handle_entityref(self, name):
        self.handle_data(f'&{name};')

    def handle_charref(self, name):
        self.handle_data(f'&#{name};')


def korean_page(html, catalog):
    page = KoreanPage(catalog)
    page.feed(html)
    page.close()
    return ''.join(page.output)
