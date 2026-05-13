# Supericons i18n Comprehensive Audit Report

**Date:** May 10, 2026  
**Scope:** All 12 locale files across all namespaces  

## Languages Audited

| Code | Language | Native Label |
|---|---|---|
| `en` | English | English |
| `zh-Hans` | Chinese (Simplified) | 简体中文 |
| `zh-Hant` | Chinese (Traditional) | 繁體中文 |
| `ja` | Japanese | 日本語 |
| `ko` | Korean | 한국어 |
| `es` | Spanish | Español |
| `de` | German | Deutsch |
| `pt` | Portuguese | Português |
| `ar` | Arabic | العربية |
| `hi` | Hindi | हिन्दी |
| `vi` | Vietnamese | Tiếng Việt |
| `th` | Thai | ไทย |

## Namespaces Audited

`app`, `nav`, `actions`, `panels`, `filters`, `tools`, `style`, `customize`, `confirm`, `toast`, `docs`, `contact`, `account`, `checkout`, `auth`, `legal`, `loggedIn`, `apiKeys`, `purchaseFlow`, `claimFlow`, `pricing`

---

## CRITICAL FINDINGS (Detrimental to Supericons & Users)

### 1. `docs-mcp-others` page — Untranslated English in 6 languages

**Affected:** `de`, `pt`, `ar`, `hi`, `vi`, `th`  
**Key:** `docs.pages.docs-mcp-others.navLabel`  
**English value leaked:** `"Other MCP clients"` appears as the navLabel in all 6 languages instead of being translated.

- `de:229` — `"Other MCP clients"` (should be "Andere MCP-Clients")
- `pt:229` — `"Other MCP clients"` (should be "Outros clientes MCP")
- `ar:229` — `"Other MCP clients"` (should be "عملاء MCP آخرون")
- `hi:229` — `"Other MCP clients"` (should be "अन्य MCP क्लाइंट")
- `vi:229` — `"Other MCP clients"` (should be "Khác MCP clients" or similar)
- `th:229` — `"Other MCP clients"` (should be "ไคลเอนต์ MCP อื่น ๆ")

**Impact:** Users see English in the docs sidebar navigation for these languages.

---

### 2. `docs-access-premium` summary — Spanish text leaked into 7 languages

**Affected:** `de`, `pt`, `ar`, `hi`, `vi`, `th`  
**Key:** `docs.pages.docs-access-premium.summary`  
**Spanish value leaked:** `"Comprar packs te da esos iconos. Motion Lab y Converter forman parte del plan Supericons Pro."` appears in `de`, `pt`, `ar`, `hi`, `vi`, `th` files (lines 358).

- `de:358` — Spanish summary in German file
- `pt:358` — Spanish summary in Portuguese file
- `ar:358` — Spanish summary in Arabic file
- `hi:358` — Spanish summary in Hindi file
- `vi:358` — Spanish summary in Vietnamese file
- `th:358` — Spanish summary in Thai file

**Impact:** Users reading docs in these languages see Spanish text for the "Pro and Collections" page summary. This is confusing and misrepresents the content.

---

### 3. `docs-motion-lab` summary — Spanish text leaked into 8 languages

**Affected:** `de`, `pt`, `ar`, `hi`, `vi`, `th` (and possibly others)  
**Key:** `docs.pages.docs-motion-lab.summary`  
**Spanish value leaked:** `"Previsualiza y exporta animaciones de iconos."` appears in German, Portuguese, Arabic, Hindi, Vietnamese, Thai files (lines 274).

**Impact:** Same as above — users see Spanish in non-Spanish locales.

---

### 4. `docs-troubleshooting` summary — Spanish text leaked into 8 languages

**Affected:** `de`, `pt`, `ar`, `hi`, `vi`, `th`  
**Key:** `docs.pages.docs-troubleshooting.summary`  
**Spanish value leaked:** `"Corrige problemas comunes con la configuración de MCP, claves API, Motion Lab y Converter."` appears in these files (lines 365).

**Impact:** Users see Spanish troubleshooting description in their native language docs.

---

### 5. `confirm` namespace — Untranslated English in ALL non-English locales

**Affected:** ALL 11 non-English locales  
**Keys:** `confirm.clearFavoritesDescription`, `confirm.clearRecentDescription`, `confirm.clearItemsDescription`, `confirm.thisDevice`, `confirm.browserStorageOnly`  
**English values leaked:** All 5 values remain in English across every non-English locale.

- `zh-Hans:145-150` — English confirmation descriptions
- `zh-Hant:145-150` — English confirmation descriptions
- `ja:145-150` — English confirmation descriptions
- `ko:145-150` — English confirmation descriptions
- `es:145-150` — English confirmation descriptions
- `de:145-150` — English confirmation descriptions
- `pt:145-150` — English confirmation descriptions
- `ar:145-150` — English confirmation descriptions
- `hi:145-150` — English confirmation descriptions
- `vi:145-150` — English confirmation descriptions
- `th:145-150` — English confirmation descriptions

