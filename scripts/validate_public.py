"""Check the published artifact, not just source existence, for broken local URLs."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from build_public import ROOT, build


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.urls = []
        self.ids = set()
        self.duplicates = []
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.duplicates.append(attrs['id'])
            self.ids.add(attrs['id'])
        for key in ('src', 'href'):
            if key in attrs and tag != 'base':
                self.urls.append(attrs[key])


def validate():
    output = build()
    failures = []
    # Existing encrypted trip application has a separate deployment validation gate.
    pages = [p for p in output.rglob('*.html') if 'travel' not in p.relative_to(output).parts]
    for path in pages:
        parsed = Page(path.read_text())
        for duplicate in parsed.duplicates:
            failures.append(f'{path.relative_to(output)}: duplicate id {duplicate}')
        for value in parsed.urls:
            url = urlsplit(value)
            if path != output / 'index.html' and 'assets/win95/' in url.path:
                failures.append(f'{path.relative_to(output)}: desktop assets belong only on the homepage')
            if url.scheme or url.netloc:
                continue
            target = (output / unquote(url.path).lstrip('/')) if url.path.startswith('/') else path.parent / unquote(url.path)
            if not url.path:
                target = path
            if target.is_dir():
                target /= 'index.html'
            if not target.is_file():
                failures.append(f'{path.relative_to(output)}: missing {value}')
    catalog = json.loads((ROOT / 'data/public-programs.json').read_text())
    for item in catalog:
        target = output / item['href']
        if target.is_dir():
            target /= 'index.html'
        if not target.is_file():
            failures.append(f'Catalog: missing {item["href"]}')
    if failures:
        raise AssertionError('\n'.join(failures))
    print(f'Validated {len(pages)} published HTML pages and {len(catalog)} program destinations.')


if __name__ == '__main__':
    validate()
