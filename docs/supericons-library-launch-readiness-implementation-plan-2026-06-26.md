# Supericons Library Launch Readiness Implementation Plan

Prepared: 2026-06-26

## Purpose

Prepare the new Supericons library for launch without creating a separate logo page or changing the existing product shape.

The Supericons logo library should work through the same shared icon browser, search box, Customize panel, export controls, MCP tools, and CLI/MCP package paths as the other icon libraries.

## Product Decision

The launch library of AI and developer tool logos should be free.

Revenue should come from relevant outbound app or site links in the existing icon preview panel, not from charging per logo. Logos should remain easy to search, preview, copy, and download. Paid strategy should remain focused on Pro workflows, premium animated collections, and future first-party non-logo Supericons assets.

## Current Architecture Understanding

The current app already treats Supericons as a shared library, not as a separate destination page.

Relevant architecture areas:

- `main.js` loads the public icon index and renders the shared browser.
- `main.js` includes `si` as the Supericons library in the shared sidebar metadata.
- The grid, detail panel, copy actions, and export actions are shared across libraries.
- `lib/icon-preview-commerce.js` provides the existing icon preview CTA mapping.
- `public/icon-index.json` is the web catalog source.
- `public/registry/records.json` is the public semantic registry source.
- `mcp/public/icon-index.json` and `mcp/public/registry-records.json` are the MCP public projections used by hosted and local development flows.
- `mcp/index.js` is the local stdio MCP server.
- `mcp/remote-server.js` is the hosted HTTP MCP server.
- `lib/hosted-search-core.js` builds hosted search catalog and registry rows.
- `scripts/sync-search-catalog-to-supabase.mjs` syncs the hosted search catalog to Supabase.

## Non-Goals

- Do not build a separate Supericons logos page.
- Do not create a separate AI tools logos UI.
- Do not paywall the launch logo icons.
- Do not add per-icon purchases for third-party logos.
- Do not change the existing copy/download/export interaction model.
- Do not expose private registry, generation, or review process metadata in public files.

## Launch Contract

Every Supericons logo in the launch pack should have a complete public search profile.

Required public icon index fields:

- `id`
- `name`
- `lib`
- `svg`
- `assetType`
- `pack`
- `sourceUrl`
- `meaning`
- `rights`
- `access`
- `semanticTags`
- `synonyms`
- `aliases`
- `searchTerms`
- `filterTags`
- `aiFilterTags`
- `secondaryCategories`

Required public registry fields:

- `icon_id`
- `source_library`
- `source_name`
- `label`
- `purpose`
- `category`
- `asset_type`
- `pack`
- `source_url`
- `source_trust`
- `meaning`
- `semantic_tags`
- `ai_category`
- `ai_category_label`
- `ai_filter_tags`
- `job_category`
- `secondary_categories`
- `synonyms`
- `aliases`
- `search_terms`
- `filter_tags`
- `use_when`
- `avoid_when`
- `rights`
- `variants`
- `quality_status`
- `access`

## User Experience Target

The launch should feel like this:

```text
Existing shared UI

Sidebar
  Supericons 50

Search
  "base44"
  "codex"
  "text to speech ai logo"

Grid
  Base44
  OpenAI Codex
  Cartesia
  Context7
  Browserbase

Customize panel
  Logo preview
  Name and Save
  Optional CTA: Build real apps
  Copy SVG
  Copy Base64
  Download SVG
  Download PNG
  Copy React / Vue / Svelte / HTML
```

MCP and agent experience should feel like this:

```js
list_libraries()
// includes { id: "si", name: "Supericons", count: 50 }

search_icons({ query: "base44 logo" })
// returns si:base44

search_icons({ query: "openai codex logo" })
// returns si:openai-codex-app

search_icons({ query: "text to speech ai logo" })
// returns si:cartesia

get_icon({ library: "si", id: "base44" })
// returns SVG and public semantic profile
```

## Implementation Phases

### Phase 1: Confirm The Public Data Contract

Audit the generated public files before changing runtime behavior.

Files to inspect:

- `public/icon-index.json`
- `mcp/public/icon-index.json`
- `public/registry/records.json`
- `mcp/public/registry-records.json`
- `data/si-registry/source/libraries/supericons.json`
- `data/si-registry/source/supericons-logo-profiles-v0.1.json`

Tasks:

