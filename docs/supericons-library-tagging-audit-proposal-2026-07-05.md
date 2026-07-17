# Supericons Library Tagging Audit and Fix Proposal

Date: 2026-07-05

## Summary

The Supericons library tag menu is incomplete. The UI correctly reports `Tags (100)` because the active Supericons library contains 100 icons, but the visible category rows only account for 34 icons. The missing 66 icons are not missing from the icon catalog. They already have category metadata in `public/icon-index.json`; the web app is not using that metadata when building the tag menu.

This should be fixed before adding the `$1` icon payment rail, because icon-level selling will depend on clean icon metadata, category filtering, and predictable icon discovery.

## Verified Evidence

I reproduced the mismatch from the repo data:

- Supericons icons in `public/icon-index.json`: 100
- Icons categorized by the current web app taxonomy helper: 34
- Icons not categorized by the current web app taxonomy helper: 66
- Missing breakdown:
  - 38 of 50 `brand-logo` icons are not counted in the tag rows.
  - 28 of 50 `concept-icon` icons are not counted in the tag rows.

The current visible Supericons tag rows match the screenshot exactly:

| Category | Count |
| --- | ---: |
| AI & Automation | 21 |
| Navigation & Wayfinding | 1 |
| Status & Feedback | 4 |
| People & Accounts | 1 |
| Communication | 1 |
| Data & Analytics | 1 |
| Commerce & Finance | 2 |
| Devices & Hardware | 1 |
| Code & Development | 2 |
| Total visible category count | 34 |

The raw catalog is richer than the UI. In `public/icon-index.json`, all 100 Supericons records have these fields:

- `jobCategory`
- `aiCategory`
- `filterTags`
- `aiFilterTags`
- `secondaryCategories`

Source registry category coverage is also complete:

| Source | Records | Category coverage |
| --- | ---: | --- |
| `data/si-registry/source/libraries/supericons.json` | 50 | 50 AI-tool logo records categorized |
| `data/si-registry/source/libraries/supericons-concepts.json` | 50 | 50 Agentic Motion/concept records categorized |

## Root Cause

The web app builds the tag dropdown from `lib/icon-taxonomy-seed.js`, not directly from the `jobCategory` and `aiCategory` fields that already exist on each icon record.

The relevant control flow is:

- `main.js` loads `public/icon-index.json` and then calls `createIconTaxonomyMap(state.icons)`.
- `rebuildJobCategoryCounts()` scopes to the active library and increments a category count only when `getIconJobCategory(icon)` returns a category that exists in `JOB_CATEGORY_DEFINITIONS`.
- `renderUseCaseFilters()` shows the all-count as the scoped icon count, but only renders category rows with count greater than zero.

The problem is in the app-side taxonomy helper:

- `lib/icon-taxonomy-seed.js` defines only the broad generic job categories.
- It does not import the Supericons AI-logo category definitions.
- It does not define the Agentic Motion/concept categories.
- Its inference text only looks at `lib`, `id`, `name`, `style`, and `type`.
- It ignores explicit icon metadata such as `jobCategory`, `aiCategory`, `aiFilterTags`, `filterTags`, and `secondaryCategories`.

That is why some Supericons records are counted only when a regex happens to match their name, while many records with perfectly good metadata are treated as uncategorized.

There is also a source-drift smell:

- `mcp/runtime/icon-taxonomy-seed.js` is ahead of `lib/icon-taxonomy-seed.js` in some ways. It imports the 50 AI-tool logo taxonomy entries and checks explicit `jobCategory` or `aiCategory` when the category is known.
- `public/icon-taxonomy.json` already contains the 50 AI-tool logo taxonomy entries and AI-specific categories.
- The web app does not read `public/icon-taxonomy.json`, and the app-side `lib/icon-taxonomy-seed.js` is behind the runtime/public artifacts.

## Proposed Fix

### 1. Make the app taxonomy respect explicit icon metadata first

Update `lib/icon-taxonomy-seed.js` so `inferTaxonomyEntry(icon)` first checks:

1. `icon.jobCategory`
2. `icon.aiCategory`

If the value exists in the known category definitions, use it before regex inference.

Also include these fields in the fallback inference text:

- `icon.jobCategory`
- `icon.aiCategory`
- `icon.aiCategoryLabel`
- `icon.filterTags`
- `icon.aiFilterTags`
- `icon.semanticTags`
- `icon.secondaryCategories`

This makes the UI honor the catalog metadata already shipped in `public/icon-index.json`.

### 2. Add the missing Supericons category definitions to the app

Add the 11 AI-tool logo categories already present in `lib/supericons-ai-taxonomy.js` to `JOB_CATEGORY_DEFINITIONS`.

Add the 7 Agentic Motion/concept categories used by `data/si-registry/source/libraries/supericons-concepts.json`:

