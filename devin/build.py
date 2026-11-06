"""Generate portable, progressively enhanced portfolio pages. No dependencies."""
from html import escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'content.json').read_text())


def e(value):
    return escape(str(value), quote=True)


def head(title, description):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#244b3e">
<meta name="description" content="{e(description)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<title>{e(title)}</title><link rel="icon" href="./favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="./site.css"><script src="./site.js" defer></script></head><body>'''


def experience(resume=False):
    result = []
    for role in data['experience']:
        if resume:
            groups = role.get('bulletGroups', [{'bullets': role.get('bullets', [])}])
            detail = ''.join(
                (f'<p><strong>{e(group["title"])}</strong></p>' if 'title' in group else '')
                + bullet_list(group['bullets']) for group in groups
            )
        else:
            detail = f'<p>{e(role["summary"])}</p>'
        result.append(f'''<article class="role"><div class="role-top"><h3>{e(role['company'])}</h3><span class="role-date">{e(role['dates'])}</span></div><p class="role-title">{e(role['title'])}</p>{detail}</article>''')
    return ''.join(result)


def bullet_list(items):
    return '<ul>' + ''.join(f'<li>{e(item)}</li>' for item in items) + '</ul>'


def education():
    return ''.join(f'<div class="education"><b>{e(item["degree"])}</b><p>{e(item["school"])} · {e(item["year"])}</p></div>' for item in data['education'])


def project_link(project):
    if not project['url']:
        return '<span class="category">Exploration in progress</span>'
    if not project['url'].startswith('https://'):
        raise ValueError('Project links must be absolute HTTPS URLs for portability')
    return f'<a href="{e(project["url"])}">{e(project["link"])} <span aria-hidden="true">↗</span></a>'


featured = []
art = {'quant': 'ƒ(x)', 'parcel': '⌘', 'econ': '↗'}
for project in data['projects']:
    if 'featured' not in project:
        continue
    style = project['featured']
    featured.append(f'''<article class="feature"><div class="project-art {e(style)}" aria-hidden="true"><span class="art-symbol">{art[style]}</span><small>{e(project['category']).upper()}</small></div><div class="feature-body"><div class="eyebrow">{e(project['status'])}</div><h3>{e(project['name'])}</h3><p>{e(project['description'])}</p>{project_link(project)}</div></article>''')

projects = ''.join(f'''<article class="project" data-project data-category="{e(p['category'])}"><div><span class="category">{e(p['category'])}</span><h3>{e(p['name'])}</h3></div><span class="status">{e(p['status'])}</span><p>{e(p['description'])}</p>{project_link(p)}</article>''' for p in data['projects'])
categories = list(dict.fromkeys(p['category'] for p in data['projects']))
filters = '<button type="button" data-filter="all" aria-pressed="true">All work</button>' + ''.join(f'<button type="button" data-filter="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in categories)
tags = ''.join(f'<span class="tag">{e(skill)}</span>' for skill in data['skills'])
email = e(data['email'])
portfolio = data['portfolio']
focus = ''.join(f'<div><b>{e(item["title"])}</b><span>{e(item["description"])}</span></div>' for item in portfolio['focus'])
independent = data['independentEngineering']
resume_skills = ''.join(f'<p><b>{e(item["title"])}:</b> {e(item["description"])}</p>' for item in data['resumeSkills'])

html = head(portfolio['title'], portfolio['description']) + f'''
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap header"><a class="identity" href="./"><span class="monogram" aria-hidden="true">DG</span>Devin Gallemore</a><nav aria-label="Main navigation"><a href="#experience">Experience</a><a href="#work">Work</a><a href="./resume.html">Resume</a><a href="#contact">Contact</a><a class="back" href="https://dgallemore.com/">Ballzatram <span aria-hidden="true">↗</span></a></nav></div></header>
<main id="main" class="wrap">
<section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow">{e(portfolio['eyebrow'])}</p><h1 id="hero-title">Making complex<br>systems <em>useful.</em></h1><p class="intro">{e(portfolio['intro'])}</p><p>{e(portfolio['collaboration'])}</p><div class="actions"><a class="button" href="#work">Explore my work <span aria-hidden="true">↘</span></a><a class="button secondary" href="./resume.html">View resume <span aria-hidden="true">↗</span></a></div><p class="location">{e(data['location'])} · {e(portfolio['locationDetail'])}</p></div><aside class="profile-card" aria-label="Focus: finance, intelligence, and engineering"><div class="card-caption"><span>Devin / field notes</span><span>01 — Ongoing</span></div><div class="system-art" aria-hidden="true"><span class="orbit"></span><span class="orbit two"></span><span class="orbit three"></span><span class="core">dg.</span><span class="dot"></span><span class="dot two"></span></div><div class="card-bottom"><strong>Where disciplines meet.</strong><p>Finance × Intelligence × Engineering</p></div></aside></section>
<div class="strip" aria-label="Areas of focus">{focus}</div>
<section id="experience" class="section" aria-labelledby="experience-title"><div class="experience-layout"><div class="experience-intro"><p class="eyebrow">01 / Experience</p><h2 id="experience-title">Grounded in<br>real systems.</h2><p>From enterprise balance sheets to intelligent workflows, my work connects analytical rigor with practical engineering.</p><a class="section-link" href="./resume.html">Read my resume <span aria-hidden="true">↗</span></a></div><div>{experience()}<div class="toolkit" aria-label="Technical skills">{tags}</div></div></div></section>
<section id="work" class="section" aria-labelledby="work-title"><p class="eyebrow">02 / Selected work</p><div class="section-head"><h2 id="work-title">Ideas, made tangible.</h2><p>Independent projects from my workshop. Built with AI-assisted development, directed through product design, architecture, testing, and iteration.</p></div><div class="feature-grid">{''.join(featured)}</div><a class="section-link" href="#projects">Explore the full project collection <span aria-hidden="true">↓</span></a></section>
<section id="projects" class="section" aria-labelledby="projects-title"><p class="eyebrow">03 / The project collection</p><div class="section-head"><h2 id="projects-title">Always building.</h2><p>A growing collection of tools, playable experiments, and ideas taking shape. Each project is labeled by its current stage.</p></div><div id="project-controls" hidden><div class="controls"><div class="filters" role="group" aria-label="Filter projects by focus">{filters}</div><label class="search" for="project-search">Search projects<input id="project-search" type="search" placeholder="Name, topic, or technology…" autocomplete="off"></label></div></div><p id="project-count" class="result-count" aria-live="polite" aria-atomic="true">{len(data['projects'])} projects</p><div class="project-list">{projects}</div><div id="empty-state" class="empty" hidden><p>No projects match this search.</p><button class="button secondary" id="reset-search" type="button">Reset filters</button></div><a class="section-link" href="https://github.com/Ballzatram">More experiments on GitHub <span aria-hidden="true">↗</span></a></section>
<section id="about" class="section" aria-labelledby="about-title"><div class="about-grid"><div><p class="eyebrow">04 / A little context</p><h2 id="about-title">Curiosity is the<br>common thread.</h2><p>I’m drawn to questions that sit between disciplines: how markets behave, how people learn, and how intelligent systems can turn information into something useful.</p><p>Ballzatram is where I explore those questions in public. It’s a workshop for quantitative tools, economic games, creative experiments, and the next idea worth building.</p></div><div><p class="eyebrow">Education</p>{education()}<p class="eyebrow">Beyond the workbench</p>{''.join(f'<p>{e(item)}</p>' for item in data['leadership'])}</div></div></section>
<section id="contact" class="contact" aria-labelledby="contact-title"><div class="contact-inner"><div><h2 id="contact-title">Have a problem worth solving?</h2><p>{e(portfolio['contact'])}</p></div><a class="button" href="mailto:{email}">Get in touch <span aria-hidden="true">↗</span></a></div></section>
</main><footer class="wrap footer"><span>Devin Gallemore · A personal corner of Ballzatram.</span><nav aria-label="Footer navigation"><a href="./resume.html">Resume</a><a href="https://github.com/Ballzatram">GitHub</a><a href="mailto:{email}">Email</a></nav></footer></body></html>
'''
(ROOT / 'index.html').write_text(html)

resume = head('Devin Gallemore | Resume', data['positioning']) + f'''
<div class="resume-actions"><a href="./">← Back to portfolio</a><button type="button" class="button" id="print-resume" hidden>Print / save as PDF</button></div>
<main class="resume"><h1>{e(data['name'])}</h1><p>{e(data['positioning'])}</p><p>{e(data['location'])} · <a href="mailto:{email}">{email}</a> · <a href="https://github.com/Ballzatram">github.com/Ballzatram</a></p><p>{e(data['summary'])}</p>
<h2>Experience</h2>{experience(True)}
<h2>Independent engineering</h2><h3>{e(independent['title'])}</h3>{bullet_list(independent['bullets'])}<p>{e(independent['summary'])}</p><p>Project collection: <a href="https://dgallemore.com/devin/">dgallemore.com/devin/</a></p>
<h2>Technical skills</h2>{resume_skills}
<h2>Education &amp; leadership</h2>{education()}<p>{'<br>'.join(e(item) for item in data['leadership'])}</p>
</main></body></html>'''
(ROOT / 'resume.html').write_text(resume)
print(f'Generated portfolio, resume, and {len(data["projects"])} project entries.')
