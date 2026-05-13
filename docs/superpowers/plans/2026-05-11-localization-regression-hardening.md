# Localization Regression Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix verified localization regressions where message, status, and explanatory fields were filled with short action labels, then add gates that prevent the same class of bug from returning.

**Architecture:** Treat English as the source of truth for message intent, not just key shape. Repair the source catalogs in `data/i18n/messages`, rebuild shipped catalogs into `public/i18n/messages` and `mcp/public/i18n/messages`, and expand verification from auth errors only to all message-like auth, account, and checkout keys used by the app.

**Tech Stack:** Plain JSON locale catalogs, Node.js verification scripts, Vite frontend, Playwright browser smoke checks.

---

## Verified Findings

- `auth.forgot.description`, `auth.forgot.note`, and `auth.forgot.sentStatus` are action labels such as `Send reset link`. Browser verification on `/?view=icons&locale=en` showed the forgot-password modal description and note both render as `Send reset link`.
- `auth.verify.*` explanatory fields are action labels such as `Resend confirmation`, `Send reset link`, `Account`, and `Continue with Google`. These keys are used by `auth.js` in verification, expired-link, and confirmation flows.
- `checkout.openingPortal`, `checkout.signInAgainPortal`, `checkout.portalUnavailable`, and `checkout.portalFailed` are action labels such as `Manage Subscription` and `Sign in`. These keys are used by `auth.js` customer portal logic.
- `account.toast.updated` and selected account status messages are labels such as `Account` or `Save display name` instead of completed-state or failure messages.
- `auth.copy.purchase.*.desc`, `auth.copy.subscribe.*.desc`, and `auth.copy.pro.*.desc` are labels such as `My Purchases` and `Manage Subscription`, even though `auth.js` renders them as modal descriptions.
- Existing checks pass despite these defects. `verify-auth-error-localization.mjs` only covers `auth.errors.*`, so it did not catch adjacent message-like fields.

## Task 1: Expand The Localization Message-Quality Gate

