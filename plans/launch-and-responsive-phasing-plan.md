# SuperIcons Launch And Responsive Phasing Plan

## Intent

Ship a strong desktop-first launch without letting unfinished responsive work or broad refactors dilute launch quality.

This plan assumes:

- the desktop product direction is largely in place
- launch polish still remains in billing, auth, trust, and messaging
- mobile and tablet are not yet optimized, but obvious broken states must still be fixed before launch

## Current Repo Reality

The main launch surfaces already exist:

- desktop app shell and landing in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html), [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js), and [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- auth flow in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- store and paid-product flows in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- Stripe and entitlement functions in:
  - [supabase/functions/create-checkout](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-checkout)
  - [supabase/functions/create-portal](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-portal)
  - [supabase/functions/stripe-webhook](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook)
  - [supabase/functions/download-pack](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack)
  - [supabase/functions/redeem-credit](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/redeem-credit)
- MCP entitlement/auth validation in:
  - [supabase/functions/validate-mcp-key](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/validate-mcp-key)
  - [supabase/functions/api-keys](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys)

The repo also already contains relevant planning artifacts:

- [plans/prelaunch_checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/prelaunch_checklist.md)
- [plans/auth_stripe_implementation.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/auth_stripe_implementation.md)
- [plans/mobile-customize-panel-overlap-fix-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/mobile-customize-panel-overlap-fix-plan.md)

## Working Principles

1. Desktop-first means quality-first, not desktop-only.
   Broken mobile states still need to be fixed before launch.

2. Launch blockers come before parity polish.
   Billing, entitlement, auth trust, and basic usability outrank secondary responsive refinement.

3. Do not mix unrelated risk.
   Stripe, auth, shell-state refactors, and responsive tweaks should move in separate batches whenever possible.

4. Preserve current dependencies.
   This plan does not require dependency upgrades or broad package churn unless a later phase explicitly justifies it.

5. Mobile launch minimum is not mobile parity.
   Launch requires usable mobile flows, not full feature symmetry with desktop.

## Phase Breakdown

### Phase 0: Shell-State Stabilization

**Goal**

Remove broken overlay and layout-state behavior before any further launch polish.

**Why this comes first**

The mobile customize-panel overlap is not just cosmetic. It is a shell-state bug affecting first load and landing/app transitions, and it can distort any later responsive or auth testing.

**Primary work**

- fix the mobile customize bottom-sheet default state
- centralize panel state so `main.js` and `store.js` do not drift
- suppress app overlays while the landing is active
- preserve desktop right-rail behavior

**Core files**

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

**Detailed plan**

Use [plans/mobile-customize-panel-overlap-fix-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/mobile-customize-panel-overlap-fix-plan.md) as the implementation spec for this phase.

**Exit criteria**

- landing never shows app overlays on mobile
- app no longer boots on mobile with an empty bottom sheet covering content
- desktop panel behavior still works after landing dismissal
- pricing, Motion Lab, and Converter panel-hide logic still works

**Verification**

- `npm run build`
- desktop landing/app browser check
- mobile landing/app browser check
- pricing, Motion Lab, and Converter regression pass

### Phase 1: Launch Blockers

**Goal**

Make payment, entitlement, auth, and trust flows safe enough for live launch.

**Scope**

- live Stripe wiring
- webhook correctness
- entitlement correctness
- auth completion and trust states
- launch-critical emails and user communication

**Primary workstreams**

1. Billing and subscriptions
   - verify live-mode readiness for `create-checkout`, `create-portal`, and `stripe-webhook`
   - confirm idempotency and no duplicate purchase/subscription writes
   - confirm portal and cancellation behavior

2. Auth UX flow
   - refine sign-in, sign-up, verification, error, and post-auth return flow in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js), [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html), and [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
   - reduce ambiguity around free user, buyer, and Pro states

3. Email and transactional messaging
   - finalize email copy and templates for:
     - sign-up confirmation
     - purchase confirmation / access guidance
     - subscription confirmation or renewal messaging
     - support/contact follow-up if needed
   - note: there is no obvious dedicated email-template source file in the current repo, so this likely requires explicit provider/template work rather than just copy edits

4. Security and release blockers
   - use [plans/prelaunch_checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/prelaunch_checklist.md) as the blocking checklist, especially for JWT gating, key rotation, RLS, and webhook validation

**Core files and surfaces**

- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- [supabase/functions/create-checkout](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-checkout)
- [supabase/functions/create-portal](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-portal)
- [supabase/functions/stripe-webhook](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook)
- [supabase/functions/download-pack](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack)
- [supabase/functions/redeem-credit](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/redeem-credit)

**Exit criteria**

- live checkout path is ready or explicitly blocked on external credentials only
- webhook and entitlement behavior verified end to end
- auth states feel launch-ready, not just technically working
- launch-critical emails/copy are ready

**Verification**

- `npm run build`
- Stripe test-mode full flow checks
- Supabase function checks
- auth smoke tests for sign-in, sign-up, sign-out, and subscription state

### Phase 2: Desktop Launch Polish

**Goal**

Polish the desktop launch experience now that the core trust and purchase flows are stable.

**Scope**

- final landing tweaks for messaging and pacing
- desktop auth modal polish
- dashboard and purchases clarity
- pricing-page confidence and copy cleanup
- MCP docs/link polish

**Important boundary**

This phase is for desktop launch refinement, not for broad responsive rework.

**Likely focus surfaces**

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

**Exit criteria**

- desktop first-run flow feels coherent from landing to search to purchase
- pricing and auth communicate trust clearly
- no obvious desktop launch UX rough edges remain

**Verification**

- desktop browser walkthrough
- regression on purchase, dashboard, and pack access

### Phase 3: Mobile/Tablet Launch Minimum

**Goal**

Reach a launch-safe responsive baseline without trying to make every tool perfect on every screen size.

**Definition of launch minimum**

On mobile and tablet, the product must be:

- readable
- navigable
- searchable
- sign-in capable
- pricing/checkout capable
- purchase/access/download capable
- free of blocking overlay/layout failures

**Journey order**

1. landing
2. auth and pricing
3. core browse/search/select/customize
4. purchases/downloads/dashboard
5. tools

**Key decision**

If a tool surface is not realistically launch-ready on small screens, prefer:

- simplification
- partial responsive support
- or explicit “desktop recommended” messaging

over shipping a broken narrow-screen interaction.

**Exit criteria**

- no blocking mobile/tablet bugs remain in core acquisition and purchase journeys
- layout and interaction are acceptable on common phone and tablet widths

**Verification**

- phone portrait
- phone landscape
- tablet portrait
- tablet landscape
- basic real-browser walkthroughs for search, auth, pricing, purchase, and access

### Phase 4: Post-Launch Cross-Platform Parity

**Goal**

Upgrade responsive behavior from “launch-safe” to genuinely optimized.

**Scope**

- deeper tablet layout work
- tool-specific mobile/tablet UX for Motion Lab and Converter
- better touch ergonomics
- denser but cleaner responsive app-shell behavior
- cross-platform interaction consistency

**Why this is post-launch**

This work is valuable, but it is not as launch-critical as correct billing, auth trust, and the core browse/purchase funnel.

### Phase 5: Post-Launch Hardening And Growth

**Goal**

Use the live product to harden operations and improve discoverability.

**Examples**

- MCP npm publishing and onboarding polish
- analytics improvements
- key-usage visibility
- rate limiting / abuse protection
- performance and caching improvements

## Phase Rules

1. Do not start broad responsive polish before Phase 1 is stable.
2. Do not mix Stripe/auth production work with large layout refactors in the same batch.
3. Do not let mobile parity work rewrite desktop launch decisions unless a real usability issue demands it.
4. Every phase ends with explicit browser checks and a fresh `npm run build`.

## Recommended Immediate Next Step

Execute Phase 0 first.

That gives us a stable shell for both desktop and mobile testing, which makes every later launch phase more trustworthy.
