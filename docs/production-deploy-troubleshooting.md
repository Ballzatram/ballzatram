# Production deployment troubleshooting

Ballzatram has one production deployment target: the DigitalOcean droplet serving the Next.js + FastAPI + Caddy stack at `ballzatram.com`.

GitHub Pages is not a production target and must not claim the custom domain.

## Deployment order

The `Deploy to DigitalOcean` workflow now:

1. Fetches/reset the droplet checkout to `origin/master`.
2. Validates Compose and builds backend/frontend before changing live traffic.
3. Starts backend and frontend and verifies both are healthy internally.
4. Stops the legacy AI Edit stack only after the new app services are healthy.
5. Starts Caddy.
6. Verifies `/api/version` locally through Caddy using `curl --resolve`, independent of public DNS.
7. Verifies source-tree paths remain blocked.
8. Checks public DNS and HTTPS separately.

If the cutover fails after the legacy stack is stopped, the workflow attempts to stop the new Caddy service and restart the legacy stack.

## Interpreting a failed master deployment

A failure before local Caddy verification means the droplet/app stack itself is unhealthy. Review the deploy job logs for Compose build output and container logs.

A failure after local Caddy verification with a DNS warning means the application is healthy on the droplet, but the public hostname is not reaching it. Check the domain's A/AAAA records, nameservers, DigitalOcean firewall, and inbound ports 80/443.

The expected public check is:

```bash
curl -fsS https://ballzatram.com/api/version
```

The response should contain the short SHA of the current `master` commit.
