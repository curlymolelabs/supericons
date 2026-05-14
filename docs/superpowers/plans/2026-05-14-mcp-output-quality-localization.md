# MCP Output Quality Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Supericons MCP human-facing output quality in English and all supported non-English locales without localizing icon IDs or changing tool behavior.

**Architecture:** Add a small MCP-facing localization layer that enriches existing tool outputs with localized human-readable copy while preserving stable IDs, schemas, and protocol behavior. Search and recommendation behavior remain unchanged except for clearer text fields where already returned. Motion Lab and Converter tools gain optional `locale` inputs and localized metadata fields.

**Tech Stack:** Node.js ESM, MCP SDK, JSON metadata, existing verification scripts, DeepL MCP for translation support.

---

## File Structure

- Modify: `mcp/index.js`
  - Add optional `locale` inputs to Motion Lab and Converter tools.
  - Apply localized output helpers to Motion Lab preset lists, recipes, selector instructions, Converter options, and user-facing error payloads.
- Modify: `mcp/motion-lab.js`
  - Accept an optional locale in `listMotionLabPresets`.
  - Return base English fields plus locale-specific fields without changing preset IDs.
- Create: `mcp/mcp-output-localization.js`
  - Own the supported locale list, locale normalization, Motion Lab copy map, Converter copy map, and helper functions.
  - Keep all functional IDs, code terms, SVG/PNG/CSS/MCP/API labels, and product names unchanged.
- Modify: `scripts/verify-mcp-multilingual-support.mjs`
  - Verify localized fields exist for all supported locales.
  - Verify functional IDs and English master fields remain stable.
- Create: `docs/mcp-output-quality-localization-audit-2026-05-14.html`
  - Public-safe plain-language report with scope, findings, fixes, verification, and residual risks.

## Task 1: Create MCP Output Localization Helper

**Files:**
- Create: `mcp/mcp-output-localization.js`

- [ ] **Step 1: Define supported locales**

Create a constant with these locale codes:

```js
export const MCP_OUTPUT_LOCALES = Object.freeze([
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
  'es',
  'de',
  'pt',
  'ar',
  'hi',
  'vi',
  'th',
]);
```

- [ ] **Step 2: Add `normalizeMcpLocale(locale)`**

Return the locale when it is supported; otherwise return `null`.

- [ ] **Step 3: Add Motion Lab localized copy**

Create a map for group names, trigger labels, common output guidance, and preset labels/descriptions for all 80 preset IDs. Preserve preset IDs exactly. Use English master copy where `locale` is missing.

- [ ] **Step 4: Add Converter localized copy**

Create localized text for Converter option guidance: workflow note, SVG-to-PNG guidance, quality modes, color modes, UI modes, trace-class `bestFor` and `avoidFor`, and starter-combination labels. Preserve option IDs exactly.

- [ ] **Step 5: Add helper functions**

Export:

```js
export function localizeMotionPresetSummary(record, locale) {}
export function localizeMotionRecipe(recipe, locale) {}
export function localizeMotionSelectorInstructions(instructions, locale) {}
export function localizeConverterOptions(options, locale) {}
export function localizeMcpErrorPayload(payload, locale) {}
```

Each helper should return a shallow clone with extra localized fields. It must not remove English fields.

## Task 2: Wire Motion Lab Tool Outputs

**Files:**
- Modify: `mcp/motion-lab.js`
- Modify: `mcp/index.js`

- [ ] **Step 1: Update `listMotionLabPresets(locale)`**

Call `localizeMotionPresetSummary(record, locale)` for each preset.

- [ ] **Step 2: Add optional locale input to Motion Lab tools**

Add optional `locale` enum to:

- `list_motion_presets`
- `get_motion_recipe`
- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

- [ ] **Step 3: Localize recipe objects**

For each Motion Lab tool that returns a recipe or preset, wrap the hosted/local recipe with `localizeMotionRecipe(recipe, locale)`.

- [ ] **Step 4: Localize selector instructions**

For CSS and bundle exports, wrap selector instructions with `localizeMotionSelectorInstructions`.

## Task 3: Wire Converter Tool Outputs

**Files:**
- Modify: `mcp/index.js`
- Modify: `mcp/runtime/converter-workflow.js` only if helper extraction is required

- [ ] **Step 1: Add optional locale input to Converter tools**

Add optional `locale` enum to:

- `inspect_converter_options`
- `inspect_converter_input`
- `convert_svg_to_png`
- `convert_png_to_svg`

- [ ] **Step 2: Localize Converter options**

Wrap `getConverterMcpOptions()` with `localizeConverterOptions(options, locale)`.

- [ ] **Step 3: Keep conversion outputs functional**

Do not translate raw SVG, PNG data URLs, base64 payloads, dimensions, option IDs, trace-class IDs, quality-mode IDs, or color-mode IDs.

## Task 4: Add Verification

**Files:**
- Modify: `scripts/verify-mcp-multilingual-support.mjs`

- [ ] **Step 1: Import localization helpers**

Verify every supported locale produces localized Motion Lab fields.

- [ ] **Step 2: Verify field safety**

Assert preset IDs, supported triggers, and Converter option IDs remain unchanged.

- [ ] **Step 3: Verify no weak fallback for key fields**

Assert localized preset descriptions differ from English for all supported non-English locales for representative presets: `breathe`, `pulse`, `spin`, `heartbeat`, and `shake`.

## Task 5: Audit Report

**Files:**
- Create: `docs/mcp-output-quality-localization-audit-2026-05-14.html`

- [ ] **Step 1: Write public-safe report**

Use plain language. Include scope, problem, changes, verification commands, and release steps.

- [ ] **Step 2: Avoid sensitive details**

Do not include API keys, secret names beyond public config labels, internal model names, or process metadata.

## Task 6: Verification Commands

Run these commands from `D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`:

```powershell
npm run verify:mcp-multilingual-support
npm run verify:motion-lab-agent-metadata
npm run verify:motion-lab-mcp-package
npm run verify:converter-mcp-clean-install
npm --prefix mcp audit --omit=dev
npm --prefix mcp pack --dry-run
npm run build
```

Expected results: every command exits with code 0. If a command fails, stop, inspect the exact failure, fix narrowly, and rerun the failed command before continuing.

## Completion Criteria

- All supported locales receive localized MCP-facing Motion Lab and Converter metadata.
- English fields remain available and stable.
- Functional IDs, icon IDs, library names, tool names, file-format labels, schemas, and protocol behavior are preserved.
- Verification commands pass or any unrun check is explicitly reported as residual risk.
