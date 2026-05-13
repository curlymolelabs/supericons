# Follow-Up Fixes Audit: Localization Regression Hardening

**Date:** 2026-05-11
**Audited round:** Follow-up fixes addressing prior audit residual risks

---

## Verdict

**No blocking issues.** All five prior residual risks have been addressed. The refinements are correct and introduce no new problems.

---

## Prior Residual Risk #1: Positional array fragility

**Status: Fixed.** The repair script now uses `expandGroup()` (`repair-auth-account-checkout-localization.mjs:17-26`) which throws a hard error if array length doesn't match key count:

```js
if (values.length !== keys.length) {
  throw new Error(`${locale}.${groupName} has ${values.length} values for ${keys.length} keys`);
}
```

This converts silent value-shift-on-drift into an immediate crash. The positional arrays still exist (not replaced with dotted-path maps), but the failure mode is now loud rather than silent. Acceptable.

---

## Prior Residual Risk #2: Browser smoke coverage gap

**Status: Fixed.** The smoke test now covers four flows:

1. **Forgot-password modal** — all 12 locales (`verify-auth-message-browser-smoke.mjs:26-41`). Asserts desc != submit, note != submit, desc >= 12 chars.
2. **Subscribe auth** — English (`:43-58`). Opens pricing page, clicks Pro button, asserts desc and note are message-like, title includes "Pro".
3. **Purchase auth** — English (`:60-70`). Opens pricing page, clicks Launch Bundle button, asserts desc and note are message-like, title includes "purchase".
4. **Wrong-password** — English (`:72-84`). Asserts status != "Sign in" and is message-like.

New `assertMessageLike()` helper (`:19-23`) consolidates the empty/equality/length checks.

---

## Prior Residual Risk #3: Verifier action-label scope

**Status: Fixed.** The verifier now has three layers of action-label detection:

1. **Static key collection** (`verify-auth-error-localization.mjs:107-120`): `collectAuthActionLabels()` gathers from `auth.copy.*.submit/title/toggleAction` plus 7 top-level keys.
2. **Static path collection** (`:143-148`): `actionLabelPaths` adds 13 explicit dotted paths.
3. **Dynamic regex scan** (`:126-153`): `flattenMessages()` walks the entire catalog tree. `isLikelyActionPath()` (`:139-141`) matches leaf paths ending in action-like segments: `cta`, `submit`, `toggleAction`, `sendResetLink`, `resendConfirmation`, `continueWithGoogle`, `forgotPassword`, `backToSignIn`, `updatePassword`, `getNewResetLink`, `saveDisplayName`, `setPassword`, `sendResetEmail`, `signOut`, `signIn`, `copy`, `copySvg`, `copyBase64`, `download`, `downloadSvg`, `downloadPng`, `clear`, `clearAll`, `close`, `cancel`, `revoke`, `generateKey`, `manageSubscription`.

The regex only fires on leaf string values (the `flattenMessages` function emits `[path, value]` pairs), so nested object keys like `auth.copy.default.signin` don't false-positive — only the leaf `.desc`, `.title`, `.submit` etc. are checked.

---

## Prior Residual Risk #4: `?` to `.` normalization

**Status: Fixed.** Confirmed removed from the repair script. The `setPath` function (`repair-auth-account-checkout-localization.mjs:6-15`) now writes values directly without transformation:

```js
function setPath(target, dottedPath, value) {
  if (typeof value === 'undefined') return;
  const parts = dottedPath.split('.');
  // ... no .replace() call
}
```

Legitimate question marks are preserved across all locales:

- English: `auth.copy.*.signin.toggle` = `"Need an account first?"` (3 keys)
- zh-Hans: `"需要先创建账户吗？"` (fullwidth question mark preserved)
- zh-Hant: `"需要先建立帳戶嗎？"` (fullwidth question mark preserved)

Non-question-mark locales use declarative phrasing (e.g., es: `"No tienes cuenta."`, de: `"Du hast noch kein Konto."`, ja: `"アカウントがありません。"`) — these are natural localized equivalents, not corruption.

---

## Prior Residual Risk #5: CJK minimum length boundary

