# I18n Audit Remediation Plan

**Goal:** Verify the findings in `docs/i18n-audit.md`, fix confirmed user-facing localization gaps, and add regression checks so the same problems cannot silently return.

**Verified Findings:**
- Several docs metadata/body fields leaked Spanish into German, Portuguese, Arabic, Hindi, Vietnamese, and Thai.
- `docs-mcp-others.navLabel` was still English in German, Portuguese, Arabic, Hindi, Vietnamese, and Thai.
- `confirm.*` and `toast.*` still used English text in every non-English locale.
- German, Portuguese, and Arabic API-key, purchase, claim, and dashboard copy used placeholder values such as section titles, “close,” or repeated labels.
- German, Portuguese, and Arabic privacy pages had distinct headings but repeated the same generic body copy across sections.

**Plan:**
1. Add a repair script that patches the confirmed audit gaps in source catalogs only.
2. Replace leaked docs summary/body text with locale-specific summaries and generic localized docs body guidance that preserves literal commands.
3. Translate clear-dialog and toast copy for all non-English locales.
4. Replace German, Portuguese, and Arabic logged-in/API-key/purchase/claim namespaces with full, distinct UI copy.
5. Replace repeated German, Portuguese, and Arabic privacy section bodies with section-specific text that preserves the operational meaning without adding new legal promises.
6. Export repaired catalogs to `public/i18n/messages` and `mcp/public/i18n/messages`.
7. Add a verifier covering the audited failure modes: Spanish leakage, English confirm/toast fallback, placeholder-heavy API-key copy, wrong dashboard labels, repeated privacy bodies, and catalog parity.
8. Run existing i18n, docs, commercial, logged-in/Stripe, and build checks.

**Execution Result:**
- Implemented `scripts/repair-i18n-audit-findings.mjs`.
- Implemented `scripts/verify-i18n-audit-findings.mjs`.
- Added `npm run verify:i18n-audit-findings`.
- Regenerated source, public, and MCP i18n catalogs.
- Verified all audit-remediation and existing i18n/build gates.
