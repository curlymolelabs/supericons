# Motion Lab And Converter Localization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Motion Lab and Converter localization across all supported non-English locales without changing tool behavior.

**Architecture:** Motion Lab and Converter strings are rendered from `store.js` through the existing `motionLab` and `converter` locale catalog sections. The fix is catalog-completeness plus a stricter verifier that catches English fallback values, not a rewrite of export, conversion, preset, or MCP logic.

**Tech Stack:** Vite app, vanilla JS `store.js`, JSON locale catalogs in `data/i18n/messages`, `public/i18n/messages`, and `mcp/public/i18n/messages`, Node verification scripts, Playwright/browser smoke checks.

---

## Audit Findings

- `index.html` already localizes the sidebar entries for Motion Lab and Converter through `tools.motionLab` and `tools.converter`.
- `store.js` renders the Motion Lab workspace with hardcoded English labels for the drop zone, upload/paste/library buttons, preset group names, playback controls, properties panel, tooltips, quick tips, export modal, mobile read-only notice, and toasts.
- `store.js` renders the Converter workspace with hardcoded English labels for mode tabs, input/output panels, empty states, upload/paste controls, option groups, color/background controls, conversion status messages, copy/download actions, upsell prompt, mobile read-only notice, and Converter Lab controls.
- `docs-pages.js` contains connected docs pages and route metadata for Motion Lab and Converter. The route labels and summaries are already represented in the locale catalogs; full docs body translation is a separate docs-body localization surface and should not be mixed into this tool UI pass.
- Source verification on 2026-05-13 showed `scripts/verify-motion-converter-localization.mjs` only checks that keys exist. It does not fail when non-English catalogs reuse English values.
- Strict catalog comparison against `data/i18n/messages/en.json` found verified English fallback gaps:
  - `ko`: 222 gaps, including every visible Motion Lab preset label and quick tips.
  - `zh-Hant`: 204 gaps, including visible Motion Lab preset labels and quick tips.
  - `ja`: 204 gaps.
  - `es`, `de`: 223 gaps each.
  - `pt`: 224 gaps.
  - `hi`, `vi`, `th`: 222 gaps each.
  - `zh-Hans`: 6 Converter/Lab gaps.
  - `ar`: 15 Motion Lab export/upsell and Converter advice/Lab gaps.
- The supplied Korean and Traditional Chinese screenshots match the source/catalog state: the page shell is localized, but Motion Lab tool strings fall back to English.

## Implementation Steps

1. Keep the existing `store.js` i18n wiring intact unless a verified untranslated string is still hardcoded in the Motion Lab or Converter UI.
2. Add locale-safe translations for the verified fallback strings in every supported non-English catalog.
3. Apply catalog updates to all shipped catalog copies:
   - `data/i18n/messages/*.json`
   - `public/i18n/messages/*.json`
   - `mcp/public/i18n/messages/*.json`
4. Preserve file-format labels and code identifiers such as `SVG`, `PNG`, `CSS`, `MCP`, preset IDs, route IDs, DOM IDs, placeholders, and clipboard/export/conversion behavior.
5. Strengthen `scripts/verify-motion-converter-localization.mjs` so it fails on exact English fallback values in non-English catalogs, while allowing intentional format-only labels like `SVG → PNG`.
6. Run catalog, Motion Lab, Converter, build, and browser smoke checks for Korean, Traditional Chinese, Simplified Chinese, Arabic, and one Latin locale.

## Task Checklist

- [x] Audit the current catalog gap counts by locale and save the counts in this plan.
- [x] Patch all verified fallback strings in the three catalog roots.
- [x] Update the localization verifier to reject accidental English fallback in non-English tool strings.
- [x] Run `npm run verify:i18n-catalogs`.
- [x] Run `node scripts/verify-motion-converter-localization.mjs`.
- [x] Run `npm run verify:motion-lab-presets`.
- [x] Run `npm run verify:converter-quality-fixtures`.
- [x] Run `npm run build`.
- [x] Browser-smoke Motion Lab and Converter for `ko`, `zh-Hant`, `zh-Hans`, `ar`, and `es`.

## Verification Gates

- `npm run verify:i18n-catalogs`
- `node scripts/verify-motion-converter-localization.mjs`
- `npm run verify:motion-lab-presets`
- `npm run verify:converter-quality-fixtures`
- `npm run build`
- Browser smoke on:
  - `/?view=motion-lab&locale=ko`
  - `/?view=converter&locale=ko`
  - `/?view=motion-lab&locale=zh-Hant`
  - `/?view=converter&locale=zh-Hant`
  - `/?view=motion-lab&locale=zh-Hans`
  - `/?view=converter&locale=zh-Hans`
  - `/?view=motion-lab&locale=ar`
  - `/?view=converter&locale=ar`
  - `/?view=motion-lab&locale=es`
  - `/?view=converter&locale=es`

## Non-Goals

- Do not change conversion, export, clipboard, payment, auth, or MCP logic.
- Do not translate code identifiers, SVG/PNG/CSS labels, filenames, or route IDs.
- Do not rewrite long-form docs article bodies in this pass.
