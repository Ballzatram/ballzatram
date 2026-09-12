"""Generate the three static launch surfaces from the public program catalog."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def icon(name, base):
    return f'<svg class="icon95" aria-hidden="true"><use href="{base}assets/win95/icons.svg#{name}"></use></svg>'


def title(text, name, base):
    return f'<div class="title95">{icon(name, base)}<span class="window-label">{text}</span></div>'


def programs(items, base):
    cards = []
    for item in items:
        search = escape(' '.join([item['title'], item['description'], item['category']]), quote=True)
        cards.append(f'''<article class="program95" data-category="{item['category']}" data-search="{search}">
          <div class="program-top95">{icon(item['icon'], base)}<span class="tag95">{item['status']}</span></div>
          <h3><a href="{base}{item['href']}">{escape(item['title'])}</a></h3>
          <p>{escape(item['description'])}</p><span class="program-category95">{item['category']}</span>
        </article>''')
    return '\n'.join(cards)


def explorer(items, base, arcade=False):
    categories = sorted({item['category'] for item in items})
    filters = ''.join(f'<button class="btn95" type="button" data-filter="{category}" aria-pressed="false">{category}</button>' for category in categories)
    return f'''<section class="window95" id="programs" aria-label="Program directory">
      {title('Econ Arcade' if arcade else 'Program Explorer', 'folder', base)}
      <nav class="explorer-menu95" aria-label="Explorer navigation"><a href="{base}index.html">Desktop</a><a href="{base}tools/index.html">All programs</a><a href="{base}devin/">About the creator</a></nav>
      <div class="toolbar95" data-enhanced hidden>
        <div class="filter95" role="group" aria-label="Filter programs"><button class="btn95" type="button" data-filter="all" aria-pressed="true">All programs</button>{filters}</div>
        <div class="search95"><label for="program-search">Find:</label><input id="program-search" type="search" placeholder="Search programs…" autocomplete="off"></div>
      </div>
      <div class="explorer-body95"><aside class="explorer-sidebar95">{icon('folder', base)}<h2>Your next rabbit hole.</h2><p>Open a program. Try something. See where it takes you.</p><hr><strong>Quick access</strong><a href="{base}econ-arcade/index.html">Games &amp; simulations</a><a href="{base}tools/portfolio/index.html">Portfolio Lab</a><a href="{base}devin/">Devin’s portfolio</a><hr><p>One click to open.<br>No installation needed.</p></aside>
      <div class="programs95">{programs(items, base)}<p class="empty95" id="no-programs" hidden>No programs found. Try another search or choose All programs.</p></div></div>
      <div class="statusbar95"><span id="program-count" role="status">{len(items)} programs</span><span>Ballzatram · personal laboratory</span></div>
    </section>'''


def footer(base):
    return f'''<footer class="footer95"><span>Built by Devin Gallemore. Curiosity comes standard.</span><nav aria-label="Footer"><a href="{base}lab-pass.html">Lab Pass</a><a href="{base}community.html">Community</a><a href="{base}privacy.html">Privacy</a><a href="{base}terms.html">Terms</a></nav></footer>'''


def page(body, base, name):
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#008080"><meta name="description" content="An independent desktop for curious minds. Explore economics games, research tools, AI experiments, and projects by Devin Gallemore.">
<title>{name} | Ballzatram</title>
<link rel="stylesheet" href="{base}assets/win95/theme.css"><link rel="stylesheet" href="{base}assets/win95/desktop.css">
<script defer src="{base}assets/win95/shell.js"></script><script defer src="{base}assets/win95/explorer.js"></script>
</head><body class="has-desktop95"><a class="skip-link" href="#main">Skip to content</a>
{body}
</body></html>\n'''


def build():
    items = json.loads((ROOT / 'data/public-programs.json').read_text())
    shortcuts = [('computer', 'My Programs', 'tools/index.html'), ('game', 'Econ Arcade', 'econ-arcade/index.html'), ('chart', 'Research Labs', 'tools/portfolio/index.html'), ('person', 'Devin’s Portfolio', 'devin/'), ('bulb', 'AI Guide', 'tools/ai/index.html')]
    links = ''.join(f'<a href="{href}">{icon(i, "")}<span>{label}</span></a>' for i, label, href in shortcuts)
    home = f'''<div class="desktop95"><nav class="shortcuts95" aria-label="Desktop shortcuts">{links}</nav>
<main class="desktop-main95" id="main"><div class="desktop-topline95"><span>BALLZATRAM / PERSONAL DESKTOP</span><a href="devin/">A work in curiosity ↗</a></div>
<section class="window95" aria-labelledby="welcome-title">{title('Welcome to Ballzatram', 'computer', '')}
<div class="welcome-content95"><div class="welcome-copy95"><p class="eyebrow95">A playground for curious minds</p><h1 id="welcome-title">Big ideas.<span>Small programs.</span></h1><p>Part laboratory. Part arcade. A collection of things I’m building to make economics, research, and a few odd ideas worth exploring.</p><div class="welcome-actions95"><a class="btn95 primary" href="#programs">Explore programs →</a><a class="btn95" href="devin/">Meet the creator</a></div></div>
<div class="welcome-art95" aria-hidden="true">{icon('computer', '')}<div><strong>Ballzatram 95</strong><span>PERSONAL EXPERIMENTS SYSTEM<br>Ready when you are.</span></div></div></div>
<div class="statusbar95"><span>Welcome. Make yourself at home.</span><span>Est. with curiosity</span></div></section>
{explorer(items, '')}
<div class="bottom-grid95"><section class="window95">{title('Read me first.txt', 'book', '')}<div class="note95"><h2>Learn by getting your hands on it.</h2><p>Set interest rates. Test a strategy. Stress a portfolio. These programs turn questions into things you can actually try.</p><a href="econ-arcade/index.html">Find your first game →</a></div></section>
<section class="window95">{title('From the workbench', 'bulb', '')}<div class="note95"><h2>Always a work in progress.</h2><p>Some programs are ready to play; others are experiments. Each one tells you where it stands. Have an idea for the next one?</p><a href="community.html">Visit the community →</a></div></section></div>{footer('')}</main></div>'''
    (ROOT / 'index.html').write_text(page(home, '', 'Your personal desktop'))
    for path, heading, desc, selected in [
        ('tools/index.html', 'All programs', 'Games, research tools, and experiments. Find something useful—or something unexpected.', items),
        ('econ-arcade/index.html', 'Econ Arcade', 'Make a decision. See the consequences. Build your intuition for economics, markets, and strategy.', [i for i in items if i['category'] == 'Games']),
    ]:
        body = f'<main class="directory95" id="main"><section class="window95">{title(heading, "folder", "../")}<div class="directory-heading95"><p class="eyebrow95">Ballzatram program library</p><h1>{heading}</h1><p>{desc}</p></div></section>{explorer(selected, "../", "arcade" in path)}{footer("../")}</main>'
        (ROOT / path).write_text(page(body, '../', heading))
    print(f'Generated desktop, directory, and arcade from {len(items)} programs.')


if __name__ == '__main__':
    build()
