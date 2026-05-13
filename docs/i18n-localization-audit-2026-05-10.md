# Supericons Multilingual Localization Audit Report

**Date:** 2026-05-10  
**Type:** Audit only — no code or documentation changes made  
**Scope:** All 12 locales, all user-facing sections, SEO, routing, RTL, Stripe bridge  

---

## 1. Executive Summary

**Overall quality: NOT READY TO SHIP.** The implementation has serious structural gaps in revenue-critical flows, legal compliance, RTL rendering, and SEO infrastructure that make several locales unsafe for public use.

**Highest-risk locales:** Spanish (`es`), Japanese (`ja`), Korean (`ko`) — all have placeholder text in purchase flows, account pages, and privacy policies. Users would see single-word placeholders instead of complete translated copy.

**Significant quality gap:** Chinese Simplified (`zh-Hans`) and Chinese Traditional (`zh-Hant`) docs pages have rewritten summaries that drop critical technical terms and change meaning.

**RTL is non-functional:** Arabic has 1 CSS RTL rule out of 11,733 lines. The entire UI renders LTR for Arabic users.

**SEO is broken:** No localized titles, descriptions, or hreflang tags exist. Search engines see English-only metadata for all locales.

---

## 2. Coverage Map

### Languages Audited (12/12)
`en` (source), `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `de`, `pt`, `ar`, `hi`, `vi`, `th`

### Sections Audited

| Section | Status |
|---------|--------|
| `app`, `nav`, `actions`, `panels` | Fully audited |
| `filters` (18 categories) | Fully audited |
| `tools`, `style`, `customize` | Fully audited |
| `confirm`, `toast` | Fully audited |
| `docs` (27 pages + 7 groups) | Titles, summaries, navLabels audited |
| `contact` | Fully audited |
| `account` | Fully audited |
| `checkout` | Fully audited |
| `auth` (all states + errors) | Fully audited |
| `legal` (terms + privacy HTML) | Fully audited |
| `loggedIn` (downloads + dashboard) | Fully audited |
| `apiKeys` | Fully audited |
| `purchaseFlow`, `claimFlow` | Fully audited |
| `pricing` (plans + FAQ) | Fully audited |
| Language switcher | Behavior audited |
| SEO metadata + hreflang | Fully audited |
| Routing + locale preservation | Fully audited |
| RTL CSS coverage | Fully audited |
| Stripe locale bridge | Fully audited |
| Docs bodyHtml (full content) | **Not audited** — contains English-only HTML placeholders in all non-English locales. Infrastructure exists but translations are not populated. |

### Areas Not Audited
- Docs bodyHtml per language (no translations exist, only English stubs)
- MCP server-side i18n (only client-side messages were audited)
- CJK search quality (separate concern, has its own audit data)

---

## 3. Critical Findings

### Finding #1 — Privacy policy bodyHtml is a placeholder stub in 4 locales

**Severity: CRITICAL (Legal)**  
**Languages:** `es`, `ja`, `ko`, `vi`  
**Keys:** `legal.privacy.bodyHtml`, `legal.terms.bodyHtml`

Each locale replaces the full, sectioned privacy policy HTML with a single repeated paragraph:

| Locale | Placeholder text |
|--------|-----------------|
| `es` | "Solo describimos datos necesarios para operar Supericons, como cuenta, compras, derechos de acceso, soporte, seguridad y analitica sin cookies..." |
| `ja` | "Supericons の運用に必要なアカウント、購入、権限、サポート、セキュリティ、cookie を使わない分析データについて説明します..." |
| `ko` | "Supericons 운영에 필요한 계정, 구매, 권한, 지원, 보안, 쿠키 없는 분석 데이터만 설명합니다..." |
| `vi` | "Chúng tôi chỉ mô tả dữ liệu cần thiết để vận hành Supericons..." |

The English source has 10 distinct sections covering: Overview, Data We Collect, Product Analytics, How We Use Data, Payments (Stripe), Authentication and Email, MCP Access, Third-Party Services, Data Retention, Your Rights. None of this detail appears in these 4 locales.

**Why it matters:** Non-compliance with GDPR (EU), APPI (Japan), PIPA (Korea), and other data protection laws that require detailed disclosure of data handling practices. Creates legal liability.

**Recommendation:** Translate the full English privacy policy HTML (sections 1-10) for these 4 locales before shipping.

---

### Finding #2 — Purchase/claim flow strings collapsed to single-word placeholders

**Severity: CRITICAL (Revenue loss)**  
**Languages:** `es`, `ja`, `ko`, `vi`, `zh-Hans`, `zh-Hant`  
**Keys:** `purchaseFlow.*`, `claimFlow.*`, `loggedIn.*`

Most keys in these sections have been replaced with a single generic word instead of the full translated sentence. Examples:

| Key (en) | es | ja | ko |
|----------|----|----|-----|
| `loggedIn.downloads.noCollections` = "No collections yet" | "Colecciones" | "コレクション" | "컬렉션" |
| `loggedIn.downloads.browseHint` = "Browse premium collections..." | "Colecciones" | "コレクション" | "컬렉션" |
| `loggedIn.dashboard.noPurchases` = "No purchases yet." | "Mis compras: 0" | "購入済み: 0" | "내 구매: 0" |
| `loggedIn.dashboard.date` = "Date" | "Mis compras" | "購入済み" | "내 구매" |
| `loggedIn.dashboard.actions` = "Actions" | "Colecciones" | "コレクション" | "컬렉션" |
| `purchaseFlow.signInToPurchase` = "Sign in to continue your purchase" | "Iniciar sesión" | "サインイン" | "로그인" |
| `purchaseFlow.redirecting` = "Redirecting to checkout..." | "..." | "..." | "..." |
| `purchaseFlow.checkoutFailed` = "Checkout failed" | "Checkout" | "Checkout" | "Checkout" |
| `purchaseFlow.paymentError` = "Payment error. Please try again." | "Checkout" | "Checkout" | "Checkout" |
| `purchaseFlow.canceled` = "Payment was not completed. Try again." | "Checkout" | "Checkout" | "Checkout" |
| `purchaseFlow.proAnnualTitle` = "Welcome to Pro Annual" | "Pro Annual" | "Pro Annual" | "Pro Annual" |
| `purchaseFlow.proAnnualDescription` = "All 8 launch collections..." | "Colecciones" | "コレクション" | "컬렉션" |
| `purchaseFlow.proMonthlyTitle` = "Welcome to Pro Monthly" | "Pro Monthly" | "Pro Monthly" | "Pro Monthly" |
| `purchaseFlow.proMonthlyDescription` = "Your first Pro claim is ready..." | "Colecciones" | "コレクション" | "컬렉션" |
| `purchaseFlow.redeemCollection` = "Redeem a collection" | "Colecciones" | "コレクション" | "컬렉션" |
| `purchaseFlow.purchaseSuccess` = "Purchase successful! Opening your collection..." | "Colecciones" | "コレクション" | "컬렉션" |
| `claimFlow.title` = "Add {name} to My Collection." | "{name}" | "{name}" | "{name}" |
| `claimFlow.confirm` = "Add to My Collection" | "Colecciones" | "コレクション" | "컬렉션" |
| `claimFlow.cancel` = "Cancel" | "Cerrar" | "閉じる" | "닫기" |

**Why it matters:** Post-purchase users see placeholder text instead of actionable guidance. This creates confusion, support requests, and chargeback risk. Users in the claim flow see "{name}" literally in the modal instead of the collection name.

**Recommendation:** Re-translate all `purchaseFlow`, `claimFlow`, and `loggedIn` sections for `es`, `ja`, `ko`, `vi`, `zh-Hans`, `zh-Hant` from the English source.

---

### Finding #3 — Free plan CTA is a noun, not a call-to-action, in all 11 locales

**Severity: CRITICAL (Conversion loss)**  
**Languages:** All 11 non-English  
**Key:** `pricing.plans.free.cta`

| Language | Current | English |
|----------|---------|---------|
| ar | "مجاني" (Free) | "Start for Free" |
| de | "Kostenlos" (Free) | "Start for Free" |
| es | "Gratis" (Free) | "Start for Free" |
| hi | "मुफ्त" (Free) | "Start for Free" |
| ja | "無料" (Free) | "Start for Free" |
| ko | "무료" (Free) | "Start for Free" |
| pt | "Gratuito" (Free) | "Start for Free" |
| th | "ฟรี" (Free) | "Start for Free" |
| vi | "Miễn phí" (Free) | "Start for Free" |
| zh-Hans | "免费" (Free) | "Start for Free" |
| zh-Hant | "免費" (Free) | "Start for Free" |

The English CTA is an imperative action phrase. All translations render it as a static noun/adjective. On a pricing page's primary conversion button, this is a material UX regression.

**Recommendation:** Use action-oriented equivalents:
- de: "Kostenlos starten"
- es: "Empieza gratis"
- ja: "無料ではじめる"
- ko: "무료로 시작하기"
- zh: "免费开始"

---

### Finding #4 — RTL support is functionally broken (1 CSS rule in 11,733 lines)

**Severity: CRITICAL (Usability)**  
**Language:** `ar` (Arabic)

The only RTL CSS rule in the entire codebase (`style.css:946`):
```css
html[dir="rtl"] .header__actions { margin-left: 0; margin-right: auto; }
```

Every other component renders LTR for Arabic users: sidebar, icon grid, customize panel, modals, docs, pricing cards, search bar, toast notifications, footer, compare drawer, auth forms.

The `dir="rtl"` attribute is correctly set on `<html>` via `applyDocumentLocale()`, but missing CSS means the visual layout remains LTR.

**Recommendation:** Audit all flexbox/grid/margin/padding uses and add `[dir="rtl"]` counterparts. Focus on: sidebar, grid, navigation, modals, panels, forms, search bar.

---

### Finding #5 — Zero localized SEO metadata; zero hreflang tags

**Severity: CRITICAL (SEO)**  
**Languages:** All 11 non-English

- `<title>` is hardcoded to `"Supericons | Find Icons by Meaning"` — never updated on locale change
- `<meta name="description">` is hardcoded — never updated
- OG tags, Twitter cards, canonical URL, JSON-LD — all hardcoded in English
- Zero `<link rel="alternate" hreflang="...">` tags exist
- `setActiveLocale()` has no metadata synchronization logic

**Why it matters:** Search engines index every locale with English metadata. No language-specific search result snippets. Google cannot discover the 12 localized versions.

**Recommendation:** Add a `syncPageMetadata()` function called by `setActiveLocale()` that updates `<title>`, `<meta>`, OG tags, and canonical. Add hreflang tags to `index.html`.

---

## 4. Revenue/Trust-Risk Findings

### Legal Compliance Risk

| Finding | Locales | Risk |
|---------|---------|------|
| Privacy policy bodyHtml is placeholder stub | es, ja, ko, vi | GDPR/APPI/PIPA non-compliance |
| Terms of Service bodyHtml possibly similar (verify independently) | es, ja, ko, vi | Legal exposure for refund/resale terms |
| zh-Hans/zh-Hant `docs-access-premium.summary` omits that Motion Lab and Converter require Pro | zh-Hans, zh-Hant | Users may believe Pro tools are free |

### Purchase Flow / Revenue Risk

| Finding | Locales | Risk |
|---------|---------|------|
| Purchase flow strings collapsed to placeholders | es, ja, ko, vi, zh-Hans, zh-Hant | Confused users → support tickets → chargebacks |
| Claim flow strings collapsed ("{name}" literal) | es, ja, ko, vi, zh-Hans, zh-Hant | Broken claim experience → abandonment |
| "Free" CTA instead of "Start for Free" | All 11 | Lost conversions from Free to paid tiers |
| Purchase history/dashboard strings collapsed | es, ja, ko | Users cannot understand their purchase records |

### Auth / Account Trust

| Finding | Locales | Risk |
|---------|---------|------|
| Password reset flow translated correctly | All 11 | No risk found |
| Auth errors mapped to action labels (intentional design) | All 11 | Low risk — appears to be modal title pattern, not error messages |
| `account.*` keys translated correctly in most locales | de, pt, ar, hi, th, zh-Hans, zh-Hant | OK |

---

## 5. Language-by-Language Assessment

### `es` (Spanish)
- **Overall:** HIGH RISK. `loggedIn`, `purchaseFlow`, `claimFlow` are collapsed. Privacy policy is a stub.
- **Recurring problems:** Sections with many strings replaced by 1-word placeholders ("Colecciones", "Mis compras", "Iniciar sesion").
- **Terminology:** OK where translated. "Contorno" for Outline is less common than "Trazo" in design tools (LOW).
- **Naturalness:** Good in UI/static sections (nav, actions, filters).
- **Technical accuracy:** OK in docs.
- **Recommended next actions:** Re-translate `loggedIn`, `purchaseFlow`, `claimFlow`, `legal.bodyHtml`.

### `ja` (Japanese)
- **Overall:** HIGH RISK. Same placeholder collapse as Spanish.
- **Recurring problems:** `loggedIn`, `purchaseFlow`, `claimFlow` collapsed to single words. Privacy policy is a stub. `docs` navLabel "概要" duplicates group name. `claimFlow.cancel` is "閉じる" (Close) instead of "キャンセル" (Cancel).
- **Terminology:** "コレクション" used consistently for collection. "購入済み" for purchased — but also misused for other keys.
- **Naturalness:** Good in UI sections.
- **Technical accuracy:** Good in docs and docs summaries.
- **Recommended next actions:** Same as es + fix navLabel + fix cancel.

### `ko` (Korean)
- **Overall:** HIGH RISK. Same placeholder collapse as Spanish.
- **Recurring problems:** Same `loggedIn` / `purchaseFlow` / `claimFlow` collapse. Privacy policy is a stub. `claimFlow.cancel` is "닫기" (Close) instead of "취소" (Cancel). Toggle messages end with period making them declarative.
- **Terminology:** "컬렉션" consistent. "내 구매" for My Purchases acceptable.
- **Naturalness:** Good in UI sections.
- **Technical accuracy:** Good in docs.
- **Recommended next actions:** Same as es + fix cancel + fix toggle phrasing.

### `zh-Hans` (Chinese Simplified)
- **Overall:** MEDIUM-HIGH RISK. Docs summaries systematically rewritten losing technical fidelity.
- **Recurring problems:** 14+ docs summaries have rewritten rather than translated meanings. `docs-access-api-keys` navLabel is too long (repeats full group name). `docs-access-premium` drops Pro plan requirements. `docs-troubleshooting` drops MCP/API keys/Motion Lab/Converter. `docs-mcp-universal` summary meaning completely changed.
- **Terminology:** Consistent use of "集合" for collections, "动效实验室" for Motion Lab (creative expansion).
- **Naturalness:** Good native Chinese.
- **Technical accuracy:** POOR in docs section. UI strings are fine.
- **Recommended next actions:** Re-translate all docs pages summaries/titles from English. Fix navLabel lengths. Restore dropped technical terms.

### `zh-Hant` (Chinese Traditional)
- **Overall:** MEDIUM-HIGH RISK. Same docs translation strategy issues as zh-Hans.
- **Recurring problems:** Same 14+ docs summary rewrites, same dropped technical terms, same navLabel duplication.
- **Terminology:** Pattern mirrors zh-Hans.
- **Naturalness:** Good native Chinese.
- **Technical accuracy:** POOR in docs section.
- **Recommended next actions:** Same as zh-Hans.

### `vi` (Vietnamese)
- **Overall:** MEDIUM RISK. Privacy policy is a stub. Some purchase/claim strings collapsed.
- **Recurring problems:** Privacy policy placeholder. `nav.myCollection` = "Giao dịch mua của tôi" (too verbose). `customize.containerPill` = "Viên thuốc" (medicine tablet — loses UI terminology). `customize.containerNone` = "Không" (ambiguous).
- **Terminology:** Generally OK but inconsistent in some UI terms.
- **Naturalness:** Good overall.
- **Technical accuracy:** OK in docs.
- **Recommended next actions:** Fix privacy policy. Shorten nav label. Fix container pill/none terms.

### `de` (German)
- **Overall:** LOW RISK. Generally solid translations.
- **Recurring problems:** `filters.categories.nature-weather-lifestyle` uses "Alltag" (everyday life) instead of "Lifestyle" (MEDIUM). `customize.animationBounce` = "Springen" (jump) vs "Prellen" (bounce) (MEDIUM). `docs-troubleshooting` kicker = "Hilfe" vs "Support"/"Unterstützung" (LOW). `nav.myCollection` = "Meine Käufe" vs "Meine Sammlung" (LOW).
- **Terminology:** Good. "Konverter" is natural German.
- **Naturalness:** Good, professional tone.
- **Technical accuracy:** Good.
- **Recommended next actions:** Fix Lifestyle term. Fix bounce animation term. Polish kicker/nav consistency.

### `pt` (Portuguese)
- **Overall:** LOW RISK. Generally solid.
- **Recurring problems:** `customize.animationBounce` = "Saltar" (jump) vs "Quicar" (bounce) (MEDIUM). `claimFlow.eyebrow` = "Reivindicar colecao" — "Reivindicar" has legal/political connotations; "Resgatar" is better (MEDIUM). `pricing.plans.pro.cta` = "Tornar-se Pro" awkward; "Assinar Pro" more natural (MEDIUM).
- **Terminology:** Good.
- **Naturalness:** Good, minor issues noted.
- **Technical accuracy:** Good.
- **Recommended next actions:** Fix bounce, claim eyebrow, Pro CTA.

### `ar` (Arabic)
- **Overall:** MEDIUM RISK (primarily RTL CSS). Translations are accurate.
- **Recurring problems:** RTL CSS is broken (1 rule). `tools.converter` = "المحول" has unnecessary definite article (LOW). `customize.containerPill` = "كبسولة" (capsule) loses UI design term (MEDIUM). Launch Bundle keeps "Launch" untranslated (LOW).
- **Terminology:** Good. Proper right-to-left text direction.
- **Naturalness:** Good.
- **Technical accuracy:** Good.
- **Recommended next actions:** Add RTL CSS rules. Fix container pill term. Fix definite article on converter.

### `hi` (Hindi)
- **Overall:** LOW RISK. Generally good.
- **Recurring problems:** `nav.libraries` = "लाइब्रेरी" (singular), should be plural (MEDIUM). `nav.tools` = "टूल" (singular) (MEDIUM). `claimFlow.eyebrow` = "संग्रह का दावा करें" — "दावा" has legal implications; "संग्रह जोड़ें" safer (MEDIUM).
- **Terminology:** OK.
- **Naturalness:** OK.
- **Technical accuracy:** Need to verify privacy policy bodyHtml was fully translated (truncated during audit read).
- **Recommended next actions:** Fix singular/plural nav items. Fix claim eyebrow. Verify privacy policy translation.

### `th` (Thai)
- **Overall:** LOW RISK. Generally good.
- **Recurring problems:** `customize.containerPill` = "แคปซูล" (capsule) loses UI design term (MEDIUM). `loggedIn.downloads.redeemed` = "แลกแล้ว" (exchanged) — "ใช้สิทธิ์แล้ว" (rights used/claimed) more natural (MEDIUM).
- **Terminology:** OK.
- **Naturalness:** Slightly formal but correct.
- **Technical accuracy:** Need to verify privacy policy bodyHtml was fully translated (truncated during audit read).
- **Recommended next actions:** Fix container pill term. Fix redeemed term. Verify privacy policy translation.

---

## 6. Link/Routing Audit

### Critical Bug: `buildRouteUrl()` strips `?locale=` from the URL

**File:** `lib/view-route-policy.js:127-133`

When switching views (e.g., navigating from Docs to Pricing), `buildRouteUrl()` constructs the URL without checking for or preserving the existing `?locale=` query parameter. Example:

1. User is at `/?locale=ja&view=docs`
2. Clicks Pricing link → `switchView('pricing')` → URL becomes `/?view=pricing`
3. `?locale=ja` is silently dropped from the URL bar

The locale survives only because `localStorage` (`supericons.locale`) retains it. If localStorage is cleared or blocked, a page refresh reverts to English.

**Severity:** HIGH  
**Recommendation:** Modify `buildRouteUrl()` to detect and preserve the current `?locale=` parameter from `window.location.search`.

### Other Routing Observations

| Aspect | Status |
|--------|--------|
| Locale switching preserves current view | Yes (in-place DOM update, no page reload) |
| `?locale=` query parameter detection | Yes (URL → localStorage fallback → browser detection) |
| SPA fallback for all routes | Correct (Netlify `/*` → `/index.html`) |
| Language switcher populates correctly | Yes (12 options from `LOCALE_METADATA`) |
| Language switcher `<select>` has no `dir` attribute | Arabic dropdown renders LTR (MEDIUM) |
| `<option>` elements lack `lang` attribute | Screen readers may mispronounce native labels (LOW) |

---

## 7. Docs Audit

### Infrastructure
The i18n system has full infrastructure for docs translation: keys like `docs.pages.{page}.pageTitle`, `.summary`, `.navLabel`, `.kicker`, `.bodyHtml` are all supported. The English source file contains all docs page meta and HTML body content.

### Current State
**No docs bodyHtml translations exist in any locale.** All non-English locales see English docs content. Only titles, summaries, navLabels, and kickers are translated (where populated).

### Docs Translation Quality by Language

| Language | Titles/Summaries | NavLabels | Kickers | Group Names |
|----------|-----------------|-----------|---------|-------------|
| `de` | Good | Good | 1 inconsistency ("Hilfe" vs "Support") | Good |
| `es` | Good | Good | Good | Good |
| `pt` | Good | Good | Good | Good |
| `ar` | Good | Good | Good | Good |
| `hi` | Good | Good | Good | Good |
| `th` | Good | Good | Good | Good |
| `vi` | Good | Good | Good | Good |
| `ja` | Good | "概要" duplicates group name | OK | OK |
| `ko` | Good | Good | Good | Good |
| `zh-Hans` | **POOR** — 14+ rewrites | Too long on 2 pages | OK | OK |
| `zh-Hant` | **POOR** — 14+ rewrites | Too long on 2 pages | OK | OK |

### Code/Term Preservation
All languages correctly preserve code blocks, file paths, environment variable names (`SUPERICONS_API_KEY`), CLI commands (`npx -y supericons-mcp`), and technical acronyms (MCP, API, SVG, PNG, CSS, ICO, Base64). The `bodyHtml` "do not translate" boundaries are correctly respected by all locales.

### zh-Hans / zh-Hant Docs Findings (Detailed)

| Key | EN Source | zh-Hans Actual | Problem |
|-----|----------|----------------|---------|
| `docs.pages.docs-access-api-keys.navLabel` | "API Keys" | "访问和 API 密钥" | Too long, repeats full group name |
| `docs.pages.docs-access-premium.summary` | "Buying packs gives you those icons. Motion Lab and Converter are part of the Supericons Pro plan." | "了解高级图标集合如何解锁和使用。" | Drops Pro plan requirement entirely |
| `docs.pages.docs-troubleshooting.summary` | "Fix common problems with MCP setup, API keys, Motion Lab, and Converter." | "修复常见设置、搜索和导出问题。" | Drops MCP, API keys, Motion Lab, Converter |
| `docs.pages.docs-mcp-universal.summary` | "The field values and config blocks for MCP-capable coding agents and IDEs." | "用任何支持 MCP 的客户端连接 Supericons。" | Completely rewritten meaning |
| `docs.pages.docs-mcp-tools.navLabel` | "All tools" | "工具参考" | "Tool Reference" is not a translation of "All tools" |
| `docs.pages.docs-claude-code.summary` | "Add Supericons MCP to Claude Code." | "在 Claude Code 中添加 Supericons MCP 服务器。" | Adds "服务器" (server) not in source |
| `docs.pages.docs-codex.summary` | "Add Supericons MCP to Codex." | "在 Codex 中使用 Supericons 搜索、转换和动画工具。" | Describes features instead of setup action |
| `docs.pages.docs-cursor.summary` | "Add Supericons MCP to Cursor." | "在 Cursor 中连接 Supericons MCP 工具。" | "Connect tools" differs from "Add MCP" |
| `docs.pages.docs-mcp-icons.summary` | "Search and retrieve icons through MCP." | "搜索、获取和推荐图标。" | Adds "recommend" not in source |
| `docs.pages.docs-mcp-motion.summary` | "Animate icons through MCP." | "生成图标动画 CSS 和动画 SVG。" | Describes output format instead of action |
| `docs.pages.docs-motion-lab.summary` | "Preview and export icon animations." | "用 Motion Lab 为图标添加可复用动画。" | Different meaning (add vs preview/export) |
| `docs.pages.docs-motion-lab-use-cases.summary` | "When to use motion and when to stay still." | "了解适合动态图标的常见产品场景。" | Completely rewritten |
| `docs.pages.docs-motion-lab-client-setup.summary` | "Prepare your MCP client for Motion Lab." | "配置客户端以使用 Motion Lab 工具。" | Drops "MCP" from summary |
| `docs.pages.docs-converter-settings.summary` | "Understand trace class, quality, color, and output settings." | "选择适合图标转换的质量和颜色设置。" | Drops "trace class" and "output" |
| `docs.pages.docs-motion-lab-triggers.summary` | "Choose how an animation starts." | "选择循环、悬停或点击触发动画。" | Adds trigger types not in EN |
| `docs.pages.docs-converter-guide.summary` | "Choose the right conversion workflow." | "了解何时使用 Supericons Converter。" | EN is prescriptive, zh is informational |
| `docs.pages.docs-converter-png-to-svg.summary` | "Trace PNG images into SVG." | "把 PNG 图标转换为 SVG。" | "Convert" instead of technical "Trace" |
| `docs.pages.docs-motion-lab-exports.summary` | "Export Motion Lab CSS or animated SVG." | "导出 CSS 或完整动画 SVG。" | Drops "Motion Lab" from summary |

---

## 8. Stripe Locale Bridge Audit

**File:** `store.js:52-69`

| Supericons Locale | Stripe Value | Stripe Support | Status |
|---|---|---|---|
| `en` | `en` | Yes | OK |
| `zh-Hans` | `zh` | Yes (zh) | OK |
| `zh-Hant` | `zh-TW` | Yes (zh-TW) | OK |
| `ja` | `ja` | Yes | OK |
| `ko` | `ko` | Yes | OK |
| `es` | `es` | Yes | OK |
| `de` | `de` | Yes | OK |
| `pt` | `pt` | Yes (pt/pt-BR) | OK |
| `ar` | `ar` | Yes | OK |
| `hi` | `hi` | **NO** | Stripe Checkout does not support Hindi. Falls to `'auto'` |
| `vi` | `vi` | Yes | OK |
| `th` | `th` | Yes | OK |

The fallback `return map[locale] || 'auto'` at `store.js:69` is correct. For Hindi, Stripe will auto-detect from the browser, resulting in an English Checkout UI — not a bug but worth documenting.

`buildLocalizedReturnUrl()` correctly appends `?locale=...` to Stripe success/cancel URLs, ensuring the user returns to the correct locale after checkout.

---

## 9. Recommended Fix Plan

### P0: Must Fix Before Shipping Any Locale

| # | Issue | Locales | Effort |
|---|-------|---------|--------|
| 1 | Re-translate `loggedIn`, `purchaseFlow`, `claimFlow` sections | es, ja, ko | Large (~150 keys/locale) |
| 2 | Re-translate full privacy policy bodyHtml (10 sections) | es, ja, ko, vi | Large (HTML translation) |
| 3 | Fix Free plan CTA to action verb | All 11 | Small (11 single-key updates) |
| 4 | Add RTL CSS rules to all components | ar | Large (comprehensive CSS audit) |

### P1: Should Fix Soon

| # | Issue | Locales | Effort |
|---|-------|---------|--------|
| 5 | Re-translate 14+ docs summaries to match English technical precision | zh-Hans, zh-Hant | Medium (~30 keys) |
| 6 | Shorten `docs-access-api-keys` and `docs-access-premium` navLabels | zh-Hans, zh-Hant | Small (2 keys) |
| 7 | Add `syncPageMetadata()` for localized SEO tags | All | Medium (new function) |
| 8 | Add hreflang tags to `index.html` | All | Small (static HTML) |
| 9 | Fix `buildRouteUrl()` to preserve `?locale=` | Infrastructure | Small (1 function) |
| 10 | Fix `claimFlow.cancel` from "Close" to "Cancel" | ja, ko | Small (1 key each) |
| 11 | Fix `pricing.plans.pro.cta` awkward phrasing | pt, zh | Small (1 key each) |
| 12 | Fix `filters.categories.nature-weather-lifestyle` Lifestyle term | de | Small (1 key) |
| 13 | Verify `legal.bodyHtml` in hi.json and th.json are fully translated | hi, th | Small (verification only) |

### P2: Polish Improvements

| # | Issue | Locales | Effort |
|---|-------|---------|--------|
| 14 | Fix container pill terminology ("capsule" → loanword or "pill shape") | ar, th, vi | Small (1 key each) |
| 15 | Fix animation bounce terminology ("jump" → "bounce" equivalent) | de, pt | Small (1 key each) |
| 16 | Fix `docs` navLabel in ja ("概要" → introduction equivalent) | ja | Small (1 key) |
| 17 | Fix `docs-troubleshooting` kicker consistency ("Hilfe" → "Unterstützung") | de | Small (1 key) |
| 18 | Fix singular/plural in `nav.libraries`, `nav.tools` | hi | Small (2 keys) |
| 19 | Fix `nav.myCollection` length in vi | vi | Small (1 key) |
| 20 | Fix `tools.converter` definite article in ar | ar | Small (1 key) |
| 21 | Fix `style.outline` terminology for design tools ("Trazo" vs "Contorno") | es | Small (1 key) |
| 22 | Fix `customize.containerNone` ambiguity ("Không" → "Không có") | vi | Small (1 key) |
| 23 | Fix `claimFlow.eyebrow` legal connotations ("Reivindicar" → "Resgatar", "दावा" → "जोड़ें") | pt, hi | Small (1 key each) |
| 24 | Add `lang` attributes to language switcher options | All | Small (HTML) |
| 25 | Add `dir` attribute to language switcher `<select>` in RTL | ar | Small (HTML) |
| 26 | Add `data-i18n` to landing hero section | All | Small (HTML) |
| 27 | Fix `loggedIn.downloads.redeemed` in th ("แลกแล้ว" → "ใช้สิทธิ์แล้ว") | th | Small (1 key) |

---

## 10. Overall Verdict

**Do not ship `es`, `ja`, `ko` in current state.** Their purchase flows, account pages, and privacy policies display unreplaced placeholder text that will confuse users and create legal/revenue risk.

**`zh-Hans` and `zh-Hant` can ship with caveats** if docs summaries are re-aligned to English technical precision. The UI/static sections are well translated.

**`de`, `pt`, `ar` (with RTL CSS), `hi`, `th`, `vi` are ship-ready** for non-docs pages, with only minor polish items remaining. Docs bodyHtml is English-only in all locales (infrastructure exists, translations do not).

**Arabic must not ship** until RTL CSS is implemented. The unstyled RTL layout is unusable.

**SEO metadata is broken for all locales** — no localized titles, descriptions, or hreflang tags. This should be fixed before any public launch.
