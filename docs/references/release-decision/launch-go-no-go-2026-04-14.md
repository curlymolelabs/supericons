# Launch Go / No-Go Decision

Date: April 14, 2026
Decision: `GO`

## Why This Is Go

The launch-critical paths are now verified on the live stack:

- `supericons.dev` is live with working HTTPS
- the current production build is deployed and smoke-tested
- live Stripe checkout works
- live Stripe customer portal works
- live cancellation confirmation emails work and include the real end date
- the Railway-backed converter works from the live site
- `supericons-mcp@0.3.1` is published and clean-install verified
- the distinct live `motion-lab-session` `429` proof is complete and the normal threshold is restored

The remaining open items are mostly operational polish or optional growth surfaces, not blockers to a controlled public launch.

## Acceptance / Risk Review

### Met or effectively met

- production domain and hosting
- authenticated billing flows
- entitlement and billing email behavior
- npm install path for MCP
- hosted Motion Lab rate-limit proof
- Google OAuth, auth URL config, SMTP config, and auth rate-limit settings
- Railway converter dependency in live production

### Partial but explicitly risk-accepted

- mobile/tablet support is launch-minimum only, not full parity
- rollback is documented and executable in principle, but not fully rehearsed as a live drill
- observability is practical for a solo launch, but not deeply instrumented
- docs URL strategy is intentionally shell-first for launch, with clean `/docs/...` migration deferred

### Non-blocking follow-ups

- Umami live verification
- uptime monitoring setup
- Search Console / social preview polish
- optional legal/cookie-consent follow-up if jurisdictional scope expands

## Residual Risk

The most credible near-term failure modes are:

1. a redeploy accidentally removes the required `--no-verify-jwt` mode from `create-portal`, `stripe-webhook`, or `motion-lab-session`
2. a billing/config regression appears in Stripe or Supabase after launch-day secret or dashboard changes
3. a desktop-first UI edge case appears on smaller screens outside the already accepted launch minimum

These risks are real, but they are bounded and now have a documented first-response path in [launch-rollback-outage-note.md](../../launch-rollback-outage-note.md).

## Why This Is Not No-Go

The earlier blockers have been cleared:

- the domain is live
- npm publish is complete
- live checkout and portal are proven
- live cancellation-email flow is proven
- Motion Lab hosted verification is complete

The launch no longer depends on unresolved infrastructure fundamentals.

## Recommendation

Proceed with launch.

Treat the remaining work as post-launch follow-through unless a new blocker appears:
- keep the rollback/outage note close at hand
- avoid casual redeploys of the affected edge functions without preserving deployment mode
- preserve the shell-first docs route decision for this launch window
- capture optional observability and SEO polish afterward
