# Supericons Library Launch Plan

Date: 2026-06-25

Scope: prepare the first Supericons first-party library for launch, starting with the 50 AI and agentic tool logos and then expanding into original icons for AI-built apps, agent workflows, indie tools, and vibe-coded products.

## Recommendation

Launch the 50 AI tool logos as free, searchable, public records. Do not make the logo set paid at launch.

Use the free logo set as the demand magnet: people searching for current AI product logos are already expressing intent. The paid product should be original Supericons work: agentic AI icons, app-state icons, motion icons, UI workflow icons, and Icon Lab-powered exports.

The best launch pricing shape is:

- Free: AI tool logos, public search, basic SVG copy/download, and attribution-free use for Supericons-owned original free icons.
- Paid packs: sell original 50-icon packs, starting around $9 to $15 per pack.
- Launch bundle: sell all launch packs together at an early price around $39 to $49, then raise as the library grows.
- Pro: $8 to $12 per month or $79 to $99 per year for all current and future original packs, premium exports, MCP/API access, and Icon Lab unlocks.
- Pay per icon: keep this as a later experiment, not the main launch path. A $1 icon is simple, but it is too low-friction for copying and too high-friction for buying. If single-icon purchase is added, price it closer to $3 to $5 or use credits for API buyers.

## Current Verified State

Local checks on 2026-06-25 show:

- `data/supericons/icon-library/agentic-ai-tools-logos-001` contains 50 SVG logo files and its manifest lists 50 icons.
- `data/si-registry/source/libraries/supericons.json` contains 50 source records. All 50 are `public_open_record`, `is_premium: false`, `category: brand_identity`, and `review_state: human_reviewed`.
- The generated public registry summary currently reports 15,153 public records and 400 protected premium records in the internal total.
- The current generated public registry preview and `public/registry/records.json` did not expose any `si:*` records when checked. That means the 50 Supericons logo records are in source, but the public projection needs to be regenerated or fixed before launch.
- `public/packs/manifest.json` lists 8 packs with 50 icons each.
- Each directory under `public/packs` currently contains 50 raw SVG files and a `bundle.json`. The `ai-agentic` bundle includes full CSS and SVG payloads, so the current public-pack structure is not strong enough for paid asset protection.
- `store.js` already has a premium asset function path for `serve-premium-asset`, but it also has a public fallback for `/packs/${slug}/${filename}` and loads `/packs/${product.slug}/bundle.json` for collection detail previews.

## Market Pattern

The main pattern is not true DRM. Once a user receives an SVG, it can be copied. Successful icon libraries instead combine public previews, clear licensing, account-gated downloads, private package delivery, rate limits, and bundles that make paying easier than scraping.

Observed examples:

- Font Awesome separates free packages from Pro packages. Pro package access requires an active plan and a private package token, and their docs recommend subsetted kit packages or individual packages instead of a full all-assets package. Source: https://docs.fontawesome.com/web/setup/packages and https://docs.fontawesome.com/web/dig-deeper/tokens
- Streamline offers free assets with attribution, paid subscription access without attribution, and one-time purchases for individual sets. Source: https://workspace.google.com/marketplace/app/streamline_icons_illustrations_emoji_ele/355267659218
- IconScout uses subscription access for unlimited downloads and API credits for platform integrations. Their API pricing uses a credit model where one icon equals one credit. Source: https://iconscout.com/pricing and https://iconscout.com/api
- Hugeicons sells a Pro plan around an annual license, with a license key, design/dev plugins, package delivery, pageview and bandwidth limits, and downloadable ZIP formats. Source: https://hugeicons.com/pricing
- Noun Project supports free attribution-required use, single-icon purchases, subscriptions, and API access. Source: https://thenounproject.com/pricing/
- Simple Icons is useful as a brand-logo reference point: even when icon assets are open, trademark rights are not granted by the icon library. Source: https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md
- Brand owners often forbid uses that imply endorsement or combine their marks into another product identity. Google's brand guidance is a clear example of this pattern. Source: https://about.google/brand-resource-center/guidance/

## Launch Positioning

Launch title:

Supericons AI Tools Logos 001

Positioning:

The fast-updating icon layer for AI products, agents, coding tools, model platforms, video/image tools, evaluation tools, infrastructure tools, and indie AI apps.

Why this should be free:

- It matches user search intent: people searching "Cursor logo SVG", "Lovable logo icon", "agent AI logos", or similar queries should land on Supericons.
- It builds trust before the paid catalog is large.
- It avoids charging directly for access to third-party brand marks.
- It gives the future paid library a discovery engine.

Public wording should make the brand boundary clear:

