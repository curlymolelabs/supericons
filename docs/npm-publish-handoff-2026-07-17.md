# Handoff: npm package version currency

- Date: 2026-07-17
- For: the search engine v2 session (owns the MCP package release line)
- From: the admin dashboard session (this item surfaced there but belongs here)

## Current state, verified 2026-07-17

- npm registry `latest` tag: **0.4.17** (frozen since before the July incident cycle).
- npm registry `beta` tag: **0.4.19-beta.0** (published 2026-07-16 for the search-only beta work; `latest` was deliberately left untouched).
- Hosted MCP on Railway: runs **0.4.18** class code, currently from the July 17 protection release (hosted-search resilience, Phase A telemetry writers, GeoIP attribution, session-aware usage dedupe). Healthy in production.
- The 0.4.18 baseline lives on branch `codex/material-railway-hydration-release` at `31ac66dfe`; later Railway-side additions (resilience layer, telemetry writers) were made in the `supericons-admin-dashboard-phase-a` worktree and are now merged into local `main`.

## Why publishing matters

1. **Telemetry correctness feeding the admin dashboard.** 0.4.17 predates the usage-dedupe fix: distinct clients that send JSON-RPC request id 1 collide on the old dedupe key, so events from local npm users are silently dropped or miscounted. Those miscounts appear in the new admin dashboard's "Local npm" venue rows. Until `latest` carries the fix, that venue's numbers undercount.
2. **Version drift.** New installs get code two rounds older than the hosted service, including none of the resilience behavior (no-retry, fail-fast) that protects the shared database when it degrades. Local npm clients on 0.4.17 still retry into a degraded engine.

## Decisions this session did NOT make (yours to make)

- Whether to publish 0.4.18 as `latest`, or fold everything into a 0.4.19 release aligned with your beta line. The dashboard session has no stake in the version number, only in the dedupe fix reaching `latest` eventually.
- What subset of the Railway-side additions belongs in the published package. Known boundary from the Material release: the Material asset bundle (mcp/material-mcp-assets.json.gz) is deliberately excluded from the npm artifact and must remain so; the package verification scripts (verify:mcp-package and the package dry run) encode the expected contents and pass on the 0.4.18 baseline.

## Practical notes

- Publish checks that already exist and passed on the baseline: package contract verification, clean-install validation, both-style Material exact lookup on a fresh install.
- npm publication was explicitly excluded from every production packet's mutation budget during the dashboard work, so nothing has drifted: the registry state is exactly as your session last left it.
- No urgency signal exists beyond the two reasons above; there is no user-facing breakage report tied to 0.4.17.
