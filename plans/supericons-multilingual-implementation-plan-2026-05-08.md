# Supericons Multilingual Implementation Plan

**Goal:** Make Supericons usable in priority non-English languages for both the web app UI and icon search.

**Language priority:** Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German, Portuguese, French, Arabic, Hindi, Vietnamese, Thai.

**Architecture:** Add a small locale layer for UI copy, then add a multilingual search layer that maps non-English search terms to existing English semantic concepts. Keep icon IDs, library IDs, API field names, and export formats stable. Treat multilingual data as public product data, with no process or model metadata in shipped JSON.

**Tech stack:** Existing Vite app, plain JavaScript modules, JSON data files, Node verification scripts, current `mcp/search.js`, `lib/search-intent-core.js`, and `lib/hosted-search-core.js`.

---

## Verified Starting Point

- `package.json` has existing verification scripts for search intent, hosted search, registry projections, and product facts.
- `lib/search-intent-core.js` currently normalizes search intent text with a pattern that removes characters outside `a-z`, digits, spaces, and hyphens.
- `lib/hosted-search-core.js` currently uses the same ASCII-only normalization approach for hosted search query text.
- `data/search-intent-dictionary/search-intent-dictionary.json` and `data/search-intent-dictionary/search-intent-mind-map.json` already feed `lib/generated-search-intent-rules.js` through `scripts/build-search-intent-core-from-dictionary.mjs`.
- `scripts/verify-search-intent-dictionary.mjs` already validates dictionary structure and checks search intent behavior against fixtures.
- `scripts/verify-search-query-fixtures.mjs` already tests search results from `mcp/search.js` against expected icon IDs.

## Locale Scope

Use these locale codes in files, URLs, storage, and analytics:

| Priority | Language | Locale code | Direction |
| --- | --- | --- | --- |
| 1 | Chinese, Simplified | `zh-Hans` | `ltr` |
| 1 | Chinese, Traditional | `zh-Hant` | `ltr` |
| 2 | Japanese | `ja` | `ltr` |
| 3 | Korean | `ko` | `ltr` |
| 4 | Spanish | `es` | `ltr` |
| 5 | German | `de` | `ltr` |
| 6 | Portuguese | `pt` | `ltr` |
| 7 | French | `fr` | `ltr` |
| 8 | Arabic | `ar` | `rtl` |
| 9 | Hindi | `hi` | `ltr` |
| 10 | Vietnamese | `vi` | `ltr` |
| 11 | Thai | `th` | `ltr` |

## Non-Goals For First Release

- Do not translate icon IDs, library IDs, CSS class names, API field names, or package names.
- Do not translate generated SVG markup or export code.
- Do not create separate translated copies of every documentation page in the first release.
- Do not rely on browser machine translation as the product feature.
- Do not add paid translation service credentials to the public repo.

## File Map

### Create

- `lib/i18n/locales.js`: Locale metadata, default locale, supported locale list, and helper functions.
- `lib/i18n/ui-copy.js`: UI copy dictionaries for shared app labels, buttons, placeholders, empty states, and errors.
- `lib/i18n/translate.js`: Runtime translation helper with fallback to English.
- `data/i18n/search-terms.schema.json`: Public schema for multilingual search mappings.
- `data/i18n/search-terms.json`: Human-readable multilingual search terms mapped to English concepts.
- `lib/multilingual-search-core.js`: Unicode-safe normalization and query expansion helpers.
- `scripts/verify-i18n-ui-copy.mjs`: Checks that all supported locales contain required UI keys.
- `scripts/verify-multilingual-search-terms.mjs`: Checks search term schema, duplicates, empty strings, and mapped English concepts.
- `scripts/verify-multilingual-search-fixtures.mjs`: Runs priority-language queries through local search and checks expected icon IDs.
- `data/i18n/search-fixtures.json`: Language-specific search test fixtures.

### Modify

