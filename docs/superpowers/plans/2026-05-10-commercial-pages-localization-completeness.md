# Commercial Pages Localization Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore full-length Terms and Privacy pages and fully localize Pricing, Terms, and Privacy for every supported non-English locale without reducing content coverage.

**Architecture:** Keep the canonical English commercial-page content in one generator script, produce public-safe localized HTML strings for each locale, and render those strings through the existing `t(...)` catalog path. Add automated coverage tests that fail if localized pages become shorter than the English source, contain obvious English fallback paragraphs, or omit pricing labels.

**Tech Stack:** Vanilla JS modules, Vite, JSON i18n catalogs under `data/i18n/messages`, generated public catalogs under `public/i18n/messages` and `mcp/public/i18n/messages`, Node verification scripts.

---

## Audit Findings

- `store.js:5875-5946` still contains a full English Terms fallback with 6 sections, but `data/i18n/messages/*.json` overrides `legal.terms.bodyHtml` with a short one-section summary.
- `store.js:5948-6024` still contains a full English Privacy fallback with 10 sections, but `data/i18n/messages/*.json` overrides `legal.privacy.bodyHtml` with a short one-section summary.
- `scripts/add-auth-contact-legal-i18n.mjs:81-82` is the source of the shortened legal pages. It generates one-section `bodyHtml` for Terms and Privacy.
- Generated public catalogs mirror the same shortened content. Verified examples:
  - `data/i18n/messages/zh-Hans.json`: Terms has 1 section, Privacy has 1 section.
  - `public/i18n/messages/zh-Hans.json`: Terms and Privacy still include English paragraphs such as `Supericons provides free and premium icon assets...`.
  - `data/i18n/messages/ar.json`: Terms and Privacy still include English paragraphs.
- `store.js:4261-4516` renders Pricing with hardcoded English for the header, plan names, plan descriptions, feature bullets, CTAs, badges, FAQ questions, and FAQ answers.
- `PRO_PRICING_COPY` at `store.js:120-150` also contains English Pro plan descriptions and features used by the pricing toggle.

## File Structure

- Modify `scripts/add-auth-contact-legal-i18n.mjs`
  - Keep auth/contact/account additions.
  - Replace short legal summaries with full section-level commercial page content.
  - Add pricing catalog generation for all supported locales.
- Modify `store.js`
  - Render Pricing from `pricing.*` catalog keys.
  - Keep prices, Stripe product IDs, and event handlers in code.
  - Keep Terms and Privacy rendering through `legal.*.bodyHtml`, but only after the catalogs contain full pages.
- Create `scripts/verify-commercial-page-localization.mjs`
  - Validate Terms and Privacy section counts and paragraph counts.
  - Validate non-English commercial pages do not contain known English fallback paragraphs.
  - Validate Pricing page strings exist in every catalog.
- Modify `package.json`
  - Add a script such as `verify:commercial-localization`.
  - Optionally include it in the main build chain after `verify-i18n-catalogs`.
- Regenerate:
  - `data/i18n/messages/*.json`
  - `public/i18n/messages/*.json`
  - `mcp/public/i18n/messages/*.json`

## Additional Logged-In And Stripe Scope

- Modify `store.js`
  - Localize logged-in dashboard, purchases, downloads, API key tabs, API key modals, claim confirmation modal, purchase success/cancel toasts, and API key table labels.
  - Use `toLocaleDateString(activeLocale)` via a helper instead of browser-default locale dates.
  - Add `locale={activeLocale}` to checkout success and cancel URLs so returning from Stripe preserves the selected language even if local storage is missing.
- Modify `auth.js`
  - Keep Customer Portal locale payload and review user-facing portal errors for localized fallbacks.
- Modify `scripts/add-auth-contact-legal-i18n.mjs`
  - Add `loggedIn`, `apiKeys`, `purchaseFlow`, and `claimFlow` message groups for all supported locales.
- Create or extend a verifier:
  - Detect hardcoded English in logged-in rendered surfaces.
  - Verify checkout request builders include both body `locale` and return URL `locale`.
