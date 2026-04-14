# Launch JTBD

This note is the repo-grounded launch tracker for Supericons.

Scope note:
- this started as a repo-grounded launch map and now also reflects live operator evidence captured on April 14, 2026
- use this alongside [launch-checklist-status.md](./launch-checklist-status.md) when deciding what is actually left before ship
- this is still a working note, not a substitute for the final release decision

## Current Snapshot

Recently completed and now verified live:
- `supericons.dev` is live on Netlify with Namecheap-managed DNS and working HTTPS
- the latest production build was deployed and passed a live smoke check
- live Stripe payment flow was exercised successfully
- live Stripe customer-portal access was reverified after correcting the function deployment mode
- cancellation-scheduled billing emails now send successfully and record idempotency rows
- `current_period_end` repair is live and the cancellation email now shows the real end date
- the live Stripe secret key was replaced and rechecked successfully through both portal and checkout
- `supericons-mcp@0.3.1` is published, `0.3.0` is deprecated, and a clean temp-folder install now starts correctly
- the distinct live `motion-lab-session` `429` proof was captured and the normal threshold was restored

Product work that is now largely behind us:
- the docs section expanded beyond the old MCP-only surface
- access and API key clarity work landed
- the troubleshooting page was implemented
- the docs mobile/tablet sidebar now uses a header-triggered drawer instead of rendering inline below the content

Immediate next step:
- use the completed release packet for launch execution
- treat the remaining items as post-launch follow-through unless a new blocker appears

## Why The Docs Work Happened

The docs work was a launch task, not random polish.

According to [docs/docs-section-proposal.md](./docs-section-proposal.md) and [docs/docs-prd.md](./docs-prd.md):
- Supericons had a docs surface that was still heavily centered on MCP setup
- the product had already expanded to include premium collections, API keys, Motion Lab, Converter, and troubleshooting needs
- the old docs no longer represented the actual product
- this created a trust gap between payment, entitlement, and user understanding

According to [plans/mcp-motionlab-converter-docs-expansion-plan.md](../plans/mcp-motionlab-converter-docs-expansion-plan.md):
- docs were part of the launch roadmap because onboarding, workflows, and troubleshooting were underexplained

So the docs section existed to:
- represent the real product honestly
- reduce support confusion
- help paid users understand what they unlocked
- give users a recovery path when setup or access fails

## Status Labels

- `Implemented, verify`: the product work mostly exists, but launch evidence is still needed
- `Verified live`: the production path was exercised directly and the result is now known
- `Open before launch`: still looks like active launch work from the repo record
- `Deferred`: explicitly pushed out of the launch-critical path

## Launch Tracker

### 1. Production Configuration And Service Setup

Status: `Verified live`

Tracked in:
- [docs/launch-checklist.md](./launch-checklist.md)

Current repo signal:
- the operational checklist still includes domain, DNS, Netlify, Railway, Supabase, Resend, Google OAuth, Stripe live mode, analytics, SEO/social, and legal checks

What is already known live:
- domain, DNS, Netlify hosting, and HTTPS are now working on `supericons.dev`
- the latest production build is deployed
- Stripe live payment has been exercised successfully
- Stripe portal access, cancellation confirmation emails, and the `current_period_end` repair are now also verified live

Next concrete actions:
- keep the rollback/outage note available during launch
- treat analytics, SEO/social, and legal follow-through as post-launch polish unless a new blocker appears

Done when:
- the current live operator note is sufficient for launch-day recovery
- the remaining non-blocking follow-through is consciously accepted as post-launch work

### 2. Final Pre-Release Verification And Ship Decision

Status: `Verified live`

Tracked in:
- [.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md)

Current repo signal:
- the workflow says the next step after implementation is verification, deployment readiness, observability confirmation, and a go/no-go decision

Next concrete actions:
- use the written verification packet and release decision as the launch record
- keep residual-risk awareness explicit during the launch window

Done when:
- a release verification matrix exists
- key flows have been tested
- deployment and observability checks are recorded
- a final ship decision is documented

### 3. Auth Surface

Status: `Verified live`

Tracked in:
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)
- [plans/auth-ux-qa-matrix.md](../plans/auth-ux-qa-matrix.md)

Current repo signal:
- the auth implementation and hardening work appear substantially built
- the remaining launch work looks like cooldown, rate-limit, delivery, and policy verification rather than a new auth architecture pass

Next concrete actions:
- preserve the current auth config during the launch window
- treat deeper auth UX polish as post-launch unless a regression appears

Done when:
- auth flows are usable for real people
- launch-safe abuse controls are confirmed
- auth email delivery is verified

### 4. Stripe, Billing, And Entitlements

Status: `Verified live`

Tracked in:
- [docs/launch-checklist.md](./launch-checklist.md)
- [plans/launch-and-responsive-phasing-plan.md](../plans/launch-and-responsive-phasing-plan.md)

Current repo signal:
- Stripe and entitlement work are implemented, and the core live payment path has already been exercised successfully

