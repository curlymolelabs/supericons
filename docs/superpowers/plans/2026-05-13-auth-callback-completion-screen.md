# Auth Callback Completion Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make email confirmation and password reset completion tabs feel disposable while keeping the original Supericons tab updated.

**Architecture:** Reuse the existing auth modal and add one `complete` stage instead of creating a second modal system. Auth callback events still broadcast to other tabs; the callback tab shows a localized completion state with clear "Continue here" and "Close this tab" actions.

**Tech Stack:** Plain HTML/CSS/JavaScript, existing `window.__supericons.t` i18n catalogs, Supabase Auth browser events, existing static verifier scripts.

---

### Task 1: Add Completion Stage Markup

**Files:**
- Modify: `index.html`

- [x] Add `authCompletionStage` inside `#authModal` after `#authResetStage`.
- [x] Include icon, title, body text, primary continue button, secondary close-tab button, and status text.
- [x] Keep IDs stable: `authCompletionIcon`, `authCompletionTitle`, `authCompletionText`, `authCompletionContinueBtn`, `authCompletionCloseTabBtn`, `authCompletionStatus`.

### Task 2: Style Completion Actions

**Files:**
- Modify: `style.css`

- [x] Reuse existing `auth-verify` spacing and button styles.
- [x] Add a primary completion button class that matches the orange auth submit button.
- [x] Add a muted status line for browsers that block `window.close()`.

### Task 3: Wire Auth Callback Completion Logic

**Files:**
- Modify: `auth.js`

- [x] Extend `AUTH_MODAL_DEFAULT_STATE.stage` to support `complete`.
- [x] Add callback completion kinds: email confirmed, signed in, password updated.
- [x] On `SIGNED_IN` caused by an email callback, show the completion stage after publishing the cross-tab event.
- [x] On password update success from reset flow, show the completion stage after publishing the password-updated event.
- [x] Keep direct sign-in and ordinary sign-out behavior unchanged.
- [x] Continue button closes the modal and leaves the user in the current tab.
- [x] Close-tab button attempts `window.close()` and falls back to a localized "You can close this tab manually" message.

### Task 4: Add Localized Copy

**Files:**
- Modify: `data/i18n/messages/*.json`
- Generate: `public/i18n/messages/*.json`, `mcp/public/i18n/messages/*.json`

- [x] Add `auth.completion.*` keys for every supported locale.
- [x] Preserve JSON structure and avoid placeholders except `{email}` if later needed.
- [x] Generate public catalogs with `node scripts/build-i18n-public-catalogs.mjs`.

### Task 5: Harden Verification

**Files:**
- Modify: `scripts/verify-auth-flow-bridge.mjs`

- [x] Assert the completion stage markup exists.
- [x] Assert `auth.js` contains `showAuthCompletionStage`.
- [x] Assert all completion keys exist in `data`, `public`, and `mcp/public` catalogs.
- [x] Assert no completion string contains question-mark mojibake artifacts.

### Task 6: Verify

**Commands:**
- [x] `npm run verify:auth-flow-bridge`
- [x] `npm run verify:auth-cooldown-resume`
- [x] `npm run verify:auth-error-localization`
- [x] `npm run verify:i18n-catalogs`
- [x] `npm run build`

**Manual Smoke:**
- [ ] Confirm email in a new tab: original tab updates; new tab shows "Email confirmed" completion state.
- [ ] Reset password in a new tab: original tab updates; new tab shows "Password updated" completion state.

**Automated Browser Smoke:**
- [x] Built preview loads without console warnings or errors.
- [x] Built preview contains the completion-stage DOM and it is hidden by default.
