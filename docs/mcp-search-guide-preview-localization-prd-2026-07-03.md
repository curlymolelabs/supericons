# MCP Search Guide Preview Localization PRD

## Problem Statement

The MCP search guide now explains the `preview_icons` workflow in English, but the same new guidance has not been localized into the non-English docs catalogs.

Verified on July 3, 2026:

- `data/i18n/messages/en.json`, `public/i18n/messages/en.json`, and `mcp/public/i18n/messages/en.json` include the new preview guidance.
- The 11 non-English locale catalogs do not include the new `preview_icons` guidance in `docs.pages.docs-mcp-search-guide.bodyHtml`.
- `scripts/build-i18n-public-catalogs.mjs` copies `data/i18n/messages/*.json` to both public output locations, so `data/i18n/messages` should remain the source of truth.

This matters because users who browse docs in non-English locales will not see the most important new MCP behavior: how to ask agents to show visual icon previews before choosing an icon.

## Target User

Primary users:

- Developers using Supericons MCP through Claude Desktop, Codex, Cursor, or similar agents.
- Non-English users reading Supericons docs in `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `de`, `pt`, `ar`, `hi`, `vi`, or `th`.

User job:

- Understand when to use `preview_icons` instead of `search_icons`.
- Copy a prompt that asks the agent to visually preview icons before returning icon refs or SVGs.
- Keep technical identifiers intact while reading the surrounding explanation in their language.

## Goals

- Localize only the newly added MCP preview guidance for all supported non-English locales.
- Preserve all HTML structure, section IDs, links, code blocks, and tool names exactly.
- Keep product, library, and tool identifiers unchanged where they are meant to be copied or recognized by agents.
- Sync localized source catalogs to `public/i18n/messages` and `mcp/public/i18n/messages`.
- Add a targeted verification check so this specific regression is caught in the future.

## Non-Goals

- Do not retranslate every docs page.
- Do not rewrite the English source copy unless a blocking issue is found.
- Do not change MCP tool behavior, preview image rendering, or hosted search behavior.
- Do not alter unrelated locale keys outside `docs.pages.docs-mcp-search-guide`.
- Do not deploy to Netlify, Supabase, Railway, or npm as part of this localization plan.

## Functional Requirements

### Requirement 1: Translate The New Preview Tool Row

User job supported: Understand that visual preview is a first-class MCP workflow.

Scope:

- Translate the human-facing text in the new row:
  - `See icons before choosing`
  - `Show me a visual preview of icons for ai slop. If the chat cannot show the image, ask for the image link or browser preview link.`

Must preserve:

- `<code>preview_icons</code>`
- HTML table structure
- The example phrase `ai slop` may remain in English because it is a search query example, but each locale should use natural surrounding text.

Acceptance signal:

- Every non-English locale contains `preview_icons` in `docs-mcp-search-guide.bodyHtml`.
- No locale drops or renames the tool ID.

### Requirement 2: Translate The New Preview Prompt Card

User job supported: Learn practical prompt patterns for visual comparison.

Scope:

- Translate the new card title:
  - `Preview visually`
- Translate the three example prompts:
  - `Show me a visual preview of icons for ai slop.`
  - `Visually compare the top 3 icons for smart automation.`
  - `Preview icons for license plate recognition camera scan car.`

Must preserve:

- The meaning of visual comparison.
- The example query intent.
- HTML list structure.

Acceptance signal:

- Each locale has the same card and list structure as English.
- Text is localized, not copied from English except where an example query is intentionally kept.

### Requirement 3: Translate The New Output Prompt Line

User job supported: Ask the agent to show visuals before returning icon IDs.

Scope:

- Translate:
  - `Show me a visual preview first, then list the icon refs.`

Must preserve:

- Existing code block structure.
- The meaning of `icon refs`; this can be localized as "icon references" if the target language reads better, but must still imply copyable icon identifiers such as `lucide:bug-play`.

Acceptance signal:

- The prompt appears in every supported non-English locale.
- The code block remains valid plain text.

### Requirement 4: Keep Catalogs In Sync

User job supported: The same docs content appears in the web app and MCP package public assets.

Scope:

- Update source files in `data/i18n/messages/*.json`.
- Run `node scripts/build-i18n-public-catalogs.mjs`.
- Confirm the same localized page appears in:
  - `data/i18n/messages/*.json`
  - `public/i18n/messages/*.json`
  - `mcp/public/i18n/messages/*.json`

Acceptance signal:

- `build-i18n-public-catalogs: copied 12 locales`
- Targeted preview localization check passes across all three catalog directories.

### Requirement 5: Add A Targeted Regression Check

User job supported: Avoid repeating this English-only docs update gap.

Scope:

- Add or extend a verification script to assert that `docs-mcp-search-guide.bodyHtml` has `preview_icons` in all locales.
- For non-English locales, assert that the exact English headings `See icons before choosing` and `Preview visually` do not appear unless intentionally allowed by a locale-specific exception.

Acceptance signal:

- The check fails before localization and passes after localization.
- The check is small and focused enough to avoid blocking unrelated docs work.

## Constraints

- Supported locales are verified from local catalogs: `ar`, `de`, `es`, `hi`, `ja`, `ko`, `pt`, `th`, `vi`, `zh-Hans`, `zh-Hant`, plus `en`.
- `data/i18n/messages` is the source of truth for localized catalog edits.
- `public/i18n/messages` and `mcp/public/i18n/messages` should be generated from the source catalogs.
- Tool names such as `preview_icons`, `search_icons`, `recommend_icons`, `get_icon`, and `list_libraries` must not be translated.
- Code examples, URLs, route names, and icon refs must not be translated.
- Existing localized docs bodies may contain older quality issues; this plan should not broaden scope unless a touched segment becomes misleading.

## Implementation Plan

1. Inventory the exact English additions.
   - Extract the current English `docs-mcp-search-guide.bodyHtml`.
   - Identify only the added text nodes related to visual previews.

2. Choose the localization method.
   - Preferred: use the existing docs-body export/import workflow for `--view=docs-mcp-search-guide`.
   - For this small change, a targeted JSON patch is acceptable if it preserves the existing localized body and only inserts translated equivalents of the new segments.

3. Localize source catalogs.
   - Update `data/i18n/messages/<locale>.json` for all 11 non-English locales.
   - Keep HTML tags and code tags aligned with English.
   - Preserve product and tool identifiers exactly.

4. Sync public catalogs.
   - Run `node scripts/build-i18n-public-catalogs.mjs`.
   - Do not manually edit generated public copies unless the build script fails.

5. Add verification.
   - Add a targeted script or extend an existing i18n verifier to check the preview guidance across all three catalog directories.
   - Keep the check narrow so it tests this feature without trying to solve all docs-body localization debt.

6. Run verification.
   - `npm run verify:docs-site-render`
   - `npm run verify:i18n-catalogs`
   - `node scripts/build-i18n-public-catalogs.mjs`
   - Targeted preview localization verifier

7. Human spot-check.
   - Open the docs page locally in at least English, Spanish, Japanese, Arabic, and Chinese Simplified.
   - Confirm layout is not broken and code/tool names remain readable.

## Success Metrics

Primary metric:

- 100% of supported non-English locales include localized visual-preview guidance for `docs-mcp-search-guide`.

Supporting metrics:

- All three catalog locations are synchronized for the updated page.
- Existing i18n catalog verification passes.
- Docs render verification passes.

Guardrail metrics:

- No translated catalog changes outside `docs.pages.docs-mcp-search-guide` unless explicitly required.
- No tool IDs are translated.
- No HTML tag structure is changed.

## Risks And Dependencies

- Machine translation may translate tool IDs or example phrases incorrectly. Mitigation: protect tool IDs and verify them after import.
- Existing localized docs bodies may have inconsistent wording. Mitigation: limit this pass to the new preview guidance and avoid broad rewrites.
- RTL layout for Arabic may expose visual issues. Mitigation: include Arabic in the human spot-check set.
- The existing docs-body import workflow expects full translated segment files. For a small targeted update, manual segment insertion may be faster but needs stronger verification.

## Open Questions

- Should example search queries like `ai slop`, `smart automation`, and `license plate recognition camera scan car` stay in English for all locales, or should they be localized as natural-language search examples?
- Should the docs explicitly mention the direct PNG image URL returned by `preview_icons`, or keep the docs focused on user prompts and let tool output explain the URL?
- Should this targeted verifier become part of the default CI/build checks, or remain a manual release check for now?

## Recommended Decision

Keep the example queries in English for this small patch because they are prompts users can copy into English-speaking agents and they match existing smoke-test vocabulary. Localize the surrounding explanation so users understand the workflow.

Use a targeted source-catalog update followed by `build-i18n-public-catalogs` because the change is small, structured, and already isolated to one docs page. Add a narrow regression check so future English-only additions to this MCP search guide are caught quickly.

