# Ballzatram deployment at dgallemore.com

## Public site

The personal showcase and Ballzatram tools use `https://dgallemore.com/`.
The repository remains `Ballzatram/ballzatram`; its name does not need to change.
The retro cowboy homepage links to the portfolio and resume at `/devin/`, games,
research tools, and the Osiris connection guide.

GitHub Pages publishes the static site through `.github/workflows/deploy-pages.yml`.
The repo's `CNAME` records the intended domain, `dgallemore.com`. **For a custom
Actions deployment, GitHub ignores the CNAME file for domain configuration:**
the repository's Settings → Pages → Custom domain must also be set. A merged
commit or successful build alone does not prove the domain or HTTPS is live.

DigitalOcean is no longer an active Ballzatram hosting target.

## Connect the domain

Set `dgallemore.com` as the GitHub custom domain before adding the DNS records.

1. Open [the repository's Pages settings](https://github.com/Ballzatram/ballzatram/settings/pages).
2. Set **Custom domain** to `dgallemore.com` and save. Keep the publishing source
   configured for the existing GitHub Actions deployment.
3. In Namecheap, open **Domain List → Manage → dgallemore.com** and leave
   **Nameservers** set to **Namecheap BasicDNS**.
4. Remove the existing **Redirect Domain** entry from `dgallemore.com` to
   `http://www.dgallemore.com/`.
5. Open **Advanced DNS → Host Records**. Replace the default parking record
   for `www` and any conflicting website records for `@` or `www` with the
   records below. Keep email MX records and unrelated TXT/verification records.
6. Set each TTL to **Automatic**, and save each row.

| Type | Host | Value |
| --- | --- | --- |
| A Record | @ | 185.199.108.153 |
| A Record | @ | 185.199.109.153 |
| A Record | @ | 185.199.110.153 |
| A Record | @ | 185.199.111.153 |
| CNAME Record | www | ballzatram.github.io |

Enter the CNAME value as a hostname, without `https://`, a slash, or the repository
name. These records connect both the bare domain and `www`; GitHub redirects
`www.dgallemore.com` to `dgallemore.com`. No Namecheap PremiumDNS purchase or
nameserver switch to Cloudflare is required for this GitHub Pages setup.

After DNS resolves and GitHub provisions the certificate, enable **Enforce HTTPS**
in Pages settings. DNS propagation and certificate availability may take up to
24 hours. Verify the homepage, `/devin/`, `/tools/ai/`, and a game on the new domain.

```sh
dig dgallemore.com A +short
dig www.dgallemore.com CNAME +short
curl -I https://dgallemore.com/
curl -I https://www.dgallemore.com/
```

[GitHub's domain setup and current DNS records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
are the authoritative reference. Account-level domain verification is also
available through GitHub's Pages settings using a GitHub-issued TXT record.

## Saved data during the domain change

Browser storage and installed web apps are scoped to the old origin. Reading
progress, saved lab runs, and trip unlock state do not automatically transfer to
the new domain. Export important data using each tool's existing export controls
before the cutover, where available, and re-add installed apps from the new URL.
This change does not clear or copy browser data.

## Deployment and validation

The Pages workflow runs on pushes to `master`, on its refresh schedule, and by
manual dispatch. `python scripts/validate_public.py` builds the allowlisted files
with `scripts/build_public.py` and checks links/resources in the actual artifact.
It then refreshes the official bill catalogue and deploys the artifact.

After changing portfolio content, regenerate and check it:

```sh
python devin/build.py
python scripts/validate_devin_portfolio.py
python scripts/validate_public.py
npm run test:static --prefix frontend
npm test --prefix osiris-tools
```

## Visitors use their own AI apps

The public direction is [bring your own AI](docs/bring-your-own-ai.md): the visitor's
AI app supplies inference through their account; Ballzatram supplies project context
and bounded tools. Public tools do not use an operator model key. This domain
migration does not turn a ChatGPT or Claude login into a general website inference
API, activate the remote connector, or provide every project with AI features.

The Supply & Demand MCP service is implemented in `osiris-tools/`; its public
activation remains controlled by `mcpUrl` in `assets/ai-config.js`. An empty value
means activation is pending. Use only an address returned by a successful
service deployment and verified through `/health` and an MCP client. Follow
[the service activation steps](osiris-tools/README.md) and verify supported hosts
and devices before advertising an installed consumer integration.

The MCP service and optional API relay use `https://dgallemore.com` and
`https://www.dgallemore.com` as their website origins. Existing hosted services
need their updated code/config redeployed before the new origin works. The
advanced private Codex runtime uses its own `OSIRIS_ALLOWED_ORIGINS` setting;
the example uses these same website origins.
No model provider credentials or AI-service DNS records are created by this change.

## Full-stack application

The Next.js application under `frontend/` and FastAPI API under `backend/` need
separate full-stack hosting. GitHub Pages cannot execute them. The default
Next.js metadata and the root Caddy deployment example use the new domain, but
that stack is not established as publicly deployed by this change. Standalone
media-service deployments remain separately configured.

Choose a supported full-stack target before claiming V3 tools are live. It must
support the frontend, backend, HTTPS, API routing, required data providers, and
health/version verification. Any model integration must keep the visitor-funded
account boundary described above. Keep one authoritative host for the public site.
