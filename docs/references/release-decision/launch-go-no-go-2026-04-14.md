# Launch Go / No-Go Decision

Date: April 14, 2026
Decision: `NO-GO`

## Why This Is No-Go

Supericons is not ready for release today because the public release path is still blocked at the infrastructure layer.

The strongest blockers are:
- `supericons.dev` is not resolving publicly, so there is no launchable production URL
- `supericons-mcp` is not published on npm, and the publish attempt failed with a registry error
- live production smoke has not been run because the domain is not live
- live Stripe purchase and subscription flows are still unproven
- the distinct live `motion-lab-session` `429` proof is still open
- owner roles and rollback checks are now documented, but they are not yet assigned or tested

## What Is In Good Shape

The repo and local production build show strong implementation progress:
- `npm run build` passed
- local production smoke passed on desktop, phone, and tablet
- Supabase public auth settings are reachable and show email + Google auth enabled
- auth-gated edge functions are deployed and rejecting anonymous access as expected
- MCP package structure and clean-install verification both passed locally
- the env/runtime inventory now exists in [launch-runtime-inventory.md](../../launch-runtime-inventory.md)

This is not a feature-completeness no-go. It is a release-surface no-go.

## Hard Conditions To Revisit This Decision

The release decision can be revisited only after all of the following are true:

1. `supericons.dev` resolves publicly and serves the expected production site.
2. `www.supericons.dev` is either intentionally omitted or explicitly configured and verified.
3. The Netlify production site, SSL, and custom-domain attachment are confirmed.
4. `supericons-mcp` is published successfully to npm.
5. A clean registry install succeeds with `npx -y supericons-mcp`.
6. A production smoke pass is run on the live site for desktop, phone, and tablet.
7. Stripe live checkout, portal, webhook, and entitlement sync are proven end to end with an authenticated test account.
8. The live `motion-lab-session` `429` proof is captured using a valid Pro-linked API key and the controlled threshold procedure.
9. Each owner-role slot in [launch-runtime-inventory.md](../../launch-runtime-inventory.md) is assigned to a named human.
10. The rollback path for Netlify and Supabase is confirmed as executable, not just documented.

## Worst Credible Failure Mode In The Next 24 Hours If We Ignored This

Users would be sent to a non-resolving domain, npm users would have no public package to install, and paid flows would still be unproven in the environment that matters. That would turn launch into a broken announcement rather than a controlled release.

## Recommendation

Treat the next batch as release operations, not product development:
- fix domain and hosting first
- resolve npm publish permissions and publish the MCP package
- run the live smoke and billing checks
- capture the remaining Motion Lab proof
- then rerun the go/no-go pass with fresh evidence