**Files:**
- Modify: `scripts/verify-auth-error-localization.mjs`
- Optional rename later: `scripts/verify-auth-message-localization.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add required message-like key groups**

Add checked path groups for:

```js
const requiredMessagePaths = [
  'auth.forgot.description',
  'auth.forgot.note',
  'auth.forgot.sentStatus',
  'auth.reset.createForEmail',
  'auth.reset.chooseForEmail',
  'auth.reset.createForAccount',
  'auth.reset.chooseForAccount',
  'auth.verify.existing.modalNote',
  'auth.verify.existing.stageText',
  'auth.verify.unconfirmed.modalDesc',
  'auth.verify.unconfirmed.modalNote',
  'auth.verify.unconfirmed.stageText',
  'auth.verify.unconfirmed.resentStatus',
  'auth.verify.callback.resetTitle',
  'auth.verify.callback.linkTitle',
  'auth.verify.callback.resetDesc',
  'auth.verify.callback.linkDesc',
  'auth.verify.callback.resetNote',
  'auth.verify.callback.linkNote',
  'auth.verify.callback.stageTitle',
  'auth.verify.callback.stageText',
  'auth.verify.pending.modalDesc',
  'auth.verify.pending.modalNote',
  'auth.verify.pending.stageText',
  'auth.verify.pending.sentStatus',
  'auth.verify.pending.resentStatus',
  'auth.toast.passwordSignInAdded',
  'auth.toast.passwordUpdated',
  'account.toast.updated',
  'account.password.resetToast',
  'account.password.resetSent',
  'account.profile.saved',
  'account.profile.saveFailed',
  'checkout.openingPortal',
  'checkout.signInAgainPortal',
  'checkout.portalUnavailable',
  'checkout.portalFailed',
  'auth.copy.purchase.signin.desc',
  'auth.copy.purchase.signup.desc',
  'auth.copy.subscribe.signin.desc',
  'auth.copy.subscribe.signup.desc',
  'auth.copy.pro.signin.desc',
  'auth.copy.pro.signup.desc'
];
```

- [ ] **Step 2: Add action-label detection**

Collect action labels from each locale and fail if any required message path exactly equals one:

```js
const actionLabelPaths = [
  'app.signIn',
  'auth.continueWithGoogle',
  'auth.forgotPassword',
  'auth.backToSignIn',
  'auth.resendConfirmation',
  'auth.sendResetLink',
  'auth.updatePassword',
  'auth.getNewResetLink',
  'auth.copy.default.signin.submit',
  'auth.copy.default.signup.submit',
  'auth.copy.default.signin.toggleAction',
  'auth.copy.default.signup.toggleAction',
  'account.title',
  'account.menu.account',
  'account.menu.manageSubscription',
  'account.menu.signOut'
];
```

- [ ] **Step 3: Add placeholder parity for message paths**

For each checked message path, compare placeholders against English:

```js
function placeholders(value) {
  return Array.from(String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]).sort();
}
```

Expected: keys like `auth.forgot.sentStatus`, `auth.verify.pending.sentStatus`, and `account.password.resetSent` preserve `{email}` in every locale if English uses it.

- [ ] **Step 4: Run the verifier before repairs**

Run:

```bash
npm run verify:auth-error-localization
```

Expected: FAIL, listing the verified action-label regressions.

## Task 2: Repair English Source Messages

**Files:**
- Modify: `data/i18n/messages/en.json`
- Modify or create repair script: `scripts/repair-auth-account-checkout-localization.mjs`

- [ ] **Step 1: Replace action labels with complete English source messages**

Use the existing `auth.js` fallback strings as the English source where possible. Required English examples:

```json
{
  "auth": {
    "forgot": {
      "description": "Enter your account email and we will send you a secure reset link.",
      "note": "The recovery link will bring you back here to choose a new password.",
      "sentStatus": "If an account matches {email}, you will get a reset link shortly."
    },
    "verify": {
      "callback": {
        "resetDesc": "The password reset link is invalid, incomplete, or has expired.",
        "linkDesc": "The sign-in or recovery link is invalid, incomplete, or has expired.",
        "stageText": "This link can no longer be used."
      }
    }
  },
  "checkout": {
    "openingPortal": "Opening subscription portal...",
    "signInAgainPortal": "Sign in again to open the subscription portal.",
    "portalUnavailable": "Subscription portal is unavailable.",
    "portalFailed": "Could not open subscription portal."
  },
  "account": {
    "toast": {
      "updated": "Account updated."
    }
  }
}
```

- [ ] **Step 2: Repair auth context descriptions**

Match the intent already present in `auth.js` fallback copy:

```json
{
  "auth": {
    "copy": {
      "purchase": {
        "signin": {
          "desc": "Keep collection purchases tied to one account so downloads and updates stay in sync."
        },
        "signup": {
          "desc": "Your purchases, downloads, and future updates will stay connected to this account."
        }
      },
      "subscribe": {
        "signin": {
          "desc": "Continue to Pro checkout for MCP access, workflow tools, and premium collections."
        },
        "signup": {
          "desc": "Set up your account first, then continue to Pro checkout when you are ready."
        }
      },
      "pro": {
        "signin": {
          "desc": "Use Motion Lab exports, Converter downloads, and premium MCP access from one account."
        },
        "signup": {
          "desc": "Save your workspace and keep premium tools connected to one account."
        }
      }
    }
  }
}
```

- [ ] **Step 3: Run the verifier**

Run:

```bash
npm run verify:auth-error-localization
```

Expected: English no longer appears in the failure list.

## Task 3: Repair All 11 Non-English Catalogs

**Files:**
- Modify: `data/i18n/messages/ar.json`
- Modify: `data/i18n/messages/de.json`
- Modify: `data/i18n/messages/es.json`
- Modify: `data/i18n/messages/hi.json`
- Modify: `data/i18n/messages/ja.json`
- Modify: `data/i18n/messages/ko.json`
- Modify: `data/i18n/messages/pt.json`
- Modify: `data/i18n/messages/th.json`
- Modify: `data/i18n/messages/vi.json`
- Modify: `data/i18n/messages/zh-Hans.json`
- Modify: `data/i18n/messages/zh-Hant.json`

- [ ] **Step 1: Translate the repaired English message intent**

For every locale, translate the complete message meaning, not the button label. Preserve product names and technical tokens such as `Supericons`, `Google`, `MCP`, `Motion Lab`, `Converter`, `Pro`, and placeholders like `{email}`.

- [ ] **Step 2: Run catalog verification**

Run:

```bash
node scripts/verify-i18n-catalogs.mjs
npm run verify:auth-error-localization
```

Expected: both PASS.

- [ ] **Step 3: Rebuild shipped catalogs**

Run:

```bash
node scripts/build-i18n-public-catalogs.mjs
```

Expected: `copied 12 locales`.

- [ ] **Step 4: Verify source and shipped catalogs match**

Run a source-to-public sync check for:

```bash
data/i18n/messages
public/i18n/messages
mcp/public/i18n/messages
```

Expected: no differences for all 12 locale JSON files.

## Task 4: Browser Regression Checks

**Files:**
- Create or modify: `scripts/verify-localized-browser-smoke.mjs`

- [ ] **Step 1: Add forgot-password modal check**

Open:

```text
http://127.0.0.1:5174/?view=icons&locale=en
```

Actions:
- Dismiss landing hero through local storage.
- Click sign in.
- Click forgot password.

Expected:
- Title is not the submit button label.
- Description is not `Send reset link`.
- Note is not `Send reset link`.
- Submit button may remain `Send reset link`.

- [ ] **Step 2: Add wrong-password check**

Actions:
- Enter a throwaway email and wrong password.
- Submit.

Expected:
- Status text is a full invalid-credentials sentence.
- Status text is not `Sign in`.

- [ ] **Step 3: Add locale sample check**

Repeat the forgot-password modal check for `zh-Hans`, `ja`, `ko`, `es`, `de`, `pt`, `ar`, `hi`, `vi`, and `th`.

Expected:
- Message text is not exactly equal to that locale's reset-link button label.
- `{email}` placeholders are interpolated where the app sends a sample email.

## Task 5: Final Verification Matrix

**Files:**
- No new product files.

- [ ] **Step 1: Run localization gates**

Run:

```bash
node scripts/verify-i18n-catalogs.mjs
npm run verify:auth-error-localization
npm run verify:i18n-localization-audit
npm run verify:commercial-localization
npm run verify:logged-in-stripe-localization
```

Expected: all PASS.

- [ ] **Step 2: Run browser smoke**

Run:

```bash
node scripts/verify-localized-browser-smoke.mjs
```

Expected: PASS for sign-in error, forgot-password modal, and sampled locale checks.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: build completes successfully.

## Self-Review

- Spec coverage: The plan covers verified auth, account, checkout, and auth-context copy regressions, plus the missing verification gate that allowed them.
- Placeholder scan: No unresolved placeholders such as TBD or TODO are present.
- Type consistency: All named files and key paths are existing catalog/script/app surfaces verified in the repo.
