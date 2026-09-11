# Devin's personal portfolio

Static portfolio at `/devin/`, with a public resume at `/devin/resume.html`.
It uses the existing GitHub Pages deployment and needs no service, key, or build dependency.

## Updating content

Edit `content.json`, then run `python3 devin/build.py` from the repository root.
Commit the generated `index.html` and `resume.html` alongside the content change.
Project links must be absolute HTTPS URLs so the folder remains portable.
Projects without public destinations are rendered as concepts without dead links.
Search and category filtering progressively enhance the full static collection.

The resume is a public web adaptation of `Devin_Gallemore_Resume_DevinOS_v1.pdf`
(August 7, 2026). Employer descriptions are generalized; personal phone number
and internal portfolio/data scale figures are omitted. The resume's browser print
button supports printing or saving a PDF. Update employment and project status
labels when they change; no status is automatically inferred from a running server.

## Future personal domain

Copy this directory to the new site's document root. Its CSS, JavaScript, favicon,
and page links are relative and self-contained; project links continue to point to
Ballzatram or GitHub. Update the public portfolio URL in `build.py` and regenerate
the resume. Hosting, DNS, and a redirect from the old URL can be added separately.
No migration of user data is needed.

## Validation

Run `python3 scripts/validate_devin_portfolio.py` and `node --check devin/site.js`.
Check desktop and mobile layouts, category + search combinations, the empty-state
reset, navigation, and print preview. The Pages workflow explicitly includes this
folder; Next.js development serves it through `frontend/public/devin`.
