# Docs and MCP Page Consolidation Plan

This document captures the full audit, Socratic analysis, architectural decisions, and proposed content refinements for consolidating the Supericons Docs page and in-app MCP hub into a single authoritative surface. It also covers copy refinements for the API Keys page.

---

## Table of Contents

1. [Current Information Architecture](#current-information-architecture)
2. [Content Overlap Analysis](#content-overlap-analysis)
3. [Socratic Analysis](#socratic-analysis)
4. [API Key Placement Discussion](#api-key-placement-discussion)
5. [Architectural Decisions](#architectural-decisions)
6. [Proposed Docs Page Refinement](#proposed-docs-page-refinement)
7. [Proposed API Keys Page Refinement](#proposed-api-keys-page-refinement)

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
| What happens to in-app MCP hub? | **Remove** `renderMcpPage()`, redirect `/?view=mcp` to `/docs/` | Eliminates duplication, circular links |
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

## Redirect and Link Updates (Reference)

When implementing the consolidation, the following redirects and link updates are needed:

### Redirects

| From | To | Method |
|---|---|---|
| `/?view=mcp` | `/docs/` | JS redirect in `switchView()` or direct route |
| `/mcp/index.html` | `/docs/` | Update `meta refresh` + JS redirect target |

### Link Updates

| File | Current | New |
|---|---|---|
| `index.html` footer (line 395) | `/?view=mcp` | `/docs/` |
| `public/mcp/claude-code/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/mcp/cursor/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/mcp/codex/index.html` nav (line 21) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/mcp/claude-code/index.html` sidebar (line 118) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/mcp/cursor/index.html` sidebar (line 118) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/mcp/codex/index.html` sidebar (line 121) | `/mcp/` (MCP hub) | `/docs/` (Docs) |
| `public/docs/index.html` hero CTA | `/?view=mcp` (Open MCP hub) | `/?view=api-keys` (API Keys) |
| `public/docs/index.html` sidebar link | `/?view=mcp` (In-app MCP hub) | Remove |

### Code Removal

| File | What to Remove |
|---|---|
| `store.js` | `renderMcpPage()` function (lines 4093-4349) |
| `store.js` | `view === 'mcp'` case in `switchView()` (lines 675-682) |
| `store.js` | MCP view cleanup in else block (line 729) |
| `style.css` | `.mcp-*` CSS classes (if not shared with other views) |

---

## Open Questions

1. **Should the footer "MCP" link be renamed to "Docs"?** Currently the footer has both "MCP" and "Docs" links. After consolidation, both would point to `/docs/`. Options:
   - Remove "MCP" link, keep "Docs"
   - Rename "MCP" to "MCP Docs" and keep it alongside "Docs" (but then "Docs" is redundant)
   - Keep just "Docs" since it covers everything

2. **Should the sidebar get a "Docs" link?** Currently docs is only accessible from footer, landing page, and avatar dropdown "API Keys" indirectly. Adding a sidebar item under "Tools" section would increase discoverability.

3. **Should `/docs/` become a multi-page site eventually?** The current single-page structure works for now, but if content grows (changelog, billing FAQ, etc.), a simple `/docs/changelog/`, `/docs/faq/` structure would be natural. This doesn't need to be decided now but informs whether to add a docs-level sidebar nav.
