# Supericons Launch Audit and Roadmap

Date: April 19, 2026

This document is a repo-backed audit of what Supericons actually is today, what is still unfinished, where the product drifted, and what the launch-focused roadmap should be now.

Audit inputs:
- current codebase
- current working tree
- current `strategy/`, `docs/`, `premium/`, `mcp/`, and `supabase/` contents
- local browser checks of `/`, `/?view=docs`, and `/?view=packs`
- verification commands:
  - `npm run verify:icon-grid-behavior`
  - `npm run verify:search-query-fixtures`
  - `npm run build`

---

## Plain-English Verdict

Supericons is already a real product, not just a concept.

What is real today:
- a fast icon search app with 21,264 free icons across 10 libraries
- a working MCP server with 12 tools
- two workflow tools with real value: Motion Lab and Converter
- eight premium animated collections with checkout, auth, docs, and API-key flows
- a hosted search intelligence layer that is starting to learn from real search behavior

What is not real yet:
- a true semantic icon system across the full corpus
- a universal visual language for human-AI governance
- a stateful icon grammar product
- a public standard that the market already recognizes

The launch problem is not "the product does not exist."

The launch problem is:

**the product story drifted far ahead of the product reality.**

The right move now is to launch the thing that already exists and let the bigger semantic vision stay as the internal north star, not the public promise.

---

## Mind Map

```text
Supericons now
|
|-- Core product
|   |-- 21,264 free icons
|   |-- 10 open icon libraries
|   |-- search + customize + export
|   |-- docs + docs search
|
|-- Agent and developer surface
|   |-- MCP package on npm
|   |-- 12 MCP tools
|   |-- free search tools
|   |-- Pro Motion Lab + Converter tools
|
|-- Revenue layer
|   |-- 8 premium animated collections
|   |-- Pro subscription
|   |-- launch bundle
|   |-- Stripe checkout + portal + claims
|
|-- Intelligence layer
|   |-- hosted search engine
|   |-- private manifest/features tables
|   |-- 36 curated alias icons
|   |-- 252 alias terms
|   |-- 150 taxonomy-seeded icons
|
|-- Operational strength
|   |-- build passes
|   |-- key verify scripts pass
|   |-- local-only admin surface
|   |-- Netlify + Supabase + Stripe stack exists
|
|-- Current drift
|   |-- public story says "icon library"
|   |-- strategy says "visual protocol for AI"
|   |-- code reality sits in the middle
|
|-- Biggest gaps
|   |-- free icon corpus has no public semantic metadata
|   |-- browse taxonomy is partial, not universal
|   |-- messaging and version numbers are inconsistent
|   |-- frontend is large and monolithic
|   |-- one collections page heading bug is visible in-browser
|
|-- Direction now
|   |-- launch as the best icon search + MCP + motion workflow toolkit
|   |-- tighten copy
|   |-- finish metadata on the highest-value slices
|   |-- prove one semantic wedge after launch
```

---

## What Supericons Actually Is Today

| Area | Current state | Audit notes | Launch value |
| --- | --- | --- | --- |
| Free icon engine | Real and usable | `public/icon-index.json` contains 21,264 free icons across 10 libraries | Strong |
| Frontend app | Real and polished enough to launch | landing, icon grid, customize panel, docs, packs, pricing, auth flows all exist | Strong |
| MCP server | Real and differentiated | `mcp/index.js` registers 12 tools; npm package is `supericons-mcp@0.3.1` | Strong |
| Motion Lab | Real workflow product | 80 presets, CSS export, animated SVG export, hosted sessions and rate limits | Strong |
| Converter | Real workflow product | SVG to PNG and PNG to SVG tooling exists in site, MCP, and backend | Good |
| Premium packs | Real but unevenly positioned | 8 public pack directories, 400 premium animated icons total | Good |
| Search intelligence | Real but still early | hosted search schema, ranking layer, audit tables, admin review plans | Good |
| Auth and billing | Real | Supabase auth, Google OAuth, Stripe checkout, portal, claims, webhook flows | Strong |
| Docs | Real and better than average | 26 docs pages across 7 groups, docs search, setup guides for major clients | Good |
| Admin | Real, intentionally local-only | `admin.html` and `public/admin-app.js` exist; production admin route was intentionally removed | Good |

---

## Repo-Backed Snapshot

### Product surface

- Free icons: `21,264`
- Free libraries: `10`
- Premium collections: `8`
- Premium icons: `400`
- Docs pages: `26`
- MCP tools: `12`
- Supabase edge functions: `18`

### Search and metadata surface

- Public synonym groups: `280`
- Curated alias icons: `36`
- Curated alias terms: `252`
- Taxonomy-seeded browse icons: `150`
- Public semantic metadata coverage on free corpus: `0 / 21,264`
- Premium pack icon metadata coverage inside pack manifest: `400 / 400`

