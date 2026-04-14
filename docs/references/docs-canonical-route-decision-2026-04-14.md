# Docs Canonical Route Decision

Date: April 14, 2026
Decision: `/?view=docs` is the canonical docs destination for this launch.

## Decision

For launch, Supericons will treat the shell-native docs view as canonical:

- canonical in-product docs destination: `/?view=docs`
- canonical deep-link pattern for current in-app docs pages: `/?view=docs...`
- `/docs` and `/docs/` remain compatibility/static entry points, not the source-of-truth route system

## Why This Decision Was Made

The repo and live implementation are shell-first today:

- app-owned links already point to `/?view=docs`
- the current docs experience is rendered inside the app shell
- `netlify.toml` only guarantees `/docs` and `/docs/` as static entry points to `/docs/index.html`
- the clean `/docs/...` deep-route system described in older docs plans is not the live routed reality yet

Promoting `/docs/...` to canonical right before launch would create avoidable routing, redirect, and link-consistency risk.

## What This Means

For launch:

- internal app links should continue to use `/?view=docs`
- footer, landing, pricing, API-key, and troubleshooting links should stay shell-first
- `/docs` can remain as a compatibility entry page
- older planning docs that describe clean `/docs/...` URLs as canonical should be treated as future-state design, not shipped reality

## Deferred Follow-Up

After launch, we can revisit a clean-route migration if we want:

- page-based docs routes at `/docs/...`
- redirects from `/?view=docs...` into the clean docs URLs
- canonical tags and sitemap entries aligned to the clean-route system

That is a post-launch IA/routing improvement, not a launch blocker.
