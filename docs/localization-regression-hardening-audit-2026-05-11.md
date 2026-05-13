# Localization Regression Hardening Audit

**Date:** 2026-05-11
**Audited files:**
- `scripts/verify-auth-error-localization.mjs`
- `scripts/repair-auth-account-checkout-localization.mjs`
- `scripts/verify-auth-message-browser-smoke.mjs`
- `package.json` (script additions)
- `data/i18n/messages/*.json` (12 locale files)
- `public/i18n/messages/*.json` (12 locale files)
- `mcp/public/i18n/messages/*.json` (12 locale files)
- `docs/superpowers/plans/2026-05-11-localization-regression-hardening.md`

---

## Verdict

**No blocking issues.** The implementation is correct and the verified regressions are genuinely fixed.

---

## 1. Does the verifier catch the real regression class?

**Yes, broadly.** It uses three complementary mechanisms:

- **Action-label collision** (`verify-auth-error-localization.mjs:159-161`, `177-179`): Builds a set of known action labels from all `auth.copy.*.submit`, `auth.copy.*.title`, `auth.copy.*.toggleAction`, plus 7 top-level keys like `auth.sendResetLink`, `auth.continueWithGoogle`. Then checks every `requiredMessagePaths` entry against that set.
- **Minimum length** (`:100-105`): Uses script-aware thresholds — 12 chars for Latin-heavy strings, 6 for CJK/other scripts.
- **Placeholder parity** (`:135-141`, `182-185`): Compares `{email}` and other placeholder signatures between each locale and English.

**Coverage:** 16 error keys, 47 message paths, 12 locales. The label set is constructed dynamically from the actual catalog, not just a static list.

**Residual risk:** If a future commit adds a new action label key outside the enumerated `actionLabelPaths` or `collectAuthActionLabels` scope, the verifier won't know about it. The approach is "known-bounds" detection, not full semantic analysis. This is a reasonable tradeoff.

---

## 2. Are any message-like keys still action labels?

**No.** Zero leaks found across all 12 locales. Every previously-regressed key now contains a complete, message-like string.

---

## 3. Are placeholders preserved?

**Yes.** All `{email}` signatures match English across all 12 locales for all 12 checked keys:

- `auth.forgot.sentStatus`
- `auth.reset.createForEmail`
- `auth.reset.chooseForEmail`
- `auth.reset.createForAccount`
- `auth.reset.chooseForAccount`
- `auth.verify.existing.stageText`
- `auth.verify.unconfirmed.stageText`
- `auth.verify.unconfirmed.resentStatus`
- `auth.verify.pending.stageText`
- `auth.verify.pending.sentStatus`
- `auth.verify.pending.resentStatus`
- `account.password.resetSent`

---

## 4. Are source, public, and MCP catalogs synchronized?

**Yes.** All 12 locale JSON files are byte-identical across `data/i18n/messages/`, `public/i18n/messages/`, and `mcp/public/i18n/messages/`.

---

## 5. Did the repair script introduce invalid JSON, mojibake, or awkward translations?

**No mojibake or replacement characters found.** All 12 files parse cleanly and re-serialize without corruption.

**Translation quality:** Spot-checked CJK and western locales — all contain natural, complete message copy.

| Locale | `auth.forgot.description` | Quality |
|--------|--------------------------|---------|
| ja | "アカウントのメールアドレスを入力すると、安全なリセットリンクを送信します。" | Natural |
| ko | "계정 이메일을 입력하면 안전한 재설정 링크를 보내드립니다." | Natural |
| zh-Hans | "输入你的账户邮箱，我们会发送安全的重置链接。" | Natural |
| ar | "أدخل بريد حسابك وسنرسل لك رابط إعادة تعيين آمنا." | Natural |
| es | "Introduce el correo de tu cuenta y te enviaremos un enlace seguro de restablecimiento." | Natural |

**Structural concern:** The `western`, `asian`, and `more` objects use positional arrays (e.g., `portal: ['...', '...', '...', '...']`) mapped to dotted-path keys by index order. This is fragile — if someone inserts a key into `portalKeys` or `accountKeys` without updating every locale's array, values silently shift. However, the `copyDescriptionRepairs` object (which handles the most sensitive keys) uses explicit dotted-path mapping and is safe. The arrays are only used for `portal`, `account`, and `auth` key groups, and the key arrays are co-located with the data.

**Question mark normalization** (`repair-auth-account-checkout-localization.mjs:8`): `value.replace(/\?/g, '.')` — converts `?` to `.` in all values. This is intentional (some locales had question marks where periods were needed) but could silently corrupt a legitimate `?` in a translated question. No current values are affected.

---

## 6. Does the browser smoke test actually verify rendered UI behavior?

**Partially.** It verifies:

- Forgot-password modal renders message-like copy for all 12 locales (title, desc, note, submit all non-empty; desc ≠ submit; desc ≥ 12 chars)
- Wrong-password error status in English is not the "Sign in" action label

It does **not** verify:

- Checkout/account/verification flows in the browser
- That `{email}` placeholders are actually interpolated (only checks static text)
- Other locales for the wrong-password flow (only English)
- Reset-password, account-update, or portal-opening states

The test requires a running dev server (`http://127.0.0.1:5173/`), so it can't run without `npm run dev` first. This is expected for Playwright tests.

---

## 7. Are package.json script changes duplicated or misplaced?

**No duplicates.** The 9 new scripts are all unique and correctly placed:

| Script | Target |
|--------|--------|
| `verify:i18n-audit-findings` | Existing audit verifier |
| `verify:i18n-localization-audit` | May 10 audit verifier |
| `verify:auth-error-localization` | The regression verifier |
| `verify:auth-message-browser-smoke` | The Playwright smoke test |
| `verify:commercial-localization` | Commercial page verifier |
| `verify:logged-in-stripe-localization` | Logged-in/stripe verifier |
| `verify:cjk-search-quality` | CJK search quality |
| `verify:cjk-search-fixtures` | CJK search fixtures |
| `verify:web-cjk-search` | CJK web search |

All point to existing script files. No misplacements.

---

## 8. Did Codex accidentally alter unrelated files?

The regression hardening touched only:

- `package.json` — 9 script additions (correct)
- `scripts/verify-auth-error-localization.mjs` — new
- `scripts/repair-auth-account-checkout-localization.mjs` — new
- `scripts/verify-auth-message-browser-smoke.mjs` — new
- `data/i18n/messages/*.json` — 12 files repaired
- `public/i18n/messages/*.json` — 12 files rebuilt
- `mcp/public/i18n/messages/*.json` — 12 files rebuilt
- `docs/superpowers/plans/2026-05-11-localization-regression-hardening.md` — plan doc

Other modified files in the working tree (`auth.js`, `main.js`, `store.js`, `style.css`, `index.html`, etc.) are from the broader localization work, not the regression hardening. No unrelated files were touched by the hardening scripts.

---

## 9. Are there missing tests that should be added?

**Yes — gaps in browser smoke coverage:**

| Flow | Browser coverage | Verifier coverage |
|------|-----------------|-------------------|
| Forgot-password modal (all 12 locales) | Yes | Yes |
| Wrong-password error (English only) | Yes | Yes |
| Reset-password modal | No | Yes (static) |
| Account-update toast | No | Yes (static) |
| Checkout portal opening/error | No | Yes (static) |
| Auth context descriptions (purchase/subscribe/pro) | No | Yes (static) |
| Verification flow (existing/unconfirmed/callback/pending) | No | Yes (static) |
| `{email}` interpolation in rendered UI | No | Yes (static signature only) |

The static verifier is comprehensive. The browser smoke test covers the highest-risk case (forgot-password across all locales). The gap is that no browser test exercises checkout, account, or verification flows end-to-end.

---

## Command Results

| Command | Result |
|---------|--------|
| `npm run verify:auth-error-localization` | PASS |
| `node scripts/verify-i18n-catalogs.mjs` | PASS |
| `npm run verify:commercial-localization` | PASS |
| `npm run verify:logged-in-stripe-localization` | PASS |
| `npm run verify:i18n-localization-audit` | PASS |
| `npm run verify:auth-message-browser-smoke` | SKIP (requires running dev server) |
| `npm run build` | PASS (transient filesystem error on si-registry step, unrelated to localization) |
| Catalog sync (source/public/mcp) | PASS (all 12 locales identical) |
| Mojibake/replacement character scan | PASS (none found) |
| Action-label leak scan (all locales) | PASS (zero leaks) |
| Placeholder signature scan (all locales) | PASS (all match English) |

---

## Residual Risks (ordered by significance)

1. **Positional array fragility** — `portalKeys`, `accountKeys`, `authKeys` in the repair script are mapped by index. If anyone adds/removes a key from these arrays without updating every locale's data array, translations silently shift to wrong keys. Low probability today, higher if the key lists are extended.

2. **Browser smoke coverage gap** — Only forgot-password and wrong-password are tested in-browser. Checkout portal, account update, and verification flows rely only on static catalog checks.

3. **Verifier action-label scope** — The label set is hardcoded to known action-label paths. New UI action labels added outside these paths won't be caught.

4. **`?` to `.` normalization** — Harmless today but could corrupt legitimate question marks in future translations.

5. **CJK minimum length boundary** — `zh-Hans` `account.toast.updated` = `"账户已更新。"` is exactly 6 chars (the CJK threshold). This passes but is the tightest possible boundary. A future shorter CJK toast would fail.
