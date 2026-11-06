# Devin's personal portfolio

Static portfolio at `/devin/`, with a public resume at `/devin/resume.html`.
It uses the existing GitHub Pages deployment and needs no service, key, or build dependency.

## Updating content

Edit `content.json`, then run `python3 devin/build.py` from the repository root.
Commit the generated `index.html` and `resume.html` alongside the content change.
Portfolio copy, focus areas, grouped experience bullets, independent engineering,
and resume skill categories all live in `content.json`. Experience appears before
selected independent projects.

Project links must be absolute HTTPS URLs so the folder remains portable.
Projects without public destinations are rendered as concepts without dead links.
Search and category filtering progressively enhance the full static collection.

The resume uses the reviewed `Gallemore_Resume.pdf` and approved public wording
(November 5, 2026), emphasizing applied AI engineering, evaluation, reporting, and
quantitative systems. Employer descriptions are generalized; personal phone number
and internal portfolio/data scale figures are omitted. Existing published job titles
and employment dates are preserved. Planned rollout and pending acceptance testing
remain explicitly qualified. The resume's browser print
button supports printing or saving a PDF. Update employment and project status
labels when they change; no status is automatically inferred from a running server.

## Personal domain

The portfolio's public address is `https://dgallemore.com/devin/`; the full
Ballzatram collection uses the same domain. Project URLs and the printable
resume use this address. See [deployment instructions](../DEPLOYMENT.md) for
the GitHub Pages and Namecheap setup. The folder's CSS, JavaScript, favicon,
and local page links remain relative so the portfolio can be moved later.

## Validation

Run `python3 scripts/validate_devin_portfolio.py` and `node --check devin/site.js`.
Check desktop and mobile layouts, category + search combinations, the empty-state
reset, navigation, and print preview. The Pages workflow explicitly includes this
folder; Next.js development serves it through `frontend/public/devin`.
