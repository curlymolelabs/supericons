# Supericons Legal License Integration PRD And Plan

Date: 2026-07-07
Status: Draft for implementation review
Scope: Move the x402 single-icon license into the existing Supericons legal and localization system.

## Problem

The single-icon license currently exists as a standalone static HTML page at `public/legal/supericons-single-icon-license/index.html`. [SOURCE: public/legal/supericons-single-icon-license/index.html]

That page is outside the existing Terms and Privacy rendering path, which uses `store.js` views and localized `legal.terms` / `legal.privacy` message keys. [SOURCE: store.js] [SOURCE: data/i18n/messages/en.json]

The x402 single-icon config still points to `/legal/supericons-single-icon-license` as the license path. [SOURCE: supabase/functions/_shared/x402-single-icon-config.ts]

The existing Terms and Privacy content is localized across 12 locale files, but none of those locale files currently include a single-icon license section. [SOURCE: data/i18n/messages/*.json]

The app has SEO metadata for `/terms/` and `/privacy/`, but the runtime route mapper currently only defines pretty-path mappings for selected MCP docs paths. [SOURCE: lib/public-route-seo.js] [SOURCE: lib/view-route-policy.js]

## Target Users

| Segment | Job To Be Done |
|---|---|
| Human buyer | When buying a single paid icon, I want the license terms to be easy to find in the same legal area as the Terms and Privacy pages so I can understand what I am allowed to do. [ASSUMPTION] |
| AI agent or agent client | When receiving a paid icon payload, I want a stable license URL that explains the allowed use so I can cite or store it with the receipt. [SOURCE: docs/supericons-x402-single-icon-payment-prd-2026-07-06.md] |
| Supericons operator | When maintaining legal copy, I want one shared localized system rather than a separate static page that can drift from the app. [ASSUMPTION] |

## Goals

1. Add single-icon license terms to the existing Terms page, not as a separate mismatched static page. [SOURCE: store.js]
2. Localize the new license section across the same 12 locale catalogs that already carry Terms and Privacy. [SOURCE: data/i18n/messages/*.json]
3. Update the x402 license URL to point at the Terms page anchor. [SOURCE: supabase/functions/_shared/x402-single-icon-config.ts]
4. Remove the standalone `/legal/supericons-single-icon-license` page and its Netlify redirects in the implementation change. [SOURCE: netlify.toml]
5. Fix the direct legal routes so `/terms/` and `/privacy/` render the intended views instead of relying only on `?view=` URLs. [SOURCE: lib/view-route-policy.js] [SOURCE: lib/public-route-seo.js]
6. Add verification so this does not regress quietly. [ASSUMPTION]
7. Keep implementation and verification local until the owner explicitly approves a deploy. [ASSUMPTION]

## Non-Goals

1. Do not deploy this change as part of implementation unless the owner explicitly asks. [ASSUMPTION]
2. Do not enable the x402 endpoint or expose the `$1` purchase UI. [SOURCE: docs/supericons-x402-single-icon-payment-prd-2026-07-06.md]
3. Do not create a new independent legal-page design system. [SOURCE: store.js]
4. Do not rewrite the full Terms or Privacy policies beyond the minimum needed to add the single-icon license section. [ASSUMPTION]
5. Do not treat this as legal advice or final counsel review. The existing draft says it should be reviewed before mainnet launch. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]

## Current Evidence

| Finding | Evidence |
|---|---|
| Terms and Privacy are app views. | `store.js` has `renderTermsPage()` and `renderPrivacyPage()`, and `main.js` footer links call `switchView('terms')` / `switchView('privacy')`. [SOURCE: store.js] [SOURCE: main.js] |
| Terms and Privacy copy comes from i18n. | `store.js` renders `legal.terms.bodyHtml` and `legal.privacy.bodyHtml`. [SOURCE: store.js] |
| 12 locale catalogs already have Terms and Privacy. | `data/i18n/messages/{ar,de,en,es,hi,ja,ko,pt,th,vi,zh-Hans,zh-Hant}.json` all contain `legal.terms.bodyHtml` and `legal.privacy.bodyHtml`. [SOURCE: data/i18n/messages/*.json] |
| The single-icon license is not in those catalogs. | The same locale inventory found no `legal.singleIconLicense` and no existing "Single Icon" section in `legal.terms.bodyHtml`. [SOURCE: data/i18n/messages/*.json] |
| The static license page is a mismatch. | `public/legal/supericons-single-icon-license/index.html` contains standalone HTML and styling outside the app legal views. [SOURCE: public/legal/supericons-single-icon-license/index.html] |
| The static route was added through Netlify redirects. | `netlify.toml` redirects `/legal/supericons-single-icon-license` and the trailing-slash variant to the static HTML file before the SPA fallback. [SOURCE: netlify.toml] |
| The x402 code points at that static URL. | `licenseUrlPath: "/legal/supericons-single-icon-license"`. [SOURCE: supabase/functions/_shared/x402-single-icon-config.ts] |

## Proposed UX

The Terms page should gain a section named `Single Icon Purchases` with an anchor:

```html
<section class="terms-section" id="single-icon-license">
```

The section should sit after the existing Licensing Tiers section and before Refund Policy. [ASSUMPTION]

Recommended license URL for the next implementation pass:

```txt
https://supericons.dev/?view=terms#single-icon-license
```

Recommended final URL after direct route hygiene is verified:

```txt
https://supericons.dev/terms/#single-icon-license
```

The page should still use the existing `terms-view`, `terms-content`, and `terms-section` classes. [SOURCE: store.js] [SOURCE: style.css]

## License Copy Scope

Use the existing single-icon draft as the content source, but compress it into a Terms-page section. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]

The English section should cover:

1. What the license covers: one paid animated icon bought through the single-icon purchase flow. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
2. Who the licensee is: the wallet or account controller, or the person/organization that authorized an agent. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
3. Grant: non-exclusive, worldwide, perpetual use in one end product, client project, website, app, presentation, internal tool, or repository. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
4. Allowed use: personal, commercial, client, internal, source code, built app files, screenshots, demos, documentation, and marketing for the licensed project. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
5. Not allowed: resale, sublicensing, redistribution as a standalone asset, inclusion in an icon pack/template/design kit/marketplace/asset database, competing library, stock asset product, or training set. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
6. Agent receipt behavior: keep the x402 payment response, settlement reference, or receipt data when available. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
7. Support: contact `hello@supericons.dev` with receipt data for delivery, duplicate charge, settlement, or license questions. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]

## Functional Requirements

| ID | Requirement | Maps To |
|---|---|---|
| FR1 | Add a `Single Icon Purchases` section with `id="single-icon-license"` to `legal.terms.bodyHtml` in the English catalog. | Human buyer job, agent job |
| FR2 | Add equivalent localized sections to all 11 non-English `data/i18n/messages/*.json` catalogs. | Human buyer job |
| FR3 | Keep product names, protocol names, file formats, and the support email stable across locales where appropriate. | Legal clarity risk |
| FR4 | Copy updated locale catalogs to `public/i18n/messages/` and `mcp/public/i18n/messages/` if those mirrors are part of the repo's current localization parity pattern. | Drift risk |
| FR5 | Update `X402_SINGLE_ICON_CONFIG.licenseUrlPath` from `/legal/supericons-single-icon-license` to a Terms anchor path. | Agent job |
| FR6 | Remove `public/legal/supericons-single-icon-license/index.html`. | UX drift risk |
| FR7 | Remove the `/legal/supericons-single-icon-license` redirects from `netlify.toml`. | Route drift risk |
| FR8 | Add runtime pretty-path support so `/terms/` and `/privacy/` map to the `terms` and `privacy` app views. | Human buyer job |
| FR9 | Ensure `/?view=terms#single-icon-license` and `/terms/#single-icon-license` both land on the Terms view and scroll to the section after rendering. | Human buyer job |
| FR10 | Add or extend verification so Terms/Privacy direct routes, query routes, locale routes, and the single-icon anchor are checked locally. | Regression risk |
| FR11 | Ensure public route snapshots and sitemap generation do not point to stale standalone legal pages. | SEO risk |
| FR12 | Keep x402 endpoint disabled unless the owner separately approves re-enabling. | Launch risk |

## Implementation Plan

### Step 1: Clean The Content Source

Create a compact English HTML fragment for the Terms section from `docs/legal/supericons-single-icon-license-draft-2026-07-06.md`. [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]

Acceptance:
- The section uses `terms-section` classes.
- The section has `id="single-icon-license"`.
- The copy is clear enough for humans and precise enough for agent receipt references.
- The copy does not introduce new claims beyond the draft unless marked for owner/legal review.

### Step 2: Add It To English Terms

Update `data/i18n/messages/en.json` under `legal.terms.bodyHtml`. [SOURCE: data/i18n/messages/en.json]

Recommended placement:
- After `4. Licensing Tiers`.
- Before Refund Policy.
- Renumber later sections if the current localized structure uses numbered headings. [ASSUMPTION]

Acceptance:
- English Terms renders the single-icon section in `/?view=terms#single-icon-license`.
- Existing Terms content remains present.

### Step 3: Localize The Section

Add matching sections to:

- `ar`
- `de`
- `es`
- `hi`
- `ja`
- `ko`
- `pt`
- `th`
- `vi`
- `zh-Hans`
- `zh-Hant`

[SOURCE: data/i18n/messages/*.json]

Acceptance:
- Every locale has the same anchor id.
- Every locale has the same legal structure.
- No locale falls back to English for the new section unless the owner explicitly approves a temporary fallback.

### Step 4: Sync Public Catalog Mirrors

If the repo continues to keep public and MCP locale catalogs checked in, copy or regenerate matching changes for:

- `public/i18n/messages/*.json`
- `mcp/public/i18n/messages/*.json`

[SOURCE: docs/localization-legal-pages-audit.md]

Acceptance:
- `data/`, `public/`, and `mcp/public/` legal message keys are in parity.

### Step 5: Update x402 License URL

Change:

```ts
licenseUrlPath: "/legal/supericons-single-icon-license"
```

to one of:

```ts
licenseUrlPath: "/?view=terms#single-icon-license"
```

or, after direct route mapping is verified:

```ts
licenseUrlPath: "/terms/#single-icon-license"
```

[SOURCE: supabase/functions/_shared/x402-single-icon-config.ts]

Recommendation:
- Use `/?view=terms#single-icon-license` first if the route hygiene fix is not shipped in the same patch.
- Use `/terms/#single-icon-license` only after browser verification proves direct pretty routes work.

### Step 6: Remove Standalone Page And Redirects

Delete:

```txt
public/legal/supericons-single-icon-license/index.html
```

Remove these Netlify redirects:

```toml
[[redirects]]
  from = "/legal/supericons-single-icon-license"
  to = "/legal/supericons-single-icon-license/index.html"
  status = 200

[[redirects]]
  from = "/legal/supericons-single-icon-license/"
  to = "/legal/supericons-single-icon-license/index.html"
  status = 200
```

[SOURCE: public/legal/supericons-single-icon-license/index.html] [SOURCE: netlify.toml]

Acceptance:
- No active app code points at `/legal/supericons-single-icon-license`.
- The standalone page is gone from the next build output.

### Step 7: Fix Direct Legal Routes

Extend runtime route mapping so direct public paths map to app views. [SOURCE: lib/view-route-policy.js] [SOURCE: lib/public-route-seo.js]

Minimum:

- `/terms/` -> `terms`
- `/privacy/` -> `privacy`

Preferred:

- Generate or share pretty route mappings from `PUBLIC_ROUTE_SEO` where safe, so app runtime and SEO route metadata do not drift. [ASSUMPTION]

Acceptance:
- Browser-loaded `/terms/` renders Terms.
- Browser-loaded `/privacy/` renders Privacy.
- Browser-loaded `/?view=terms` still renders Terms.
- Browser-loaded `/?view=privacy` still renders Privacy.
- Browser-loaded `/terms/#single-icon-license` renders Terms and scrolls to the single-icon section.

### Step 8: Add Regression Checks

Add or extend scripts to verify:

- Each locale has `legal.terms.bodyHtml`.
- Each locale Terms HTML contains `id="single-icon-license"`.
- `data/`, `public/`, and `mcp/public/` catalogs match where expected.
- `licenseUrlPath` points to the Terms anchor, not `/legal/supericons-single-icon-license`.
- `netlify.toml` no longer contains the standalone legal redirects.
- Direct routes `/terms/` and `/privacy/` map correctly in the browser.

Acceptance:
- Existing i18n verification still passes.
- Route policy verification passes.
- A Playwright or equivalent smoke test confirms the legal views and anchor locally.

### Step 9: Local Verification Only

Run local verification in this order:

1. Static grep checks for removed standalone path.
2. i18n catalog verification.
3. route policy verification.
4. local build.
5. local preview or dev-server browser smoke for:
   - `/?view=terms#single-icon-license`
   - `/?locale=zh-Hans&view=terms#single-icon-license`
   - `/terms/#single-icon-license`
   - `/privacy/`

No Netlify deploy in this plan. [ASSUMPTION]

## Success Metrics

| Metric | Definition |
|---|---|
| Legal integration correctness | The single-icon license appears inside the existing Terms view in English and all supported locales. |
| Route correctness | `/terms/`, `/privacy/`, `/?view=terms`, and `/?view=privacy` all render the intended legal views. |
| Anchor correctness | `#single-icon-license` lands on the single-icon section. |
| x402 reference correctness | The x402 config license path points to the Terms anchor and no longer points to the standalone page. |
| Drift prevention | Verification fails if the standalone legal path returns or if any locale lacks the section. |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Legal wording is not counsel-reviewed | Mainnet x402 could ship with weak or unclear rights language. | Mark copy as draft until owner/legal review. |
| Localization quality varies | Non-English legal copy may be structurally present but semantically imperfect. | Preserve structure, run automated checks, and queue native/counsel review for legal nuance. |
| Route mapping creates new SPA behavior regressions | Pretty routes may affect Pricing, Docs, or tool routes. | Start with Terms/Privacy or share mappings carefully with route-policy tests. |
| Static snapshot and runtime route systems drift | SEO files may point to routes the app cannot render. | Add route verification that compares public route SEO entries to runtime route mapping where appropriate. |
| The x402 endpoint remains disabled but config changes confuse future testing | Test scripts may expect a different license URL. | Update x402 verifier expectations with the new license URL. |

## Open Questions

1. Should the final production x402 license URL be `/?view=terms#single-icon-license` or `/terms/#single-icon-license` after direct route hygiene is fixed? [ASSUMPTION]
2. Should the single-icon license be a section of Terms only, or should Docs also link to it from an x402 agent guide? [ASSUMPTION]
3. Should the old standalone URL redirect to the new Terms anchor for backward compatibility, or should it be removed entirely from Netlify redirects? [ASSUMPTION]
4. Does `hello@supericons.dev` remain the correct support email for settlement disputes and license questions? [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]
5. Should the single-icon purchase be described as "one project", "one end product", or both in the final copy? [SOURCE: docs/legal/supericons-single-icon-license-draft-2026-07-06.md]

## Recommendation

Implement this as a local-only patch in the next pass. [ASSUMPTION]

Use the existing Terms page as the main home for the single-icon license, localize it across all supported locales, update x402 to point to the Terms anchor, remove the standalone legal page, and fix `/terms/` plus `/privacy/` direct routes before any future deploy. [SOURCE: store.js] [SOURCE: data/i18n/messages/*.json] [SOURCE: supabase/functions/_shared/x402-single-icon-config.ts]