### Code shape

- `main.js`: `3,835` lines
- `store.js`: `13,409` lines
- `style.css`: `11,450` lines
- `docs-pages.js`: `1,969` lines
- `auth.js`: `1,674` lines
- production JS bundle: about `599 kB` minified

### Verification results

- `npm run verify:icon-grid-behavior`: pass
- `npm run verify:search-query-fixtures`: pass
- `npm run build`: pass

---

## Frontend Audit

## What is good

- The home page is clear, visually strong, and immediately communicates "search icons fast."
- The docs experience is cleaner and more mature than the rest of the product story. It already feels like a usable developer product.
- The app shell is feature-rich: search, favorites, recent, library browse, packs, tools, pricing, docs, auth, and account flows are all inside one interface.
- The packs catalog is real and monetizable right now.
- The customize panel plus export workflow is a practical builder feature, not just nice branding.

## What is weak

- The frontend is carrying too much in too few files. `store.js`, `main.js`, and `style.css` are doing the work of many modules.
- The app shell mixes too many concerns: icon browse, docs, store, pricing, legal pages, tool UIs, account pages, and pack detail screens.
- One browser-visible collections bug is live in the local app: the packs screen shows collection cards but the main heading still says `All Icons`.
- The purpose-pill browse filter is still an experiment, not a finished information architecture system.
- Several values and stories are hardcoded in multiple places, which is causing drift.

## Plain-language frontend conclusion

The frontend is launchable, but it is already harder to steer than it should be.

That does **not** mean "rewrite it before launch."

It means:

- fix the obvious inconsistencies
- stop adding new surfaces for a while
- only refactor when it directly removes launch friction

---

## Backend and Provider Audit

Supericons is not a traditional app with one big backend server.

It is mostly:
- a Vite frontend
- Supabase auth, database, storage, and edge functions
- Stripe for billing
- npm for MCP distribution

### Providers in use now

| Layer | Provider / tool | What it is doing now |
| --- | --- | --- |
| Hosting | Netlify | production frontend hosting and redirects |
| App frontend | Vite | local dev and production build |
| Database | Supabase Postgres | products, purchases, subscriptions, search intelligence, audit data |
| Auth | Supabase Auth | email/password, Google OAuth, sessions |
| Functions | Supabase Edge Functions | billing, claims, downloads, hosted search, Motion Lab, admin API, API-key validation |
| Storage | Supabase Storage | premium assets and material snapshot serving |
| Billing | Stripe | subscriptions, bundle and pack checkout, customer portal, webhooks |
| Email | Resend | purchase and billing emails per launch docs and webhook flow |
| Analytics | Umami | site analytics and event tracking |
| Distribution | npm | `supericons-mcp` package |
| Converter proof runtime | Railway | called out in launch docs as a live dependency for converter proof service |
| Browser ZIP export | JSZip CDN | batch export in the frontend |

### Backend strengths

- The edge-function model fits the product.
- Search, billing, packs, auth, and MCP access are already separated into reasonable runtime boundaries.
- The hosted search engine is more serious than the marketing copy makes obvious.
- The admin route being local-only is a good safety move for a solo-operated launch.

### Backend weaknesses

- Configuration is spread across code, docs, env files, and strategy notes.
- Some product logic still lives in the frontend where a single source of truth would be safer.
- Search intelligence and semantic metadata are split between public files and private Supabase tables, which makes the story harder to explain and maintain.

---

## MCP and Search Audit

This is the strongest "future-facing" part of the product.

### What is already good

- The MCP product is real. This is not a mock integration.
- The tool set is broad enough to feel useful today:
  - icon search and retrieval
  - library discovery
  - Motion Lab recipe and export tools
  - Converter inspection and conversion tools
- The hosted search engine has its own schema, ranking, private manifests, private feature scores, and audit logging.
- Search fixtures now pass for important technical phrases like `self-hosted`, `latency`, `hallucination`, `worktree`, and `ai drifting`.

### What is not finished

- The public icon corpus still does not carry semantic metadata in its main index.
- The private manifest seeding is still narrow compared with the size of the total corpus.
- The current semantic layer is a strong wedge, but not yet a full semantic platform.

### Important truth

Today, Supericons can honestly claim:

**"We have better semantic icon search for technical concepts than a normal icon library."**

It cannot yet honestly claim:

**"We are already the semantic visual protocol for AI interfaces."**

---

## Premium and Revenue Audit

### What exists

- 8 premium animated collections
- 400 premium icons total
- per-pack buying
- bundle buying
- Pro subscription
- gated MCP and workflow access

### What is promising

