# Full Localization For SuperIcons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the SuperIcons website, related apps, MCP surface, public documentation, and icon discovery experience across English plus the 11 currently supported search locales.

**Architecture:** Treat localization as four separate products: interface strings, documentation, MCP/tool metadata, and icon naming/search metadata. Keep English as the stable source language and ship locale overlays that can fall back safely to English. Do not translate immutable icon IDs, library names, brand names, or code examples.

**Tech Stack:** Vanilla JavaScript, static JSON locale catalogs, existing Vite site, existing MCP package, generated documentation pages, deterministic Node.js verification scripts, Playwright browser checks.

---

## Verified Starting Point

- Current multilingual search-term data has 11 non-English locales: `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `de`, `pt`, `ar`, `hi`, `vi`, `th`.
- Each non-English locale currently has 280 concept records.
- English remains the source and fallback language, giving 12-language search coverage when English is counted.
- The public icon index currently contains 21,264 icon records with English-derived `name`, `id`, `lib`, and style/type fields.

## Scope Discussion

Full localization is much bigger than multilingual search.

The normal app-shell work is manageable: buttons, placeholders, panel labels, pricing copy, error messages, docs navigation, and MCP descriptions are finite. That can be handled with extraction, locale files, fallback checks, and visual QA.

The icon-name work is the huge undertaking. With 21,264 icons and 12 languages, naive per-icon naming would create about 255,168 localized display strings before synonyms, aliases, descriptions, tags, examples, or QA evidence. It is not just a translation volume problem. Many icon names are technical terms, brand names, library-specific IDs, metaphors, variants, and proper nouns:

- `git-branch`, `account_balance_wallet`, `brand-github`, `1password`, and `arrow-up-right` should not all be handled the same way.
- Some names should stay English or product-branded.
- Some names should be localized by phrase.
- Some names should be generated compositionally from smaller parts.
- Some names need concept-level aliases rather than translated display labels.

The safe strategy is not "translate every icon name first." The safe strategy is:

1. Localize the interface and docs first.
2. Keep immutable icon IDs English.
3. Add localized concept labels and search aliases.
4. Generate icon display names compositionally where confidence is high.
5. Only create per-icon overrides for high-value or ambiguous icons.

## Locale Policy

Supported v1 locales:

- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`
- `es`
- `de`
- `pt`
- `ar`
- `hi`
- `vi`
- `th`

Locale fallback order:

1. Exact locale, for example `zh-Hant`.
2. Parent or related locale where safe, for example `zh-Hant` can fall back to `zh-Hans` only for non-region-sensitive UI chrome, not for terminology claims.
3. English.

Right-to-left handling:

- `ar` must set `dir="rtl"` on the page root.
- Icon grids stay visually consistent, but text alignment, side panels, keyboard focus order, and docs reading order must be checked in RTL.

## Files And Responsibilities

- Create: `lib/i18n/locales.js`
  - Locale list, labels, text direction, fallback order.
- Create: `lib/i18n/translate.js`
  - Runtime translation lookup, interpolation, fallback, missing-key reporting.
- Create: `data/i18n/messages/en.json`
  - English source messages for UI and app-shell text.
- Create: `data/i18n/messages/<locale>.json`
  - Public-safe locale message catalogs.
- Create: `public/i18n/messages/<locale>.json`
  - Browser-consumable message catalogs copied from source.
- Create: `mcp/public/i18n/messages/<locale>.json`
  - MCP/package-consumable message catalogs when needed by docs or tool metadata.
- Modify: `main.js`
  - Replace hardcoded website strings with translation keys.
- Modify: `store.js`
  - Replace hardcoded store, pricing, account, dashboard, docs-shell, and panel strings with translation keys.
- Modify: `docs-pages.js`
  - Add localized docs page title/body selection and fallback.
- Modify: `index.html`
  - Set initial `lang`, `dir`, and locale bootstrap data.
- Modify: `admin.html` and `public/admin-app.js`
  - Localize admin-visible UI only if the admin app is considered public-facing.