**Impact:** Confirmation dialogs shown when clearing favorites/recent/items display English text to non-English users. This is user-facing and could cause confusion about what data is being deleted.

---

### 6. `toast` namespace — Untranslated English in ALL non-English locales

**Affected:** ALL 11 non-English locales  
**Keys:** `toast.favoritesCleared`, `toast.recentCleared`  
**English values leaked:** Both toast messages remain in English across every non-English locale.

**Impact:** Toast notifications after clearing favorites/recent show English text.

---

## HIGH SEVERITY FINDINGS

### 7. `de` (German) — `apiKeys` namespace is almost entirely placeholder/fallback

**Affected:** `de` only  
**Keys:** Nearly all `apiKeys.*` keys (lines 624-681)  
**Issue:** The German `apiKeys` section uses the same fallback string "API-Schlüssel" for almost every key, including ones that should have distinct meanings like `active`, `revoked`, `all`, `generateKey`, `emptyCreate`, `modalWarning`, `copy`, `copied`, etc. Keys like `revoke` use "Schließen" (Close) and `deleteRevokedLabel` uses "Schließen {label}" which is wrong (should be about deleting, not closing).

**Impact:** German users managing API keys will see nonsensical repeated text. The API key management page is essentially broken in German.

---

### 8. `pt` (Portuguese) — `apiKeys` namespace has same placeholder issue

**Affected:** `pt` only  
**Keys:** Nearly all `apiKeys.*` keys (lines 624-681)  
**Issue:** Same pattern as German — "Chaves de API" repeated for nearly every key. `revoke` uses "Fechar" (Close) instead of a revoke-related term.

**Impact:** Portuguese API key management page is essentially broken.

---

### 9. `ar` (Arabic) — `apiKeys` namespace has same placeholder issue

**Affected:** `ar` only  
**Keys:** Nearly all `apiKeys.*` keys (lines 624-681)  
**Issue:** "مفاتيح API" repeated for nearly every key. `revoke` uses "إغلاق" (Close).

**Impact:** Arabic API key management page is essentially broken.

---

### 10. `de`, `pt`, `ar` — `loggedIn.dashboard` namespace has wrong/placeholder values

**Affected:** `de`, `pt`, `ar`  
**Keys:** Multiple `loggedIn.dashboard.*` keys  
**Issue:** Values like `date` show "Meine Käufe" / "Minhas compras" / "مشترياتي" (My Purchases) instead of "Date" / "Datum" / "Data" / "التاريخ". Similarly `actions`, `view`, `unknown` all show wrong values.

**Impact:** Purchase history table columns display incorrect labels.

---

### 11. `de`, `pt`, `ar` — `purchaseFlow` and `claimFlow` namespaces are mostly placeholders

**Affected:** `de`, `pt`, `ar`  
**Issue:** Most values are single-word fallbacks like "Sammlungen" / "Coleções" / "المجموعات" or "Checkout" instead of meaningful sentences.

**Impact:** Purchase and claim flows show gibberish text in these languages.

---

### 12. German `de` — `docs-mcp-others` bodyHtml and summary copied from `docs-mcp-universal`

**Affected:** `de` only  
**Keys:** `docs.pages.docs-mcp-others.summary` and `bodyHtml`  
**Issue:** The "Other MCP Clients" page in German shows content identical to "Universal MCP Setup" instead of content about other MCP clients.

**Impact:** German users looking for other MCP client setup see the wrong documentation content.

---

## MEDIUM SEVERITY FINDINGS

### 13. `de` (German) — `docs-motion-lab` summary is in Spanish

**Affected:** `de:274`  
**Key:** `docs.pages.docs-motion-lab.summary`  
**Value:** `"Previsualiza y exporta animaciones de iconos."` (Spanish)  
**Should be:** German translation of "Preview and export icon animations."

---

### 14. German `de` — `auth.copy.default.signin.note` uses account description instead of free tier note

**Affected:** `de:449`  
**Key:** `auth.copy.default.signin.note`  
**English:** "Free account. No card required for free icons."  
**German:** "Verwalte die Grundlagen deines Supericons-Kontos, ohne die App zu verlassen." (account management description)

**Impact:** German sign-in page doesn't communicate the free tier benefit.

---

### 15. German `de` — `auth.copy.default.signup.note` same issue

**Affected:** `de:457`  
**Same pattern as above for the signup flow.**

---

### 16. `pt` (Portuguese) — `auth.copy.*.note` uses account description instead of free tier note

**Affected:** `pt:449, 457, 467, 475, 485, 493, 503, 511`  
**Issue:** All auth `note` fields use "Gerencie o básico da sua conta Supericons sem sair do app." instead of "Conta gratuita. Não é necessário cartão para ícones gratuitos."

**Impact:** Portuguese auth flows don't communicate free tier.

---

### 17. `ar` (Arabic) — `auth.copy.*.note` uses account description instead of free tier note

