# Docs and MCP Page Consolidation Plan

This document captures the full audit, Socratic analysis, architectural decisions, and proposed content refinements for consolidating the Supericons Docs page and in-app MCP hub into a single authoritative surface. It also covers copy refinements for the API Keys page.

---

## Table of Contents

1. [Current Information Architecture](#current-information-architecture)
2. [Content Overlap Analysis](#content-overlap-analysis)
3. [Socratic Analysis](#socratic-analysis)
4. [API Key Placement Discussion](#api-key-placement-discussion)
5. [Architectural Decisions](#architectural-decisions)
6. [Auditor Review and Execution Plan](#auditor-review-and-execution-plan)
7. [Proposed Docs Page Refinement](#proposed-docs-page-refinement)
8. [Exact Copy: Consolidated Docs Page HTML](#exact-copy-consolidated-docs-page-html)
9. [Exact Copy: API Keys Page (store.js)](#exact-copy-api-keys-page-storejs)
10. [Proposed API Keys Page Refinement](#proposed-api-keys-page-refinement)

---

## Current Information Architecture

### Surface Inventory

| Surface | URL / Route | Type | Description |
|---|---|---|---|
| In-app MCP hub | `/?view=mcp` | SPA view (store.js `renderMcpPage`) | Marketing + quickstart page inside the app shell |
| Docs page | `/docs/index.html` | Standalone HTML | Reference hub with TOC sidebar, two-column layout |
| Claude Code guide | `/mcp/claude-code/index.html` | Standalone HTML | Claude Code-specific MCP setup, examples, troubleshooting |
| Cursor guide | `/mcp/cursor/index.html` | Standalone HTML | Cursor-specific MCP setup, examples, troubleshooting |
| Codex guide | `/mcp/codex/index.html` | Standalone HTML | Codex-specific MCP setup, examples, troubleshooting |
| MCP redirect | `/mcp/index.html` | Redirect HTML | `meta refresh` + JS redirect to `/?view=mcp` |
| API Keys page | `/?view=api-keys` | SPA view (store.js `renderApiKeysPage`) | Key management: generate, revoke, delete, label |
| Dashboard | `/?view=dashboard` | SPA view (store.js `renderDashboard`) | Purchase history table |
| Account modal | popup (index.html `#accountModal`) | Modal overlay | Profile name, email (readonly), password reset |

### Account Dropdown Menu (Current)

From `index.html` lines 215-242, the avatar dropdown contains:

```
Account              -> opens Account modal (popup)
My Purchases         -> switches to /?view=dashboard
API Keys             -> switches to /?view=api-keys
Manage Subscription  -> Stripe customer portal (hidden until Pro)
Sign out
```

### Sidebar Navigation (Current)

The left sidebar (`index.html` lines 251-312) does NOT contain links to Docs, MCP, API Keys, or Dashboard. These are accessed through:
- Footer links: MCP (`/?view=mcp`), Docs (`/docs/index.html`)
- Avatar dropdown: My Purchases, API Keys
- Landing page: "Open setup guides and MCP docs" link

### Footer Links (Current)

From `index.html` lines 384-398:
```
Curly Mole Labs | GitHub | Pricing | Privacy | Terms | MCP | Docs | Contact
```

---

## Content Overlap Analysis

### In-app MCP Hub Content (store.js lines 4093-4349)

The `renderMcpPage()` function generates the following sections:

1. **Hero section**
   - Eyebrow: "MCP Integration"
   - Title: "Give your coding agent 20,000+ icons"
   - Copy explaining free vs premium MCP access
   - CTA buttons: "Install the MCP server" (anchor to #mcpInstall), "Open docs and guides" (link to /docs/)

2. **Setup section** (id: mcpInstall)
   - Title: "Set up Supericons MCP"
   - Base config JSON block with copy button
   - Two mini-cards: "Free setup" (3 steps) and "Premium setup" (3 steps)
   - Premium config JSON block with env/API key example and copy button
   - Summary copy: "Today MCP supports icon search, icon retrieval, library discovery, Motion Lab preset exports, and Converter workflows for Pro users."

3. **Current MCP tools section**
   - Title: "Current MCP tools"
   - 10 mini-cards:
     - `search_icons`, `get_icon`, `list_libraries`
     - `list_motion_presets`, `export_motion_css`, `export_animated_svg`
     - `convert_svg_to_png`, `convert_png_to_svg`
     - "Access-aware entitlements" (meta)
     - "Workflow-tool gating" (meta)

4. **Docs, guides, and tutorials section** (id: mcpGuides)
   - Links to /docs/ hub anchors (quickstart, premium, recipes, troubleshooting)
   - Pill badges for 7 MCP clients
   - 7 client guide cards (3 Supericons guides + 4 external doc links)

5. **Pro Workflow Access section**
   - 4 mini-cards: Motion Lab MCP, Converter MCP, "Why this matters", "Current status"

6. **Example prompts section**
   - 4 mini-cards: UI build, Brand logos, Premium assets, Available tools

### Docs Page Content (/docs/index.html, 290 lines)

The standalone HTML page contains:

1. **Navigation bar**
   - Brand link, links to: MCP hub, Claude Code, Codex, Cursor

2. **Hero section**
   - Eyebrow: "Docs"
   - Title: "Set up Supericons the systematic way"
   - Copy referencing MCP, premium entitlement, live MCP tools, Motion Lab and Converter
   - CTA buttons: "Quickstart" (anchor), "Open MCP hub" (link to /?view=mcp)
   - Pill badges: "20,000+ free icons", "Current MCP tools", "Premium pack access", "Motion Lab MCP live for Pro", "Converter MCP live for Pro"

3. **Quickstart section** (id: docs-quickstart)
   - Paragraph + base config JSON with copy button
   - Two cards: "Free path" (3 steps), "Premium path" (3 steps)

4. **Premium MCP setup section**
   - Copy explaining key vs entitlement relationship
   - Premium config JSON with copy button
   - Note about JSON-style client compatibility

5. **Current MCP tools section**
   - 4 cards: `search_icons`, `get_icon`, `list_libraries`, "Entitlements" (meta)

6. **Client guides section** (id: docs-guides)
   - 4 cards: Claude Code, Codex, Cursor, "Other MCP clients"

7. **Using Supericons today section** (id: docs-workflows)
   - 4 cards: Icon search and export, Premium animated collections, Motion Lab, Converter
   - (This section covers BROWSER features, not MCP)

8. **Workflow Tools Through MCP section**
   - Copy about Motion Lab MCP and Converter MCP being live for Pro
   - 2 cards: Motion Lab MCP (4 capabilities), Converter MCP (4 capabilities)

9. **Recipes and prompts section** (id: docs-recipes)
   - 4 cards: UI build, Brand logos, Premium pack work, Tool discovery

10. **Troubleshooting section** (id: docs-troubleshooting)
    - 4 cards: Server installed but no tools, Premium icons missing, Invalid/revoked key, Need exact client syntax

11. **Right sidebar**
    - "On this page" TOC: Quickstart, Premium setup, Client guides, Current workflows, Recipes, Troubleshooting
    - "Current truth" callout box
    - "Useful links": In-app MCP hub, Pricing, API Keys, Back to app

### Overlap Matrix

| Content Block | In-app MCP hub | Docs page | Status |
|---|---|---|---|
| Base MCP config JSON | Yes (line 4121-4128) | Yes (line 54-61) | **DUPLICATE** |
| Premium config JSON with env | Yes (line 4151-4161) | Yes (line 88-98) | **DUPLICATE** |
| Free setup steps (3 bullets) | Yes (line 4132-4137) | Yes (line 65-70) | **DUPLICATE** |
| Premium setup steps (3 bullets) | Yes (line 4139-4145) | Yes (line 72-79) | **DUPLICATE** |
| Key vs entitlement explanation | Yes (line 4118) | Yes (line 85) | **DUPLICATE** (slightly different wording) |
| `search_icons` tool card | Yes | Yes | **DUPLICATE** |
| `get_icon` tool card | Yes | Yes | **DUPLICATE** |
| `list_libraries` tool card | Yes | Yes | **DUPLICATE** |
| `list_motion_presets` tool card | Yes | No | **MCP-only** |
| `export_motion_css` tool card | Yes | No | **MCP-only** |
| `export_animated_svg` tool card | Yes | No | **MCP-only** |
| `convert_svg_to_png` tool card | Yes | No | **MCP-only** |
| `convert_png_to_svg` tool card | Yes | No | **MCP-only** |
| Entitlements / access meta card | Yes | Yes | **DUPLICATE** |
| Workflow gating meta card | Yes | No | **MCP-only** |
| Client guide links (Claude, Codex, Cursor) | Yes | Yes | **DUPLICATE** |
| External client links (OpenCode, Cline, Copilot, Windsurf) | Yes | No | **MCP-only** |
| MCP client pill badges (7 editors) | Yes | No | **MCP-only** |
| Example prompts / recipes | Yes (4 cards) | Yes (4 cards) | **DUPLICATE** (slightly different format) |
| "Using Supericons today" (browser features) | No | Yes | **Docs-only** |
| Troubleshooting (4 cards) | No | Yes | **Docs-only** |
| Sidebar TOC | No | Yes | **Docs-only** |
| "Current truth" callout | No | Yes | **Docs-only** |
| Pro Workflow Access section | Yes (4 cards) | Yes (2 cards) | **PARTIAL** (MCP has "Why this matters" + "Current status") |
| Hero CTA linking to other page | Yes (links to /docs/) | Yes (links to /?view=mcp) | **Circular cross-linking** |

### Key Findings

1. **~80% content overlap** between the two pages.
2. **Circular cross-linking**: MCP hub links to Docs, Docs links to MCP hub. This creates user confusion about which is canonical.
3. **MCP hub has more tool detail** (8 tools vs 3 on Docs) but Docs has more ancillary content (troubleshooting, browser features, TOC).
4. **Neither page is complete on its own**, forcing users to bounce between them.

---

## Socratic Analysis

### Q1: What is the primary job of each page?

- **In-app MCP hub** (`/?view=mcp`): Convert a visitor who just heard about Supericons MCP into a configured user. It acts as both a **marketing page** and a **quick-start page**.
- **Docs page** (`/docs/`): Be the **reference hub** for setup, troubleshooting, recipes, and workflow tooling.
- **Problem**: Both pages attempt to serve both functions, so neither does either job well. The MCP hub duplicates docs content for completeness; the docs page duplicates MCP content for completeness.

### Q2: Who is the user, and where do they arrive?

Two primary user journeys:

1. **Discovery user** (landed from search, tweet, or recommendation):
   - Arrives at `supericons.dev`
   - Sees landing page MCP section (lines 118-158)
   - Clicks "Open setup guides and MCP docs"
   - Currently lands at `/docs/index.html` (the landing page already links to docs, not to `/?view=mcp`)
   - Needs: one clear, authoritative, shareable page

2. **Returning user** (signed in, wants to configure or troubleshoot):
   - Clicks MCP in footer, or navigates to docs
   - Needs: quick reference for config, tool list, troubleshooting

**Insight**: Having two competing pages with overlapping content dilutes trust. A developer who finds both `/docs/` and `/?view=mcp` with similar-but-not-identical content will wonder which is canonical and which is stale.

### Q3: Which surface has more growth potential?

| Criteria | In-app MCP hub (`/?view=mcp`) | Docs page (`/docs/`) |
|---|---|---|
| Layout | Locked in SPA grid area, single render function | Standalone HTML, two-column with TOC sidebar |
| Extensibility | Requires adding to 250+ line render function | Can grow into multi-page docs site naturally |
| SEO | Query parameter URL, harder to index | Clean canonical URL, indexable |
| Shareability | `supericons.dev/?view=mcp` (ugly) | `supericons.dev/docs/` (clean) |
| Navigation | No TOC, single scroll | Has sidebar TOC for jump navigation |
| Multi-page potential | Would need to build routing system | Can add `/docs/changelog/`, `/docs/guides/`, etc. |

**Docs page wins on every extensibility axis.**

### Q4: What future content might we need?

- API key management guide (how keys work, rotation best practices, limits)
- Changelog / release notes
- Animation CSS usage guide (how to use exported Motion Lab CSS)
- Converter input format guide and limitations
- Billing FAQ
- Rate limits and usage policies
- Contributing / feedback guide

All of these fit naturally as docs content, not as in-app marketing views.

### Q5: What is the cost and risk of removing each?

| Action | SEO Impact | UX Impact | Engineering Cost |
|---|---|---|---|
| Remove Docs page | Lose `/docs/` canonical URL and Google indexing | Lose TOC, lose standalone reference feel | Low |
| Remove In-app MCP hub | None (SPA view, not independently indexed) | Lose in-app discoverability (mitigated by linking to /docs/) | Low |

**Lower risk to remove the MCP hub**, since all its unique content can be merged into docs, and in-app links can simply point to `/docs/`.

### Q6: What about the landing page MCP section?

The landing page MCP section (index.html lines 118-158) already links to `/docs/index.html`, not to `/?view=mcp`:

```html
<a href="/docs/index.html" class="landing-mcp__docs-link" id="landingMcpDocsLink">
  Open setup guides and MCP docs
</a>
```

No change needed. The landing page already prefers the docs page.

### Q7: What about the circular cross-linking problem?

Currently:
- MCP hub hero: "Open docs and guides" -> links to `/docs/`
- Docs hero: "Open MCP hub" -> links to `/?view=mcp`
- Docs sidebar: "In-app MCP hub" -> links to `/?view=mcp`

This creates a ping-pong navigation pattern. Consolidation eliminates it entirely.

---

## API Key Placement Discussion

### Should API Keys live under "My Purchases"?

**The mental model test**: If a developer opens the dropdown menu looking for their API key, which label do they click?

| User mental model | "My Purchases" maps to... | "API Keys" maps to... |
|---|---|---|
| Developer | "Things I bought" | "How I connect to the service" |
| Non-developer Pro user | "My collections" | Would not look for this |

**The mismatch is clear.** API keys are about *access and authentication*, not *commerce*. Placing them under purchases violates the principle of least surprise.

### Industry best practice

| Platform | Where API keys live | Under purchases? |
|---|---|---|
| OpenAI | Settings > API Keys | No |
| Stripe | Developers > API Keys | No |
| GitHub | Settings > Developer Settings > Tokens | No |
| Supabase | Project Settings > API | No |
| AWS | IAM > Security Credentials | No |

**Unanimous pattern**: API keys are never under purchases. They belong in a dedicated section.

### Current state (already correct)

The Supericons dropdown already has API Keys as a **separate menu item** (index.html line 230-233):

```html
<button class="auth-dropdown__item" id="authApiKeysBtn">
    <span class="material-symbols-outlined" style="font-size:16px">key</span>
    API Keys
</button>
```

**Verdict**: The current separation is correct. API Keys should remain a standalone menu item and a standalone in-app view.

### Maximum keys per Pro user

**Use cases for multiple keys**:
- Different IDE agents (Cursor key, Claude Code key, Windsurf key)
- Different machines (work laptop, personal laptop)
- Key rotation (create new, migrate, revoke old)

**Risks of too many keys**:
- Larger attack surface, each key is a potential leak vector
- Harder to audit "which key is being used where"
- Abuse potential: sharing/reselling keys

**Industry benchmarks**:

| Platform | Key limit |
|---|---|
| OpenAI | Unlimited |
| Stripe | Unlimited (scoped) |
| Smaller SaaS (Resend, Loops, etc.) | 2-5 |

**Recommendation: 5 keys per Pro user.** Covers 3 IDE agents + 1 spare + 1 for rotation. Low enough to discourage sharing, high enough that no legitimate user hits the wall. The current `API_KEY_LIMIT` constant in store.js already controls this.

---

## Architectural Decisions

| Decision | Resolution | Rationale |
|---|---|---|
| Which page survives? | **Docs page** (`/docs/index.html`) | Better SEO, extensibility, shareability, already has TOC |
| What happens to in-app MCP hub? | **Retire after docs absorbs all content**, then `/?view=mcp` becomes a compatibility redirect to `/docs/` | Eliminates duplication, circular links |
| Where do the 8 MCP tool cards go? | **Merged into docs page** | Docs currently only has 3; MCP hub has all 8 |
| Where do the 4 external client links go? | **Merged into docs page client guides section** | OpenCode, Cline, Copilot agent, Windsurf |
| Client sub-pages? | **Stay at `/mcp/*`** with nav links updated to point to `/docs/` | Preserves existing URLs and SEO |
| API Keys? | **Stays as separate in-app view** (`/?view=api-keys`) | Correct placement per best practice |
| Dashboard ("My Purchases")? | **Stays as purchase history only** | Clean separation of concerns |
| Future docs content? | **Grows naturally under `/docs/`** | Changelog, guides, FAQ, etc. |
| `/mcp/index.html` redirect target | **Update from `/?view=mcp` to `/docs/`** | Single redirect hop |
| Footer "MCP" link | **Change from `/?view=mcp` to `/docs/`** | Direct link, no redirect |
| Footer "Docs" link | **Kept as-is** (`/docs/index.html`) | Already correct |

### Client guide pages nav update

The three client guides (Claude Code, Codex, Cursor) currently have a nav bar with links to both "Docs" and "MCP hub." After consolidation:

- **Before**: `Docs | MCP hub | Claude Code | Codex | Cursor`
- **After**: `Docs | Claude Code | Codex | Cursor`

Docs becomes the single hub. "MCP hub" nav link is removed since it would just go to the same place.

---

## Auditor Review and Execution Plan

### Auditor Findings

The plan was reviewed and the auditor's conclusions are:

- **Core decision is correct**: `/docs/index.html` should become the single canonical MCP surface, and the in-app MCP hub should stop being a second content destination.
- **Strongest evidence already in the repo**: The landing page already sends users to `/docs/`, the docs page has the cleaner shareable URL and canonical tag, and the current docs/MCP hub are clearly cross-linking each other instead of acting as one source of truth.
- **Content gap acknowledged**: The docs page is NOT a literal superset of the MCP hub today. It is still missing the fuller tool inventory (8 tools vs 3), the external client links (OpenCode, Cline, Copilot, Windsurf), and some workflow-access framing. The plan correctly identifies these gaps.
- **Sequencing is critical**: The MCP hub must NOT be removed before docs fully absorbs those gaps. The correct ordering is: merge content first, then redirect, then remove.
- **API Keys separation is solid**: Keeping API Keys as a standalone in-app view, separate from purchases, matches the current IA and best practices.

### Tightening Recommendations

The auditor recommends the following refinements to the execution approach:

1. **Keep the "docs survives, MCP hub dies" decision exactly as written.**
2. **Update links first**: Footer MCP link in `index.html`, docs nav/sidebar in `public/docs/index.html`, and client-guide nav in `public/mcp/claude-code/index.html` and siblings.
3. **Treat `/?view=mcp` as a compatibility redirect, not just a deleted route.** Users who bookmarked or linked to `/?view=mcp` should land at `/docs/` seamlessly.
4. **Remove `.mcp-*` CSS only after**: (a) the `renderMcpPage()` view code is gone, and (b) a grep confirms nothing else depends on those classes.
5. **Do not remove the MCP view before docs fully absorbs the content gaps.**

### 3-Pass Rollout

The execution must follow this strict sequence. Each pass has a gate: do not start the next pass until the previous pass is verified.

#### Pass 1: Expand docs to subsume the MCP hub

**Goal**: Make `/docs/index.html` the complete, authoritative surface with zero content gaps relative to `renderMcpPage()`.

**Scope**:
- Merge the 5 MCP-only tool cards into the docs "Current MCP tools" section (`list_motion_presets`, `export_motion_css`, `export_animated_svg`, `convert_svg_to_png`, `convert_png_to_svg`)
- Merge the "Workflow-tool gating" meta card into docs
- Merge the 4 external client links into the docs "Client guides" section (OpenCode, Cline, Copilot agent, Windsurf)
- Merge the 7-client pill badge list into docs
- Merge the "Why this matters" and "Current status" cards into the docs "Workflow Tools Through MCP" section
- Adopt the MCP hub's list-style recipe format in the docs "Recipes" section
- Add the tool-availability summary line from the MCP hub into the docs "Premium MCP setup" section
- Update the docs hero: remove "Open MCP hub" CTA, replace with "API Keys" CTA
- Update the docs sidebar: remove "In-app MCP hub" link
- Update the docs nav bar: remove "MCP hub" link
- Update the docs "Current truth" callout to reflect 8 tools
- Update the docs TOC: add "MCP tools" and "Workflow tools" entries

**Gate**: After Pass 1, a side-by-side comparison of docs vs MCP hub should show that docs contains every piece of content that the MCP hub has. Nothing should be lost.

**Files touched**:
- `public/docs/index.html` (the primary edit)

#### Pass 2: Repoint every MCP-hub link to `/docs/`

**Goal**: All inbound paths that currently reach `/?view=mcp` should reach `/docs/` instead. `/?view=mcp` itself becomes a compatibility redirect.

**Scope**:
- `index.html` footer: Change `/?view=mcp` to `/docs/` (line 395)
- `public/mcp/index.html`: Change redirect target from `/?view=mcp` to `/docs/` (both `meta refresh` and JS redirect)
- `public/mcp/claude-code/index.html` nav: Change `/mcp/` to `/docs/` (line 21), sidebar (line 118)
- `public/mcp/cursor/index.html` nav: Change `/mcp/` to `/docs/` (line 21), sidebar (line 118)
- `public/mcp/codex/index.html` nav: Change `/mcp/` to `/docs/` (line 21), sidebar (line 121)
- `store.js`: In the `view === 'mcp'` case of `switchView()`, replace `renderMcpPage()` with a `window.location.href = '/docs/'` redirect (compatibility redirect for bookmarks and deep links)

**Gate**: After Pass 2, navigating to `/?view=mcp`, `/mcp/`, clicking the footer "MCP" link, and clicking client-guide nav links should all land the user at `/docs/`. No path should still render the in-app MCP hub.

**Files touched**:
- `index.html` (footer link)
- `public/mcp/index.html` (redirect target)
- `public/mcp/claude-code/index.html` (nav + sidebar links)
- `public/mcp/cursor/index.html` (nav + sidebar links)
- `public/mcp/codex/index.html` (nav + sidebar links)
- `store.js` (compatibility redirect in switchView)

#### Pass 3: Remove the in-app MCP render path and dead CSS

**Goal**: Clean up the now-unreachable code. The MCP hub view is never rendered; only the compatibility redirect remains.

**Scope**:
- `store.js`: Delete the `renderMcpPage()` function body (lines 4093-4349). Keep the compatibility redirect from Pass 2 in `switchView()` (the `view === 'mcp'` case now just does `window.location.href = '/docs/'`).
- `store.js`: Remove `document.getElementById('mcpView')?.remove()` cleanup line (line 729) since the view is never created.
- `style.css`: Grep for `.mcp-` class usage. If no other file references them, remove all `.mcp-*` CSS rules.

**Safety gate before CSS removal**: Run `grep -rn "mcp-" --include="*.html" --include="*.js" public/ index.html store.js` and confirm zero hits outside of `style.css` and the deleted `renderMcpPage()` function. Only then remove the CSS.

**Files touched**:
- `store.js` (delete renderMcpPage function body)
- `style.css` (remove dead .mcp-* classes after grep verification)

### Rollout Summary

```
Pass 1: Merge content into docs    -> Gate: docs is a superset of MCP hub
Pass 2: Redirect all MCP links     -> Gate: no path renders MCP hub
Pass 3: Remove dead code and CSS   -> Gate: grep confirms no .mcp-* deps
```

This "merge, redirect, remove" sequence ensures no content is lost at any point. If a pass needs to be paused or reverted, users still have access to all information through one surface or the other.

---

## Proposed Docs Page Refinement

Below is the proposed section-by-section content for the consolidated `/docs/index.html`. Each section shows the proposed title, copy, and card content. Items marked **(NEW)** are content migrated from the MCP hub or newly written. Items marked **(REVISED)** have updated copy. Items marked **(UNCHANGED)** carry over from the current docs page.

### Navigation Bar

**REVISED**: Remove "MCP hub" link since docs IS the hub now.

```
Brand: Supericons (link to /)
Links: Claude Code | Codex | Cursor
```

### Hero Section

**REVISED**: Merge the MCP hub marketing message into the docs hero to capture both audiences (setup-seekers and reference-seekers).

```
Eyebrow: Docs
Title: Supericons docs and MCP setup
Copy:
  The reference hub for Supericons MCP configuration, premium entitlement,
  current MCP tools, client-specific setup guides, and workflow recipes
  for Motion Lab and Converter.

CTA buttons:
  [Quickstart]  (anchor to #docs-quickstart)
  [API Keys]    (link to /?view=api-keys)

Pill badges:
  20,000+ free icons
  8 MCP tools live
  Premium pack access
  Motion Lab MCP for Pro
  Converter MCP for Pro
```

**Rationale**: The current hero has "Open MCP hub" as a secondary CTA, which creates circular navigation. Replaced with "API Keys" since that is the next logical action after reading setup docs. Pill badge updated from "Current MCP tools" to "8 MCP tools live" to be more specific and credible. Title simplified from "Set up Supericons the systematic way" to a cleaner, scannable label.

### Quickstart Section

**REVISED**: Minor copy tightening. Content is largely the same.

```
Section ID: docs-quickstart
Title: Quickstart
Copy:
  Start with the base MCP server config. Free icons work immediately.
  Premium icons require a Pro subscription or pack purchase, plus a
  Supericons API key.

[Base config JSON block with copy button - UNCHANGED]

Two cards:
  Card 1: "Free path"
    - Add the base MCP config to your client.
    - Restart or reload the MCP client.
    - Use search_icons or get_icon right away.

  Card 2: "Premium path"
    - Subscribe to Pro or buy the collection you need.
    - Open API Keys and generate an API key.
    - Add SUPERICONS_API_KEY in the env or secrets field your client supports.
```

**Rationale**: "pack" changed to "collection" for consistency with the rest of the UI. "Open Supericons API Keys" simplified to "Open API Keys." Otherwise functionally identical.

### Premium MCP Setup Section

**REVISED**: Merge the MCP hub's premium config explanation with the docs version. Add the tool-availability summary that currently only exists in the MCP hub.

```
Title: Premium MCP setup
Copy:
  The API key does not create entitlement by itself. It carries the
  access your account already has through Pro or purchased collections.

[Premium config JSON block with copy button - UNCHANGED]

Follow-up copy:
  This JSON example fits clients that support an env object in their
  MCP config. For client-specific syntax, use the guides below.

Summary copy (NEW, from MCP hub line 4163):
  Today MCP supports icon search, icon retrieval, library discovery,
  Motion Lab preset exports, and Converter workflows for Pro users.
```

**Rationale**: The summary line from the MCP hub gives a useful at-a-glance capabilities statement. Adding it here means users don't need to hunt for what's actually available.

### Current MCP Tools Section

**REVISED**: Expand from 4 cards to 10 cards by merging in the MCP hub's complete tool list. This is the biggest content gap between the two pages.

```
Title: Current MCP tools
Grid of 10 cards:

  Card 1: search_icons
    Search across the free libraries and any premium collections your
    account is entitled to use.

  Card 2: get_icon
    Retrieve a specific icon by ID and library with ready-to-use SVG output.

  Card 3: list_libraries
    List the libraries and premium collection sources your MCP session
    can currently access.

  Card 4 (NEW): list_motion_presets
    Browse the Motion Lab presets available through MCP before exporting
    animation CSS or animated SVG output. Pro only.

  Card 5 (NEW): export_motion_css
    Generate Motion Lab CSS for a chosen icon, preset, trigger, duration,
    and intensity without leaving your coding agent. Pro only.

  Card 6 (NEW): export_animated_svg
    Generate a self-contained animated SVG for the selected icon and
    preset as a single MCP response. Pro only.

  Card 7 (NEW): convert_svg_to_png
    Render SVG input to PNG with a controlled output width and optional
    background through the Pro converter workflow. Pro only.

  Card 8 (NEW): convert_png_to_svg
    Trace PNG input to SVG with the same converter-quality controls used
    by the browser workflow. Pro only.

  Card 9: Entitlements
    Free users get the free libraries. Pro subscribers and collection
    owners get access to the premium collections tied to their account
    when they connect an API key.

  Card 10 (NEW): Workflow-tool gating
    Motion Lab MCP and Converter MCP are Pro workflow tools. Collection
    ownership unlocks premium icon assets, but workflow tools stay Pro-only.
```

**Rationale**: The docs page currently only lists 3 tools + an entitlements card, while the MCP hub lists all 8 tools + 2 meta cards. A developer using this page as a reference needs the complete list. Adding "Pro only" labels to the workflow tools makes the access model scannable without reading a paragraph.

### Client Guides Section

**REVISED**: Expand from 4 cards to 7+ cards by merging in the MCP hub's external client links AND the 7-client pill badge list.

```
Section ID: docs-guides
Title: Client guides

Introductory copy (NEW, from MCP hub):
  The Supericons stdio server can be used with any MCP-capable client.
  The configuration concept is shared, but each client has its own setup
  UX and config surface.

Pill badge list (NEW, from MCP hub):
  Claude Code | Codex | Cursor | OpenCode | Cline | Copilot agent | Windsurf

Grid of 7 cards:

  Card 1: Claude Code (link to /mcp/claude-code/)
    Setup steps, premium access notes, examples, and troubleshooting.

  Card 2: Codex (link to /mcp/codex/)
    CLI and config.toml flow, plus premium guidance.

  Card 3: Cursor (link to /mcp/cursor/)
    JSON-style setup flow plus premium access notes.

  Card 4 (NEW): OpenCode (external link)
    Official OpenCode MCP docs for server config and CLI flow.

  Card 5 (NEW): Cline (external link)
    Official Cline docs for the Servers UI and cline_mcp_settings.json config.

  Card 6 (NEW): Copilot agent (external link)
    Official GitHub docs for repository MCP config and Copilot environment secrets.

  Card 7 (NEW): Windsurf (external link)
    Official Windsurf docs for settings UI and mcp_config.json setup.
```

**Rationale**: The current docs page only lists 3 Supericons guides plus a generic "Other MCP clients" card. The MCP hub has links to 4 more external docs. Merging them gives users a single place to find their client, regardless of whether Supericons has a dedicated guide for it.

### Using Supericons Today Section

**UNCHANGED**: This section covers browser features (not MCP) and is unique to the docs page. Keep as-is.

```
Section ID: docs-workflows
Title: Using Supericons today

4 cards:
  - Icon search and export (browser)
  - Premium animated collections (browser)
  - Motion Lab (browser)
  - Converter (browser)
```

**Rationale**: This content exists only on the docs page, not the MCP hub. It provides useful context about what Supericons does beyond MCP. No changes needed.

### Workflow Tools Through MCP Section

**REVISED**: Expand from 2 cards to 4 cards by merging in the MCP hub's "Why this matters" and "Current status" cards.

```
Title: Workflow Tools Through MCP

Copy:
  Motion Lab MCP and Converter MCP are live for Pro users. They extend
  the browser workflows into coding-agent-friendly tool calls while
  keeping the same entitlement boundary.

Grid of 4 cards:

  Card 1: Motion Lab MCP
    - Preset discovery
    - Trigger control
    - Motion CSS export
    - Standalone animated SVG export

  Card 2: Converter MCP
    - SVG to PNG conversion
    - PNG to SVG tracing
    - Input inspection and warnings
    - Suggested conversion settings

  Card 3 (NEW, from MCP hub): Why this matters
    Search-only MCP is useful, but workflow-tool access is the stronger
    Pro value proposition for design systems, prototyping, and
    coding-agent automation.

  Card 4 (NEW, from MCP hub): Current status
    Motion Lab MCP and Converter MCP are Pro-only workflow tools. Premium
    collection ownership still works for icon access, but workflow
    tooling requires Pro.
```

**Rationale**: The "Why this matters" and "Current status" cards from the MCP hub provide useful context about the Pro value proposition and the access model distinction. Adding them here rounds out the section.

### Recipes and Prompts Section

**REVISED**: Merge the MCP hub's list-style recipe cards with the docs page's paragraph-style cards. The list format from the MCP hub is more scannable.

```
Section ID: docs-recipes
Title: Recipes and prompts

Grid of 4 cards:

  Card 1: UI build
    - Find a tab icon for analytics.
    - Show the Lucide and Tabler options side by side.
    - Insert the chosen SVG into my React component.

  Card 2: Brand logos
    - Search Simple Icons for Stripe, Vercel, and Supabase.
    - Return the SVGs in monochrome.
    - Place them in a footer component.

  Card 3: Premium assets
    - Fetch icons from a premium collection tied to my Pro or pack access.
    - Drop them into a prototype component.
    - Keep access tied to my Supericons API key.

  Card 4: Tool discovery
    - search_icons: find the closest match.
    - get_icon: retrieve a specific SVG by ID.
    - list_libraries: list all available icon sources.
```

**Rationale**: The MCP hub uses a bullet-list format for recipes, which is more scannable than the paragraph format currently on the docs page. Adopting the list format across all 4 cards creates consistency.

### Troubleshooting Section

**UNCHANGED**: This section is unique to the docs page. Keep as-is.

```
Section ID: docs-troubleshooting
Title: Troubleshooting

4 cards:
  - Server installed but no tools appear
  - Premium icons do not appear
  - Invalid or revoked key
  - Need exact client syntax
```

### Right Sidebar

**REVISED**: Update TOC links and remove "In-app MCP hub" from useful links (since this IS the hub now). Add direct link to the current page sections.

```
Section 1: "On this page" (TOC)
  Quickstart
  Premium setup
  MCP tools
  Client guides
  Current workflows
  Workflow tools
  Recipes
  Troubleshooting

Section 2: "Current truth" (callout)
  Supericons MCP is live for icon search, icon retrieval, Motion Lab
  preset export, and Converter workflows. Motion Lab MCP and Converter
  MCP are Pro-only workflow tools. 8 MCP tools available today.

Section 3: "Useful links"
  Pricing (link to /?view=pricing)
  API Keys (link to /?view=api-keys)
  Back to app (link to /)
```

**Rationale**: Removed "In-app MCP hub" since it no longer exists. Updated "Current truth" callout to mention "8 MCP tools" to match the expanded tool list. Added "MCP tools" and "Workflow tools" to the TOC since those are now distinct sections.

### Footer

**UNCHANGED**:

```
Supericons docs. Truth-first setup guidance for free and premium MCP access.
```

---

## Exact Copy: Consolidated Docs Page HTML

This is the production-ready HTML for `/public/docs/index.html` after Pass 1. It is a complete, copy-pasteable replacement for the current file. All content from the MCP hub has been merged in. All circular links to `/?view=mcp` have been removed. The CSS class names (`docs-*`) and the `docs.css` stylesheet reference are unchanged.

Changes from current docs page are marked with `<!-- NEW -->` or `<!-- REVISED -->` inline comments. These comments are for review only and should be removed before shipping.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supericons Docs</title>
  <meta name="description" content="Supericons documentation: quickstart, MCP setup, premium access, client guides, current MCP tools, recipes, and workflow tools for Motion Lab and Converter.">
  <link rel="canonical" href="https://supericons.dev/docs/">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/mcp/docs.css">
</head>
<body>
  <div class="docs-shell">
    <!-- REVISED: removed "MCP hub" link -->
    <nav class="docs-nav" aria-label="Primary">
      <a class="docs-nav__brand" href="/">
        <img src="/favicon.svg" alt="">
        <span>Supericons</span>
      </a>
      <div class="docs-nav__links">
        <a class="docs-nav__link" href="/mcp/claude-code/">Claude Code</a>
        <a class="docs-nav__link" href="/mcp/codex/">Codex</a>
        <a class="docs-nav__link" href="/mcp/cursor/">Cursor</a>
      </div>
    </nav>

    <!-- REVISED: new title, new copy, replaced "Open MCP hub" CTA with "API Keys", updated pill badges -->
    <section class="docs-hero">
      <span class="docs-eyebrow">Docs</span>
      <h1>Supericons docs and MCP setup</h1>
      <p>
        The reference hub for Supericons MCP configuration, premium entitlement,
        current MCP tools, client-specific setup guides, and workflow recipes
        for Motion Lab and Converter.
      </p>
      <div class="docs-hero__actions">
        <a class="docs-btn docs-btn--primary" href="#docs-quickstart">Quickstart</a>
        <a class="docs-btn docs-btn--secondary" href="/?view=api-keys">API Keys</a>
      </div>
      <div class="docs-pill-list" style="margin-top: 18px;">
        <span class="docs-pill">20,000+ free icons</span>
        <span class="docs-pill">8 MCP tools live</span>
        <span class="docs-pill">Premium collection access</span>
        <span class="docs-pill">Motion Lab MCP for Pro</span>
        <span class="docs-pill">Converter MCP for Pro</span>
      </div>
    </section>

    <div class="docs-main">
      <div class="docs-column">

        <!-- REVISED: minor copy tightening ("pack" -> "collection") -->
        <section class="docs-section" id="docs-quickstart">
          <h2>Quickstart</h2>
          <p>Start with the base MCP server config. Free icons work immediately. Premium icons require a Pro subscription or collection purchase, plus a Supericons API key.</p>
          <div class="docs-code">
            <button class="docs-copy" type="button" data-copy-target="docs-base-config">Copy</button>
            <pre><code id="docs-base-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
          </div>
          <div class="docs-grid" style="margin-top: 18px;">
            <article class="docs-card">
              <h3>Free path</h3>
              <ul>
                <li>Add the base MCP config to your client.</li>
                <li>Restart or reload your MCP client.</li>
                <li>Use <code>search_icons</code> or <code>get_icon</code> right away.</li>
              </ul>
            </article>
            <article class="docs-card" id="docs-premium">
              <h3>Premium path</h3>
              <ul>
                <li>Subscribe to Pro or buy the collection you need.</li>
                <li>Open <a href="/?view=api-keys">API Keys</a> and generate an API key.</li>
                <li>Add <code>SUPERICONS_API_KEY</code> in the env or secrets field your client supports.</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- REVISED: "packs" -> "collections", added tool-availability summary from MCP hub -->
        <section class="docs-section">
          <h2>Premium MCP setup</h2>
          <p>The API key does not create entitlement by itself. It carries the access your account already has through Pro or purchased collections.</p>
          <div class="docs-code">
            <button class="docs-copy" type="button" data-copy-target="docs-premium-config">Copy premium example</button>
            <pre><code id="docs-premium-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your_key_here"
      }
    }
  }
}</code></pre>
          </div>
          <p style="margin-top: 14px;">This JSON-style example fits clients that support an <code>env</code> object in their MCP config. Use the client-specific guide for the exact syntax your editor expects.</p>
          <!-- NEW: tool-availability summary from MCP hub -->
          <p style="margin-top: 14px;">Today MCP supports icon search, icon retrieval, library discovery, Motion Lab preset exports, and Converter workflows for Pro users.</p>
        </section>

        <!-- REVISED: expanded from 4 cards to 10 cards by merging all MCP hub tools -->
        <section class="docs-section" id="docs-tools">
          <h2>Current MCP tools</h2>
          <div class="docs-grid">
            <article class="docs-card">
              <h3><code>search_icons</code></h3>
              <p>Find the closest icon match across the free libraries and any premium collections your account is entitled to use.</p>
            </article>
            <article class="docs-card">
              <h3><code>get_icon</code></h3>
              <p>Retrieve a specific icon payload with ready-to-use SVG output that can be inserted directly into code.</p>
            </article>
            <article class="docs-card">
              <h3><code>list_libraries</code></h3>
              <p>List the libraries and premium collection sources your MCP session can currently access.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><code>list_motion_presets</code></h3>
              <p>Browse the Motion Lab presets available through MCP before exporting animation CSS or animated SVG output. Pro only.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><code>export_motion_css</code></h3>
              <p>Generate Motion Lab CSS for a chosen icon, preset, trigger, duration, and intensity without leaving your coding agent. Pro only.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><code>export_animated_svg</code></h3>
              <p>Generate a self-contained animated SVG for the selected icon and preset as a single MCP response. Pro only.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><code>convert_svg_to_png</code></h3>
              <p>Render SVG input to PNG with a controlled output width and optional background through the Pro converter workflow. Pro only.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><code>convert_png_to_svg</code></h3>
              <p>Trace PNG input to SVG with the same converter-quality controls used by the browser workflow. Pro only.</p>
            </article>
            <article class="docs-card">
              <h3>Entitlements</h3>
              <p>Free users get the free libraries. Pro subscribers and collection owners get access to the premium collections tied to their account when they connect an API key.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3>Workflow-tool gating</h3>
              <p>Motion Lab MCP and Converter MCP are Pro workflow tools. Collection ownership unlocks premium icon assets, but workflow tools stay Pro-only.</p>
            </article>
          </div>
        </section>

        <!-- REVISED: expanded from 4 cards to 7 cards, added intro copy + pill badges from MCP hub -->
        <section class="docs-section" id="docs-guides">
          <h2>Client guides</h2>
          <!-- NEW: intro copy from MCP hub -->
          <p>The Supericons stdio server can be used with any MCP-capable client. The configuration concept is shared, but each client has its own setup UX and config surface.</p>
          <!-- NEW: pill badge list from MCP hub -->
          <div class="docs-pill-list" style="margin-top: 14px; margin-bottom: 18px;">
            <span class="docs-pill">Claude Code</span>
            <span class="docs-pill">Codex</span>
            <span class="docs-pill">Cursor</span>
            <span class="docs-pill">OpenCode</span>
            <span class="docs-pill">Cline</span>
            <span class="docs-pill">Copilot agent</span>
            <span class="docs-pill">Windsurf</span>
          </div>
          <div class="docs-grid">
            <article class="docs-card">
              <h3><a href="/mcp/claude-code/">Claude Code</a></h3>
              <p>Supericons setup guide plus Anthropic's official MCP docs for CLI setup, Windows notes, and troubleshooting.</p>
            </article>
            <article class="docs-card">
              <h3><a href="/mcp/codex/">Codex</a></h3>
              <p>Supericons setup guide plus OpenAI's official MCP docs for CLI and <code>config.toml</code> setup.</p>
            </article>
            <article class="docs-card">
              <h3><a href="/mcp/cursor/">Cursor</a></h3>
              <p>Supericons setup guide plus Cursor's official MCP docs for JSON config and in-app MCP settings.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><a href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a></h3>
              <p>Official OpenCode MCP docs for server config and CLI flow.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><a href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a></h3>
              <p>Official Cline docs for the Servers UI and <code>cline_mcp_settings.json</code> config.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a></h3>
              <p>Official GitHub docs for repository MCP config and Copilot environment secrets.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3><a href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a></h3>
              <p>Official Windsurf docs for settings UI and <code>mcp_config.json</code> setup.</p>
            </article>
          </div>
        </section>

        <!-- UNCHANGED -->
        <section class="docs-section" id="docs-workflows">
          <h2>Using Supericons today</h2>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>Icon search and export</h3>
              <p>Use the main app to search free icons, customize color and size, and export SVG, PNG, or framework snippets directly.</p>
            </article>
            <article class="docs-card">
              <h3>Premium animated collections</h3>
              <p>Open a premium collection to preview animated icons, adjust export trigger and color, then export animated SVG or related code formats.</p>
            </article>
            <article class="docs-card">
              <h3>Motion Lab</h3>
              <p>Use Motion Lab in the browser today for preset-driven animation tuning, motion CSS export, and standalone animated SVG output.</p>
            </article>
            <article class="docs-card">
              <h3>Converter</h3>
              <p>Use Converter in the browser today for SVG to PNG rendering and PNG to SVG tracing, with copy and download controls for the final output.</p>
            </article>
          </div>
        </section>

        <!-- REVISED: expanded from 2 cards to 4 cards with MCP hub "Why this matters" + "Current status" -->
        <section class="docs-section" id="docs-workflow-tools">
          <h2>Workflow Tools Through MCP</h2>
          <p>Motion Lab MCP and Converter MCP are live for Pro users. They extend the browser workflows into coding-agent-friendly tool calls while keeping the same entitlement boundary.</p>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>Motion Lab MCP</h3>
              <ul>
                <li>Preset discovery</li>
                <li>Trigger control</li>
                <li>Motion CSS export</li>
                <li>Standalone animated SVG export</li>
              </ul>
            </article>
            <article class="docs-card">
              <h3>Converter MCP</h3>
              <ul>
                <li>SVG to PNG conversion</li>
                <li>PNG to SVG tracing</li>
                <li>Input inspection and warnings</li>
                <li>Suggested conversion settings</li>
              </ul>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3>Why this matters</h3>
              <p>Search-only MCP is useful, but workflow-tool access is the stronger Pro value proposition for design systems, prototyping, and coding-agent automation.</p>
            </article>
            <!-- NEW: merged from MCP hub -->
            <article class="docs-card">
              <h3>Current status</h3>
              <p>Motion Lab MCP and Converter MCP are Pro-only workflow tools. Collection ownership still works for icon access, but workflow tooling requires Pro.</p>
            </article>
          </div>
        </section>

        <!-- REVISED: adopted list format from MCP hub for consistency -->
        <section class="docs-section" id="docs-recipes">
          <h2>Recipes and prompts</h2>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>UI build</h3>
              <ul>
                <li>Find a tab icon for analytics.</li>
                <li>Show the Lucide and Tabler options side by side.</li>
                <li>Insert the chosen SVG into my React component.</li>
              </ul>
            </article>
            <article class="docs-card">
              <h3>Brand logos</h3>
              <ul>
                <li>Search Simple Icons for Stripe, Vercel, and Supabase.</li>
                <li>Return the SVGs in monochrome.</li>
                <li>Place them in a footer component.</li>
              </ul>
            </article>
            <article class="docs-card">
              <h3>Premium assets</h3>
              <ul>
                <li>Fetch icons from a premium collection tied to my Pro or collection access.</li>
                <li>Drop them into a prototype component.</li>
                <li>Keep access tied to my Supericons API key.</li>
              </ul>
            </article>
            <article class="docs-card">
              <h3>Available tools</h3>
              <ul>
                <li><code>search_icons</code>: find the closest match.</li>
                <li><code>get_icon</code>: retrieve a specific SVG by ID.</li>
                <li><code>list_libraries</code>: list all available icon sources.</li>
              </ul>
            </article>
          </div>
        </section>

        <!-- UNCHANGED -->
        <section class="docs-section" id="docs-troubleshooting">
          <h2>Troubleshooting</h2>
          <div class="docs-grid">
            <article class="docs-card">
              <h3>Server installed but no tools appear</h3>
              <p>Restart or reload the MCP client after changing config. Many setup failures are registry refresh issues.</p>
            </article>
            <article class="docs-card">
              <h3>Premium icons do not appear</h3>
              <p>Check that your account actually has Pro or purchased collection access, then regenerate or replace the API key in your MCP config.</p>
            </article>
            <article class="docs-card">
              <h3>Invalid or revoked key</h3>
              <p>Open API Keys, revoke the old key if needed, generate a new one, and update the MCP env or secrets field.</p>
            </article>
            <article class="docs-card">
              <h3>Need exact client syntax</h3>
              <p>Use the client guides above when your editor uses a different MCP config format than the JSON-style example on this page.</p>
            </article>
          </div>
        </section>
      </div>

      <!-- REVISED: updated TOC, removed "In-app MCP hub" link, updated "Current truth" -->
      <aside class="docs-column">
        <section class="docs-sidebar">
          <h3>On this page</h3>
          <div class="docs-link-list">
            <a href="#docs-quickstart">Quickstart</a>
            <a href="#docs-premium">Premium setup</a>
            <a href="#docs-tools">MCP tools</a>
            <a href="#docs-guides">Client guides</a>
            <a href="#docs-workflows">Current workflows</a>
            <a href="#docs-workflow-tools">Workflow tools</a>
            <a href="#docs-recipes">Recipes</a>
            <a href="#docs-troubleshooting">Troubleshooting</a>
          </div>
        </section>

        <section class="docs-callout">
          <h3>Current truth</h3>
          <p>Supericons MCP is live for icon search, icon retrieval, Motion Lab preset export, and Converter workflows. Motion Lab MCP and Converter MCP are Pro-only workflow tools. 8 MCP tools available today.</p>
        </section>

        <section class="docs-sidebar">
          <h3>Useful links</h3>
          <div class="docs-link-list">
            <a href="/?view=pricing">Pricing</a>
            <a href="/?view=api-keys">API Keys</a>
            <a href="/">Back to app</a>
          </div>
        </section>
      </aside>
    </div>

    <!-- UNCHANGED -->
    <footer class="docs-footer">
      <p>Supericons docs. Truth-first setup guidance for free and premium MCP access.</p>
    </footer>
  </div>

  <script>
    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.getAttribute('data-copy-target'));
        if (!target) return;
        await navigator.clipboard.writeText(target.textContent || '');
        const original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      });
    });
  </script>
</body>
</html>
```

---

## Exact Copy: API Keys Page (store.js)

This section contains the exact JavaScript string literals for the API Keys page in `store.js`. Each string is the production-ready replacement for the corresponding current value.

### Header Section (store.js `renderApiKeysPage`, lines 3474-3479)

**Current:**
```js
page.innerHTML = `
    <div class="dashboard-section">
      <h3 class="dashboard-section__title">Developer Access</h3>
      <p class="dashboard-section__copy">Use API keys to connect MCP clients and programmatic workflows to your Supericons account.</p>
      <p class="dashboard-section__copy dashboard-section__copy--muted">Free MCP works without a key. Keys carry the premium access your account already owns through Pro or purchased packs.</p>
    </div>
```

**Proposed:**
```js
page.innerHTML = `
    <div class="dashboard-section">
      <h3 class="dashboard-section__title">API Keys <span class="dashboard-section__subtitle">For MCP and programmatic access</span></h3>
      <p class="dashboard-section__copy">Connect your MCP client (Cursor, Claude Code, Codex, or any MCP-capable agent) to your Supericons account with an API key.</p>
      <p class="dashboard-section__copy dashboard-section__copy--muted">Free MCP works without a key. Keys unlock the premium collections and Pro workflow tools your account already has access to.</p>
      <p class="dashboard-section__copy dashboard-section__copy--muted"><a href="/docs/index.html#docs-quickstart">See the setup guide</a> for where to place your key in each client.</p>
    </div>
```

### Key Management Subtitle (store.js line 3482-3483)

**Current:**
```js
      <h3 class="dashboard-section__title">
        API Keys
        <span class="dashboard-section__subtitle">Up to ${API_KEY_LIMIT} active keys</span>
      </h3>
```

**Proposed (unchanged, kept for reference):**
```js
      <h3 class="dashboard-section__title">
        API Keys
        <span class="dashboard-section__subtitle">Up to ${API_KEY_LIMIT} active keys</span>
      </h3>
```

### Initial Label Guidance (store.js line 3487)

**Current:**
```js
      <p class="dashboard-section__copy dashboard-section__copy--muted dashboard-section__copy--compact" id="apiKeysLimitNote">Label keys by app or device so you can rotate them later.</p>
```

**Proposed:**
```js
      <p class="dashboard-section__copy dashboard-section__copy--muted dashboard-section__copy--compact" id="apiKeysLimitNote">Label each key by app or device so you can rotate them independently.</p>
```

### Not-Signed-In State (store.js line 3509)

**Current:**
```js
        <p class="dashboard-section__empty">Sign in to manage API keys and connect premium MCP access.</p>
```

**Proposed:**
```js
        <p class="dashboard-section__empty">Sign in to generate API keys and connect your MCP client to your Supericons account.</p>
```

### No-Entitlement State (store.js line 3699)

**Current:**
```js
        limitNoteEl.textContent = 'Free MCP works without a key. New keys become available once your account has Pro or at least one purchased premium pack.';
```

**Proposed:**
```js
        limitNoteEl.textContent = 'API keys require a Pro subscription or at least one purchased collection. Keys carry the access your account already has.';
```

### Default Label Guidance (store.js line 3705)

**Current:**
```js
        limitNoteEl.textContent = 'Label keys by app or device so you can rotate them later.';
```

**Proposed:**
```js
        limitNoteEl.textContent = 'Label each key by app or device so you can rotate them independently.';
```

---

## Proposed API Keys Page Refinement

The API Keys page (`/?view=api-keys`, store.js lines 3067-3144) has a top section with explanatory copy before the key management table. Below are proposed refinements to that copy.

### Current Copy (store.js lines 3079-3083)

```
Section title: "Developer Access"
Copy line 1: "Use API keys to connect MCP clients and programmatic workflows
              to your Supericons account."
Copy line 2: "Free MCP works without a key. Keys carry the premium access your
              account already owns through Pro or purchased packs."
```

### Issues with Current Copy

1. **"Developer Access" is vague.** It doesn't tell the user what they're looking at or what action to take. It reads like a section title in a feature comparison, not a page heading for a management surface.

2. **"programmatic workflows" is jargon.** The primary audience is developers using MCP clients (Cursor, Claude Code, etc.), not API integrators building custom REST clients. The copy should speak to that audience.

3. **"purchased packs" should be "purchased collections"** for consistency with the rest of the UI, which uses "collections" not "packs."

4. **No link to docs/setup guidance.** A user who lands here and doesn't know how to use the key has no path forward without leaving the page and finding docs on their own.

5. **The key limit note (line 3088)** currently says "Up to ${API_KEY_LIMIT} active keys" as a subtitle next to "API Keys." This is useful but could include a brief rationale (e.g., "Label each key by app or device for easy rotation").

6. **The "Loading key usage..." placeholder (line 3091)** becomes the usage counter after keys load. This is fine functionally but the copy should be more descriptive once loaded (e.g., "2 of 5 active keys used").

### Proposed Refined Copy

```
Section 1: Header

  Title: API Keys
  Subtitle: For MCP and programmatic access

  Copy line 1:
    Connect your MCP client (Cursor, Claude Code, Codex, or any
    MCP-capable agent) to your Supericons account with an API key.

  Copy line 2 (muted):
    Free MCP works without a key. Keys unlock the premium collections
    and Pro workflow tools your account already has access to.

  Copy line 3 (link):
    See the setup guide for where to place your key in each client.
    (link to /docs/index.html#docs-quickstart)


Section 2: Key Management

  Title: API Keys
  Subtitle: Up to 5 active keys

  Usage line (after load):
    "{active_count} of 5 active keys used"

  Guidance line (muted):
    Label each key by app or device so you can rotate them independently.

  [Tabs: Active | Revoked | All]
  [Key table]
  [Generate key input + button]
```

### Copy Change Summary

| Element | Current | Proposed | Reason |
|---|---|---|---|
| Section title | "Developer Access" | "API Keys" | Direct, matches dropdown label |
| Subtitle | (none) | "For MCP and programmatic access" | Explains purpose without vagueness |
| Primary copy | "Use API keys to connect MCP clients and programmatic workflows to your Supericons account." | "Connect your MCP client (Cursor, Claude Code, Codex, or any MCP-capable agent) to your Supericons account with an API key." | Names the actual tools users use, grounds the abstract concept |
| Secondary copy | "Free MCP works without a key. Keys carry the premium access your account already owns through Pro or purchased packs." | "Free MCP works without a key. Keys unlock the premium collections and Pro workflow tools your account already has access to." | "packs" -> "collections" for consistency; "carry" -> "unlock" for clearer verb; adds "Pro workflow tools" to mention Motion Lab/Converter MCP |
| Setup link | (none) | "See the setup guide for where to place your key in each client." | Provides a path forward for users who don't know what to do with the key |
| Key limit note | "Up to ${API_KEY_LIMIT} active keys" | "Up to 5 active keys" | Same, but with concrete number |
| Usage counter | "Loading key usage..." -> (count) | "Loading..." -> "{active_count} of 5 active keys used" | More descriptive loaded state |
| Label guidance | "Label keys by app or device so you can rotate them later." | "Label each key by app or device so you can rotate them independently." | "later" is vague; "independently" explains WHY labeling matters |

### Not-signed-in State

Current (line 3114):
```
"Sign in to manage API keys and connect premium MCP access."
```

Proposed:
```
"Sign in to generate API keys and connect your MCP client to your
Supericons account."
```

**Rationale**: "manage API keys" implies they already have keys. "generate" is the first action they'll take. "connect premium MCP access" is abstract; "connect your MCP client to your Supericons account" is concrete.

### No-entitlement State (free user, signed in, no Pro or packs)

Current (lines 3108-3112): Shows disabled generate button + "Browse Packs" and "See Pricing" buttons.

Proposed copy above the disabled input:
```
"API keys require a Pro subscription or at least one purchased collection.
Keys carry the access your account already has."
```

**Rationale**: The current UI shows disabled inputs but doesn't clearly explain WHY. This copy tells the user what to do (subscribe or buy) without being pushy.

---

## Reference: File-Level Change Map

This section provides a quick-reference for the implementation across all three passes. Each change is tagged with its pass number.

### Redirects

| From | To | Method | Pass |
|---|---|---|---|
| `/?view=mcp` | `/docs/` | Compatibility redirect in `switchView()` | Pass 2 |
| `/mcp/index.html` | `/docs/` | Update `meta refresh` + JS redirect target | Pass 2 |

### Link Updates

| File | Current | New | Pass |
|---|---|---|---|
| `public/docs/index.html` content | Missing MCP-only content | Full tool list, client links, workflow framing | Pass 1 |
| `public/docs/index.html` hero CTA | `/?view=mcp` (Open MCP hub) | `/?view=api-keys` (API Keys) | Pass 1 |
| `public/docs/index.html` nav bar | Includes "MCP hub" link | Remove "MCP hub" link | Pass 1 |
| `public/docs/index.html` sidebar link | `/?view=mcp` (In-app MCP hub) | Remove | Pass 1 |
| `index.html` footer (line 395) | `/?view=mcp` | `/docs/` | Pass 2 |
| `public/mcp/index.html` redirect | `/?view=mcp` | `/docs/` | Pass 2 |
| `public/mcp/claude-code/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `public/mcp/claude-code/index.html` sidebar (line 118) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `public/mcp/cursor/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `public/mcp/cursor/index.html` sidebar (line 118) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `public/mcp/codex/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `public/mcp/codex/index.html` sidebar (line 121) | `/mcp/` (MCP hub) | `/docs/` (Docs) | Pass 2 |
| `store.js` `switchView()` (lines 675-682) | `renderMcpPage()` | `window.location.href = '/docs/'` | Pass 2 |

### Code Removal

| File | What to Remove | Pass |
|---|---|---|
| `store.js` | `renderMcpPage()` function body (lines 4093-4349) | Pass 3 |
| `store.js` | MCP view cleanup in else block (line 729: `document.getElementById('mcpView')?.remove()`) | Pass 3 |
| `style.css` | `.mcp-*` CSS classes (only after grep confirms no remaining deps) | Pass 3 |

### Safety Gates

| Gate | Condition | When |
|---|---|---|
| Pass 1 gate | Side-by-side comparison: docs contains every content block from MCP hub | Before starting Pass 2 |
| Pass 2 gate | Manual test: every MCP-hub path (`/?view=mcp`, `/mcp/`, footer link, client-guide nav) lands at `/docs/` | Before starting Pass 3 |
| Pass 3 gate | `grep -rn "mcp-" --include="*.html" --include="*.js" public/ index.html store.js` returns zero hits outside `style.css` and the deleted function | Before removing CSS |

---

## Open Questions

1. **Should the footer "MCP" link be renamed or removed?** After consolidation, both "MCP" and "Docs" in the footer would point to `/docs/`. Options:
   - Remove "MCP" link, keep "Docs" (cleanest, avoids duplicate links)
   - Rename "MCP" to "MCP Setup" and keep alongside "Docs" (differentiates intent but adds clutter)
   - Keep just "Docs" since it covers everything (recommended)

2. **Should the sidebar get a "Docs" link?** Currently docs is only accessible from the footer, landing page, and indirectly through client guides. Adding a sidebar item under "Tools" would increase discoverability for returning users.

3. **Should `/docs/` become a multi-page site eventually?** The current single-page structure works for now, but if content grows (changelog, billing FAQ, etc.), a simple `/docs/changelog/`, `/docs/faq/` structure would be natural. This doesn't need to be decided now but informs whether to add a docs-level sidebar nav.