- `index.html`: Add locale selector markup, `lang`, and `dir` support. Keep all visible text plain and easy to understand.
- `main.js`: Apply translated UI strings, persist locale choice, and pass locale into search expansion.
- `style.css`: Add small locale selector styles and RTL layout fixes for Arabic.
- `mcp/search.js`: Expand non-English queries before local fallback search.
- `lib/search-intent-core.js`: Use Unicode-safe normalization or delegate to `lib/multilingual-search-core.js`.
- `lib/hosted-search-core.js`: Use Unicode-safe normalization for query text and multilingual aliases.
- `scripts/build-search-intent-core-from-dictionary.mjs`: Include multilingual aliases in generated intent rules only when they map to approved English concepts.
- `scripts/verify-search-intent-dictionary.mjs`: Add multilingual fixture coverage.
- `package.json`: Add i18n verification scripts and include them in the right build or prebuild path.

## Task 1: Add Locale Metadata

**Files:**
- Create: `lib/i18n/locales.js`
- Test: `scripts/verify-i18n-ui-copy.mjs`

- [ ] **Step 1: Create locale metadata**

Add:

```js
export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = Object.freeze([
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'zh-Hans', label: 'Chinese, Simplified', nativeLabel: '简体中文', dir: 'ltr' },
  { code: 'zh-Hant', label: 'Chinese, Traditional', nativeLabel: '繁體中文', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', dir: 'ltr' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', dir: 'ltr' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย', dir: 'ltr' },
]);

export function getLocaleConfig(locale) {
  return SUPPORTED_LOCALES.find((item) => item.code === locale) || SUPPORTED_LOCALES[0];
}

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.some((item) => item.code === locale);
}
```

- [ ] **Step 2: Add a verification script shell**

Create `scripts/verify-i18n-ui-copy.mjs` with an initial metadata check:

```js
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, getLocaleConfig } from '../lib/i18n/locales.js';

assert.equal(DEFAULT_LOCALE, 'en');
assert.ok(SUPPORTED_LOCALES.length >= 13, 'all requested locales plus English must be present');
assert.equal(getLocaleConfig('ar').dir, 'rtl');
assert.equal(getLocaleConfig('missing').code, 'en');

console.log('verify-i18n-ui-copy: ok');
```

- [ ] **Step 3: Run the check**

Run: `node scripts/verify-i18n-ui-copy.mjs`

Expected: `verify-i18n-ui-copy: ok`

- [ ] **Step 4: Commit**

Run:

```bash
git add lib/i18n/locales.js scripts/verify-i18n-ui-copy.mjs
git commit -m "feat: add locale metadata"
```

## Task 2: Add UI Copy Catalog And Fallbacks

**Files:**
- Create: `lib/i18n/ui-copy.js`
- Create: `lib/i18n/translate.js`
- Modify: `scripts/verify-i18n-ui-copy.mjs`

- [ ] **Step 1: Create English keys first**

Add stable keys for the existing app shell:

```js
export const UI_COPY = Object.freeze({
  en: {
    searchPlaceholder: 'Search 20,000+ icons...',
    searchDocsPlaceholder: 'Search docs',
    searchIconsLabel: 'Search icons',
    openSearch: 'Open search',
    closeSearch: 'Close search',
    clearSearch: 'Clear search',
    menu: 'Menu',
    customize: 'Customize',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    signIn: 'Sign in',
    save: 'Save',
    saved: 'Saved',
    clearSavedItems: 'Clear saved items',
    tags: 'Tags',
    outlineStyle: 'Outline style',
    solidStyle: 'Solid style',
    closePanel: 'Close panel',
    selectIconPrompt: 'Select an icon from the grid to customize it',
    loadingLibraries: 'Loading icon libraries...',
    loadIconsFailed: 'Failed to load icons. Run: node scripts/build-icons.js',
    showingIcons: 'Showing {count} icons',
    showingIconsOfTotal: 'Showing {showing} of {total} icons',
    noSolidVariant: 'Showing outline because no solid version is available',
    language: 'Language',
  },
});
```

- [ ] **Step 2: Add requested languages**

