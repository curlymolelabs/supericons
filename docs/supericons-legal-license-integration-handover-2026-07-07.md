# Supericons Legal License Integration Handover

Date: 2026-07-07
Audience: Review agent
Status: Review requested; no implementation patch has been made for this integration yet.

## Why This Handover Exists

The single-icon x402 license was added as a standalone static page, but the product owner clarified that this is not the desired shape. The license should match the existing Terms and Privacy system, should link back naturally through the app experience, and should be localized. This handover summarizes the verified current state, the PRD/plan created for the correction, and the recommended review focus.

## Files Created In This Pass

- `docs/supericons-legal-license-integration-prd-plan-2026-07-07.md`

This is a PRD and implementation plan only. It does not change app behavior.

## Local Working Tree Status Relevant To This Handover

Verified with `git status --short docs\supericons-legal-license-integration-prd-plan-2026-07-07.md public\legal\supericons-single-icon-license\index.html netlify.toml supabase\functions\_shared\x402-single-icon-config.ts data\i18n\messages\en.json`:

```txt
 M data/i18n/messages/en.json
?? docs/supericons-legal-license-integration-prd-plan-2026-07-07.md
```

Notes:

- The PRD file above is the only file intentionally added in this pass.
- `data/i18n/messages/en.json` was already modified in the working tree; it was not edited in this pass.
- No deploy, build, or code patch was run for the PRD handover.

## Verified Current Product State

### Local Source State

- `public/legal/supericons-single-icon-license/index.html` exists and is a standalone HTML page.
- `netlify.toml` still contains redirects from `/legal/supericons-single-icon-license` and `/legal/supericons-single-icon-license/` to that static HTML page.
- `supabase/functions/_shared/x402-single-icon-config.ts` still has:

```ts
licenseUrlPath: "/legal/supericons-single-icon-license",
```

- `store.js` has `renderTermsPage()` and `renderPrivacyPage()`.
- `store.js` renders Terms from `legal.terms.bodyHtml` and Privacy from `legal.privacy.bodyHtml`.
- `main.js` footer links call `switchView('terms')` and `switchView('privacy')`.
- All 12 `data/i18n/messages/*.json` locale catalogs have Terms and Privacy bodies.
- None of the 12 locale Terms bodies currently contain `single-icon-license`.

### Live Browser State

Verified with Playwright against `https://supericons.dev`:

| URL | Observed Result |
|---|---|
| `/legal/supericons-single-icon-license` | Shows standalone `Supericons Single Icon License` page. |
| `/terms/` | Shows homepage hero, not the Terms view. |
| `/?view=terms` | Renders Terms content; `Usage Rights` is visible. |
| `/privacy/` | Shows homepage hero, not the Privacy view. |
| `/?view=privacy` | Renders Privacy content; `Data We Collect` is visible. |

This means the static license page is live, but the app's direct legal pretty routes are not currently mapped at runtime.

## PRD Summary

The PRD recommends:

1. Move the single-icon license into the existing Terms page as a section with:

```html
<section class="terms-section" id="single-icon-license">
```

2. Localize that section across all 12 supported locale catalogs.
3. Update x402 to point to the Terms anchor instead of the standalone page.
4. Remove the standalone static page and the Netlify redirects.
5. Fix runtime route mapping so `/terms/` and `/privacy/` render the intended views.
6. Add local verification for i18n, route policy, the license anchor, and removal of stale standalone legal paths.
7. Do not deploy unless the owner explicitly approves.

## Recommended Implementation Direction

### Preferred License URL

Use this during the transition because it already matches the working query-string legal route pattern:

```txt
https://supericons.dev/?view=terms#single-icon-license
```

After direct route mapping is fixed and verified, this should become viable:

```txt
https://supericons.dev/terms/#single-icon-license
```

### Content Source

Use `docs/legal/supericons-single-icon-license-draft-2026-07-06.md` as the source for the Terms-page section. Keep it compact, but preserve these ideas:

- one paid animated icon
- wallet/account controller or authorized buyer as licensee
- authorized agents can buy/use on behalf of the buyer
- non-exclusive, worldwide, perpetual use for one end product/project
- personal, commercial, client, internal, source-code, built-app, screenshot, demo, documentation, and marketing use allowed for that project
- no resale, sublicensing, standalone redistribution, icon packs, templates, design kits, marketplaces, asset databases, competing libraries, stock asset products, or training sets
- keep x402 receipt/settlement data when available
- support contact remains `hello@supericons.dev` unless owner changes it

## Review Focus For The Other Agent

Please review the PRD for:

1. Whether the license belongs inside Terms as a section, or should be a separate app view with the same legal chrome and localization.
2. Whether `/?view=terms#single-icon-license` is the safer interim x402 license URL than `/terms/#single-icon-license`.
3. Whether removing `/legal/supericons-single-icon-license` entirely is acceptable, or whether it should redirect to the Terms anchor for backward compatibility.
4. Whether the route fix should be narrow (`/terms/`, `/privacy/` only) or generalized from `lib/public-route-seo.js` to avoid SEO/runtime route drift.
5. Whether the implementation should add a dedicated verification script for legal localization, or extend existing i18n and route-policy checks.
6. Whether the single-icon license section should be added to every locale immediately or whether English-only plus explicit owner-approved fallback is acceptable. The PRD recommends all locales immediately.

## Suggested Next Patch Sequence

1. Add the English single-icon license section to `data/i18n/messages/en.json`.
2. Add translated sections to all 11 non-English locale catalogs.
3. Sync `public/i18n/messages/*.json` and `mcp/public/i18n/messages/*.json` if current parity rules still require checked-in mirrors.
4. Update `supabase/functions/_shared/x402-single-icon-config.ts` license path to the Terms anchor.
5. Remove `public/legal/supericons-single-icon-license/index.html`.
6. Remove the standalone legal redirects from `netlify.toml`.
7. Fix direct route mapping for `/terms/` and `/privacy/`.
8. Add verification:
   - each locale has `id="single-icon-license"`
   - x402 config no longer points at `/legal/supericons-single-icon-license`
   - `netlify.toml` no longer includes the standalone legal redirects
   - direct `/terms/` and `/privacy/` route mappings work
9. Run local build and local browser smoke only.
10. Stop and report. Do not deploy without explicit owner approval.

## Important Boundary

The owner explicitly objected to an unrequested Netlify deploy. Do not deploy, trigger Netlify, push to a deployment branch, or change Supabase live state unless explicitly instructed.

## Verification Commands Used For This Handover

```powershell
git status --short docs\supericons-legal-license-integration-prd-plan-2026-07-07.md public\legal\supericons-single-icon-license\index.html netlify.toml supabase\functions\_shared\x402-single-icon-config.ts data\i18n\messages\en.json
```

```powershell
rg -n "licenseUrlPath|supericons-single-icon-license|single-icon-license|legal\.terms|legal\.privacy|renderTermsPage|renderPrivacyPage" docs\supericons-legal-license-integration-prd-plan-2026-07-07.md public\legal\supericons-single-icon-license\index.html netlify.toml supabase\functions\_shared\x402-single-icon-config.ts store.js data\i18n\messages\en.json
```

```powershell
# Node script checked all data/i18n/messages/*.json for:
# hasTerms, hasPrivacy, and hasSingleIconAnchor.
```

```powershell
# Playwright checked:
# https://supericons.dev/legal/supericons-single-icon-license
# https://supericons.dev/terms/
# https://supericons.dev/?view=terms
# https://supericons.dev/privacy/
# https://supericons.dev/?view=privacy
```

