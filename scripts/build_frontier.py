"""Generate the retro cowboy homepage from the existing public program catalog."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def icon(name):
    return f'<svg class="pixel-icon" aria-hidden="true"><use href="assets/frontier/icons.svg#{escape(name, quote=True)}"></use></svg>'


def programs(items):
    cards = []
    for item in items:
        search = escape(' '.join([item['title'], item['description'], item['category']]), quote=True)
        cards.append(f'''<article class="frontier-program" data-category="{escape(item['category'], quote=True)}" data-search="{search}">
  <div class="program-top">{icon(item['icon'])}<span class="program-status">{escape(item['status'])}</span></div>
  <h3><a href="{escape(item['href'], quote=True)}">{escape(item['title'])}</a></h3>
  <p>{escape(item['description'])}</p>
  <div class="program-bottom"><span>{escape(item['category'])}</span>{icon('arrow')}</div>
</article>''')
    return '\n'.join(cards)


def build():
    items = json.loads((ROOT / 'data/public-programs.json').read_text())
    categories = sorted({item['category'] for item in items})
    filters = ''.join(f'<button type="button" data-filter="{escape(category, quote=True)}" aria-pressed="false">{escape(category)}</button>' for category in categories)
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f3e9d2">
  <title>Devin Gallemore | A digital frontier</title>
  <meta name="description" content="An independent outpost for curious minds. Explore tools, economics games, AI experiments, and projects by Devin Gallemore.">
  <link rel="canonical" href="https://dgallemore.com/">
  <meta property="og:title" content="Devin Gallemore | A digital frontier">
  <meta property="og:description" content="Arizona roots. Digital frontiers. Tools, games, research, and the occasional rabbit hole.">
  <meta property="og:url" content="https://dgallemore.com/">
  <meta property="og:type" content="website">
  <link rel="preload" href="assets/frontier/press-start-2p.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="assets/frontier/home.css">
  <script defer src="assets/frontier/explorer.js"></script>
</head>
<body class="frontier-home" data-motion="off">
<a class="frontier-skip" href="#main">Skip to content</a>
<header class="frontier-header frontier-width">
  <a class="frontier-brand" href="index.html" aria-label="Devin Gallemore home">{icon('hat')}<span>DEVIN GALLEMORE<small>ARIZONA ROOTS. DIGITAL FRONTIERS.</small></span></a>
  <nav class="frontier-nav" aria-label="Main navigation">
    <a href="#programs">The projects</a><a href="devin/">About Devin</a><a href="https://github.com/Ballzatram/ballzatram">GitHub ↗</a><a class="nav-resume" href="devin/resume.html">Resume ↗</a>
  </nav>
</header>
<main id="main" class="frontier-width">
  <section class="frontier-hero" aria-labelledby="welcome-title">
    <img class="frontier-scene" src="assets/frontier/sunset.svg" alt="" width="480" height="232" fetchpriority="high">
    <div class="hero-copy">
      <p class="frontier-kicker">An independent outpost on the internet</p>
      <h1 id="welcome-title">HOWDY,<span>I’M DEVIN.</span></h1>
      <p class="hero-description">I build tools, games, and the occasional rabbit hole. A little finance. A little AI. A whole lot of curiosity.</p>
      <div class="hero-actions"><a class="pixel-button" href="#programs">Explore the projects {icon('arrow')}</a><a class="text-link" href="devin/">Meet the cowboy ↗</a></div>
    </div>
    <div class="hero-stamp" aria-hidden="true">OPEN RANGE.<br>OPEN MIND.</div>
    <div class="pixel-dust" aria-hidden="true"></div>
    <div class="hero-footer"><span>{icon('star')} Side quests encouraged.</span><span class="hero-coordinates">Est. with curiosity / 8-bit edition</span><button class="motion-toggle" id="frontier-motion" type="button" aria-pressed="false" data-enhanced hidden>Desert breeze: off</button></div>
  </section>
  <div class="frontier-intro"><div><strong>Welcome to my little corner of the frontier.</strong><p>Part workshop. Part arcade. Always something worth poking around in.</p></div><span class="intro-mark">{icon('cactus')} Built with a wandering mind.</span></div>
  <section class="frontier-trails" aria-labelledby="trails-title">
    <div class="section-heading"><div><p class="frontier-kicker">01 / Choose your adventure</p><h2 id="trails-title">Pick your trail.</h2></div><p>Three good places to start.</p></div>
    <div class="trail-grid">
      <a class="trail-card" href="econ-arcade/index.html"><div class="trail-top">{icon('game')}<span>TRAIL 01</span></div><h3>The Arcade</h3><p>Run an economy. Test a strategy. Learn a thing or two.</p><span class="trail-arrow" aria-hidden="true">↗</span></a>
      <a class="trail-card" href="tools/observatory/index.html"><div class="trail-top">{icon('book')}<span>TRAIL 02</span></div><h3>The Paper Trail</h3><p>Follow the bills. Inspect the records. Ask better questions.</p><span class="trail-arrow" aria-hidden="true">↗</span></a>
      <a class="trail-card" href="tools/ai/index.html"><div class="trail-top">{icon('bulb')}<span>TRAIL 03</span></div><h3>The AI Outpost</h3><p>Meet Osiris. Explore the experiments. Bring your own AI.</p><span class="trail-arrow" aria-hidden="true">↗</span></a>
    </div>
  </section>
  <section class="frontier-directory" id="programs" aria-labelledby="projects-title">
    <div class="section-heading"><div><p class="frontier-kicker">02 / The whole collection</p><h2 id="projects-title">The project board.</h2></div><p>A few finished things. A few wild ideas.</p></div>
    <div class="directory-toolbar" data-enhanced hidden>
      <div class="frontier-filters" role="group" aria-label="Filter projects"><button type="button" data-filter="all" aria-pressed="true">All projects</button>{filters}</div>
      <div class="frontier-search"><label for="program-search">Find a project</label><input id="program-search" type="search" placeholder="Try “economics”…" autocomplete="off"></div>
    </div>
    <div class="program-grid">{programs(items)}</div>
    <div class="frontier-empty" id="no-programs" hidden><p>No projects down this trail. Try another search or reset the filters.</p><button class="pixel-button" id="clear-filters" type="button">Show all projects {icon('arrow')}</button></div>
    <div class="directory-status"><span id="program-count" role="status" aria-live="polite">{len(items)} projects</span><span>Each project wears its status on its sleeve.</span></div>
  </section>
  <section class="campfire-note" aria-labelledby="ai-title">{icon('bulb')}<div><h2 id="ai-title">Your AI. Your trusty sidekick.</h2><p>Use supported projects with the AI app you already have. Choose the context to share, then continue in your app. The connection guide explains interactive tools and their availability.</p></div><a class="pixel-button" href="tools/ai/connect.html">Read the AI guide {icon('arrow')}</a></section>
  <footer class="frontier-footer"><span class="footer-credit">{icon('hat')} Built by Devin Gallemore. Happy trails.</span><nav aria-label="Footer"><a href="lab-pass.html">Lab Pass</a><a href="community.html">Community</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav></footer>
</main>
</body>
</html>
'''
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    print(f'Generated the frontier homepage from {len(items)} public projects.')


if __name__ == '__main__':
    build()
