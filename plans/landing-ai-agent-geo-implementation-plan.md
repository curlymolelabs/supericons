# Implementation Plan: Landing AI Agent Messaging + GEO Foundation

Date: 2026-04-06
Owner: Frontend + Content + Growth
Status: Draft - refined after audit

## Goal

Strengthen the landing page's AI-agent positioning and build a practical GEO foundation so SuperIcons is easier to discover, understand, and cite across both traditional search and AI-assisted search experiences.

This plan covers:

1. Landing-page messaging for AI coding agents
2. Tool badge updates
3. GEO foundation work

This plan does **not** include animated background visuals. Those are a bonus exploration only.

---

## Approved Decisions

### Landing MCP Section Title

Use:

`Works with any AI coding agent`

### Tool Badges

Use:

1. `Claude Code`
2. `Codex`
3. `Cursor`
4. `OpenCode`
5. `Cline`
6. `GitHub Copilot`
7. `Windsurf`
8. `Antigravity`

Notes:

1. normalized brand spelling to `Windsurf`
2. the badge order is intentional product positioning, not a market-share ranking
3. `GitHub Copilot` intentionally replaces the earlier generic `VS Code` badge because this row is naming agent products, not editor shells

### Visuals

Out of scope for the core implementation.

Optional bonus later:

1. Create a standalone mockup HTML file exploring a subtle AI-agent/MCP visual treatment
2. Review that mockup before deciding whether to integrate it into production

---

## Primary Audience

The primary audience for this GEO work is:

1. AI systems, RAG pipelines, agent lookup flows, and citation surfaces looking for clear MCP setup documentation
2. Human developers searching for compatibility, setup, or troubleshooting help

This matters because the content strategy should favor:

1. machine-parseable structure
2. concise, explicit setup guidance
3. pages that remain useful when quoted or summarized out of context
4. real setup intent over generic SEO padding

---

## Why This Matters

The current MCP section is directionally good, but it can be sharper in two ways:

1. `AI editor` is weaker and less specific than `AI coding agent`
2. The supported-tool list should better reflect the tools people actually associate with agentic coding workflows

At the discoverability layer, there is also room to improve:

1. SuperIcons already has `robots.txt` and a basic `sitemap.xml`
2. The site does **not** yet have dedicated, crawlable MCP setup content for major agent tools
3. The homepage alone is too thin to carry all relevant agent-intent queries such as:
   - `supericons mcp`
   - `supericons claude code`
   - `supericons codex`
   - `supericons cursor mcp`
   - `icon mcp server for coding agents`

The GEO strategy should therefore focus on public, citation-worthy content, not non-standard meta tags or gated pages.

---

## GEO Principles

This plan treats GEO as:

1. Making public content easy for search engines and AI systems to crawl, parse, and trust
2. Treating AI systems and documentation-retrieval flows as first-class consumers of the content
3. Creating pages that directly answer tool-specific setup and usage intents
4. Structuring content so it is easy to quote, summarize, and cite
5. Measuring visibility in both traditional search and AI-assisted search reporting

This plan does **not** assume a magic GEO tag exists.

---

## Scope

### In Scope

1. Update landing MCP section title and badge row
2. Refine landing MCP subtitle copy if needed for clarity
3. Create a dedicated MCP landing page
4. Create standalone setup pages for the first 3 priority tools, plus hub sections for the remaining approved tools
5. Add FAQ and organization-level structured data where relevant
6. Expand sitemap coverage
7. Add monitoring and reporting setup for GEO-related performance
8. Optionally add `llms.txt` as a lightweight speculative addition, not as a dependency

### GEO Surface Boundary

This GEO plan applies to **public-facing pages only**.

That means:

1. pages intended for search discovery, citations, and sharing should be public and crawlable
2. gated, auth-only, entitlement-only, or purchase-only pages are **not** part of the GEO surface

Examples of pages that belong in GEO:

1. homepage
2. `/mcp/`
3. public tool-setup pages
4. public FAQs
5. public feature comparison pages

Examples of pages that do **not** belong in GEO:

1. dashboard pages
2. API key management pages
3. purchase-only install pages
4. premium collection pages behind auth
5. entitlement-specific setup or usage pages
6. account-specific download flows

### Out of Scope