Next concrete actions:
- verify webhook endpoint and signing secret configuration
- keep the deployment note explicit: `create-portal` must stay deployed with `--no-verify-jwt`
- optionally keep a short operator note for live product/price ownership and portal configuration
- optionally note the Stripe secret-key owner/rotation process now that a live replacement was performed

Done when:
- the remaining dashboard-side Stripe details are written down clearly enough for release and rollback handling

### 5. MCP Package And Install Path

Status: `Verified live`

Tracked in:
- [docs/launch-checklist.md](./launch-checklist.md)

Current repo signal:
- docs and setup copy now support the product well
- the package boundary hardening work is in place in the repo

Next concrete actions:
- keep install docs aligned with the published package path
- preserve the deprecation note for `0.3.0` in case someone lands on the broken version first

Done when:
- npm install guidance matches the live package
- the published package remains healthy for clean installs

### 6. Motion Lab Hosted Hardening

Status: `Verified live`

Tracked in:
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)

Current repo signal:
- the hardening plan narrowed the remaining distinct pre-launch gap to one live `429` proof for `motion-lab-session`

Next concrete actions:
- keep the deployment note visible: `motion-lab-session` must be deployed with `--no-verify-jwt`

Done when:
- the live `motion-lab-session` path has direct structured `429` evidence
- the normal threshold has been restored after the proof run

### 7. Mobile And Tablet Launch Minimum

Status: `Verified live`

Tracked in:
- [plans/launch-and-responsive-phasing-plan.md](../plans/launch-and-responsive-phasing-plan.md)
- [docs/plans/docs-mobile-tablet-sidebar-toggle-implementation-plan.md](./plans/docs-mobile-tablet-sidebar-toggle-implementation-plan.md)

Current repo signal:
- the docs mobile/tablet navigation gap is now fixed in the product
- the broader launch plan still requires mobile/tablet smoke validation across acquisition, auth, pricing, checkout, purchase, and access flows

Next concrete actions:
- keep the current desktop-first minimum as the accepted launch bar
- treat broader mobile parity as post-launch work

Done when:
- core launch journeys are functional on common phone and tablet widths
- no blocking mobile/tablet bugs remain in acquisition or purchase flows

### 8. Docs System

Status: `Verified live`

Tracked in:
- [docs/plans/docs-delegation-roadmap.md](./plans/docs-delegation-roadmap.md)
- [docs/plans/docs-full-section-implementation-plan.md](./plans/docs-full-section-implementation-plan.md)
- [plans/docs-shell-view-consolidation-fix-plan.md](../plans/docs-shell-view-consolidation-fix-plan.md)

Current repo signal:
- the major docs implementation work is present
- troubleshooting exists
- mobile/tablet docs navigation is now drawer-based on smaller screens
- the remaining launch work looks like final QA plus one unresolved route strategy decision

Next concrete actions:
- preserve the shell-first docs routing decision during launch
- defer clean `/docs/...` route migration until after launch

Launch route decision:
- older docs plans still describe clean `/docs/...` routes as the intended end state
- for this launch, the documented canonical route is the shell-native `/?view=docs` path

Done when:
- docs navigation is consistent
- compatibility redirects behave correctly
- the project has one documented canonical docs URL strategy

## Deferred Or Not Launch Priority

Status: `Deferred`

These should not take priority over launch completion:
- broad new feature building
- full mobile parity
- symmetric CSS render / animated SVG `429` proofs
- fail-open proof work already deferred by the Motion Lab hardening plan

## Recommended Execution Order

With domain, live deploy, Stripe, Railway converter verification, npm publish, cancellation-email verification, and the `motion-lab-session` proof complete, the launch packet is now effectively closed.

Use the remaining time for:

1. launch execution discipline rather than more launch-surface changes
2. post-launch analytics / observability polish
3. future docs-route migration only after the launch window

## Source Records

- [docs/docs-section-proposal.md](./docs-section-proposal.md)
- [docs/docs-prd.md](./docs-prd.md)
- [plans/mcp-motionlab-converter-docs-expansion-plan.md](../plans/mcp-motionlab-converter-docs-expansion-plan.md)
- [docs/launch-checklist.md](./launch-checklist.md)
- [.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md)
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)
- [plans/auth-ux-qa-matrix.md](../plans/auth-ux-qa-matrix.md)
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)
- [plans/launch-and-responsive-phasing-plan.md](../plans/launch-and-responsive-phasing-plan.md)
- [docs/plans/docs-delegation-roadmap.md](./plans/docs-delegation-roadmap.md)
- [docs/plans/docs-full-section-implementation-plan.md](./plans/docs-full-section-implementation-plan.md)
- [plans/docs-shell-view-consolidation-fix-plan.md](../plans/docs-shell-view-consolidation-fix-plan.md)
- [docs/plans/docs-mobile-tablet-sidebar-toggle-implementation-plan.md](./plans/docs-mobile-tablet-sidebar-toggle-implementation-plan.md)