Add each requested locale to `UI_COPY`. Use clear, short UI phrases. Keep English as the fallback for any uncertain product-specific term rather than shipping a confusing phrase.

- [ ] **Step 3: Create the translation helper**

Add:

```js
import { DEFAULT_LOCALE, isSupportedLocale } from './locales.js';
import { UI_COPY } from './ui-copy.js';

export function formatCopy(template, values = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return values[key] === undefined ? `{${key}}` : String(values[key]);
  });
}

export function createTranslator(locale) {
  const activeLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  const activeCopy = UI_COPY[activeLocale] || {};
  const fallbackCopy = UI_COPY[DEFAULT_LOCALE] || {};

  return function t(key, values = {}) {
    const value = activeCopy[key] || fallbackCopy[key] || key;
    return formatCopy(value, values);
  };
}
```

- [ ] **Step 4: Strengthen verification**

Update `scripts/verify-i18n-ui-copy.mjs` to require every locale to include all English keys:

```js
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, getLocaleConfig } from '../lib/i18n/locales.js';
import { UI_COPY } from '../lib/i18n/ui-copy.js';
import { createTranslator } from '../lib/i18n/translate.js';

const englishKeys = Object.keys(UI_COPY.en || {});

assert.equal(DEFAULT_LOCALE, 'en');
assert.ok(SUPPORTED_LOCALES.length >= 13, 'all requested locales plus English must be present');
assert.equal(getLocaleConfig('ar').dir, 'rtl');
assert.equal(getLocaleConfig('missing').code, 'en');

for (const locale of SUPPORTED_LOCALES) {
  assert.ok(UI_COPY[locale.code], `${locale.code} copy must exist`);
  for (const key of englishKeys) {
    assert.equal(typeof UI_COPY[locale.code][key], 'string', `${locale.code}.${key} must be a string`);
    assert.ok(UI_COPY[locale.code][key].trim(), `${locale.code}.${key} must not be empty`);
  }
}

const t = createTranslator('missing');
assert.equal(t('language'), UI_COPY.en.language);
assert.equal(t('showingIcons', { count: 12 }), UI_COPY.en.showingIcons.replace('{count}', '12'));

console.log('verify-i18n-ui-copy: ok');
```

- [ ] **Step 5: Run the check**

Run: `node scripts/verify-i18n-ui-copy.mjs`

Expected: `verify-i18n-ui-copy: ok`

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/i18n/ui-copy.js lib/i18n/translate.js scripts/verify-i18n-ui-copy.mjs
git commit -m "feat: add multilingual UI copy"
```

## Task 3: Wire Locale Choice Into The App Shell

**Files:**
- Modify: `index.html`
- Modify: `main.js`
- Modify: `style.css`
- Test: `scripts/verify-store-shell-contract.mjs`

- [ ] **Step 1: Add language selector markup**

In `index.html`, add a compact selector near the header actions:

```html
<label class="header__language" for="languageSelect">
  <span class="header__language-label">Language</span>
  <select class="header__language-select" id="languageSelect" aria-label="Language"></select>
</label>
```

- [ ] **Step 2: Add locale state in `main.js`**

Import helpers:

```js
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, getLocaleConfig, isSupportedLocale } from './lib/i18n/locales.js';
import { createTranslator } from './lib/i18n/translate.js';
```

Add state:

```js
const LOCALE_STORAGE_KEY = 'supericons.locale';

function getInitialLocale() {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupportedLocale(stored)) return stored;

  const browserLocale = navigator.language || DEFAULT_LOCALE;
  if (isSupportedLocale(browserLocale)) return browserLocale;

  const shortLocale = browserLocale.split('-')[0];
  const match = SUPPORTED_LOCALES.find((locale) => locale.code === shortLocale);
  return match?.code || DEFAULT_LOCALE;
}