- Stripe MCP audit:
  - List Stripe products and prices.
  - Confirm checkout prices used in code exist in Stripe.
  - Identify whether product names/descriptions are English-only.
  - Record that Stripe-hosted product names/descriptions must be localized in Stripe Dashboard or via Stripe-supported product metadata strategy if product display text is expected to be localized.

## Stripe Audit Findings

- Stripe product and price access is now available through the Stripe MCP plugin.
- Verified Stripe products currently have English names/descriptions, for example `Supericons Pro`, `Supericons Launch Edition`, and `Supericons: Security & Auth Collection`.
- Verified code price IDs exist in Stripe:
  - Monthly Pro: `price_1TJVJE35D7agOGFjE6iECyMD`
  - Annual Pro: `price_1TJVJC35D7agOGFjKc0GlrAy`
  - Launch Edition: `price_1TJVJ935D7agOGFjrIsRlAOS`
- App code sends a `locale` field to Checkout and Customer Portal, but return URLs should also include app locale.
- Stripe Checkout can localize hosted UI chrome, but product/price display names come from Stripe-side product configuration and are currently English.

## Execution Update

- Added logged-in message groups for downloads, purchase history, API keys, purchase returns, and collection claims across all 12 locales.
- Added full-section Terms and Privacy catalog output so localized legal pages no longer collapse to a one-section summary.
- Added Pricing catalog output and wired the Pricing page to `pricing.*` messages instead of hardcoded page text.
- Added Stripe return URL locale preservation for Pro subscription checkout, Launch Edition checkout, and single-pack checkout.
- Verified Customer Portal already sends a Stripe locale from `auth.js`.
- Added automated gates:
  - `verify:commercial-localization`
  - `verify:logged-in-stripe-localization`
- Stripe dashboard follow-up remains: Stripe-hosted product names and descriptions are currently English in Stripe itself. App-side locale is sent, but hosted product display names require Stripe-side localization or per-locale product/price display strategy.

## 2026-05-10 Quality Audit Update

- Found that several non-English pricing FAQ headings were technically localized but too terse, such as short label-style headings instead of useful question-style headings.
- Found that non-English pricing period labels inherited Spanish text such as `por pack` and `pago único` outside Spanish.
- Found that the commercial localization verifier counted fields but did not catch thin FAQ answers, duplicate legal section headings, stale helper keys, or cross-locale period-label fallbacks.
- Fixed the generator so Pricing replaces the whole generated object rather than deep-merging into stale helper fields.
- Added stricter automated checks for legal section uniqueness, FAQ answer length, feature-list placeholders, stale helper keys, and Spanish period-label leakage into other locales.
- Browser-smoked Vietnamese Pricing, Japanese Terms, Arabic Privacy, and an Arabic-to-German language switch on Privacy.

## Task 1: Add Failing Commercial Page Coverage Tests

**Files:**
- Create: `scripts/verify-commercial-page-localization.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the verifier with known failure conditions**

Create `scripts/verify-commercial-page-localization.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.join('data', 'i18n', 'messages');
const publicDir = path.join('public', 'i18n', 'messages');
const mcpDir = path.join('mcp', 'public', 'i18n', 'messages');

const locales = (await fs.readdir(sourceDir))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''));

const englishFallbackSnippets = [
  'Supericons provides free and premium icon assets',
  'Supericons is operated by Curly Mole Labs',
  'This localized summary covers the same operational policy',
  'You may use icons in finished websites',
  'Payments and subscription management are handled by Stripe',
];

function countMatches(value, pattern) {
  return (String(value).match(pattern) || []).length;
}

async function readCatalog(dir, locale) {
  return JSON.parse(await fs.readFile(path.join(dir, `${locale}.json`), 'utf8'));
}

