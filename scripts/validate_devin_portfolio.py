"""Validate the portable portfolio's content, links, and deployment integration."""
import json
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'devin'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.project_count = 0
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids.add(attrs['id'])
        if 'data-project' in attrs:
            self.project_count += 1
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])


def main():
    originals = {name: (SITE / name).read_bytes() for name in ('index.html', 'resume.html')}
    subprocess.run([sys.executable, str(SITE / 'build.py')], check=True)
    for name, expected in originals.items():
        assert (SITE / name).read_bytes() == expected, f'Regenerate {name} with devin/build.py'
    data = json.loads((SITE / 'content.json').read_text())
    assert len({p['name'] for p in data['projects']}) == len(data['projects']), 'Duplicate project names'
    for name in originals:
        page = Page((SITE / name).read_text())
        if name == 'index.html':
            assert page.project_count == len(data['projects']), 'Projects must render without JavaScript'
        for link in page.links:
            url = urlparse(link)
            if link.startswith('#'):
                assert link[1:] in page.ids, f'Missing anchor: {link}'
                continue
            if url.scheme in ('mailto', 'https') and url.netloc != 'ballzatram.com':
                continue
            assert url.scheme in ('', 'https'), f'Unexpected link protocol: {link}'
            target = ROOT / unquote(url.path).lstrip('/') if url.netloc else SITE / unquote(url.path)
            if target.is_dir():
                target /= 'index.html'
            assert target.is_file(), f'Missing local destination: {link}'
    workflow = (ROOT / '.github/workflows/deploy-pages.yml').read_text()
    assert 'travel devin _site/' in workflow, 'Portfolio must be included in Pages artifact'
    assert 'href="devin/"' in (ROOT / 'index.html').read_text(), 'Missing homepage link'
    assert (ROOT / 'frontend/public/devin').resolve() == SITE, 'Next.js public link must point to portfolio'
    print('Portfolio links, generated content, no-JS collection, and deployment checks passed.')


if __name__ == '__main__':
    main()
