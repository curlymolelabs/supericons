# Localization Audit: Terms, Privacy & Pricing Pages

**Date:** May 14, 2026  
**Scope:** Non-English locales vs. English source (`data/i18n/messages/en.json`)  
**Files audited:** `data/i18n/messages/{locale}.json` for all 11 non-English locales  
**English source of truth:** `data/i18n/messages/en.json`  
**Page rendering:** `store.js` (single shared component per page, uses `t()` with locale-first + en-fallback resolution)  
**Data/public parity:** Confirmed `data/` == `public/` for all audited locales

---

## Overall Localization Health

**Good.** The Terms, Privacy, and Pricing pages are structurally complete across all 12 locales. All sections, headings, prices, feature counts, and FAQ item counts match the English source. No critical structural gaps or price mismatches were found. Full legal nuance still needs human review by a native speaker or counsel before publication.

The main issue is **untranslated English technical/legal terms** embedded within otherwise translated content in 5 non-Latin locales (Hindi, Thai, Japanese, Chinese Simplified/Traditional, Arabic). The Hindi Terms page is the most affected, with 18+ English words remaining untranslated.

---

## Findings Grouped by Page

### TERMS OF SERVICE

#### Severity: Medium

| # | Locale | File | Issue |
|---|--------|------|-------|
| T1 | **hi** | `data/i18n/messages/hi.json` | **18+ untranslated English terms** embedded in Hindi body text: `open-source`, `reverse-engineer`, `bulk-export`, `raw`, `access`, `sublicense`, `client work`, `compiled output`, `claim`, `refund`, `download`, `one-time`, `digital purchases`, `refundable`, `access issue` |
| T2 | **th** | `data/i18n/messages/th.json` | **2 untranslated English terms**: `animation` (in "SVG และ CSS animation"), `sublicense` (in "ห้ามให้ sublicense") |

**English source meaning (T1):** Legal terms like "open-source", "reverse-engineer", "bulk-export", "sublicense", "refund", "one-time digital purchases" appear as English words mid-sentence in an otherwise Hindi-script body. This creates a mixed-language legal text that may reduce clarity for Hindi readers.

**Recommended correction (T1):** Translate all legal/technical terms into Hindi script (देवनागरी). The body already uses some transliterated Hindi words; the remaining English terms should be translated consistently. For example:
- `open-source` → `ओपन-सोर्स` or `खुला स्रोत`
- `reverse-engineer` → `रिवर्स-इंजीनियर` or translate fully
- `refund` → `धनवापसी` (used elsewhere in Hindi)
- `sublicense` → `उप-लाइसेंस`

**Recommended correction (T2):** Translate `animation` → `แอนิเมชัน` (used earlier in the text), `sublicense` → `ใบอนุญาตช่วง`.

> Note: Proper names ("Supericons", "Curly Mole Labs", "MCP", "SVG", "CSS", "Pro", "Launch Edition") and the contact email (`hello@supericons.dev`) are correctly kept in English across all locales — not flagged.

---

### PRIVACY POLICY

#### Severity: Medium

| # | Locale | File | Issue |
|---|--------|------|-------|
| P1 | **ja** | `data/i18n/messages/ja.json` | **"cookie" untranslated** in section 3: "cookie を使わないプロダクト分析" |
| P2 | **zh-Hans** | `data/i18n/messages/zh-Hans.json` | **"cookie" untranslated** in section 3: "不使用 cookie 的产品分析数据" |
| P3 | **zh-Hant** | `data/i18n/messages/zh-Hant.json` | **"cookie" untranslated** in section 3 |
| P4 | **hi** | `data/i18n/messages/hi.json` | **"cookie" untranslated** in section 3: "cookie-रहित उत्पाद विश्लेषण" |
| P5 | **ar** | `data/i18n/messages/ar.json` | **"premium" untranslated** in section 7: "premium" appears in English amidst Arabic text |

**English source meaning:** "cookie-free product analytics" (section 3) and "enforce premium entitlements" (section 7, for P5).

**Discussion:** The term "cookie" is widely understood as-is in Japanese, Chinese, and Hindi tech contexts. It may be intentionally kept in English. However, for legal compliance in privacy policy text, translating or transliterating "cookie" (e.g., `クッキー`, `Cookie`, `कुकी`) provides clarity.