1. Background animation or Matrix-style visual effects
2. Major homepage layout redesign
3. Billing, MCP auth, or backend protocol changes
4. Rewriting the whole docs system
5. Guaranteeing placement inside any AI answer surface
6. Using gated pages as GEO landing surfaces

### Public-Preview Principle

If a gated feature needs discoverability, the GEO pattern should be:

1. create a public overview or teaser page that explains the value clearly
2. keep account-specific, premium-only, or operational details behind auth

Example:

1. public page: `What Pro MCP unlocks`
2. private page: actual API key controls, entitlement state, premium-access management

This preserves product gating while still creating useful citation targets.

---

## Counterproposal and Constraints

### Recommendation

Keep the homepage MCP block concise and use dedicated docs pages for depth.

Reason:

1. The homepage should communicate compatibility and value quickly
2. Tool-specific setup content belongs on dedicated pages that can rank and be cited independently
3. This gives better GEO coverage than overloading the homepage with too much implementation detail
4. Public GEO pages should explain gated value without exposing private implementation surfaces

### Practical Constraint

Eight badges should fit because the current badge row already wraps, but QA must verify mobile wrapping and spacing.

If the row feels crowded:

1. Keep all eight badges
2. Let them wrap into two centered rows
3. Do **not** reduce the list unless product explicitly changes scope

---

## Proposed Copy

### Homepage MCP Section

Current title:

`Works with your AI editor`

New title:

`Works with any AI coding agent`

Proposed subtitle:

`Use Supericons through MCP to search and paste icons directly into your code. No browser needed.`

Badge row:

1. `Claude Code`
2. `Codex`
3. `Cursor`
4. `OpenCode`
5. `Cline`
6. `GitHub Copilot`
7. `Windsurf`
8. `Antigravity`

Install label:

Keep:

`Add to your MCP config:`

Reason:

It is already short, clear, and implementation-focused.

---

## Implementation Phases

## Phase 1: Homepage Messaging Refresh

### Files

1. `index.html`
2. `style.css`
3. `main.js` only if runtime hooks or section behavior need small adjustments

### Changes

1. Update the MCP section title to `Works with any AI coding agent`
2. Replace the current badge list with the approved eight-tool list
3. Update the subtitle to the approved MCP-focused phrasing
4. Verify the badge row wraps cleanly on tablet and mobile
5. Preserve the existing copy-to-clipboard behavior and MCP config block

### Acceptance Criteria

1. The title reads exactly `Works with any AI coding agent`
2. All eight badges appear in the approved order
3. The section remains readable on desktop and mobile
4. No existing MCP config or copy-button behavior breaks

---

## Phase 2: MCP Discoverability Page

### Goal

Create a dedicated crawlable page that clearly explains what SuperIcons MCP is, how it works, and why someone would use it with AI coding agents.

### Routing Prerequisite

Before creating nested MCP docs routes, verify the hosting setup can serve nested static HTML files directly.

If it cannot, adapt the route strategy while preserving unique crawlable URLs. Acceptable options include:

1. direct static files served from the build output
2. host rewrites that preserve direct-load docs URLs
3. an alternative static docs route pattern the host supports reliably

### Proposed Route

1. `/mcp/`

### Proposed Content Structure

1. H1: `SuperIcons MCP for AI Coding Agents`
2. Short value proposition
3. What the MCP server does
4. Supported-agent/tool matrix or section list
5. Installation section
6. Example config snippet
7. Example prompts / example workflows
8. FAQ section
9. Links to standalone tool pages and hub sections

### Why This Matters

This page becomes the canonical target for:

1. branded MCP queries
2. tool-installation queries
3. citations in AI-assisted answers

### Acceptance Criteria

1. The page is reachable from the homepage
2. The route works when loaded directly in the deployed environment, not just in local dev
3. The page is included in the sitemap
4. The page has unique title, description, and canonical tags
5. The page is useful even when read out of context by a search engine or LLM

---

## Phase 3: Tool-Specific Setup Pages

### Goal

Create standalone setup pages only where the setup friction or usage context is differentiated enough to justify a unique URL.

### Wave 1 Standalone Routes

1. `/mcp/claude-code/`
2. `/mcp/codex/`
3. `/mcp/cursor/`

### Wave 1 Hub Sections on `/mcp/`