state.locale = getInitialLocale();
state.t = createTranslator(state.locale);
```

- [ ] **Step 3: Apply `lang` and `dir`**

Add:

```js
function applyDocumentLocale() {
  const config = getLocaleConfig(state.locale);
  document.documentElement.lang = config.code;
  document.documentElement.dir = config.dir;
}
```

- [ ] **Step 4: Populate selector**

Add:

```js
function renderLanguageSelect() {
  if (!els.languageSelect) return;
  els.languageSelect.innerHTML = SUPPORTED_LOCALES
    .map((locale) => `<option value="${locale.code}">${locale.nativeLabel}</option>`)
    .join('');
  els.languageSelect.value = state.locale;
  els.languageSelect.setAttribute('aria-label', state.t('language'));
}
```

- [ ] **Step 5: Replace shell strings through `state.t`**

Replace hard-coded strings already visible in `main.js`, including:

```js
els.searchInput.placeholder = isDocsMode ? state.t('searchDocsPlaceholder') : state.t('searchPlaceholder');
els.searchInput.setAttribute('aria-label', state.t('searchIconsLabel'));
els.gridMeta.textContent = state.t('loadingLibraries');
```

Use `state.t('showingIcons', { count: total.toLocaleString() })` and `state.t('showingIconsOfTotal', { showing, total })` for count messages.

- [ ] **Step 6: Add change handler**

Add:

```js
els.languageSelect?.addEventListener('change', () => {
  const nextLocale = els.languageSelect.value;
  if (!isSupportedLocale(nextLocale)) return;
  state.locale = nextLocale;
  state.t = createTranslator(nextLocale);
  localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  applyDocumentLocale();
  renderLanguageSelect();
  refreshShellCopy();
});
```

- [ ] **Step 7: Add minimal CSS**

Add:

```css
.header__language {
  align-items: center;
  display: inline-flex;
  gap: 0.4rem;
}

.header__language-label {
  font-size: 0.8rem;
}

.header__language-select {
  min-height: 2rem;
}

[dir="rtl"] .header,
[dir="rtl"] .sidebar,
[dir="rtl"] .panel {
  direction: rtl;
}
```

- [ ] **Step 8: Run shell verification**

Run: `node scripts/verify-store-shell-contract.mjs`

Expected: existing shell contract check passes.

- [ ] **Step 9: Commit**

Run:

```bash
git add index.html main.js style.css
git commit -m "feat: add locale selector to app shell"
```

## Task 4: Add Unicode-Safe Search Normalization

**Files:**
- Create: `lib/multilingual-search-core.js`
- Modify: `lib/search-intent-core.js`
- Modify: `lib/hosted-search-core.js`
- Test: `scripts/verify-multilingual-search-terms.mjs`

- [ ] **Step 1: Create Unicode normalization helper**

Add:

```js
const COMBINING_MARKS = /\p{M}/gu;
const SEPARATORS = /[_:\-]+/g;
const NON_SEARCH_CHARS = /[^\p{L}\p{N}\s]/gu;