function assertLegalCoverage(locale, catalog) {
  const termsHtml = catalog.legal?.terms?.bodyHtml || '';
  const privacyHtml = catalog.legal?.privacy?.bodyHtml || '';

  assert.ok(countMatches(termsHtml, /<section\b/g) >= 6, `${locale} terms must keep at least 6 sections`);
  assert.ok(countMatches(privacyHtml, /<section\b/g) >= 10, `${locale} privacy must keep at least 10 sections`);
  assert.ok(countMatches(termsHtml, /<p\b/g) >= 10, `${locale} terms must keep detailed paragraph coverage`);
  assert.ok(countMatches(privacyHtml, /<p\b/g) >= 10, `${locale} privacy must keep detailed paragraph coverage`);

  if (locale !== 'en') {
    for (const snippet of englishFallbackSnippets) {
      assert.ok(!termsHtml.includes(snippet), `${locale} terms contains English fallback: ${snippet}`);
      assert.ok(!privacyHtml.includes(snippet), `${locale} privacy contains English fallback: ${snippet}`);
    }
  }
}

function assertPricingCoverage(locale, catalog) {
  const pricing = catalog.pricing || {};
  assert.ok(pricing.headerTitle, `${locale} pricing.headerTitle missing`);
  assert.ok(pricing.headerSubtitle, `${locale} pricing.headerSubtitle missing`);
  assert.ok(pricing.plans?.free?.name, `${locale} pricing.plans.free.name missing`);
  assert.ok(pricing.plans?.pro?.name, `${locale} pricing.plans.pro.name missing`);
  assert.ok(pricing.plans?.singlePack?.name, `${locale} pricing.plans.singlePack.name missing`);
  assert.ok(pricing.plans?.launchBundle?.name, `${locale} pricing.plans.launchBundle.name missing`);
  assert.equal(pricing.faq?.items?.split('|').length, 7, `${locale} pricing FAQ must have 7 items`);
}

for (const locale of locales) {
  const source = await readCatalog(sourceDir, locale);
  assertLegalCoverage(locale, source);
  assertPricingCoverage(locale, source);

  for (const dir of [publicDir, mcpDir]) {
    const output = await readCatalog(dir, locale);
    assert.deepEqual(output.legal, source.legal, `${locale} legal output mismatch in ${dir}`);
    assert.deepEqual(output.pricing, source.pricing, `${locale} pricing output mismatch in ${dir}`);
  }
}