- Confirm all 50 Supericons logo icons exist in the web icon index.
- Confirm all 50 Supericons logo records exist in the public registry.
- Confirm the MCP registry mirrors the public registry.
- Confirm every logo record has the required search fields.
- Confirm public records do not include internal process metadata.

Acceptance criteria:

- `si` count is 50 in web and MCP projections.
- Missing required public fields count is 0.
- All launch logos have `access: "free"`.
- All launch logos have clear rights language.

### Phase 2: Keep The Existing Web UI Path

Do not add a new page. Make the current shared UI the launch surface.

Files to inspect or adjust only if needed:

- `main.js`
- `lib/icon-preview-commerce.js`
- `lib/public-metadata-sanitizer.js`
- `public/icon-index.json`

Tasks:

- Confirm `si` is listed as `Supericons` in the shared library metadata.
- Confirm `si` appears in the shared sidebar.
- Confirm `getHostedSearchLibraryFilter()` passes `si` when users filter by Supericons.
- Confirm grid rendering does not special-case logos.
- Confirm the Customize panel displays Supericons logos the same way as other SVG icons.
- Confirm copy and download actions use the shared sanitized export path.

Acceptance criteria:

- Search for `base44` returns Base44.
- Search for `codex` returns OpenAI Codex.
- Library filter `Supericons` shows 50 icons.
- Copy SVG, Copy Base64, Download SVG, Download PNG, and component copy controls still work.

### Phase 3: Fix Hosted Search For Supericons

Hosted search is the launch-critical path because web search can use hosted results, hosted MCP depends on it, and the published stdio MCP package does not ship the bulk icon indexes.

Files to inspect or adjust:

- `lib/hosted-search-core.js`
- `scripts/sync-search-catalog-to-supabase.mjs`
- `supabase/functions/_shared/search-engine/handle-search-request.ts`
- `supabase/migrations/20260503_icon_catalog_public_payload.sql`
- `supabase/functions/mcp-search/index.ts`
- `supabase/functions/search-icons/index.ts`

Tasks:

- Confirm `buildHostedSearchCatalogRows()` includes Supericons metadata in `search_text`.
- Confirm `buildHostedSearchPublicRegistryRows()` includes public registry terms used for ranking.
- Run or prepare the Supabase catalog sync after the final local catalog is generated.
- Check whether the deployed hosted catalog contains the 50 `si` rows.
- Confirm live hosted search returns Supericons results.
- Resolve the public MCP gateway auth mismatch:
  - Preferred: deploy `mcp-search` with public gateway settings as intended.
  - Alternative: make the MCP hosted search client consistently send the required public key header.

Acceptance criteria:

- Live `mcp-search` returns `si:base44` for `base44 logo`.
- Live `mcp-search` returns `si:openai-codex-app` for `openai codex logo`.
- Live `mcp-search` returns `si:cartesia` for `text to speech ai logo`.
- Live `mcp-search` returns `si:context7` for `context7 mcp logo`.
- Search still returns normal non-Supericons results for broad queries like `database`.

### Phase 4: Wire Supericons Into MCP Discovery

Make Supericons visible to agents through `list_libraries`, tool descriptions, and library filters.

Files to inspect or adjust:

- `mcp/index.js`
- `mcp/remote-server.js`
- `mcp/server.json`
- `mcp/public/product-facts.json`
- `data/product-facts.json`

Tasks:

- Add `si` to local stdio MCP `libraryMeta`.
- Add `si` to hosted MCP `LIBRARIES`.
- Update MCP library descriptions to include `si`.
- Update `search_icons`, `recommend_icons`, and `get_icon` library parameter descriptions.
- Update product facts from 10 libraries to 11 libraries where generated copy depends on the current catalog.
- Confirm `list_libraries` includes Supericons with count 50.

Acceptance criteria:

- `list_libraries()` includes Supericons.
- `search_icons({ query: "base44 logo", library: "si" })` works.
- `get_icon({ library: "si", id: "base44" })` works.
- Agents no longer need to guess the `si` library key.

### Phase 5: Preserve Copy Protection And Public Safety

For free logos, protection should mean shared public-library safeguards, not a paywall.

Protection model:

- Keep logo SVGs copyable and downloadable.
- Keep export sanitization in the shared export path.
- Keep premium collection protection separate.
- Do not expose bulk registry files in the npm MCP package.
- Keep hosted search rate limits and audit logging.
- Keep public records clean and business-safe.

Files to inspect or adjust:

