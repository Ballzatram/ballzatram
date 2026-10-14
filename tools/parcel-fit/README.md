# Parcel Fit — founding pilot storefront

This is a **human-reviewed desktop research service**, not automated property due diligence or site certification. The live customer-facing route is `/tools/parcel-fit/`. The existing `/tools/parcel/` is a separate, free experimental research workspace.

## What ships now

- Responsive mobile-first service landing page with narrow, honest pilot scope.
- A **fictional**, explicitly labeled printable sample memo at `sample.html`. No actual parcel is claimed to have been researched.
- Client-side intake that validates required fields, constructs a concise inquiry, opens the visitor's email app, and offers a copy fallback.
- Starting pilot price displayed as **from $299**, but **no online checkout**. Every final quote, timing commitment, and payment is agreed individually.
- Public navigation from the site's homepage and project catalog.

## Lead handling

Visitors submit by opening their email app and explicitly pressing **Send**. This is not a server form. The page does not persist intake fields, send background requests, or claim success when an email draft is generated. It uses the publicly listed address `devin.gallemore@gmail.com`. Before scaling, set up a business inbox and a verified server-side form with anti-spam, rate limits, privacy notices, and access controls.

Email drafts can fail on phones without a configured mail handler. The UI displays editable/selectable request text and a copy action as an honest fallback.

## Delivery / commercial boundaries

The service is a desk screen and evidence organization, *not* zoning approval, surveying, engineering, environmental delineation, appraisal, legal counsel, or a guarantee of permitted use/buildability. Public data gaps stay unknown. Any parcel findings should be reviewed, cited, and clearly attributed before delivery.

No Stripe account, payment credentials, or inference credentials exist in this static app. To accept payments, create a live payment link/invoice through the account owner (after scope acceptance), and only then wire a real checkout flow. Do **not** insert fake links or expose secret keys in GitHub Pages.

## Local checks

From repository root:

```sh
node --test scripts/parcel-fit.test.cjs
node --check tools/parcel-fit/app.js
python scripts/validate_public.py
```

The static Node tests are included in the existing `frontend` test:static command. The public validator checks deployed routes and references.

## Next phase (only after a paid pilot)

1. Interview buyers and track inquiry-to-quote and quote-to-sale conversion.
2. Review real public records and attach exact source URLs and dates; validate a full report with a human reviewer.
3. Use the existing Parcel screening engine to reuse hard-constraint/unknown handling where it is suitable, without conflating listing acreage with usable acreage.
4. Add secure async intake, payment confirmation, and queue-driven research only after transactions validate the demand.