export function normalizeMultilingualSearchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(SEPARATORS, ' ')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(NON_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeMultilingualSearchText(value) {
  const normalized = normalizeMultilingualSearchText(value);
  return normalized ? normalized.split(' ') : [];
}
```

- [ ] **Step 2: Update `lib/search-intent-core.js`**

Import:

```js
import { normalizeMultilingualSearchText, tokenizeMultilingualSearchText } from './multilingual-search-core.js';
```

Replace `normalizeIntentText` and `tokenizeIntentText` internals:

```js
export function normalizeIntentText(value) {
  return normalizeMultilingualSearchText(value);
}

export function tokenizeIntentText(value) {
  return tokenizeMultilingualSearchText(value);
}
```

- [ ] **Step 3: Update `lib/hosted-search-core.js`**

Import the same helpers and replace the ASCII-only normalizer:

```js
import { normalizeMultilingualSearchText, tokenizeMultilingualSearchText } from './multilingual-search-core.js';

export function normalizeSearchEngineQuery(value) {
  return normalizeMultilingualSearchText(value);
}

export function tokenizeSearchEngineText(value) {
  return tokenizeMultilingualSearchText(value);
}
```

- [ ] **Step 4: Verify existing English behavior**

Run:

```bash
node scripts/verify-search-intent-dictionary.mjs
node scripts/verify-search-query-fixtures.mjs
```

Expected:

```text
verify-search-intent-dictionary: ok
[PASS] self-hosted: ...
```

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/multilingual-search-core.js lib/search-intent-core.js lib/hosted-search-core.js
git commit -m "feat: support unicode search normalization"
```

## Task 5: Add Multilingual Search Term Data

**Files:**
- Create: `data/i18n/search-terms.schema.json`
- Create: `data/i18n/search-terms.json`
- Create: `scripts/verify-multilingual-search-terms.mjs`

- [ ] **Step 1: Add schema**

Use this shape:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Supericons Multilingual Search Terms",
  "type": "object",
  "required": ["version", "locales"],
  "properties": {
    "version": { "type": "integer", "minimum": 1 },
    "locales": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["terms"],
        "properties": {
          "terms": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["term", "maps_to"],
              "properties": {
                "term": { "type": "string", "minLength": 1 },
                "maps_to": { "type": "array", "items": { "type": "string", "minLength": 1 }, "minItems": 1 },
                "boost": { "type": "number", "minimum": 0, "maximum": 5 }
              },
              "additionalProperties": false
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Add first useful term set**

Seed each locale with high-volume icon concepts such as search, home, user, settings, save, heart, calendar, camera, download, upload, mail, lock, warning, chart, server, database, code, menu, close, arrow, play, pause, edit, trash, copy, plus, minus, check, and team.

Example entries:

```json
{
  "version": 1,
  "locales": {
    "zh-Hans": {
      "terms": [
        { "term": "搜索", "maps_to": ["search", "magnifier"], "boost": 3 },
        { "term": "主页", "maps_to": ["home", "house"], "boost": 3 },
        { "term": "设置", "maps_to": ["settings", "gear", "sliders"], "boost": 3 }
      ]
    },
    "ja": {
      "terms": [
        { "term": "検索", "maps_to": ["search", "magnifier"], "boost": 3 },
        { "term": "ホーム", "maps_to": ["home", "house"], "boost": 3 },
        { "term": "設定", "maps_to": ["settings", "gear", "sliders"], "boost": 3 }
      ]
    }
  }
}
```

- [ ] **Step 3: Add verifier**

Create a script that checks all requested locales exist, terms are non-empty, `maps_to` values are non-empty, and duplicate terms within a locale fail.

Run: `node scripts/verify-multilingual-search-terms.mjs`

Expected: `verify-multilingual-search-terms: ok`

- [ ] **Step 4: Commit**

Run:

```bash
git add data/i18n/search-terms.schema.json data/i18n/search-terms.json scripts/verify-multilingual-search-terms.mjs
git commit -m "feat: add multilingual search terms"
```

## Task 6: Expand Multilingual Queries In Local Search

**Files:**
- Modify: `lib/multilingual-search-core.js`
- Modify: `mcp/search.js`
- Test: `data/i18n/search-fixtures.json`
- Test: `scripts/verify-multilingual-search-fixtures.mjs`

- [ ] **Step 1: Add term lookup**

In `lib/multilingual-search-core.js`, add:

```js
import multilingualTerms from '../data/i18n/search-terms.json' assert { type: 'json' };

export function buildMultilingualQueryVariants(query, locale, options = {}) {
  const maxVariants = Math.max(1, Math.min(12, Number(options.maxVariants || 8)));
  const normalizedQuery = normalizeMultilingualSearchText(query);
  const localeTerms = multilingualTerms.locales?.[locale]?.terms || [];
  const variants = [normalizedQuery];

  for (const entry of localeTerms) {
    const term = normalizeMultilingualSearchText(entry.term);
    if (!term || term !== normalizedQuery) continue;
    variants.push(...entry.maps_to);
  }

  return [...new Set(variants.filter(Boolean))].slice(0, maxVariants);
}
```

- [ ] **Step 2: Use variants in local search**

In `mcp/search.js`, before scoring a query, build variants from the requested locale. If no locale is provided, try all locale dictionaries only for exact non-English term matches.

Suggested behavior:

```js
const queryVariants = buildMultilingualQueryVariants(query, options.locale || 'en');
const mergedResults = dedupeByIconId(
  queryVariants.flatMap((variant) => searchIcons(variant, icons, synonyms, options))
);
```

- [ ] **Step 3: Add fixture file**

Create `data/i18n/search-fixtures.json` with at least three fixtures per priority locale. Each fixture should include:

```json
{
  "locale": "zh-Hans",
  "query": "搜索",
  "topN": 8,
  "requiredIncluded": ["lucide:search"]
}
```

- [ ] **Step 4: Add fixture verifier**

Create `scripts/verify-multilingual-search-fixtures.mjs` that:

- loads `public/icon-index.json` and `public/synonyms.json`
- imports `searchIcons` from `mcp/search.js`
- runs each fixture with `{ locale, limit: topN }`
- fails when any required icon is missing from the top results

- [ ] **Step 5: Run fixture checks**

Run:

```bash
node scripts/verify-multilingual-search-terms.mjs
node scripts/verify-multilingual-search-fixtures.mjs
```

Expected:

```text
verify-multilingual-search-terms: ok
verify-multilingual-search-fixtures: ok
```

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/multilingual-search-core.js mcp/search.js data/i18n/search-fixtures.json scripts/verify-multilingual-search-fixtures.mjs
git commit -m "feat: support multilingual icon search"
```

## Task 7: Include Multilingual Search In Hosted Search

**Files:**
- Modify: `lib/hosted-search-core.js`
- Modify: `scripts/sync-search-catalog-to-supabase.mjs`
- Modify: `scripts/verify-search-catalog-sync.mjs`

- [ ] **Step 1: Add multilingual aliases to hosted rows**

When building hosted search manifest or registry rows, include mapped multilingual terms as searchable aliases for the same icon concepts. Keep the public row focused on search data only:

```js
{
  icon_id,
  semantic_aliases,
  multilingual_aliases: {
    'zh-Hans': ['搜索'],
    ja: ['検索']
  }
}
```

- [ ] **Step 2: Keep English ranking stable**

Make sure existing English aliases still score at the same tier. Multilingual aliases should add recall for non-English queries, not reorder English results.

- [ ] **Step 3: Verify catalog sync**

Run:

```bash
node scripts/verify-search-catalog-sync.mjs
node scripts/verify-hosted-search-engine.mjs
```

Expected: both scripts pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add lib/hosted-search-core.js scripts/sync-search-catalog-to-supabase.mjs scripts/verify-search-catalog-sync.mjs
git commit -m "feat: add multilingual hosted search aliases"
```

## Task 8: Add RTL QA For Arabic

**Files:**
- Modify: `style.css`
- Modify: `scripts/verify-docs-site-render.mjs` if it covers browser rendering
- Optional create: `scripts/verify-i18n-layout.mjs`

- [ ] **Step 1: Add RTL layout rules**

Add only targeted rules for surfaces that need direction changes:

```css
[dir="rtl"] .header__search,
[dir="rtl"] .grid-header,
[dir="rtl"] .panel__header,
[dir="rtl"] .contact-form {
  direction: rtl;
}

[dir="rtl"] .icon-card,
[dir="rtl"] .material-symbols-outlined {
  direction: ltr;
}
```

- [ ] **Step 2: Browser-check Arabic**

Run the app:

```bash
npm run dev
```

Open `http://localhost:5173`, switch to Arabic, and verify:

- Header controls remain readable.
- Search input text aligns correctly.
- Icon cards are not mirrored.
- Exported SVG/code text is not reversed.
- No text overlaps in desktop and mobile widths.

- [ ] **Step 3: Capture evidence**

Use Browser or Playwright screenshots for:

- desktop English
- desktop Arabic
- mobile Arabic

- [ ] **Step 4: Commit**

Run:

```bash
git add style.css
git commit -m "fix: support arabic right-to-left layout"
```

## Task 9: Add Build And Release Gates

**Files:**
- Modify: `package.json`
- Modify: `docs` or `plans` release notes only if needed

- [ ] **Step 1: Add scripts**

Add:

```json
{
  "verify:i18n-ui": "node scripts/verify-i18n-ui-copy.mjs",
  "verify:i18n-search-terms": "node scripts/verify-multilingual-search-terms.mjs",
  "verify:i18n-search": "node scripts/verify-multilingual-search-fixtures.mjs"
}
```

- [ ] **Step 2: Add to build gate**

Add the i18n checks before `vite build` in `build`, after generated search data is built:

```json
"build": "npm run build:product-facts && npm run verify:product-facts && npm run build:si-registry && npm run verify:si-registry && npm run verify:i18n-ui && npm run verify:i18n-search-terms && npm run verify:i18n-search && npm run build:admin-html && npm run build:material-export-manifest && npm run build:sanitize-public-pack-metadata && npm run build:motion-lab-mcp-artifacts && npm run build:bundles && npm run verify:motion-lab-presets && npm run verify:motion-lab-agent-metadata && vite build && node scripts/cleanup-dist-admin-artifacts.mjs"
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run verify:i18n-ui
npm run verify:i18n-search-terms
npm run verify:i18n-search
npm run build
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: add multilingual verification gates"
```

## Task 10: Rollout Plan

**Phase 1: Search foundation**

- Ship Unicode-safe normalization.
- Ship multilingual search mappings for top 30 icon concepts in all requested locales.
- Verify at least 3 query fixtures per locale.

**Phase 2: App shell**

- Ship locale selector.
- Translate app shell, search states, auth labels, export labels, and common errors.
- Verify English, Simplified Chinese, Japanese, Korean, Spanish, Arabic, and Thai in browser screenshots.

**Phase 3: Search depth**

- Expand from 30 concepts to 150 concepts per locale.
- Add fixtures for the top 50 user jobs from search logs and product positioning.
- Add misspelling and variant coverage for Latin-script languages.

**Phase 4: Public docs and SEO**

- Translate the highest-intent docs pages after app search is stable.
- Add localized meta titles and descriptions only for pages that are actually translated.
- Keep untranslated docs in English with clear locale fallback.

**Phase 5: Ongoing quality**

- Review zero-result and low-result queries by locale.
- Add new multilingual terms through the same schema and fixtures.
- Keep all public data free of internal workflow metadata.

## Acceptance Criteria

- Every requested locale appears in the language selector.
- `document.documentElement.lang` and `document.documentElement.dir` update when the user changes locale.
- English UI remains unchanged by default.
- Arabic uses `dir="rtl"` and does not mirror icons or code samples.
- Non-English search queries can return relevant icons for every requested locale.
- At least 36 multilingual search fixtures pass: 3 per requested locale.
- Existing English search fixtures still pass.
- `npm run build` passes after i18n verification is added.

## Risks And Mitigations

- **Risk:** Non-Latin text currently gets stripped by search normalization.
  **Mitigation:** Make Unicode-safe normalization the first search task.

- **Risk:** Translated search terms may map to the wrong icon concept.
  **Mitigation:** Use small, reviewed term batches with required icon fixtures.

- **Risk:** Arabic layout can accidentally reverse icon previews or code text.
  **Mitigation:** Apply RTL only to UI surfaces and force icon/code areas to stay LTR.

- **Risk:** UI copy may fall out of sync as new strings are added.
  **Mitigation:** Require all locale dictionaries to include every English key.

- **Risk:** Search data can become noisy if every translation is treated as equal.
  **Mitigation:** Map multilingual terms to approved English concepts, then let the existing ranking system decide final order.

## First Implementation Slice

Start with these three commits:

1. `feat: add locale metadata`
2. `feat: support unicode search normalization`
3. `feat: add multilingual search terms`

This produces a testable foundation before touching broad UI copy. It also reduces the biggest known risk first: non-English queries being normalized away before search can use them.