- The premium packs are concrete and sellable.
- The bundle and Pro upsell make sense.
- Motion Lab and Converter are the clearest reasons to pay on an ongoing basis.

### What feels muddy

- Some strategy docs still describe the premium layer like a research thesis instead of a product shelf.
- Only two source roots appear under `premium/` while eight public pack outputs are shipped. That does not block launch, but it does make the pack authoring story harder to follow.
- Pricing language varies between code and strategy docs. The code is the truth right now.

### Revenue conclusion

The fastest revenue story is not "buy into a future protocol."

It is:

- free icon search
- MCP install
- pay for better workflow power
- pay for animated packs

---

## Value Proposition Audit

## The best current value proposition

Supericons helps builders and coding agents:

1. find icons faster across many libraries
2. export them in developer-friendly formats
3. add motion when static icons are not enough
4. access the workflow from MCP instead of only the browser

## What should be the public promise right now

**"One search for 20,000+ free icons, plus MCP, Motion Lab, Converter, and premium animated packs."**

That is already true.

## What should stay as the internal north star

**"Become the semantic icon layer for agent-built interfaces."**

That is directionally right, but it is still future-facing.

## What should not be the public promise yet

- "the standard visual language for human-AI governance"
- "the interface grammar for autonomous software"
- "the multimodal protocol layer for agentic systems"

Those ideas may become true later, but saying them too early makes the product sound more speculative than it is.

---

## Mission and Vision Reset

## Mission now

Help builders and coding agents find, customize, and ship the right icons faster.

## Vision later

Become the semantic icon layer that agent-built interfaces use to express state, intent, trust, and action more clearly.

## Public one-liner now

Supericons is a developer-first icon search and workflow toolkit: free icons, MCP access, animated exports, and premium motion packs.

## Internal north star

Use search intelligence, pack design, and semantic metadata to slowly turn Supericons from a better icon library into a real semantic icon system.

---

## Where the Product Drifted

The drift happened in three places:

### 1. The story got ahead of the shipped artifact

The strategy layer talks about:
- governance vocabulary
- multimodal signal systems
- icon grammar
- standards-setting

The product layer ships:
- icon search
- docs
- MCP
- animation tools
- packs

Those are not the same level of maturity.

### 2. Counts and language started disagreeing

Examples from the repo:
- homepage copy says `20,000+`
- actual corpus is `21,264`
- root `package.json` description says `60K+ free icons`
- MCP package version is `0.3.1`
- MCP server code still reports `0.3.0`
- top-of-file MCP comment still says `Provides 3 tools` while the server registers `12`

These are not catastrophic bugs, but together they make the product feel less grounded.

### 3. The semantic browse experiment started looking bigger than it is

The browse taxonomy is currently:
- 3 purpose buckets
- 150 seeded icons
- purpose pill UI intentionally scoped to `All Icons` only

That is a useful experiment.

It is **not** a finished taxonomy across the product.

---

## Incomplete Items and Gaps

## P0: Must tighten before or at launch

| Item | Current state | Why it matters | Priority |
| --- | --- | --- | --- |
| Public positioning reset | Product truth and strategy thesis are mixed together | Users need to understand what they can use today | P0 |
| Copy and version consistency | `20,000+` vs `21,264` vs `60K+`; MCP comment and version mismatch | Inconsistency makes the product feel shaky | P0 |
| Collections page heading bug | packs screen shows collection cards but heading still says `All Icons` in browser | This is visible and confusing | P0 |
| Canonical premium offer | packs, bundle, and Pro exist, but messaging is spread across many docs and code paths | Buyers need one clean offer ladder | P0 |
| Purpose pill chip scope | current code and plan correctly keep it in `All Icons`; it is still not a universal IA feature | Prevent overclaiming and reduce confusion | P0 |

## P1: Important, but can happen right after launch

| Item | Current state | Why it matters | Priority |
| --- | --- | --- | --- |
| Semantic metadata for all 10 free libraries | `0 / 21,264` public free icons carry purpose/category/semantic tags in the main icon index | This is the single biggest gap between the current product and the semantic vision | P1 |
| Semantic metadata normalization for premium collections | pack-level metadata exists for all 400 premium icons, but it is not normalized into the same model as the free corpus and search responses | Premium metadata is useful today, but not system-wide yet | P1 |
| Hosted search manifest depth | private semantic seeding exists, but the alias-backed manifest is still narrow relative to the whole corpus | Search intelligence will improve faster with deeper coverage | P1 |
| Agent phrasebook docs | docs are good, but there should be a plain page showing how to ask for icons by intent | This makes the MCP wedge easier to understand and use | P1 |
| Pack source-of-truth cleanup | only two source roots are obvious under `premium/`, while eight public packs ship | This will slow future pack work and confuse maintenance | P1 |