| ID | Label | Current count |
| --- | --- | ---: |
| `coding-agent-tools` | Coding Agent Tools | 5 |
| `agent-lifecycle-states` | Agent Lifecycle States | 10 |
| `agent-trust-safety` | Agent Trust and Safety | 6 |
| `agent-workflow-mcp` | Agent Workflow and MCP | 11 |
| `agentic-payments` | Agentic Payments | 5 |
| `frontier-compute` | Frontier Compute | 6 |
| `physical-automation` | Physical Automation | 7 |

The 11 AI-tool logo categories currently cover the 50 logo records:

| ID | Label | Current count |
| --- | --- | ---: |
| `ai-app-builders` | AI App Builders | 3 |
| `coding-agents-dev-environments` | Coding Agents & Dev Environments | 8 |
| `model-platforms-ai-labs` | Model Platforms & AI Labs | 7 |
| `ai-search-research-evaluation` | AI Search, Research & Evaluation | 2 |
| `generative-media-creative-ai` | Generative Media & Creative AI | 9 |
| `voice-audio-ai` | Voice & Audio AI | 2 |
| `agent-infrastructure-runtime` | Agent Infrastructure & Runtime | 8 |
| `mcp-tooling-protocols` | MCP, Tooling & Protocols | 3 |
| `general-agents-assistants` | General Agents & Assistants | 4 |
| `design-ui-intelligence` | Design & UI Intelligence | 3 |
| `agent-business-monetization` | Agent Business & Monetization | 1 |

Expected Supericons tag menu after the fix:

- All count remains `Tags (100)`.
- Category row counts sum to 100.
- The 50 AI-tool logos are grouped by their AI-tool categories instead of disappearing or being guessed into generic categories.
- The 50 Agentic Motion/concept icons are grouped by their concept categories.

### 3. Remove taxonomy drift between app, MCP, and public artifacts

Do not keep three hand-divergent taxonomy files.

Recommended structure:

- Keep shared category definitions in `lib/`.
- Make `lib/icon-taxonomy-seed.js` the source used by the web app.
- Generate or copy the MCP runtime taxonomy from the same source, or make its intentional differences explicit.
- Update `scripts/export-icon-taxonomy-seed.mjs` so `public/icon-taxonomy.json` and the Supabase seed migration are generated from the same definitions.

This prevents the current failure mode where public/runtime artifacts have newer Supericons category knowledge, but the browser UI does not.

### 4. Add a regression guard

Extend `scripts/verify-icon-grid-behavior.mjs` with checks against the real catalog:

- Load `public/icon-index.json`.
- Filter `lib === "si"`.
- Assert there are 100 Supericons icons.
- Assert every Supericons icon maps to a known category.
- Assert category counts for the Supericons scope sum to 100.
- Assert representative logo records map to their explicit AI categories:
  - `si:browserbase` -> `agent-infrastructure-runtime`
  - `si:lovable` -> `ai-app-builders`
  - `si:openai-codex-app` -> `coding-agents-dev-environments`
- Assert representative concept records map to their explicit concept categories:
  - `si:agent-commit` -> `coding-agent-tools`
  - `si:done-spark` -> `agent-lifecycle-states`
  - `si:x402-pay` -> `agentic-payments`

This is a cheap and targeted guard. If another pack is added later without complete tags, the verification should fail before deploy.

### 5. Decide the i18n rollout

The code falls back to the category object's English `label` when an i18n key is missing, so an initial English-only fix can work. However, because the filter menu is localized elsewhere, the clean release should add keys for the new category IDs under:

- `data/i18n/messages/*.json`
- `public/i18n/messages/*.json`
- `mcp/public/i18n/messages/*.json`

If time is tight, ship the taxonomy fix first with English fallbacks, then run a localization pass.

## Recommended Implementation Order

1. Add shared Supericons concept category definitions.
2. Update app taxonomy to include AI-logo and concept categories.
3. Update inference to prefer explicit `jobCategory` and `aiCategory`.
4. Add the Supericons coverage assertions to `verify:icon-grid-behavior`.
5. Run `npm run verify:icon-grid-behavior`.
6. Run `npm run build` to verify the browser bundle still builds.
7. Open the app locally and check the Supericons library dropdown:
   - `Tags (100)` remains correct.
   - Visible category rows sum to 100.
   - Logo records and Agentic Motion records land in sensible buckets.
8. Add i18n keys for the new categories, or document the temporary English fallback.

## Risk Assessment

Risk is moderate but contained.

The change affects the tag menu and category-based filtering across the app. The safest approach is to prefer explicit metadata only when the category ID is known. That keeps existing generic-library behavior intact while making the Supericons library use its own metadata.

The main regression risk is category menu length. Supericons would show more, narrower categories than the generic libraries. That is probably the right behavior for the first-party library, but it should be checked visually on desktop and mobile.

## Recommendation

Fix this before the `$1` icon payment work.

The payment rail will need reliable icon-level metadata for discovery, product presentation, receipt/entitlement labeling, and agent-facing purchase endpoints. The current state would make some sellable icons hard to browse by tag even though the catalog already knows their categories.