- Modify: `mcp/index.js`
  - Localize public tool descriptions through generated locale-aware docs, while keeping MCP schema keys and tool names stable.
- Modify: `mcp/package.json`
  - Keep package metadata English unless marketplace requirements demand localized readmes.
- Create: `data/i18n/icon-names/icon-name-parts.json`
  - Localized pieces such as arrow, up, right, filled, outline, circle, square, brand, file, folder.
- Create: `data/i18n/icon-names/icon-name-overrides.json`
  - Per-icon localized labels only for high-value or ambiguous cases.
- Create: `data/i18n/icon-names/generated-icon-labels.json`
  - Generated labels from compositional rules plus overrides.
- Create: `public/icon-labels-i18n.json`
  - Public-safe browser export for localized icon labels.
- Create: `mcp/public/icon-labels-i18n.json`
  - Public-safe MCP export for localized icon labels.
- Create: `scripts/extract-i18n-messages.mjs`
  - Finds hardcoded user-facing strings and reports missing keys.
- Create: `scripts/build-i18n-public-catalogs.mjs`
  - Copies and validates message catalogs into `public/` and `mcp/public/`.
- Create: `scripts/build-icon-label-i18n.mjs`
  - Builds localized icon labels from name parts, concept records, and overrides.
- Create: `scripts/verify-i18n-catalogs.mjs`
  - Checks key parity, placeholder parity, no mojibake, no internal metadata, and valid JSON.
- Create: `scripts/verify-icon-label-i18n.mjs`
  - Checks label coverage, protected terms, brand names, script expectations, and duplicate/collision risk.
- Create: `scripts/verify-localized-browser-smoke.mjs`
  - Runs locale smoke tests against the browser app.
- Create: `scripts/verify-localized-docs.mjs`
  - Checks localized docs routes, `lang`, `dir`, title, headings, links, and code block preservation.

## Phase 1: Localization Foundation

### Task 1: Define Locale Metadata

**Files:**
- Create: `lib/i18n/locales.js`

- [ ] **Step 1: Add supported locale metadata**

Define:

```js
export const SUPPORTED_LOCALES = Object.freeze([
  'en',
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

export const DEFAULT_LOCALE = 'en';

export const LOCALE_METADATA = Object.freeze({
  en: { label: 'English', dir: 'ltr', fallback: [] },
  'zh-Hans': { label: 'Chinese (Simplified)', dir: 'ltr', fallback: ['en'] },
  'zh-Hant': { label: 'Chinese (Traditional)', dir: 'ltr', fallback: ['en'] },
  ja: { label: 'Japanese', dir: 'ltr', fallback: ['en'] },
  ko: { label: 'Korean', dir: 'ltr', fallback: ['en'] },
  es: { label: 'Spanish', dir: 'ltr', fallback: ['en'] },
  de: { label: 'German', dir: 'ltr', fallback: ['en'] },
  pt: { label: 'Portuguese', dir: 'ltr', fallback: ['en'] },
  ar: { label: 'Arabic', dir: 'rtl', fallback: ['en'] },
  hi: { label: 'Hindi', dir: 'ltr', fallback: ['en'] },
  vi: { label: 'Vietnamese', dir: 'ltr', fallback: ['en'] },
  th: { label: 'Thai', dir: 'ltr', fallback: ['en'] },
});

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function getLocaleDirection(locale) {
  return LOCALE_METADATA[locale]?.dir || LOCALE_METADATA.en.dir;
}
```

- [ ] **Step 2: Verify metadata loads**

Run:

```powershell
node -e "import('./lib/i18n/locales.js').then(m=>console.log(m.SUPPORTED_LOCALES.length, m.getLocaleDirection('ar')))"
```

Expected output includes:

```text
12 rtl
```

### Task 2: Add Translation Lookup Runtime

**Files:**
- Create: `lib/i18n/translate.js`
- Test: `scripts/verify-i18n-lookup.mjs`

- [ ] **Step 1: Add lookup helper**

Create a small runtime that supports:

- Dot-path keys.
- English fallback.
- Placeholder interpolation like `{count}`.
- Missing-key collection in development.

Implementation shape:

```js
import { DEFAULT_LOCALE } from './locales.js';

export function getMessage(catalogs, locale, key, params = {}) {
  const message = readPath(catalogs?.[locale], key) ?? readPath(catalogs?.[DEFAULT_LOCALE], key) ?? key;
  return interpolate(message, params);
}

function readPath(source, key) {
  return String(key).split('.').reduce((node, part) => (
    node && Object.hasOwn(node, part) ? node[part] : undefined
  ), source);
}

function interpolate(message, params) {
  return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
    Object.hasOwn(params, name) ? String(params[name]) : match
  ));
}
```

- [ ] **Step 2: Add lookup tests**

Create `scripts/verify-i18n-lookup.mjs` with checks for fallback, interpolation, and missing keys.

- [ ] **Step 3: Run lookup tests**

Run:

```powershell
node scripts/verify-i18n-lookup.mjs
```

Expected:

```text
verify-i18n-lookup: ok
```

## Phase 2: Website And App Shell Localization

### Task 3: Extract English UI Messages

**Files:**
- Create: `data/i18n/messages/en.json`
- Modify: `main.js`
- Modify: `store.js`
- Modify: `docs-pages.js`
- Modify: `index.html`

- [ ] **Step 1: Create English source catalog**

Start with stable keys:

```json
{
  "app": {
    "name": "Supericons",
    "searchPlaceholder": "Search 20,000+ icons...",
    "searchAriaLabel": "Search icons",
    "allIcons": "All Icons",
    "showingIcons": "Showing {shown} of {total} icons",
    "menu": "Menu",
    "signIn": "Sign in",
    "lightMode": "Light Mode",
    "darkMode": "Dark Mode"
  },
  "nav": {
    "browse": "Browse",
    "pricing": "Pricing",
    "privacy": "Privacy",
    "terms": "Terms",
    "docs": "Docs",
    "contact": "Contact"
  },
  "actions": {
    "copy": "Copy",
    "download": "Download",
    "save": "Save",
    "clearAll": "Clear all",
    "close": "Close",
    "resetAll": "Reset all",
    "playPreview": "Play preview",
    "stopPreview": "Stop preview"
  },
  "panels": {
    "compare": "Compare ({count})",
    "customize": "Customize",
    "chooseIcon": "Choose an icon from the collection grid to load preview, playback, and export controls.",
    "loadingCustomization": "Loading icon customization..."
  }
}
```

- [ ] **Step 2: Replace browser-visible hardcoded strings**

Replace strings in `main.js`, `store.js`, and `docs-pages.js` with `t('key')` calls. Keep icon IDs, library names, code examples, CSS class names, and analytics event names unchanged.

- [ ] **Step 3: Set `lang` and `dir`**

At boot:

```js
document.documentElement.lang = activeLocale;
document.documentElement.dir = getLocaleDirection(activeLocale);
```

- [ ] **Step 4: Add a locale selector**

Add a compact selector in the settings or footer area. Store the selected locale in local storage as `supericons.locale`.

- [ ] **Step 5: Verify English unchanged**

Run:

```powershell
npm run verify:search-query-fixtures
npm run verify:web-cjk-search
```

Expected: both commands pass.

### Task 4: Add Non-English UI Catalogs

**Files:**
- Create: `data/i18n/messages/zh-Hans.json`
- Create: `data/i18n/messages/zh-Hant.json`
- Create: `data/i18n/messages/ja.json`
- Create: `data/i18n/messages/ko.json`
- Create: `data/i18n/messages/es.json`
- Create: `data/i18n/messages/de.json`
- Create: `data/i18n/messages/pt.json`
- Create: `data/i18n/messages/ar.json`
- Create: `data/i18n/messages/hi.json`
- Create: `data/i18n/messages/vi.json`
- Create: `data/i18n/messages/th.json`

- [ ] **Step 1: Generate initial catalogs**

Generate catalogs from English keys. Preserve placeholders exactly.

