# Scaling Ballzatram Lab Pass to 10k Subscribers

## Baseline assumption

Lab Pass target: $10/month.

10k subscribers at $10/month = $100k/month gross revenue.

Core principle: cheap membership state, isolated expensive tools.

## Recommended layers

1. Static/CDN marketing and public tools
2. Next.js app for logged-in membership
3. Postgres for users, subscriptions, votes, favorites, drops, progress
4. Object storage for media, uploads, and exports
5. Redis/queue for AI Edit and heavy jobs
6. Worker pool for rendering and AI jobs
7. Rate limits and quotas
8. Analytics and observability
9. Admin and moderation tools
10. Payment provider webhooks later

## Architecture path

Keep public pages and lightweight games cheap. Serve the homepage, legal pages, tool inventory, and many static games from CDN/static hosting. Move paid state into the Next.js app only when auth exists.

Use Postgres for durable member state: users, subscriptions, entitlements, favorites, suggestions, votes, drops, progress, workspaces, usage events, and quota buckets.

Use object storage for user uploads, generated exports, attachments, and any shareable artifacts. Store metadata in Postgres, not in shared JSON files.

Use Redis and a queue for AI Edit, rendering, media analysis, and any future heavy job. Web requests should enqueue work and return status, not render video inline.

Use worker pools with quotas. Heavy tools should have per-user, per-plan, and per-IP limits before public traffic can reach them.

## Pricing and packaging

- Free public playground.
- Lab Pass at $10/month.
- Annual option later.
- Heavy creator/render credits later.
- Classroom/team tier later.

Lab Pass should include the evolving archive, early access, suggestions, votes, saved favorites, dev notes, and monthly drops. Heavy media generation should be metered separately once usage is meaningful.

## Important warnings

- Do not include unlimited video rendering in $10/month forever.
- Do not store paid user state in localStorage.
- Do not store all user workspaces in shared JSON files.
- Do not run heavy jobs in the web request path.
- Do not let unpaid public endpoints trigger expensive jobs without quota/rate limits.
- Do not put provider keys, payment secrets, auth secrets, or signing secrets in browser-delivered code.

## Staged roadmap

### Phase A: Public Lab Pass preview, local suggestions/favorites

- Add Lab Pass preview page.
- Add local browser-only favorites, suggestions, and votes.
- Publish inventory, status taxonomy, monetization docs, and scale docs.
- Keep checkout disabled.

### Phase B: Auth + Postgres membership state

- Add authentication.
- Add Postgres-backed users, favorites, suggestions, votes, drops, progress, and workspace ownership.
- Replace local-only state for paid surfaces.
- Add admin moderation basics.

### Phase C: Payment provider + webhooks + entitlements

- Add payment provider only after paid terms are ready.
- Store subscription and plan records.
- Process webhook events server-side.
- Gate member-only drops and prototypes with server-side entitlement checks.

### Phase D: Quotas, queues, object storage, email, analytics

- Add upload/export storage with retention rules.
- Add Redis-backed queue and workers for heavy jobs.
- Add quotas and rate limits.
- Add email for receipts, updates, and account events.
- Add analytics and alerting for cost, latency, errors, and abuse.

### Phase E: Member-only drops, saved progress, admin dashboard

- Publish monthly drops.
- Add saved progress for games and labs.
- Add admin views for suggestions, votes, usage, drops, and member support.
- Add observability dashboards for queue health and backend failures.

### Phase F: Classroom/team/creator tiers

- Add team/classroom management if there is clear demand.
- Add creator/render credit packs if heavy media usage grows.
- Add richer admin and support tooling before larger accounts.
