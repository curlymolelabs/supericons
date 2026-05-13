# Docs Body Zero Fallback Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully localize Supericons docs body content for every supported non-English locale with no English fallback.

**Architecture:** Treat docs body HTML as content while preserving functional HTML, code, command, identifier, link, and copy-target structure. Generate localized bodies from `DOCS_PAGES` with protected non-translatable fragments, then write translated HTML into locale catalogs and verify no body equals the English source.

**Tech Stack:** Node.js ESM scripts, `docs-pages.js`, JSON i18n catalogs, Vite build, Playwright browser smoke checks.

---

## File Map

- Create `scripts/localize-docs-body-content.mjs`: translates docs body HTML by locale and docs group while protecting functional fragments.
- Modify `scripts/audit-docs-body-localization.mjs`: keeps fallback visibility and supports `--fail-on-fallback`.
- Modify `scripts/verify-localized-docs-bodies.mjs`: fail if a non-English docs body still equals the English source body.
- Modify `data/i18n/messages/*.json`: localized docs body content.
- Regenerate `public/i18n/messages/*.json` and `mcp/public/i18n/messages/*.json` from source catalogs.

## Batch Order

1. Overview: `docs`, `docs-quickstart`, `docs-what-is-supericons`
2. MCP Setup: `docs-mcp-universal`, `docs-claude-code`, `docs-codex`, `docs-cursor`, `docs-mcp-others`
3. MCP Reference: `docs-mcp-search-guide`, `docs-mcp-tools`, `docs-mcp-icons`, `docs-mcp-motion`, `docs-mcp-converter`
4. Motion Lab: all Motion Lab docs pages
5. Converter: all Converter docs pages
6. Access/API Keys and Troubleshooting

## Task 1: Add Translation Worker

- [ ] Create `scripts/localize-docs-body-content.mjs`.
- [ ] Protect `<pre>...</pre>` and `<code>...</code>` blocks before translation.
- [ ] Protect product/tool/file-format terms outside HTML tags.
- [ ] Translate only selected docs groups and locales.
- [ ] Restore protected fragments exactly.
- [ ] Write only `docs.pages[view].bodyHtml`.

## Task 2: Strengthen Gates

- [ ] Update the docs body verifier to reject non-English bodies that exactly match `DOCS_PAGES[view].bodyHtml`.
- [ ] Keep structural checks for sections, headings, code counts, required snippets, and forbidden generic skeletons.
- [ ] Keep the audit script as the measurable fallback counter.

## Task 3: Execute Batches

- [ ] Run the translation worker by group until every group is localized.
- [ ] Regenerate public and MCP catalogs after each batch.
- [ ] Run `npm run audit:docs-body-localization`.
- [ ] Run `npm run verify:localized-docs-bodies`.
- [ ] Run `npm run verify:i18n-catalogs`.

## Task 4: Final Verification

- [ ] Confirm `npm run audit:docs-body-localization -- --fail-on-fallback` passes.
- [ ] Run `npm run verify:docs-site-render`.
- [ ] Run `npm run build`.
- [ ] Browser smoke Korean, Simplified Chinese, Arabic, and Spanish docs pages.

## Acceptance Criteria

- `englishFallbackBodies` is `0`.
- No generic docs skeleton text is present.
- No `English uses the full source guide.` placeholder is present.
- Docs body prose is localized for all supported non-English locales.
- Functional code, commands, environment variables, tool IDs, URLs, and product identifiers remain intact.