- [ ] **Step 2: Run deterministic validators**

Checks:

- Every locale has every English key.
- Every localized string preserves placeholders.
- No string contains likely mojibake.
- Public catalogs contain no internal process metadata.
- Arabic catalog is allowed to include Arabic script and sets RTL through locale metadata.

- [ ] **Step 3: Add browser smoke cases**

For each locale:

- Load the app with `?locale=<locale>`.
- Confirm `document.documentElement.lang`.
- Confirm `document.documentElement.dir`.
- Confirm search placeholder is localized or safely falls back to English.
- Run one search query from the existing multilingual search dataset.

## Phase 3: Public Documentation Localization

### Task 5: Classify Docs Before Translation

**Files:**
- Read: `docs/*.md`
- Read: `public/mcp/**/*.html`
- Create: `data/i18n/docs/docs-localization-manifest.json`

- [ ] **Step 1: Classify docs into tiers**

Use tiers:

- `tier_1`: landing docs, MCP setup, quickstart, pricing/help/legal summaries.
- `tier_2`: deep guides, examples, troubleshooting.
- `tier_3`: historical research, long-form essays, internal-ish planning docs.

- [ ] **Step 2: Localize tier 1 first**

Do not translate every historical document in v1. That creates stale docs quickly.

- [ ] **Step 3: Preserve code blocks and commands**

Validator rule:

- Code blocks, CLI commands, package names, environment variable names, URLs, and JSON keys must remain byte-for-byte identical unless a doc-specific allowlist says otherwise.

### Task 6: Add Localized Docs Routing

**Files:**
- Modify: `docs-pages.js`
- Create: `data/i18n/docs/<locale>/*.json`
- Create: `scripts/verify-localized-docs.mjs`

- [ ] **Step 1: Add locale-aware docs lookup**

Route shape:

```text
/?view=docs&locale=ja
/?view=docs&doc=mcp-quickstart&locale=ar
```

- [ ] **Step 2: Add fallback to English**

If a localized doc is missing, show the English doc with a small, localized fallback note.

- [ ] **Step 3: Verify docs pages**

Run:

```powershell
node scripts/verify-localized-docs.mjs
```

Expected:

```text
verify-localized-docs: ok
```

## Phase 4: MCP Localization

### Task 7: Keep MCP Protocol Stable

**Files:**
- Modify: `mcp/index.js`
- Modify: `mcp/search.js`
- Create: `mcp/public/i18n/tool-descriptions.json`
- Create: `scripts/verify-mcp-i18n.mjs`

- [ ] **Step 1: Do not rename MCP tools**

Keep these stable:

- `search_icons`
- `recommend_icons`
- `get_icon`
- `list_libraries`
- Motion Lab tools
- Converter tools

Reason: agents call tool names programmatically. Localizing tool names would break callers.

- [ ] **Step 2: Add localized examples, not localized schema keys**

Schema keys stay English:

```json
{
  "query": "string",
  "library": "string",
  "style": "outline",
  "locale": "ja",
  "limit": 10
}
```

Docs can show localized examples:

```js
search_icons({ query: "設定", locale: "ja" })
search_icons({ query: "كلمة المرور", locale: "ar" })
```

- [ ] **Step 3: Localize MCP docs and response prose**

Only localize human-facing text:

- Setup docs.
- Error messages where safe.
- Tool descriptions in generated docs.
- Examples.

- [ ] **Step 4: Verify MCP remains backward compatible**

Run:

```powershell
npm run verify:motion-lab-mcp-package
npm run verify:cjk-search-quality
npm run verify:cjk-search-fixtures
```

Expected: all pass.

## Phase 5: Icon Names And Labels

### Task 8: Decide What "Localized Icon Name" Means

**Files:**
- Create: `docs/icon-localization-policy.md`

- [ ] **Step 1: Define immutable fields**

These do not get localized:

- `id`
- `lib`
- package names
- brand names where the brand owner uses a fixed global name
- CSS classes
- SVG metadata used by code

- [ ] **Step 2: Define localizable fields**

