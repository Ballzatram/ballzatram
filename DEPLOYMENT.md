# Ballzatram Deployment

## Current public hosting

`ballzatram.com` is currently deployed from the repository root through GitHub Pages using `.github/workflows/deploy-pages.yml`.

The Pages artifact contains the legacy/static Ballzatram surface (`index.html`, static games/tools, Econ Arcade assets, docs, etc.). The custom domain is declared in the repository `CNAME` file.

DigitalOcean is no longer an active Ballzatram hosting target. There is no push-to-DigitalOcean workflow on `master`.

## Important V3 limitation

The V3 application under `frontend/` is a Next.js application and the API under `backend/` is FastAPI. GitHub Pages cannot run that server-side stack.

Therefore:

- GitHub Pages restores and maintains the current public static site at `https://ballzatram.com/`.
- V3 routes such as Stock Lab, Portfolio Lab, Scenario Lab, Reports, Workspace, and tool-aware AI require a separate full-stack hosting target before they can be considered publicly deployed.
- Do not claim V3 functionality is live merely because it has merged to `master` or because the Pages workflow is green.

## GitHub Pages deployment

The workflow runs on pushes to `master` and may also be started manually.

It publishes the selected static files into a Pages artifact and deploys that artifact to the `github-pages` environment.

Expected repository files:

```text
.github/workflows/deploy-pages.yml
CNAME
```

Expected custom domain:

```text
ballzatram.com
```

## DNS

GitHub Pages still requires the domain registrar/DNS provider to point `ballzatram.com` at GitHub Pages. The `CNAME` file configures the repository side only; it does not create registrar DNS records.

If the domain does not resolve, verify the authoritative nameservers and the apex/CNAME records at the DNS provider before treating a Pages workflow failure as an application failure.

## V3 deployment next step

Choose a supported full-stack target for the Next.js frontend + FastAPI backend, then add one authoritative production workflow for that provider. Requirements:

- Next.js frontend hosting
- Python/FastAPI backend hosting
- server-side secrets for OpenAI, market data, and FRED
- same-origin or configured API routing
- HTTPS/custom domain support
- health/version verification after deploy
- no second workflow competing for `ballzatram.com`

Until that migration is completed, GitHub Pages is the public fallback and V3 is validated in CI but not publicly hosted.