- `main.js`
- `lib/public-metadata-sanitizer.js`
- `mcp/package.json`
- `scripts/verify-motion-lab-mcp-package.mjs`
- `scripts/verify-public-safety.mjs`

Acceptance criteria:

- Supericons logos use the same export path as other free SVG icons.
- No private registry or process metadata is exposed in public payloads.
- The npm MCP package still excludes bulk registry and icon index files.
- Premium pack protections are unchanged.

### Phase 6: Expand Commerce CTA Safely

Use the existing icon preview CTA row for relevant logo icons. Do not add a new UI surface.

Files to inspect or adjust:

- `lib/icon-preview-commerce.js`
- `main.js`
- `scripts/verify-icon-preview-commerce.mjs`

Tasks:

- Keep the CTA inside the existing Customize panel.
- Use `rel="sponsored noopener noreferrer"` for sponsored or affiliate links.
- Separate official `sourceUrl` from monetized CTA URLs.
- Decide whether CTAs stay in a JS map or move to a small public-safe data file.
- Add profiles only for logos where the link is useful and brand-safe.

Acceptance criteria:

- Base44 CTA remains visible in the shared panel.
- Additional CTAs appear only on selected relevant logos.
- Official source URLs are allowed in icon profiles.
- Sponsored or tracked CTA URLs are not embedded in portable SVG assets.

### Phase 7: Update Docs And Product Copy

After runtime behavior is correct, update user-facing copy.

Files to inspect or adjust:

- `docs` source files for MCP setup and search guidance.
- Generated i18n docs payloads if the site uses generated localized docs.
- `mcp/public/product-facts.json`
- `data/product-facts.json`

Tasks:

- Change "10 libraries" to "11 libraries" where it refers to the current free catalog.
- Add Supericons examples to MCP search docs.
- Add example prompts for AI logo search:
  - `base44 logo`
  - `openai codex logo`
  - `text to speech ai logo`
  - `mcp server directory logo`
  - `browser automation agent logo`
- Keep the docs simple for public readers.

Acceptance criteria:

- Docs and MCP tool descriptions match the actual supported libraries.
- Users can understand that logos are free.
- Users can understand that Pro still applies to Motion Lab, Converter, and premium collections.

### Phase 8: Add Launch Verification

Add or extend verification scripts so this does not regress.

Existing useful scripts:

- `scripts/verify-supericons-logo-launch-search.mjs`
- `scripts/verify-search-catalog-sync.mjs`
- `scripts/verify-icon-preview-commerce.mjs`
- `scripts/verify-motion-lab-mcp-package.mjs`
- `scripts/verify-hosted-search-intent-live.mjs`

Required query fixtures:

- `base44`
- `base44 logo`
- `codex`
- `openai codex logo`
- `context7 mcp logo`
- `cartesia logo`
- `text to speech ai logo`
- `ai app builder logo`
- `browser automation agent logo`
- `mcp server directory logo`
- `vector database ai logo`
- `ai video generator logo`

Acceptance criteria:

- Local web/MCP search verification passes.
- Hosted search live verification passes after sync/deploy.
- MCP package verification passes.
- Commerce CTA verification passes.
- Public safety verification passes.

## Recommended Pull Request Order

1. MCP library discovery and product facts.
2. Hosted search sync and public gateway fix.
3. Commerce CTA cleanup.
4. Verification and launch checklist.
5. Public docs copy refresh.

This order keeps the launch focused. Users already have the UI. The work is to make the library reliably searchable, discoverable by agents, safe to export, and ready for revenue links inside the existing Customize panel.

## Launch Checklist

- [ ] 50 Supericons logos exist in the web icon index.
- [ ] 50 Supericons public registry records exist.
- [ ] MCP public registry mirrors the web public registry.
- [ ] Web search finds exact logo names.
- [ ] Web search finds category intent queries.
- [ ] Hosted search finds Supericons logo queries.
- [ ] Hosted MCP search finds Supericons logo queries.
- [ ] Local stdio MCP search finds Supericons logo queries after the hosted path is fixed.
- [ ] `list_libraries` includes `si`.
- [ ] `get_icon` supports `library: "si"`.
- [ ] Copy and download behavior matches other free SVG libraries.
- [ ] npm MCP package still excludes bulk catalog files.
- [ ] Base44 CTA remains in the shared Customize panel.
- [ ] Additional CTAs use the same shared CTA pattern.
- [ ] Product facts and docs reflect the current library count.
- [ ] No separate logo page is created.

