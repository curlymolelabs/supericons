# Auth Abuse Controls And Agent Access Plan

## Goal

Harden public auth flows against abuse without blocking the actual Supericons product model, where a human owns the account and agents use account-linked access afterward.

This plan is intentionally narrow:

- protect `sign up`, `sign in`, `resend confirmation`, and `forgot password`
- align frontend behavior with Supabase backend limits
- keep agent access working through API keys / MCP
- avoid building a custom auth-throttling system before launch
- skip CAPTCHA for the current launch pass unless abuse forces a revisit

## Product Decision

### Human-first auth

Public account creation should be a human action.

Recommended model:

1. Human signs up or signs in
2. Human purchases a pack or subscribes to Pro
3. Human obtains an API key or uses account-linked MCP access
4. Agent acts on behalf of that human account

### Agent access should not rely on public signup

Agents should not be encouraged to create accounts directly through the public auth modal.

Why:

- weak ownership trail
- easier signup spam and email abuse
- harder entitlement recovery
- harder support and revocation

Current repo already points in the right direction:

- MCP copy says premium access is tied to `your account or API key`
- server-side key validation already exists in `supabase/functions/validate-mcp-key/index.ts`

So the launch-safe rule is:

- CAPTCHA and rate limits protect public auth
- agents use MCP / API keys after a human account exists

## Current Repo Grounding

Relevant frontend auth implementation:

- `auth.js`
- `index.html`
- `style.css`

Relevant agent-access implementation:

- `supabase/functions/validate-mcp-key/index.ts`
- `store.js`

Current local auth behavior already includes:

- resend-confirmation UI cooldown
- normalized auth error messaging
- neutral duplicate-signup handling
- unconfirmed-email resend flow

Current gap:

- local resend cooldown is `30s`
- Supabase default resend windows are `60s`
- forgot-password has no matching local cooldown yet

So the UI can currently invite a resend before the backend is ready to accept it.

## External Guidance

Supabase docs currently recommend:

- reviewing `Authentication -> Rate Limits`
- protecting signup / sign-in / password reset with CAPTCHA
- using custom SMTP for production auth mail

Relevant references:

- Supabase production checklist  
  https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase auth rate limits  
  https://supabase.com/docs/guides/auth/rate-limits

Important defaults called out in Supabase docs:

- signup confirmation request: `60 seconds` window before a new request is allowed
- password reset request: `60 seconds` window before a new request is allowed
- verification requests: IP-based rate limit

Current completed infrastructure state:

- custom SMTP / Resend-backed auth email delivery is already configured
- auth email delivery was validated after fixing the `send.auth.supericons.dev` MX record

## Scope

### In scope

- align resend UX with real backend limits
- verify Supabase dashboard rate limits
- define launch policy for human vs agent access
- add a QA checklist for abuse-control verification

### Out of scope

- custom in-house auth rate limiter
- device fingerprinting
- agent self-signup flows
- custom anti-bot backend beyond Supabase launch needs
- CAPTCHA rollout for this launch pass

## Implementation Phases

## Phase 1: Align Frontend Cooldowns

### Change

Update the local auth-email cooldown behavior in `auth.js`:

- resend-confirmation cooldown from `30s` to `60s`
- add a matching forgot-password cooldown for repeated reset-email requests

### Why

- matches Supabase default resend windows
- reduces confusing premature clicks
- lowers avoidable `rate limit` errors
- reduces anxious repeat requests in the password-reset flow

### Acceptance criteria

- resend button stays disabled for 60 seconds after a resend
- button label counts down correctly
- forgot-password resend behavior cannot fire repeated reset requests during the cooldown window
- forgot-password success state communicates that the email was already sent and another request can wait
- no copy regression in verify states

## Phase 2: Verify Supabase Rate Limit Settings

Review `Supabase -> Authentication -> Rate Limits` and confirm launch-safe settings.

### Recommended launch baseline

- Signup confirmation request: keep `60s`
- Password reset request: keep `60s`
- Verification requests: keep default unless there is a real need to tune
- OTP limits: keep default unless OTP-based auth becomes a core product path

### Why

- use platform defaults unless launch traffic proves otherwise
- avoid tuning knobs without evidence

### Acceptance criteria

- screenshot or written confirmation of active rate-limit settings
- no accidental overly-permissive auth-email settings

## Phase 3: Clarify Agent Access Policy In Product Copy

Review MCP / API-key copy and make sure it consistently implies:

- human account first
- agent access second

Good language direction:

- “Use your account or API key to give your agent access”
- avoid implying that an autonomous agent should create its own account

### Acceptance criteria

- MCP / account copy does not conflict with the human-first model
- no new public “agent signup” path is introduced

## Phase 4: Abuse-Control QA Pass

Run a small verification pass after changes:

1. resend confirmation twice rapidly
   expected: second attempt blocked by local cooldown
2. password reset twice rapidly
   expected: backend or frontend rate-limit behavior is understandable
3. signup bursts from the same browser
   expected: Supabase rate limits engage cleanly
4. normal human sign-in
   expected: no CAPTCHA confusion or auth regression
5. MCP / API key flow
   expected: unaffected by public auth controls

## Post-Launch Monitoring

MCP endpoint throttling is not a launch blocker.

For launch:

- monitor `validate-mcp-key` invocation volume
- document expected client behavior for MCP integrations
- only add endpoint-specific throttling if real traffic patterns justify it

Why:

- the immediate risk is resilience and runaway legitimate usage, not practical key brute-force
- preemptive custom throttling adds complexity without launch evidence

## Launch Recommendation

For launch, stop at:

- 60-second resend cooldown
- forgot-password cooldown
- verified Supabase auth rate-limit settings
- human-first agent access policy documented
- SMTP / Resend-backed auth delivery verified

Do not build custom auth-abuse infrastructure before launch unless abuse actually appears.
CAPTCHA is explicitly deferred for now.

## Residual Risks

- aggressive CAPTCHA can reduce conversion if configured poorly
- rate limits that are too strict can frustrate real users during launch
- support copy must stay clear when limits are hit

These are manageable and lower risk than leaving public auth unprotected.

## Next Execution Order

1. change local resend cooldown from `30s` to `60s`
2. add forgot-password cooldown
3. review Supabase `Authentication -> Rate Limits`
4. run the abuse-control QA pass
5. only then continue with remaining launch tests
