# Supericons SEO, AEO, and GEO Implementation Plan

Date: 2026-06-10

Status: audit and implementation plan only. No app code was changed in this pass.

## Goal

Make Supericons easier for Google, answer engines, and AI agents to understand without destabilizing the live app.

The main issue is not the sitemap alone. The live site currently has some clean public URLs, but some of those URLs still return the generic app shell metadata before JavaScript runs. Search engines can then treat multiple pages as duplicates of the home page.

## Verified Current State

These points were checked directly in this pass.

- `public/sitemap.xml` currently lists 5 URLs:
  - `https://supericons.dev/`
  - `https://supericons.dev/mcp/`
  - `https://supericons.dev/mcp/claude-code/`
  - `https://supericons.dev/mcp/codex/`
  - `https://supericons.dev/mcp/cursor/`
- `public/robots.txt` allows crawling and points to `https://supericons.dev/sitemap.xml`.
- `netlify.toml` redirects `/mcp` to `/mcp/`, then falls back unmatched routes to `/index.html`.
- `npm run verify:view-route-policy` passed.
- Live fetch checks showed:
  - `https://supericons.dev/` returns status `200`, title `Supericons | Find the Right Icon Faster`, and main URL `https://supericons.dev/`.
  - `https://supericons.dev/mcp/` returns status `200`, title `Supericons MCP`, and main URL `https://supericons.dev/mcp/`.
  - `https://supericons.dev/mcp/codex/` returns status `200`, but the raw HTML title is still `Supericons | Find the Right Icon Faster` and the main URL is `https://supericons.dev/`.
  - `https://supericons.dev/?view=pricing`, `https://supericons.dev/?view=docs-codex`, and `https://supericons.dev/?locale=vi` also return the home page title and main URL in raw HTML.
  - `http://supericons.dev/` and `https://www.supericons.dev/` resolve to `https://supericons.dev/`.

## Search Console Interpretation

This section is based on the screenshots supplied by the owner, not direct Search Console API access.

- `Alternate page with proper canonical tag` is mostly old or query-style URLs such as `?view=docs-*`, `?view=pricing`, `?view=privacy`, and `?view=terms`.
- `Page with redirect` is mostly expected redirect cleanup for `http://`, `www`, and older route shapes.
- `Duplicate, Google chose different canonical than user` appears on `https://supericons.dev/mcp/codex/`, which matches the live check showing that this path still serves home-page metadata in raw HTML.
- `Crawled - currently not indexed` appears for at least one locale URL such as `?locale=vi`.

## Recommended Final URL Policy

Use three URL groups.

### Group 1: Public Indexable Pages

These pages should have unique raw HTML title, description, main URL, Open Graph tags, and structured data before JavaScript runs.

- `/`
- `/mcp/`
- `/mcp/claude-code/`
- `/mcp/codex/`
- `/mcp/cursor/`
- `/docs/`
- `/docs/mcp-search-guide/`
- `/docs/mcp-tools/`
- `/docs/mcp-icons/`
- `/docs/motion-lab/`
- `/docs/converter/`
- `/pricing/`
- `/privacy/`
- `/terms/`

This gives Google and AI crawlers clean pages for the product, MCP setup, main docs, pricing, and legal pages.

### Group 2: Accessible But Not Search Targets

These can remain accessible to users, but should not be promoted in the sitemap.

- Query URLs such as `/?view=...`
- Locale preview URLs such as `/?locale=vi`
- App state URLs
- Account, API key, checkout, or entitlement-related URLs
- Any admin, internal, or temporary page

Recommendation: keep these working for users, but move public links away from them. If a clean URL exists, use the clean URL in navigation, docs, sitemap, and share links.

### Group 3: Redirect Cleanup

These should continue to redirect or resolve consistently:

- `http://supericons.dev/` to `https://supericons.dev/`
- `https://www.supericons.dev/` to `https://supericons.dev/`
- `/mcp` to `/mcp/`

The Search Console redirect warning is not alarming if these redirects are intentional.

## Lowest-Risk Implementation Path

Avoid rebuilding the router from scratch. Instead, add a build-time metadata snapshot step.

1. Create a small public route metadata table.
   - Each public page gets:
     - path
     - title
     - description
     - main URL
     - Open Graph title and description
     - structured data type
     - sitemap priority
2. Generate static HTML files in `dist` after `vite build`.
   - Copy the built app shell.
   - Replace only metadata for each public route.
   - Emit files such as:
     - `dist/mcp/index.html`
     - `dist/mcp/codex/index.html`
     - `dist/docs/index.html`
     - `dist/pricing/index.html`
     - `dist/privacy/index.html`
     - `dist/terms/index.html`
   - The same JavaScript app still runs after load, so this should not change the user experience.
3. Update sitemap generation to use only Group 1 public URLs.
4. Update internal public links so they prefer clean paths over `?view=...`.
5. Keep legacy query URLs functional for old links.
6. Only after verifying Netlify behavior, consider query redirect rules for legacy `?view=` URLs. Do not add query redirects blindly.

## AEO Enhancements

AEO means answer engine optimization: making the site easy for AI answer systems to quote, summarize, and cite.

Add concise answer blocks to public docs pages:

- What is Supericons?
- What is Supericons MCP?
- How do I install Supericons in an IDE?
- How do I ask an agent to find an icon?
- What libraries are included?
- What does Motion Lab do?
- What does the converter do?

For each page, add:

- One short summary paragraph near the top.
- 3 to 6 short FAQ-style answers.
- Clean examples that do not expose private keys or internal workflows.
- Matching JSON-LD where appropriate, such as `FAQPage`, `HowTo`, `SoftwareApplication`, and `BreadcrumbList`.

## GEO Enhancements

GEO means generative engine optimization: making the product understandable to AI agents and LLM crawlers.

Recommended updates:

- Keep `public/llms.txt` short and accurate.
- Add a fuller public agent guide later, such as `/llms-full.txt`, if needed.
- Include agent-safe examples:
  - search for an icon by meaning
  - recommend icons for UI slots
  - retrieve an exact SVG
  - list supported icon libraries
- Ensure all public examples avoid secret keys, internal workflow notes, and private operational metadata.

## Validation Plan Before Netlify Upload

Run these checks before deploying:

1. `npm run verify:view-route-policy`
2. `npm run build`
3. Fetch local or deployed route HTML and confirm each indexable URL has a unique title and main URL:
   - `/`
   - `/mcp/`
   - `/mcp/codex/`
   - `/mcp/claude-code/`
   - `/mcp/cursor/`
   - `/docs/`
   - `/pricing/`
   - `/privacy/`
   - `/terms/`
4. Confirm `public/sitemap.xml` has only clean public URLs.
5. Confirm `robots.txt` still points to the sitemap.
6. Confirm the browser app still opens and navigates normally.
7. After deploy, use Google Search Console URL Inspection on:
   - `https://supericons.dev/`
   - `https://supericons.dev/mcp/`
   - `https://supericons.dev/mcp/codex/`
   - `https://supericons.dev/pricing/`

## Search Console Actions After Deploy

After the next deploy that includes metadata snapshots:

1. Submit the sitemap again.
2. Inspect the key URLs above.
3. Request indexing for the home page and MCP pages.
4. Start new validation for:
   - duplicate page issues
   - alternate page issues
   - redirect issues only if they are unexpected
5. Expect old `?view=` URLs to take time to disappear from reports.

## Recommended Next Step

Implement the build-time metadata snapshot step first.

This is the safest next change because it targets what search engines see before JavaScript runs, while leaving the main app behavior mostly intact. It should be done once, verified against live HTML, then deployed to Netlify.