**Affected:** `ar:449, 457, etc.`  
**Issue:** Same pattern — Arabic auth `note` fields use account management description instead of free tier note.

---

### 18. `es` (Spanish) — `confirm` namespace untranslated

**Affected:** `es:145-150`  
**Issue:** Spanish confirmation descriptions are in English.

---

### 19. `es` (Spanish) — `toast` namespace untranslated

**Affected:** `es:152-154`  
**Issue:** Spanish toast messages are in English.

---

### 20. Privacy policy — Many languages have boilerplate instead of full translation

**Affected:** `de`, `pt`, `ar` (and possibly others)  
**Issue:** The `legal.privacy.bodyHtml` in German uses the same 2-sentence boilerplate for every section (Overview, Data Collection, Product Analytics, How We Use Data, Payments, Authentication, MCP Access, Third-Party Services, etc.) instead of translating each section's distinct content. Portuguese and Arabic have similar issues.

**Impact:** Privacy policy is not meaningfully translated — users can't understand what data is collected and how it's used in their language. This may have GDPR/legal compliance implications for EU users.

---

## LOW SEVERITY / STYLE FINDINGS

### 21. CJK languages — `docs` bodyHtml uses template pattern, not actual docs content

**Affected:** ALL non-English locales  
**Issue:** The `docs.*.bodyHtml` for all 26 docs pages in non-English locales uses a standardized template with generic guidance ("this localized guide explains...") rather than translating the actual documentation content. The English `bodyHtml` is also a stub ("English uses the full source guide"). This appears to be by design — the actual docs HTML is served from a separate source.

**Impact:** Acceptable if the system falls back to the real docs HTML at runtime, but the translated stubs are not useful on their own.

---

### 22. `zh-Hans` (Simplified Chinese) — Minor: `confirm.clearFavoritesTitle` uses "清除" instead of more natural phrasing

**Key:** `confirm.clearFavoritesTitle`  
**Value:** "清除此设备上的所有收藏" — Acceptable but "清除" is slightly mechanical; "删除" would be more natural for UI context.

---

### 23. `ja` (Japanese) — `recentSearches` uses "最近の検索" which is standard

**Assessment:** Acceptable. Japanese translations are generally high quality.

---

### 24. `ko` (Korean) — `containerPill` translated as "알약형"

**Assessment:** Acceptable Korean rendering of the UI shape term.

---

## SUMMARY OF FINDINGS BY SEVERITY

| Severity | Count | Languages Affected |
|---|---|---|
| CRITICAL | 6 findings | All 11 non-English locales |
| HIGH | 6 findings | `de`, `pt`, `ar` primarily |
| MEDIUM | 8 findings | `de`, `pt`, `ar`, `es` |
| LOW | 4 findings | Various |

---

## LANGUAGES RANKED BY QUALITY

1. **zh-Hans** (Simplified Chinese) — High quality, mostly complete
2. **zh-Hant** (Traditional Chinese) — High quality, mostly complete
3. **ja** (Japanese) — High quality, mostly complete
4. **ko** (Korean) — High quality, mostly complete
5. **es** (Spanish) — Good for main UI, but `confirm`/`toast` untranslated
6. **vi** (Vietnamese) — Good for main UI, `confirm`/`toast` untranslated
7. **th** (Thai) — Good for main UI, `confirm`/`toast` untranslated
8. **hi** (Hindi) — Good for main UI, `confirm`/`toast` untranslated, some Spanish leakage in docs
9. **de** (German) — **Significant issues**: broken apiKeys, broken dashboard, Spanish leakage, wrong auth notes, boilerplate privacy policy
10. **pt** (Portuguese) — **Significant issues**: same pattern as German
11. **ar** (Arabic) — **Significant issues**: same pattern as German, plus RTL-specific concerns

---

## PRIORITY FIX RECOMMENDATIONS

| Priority | Action | Languages |
|---|---|---|
| **Immediate** | Fix Spanish text leakage into `docs-motion-lab.summary`, `docs-access-premium.summary`, `docs-troubleshooting.summary` | `de`, `pt`, `ar`, `hi`, `vi`, `th` |
| **Immediate** | Fix `docs-mcp-others.navLabel` untranslated | `de`, `pt`, `ar`, `hi`, `vi`, `th` |
| **Immediate** | Translate `confirm.*` and `toast.*` for ALL non-English locales | All 11 locales |
| **High** | Rebuild `apiKeys.*`, `loggedIn.dashboard.*`, `purchaseFlow.*`, `claimFlow.*` with proper translations | `de`, `pt`, `ar` |
| **High** | Fix `auth.copy.*.note` to show free tier messaging | `de`, `pt`, `ar` |
| **Medium** | Complete privacy policy translations (GDPR compliance concern) | `de`, `pt`, `ar` |
| **Medium** | Fix `docs-mcp-others` bodyHtml in German (currently shows universal setup content) | `de` |