## P2: Useful later, not launch work

| Item | Current state | Why it matters | Priority |
| --- | --- | --- | --- |
| Request-by-intent MCP tool | not shipped yet | This is the real bridge to the future semantic story | P2 |
| Governance-first collection strategy | mostly in strategy docs, not yet the public product center | Build this only after launch story is stable | P2 |
| Stateful icon grammar | not shipped | Too early until semantic demand is proven | P2 |
| Large frontend refactor | needed eventually | Do not let this become pre-launch procrastination | P2 |

---

## Direct Answers on the User-Named Gaps

## Purpose pill chip

Status now:
- active work is already in progress in the working tree
- current helper logic and verification script scope the purpose filter to `All Icons`
- this is the right decision for now

Recommendation:
- finish the scope cleanup
- keep it framed as a curated browse shortcut
- do not market it like full taxonomy coverage

## Semantic metadata for all 10 icon libraries

Status now:
- not done
- the main free icon index has no public semantic metadata fields across the 21,264-icon corpus
- the current semantic system lives mostly in private hosted-search tables and curated alias maps

Recommendation:
- make this a post-launch priority
- do not try to tag all 21,264 icons perfectly before launch
- instead tag the highest-value slice first:
  - all premium icons
  - top 200-500 free icons
  - all icons that appear in search-intelligence backlog

## Semantic metadata for premium collections

Status now:
- partly done
- all 400 premium icons already have pack-level `purpose`, `tags`, and `category`
- but that metadata is not yet unified with the free-corpus model and not exposed as one system story

Recommendation:
- normalize premium metadata first because the volume is small and the user value is immediate
- use the premium model as the draft shape for free-corpus metadata v0

## Other important unfinished items you did not name directly

- collections page heading mismatch
- messaging and version drift
- single-source-of-truth drift for prices, counts, and surface descriptions
- very large frontend files and bundle size
- pack authoring/source organization inconsistency

---

## Launch-Focused Roadmap

## Phase 0: Cut The Drift

Target: next 7 days

1. Lock one public story:
   - free icon search
   - MCP
   - Motion Lab
   - Converter
   - premium animated collections
2. Fix all obvious count/version/copy inconsistencies.
3. Fix the packs page heading bug.
4. Finish and ship the purpose-pill scope cleanup.
5. Move the most speculative "visual protocol" material out of the main public path if it risks confusing the offer.

Outcome:
- a cleaner launch story
- a product that feels more deliberate

## Phase 1: Strengthen What Already Works

Target: next 2 to 4 weeks

1. Normalize metadata for all premium icons.
2. Add semantic metadata v0 to the top 200-500 free icons.
3. Publish an "agent phrasebook" docs page:
   - how to describe a concept
   - why a result was chosen
   - what not to use
4. Run weekly search-intelligence triage and turn it into alias, metadata, and curation work.
5. Tighten premium pack previews, descriptions, and bundle positioning.

Outcome:
- the semantic story becomes visible through shipped value, not just strategy docs

## Phase 2: Ship One Real Proof Of The Future

Target: after launch, only if the current surfaces get traction

1. Ship one clearly agent-native collection, likely Agent Lifecycle or a smaller governance wedge.
2. Add one new MCP tool for intent-based selection.
3. Measure actual search demand and adoption before building broader protocol layers.

Outcome:
- one credible proof that the long-term direction has product pull

## Phase 3: Only Then Expand The Thesis

Possible later work:
- stateful icon bundles
- composable grammar
- governance taxonomy
- public semantic spec

This work should come **after** launch traction, not before.

---

## What Not To Build Now

- full visual protocol standard
- multimodal signal system
- blockchain or NFT experiments
- enterprise governance dashboards
- broad ecosystem tooling spree
- large-scale frontend rewrite
- public messaging that implies the future system is already here

---

## Decision Guardrails

Use these rules to anchor the team:

1. If a feature does not improve search, export, MCP usefulness, premium conversion, or docs clarity, it is probably not launch work.
2. If a story is not visible in the current product, do not let it dominate public messaging.
3. If a semantic idea cannot be tested through one real pack or one real MCP tool, it is still strategy, not roadmap.
4. If a refactor does not reduce launch friction in the next month, defer it.
5. Let search intelligence tell you what semantic work matters next.

---

## Final Recommendation

Launch Supericons as:

**a sharper icon search and workflow toolkit for modern builders and coding agents**

Back that with:
- the 10-library free corpus
- MCP access
- Motion Lab
- Converter
- premium animated collections

Keep the bigger semantic/governance vision alive internally, but make it earn its way into the public product one shipped slice at a time.

That path is much more believable, much easier to sell, and much less likely to waste time before launch.
