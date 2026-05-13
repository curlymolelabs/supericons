# Docs Body Localization Recovery Plan

Date: 2026-05-14

## Verified Current State

The docs shell is localized, but the long-form docs body content is not localized.

Verified by `npm run audit:docs-body-localization`:

- Docs pages: 27
- Non-English locales: 11
- Non-English docs body entries: 297
- English fallback body entries: 297

Breakdown by locale:

| Locale | English fallback docs bodies |
|---|---:|
| zh-Hans | 27 |
| zh-Hant | 27 |
| ja | 27 |
| ko | 27 |
| es | 27 |
| de | 27 |
| pt | 27 |
| ar | 27 |
| hi | 27 |
| vi | 27 |
| th | 27 |

Breakdown by docs group:

| Docs group | English fallback body entries |
|---|---:|
| Overview | 33 |
| MCP Setup | 55 |
| MCP Reference | 55 |
| Motion Lab | 77 |
| Converter | 44 |
| Access and API Keys | 22 |
| Troubleshooting | 11 |

## What Actually Happened

The first bad state was generic repeated localized docs bodies. Those bodies looked localized but were not page-specific.

The emergency correction replaced that misleading content with complete English source bodies in every locale. That made the docs complete and page-specific again, but it also meant the long-form docs bodies were no longer localized.

The verification gap was that `verify:localized-docs-bodies` checked safety and structure, but it did not check whether non-English docs bodies were actually translated.

## Guardrails Already Added

- Added `scripts/audit-docs-body-localization.mjs` to report English fallback coverage.
- Added `npm run audit:docs-body-localization`.
- Disabled legacy scripts that can regenerate generic docs bodies:
  - `scripts/regenerate-localized-docs-bodies.mjs`
  - `scripts/repair-chinese-docs-localization.mjs`
  - `scripts/repair-i18n-audit-findings.mjs`

## Best-Practice Target

Docs localization should meet these standards:

- Every page body is page-specific in every supported locale.
- HTML structure, section IDs, links, buttons, code blocks, and copy targets stay unchanged.
- Human-facing prose is translated.
- Code, commands, environment variables, tool IDs, package names, file names, product names, and library names stay unchanged unless there is an explicit product reason.
- Pricing, access, MCP, Motion Lab, Converter, and API-key statements remain semantically identical to English.
- Arabic body text uses RTL naturally, but brand names, code, commands, and URLs remain readable.
- Verification distinguishes between:
  - complete English fallback
  - translated body
  - partial translation
  - structurally unsafe translation

## Batch Plan

### Batch 0: Lock The Regression Door

Goal: make the current failure impossible to hide again.

Tasks:

1. Keep the structural docs body verifier.
2. Add a release-readiness mode for the docs body localization audit:
   - `npm run audit:docs-body-localization -- --fail-on-fallback`
3. Do not add this fail mode to the main build until a docs group is translated.
4. After each translated batch, run the audit and confirm that group moves from English fallback to localized.

Exit criteria:

- Audit script reports exact fallback counts.
- Dangerous generic-body scripts stay disabled.
- Build and i18n verification still pass.

### Batch 1: Overview

Pages:

- `docs`
- `docs-quickstart`
- `docs-what-is-supericons`

Why first:

- These are the pages users see first.
- They define product trust and setup expectations.
- The current screenshots are from this group.

Execution:

1. Extract English body HTML for the three pages.
2. Translate prose for all 11 non-English locales.
3. Preserve all HTML attributes, links, code, commands, and product names.
4. Run structural verification and the docs body audit.
5. Browser smoke test Korean, Simplified Chinese, Arabic, and one Latin locale.

Exit criteria:

- 33 fallback bodies removed from the audit count.
- No English-only prose remains except approved identifiers and product terms.
- Browser screenshots show localized body sections, not mixed Korean/English cards.

### Batch 2: MCP Setup

Pages:

- `docs-mcp-universal`
- `docs-claude-code`
- `docs-codex`
- `docs-cursor`
- `docs-mcp-others`

Why second:

- These pages include setup instructions and code examples.
- They are high-risk because code must not be translated.

Exit criteria:

- 55 fallback bodies removed.
- `SUPERICONS_API_KEY`, `npx`, `supericons-mcp`, JSON keys, and client names remain intact.
- Client-specific setup remains accurate.

### Batch 3: MCP Reference

Pages:

- `docs-mcp-search-guide`
- `docs-mcp-tools`
- `docs-mcp-icons`
- `docs-mcp-motion`
- `docs-mcp-converter`

Why third:

- These pages support agents and public MCP usage.
- They contain the most tool names and parameter fields.

Exit criteria:

- 55 fallback bodies removed.
- MCP tool names and field names remain unchanged.
- Locale examples remain valid.

### Batch 4: Motion Lab

Pages:

- `docs-motion-lab`
- `docs-motion-lab-presets`
- `docs-motion-lab-triggers`
- `docs-motion-lab-exports`
- `docs-motion-lab-mcp-workflow`
- `docs-motion-lab-client-setup`
- `docs-motion-lab-use-cases`

Why fourth:

- It is large and product-specific.
- It needs consistent terminology with the localized Motion Lab UI.

Exit criteria:

- 77 fallback bodies removed.
- Preset IDs remain unchanged.
- Export format terms like CSS, SVG, and animated SVG remain consistent.

### Batch 5: Converter

Pages:

- `docs-converter-guide`
- `docs-converter-png-to-svg`
- `docs-converter-svg-to-png`
- `docs-converter-settings`

Why fifth:

- It has technical terminology and quality guidance.
- It must match the localized Converter UI.

Exit criteria:

- 44 fallback bodies removed.
- PNG, SVG, trace class, quality mode, and output terms remain accurate.

### Batch 6: Access And Troubleshooting

Pages:

- `docs-access-api-keys`
- `docs-access-premium`
- `docs-troubleshooting`

Why last:

- These pages affect account, access, pricing, and support expectations.
- They need the strictest semantic review.

Exit criteria:

- 33 fallback bodies removed.
- API-key, Pro, pack purchase, refund/access, and support guidance remains accurate.

## Required Verification After Each Batch

Run:

```bash
npm run audit:docs-body-localization
npm run verify:localized-docs-bodies
npm run verify:i18n-catalogs
npm run verify:docs-site-render
npm run build
```

For the batch being completed, also run:

```bash
npm run audit:docs-body-localization -- --fail-on-fallback
```

Only use `--fail-on-fallback` once the current batch is expected to have no English fallback.

## Browser Smoke Matrix

For each batch:

- Korean: verifies the user-reported failure mode.
- Simplified Chinese: verifies CJK display and previous localization flows.
- Arabic: verifies RTL layout and mixed code/LTR fragments.
- Spanish or Portuguese: verifies Latin locale readability and text expansion.

Each smoke test should check:

- The left docs sidebar remains localized.
- Page title and summary remain localized.
- Body headings and paragraphs are localized.
- Code blocks, commands, environment variables, and URLs remain unchanged.
- No generic repeated section titles appear.

## Recommended Next Action

Start with Batch 1 only. Do not attempt all 297 body entries in one pass.

Batch 1 is small enough to verify carefully and large enough to prove the pipeline. Once it passes, repeat the same process for the next group.
