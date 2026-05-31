# Proposed Lab Pass Schema

This document is a planning artifact only. Do not wire Prisma into the app unless the dependencies and migration path are ready. Do not break the existing Prisma schema.

Existing `prisma/schema.prisma` already has User, Lab, Scenario, Progression, AnalyticsEvent, and StrategyNote concepts, but it does not yet model subscriptions, entitlements, favorites, suggestions, votes, drops, or usage quotas.

## Proposed models

| Model | Purpose | Key fields | Scale concern | Needed for Lab Pass v1 |
| --- | --- | --- | --- | --- |
| User | Canonical member identity. | id, email, displayName, role, createdAt, updatedAt. | Email uniqueness, deletion/export requests, account recovery. | Yes |
| Account/AuthIdentity | External auth provider identities. | id, userId, provider, providerAccountId, email, linkedAt. | Multiple providers per user and account linking conflicts. | Yes if using third-party auth |
| Subscription | Paid subscription state from payment webhooks. | id, userId, planId, provider, providerCustomerId, providerSubscriptionId, status, currentPeriodEnd. | Webhook idempotency and stale entitlement state. | Yes once checkout exists |
| Plan | Sellable plan definition. | id, slug, name, priceCents, interval, active, includedQuotaJson. | Historical plan changes and grandfathering. | Yes once checkout exists |
| Entitlement | Server-side access grant. | id, userId, planId, featureKey, startsAt, endsAt, source. | Fast checks without trusting client state. | Yes once checkout exists |
| Tool | Canonical tool/artifact registry. | id, slug, title, category, href, status, riskLevel, heavyCompute. | Keeping public inventory and app registry in sync. | Yes |
| ToolStatus | Status taxonomy rows. | id, label, shortDescription, userExpectation, paidEligible. | Avoiding divergent labels across static and Next surfaces. | Nice for v1, can start as code/data |
| Favorite | Saved user artifacts. | id, userId, toolId, createdAt. | Unique per user/tool and fast list rendering. | Yes |
| Suggestion | Member/community idea submission. | id, userId, title, body, category, status, createdAt. | Spam, moderation, dedupe, abuse reporting. | Yes |
| Vote | Upvote or prioritization signal. | id, userId, suggestionId, value, createdAt. | Unique vote per user/suggestion and fraud prevention. | Yes |
| Drop | Monthly release bundle. | id, title, slug, summary, visibility, publishedAt. | Scheduled publishing and archive navigation. | Yes |
| DropItem | Tool or note inside a drop. | id, dropId, toolId, title, href, sortOrder. | Stable archive ordering and broken links. | Yes |
| Progress | Saved game/lab progress. | id, userId, toolId, stateJson, score, updatedAt. | Large state payloads and version migrations. | Yes for games/labs |
| Workspace | Saved research or creation workspace. | id, userId, toolId, title, stateJson, visibility, updatedAt. | User scoping, privacy, large JSON, export history. | Not for first static preview |
| UsageEvent | Metering and analytics event. | id, userId, toolId, eventType, quantity, metadataJson, createdAt. | High write volume and retention policies. | Yes for heavy tools |
| QuotaBucket | Per-user usage limit window. | id, userId, featureKey, periodStart, periodEnd, limit, used. | Race conditions and reset timing. | Yes before paid heavy compute |
| RenderJob | Heavy render or AI job. | id, userId, toolId, status, inputAssetIds, outputAssetIds, error, createdAt, completedAt. | Queue retries, stuck jobs, cost attribution. | Yes for paid AI Edit |
| MediaAsset | Uploads and generated exports. | id, userId, toolId, storageKey, mimeType, byteSize, purpose, retentionUntil. | Storage cost, rights policy, deletion, signed URLs. | Yes for AI Edit |
| AuditLog | Sensitive account/admin/payment events. | id, actorUserId, targetUserId, action, metadataJson, createdAt. | Tamper resistance and privacy. | Yes for checkout/admin |

## V1 recommendation

For Lab Pass v1 after static preview, implement the smallest paid-state core:

- User and AuthIdentity.
- Plan, Subscription, and Entitlement.
- Tool and ToolStatus, or a code/data registry with database IDs.
- Favorite, Suggestion, Vote, Drop, and DropItem.
- UsageEvent and QuotaBucket before exposing heavy member tools.

Delay durable Workspace, RenderJob, and MediaAsset monetization until the object-storage, queue, worker, quota, and retention policies are ready.