1. `OpenCode`
2. `Cline`
3. `GitHub Copilot`
4. `Windsurf`
5. `Antigravity`

### Expansion Rule

Promote a hub section to its own standalone page only when at least one of these is true:

1. the tool has a distinct config file path or setup UI that merits real explanation
2. the tool needs meaningful troubleshooting notes that do not fit cleanly in the hub
3. the tool has a unique usage context, workflow examples, or prompts worth citing separately
4. there is enough original guidance to avoid thin-page risk

### Minimum Page Template

Each standalone page should include:

1. tool-specific H1
2. short intro sentence
3. exact MCP config example
4. quick install steps
5. what the tool can do with SuperIcons
6. troubleshooting note
7. link back to the main `/mcp/` page

### Important Rule

Do not create many standalone pages with near-identical filler copy.

Each standalone page should differ at least in:

1. title
2. intro
3. setup language
4. config context
5. troubleshooting notes

This reduces thin-content risk and increases citation usefulness.

### Maintenance Guardrail

If expansion grows beyond the first 3 standalone pages, use a small data/template generator rather than hand-maintaining many near-duplicate HTML files.

---

## Phase 4: Structured Data and On-Page GEO Signals

### Homepage

Add or refine:

1. `SoftwareApplication` or `WebApplication` structured data
2. `Organization` structured data with official links where applicable
3. FAQ structured data only if the same FAQ content is visibly rendered on-page

### MCP Page

Add:

1. `FAQPage` structured data for visible MCP FAQs
2. strong title and meta description aligned to MCP intent
3. internal links to the 3 standalone tool pages and the remaining hub sections

### Standalone Tool Pages

Add:

1. clear titles and canonicals
2. concise meta descriptions
3. structured headings matching actual user query language

### Query Language to Target Naturally

1. `AI coding agent`
2. `MCP server`
3. `icon MCP server`
4. `Claude Code MCP`
5. `Codex MCP`
6. `Cursor MCP`
7. `GitHub Copilot MCP`

Use these in natural headings and body copy, not as keyword stuffing.

---

## Phase 5: Crawlability and Site Assets

### Existing Assets

Already present:

1. `public/robots.txt`
2. `public/sitemap.xml`

### Required Updates

1. Expand `sitemap.xml` to include `/mcp/` and the wave-1 standalone tool pages
2. Ensure each page has the correct canonical URL
3. Ensure all new pages are linked internally from at least one crawlable page
4. Keep robots open for the public docs pages
5. Exclude gated/auth-only pages from the sitemap
6. Apply `noindex` to gated pages where applicable

### Gated Content Rule

Do not use gated pages as the primary destination for GEO or search intent.

Instead:

1. create a public summary page for the query intent
2. link from that public page into gated flows only where appropriate for signed-in or paying users

This avoids building search visibility on pages that are poor citation targets or inaccessible to crawlers and AI systems.

### Optional Addition

Add if helpful:

1. `public/llms.txt`

Suggested use:

1. short overview of SuperIcons
2. link list to homepage, MCP page, and the wave-1 standalone setup pages
3. concise statement of what the MCP server does

Important:

Treat `llms.txt` as a lightweight speculative addition. It is not a substitute for good crawlable pages, metadata, or internal linking.

---

## Phase 6: Measurement and Reporting

### Google

1. Verify indexing for homepage and MCP pages in Search Console
2. Monitor impressions, queries, and click-through trends for MCP/tool-intent pages

### Bing

1. Set up Bing Webmaster Tools if not already active
2. Monitor the AI Performance report for cited-page visibility
3. Use IndexNow if not already configured for faster URL discovery

### Internal Tracking

Track user behavior on MCP surfaces:

1. homepage MCP copy-button clicks
2. clicks from homepage to `/mcp/`
3. clicks from `/mcp/` to standalone tool pages or hub sections
4. copy events on setup snippets

This helps connect GEO work to actual product engagement.

---

## File and Asset Inventory

### Likely Files to Modify

1. `index.html`
2. `style.css`
3. `main.js` only if small landing-section behavior adjustments are needed
4. `public/sitemap.xml`
5. `public/robots.txt` only if needed
6. page templates or route logic that control `noindex`/meta handling for gated surfaces, if such logic already exists

### Likely New Files

