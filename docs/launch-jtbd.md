# Launch JTBD

This note compiles the repo-grounded jobs to be done before launch, based on the current plans, audits, and checklists.

Important scope note:
- this is a repo-memory summary, not a claim that every item is still undone in production
- some work may already be complete outside the repo and only need final verification

## Why We Built The Docs Section

The docs work was driven by a real launch gap, not by random polish.

According to [docs/docs-section-proposal.md](./docs-section-proposal.md) and [docs/docs-prd.md](./docs-prd.md):
- Supericons had a docs surface that was still heavily centered on MCP setup
- the product had already expanded to include premium collections, API keys, Motion Lab, Converter, and troubleshooting needs
- the old docs did not represent the actual product surface
- this created a trust gap between payment, entitlement, and user understanding

According to [plans/mcp-motionlab-converter-docs-expansion-plan.md](../plans/mcp-motionlab-converter-docs-expansion-plan.md):
- docs were part of the launch roadmap because onboarding, workflows, and troubleshooting were underexplained
- users and agents needed a systematic path for setup, access, Motion Lab, and Converter

So the docs section was a launch-readiness task:
- represent the whole product honestly
- reduce support confusion
- help paid users understand what they unlocked
- give users a recovery path when setup or access fails

## What Looks Complete Or Largely Complete

These areas appear to have received major implementation attention already:
- auth
- Stripe
- MCP
- docs

That does not automatically mean they are launch-closed. Based on the repo, some of these now look like verification and production-readiness items rather than major new build work.

## JTBD Before Launch

### 1. Run The Final Pre-Release Gate

Primary job:
- convert the completed implementation work into release evidence and a ship decision

Why this is next:
- [.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md) says the next step after implementation is verification, deployment readiness, observability confirmation, and a go/no-go decision

Done when:
- a release verification matrix exists
- key regression flows have been tested
- deployment readiness is checked
- observability/runtime checks are confirmed
- a final go/no-go call is written

### 2. Verify Production Infrastructure And Service Configuration

Primary job:
- confirm launch-critical external systems are correctly configured for the real production environment

Tracked in:
- [docs/launch-checklist.md](./launch-checklist.md)

Main buckets:
- domain and DNS setup
- Netlify frontend hosting
- Railway backend/service setup
- Supabase auth and URL configuration
- Resend / SMTP email delivery
- Google OAuth production setup
- Stripe live mode and webhook configuration
- analytics
- SEO and social metadata
- legal page presence and correctness

Done when:
- the production configuration checklist is complete
- key external integrations are proven end to end, not only locally

### 3. Publish And Verify The MCP Package

Primary job:
- make the MCP entry path real for launch users, not just for local development

Tracked in:
- [docs/launch-checklist.md](./launch-checklist.md)

Main tasks:
- publish `supericons-mcp` to npm
- verify `npx -y supericons-mcp` works
- confirm setup guides still match the actual install/run experience

Done when:
- a fresh environment can install and run the package successfully
- search and retrieval work through the published package path

### 4. Close Remaining Auth Hardening And Abuse-Safety Verification

Primary job:
- confirm the public auth surface is safe enough for launch without overbuilding

Tracked in:
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)

Main tasks:
- verify frontend cooldown behavior for auth email actions
- confirm Supabase auth rate-limit settings are launch-safe
- verify SMTP / Resend-backed auth email delivery
- lock the human-first account access policy for agents

Done when:
- auth flows are usable for real people
- obvious abuse gaps are covered by launch-safe controls
- agent guidance does not conflict with the human-owned-account model

### 5. Close The Remaining Motion Lab MCP Hardening Gap

Primary job:
- capture the one remaining distinct pre-launch proof for Motion Lab rate limiting

Tracked in:
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)

Main task:
- run and capture a dedicated live `429` proof for `motion-lab-session`

Explicitly deferred by the plan:
- CSS render `429` proof
- animated SVG render `429` proof
- fail-open proof

Done when:
- the `motion-lab-session` path has direct live evidence for the structured `429` behavior

### 6. Pass The Mobile And Tablet Launch Minimum

Primary job:
- ensure the product is usable on mobile and tablet for launch-critical flows, even without desktop parity

Tracked in:
- [plans/launch-and-responsive-phasing-plan.md](../plans/launch-and-responsive-phasing-plan.md)

Main tasks:
- fix any remaining broken shell or overlay states
- verify navigation works
- verify sign-in works
- verify pricing and checkout flows work
- verify purchase, entitlement, and access flows work
- verify there are no blocking layout or interaction failures in core flows

Important boundary:
- this is not a full responsive redesign
- launch minimum means usable, readable, and non-blocking

Done when:
- core acquisition, auth, purchase, and access journeys are functional on common phone and tablet widths

### 7. Finish Docs QA And Close The Docs Routing Decision

Primary job:
- make sure the new docs system is launch-safe and internally consistent

Tracked in:
- [docs/plans/docs-delegation-roadmap.md](./plans/docs-delegation-roadmap.md)
- [docs/plans/docs-full-section-implementation-plan.md](./plans/docs-full-section-implementation-plan.md)
- [plans/docs-shell-view-consolidation-fix-plan.md](../plans/docs-shell-view-consolidation-fix-plan.md)

Main tasks:
- run the final docs verification and QA pass
- confirm all docs routes and compatibility redirects behave as intended
- explicitly resolve the canonical route question

Current repo tension to resolve:
- some docs plans describe clean `/docs/...` URLs as canonical
- the later shell consolidation plan treats `/?view=docs` as the canonical in-app docs destination

Done when:
- docs navigation is consistent
- compatibility redirects behave correctly
- the project has one documented canonical docs URL strategy

## Suggested Execution Order

If auth, Stripe, MCP, and docs are already implemented enough for launch, the most sensible order is:

1. finish production configuration verification
2. run the full pre-release verification matrix and regression pass
3. close the `motion-lab-session` live `429` proof
4. run mobile/tablet launch-minimum smoke tests
5. publish and verify `supericons-mcp`
6. complete the final go/no-go review

## Practical Launch View

The remaining work appears to fall into three categories.

### Done, But Needs Verification

- auth
- Stripe
- MCP
- docs

### Likely Still Open

- production configuration checklist
- npm publish and install verification for `supericons-mcp`
- final pre-release verification matrix
- final mobile/tablet launch-minimum pass
- `motion-lab-session` live `429` proof
- final docs route decision if not already settled elsewhere

### Not The Priority Right Now

- broad new feature building
- full mobile parity
- post-launch hardening items already marked as deferred in the plans

## Source Records

- [docs/docs-section-proposal.md](./docs-section-proposal.md)
- [docs/docs-prd.md](./docs-prd.md)
- [plans/mcp-motionlab-converter-docs-expansion-plan.md](../plans/mcp-motionlab-converter-docs-expansion-plan.md)
- [docs/launch-checklist.md](./launch-checklist.md)
- [.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md)
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)
- [plans/launch-and-responsive-phasing-plan.md](../plans/launch-and-responsive-phasing-plan.md)
- [docs/plans/docs-delegation-roadmap.md](./plans/docs-delegation-roadmap.md)
- [docs/plans/docs-full-section-implementation-plan.md](./plans/docs-full-section-implementation-plan.md)
- [plans/docs-shell-view-consolidation-fix-plan.md](../plans/docs-shell-view-consolidation-fix-plan.md)