Supericons provides convenient references to product logos for identification and UI use. Brand names and logos belong to their owners. Using a logo does not imply sponsorship, partnership, or endorsement.

## Paid Product Strategy

The paid product should be original Supericons content, not third-party logos.

Start with original packs for the exact apps people are building with AI agents:

- Agentic AI Core: agent, tool use, context window, memory, evaluation, guardrails, routing, planning, handoff, trace, MCP, workflow, approval.
- Vibe Coder App Kit: prompt box, generated UI, deploy, environment variables, branch, bug fix, preview, database, authentication, billing, settings.
- AI SaaS UI States: empty state, loading, streaming, success, retry, rate limit, moderation, hallucination warning, data sync, user feedback.
- AI Media Tools: image generation, video generation, voice clone, captioning, transcript, upscaling, remix, scene, render, export.
- AI Developer Infrastructure: vector database, evals, embeddings, logs, traces, jobs, queues, API key, webhook, sandbox, model router.

Bundle logic:

- Keep each paid pack coherent and small enough to understand: 50 icons per pack is a good unit.
- Sell bundles by user job, not by internal category. "Build an AI SaaS" is stronger than "AI category pack".
- Let Pro users access all current and future original packs.
- Let one-time buyers keep the exact packs they bought forever.

## Anti-Copying And Access Plan

### Logos

Keep the logo SVGs public. Do not spend engineering effort trying to protect brand logos. The correct protection for logos is metadata, source review, brand-safe usage notes, and takedown readiness.

Logo readiness checklist:

- Confirm every logo has a clear label, aliases, source name, use guidance, avoid guidance, and category tags.
- Add or verify official source URLs where available.
- Add a public trademark disclaimer near logo downloads.
- Add a takedown/update contact path.
- Add a "last reviewed" field if the registry shape supports it.
- Avoid custom reinterpretations that could look like modified brand marks.

### Paid Original Icons

Do not advertise paid packs as protected while full SVGs and full `bundle.json` files live in `public/packs`.

Recommended launch protection:

- Public previews only: keep thumbnails, low-detail preview JSON, watermarked preview renders, and public pack metadata in `public/packs`.
- Private raw assets: move full premium SVGs, CSS, and bundles out of `public/packs` into private storage or a private server-side source.
- Entitlement endpoint: serve full assets only through `serve-premium-asset` or signed URLs after checking the purchaser or Pro subscription.
- No direct fallback for premium assets: remove or restrict the `/packs/${slug}/${filename}` fallback for premium packs.
- Separate preview bundles from download bundles: `preview.json` can be public; `bundle.json` with full SVG/CSS should require entitlement.
- License keys for developer delivery: use account tokens for MCP/API/package access, following the private-token pattern used by larger libraries.
- Subset downloads: when a user buys one pack, generate a ZIP for that pack only rather than exposing the full premium catalog.
- Download manifests: include order ID, customer ID hash, license type, purchase date, and pack IDs in a manifest file inside ZIP downloads.
- Rate limits: rate-limit premium asset endpoints, token calls, and download ZIP generation.
- Audit logs: log pack slug, asset path, customer ID, endpoint, and timestamp for premium downloads.
- Watermark previews, not customer assets: full purchased SVGs should be clean and usable.

## Launch Phases

### Phase 0: Fix The Registry Projection

Goal: make the 50 logo records actually appear in public search, web registry output, and MCP output.

Tasks:

- Run or repair the SI registry projection build so `si:*` records appear in `data/si-registry/generated/public-record-preview.json`.
- Confirm `public/registry/records.json` includes the 50 `si:*` logo records.
- Confirm `mcp/public/registry-records.json` includes the same 50 `si:*` logo records.
- Add a verification check that fails if source library records exist but no matching public projection records are generated.
- Add search fixtures for top AI logo queries.

Exit criteria:

- All 50 logo records appear in public and MCP registry outputs.
- A query like "bolt ai logo", "lovable logo", or "agentic ai logo" returns expected Supericons records.

### Phase 1: Brand-Safe Metadata Hardening

Goal: make the logo library trustworthy, searchable, and safe to publish.

Tasks:

- Review all 50 records for label quality, aliases, categories, use guidance, and avoid guidance.
- Add official source URLs where possible.
- Add public-facing logo usage copy and a trademark disclaimer.
- Add a logo update request path.
- Add a brand-owner takedown path.

Exit criteria:

- Each logo record has enough metadata to answer "when should I use this?" and "when should I not use this?"
- Public pages avoid implying partnership, sponsorship, or endorsement.

### Phase 2: Launch The Free Logo Surface

Goal: capture search demand from AI builders.

Tasks:

- Create a public landing page for "AI tools logos".
- Create one index page with all 50 logos and category filters.
- Create detail pages or deep links for high-intent logos.
- Add sitemap entries for the logo collection.
- Add SEO copy for "AI app logos", "agentic AI logos", "AI tools SVG icons", and brand-specific searches where appropriate.
- Include related original Supericons packs below the free logo results.

Exit criteria:

- A user can search, preview, copy, and download the 50 logos.
- The page clearly points builders toward paid original packs without paywalling the logos.

### Phase 3: Protect Paid Packs Before Selling Them

Goal: avoid launching paid packs while raw premium assets are publicly exposed.

Tasks:

- Replace public full pack bundles with preview-only bundles.
- Move full premium SVGs and CSS out of `public/packs`.
- Route full premium downloads through entitlement checks.
- Update collection previews to use preview assets for locked users.
- Update unlock/export actions to call premium asset delivery only after purchase or Pro verification.
- Add a test that scans `public/packs` and fails if premium packs contain full raw SVGs or full `bundle.json` payloads.

Exit criteria:

- Public users can preview paid packs but cannot fetch full premium SVGs directly from `public/packs`.
- Paid users can download clean full assets.

### Phase 4: Pricing And Checkout

Goal: support both impulse buys and recurring Pro value.

Launch pricing proposal:

- Free logo collection: $0.
- Single original pack: $9 launch price, $15 standard price.
- All launch packs bundle: $39 launch price, $49 to $79 standard price as the catalog grows.
- Pro: $9/month or $89/year at launch.
- Team Pro: defer until there is demand; start with simple seat-based licensing later.
- Pay-per-icon: defer. Consider $3 to $5 single-icon purchase only after the pack and Pro funnel is proven.

Checkout tasks:

- Confirm Stripe products map to pack, bundle, and Pro entitlements.
- Confirm post-purchase asset access works for web downloads and MCP/API delivery.
- Confirm receipts and account pages show the license scope clearly.
- Confirm refunds or failed payments revoke future premium access without breaking already downloaded licensed assets.

Exit criteria:

- A user can buy one pack, buy the bundle, or subscribe to Pro.
- Entitlements are consistent across web, MCP, and future API surfaces.

### Phase 5: Quality Gates

Goal: launch with confidence.

Required checks:

- Registry projection verification passes.
- Public registry includes the 50 Supericons logo records.
- MCP registry includes the 50 Supericons logo records.
- Public pack scan confirms no full premium bundles are exposed.
- Search fixtures pass for AI logo queries and agentic AI non-logo queries.
- Public pages include trademark-safe wording.
- Paid asset endpoint rejects unauthenticated premium requests.
- Paid asset endpoint returns correct assets for entitled users.
- Sitemap includes the logo collection.
- Basic browser QA confirms logo collection, search, pack preview, locked state, checkout entry points, and post-purchase download.

### Phase 6: Launch Campaign

Audience:

- Indie hackers building with agents.
- Vibe coders shipping AI SaaS quickly.
- AI tool directories and newsletter writers.
- Product designers needing current AI product references.
- Developers using MCP, AI coding assistants, and agentic coding environments.

Launch channels:

- Product Hunt: lead with the free AI tools logo library and show the paid original agentic packs as the upgrade.
- Hacker News "Show HN": focus on the fast-updating AI logo search plus original agentic icons.
- X and LinkedIn: short threads showing "50 AI tool logos + original icons for agent apps".
- GitHub lightweight repo: publish free metadata or preview docs, with links back to Supericons.
- SEO pages: create category pages for AI coding tools, AI video tools, AI evaluation tools, AI infra tools, and AI app builders.
- Community outreach: Cursor, Lovable, Bolt, v0, and indie AI builder communities where logo and UI asset demand is visible.

Launch copy angle:

"The icon library for the new AI app stack: current AI tool logos for reference, plus original icons for agents, prompts, traces, memory, tools, evals, and shipped products."

### Phase 7: Post-Launch Measurement

Track:

- Top logo searches.
- Zero-result searches.
- Logo download count by brand.
- Click-through from free logo pages to paid original packs.
- Pack preview views.
- Checkout starts and completed purchases.
- Pro trial or Pro subscription starts.
- Refund reasons.
- Brand-owner update or takedown requests.
- Requests for new original icons.

Use these signals to decide which packs to create next.

## Decision Summary

Make all 50 AI logos free.

Make original Supericons packs paid.

Use pack and Pro pricing as the main monetization path.

Do not lead with $1 per icon. It is easy to understand but likely creates too much checkout friction, too little revenue, and little real protection against copying.

Before selling protected packs, move full premium SVGs and bundles out of public paths. Treat anti-copying as entitlement control plus licensing, not impossible-to-break DRM.
