# Landing Localization Conversion Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Supericons landing page localization so the first-visit hero copy is clearer, more actionable, and more natural across all supported locales.

**Architecture:** Keep the existing `landing.*` i18n keys and HTML hooks. Update only locale catalogs, then verify key completeness, build output, and browser rendering for at least one LTR CJK locale plus Arabic RTL.

**Tech Stack:** Static HTML, CSS, Vite, JSON i18n catalogs, Playwright browser smoke.

---

## Refined English Master Anchor

| Key | Refined English |
| --- | --- |
| `landing.heroTitle` | Find the right icon faster. |
| `landing.heroSubtitle` | Search 20,000+ curated icons by meaning, use case, or where they appear in your interface. Built for designers, developers, and AI coding agents. |
| `landing.startSearching` | Search icons now |
| `landing.mcpTitle` | Use Supericons with AI coding agents |
| `landing.mcpSubtitle` | Connect MCP so agents can find icons and paste SVGs into your code. |
| `landing.addToMcpConfig` | Add this to your MCP config: |
| `landing.openMcpDocs` | Open MCP setup guides |

## Locale Refinement Targets

| Locale | Hero title | CTA | MCP title |
| --- | --- | --- | --- |
| `zh-Hans` | 更快找到合适的图标。 | 立即搜索图标 | 在 AI 编程代理中使用 Supericons |
| `zh-Hant` | 更快找到合適的圖示。 | 立即搜尋圖示 | 在 AI 程式代理中使用 Supericons |
| `ja` | ぴったりのアイコンをすばやく見つける。 | 今すぐアイコンを検索 | AI コーディングエージェントで Supericons を使う |
| `ko` | 필요한 아이콘을 더 빠르게 찾으세요. | 지금 아이콘 검색 | AI 코딩 에이전트에서 Supericons 사용 |
| `es` | Encuentra el icono adecuado más rápido. | Buscar iconos ahora | Usa Supericons con agentes de programación con IA |
| `de` | Finde schneller das passende Icon. | Jetzt Icons suchen | Supericons mit KI-Coding-Agenten nutzen |
| `pt` | Encontre o ícone certo mais rápido. | Pesquisar ícones agora | Use o Supericons com agentes de programação com IA |
| `ar` | اعثر على الأيقونة المناسبة بسرعة أكبر. | ابحث عن الأيقونات الآن | استخدم Supericons مع وكلاء البرمجة بالذكاء الاصطناعي |
| `hi` | सही आइकन जल्दी खोजें। | अभी आइकन खोजें | AI कोडिंग एजेंटों के साथ Supericons इस्तेमाल करें |
| `vi` | Tìm đúng biểu tượng nhanh hơn. | Tìm biểu tượng ngay | Dùng Supericons với tác nhân lập trình AI |
| `th` | หาไอคอนที่ใช่ได้เร็วขึ้น | ค้นหาไอคอนตอนนี้ | ใช้ Supericons กับเอเจนต์เขียนโค้ด AI |

## Tasks

### Task 1: Apply Refined Landing Catalog Strings

**Files:**
- Modify: `data/i18n/messages/*.json`
- Modify: `public/i18n/messages/*.json`
- Modify: `mcp/public/i18n/messages/*.json`

- [ ] **Step 1: Update only the existing `landing` object values**

Keep keys and JSON structure unchanged. Preserve brand names, `MCP`, `SVG`, and numeric claims.

- [ ] **Step 2: Verify the same values exist across all three catalog roots**

Run a Node check that loads every locale catalog and verifies all `landing.*` values are non-empty and not question-mark mojibake.

### Task 2: Run Verification

**Files:**
- Test: `scripts/verify-i18n-catalogs.mjs`
- Test: production build output

- [ ] **Step 1: Run catalog verification**

Run: `npm run verify:i18n-catalogs`

- [ ] **Step 2: Run full build**

Run: `npm run build`

- [ ] **Step 3: Browser smoke**

Open:
- `http://localhost:5173/?locale=zh-Hans`
- `http://localhost:5173/?locale=ar`

Clear `localStorage.removeItem('si-hero-dismissed')` before reload if the landing was previously dismissed.

## Self-Review

- The plan changes only landing copy, not routing, auth, Stripe, or search behavior.
- The CTA is more explicit than “Start searching.”
- The subtitle avoids “UI slot” and says the user-facing meaning plainly.
- Locale strings preserve technical terms where product context requires them.
