# Auth UX Flow Hardening Plan: Audit Findings

Audited [auth-ux-flow-hardening-plan.md](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/auth-ux-flow-hardening-plan.md) against [auth.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js) (1357 lines), [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) (intent system), and [index.html](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html) (modal markup).

---

## Verdict: Solid Plan, Mostly Accurate

The plan correctly identifies the 4 highest-severity gaps and proposes a reasonable 6-phase fix sequence. However, it **overstates 2 gaps** that are already partially addressed and **misses 5 items** that should be on the radar.

---

## Confirmed Gaps (Plan Is Correct)

| # | Plan Claim | Code Evidence | Severity |
|---|---|---|---|
| 1 | Duplicate signup shows misleading "check email" | [auth.js:1050-1056](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1050-L1056): `if (result?.session)` is the only branch; `session: null` always triggers verify stage | High |
| 2 | No resend confirmation action | Zero results for "resend" in auth.js; no HTML button for it | High |
| 3 | Raw Supabase errors shown on sign-in failure | [auth.js:1063](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1063): `err.message \|\| 'Something went wrong'` passes raw strings | Medium |
| 4 | Forgot-password copy is too definitive | [auth.js:1085](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1085): `We sent a reset link to ${email}.` regardless of email existence | Medium |
| 5 | No expired/invalid recovery link handling | [auth.js:170-191](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L170-L191): `onAuthStateChange` only handles `PASSWORD_RECOVERY`, `SIGNED_IN`, `SIGNED_OUT`; no error fragment parsing | High |
| 6 | Account modal password not provider-aware | [auth.js:1156-1177](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1156-L1177): always calls `requestPasswordReset()` regardless of OAuth-first status | Medium |
| 7 | Legacy listener code increases maintenance risk | [auth.js:1188-1318](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1188-L1318): `wireAuthListenersLegacy()` is a full dead duplicate | Low |

---

## Overstated Gaps (Already Partially Fixed)

### 1. Verify stage copy (Scenarios 5, 6)

The plan says "broken in production" but the verify stage copy is **already neutral**:

```
// auth.js:756
"If this email is new, look for a confirmation email.
 If you already have a Supericons account, sign in instead."
```

This is privacy-safe. The plan should acknowledge this is done and focus only on the remaining sub-gaps (no resend button, no provider detection).

### 2. Google CTA on verify stage (Scenario 6)

The plan says "no provider-aware CTA in deployed build" but the Google button **already exists** in both HTML and JS:
- [index.html:468](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L468): `authVerifyGoogleBtn` element
- [auth.js:1020-1028](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L1020-L1028): wired click handler
- [auth.js:787](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L787): visibility toggled by stage

> [!IMPORTANT]
> These two items should be removed from the "High Severity" gap summary (plan lines 259-261) and marked as completed prerequisites.

---

## Gaps the Plan Missed

### 1. No detection signal for duplicate signups

The plan proposes an "auth-result interpreter" with buckets (`immediate_session`, `confirmation_or_existing_account`, `error`) but does not specify **how** to detect a duplicate. Supabase's `signUp()` for an existing confirmed user with email confirmation enabled returns a fake user object with `identities: []` (empty array). This is the canonical detection signal:

```js
// Proposed detection logic (not in plan)
const isLikelyExisting = data?.user?.identities?.length === 0;
```

Without this, Phase 1 has no concrete implementation path.

### 2. No rate limit on resend confirmation

Phase 2 adds a resend confirmation action but does not mention client-side rate limiting. Users can spam the button and trigger Supabase rate limits (429), which would show a raw error.

### 3. Missing `onAuthStateChange` events

The current listener ignores `TOKEN_REFRESHED` and `USER_UPDATED` events. While not UX-critical, `USER_UPDATED` should update `currentUser` and re-render the UI (relevant after Phase 3's `updateUser({ password })` flow).

### 4. Redirect error fragment format unspecified

Phase 4 says "parse redirect hash/query fragments" but does not document what Supabase actually puts in the URL on failure. The format is:
```
#error=access_denied&error_code=403&error_description=Email+link+is+invalid+or+has+expired
```
The plan should specify the exact parsing logic.

### 5. `wireAuthListenersLegacy()` is dead code, not just "legacy"

The plan (line 274) says "Legacy auth listener code remains and increases maintenance risk." This understates the issue. `wireAuthListenersLegacy()` is **never called** from anywhere. It is dead code that should be deleted outright, not just flagged as low severity.

---

## Plan Structure Assessment

| Aspect | Rating | Notes |
|---|---|---|
| Scenario coverage | Strong | 17 scenarios covers all realistic paths |
| Severity classification | Needs update | 2 items in "High" are already done |
| Phase ordering | Correct | Dependencies flow naturally (1 -> 2 -> 3 -> 4 -> 5 -> 6) |
| Acceptance criteria | Good | Testable and specific per phase |
| Implementation detail | Gaps | Phase 1 missing detection signal; Phase 2 missing rate limit; Phase 4 missing URL format |
| Launch blockers | Correct | The 5 blockers are the right call |

---

## Recommended Amendments

1. **Move Scenarios 5/6 verify copy and Google CTA from "broken" to "done"** in the gap summary
2. **Add `identities: []` detection** to Phase 1's implementation section
3. **Add client-side cooldown** (30s debounce) to Phase 2's resend button
4. **Specify Supabase error fragment format** (`#error=...&error_code=...&error_description=...`) in Phase 4
5. **Promote legacy code deletion** from "Low Severity" to Phase 1 prerequisite (removing 130 lines of dead code reduces review noise for all subsequent phases)
6. **Add `USER_UPDATED` handler** to Phase 3 scope since `updateUser({ password })` triggers it