These can be localized:

- Display label in the grid.
- Search aliases.
- Human-facing descriptions.
- Category labels.
- Tooltips.

- [ ] **Step 3: Define protected term rules**

Examples:

- `GitHub`, `1Password`, `Docker`, `React`, `OpenAI`, and similar product names usually stay as brand names.
- `API`, `SDK`, `VPN`, `CPU`, and `URL` may stay Latin in some locales but can have localized aliases.
- Directional and shape terms can be compositional: arrow + up + right.

### Task 9: Build Compositional Icon Labeling

**Files:**
- Create: `data/i18n/icon-names/icon-name-parts.json`
- Create: `scripts/build-icon-label-i18n.mjs`
- Create: `public/icon-labels-i18n.json`
- Create: `mcp/public/icon-labels-i18n.json`

- [ ] **Step 1: Build parts dictionary**

Start with reusable parts:

```json
{
  "arrow": { "en": "arrow", "es": "flecha", "de": "Pfeil" },
  "up": { "en": "up", "es": "arriba", "de": "oben" },
  "right": { "en": "right", "es": "derecha", "de": "rechts" },
  "circle": { "en": "circle", "es": "círculo", "de": "Kreis" },
  "filled": { "en": "filled", "es": "relleno", "de": "gefüllt" }
}
```

- [ ] **Step 2: Generate labels for obvious patterns**

Examples:

- `arrow-up` from `arrow + up`.
- `arrow-up-right` from `arrow + up + right`.
- `file-check` from `file + check`.
- `folder-plus` from `folder + plus`.

- [ ] **Step 3: Do not generate labels for unsafe patterns**

Block these from automatic display-name localization:

- brand names
- obscure product logos
- medical terms
- legal/finance terms
- icons where the English name is itself ambiguous

- [ ] **Step 4: Use English fallback for blocked labels**

If confidence is not high, keep the English display name while localized search aliases still work.

### Task 10: Add Per-Icon Overrides For High-Value Icons

**Files:**
- Create: `data/i18n/icon-names/icon-name-overrides.json`

- [ ] **Step 1: Cover top 500 by usage/search importance**

Start with:

- common UI icons
- MCP examples
- Motion Lab examples
- Converter examples
- pricing/account/dashboard icons
- concepts already in the 280 search groups

- [ ] **Step 2: Add override schema**

```json
{
  "material:search": {
    "zh-Hans": "搜索",
    "ja": "検索",
    "ar": "بحث",
    "hi": "खोज",
    "vi": "tìm kiếm",
    "th": "ค้นหา"
  }
}
```

- [ ] **Step 3: Verify protected terms**

The validator rejects overrides that translate protected brands unless the allowlist permits it.

### Task 11: Add Icon Label Quality Gates

**Files:**
- Create: `scripts/verify-icon-label-i18n.mjs`

- [ ] **Step 1: Validate coverage tiers**

Require:

- 100 percent generated or fallback labels for all icons.
- 100 percent localized labels for top 500 high-value icons.
- No requirement for native localized labels for all 21,264 icons in v1.

- [ ] **Step 2: Validate scripts**

For localized labels, require expected script where appropriate:

- Arabic script for `ar` unless protected term.
- Devanagari for `hi` unless protected term.
- Thai for `th` unless protected term.
- Latin for `es`, `de`, `pt`, `vi`.
- Han/kana/Hangul checks for CJK/Korean.

- [ ] **Step 3: Validate search impact**

Localized display labels must not damage existing search ranking. Run:

```powershell
npm run verify:search-query-fixtures
npm run verify:cjk-search-fixtures
npm run verify:web-cjk-search
```

Expected: all pass.

## Phase 6: Build, Routing, SEO, And Packaging

### Task 12: Add Locale Routing And Metadata

**Files:**
- Modify: `index.html`
- Modify: `docs-pages.js`
- Modify: build scripts that generate public docs HTML

- [ ] **Step 1: Add query-param locale routing first**

Start with:

```text
/?locale=es
/?view=docs&locale=ja
```