console.log('verify-commercial-page-localization: ok');
```

- [ ] **Step 2: Run the verifier and confirm it fails on current data**

Run:

```bash
node scripts/verify-commercial-page-localization.mjs
```

Expected before implementation:

```text
AssertionError: en terms must keep at least 6 sections
```

- [ ] **Step 3: Add the package script**

Modify `package.json` scripts:

```json
"verify:commercial-localization": "node scripts/verify-commercial-page-localization.mjs"
```

Expected after this step:

```bash
npm run verify:commercial-localization
```

still fails until the legal and pricing catalogs are repaired.

## Task 2: Restore Full Terms And Privacy Catalog Content

**Files:**
- Modify: `scripts/add-auth-contact-legal-i18n.mjs`
- Regenerate: `data/i18n/messages/*.json`
- Regenerate: `public/i18n/messages/*.json`
- Regenerate: `mcp/public/i18n/messages/*.json`

- [ ] **Step 1: Replace short legal HTML generation**

In `scripts/add-auth-contact-legal-i18n.mjs`, replace the current one-section `legal.terms.bodyHtml` and `legal.privacy.bodyHtml` generation with full localized HTML builders that preserve the same section count as `store.js`.

Use helpers shaped like this:

```js
function legalPageHtml(updated, sections) {
  return `<div class="terms-content"><p class="terms-content__updated">${updated}</p>${sections.map((section) => `
    <section class="terms-section">
      <h3 class="terms-section__title">${section.title}</h3>
      ${section.body}
    </section>`).join('')}</div>`;
}
```

- [ ] **Step 2: Add full English canonical Terms sections**

Use the existing English content from `store.js:5888-5942`. Preserve all six sections:

```js
const englishTermsSections = [
  {
    title: '1. Usage Rights',
    body: '<p>Supericons provides free and premium icon assets for use in digital products. Free icons from the 10 open-source libraries available in Supericons retain their original open-source licenses.</p><p>Premium animated collections are proprietary assets created by Curly Mole Labs. Your usage rights depend on your license tier.</p>',
  },
  {
    title: '2. AI Output Rights',
    body: '<p>Icons retrieved via the <a href="/?view=docs" data-docs-view="docs">Supericons MCP server</a> may be used in AI-generated code output. The generated code that references or embeds our icons is your property.</p><p>The underlying SVG and CSS animation source files remain the intellectual property of Curly Mole Labs. You may not use AI tools to extract, reverse-engineer, or bulk-export raw icon assets.</p>',
  },
  {
    title: '3. Redistribution Policy',
    body: '<p>You may <strong>not</strong> redistribute raw SVG or CSS animation source files, include premium icons in open-source projects as bundled assets, create competing icon libraries, resell access, sublicense access, or build tools that generate or redistribute our icons.</p><p>You <strong>may</strong> use icons in compiled output where the raw source is not directly extractable.</p>',
  },
  {
    title: '4. Licensing Tiers',
    body: '<div class="terms-tier-grid"><div class="terms-tier"><h4>Single Project License</h4><p>Applies to a-la-carte purchases and Pro Monthly collection claims.</p><p>Use the purchased collection in one project. Additional projects require additional purchases, Launch Bundle, Pro Annual ownership, or an active Pro subscription.</p></div><div class="terms-tier"><h4>Unlimited Project License</h4><p>Applies to active Pro subscribers, Pro Annual included collections, and Launch Edition purchasers.</p><p>Use eligible collections in unlimited projects, including client work.</p></div></div>',
  },
  {
    title: '5. Refund Policy',
    body: '<p><strong>Pro Subscription:</strong> You may cancel your subscription at any time. No partial refunds are issued for the current billing period. Your benefits remain active until the end of the paid period.</p><p><strong>One-time Purchases:</strong> Due to the digital nature of our products, we do not offer refunds once download access has been granted.</p><p><strong>Exceptions:</strong> If a technical issue prevents access to purchased content, contact us within 14 days for a full refund or resolution.</p>',
  },
  {
    title: '6. Contact',
    body: '<p>For questions about these terms, licensing, or refund requests:</p><p>Email: <a href="mailto:hello@supericons.dev">hello@supericons.dev</a></p>',
  },
];
```

- [ ] **Step 3: Add full English canonical Privacy sections**

Use the existing English content from `store.js:5962-6020`. Preserve all ten sections:

```js
const englishPrivacySections = [
  ['1. Overview', '<p>Supericons is an icon search, export, licensing, and MCP access product operated by Curly Mole Labs. This Privacy Policy explains what information we collect, how we use it, and how to contact us about privacy questions.</p>'],
  ['2. Data We Collect', '<p>We may collect account information such as your email address, display name, authentication provider, and account identifiers when you create an account or sign in.</p><p>We also store purchase, entitlement, and subscription records needed to grant access to premium collections, MCP features, and related product functionality.</p><p>We collect anonymized, cookie-free usage analytics to understand how the product is used. No personal data is tied to these analytics.</p><p>If you contact us, we may receive the information you include in your email or support request.</p>'],
  ['3. How We Use Data', '<ul><li>Providing sign-in, account recovery, and account management</li><li>Processing purchases, subscriptions, and entitlements</li><li>Delivering paid access to premium collections and MCP features</li><li>Responding to support requests and product questions</li><li>Protecting the service against abuse, fraud, and unauthorized access</li><li>Improving product quality and reliability</li></ul>'],
  ['4. Payments', '<p>Payments and subscription management are handled by Stripe. We do not store full payment card details on Supericons servers. Stripe may collect and process billing information according to its own privacy and security practices.</p>'],
  ['5. Authentication And Email', '<p>Authentication may include email/password sign-in and Google sign-in. Transactional emails such as confirmation, password reset, and password-changed notifications are delivered through a secure email provider on our behalf.</p>'],
  ['6. MCP Access', '<p>When you use Supericons through MCP, we may process requests needed to validate access, return icon results, and enforce premium entitlements tied to your account or API key.</p>'],
  ['7. Third-Party Services', '<p>Supericons relies on third-party providers for authentication, billing, email delivery, and basic product analytics. These services may process limited data as needed to operate their respective functions. Payment processing is handled by Stripe.</p>'],
  ['8. Data Retention', '<p>We retain account, billing, and entitlement records for as long as needed to operate the service, provide access to purchases, comply with legal obligations, resolve disputes, and support customers.</p>'],
  ['9. Your Choices', '<p>You can update your display name inside the app and use password reset to recover access to your account. For privacy-related requests such as correction or deletion, contact us directly and we will process your request.</p>'],
  ['10. Contact', '<p>For privacy questions or requests, contact us at <a href="mailto:hello@supericons.dev">hello@supericons.dev</a>.</p>'],
].map(([title, body]) => ({ title, body }));
```

- [ ] **Step 4: Add full localized section titles and body text for all 11 non-English locales**

Use locale-specific arrays with the same number of sections and the same commercial meaning. Do not include the English fallback notice `This localized summary covers...` in the public page body.

For `zh-Hans`, for example:

```js
const localizedLegal = {
  'zh-Hans': {
    termsUpdated: '最后更新：2026 年 4 月 8 日',
    termsSections: [
      { title: '1. 使用权利', body: '<p>Supericons 提供可用于数字产品的免费和高级图标资源。Supericons 中 10 个开源图标库的免费图标保留其原始开源许可证。</p><p>高级动态合集是 Curly Mole Labs 创建的专有资源。你的使用权利取决于你的许可层级。</p>' },
      { title: '2. AI 输出权利', body: '<p>通过 Supericons MCP 服务器检索的图标可以用于 AI 生成的代码输出。引用或嵌入这些图标的生成代码归你所有。</p><p>底层 SVG 和 CSS 动画源文件仍属于 Curly Mole Labs 的知识产权。你不得使用 AI 工具提取、逆向工程或批量导出原始图标资源。</p>' },
      { title: '3. 再分发政策', body: '<p>你不得再分发原始 SVG 或 CSS 动画源文件，不得把高级图标作为捆绑资源放入开源项目，不得创建竞争性图标库，不得转售、再授权或共享下载访问权。</p><p>你可以在已编译输出中使用图标，例如已构建的网站、应用和生产包，只要原始源文件不能被直接提取。</p>' },
      { title: '4. 许可层级', body: '<div class="terms-tier-grid"><div class="terms-tier"><h4>单项目许可</h4><p>适用于单独购买的合集和 Pro Monthly 领取的合集。</p><p>购买的合集可用于一个项目。额外项目需要额外购买、Launch Bundle、Pro Annual 所有权或有效的 Pro 订阅。</p></div><div class="terms-tier"><h4>无限项目许可</h4><p>适用于有效 Pro 订阅用户、Pro Annual 包含的合集和 Launch Edition 购买者。</p><p>符合条件的合集可用于无限项目，包括客户项目。</p></div></div>' },
      { title: '5. 退款政策', body: '<p><strong>Pro 订阅：</strong>你可以随时取消订阅。当前计费周期不提供部分退款。权益会持续到已付周期结束。</p><p><strong>一次性购买：</strong>由于产品为数字内容，一旦授予下载访问权，通常不提供退款。</p><p><strong>例外情况：</strong>如果技术问题导致你无法访问已购买内容，请在 14 天内联系我们，我们会提供全额退款或解决方案。</p>' },
      { title: '6. 联系方式', body: '<p>如对条款、许可或退款有疑问，请联系：</p><p>邮箱：<a href="mailto:hello@supericons.dev">hello@supericons.dev</a></p>' },
    ],
    privacyUpdated: '最后更新：2026 年 4 月 8 日',
    privacySections: [
      { title: '1. 概览', body: '<p>Supericons 是由 Curly Mole Labs 运营的图标搜索、导出、许可和 MCP 访问产品。本隐私政策说明我们收集哪些信息、如何使用这些信息，以及你如何就隐私问题联系我们。</p>' },
      { title: '2. 我们收集的数据', body: '<p>当你创建账户或登录时，我们可能会收集邮箱地址、显示名称、身份验证提供方和账户标识符等账户信息。</p><p>我们还会存储购买、权益和订阅记录，以便授予高级合集、MCP 功能和相关产品功能的访问权。</p><p>我们会收集匿名、无 Cookie 的使用分析数据，用于了解产品使用情况。这些分析不会关联个人数据。</p><p>如果你联系我们，我们可能会收到你在邮件或支持请求中提供的信息。</p>' },
      { title: '3. 我们如何使用数据', body: '<ul><li>提供登录、账户恢复和账户管理</li><li>处理购买、订阅和权益</li><li>提供高级合集和 MCP 功能的付费访问</li><li>回复支持请求和产品问题</li><li>防止滥用、欺诈和未经授权的访问</li><li>改进产品质量和可靠性</li></ul>' },
      { title: '4. 付款', body: '<p>付款和订阅管理由 Stripe 处理。Supericons 服务器不会存储完整银行卡信息。Stripe 可能会根据自身隐私和安全实践收集并处理账单信息。</p>' },
      { title: '5. 身份验证和邮件', body: '<p>身份验证可能包括邮箱密码登录和 Google 登录。确认、密码重置和密码变更等事务性邮件由安全邮件服务代表我们发送。</p>' },
      { title: '6. MCP 访问', body: '<p>当你通过 MCP 使用 Supericons 时，我们可能会处理验证访问、返回图标结果以及执行与你的账户或 API 密钥绑定的高级权益所需的请求。</p>' },
      { title: '7. 第三方服务', body: '<p>Supericons 依赖第三方提供身份验证、计费、邮件发送和基础产品分析。这些服务可能会处理其功能运行所需的有限数据。付款处理由 Stripe 完成。</p>' },
      { title: '8. 数据保留', body: '<p>我们会在运营服务、提供购买访问、遵守法律义务、解决争议和支持客户所需的期限内保留账户、账单和权益记录。</p>' },
      { title: '9. 你的选择', body: '<p>你可以在应用中更新显示名称，并使用密码重置来恢复账户访问。如需更正或删除等隐私请求，请直接联系我们，我们会处理你的请求。</p>' },
      { title: '10. 联系方式', body: '<p>隐私问题或请求请发送邮件至 <a href="mailto:hello@supericons.dev">hello@supericons.dev</a>。</p>' },
    ],
  },
};
```

- [ ] **Step 5: Regenerate catalogs**

Run:

```bash
node scripts/add-auth-contact-legal-i18n.mjs
node scripts/build-i18n-public-catalogs.mjs
```

Expected:

```text
build-i18n-public-catalogs: copied 12 locales
```

- [ ] **Step 6: Run commercial-page verifier**

Run:

```bash
node scripts/verify-commercial-page-localization.mjs
```

Expected:

```text
verify-commercial-page-localization: ok
```

## Task 3: Localize Pricing Page Rendering

**Files:**
- Modify: `scripts/add-auth-contact-legal-i18n.mjs`
- Modify: `store.js:4261-4516`
- Regenerate: `data/i18n/messages/*.json`
- Regenerate: `public/i18n/messages/*.json`
- Regenerate: `mcp/public/i18n/messages/*.json`

- [ ] **Step 1: Add pricing catalog fields**

In `scripts/add-auth-contact-legal-i18n.mjs`, generate a `pricing` object with these string keys for every locale:

```js
pricing: {
  headerTitle: 'Simple, transparent pricing',
  headerSubtitle: 'Free icons for everyone. Premium animated packs to polish your UI.',
  monthly: 'Monthly',
  annual: 'Annual',
  save45: 'Save 45%',
  save28: 'Save 28%',
  mostPopular: 'Most Popular',
  plans: {
    free: {
      name: 'Free',
      description: '{freeIconsAcrossLibrariesLabel}, AI search, SVG export. No account needed.',
      amount: '$0',
      cta: 'Start for Free',
      features: '{freeIconsAcrossLibrariesLabel}|Material, Lucide, Tabler, Phosphor + more|AI semantic search|SVG, PNG, CSS export|{mcpServerFreeIconsLabel}',
      unavailable: 'Animated premium packs|Premium icons via MCP'
    },
    pro: {
      name: 'Pro',
      monthlyDescription: 'Everything in Free plus Pro workflow tools and one premium collection claim each month.',
      annualDescription: 'Everything in Free plus Pro workflow tools and all 8 current premium collections.',
      cta: 'Go Pro',
      monthlyFeatures: 'Everything in Free|Motion Lab exports|Converter downloads|Premium MCP access|1 permanent collection claim per month',
      annualFeatures: 'Everything in Free|Motion Lab exports|Converter downloads|Premium MCP access|All 8 current premium collections'
    },
    singlePack: {
      name: 'Single Pack',
      description: 'Pick any one collection. 50 animated icons, yours permanently.',
      period: 'per pack',
      cta: 'Browse Packs',
      features: 'Everything in Free|50 animated SVG icons per pack|Unique hover animation per icon|Lifetime ownership|Single project license|MCP access for purchased pack',
      unavailable: 'No Pro tools (Motion Lab, Converter)'
    },
    launchBundle: {
      name: 'Launch Bundle',
      description: 'All 8 packs. 400 animated icons. One payment, no subscription.',
      period: 'one-time',
      cta: 'Get Launch Bundle',
      features: 'All 8 premium packs|400 animated SVG icons|AI, E-com, Media, Nav, Security + more|Lifetime ownership + future updates|Commercial use, unlimited projects|MCP access for all 8 packs',
      unavailable: 'No Pro tools (Motion Lab, Converter)'
    }
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: 'What are the 8 premium animated packs?::Each pack contains 50 animated SVG icons with unique hover animations.|How do Pro Monthly and Pro Annual collection access work?::Pro Monthly lets you add 1 premium collection to your permanent library each month.'
  }
}
```

Use `|` to separate feature list items and `::` to separate FAQ question and answer because the current validator flattens arrays into strings.

- [ ] **Step 2: Add pricing render helpers to `store.js`**

Add helpers near `renderPricingFeatureList`:

```js
function splitCatalogList(value) {
  return String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
}

function renderPricingCatalogFeatures(value, icon = 'check', className = '') {
  return splitCatalogList(value).map((item) => (
    `<li${className ? ` class="${className}"` : ''}><span class="material-symbols-outlined">${icon}</span> ${item}</li>`
  )).join('');
}

function getPricingFaqItems() {
  return splitCatalogList(t('pricing.faq.items', {}, '')).map((item) => {
    const [question, answer] = item.split('::');
    return { question: question?.trim() || '', answer: answer?.trim() || '' };
  }).filter((item) => item.question && item.answer);
}
```

- [ ] **Step 3: Replace hardcoded pricing HTML with catalog strings**

In `renderPricingPage()`, replace literals at `store.js:4276-4451` with `t(...)` calls. Keep prices and DOM IDs unchanged.

Example replacement:

```js
<h2 class="pricing-header__title">${t('pricing.headerTitle', {}, 'Simple, transparent pricing')}</h2>
<p class="pricing-header__subtitle">${t('pricing.headerSubtitle', {}, 'Free icons for everyone. Premium animated packs to polish your UI.')}</p>
<button class="pricing-toggle__seg pricing-toggle__seg--active" id="pricingMonthlyBtn" data-period="monthly">${t('pricing.monthly', {}, 'Monthly')}</button>
<button class="pricing-toggle__seg" id="pricingAnnualBtn" data-period="annual">${t('pricing.annual', {}, 'Annual')}</button>
<span class="pricing-toggle__badge" id="pricingAnnualBadge" hidden>${t('pricing.save45', {}, 'Save 45%')}</span>
```

- [ ] **Step 4: Replace Pro toggle copy**

Replace `monthlyPricing` and `annualPricing` usage inside `setPeriod(annual)`:

```js
const pricingCopy = annual
  ? {
      description: t('pricing.plans.pro.annualDescription', {}, PRO_PRICING_COPY.annual.description),
      features: splitCatalogList(t('pricing.plans.pro.annualFeatures', {}, PRO_PRICING_COPY.annual.features.join('|'))),
    }
  : {
      description: t('pricing.plans.pro.monthlyDescription', {}, PRO_PRICING_COPY.monthly.description),
      features: splitCatalogList(t('pricing.plans.pro.monthlyFeatures', {}, PRO_PRICING_COPY.monthly.features.join('|'))),
    };
```

Then keep:

```js
if (proDesc) proDesc.textContent = pricingCopy.description;
if (proFeatures) proFeatures.innerHTML = renderPricingFeatureList(pricingCopy.features);
```

- [ ] **Step 5: Generate FAQ from catalog**

Replace the hardcoded FAQ block with:

```js
${getPricingFaqItems().map((item) => `
  <div class="pricing-faq__item">
    <button class="pricing-faq__question" aria-expanded="false">
      ${item.question}
      <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
    </button>
    <div class="pricing-faq__answer">${item.answer}</div>
  </div>
`).join('')}
```

- [ ] **Step 6: Regenerate and verify**

Run:

```bash
node scripts/add-auth-contact-legal-i18n.mjs
node scripts/build-i18n-public-catalogs.mjs
node scripts/verify-i18n-catalogs.mjs
node scripts/verify-commercial-page-localization.mjs
```

Expected:

```text
verify-i18n-catalogs: ok
verify-commercial-page-localization: ok
```

## Task 4: Browser Regression Checks For Commercial Pages

**Files:**
- Modify: `scripts/verify-localized-browser-smoke.mjs` or create `scripts/verify-commercial-pages-browser-smoke.mjs`

- [ ] **Step 1: Add browser assertions for Terms and Privacy**

Add checks that load these URLs:

```js
const cases = [
  { locale: 'zh-Hans', view: 'terms', expectedTitle: '服务条款', minSections: 6 },
  { locale: 'zh-Hans', view: 'privacy', expectedTitle: '隐私政策', minSections: 10 },
  { locale: 'ar', view: 'terms', expectedTitle: 'شروط الخدمة', minSections: 6 },
  { locale: 'ar', view: 'privacy', expectedTitle: 'سياسة الخصوصية', minSections: 10 },
  { locale: 'de', view: 'pricing', expectedTitle: 'Preis', minCards: 4 },
];
```

The check should evaluate:

```js
const sectionCount = await page.locator('.terms-section').count();
assert.ok(sectionCount >= test.minSections, `${test.locale} ${test.view} section count`);
```

- [ ] **Step 2: Add screenshot-safe text checks**

Assert that non-English legal pages do not visibly contain the short English fallback:

```js
const bodyText = await page.locator('#gridArea').innerText();
assert.ok(!bodyText.includes('This localized summary covers'), 'summary fallback must not be visible');
assert.ok(!bodyText.includes('Supericons provides free and premium icon assets'), 'English terms fallback must not be visible');
```

- [ ] **Step 3: Run browser smoke**

Run:

```bash
node scripts/verify-commercial-pages-browser-smoke.mjs
```

Expected:

```text
verify-commercial-pages-browser-smoke: ok
```

## Task 5: Final Build And Audit

**Files:**
- Verify only unless previous tasks expose failures.

- [ ] **Step 1: Run full i18n and build gates**

Run:

```bash
node scripts/verify-i18n-catalogs.mjs
node scripts/verify-i18n-lookup.mjs
node scripts/verify-commercial-page-localization.mjs
node scripts/verify-localized-browser-smoke.mjs
npm run build
```

Expected:

```text
verify-i18n-catalogs: ok
verify-i18n-lookup: ok
verify-commercial-page-localization: ok
verify-localized-browser-smoke: ok
vite ... built
```

- [ ] **Step 2: Manual browser spot check**

Open these views in the local dev server:

```text
/?locale=zh-Hans&view=terms
/?locale=zh-Hans&view=privacy
/?locale=zh-Hans&view=pricing
/?locale=ar&view=terms
/?locale=ar&view=privacy
/?locale=de&view=pricing
```

Confirm:

- Terms has 6 sections.
- Privacy has 10 sections.
- Pricing has 4 pricing cards and 7 FAQ items.
- Non-English Terms and Privacy do not display the previous English summary paragraphs.
- Arabic remains RTL but product logos and brand marks are not mirrored.

## Self-Review

- Spec coverage: The plan covers the reported Terms, Privacy, and Pricing incompleteness, and adds tests so the content cannot shrink silently again.
- Placeholder scan: No task relies on “later” work. Every task has exact files, commands, and expected outcomes.
- Type consistency: The plan keeps i18n values as strings because the current `createTranslator` coerces catalog values with `String(message)`. List-like content is encoded with delimiters and split in `store.js`.
