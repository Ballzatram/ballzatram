"""Generate the retro cowboy homepage from the existing public program catalog."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def icon(name):
    return f'<svg class="pixel-icon" aria-hidden="true"><use href="assets/frontier/icons.svg#{escape(name, quote=True)}"></use></svg>'


def trail_routes(items):
    """Keep every published project discoverable, inside a closed in-world noticeboard."""
    sections = []
    for category in ('About', 'Experiments', 'Games', 'Research'):
        links = []
        for item in items:
            if item['category'] != category:
                continue
            href = escape(item['href'], quote=True)
            title = escape(item['title'])
            status = escape(item['status'])
            links.append(
                f'<li><a href="{href}"><strong>{title}</strong><small>{status}</small></a></li>'
            )
        sections.append(
            f'<section class="trail-route-group" aria-label="{escape(category, quote=True)}">'
            f'<h3>{escape(category)}</h3><ul>{"".join(links)}</ul></section>'
        )
    return '<div class="trail-route-groups">' + ''.join(sections) + '</div>'


def build():
    items = json.loads((ROOT / 'data/public-programs.json').read_text())
    town_markup = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
    camp_markup = (ROOT / 'assets/frontier/camp.partial').read_text(encoding='utf-8').replace('<!-- JOURNEY_ROUTES -->', trail_routes(items))
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#282839">
  <title>Devin Gallemore | A digital frontier</title>
  <meta name="description" content="An independent outpost for curious minds. Explore tools, economics games, AI experiments, and projects by Devin Gallemore.">
  <link rel="canonical" href="https://dgallemore.com/">
  <meta property="og:title" content="Devin Gallemore | A digital frontier">
  <meta property="og:description" content="Arizona roots. Digital frontiers. Tools, games, research, and the occasional rabbit hole.">
  <meta property="og:url" content="https://dgallemore.com/">
  <meta property="og:type" content="website">
  <link rel="preload" href="assets/frontier/press-start-2p.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="assets/frontier/base.css">
  <link rel="stylesheet" href="assets/frontier/town.css">
  <link rel="stylesheet" href="assets/frontier/journey.css">
  <script defer src="assets/frontier/ride.js"></script>
</head>
<body class="frontier-home" data-motion="off">
<a class="frontier-skip" href="#main">Skip to content</a>
<main id="main" class="frontier-width">
{town_markup}
{camp_markup}
</main>
</body>
</html>
'''
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    print(f'Generated the frontier homepage from {len(items)} public projects.')


if __name__ == '__main__':
    build()