**Recommended correction:** Verify with legal counsel whether "cookie" can remain in English, or should use locale-specific form (e.g., `クッキー` for ja, `कुकी` for hi). For P5 (ar), translate `premium` → `المميزة` (used elsewhere in the Arabic translation).

---

## Remediation Status

Targeted copy refinements were applied for Hindi Terms, Thai Terms, Arabic Privacy, and cookie terminology in Japanese, Chinese Simplified, Chinese Traditional, and Hindi. Verification evidence from this implementation pass:

- `node scripts/build-i18n-public-catalogs.mjs` -> `build-i18n-public-catalogs: copied 12 locales`
- `npm run verify:i18n-catalogs` -> `verify-i18n-catalogs: ok`
- `npm run verify:commercial-localization` -> `verify-commercial-localization: ok`
- `npm run verify:view-route-policy` -> `verify-view-route-policy: ok`
- Targeted legal structure/token check -> `targeted legal localization check: ok`

---

### PRICING

**No structural or numeric findings.** Pricing content is structurally complete across all locales, and no automated price drift was found:

- 4 plans present in all locales: Free, Pro, Single Pack, Launch Bundle
- Pro monthly/annual prices identical across all locales (no price drift)
- Feature counts match (6/9/9/7/7 features per plan in all locales)
- 7 FAQ questions and answers present in all locales
- Placeholder variables `{freeIconsAcrossLibraries}` and `{mcpServerFreeIcons}` present in all locales
- `save45`/`save28`/`mostPopular` strings are correctly localized (differ from English as expected)
- Plan names, CTAs, and descriptions are localized; product names such as `Pro` and `Launch` are intentionally retained where appropriate

---

## Locales/Pages with No Issues

| Locale | Terms | Privacy | Pricing |
|--------|-------|---------|---------|
| **es** (Spanish) | No structural or obvious leakage issues | No structural or obvious leakage issues | No structural or obvious leakage issues |
| **de** (German) | No structural or obvious leakage issues | No structural or obvious leakage issues | No structural or obvious leakage issues |
| **pt** (Portuguese) | No structural or obvious leakage issues | No structural or obvious leakage issues | No structural or obvious leakage issues |
| **vi** (Vietnamese) | No structural or obvious leakage issues | No structural or obvious leakage issues | No structural or obvious leakage issues |
| **ko** (Korean) | No structural or obvious leakage issues | No structural or obvious leakage issues | No structural or obvious leakage issues |

---

## Verified Facts vs. Assumptions

### Verified (script-audited)
- Section count, paragraph count, heading count, heading tags: identical across all locales for Terms and Privacy
- Feature count (pipe-delimited strings): identical across all locales for all pricing plans
- FAQ Q&A counts: identical (7 each) across all locales
- Price values (monthlyPrice, annualPrice, etc.): identical across all locales
- Placeholder variables: present in all locales
- `data/` and `public/` locale JSON files: byte-identical
- Page title and nav labels: present and translated in all locales
- Date format: localized in all non-English locales (e.g., "2026年4月8日" for ja, "8 अप्रैल 2026" for hi)

### Assumptions (not independently verified)
- Translation semantic accuracy (meaning faithfulness) was checked only for English-word leakage patterns; full human review recommended for nuanced legal meaning
- "cookie" retention in CJK/Hindi locales may be an intentional localization choice (common in tech)
- Hindi code-switching (English technical terms in Hindi sentences) is common in Indian tech content and may be partially intentional, but the extent found here (18+ terms) suggests incomplete translation rather than stylistic code-switching

---

## Evidence / Commands Run

All findings were generated by automated audit scripts comparing each locale JSON against the English source. The following files were inspected:

- `data/i18n/messages/en.json` (source of truth)
- `data/i18n/messages/{ar,de,es,hi,ja,ko,pt,th,vi,zh-Hans,zh-Hant}.json` (all 11 non-English locales)
- `store.js` (page rendering components — confirmed English fallbacks exist for Terms/Privacy)
- `lib/i18n/translate.js` (translation resolver logic)
- `lib/view-route-policy.js` (route definitions for terms/privacy/pricing)
- `public/i18n/messages/` (confirmed parity with `data/`)

Audit scripts executed (temp files, not persisted):
- Structural: section/heading/paragraph/link counts
- Pricing: plan field presence, price values, feature pipe-count, FAQ pipe-count, placeholder variables
- Content: Latin-character extraction in non-Latin locales, allowed-noun whitelist filtering
- Parity: byte-comparison between `data/` and `public/` directories