Do not add path-based routing until query-param routing is stable.

- [ ] **Step 2: Add localized metadata**

For localized docs pages:

- `<html lang="">`
- `<html dir="">`
- localized title
- localized description
- `hreflang` alternates where pages are truly localized

### Task 13: Package Localized Data

**Files:**
- Modify: build scripts
- Modify: `mcp/package.json` file list if package files are enumerated

- [ ] **Step 1: Include public locale artifacts**

Ensure package verification includes:

- `mcp/public/i18n/messages/*.json`
- `mcp/public/icon-labels-i18n.json`
- `mcp/public/cjk-search-terms.json`

- [ ] **Step 2: Verify package size**

Run:

```powershell
npm run verify:motion-lab-mcp-package
```

Expected: package verification passes and reports the new packaged file count.

## Phase 7: Quality System

### Task 14: Add Localization Quality Checks

**Files:**
- Create: `scripts/verify-i18n-catalogs.mjs`

- [ ] **Step 1: Check message key parity**

Every locale file must contain exactly the same keys as English unless a manifest marks an intentional fallback.

- [ ] **Step 2: Check placeholder parity**

The string:

```text
Showing {shown} of {total} icons
```

requires every locale to include both `{shown}` and `{total}`.

- [ ] **Step 3: Check public-safe output**

Reject:

- internal process metadata
- model names
- prompt notes
- workflow traces
- mojibake
- replacement question marks caused by encoding corruption

### Task 15: Add Browser Visual QA

**Files:**
- Create: `scripts/verify-localized-browser-smoke.mjs`

- [ ] **Step 1: Test representative locales**

Required:

- English: baseline
- German: long text expansion
- Arabic: RTL layout
- Thai: no spaces between words
- Japanese: compact CJK layout
- Hindi: combining marks render correctly

- [ ] **Step 2: Check no overlap**

Use Playwright screenshots or DOM box checks for:

- search bar
- header buttons
- side navigation
- icon cards
- customize panel
- pricing card
- docs article

- [ ] **Step 3: Check console**

Browser console must have zero errors for each tested locale.

## Phase 8: Rollout Strategy

### Task 16: Ship In Slices

- [ ] **Slice 1: Locale selector and app shell**

Ship UI chrome only. Icon names remain English. Search already supports multilingual terms.

- [ ] **Slice 2: Tier 1 docs**

Ship setup docs, MCP docs, search docs, pricing/help/legal summaries.

- [ ] **Slice 3: MCP docs and examples**

Keep protocol stable; localize docs and human prose only.

- [ ] **Slice 4: Top 500 icon display labels**

Use overrides plus compositional naming.

- [ ] **Slice 5: Expand icon labels by pattern**

Grow coverage from top 500 to top 2,000, then by library or concept family.

- [ ] **Slice 6: Telemetry-backed expansion**

Prioritize labels where users search, click, copy, or fail to find icons.

## Verification Matrix

Required before release:

```powershell
npm run verify:cjk-search-quality
npm run verify:cjk-search-fixtures
npm run verify:web-cjk-search
npm run verify:search-query-fixtures
npm run verify:hosted-search-engine
npm run verify:motion-lab-mcp-package
node scripts/verify-i18n-lookup.mjs
node scripts/verify-i18n-catalogs.mjs
node scripts/verify-icon-label-i18n.mjs
node scripts/verify-localized-docs.mjs
node scripts/verify-localized-browser-smoke.mjs
```

## Release Notes Policy

Be honest:

- Say the UI/docs localization is automated and quality-gated unless a human review process is added later.
- Say icon IDs remain English and stable.
- Say localized icon labels are being rolled out by confidence tier.
- Do not claim native-speaker review unless it happened.

## Recommendation

Do not start by localizing all 21,264 icon names in 11 non-English languages. Start with app shell, public docs, MCP docs, and top icon labels. Use multilingual search aliases as the main discovery layer while localized display labels grow in confidence-based tiers.

This gives users immediate value without creating a massive, brittle translation dataset that is hard to trust and harder to maintain.