**Status: Unchanged, acceptable.** `zh-Hans` `account.toast.updated` = `"账户已更新。"` is 6 chars (5 CJK letters + period). The CJK threshold is 6. This passes by the thinnest margin but is a correct, natural translation. No fix needed.

---

## Additional Checks

| Check | Result |
|-------|--------|
| Action-label leaks (all 12 locales, 14 message keys) | None found |
| Placeholder signatures ({email} etc., all 12 locales, 12 keys) | All match English |
| Mojibake / replacement characters | None found |
| JSON integrity / formatting drift | None found |
| Source to public to MCP sync | All 12 locales identical |
| Source to dist sync | All 12 locales identical (post-build) |
| Internal metadata leaks (openai, deepl, etc.) | None found |
| Build | Passes |

---

## Command Results

| Command | Result |
|---------|--------|
| `npm run verify:auth-error-localization` | PASS |
| `node scripts/verify-i18n-catalogs.mjs` | PASS |
| `npm run verify:commercial-localization` | PASS |
| `npm run verify:logged-in-stripe-localization` | PASS |
| `npm run verify:i18n-localization-audit` | PASS |
| `npm run verify:auth-message-browser-smoke` | SKIP (requires dev server) |
| `npm run build` | PASS |
| Catalog sync (source/public/mcp) | PASS |
| Catalog sync (source/dist, post-build) | PASS |
| Mojibake/replacement character scan | PASS |
| Action-label leak scan | PASS |
| Placeholder signature scan | PASS |

---

## `verify-i18n-catalogs.mjs` Coverage

The catalog verifier (`verify-i18n-catalogs.mjs`) catches:

1. **Key parity** (`:49`): Every locale must have exactly the same keys as English.
2. **Placeholder parity** (`:51-56`): `{email}` and other placeholders must match English for every key.
3. **Non-empty values** (`:57`): No key may be blank.
4. **Mojibake detection** (`:14`): Regex for known mojibake patterns (double-encoded UTF-8).
5. **Replacement character detection** (`:15`): `\uFFFD` scan.
6. **Internal metadata detection** (`:16`): Catches leaked `openai`, `deepl`, `google cloud`, `reviewer_model`, `prompt_notes`, etc.
7. **Source to public to MCP drift** (`:60-63`): Deep equality check for every locale across all three directories.

This is comprehensive. The only gap is that dist is not checked by this verifier (dist sync is verified separately by the build process).

---

## Question Mark Preservation Audit

English toggle strings use `?` legitimately:

- `auth.copy.purchase.signin.toggle` = `"Need an account first?"`
- `auth.copy.subscribe.signin.toggle` = `"Need an account first?"`
- `auth.copy.pro.signin.toggle` = `"Need an account first?"`

Non-English equivalents use locale-appropriate punctuation:

- zh-Hans/zh-Hant: `？` (fullwidth question mark)
- ko: `.` (period — declarative phrasing in Korean)
- All others: `.` (period — declarative phrasing)

No question marks were corrupted or lost. The removal of the blanket `?` to `.` normalization was correct.

---

## Unrelated File Changes

The only modified tracked file is `package.json` (9 script additions). All i18n files (`data/i18n/messages/`, `public/i18n/messages/`, `mcp/public/i18n/messages/`) are untracked (new). No unrelated files were touched by the follow-up fixes.

---

## Remaining Gaps (non-blocking)

1. **Browser smoke test doesn't cover non-English subscribe/purchase flows.** The forgot-password test runs all 12 locales, but subscribe and purchase auth flows are English-only. Low risk since the static verifier covers all locales.

2. **No browser test for reset-password, verification email, account profile save, or checkout portal error flows.** These are covered by the static verifier but not by Playwright. Medium-value additions for future hardening.

3. **`expandGroup` validates length but not key-name-to-value semantic alignment.** If someone swaps two values within an array (e.g., `portal[0]` and `portal[1]`), the length check passes but the mapping is wrong. Low probability given the co-located structure.

4. **`isLikelyActionPath` regex could false-positive on future keys ending in `copy`, `close`, `cancel`, or `download`.** These are broad action categories. Currently no conflicts exist, but new message keys with these suffixes would be flagged as action labels. The `requiredMessagePaths` list is the primary gate; the regex is defense-in-depth.