1. `mcp/index.html` or equivalent static route
2. `mcp/claude-code/index.html`
3. `mcp/codex/index.html`
4. `mcp/cursor/index.html`
5. simple template/data files for MCP tool pages, only if expansion beyond wave 1 is approved
6. `public/llms.txt` optional

If the repo prefers a different static-page pattern, adapt the file paths while preserving the route intent.

---

## Verification Plan

### Content Verification

1. Homepage MCP title matches approved copy exactly
2. Badge list matches approved names and order exactly
3. Subtitle is concise and MCP-specific
4. Standalone tool pages and hub sections use correct tool names and not copy-paste placeholders

### Technical Verification

1. Build succeeds
2. Confirm the deployed host serves nested static docs URLs directly before relying on them
3. All new pages load directly by URL
4. Canonicals are correct
5. Sitemap contains homepage, `/mcp/`, and the wave-1 standalone routes
6. Structured data validates
7. No broken internal links

### UX Verification

1. Badge row wraps cleanly on mobile
2. MCP code block remains usable and copy button works
3. Homepage section remains visually balanced
4. New pages are readable and not overly dense

### GEO Verification

1. New pages are indexable
2. Bing Webmaster Tools and AI reporting are configured where possible
3. Search Console shows the pages being discovered
4. Internal links make the MCP content easy to crawl
5. Gated pages are excluded from sitemap coverage
6. Gated pages are not accidentally promoted as public GEO targets

---

## Risks

### Risk 1: Thin Standalone Tool Pages

If too many tool pages are created without enough differentiated guidance, they may be low-value for both users and search engines.

Mitigation:

1. start with 3 standalone pages only
2. keep the remaining tools as hub sections until differentiation is strong enough
3. promote a tool to a standalone page only when it clears the expansion rule

### Risk 2: Route Strategy Mismatch

If the deployed host does not serve nested static docs URLs the way the plan expects, the MCP route structure could fail even if local development looks correct.

Mitigation:

1. verify hosting behavior before building out the route tree
2. adapt the route strategy early rather than after content is written

### Risk 3: Homepage Bloat

If too much setup content is pushed into the homepage, the landing experience will become cluttered.

Mitigation:

1. keep homepage concise
2. move depth to `/mcp/` and standalone tool pages

### Risk 4: Maintenance Burden

If the repo grows many tool pages without a reusable structure, the content will become harder to keep accurate.

Mitigation:

1. stop at 3 standalone pages until there is clear justification to expand
2. use a small template/data-driven approach if expansion goes beyond wave 1

### Risk 5: Over-investing in Speculative GEO Tactics

If the team over-focuses on `llms.txt` or speculative GEO tricks, core discoverability work may be delayed.

Mitigation:

1. prioritize crawlable pages, structured content, and monitoring first
2. treat `llms.txt` as a lightweight speculative addition only

### Risk 6: Accidentally Weakening Product Gating

If GEO work starts exposing too much premium or account-specific detail on indexed pages, it can blur the product boundary and create maintenance risk.

Mitigation:

1. keep GEO pages public, high-level, and citation-friendly
2. move user-specific or entitlement-specific detail behind auth
3. use public summaries for discoverability, private surfaces for operations

---

## Recommended Delivery Order

1. Update homepage MCP title, subtitle, and badge row
2. Verify the hosting route strategy for nested public docs URLs
3. Add the dedicated `/mcp/` page with a tool matrix and hub sections
4. Add the first 3 high-priority standalone tool pages:
   - `Claude Code`
   - `Codex`
   - `Cursor`
5. Expand sitemap and metadata
6. If the hub sections prove differentiated enough, promote more tools to standalone pages
7. Configure reporting and GEO monitoring
8. Optionally add `llms.txt`
9. Optionally create a separate visual mockup HTML for future review

---

## Optional Bonus Mockup

Not part of the implementation scope.

If desired later, create:

1. `docs/mockups/landing-mcp-visual-exploration.html`

Purpose:

1. explore subtle AI-agent visual language
2. evaluate whether a more expressive MCP section should be brought into production

This mockup should remain isolated from production until explicitly approved.

---

## References

Current guidance informing this plan:

1. Google Search Essentials: https://developers.google.com/search/docs/essentials
2. Google people-first content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
3. Bing AI Performance reporting: https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
