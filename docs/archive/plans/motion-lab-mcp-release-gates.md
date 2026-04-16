# Motion Lab MCP Release Gates

Date: April 12, 2026
Status: Active
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `mcp/package.json`
- `scripts/verify-motion-lab-mcp-package.mjs`
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`

## Purpose

Record the release hardening gates that must pass before any public npm publish of Motion Lab MCP.

This document is intentionally narrower than a full MCP release checklist. It covers Motion Lab only.

## Release Surface Inventory

Relevant package and release files:

- `mcp/package.json`
- `mcp/CHANGELOG.md`
- `scripts/verify-motion-lab-mcp-package.mjs`

Relevant product/runtime assumptions:

- Motion Lab npm release is blocked until the hosted-boundary migration is implemented.
- The local package should ship only the intentional `mcp/` runtime files.
- Premium Motion Lab behavior should eventually depend on hosted services, not the local keyframe and export engine.
- Motion Lab hosted functions must be deployed with `--no-verify-jwt` because session exchange uses `apikey` plus short-lived bearer tokens instead of Supabase JWT auth.

## Current Gate Status

### Gate 1: Tarball allowlist

Status: Implemented

Current rule:
- `mcp/package.json` now uses an explicit `files` allowlist

Purpose:
- prevent stray files and nested `.tgz` artifacts from entering the published tarball

### Gate 2: Package content verification

Status: Implemented

Current rule:
- `npm --prefix mcp run verify:package`

Purpose:
- verify the packed file list matches the expected Motion Lab MCP release surface exactly
- fail if unexpected files or nested tarballs appear

### Gate 3: Clean-install Motion Lab surface smoke test

Status: Implemented for Motion Lab-only verification

Current reality:
- `npm run verify:motion-lab-mcp-clean-install` now packs `supericons-mcp`, installs it in a temp directory, and proves the Motion Lab local baseline plus hosted client import cleanly from the packaged surface
- this is intentionally narrower than full MCP server startup because converter and other non-Motion-Lab release work remain out of scope

Purpose:
- keep the Motion Lab package boundary honest while the broader MCP package still has non-Motion-Lab release blockers

### Gate 4: Root app build

Status: Required

Current rule:
- `npm run build`

Purpose:
- ensure release-surface changes do not break the existing app build or Motion Lab verification scripts

### Gate 5: Hosted premium-path smoke test

Status: Implemented, requires a real Pro-linked API key at runtime

Current rule:
- `npm run verify:motion-lab-hosted-live`

Purpose:
- prove the MCP hosted client reaches the deployed Motion Lab endpoints with local fallback disabled
- verify session exchange, hosted recipe, hosted CSS, hosted animated SVG, and composed bundle behavior through the real backend path

### Gate 6: Hosted negative-path verification

Status: Implemented, requires a real Pro-linked API key at runtime

Current rule:
- `npm run verify:motion-lab-negative-paths`

Purpose:
- verify missing-key and non-Pro workflow guidance
- verify hosted invalid-preset, explicit-selector CSS, malformed SVG, and outage hard-fail behavior
- optionally verify the live non-Pro session denial path when `SUPERICONS_NON_PRO_API_KEY` is provided

### Gate 7: Hosted rate-limit verification

Status: Implemented and live-proven

Current rule:
- `npm run verify:motion-lab-rate-limits`

Purpose:
- verify the hosted Motion Lab path still works below the configured thresholds with local fallback disabled
- verify a real or controlled live `429` preserves `code`, `retry_after_seconds`, and `limit_scope` through the MCP response path
- keep limiter rollout evidence separate from the broader negative-path batch

Current live evidence:
- recipe `429` proven
- session `429` proven
- CSS render `429` proven
- animated SVG render `429` proven
- fail-open behavior proven by temporarily revoking execute on `si_enforce_motion_lab_rate_limit(...)`, observing `403` RPC failures, and confirming hosted CSS plus MCP CSS still returned `200`

## Required Commands Before Publish

1. `npm --prefix mcp run verify:package`
2. `npm pack --prefix mcp --dry-run --json`
3. `npm run verify:motion-lab-mcp-clean-install`
4. `npm run verify:motion-lab-hosted-fallback`
5. `npm run verify:motion-lab-hosted-live`
6. `npm run verify:motion-lab-negative-paths`
7. `npm run verify:motion-lab-rate-limits`
8. `npm run build`

## Preflight Findings

I ran the repo-level deployment preflight helper:

`python C:\Users\guanh\.codex\skills\deployment-and-release\scripts\preflight_release_checks.py --project .`

Observed notes:

- the helper is repo-wide, so it matches `node_modules` noise for CI and observability
- `netlify.toml` is correctly detected for the site runtime
- `env_docs` is reported missing at repo level

Interpretation:

- this helper is useful as a broad release-surface reminder
- it is not precise enough to serve as the main Motion Lab MCP publish gate by itself

## Rollout Notes

- do not publish the Motion Lab protected path until the clean-install Motion Lab surface smoke test passes
- do not publish the Motion Lab protected path unless the hosted functions have been deployed with `--no-verify-jwt`
- do not publish the Motion Lab protected path unless the Motion Lab rate-limit migration and SQL function are deployed in Supabase
- prove the live `429` path in a controlled window by temporarily lowering one Motion Lab bucket threshold, redeploying the hosted functions, and rerunning `npm run verify:motion-lab-rate-limits` with `SUPERICONS_MOTION_LAB_EXPECT_429=1`
- treat tarball allowlist and package verification as mandatory, not optional hygiene
- keep Motion Lab release decisions separate from converter release readiness for now

## Rollback Notes

If the package allowlist or packaging check causes issues during internal testing:

1. revert the `files` allowlist change in `mcp/package.json`
2. revert `scripts/verify-motion-lab-mcp-package.mjs`
3. restore the previous packaging workflow

Rollback impact:

- no app runtime data migration
- no browser deployment rollback needed
- only the npm package release surface changes

## Open Risks

- the package is still not standalone for Motion Lab until the hosted/local migration is implemented
- package hardening alone does not solve the premium-boundary problem
- the repo still lacks dedicated env-doc examples for future hosted Motion Lab service configuration
- the hosted live smoke test depends on an operator-provided Pro API key and currently remains a manual-release credential step
- the live non-Pro denial check remains an operator-provided optional credential step until a dedicated non-Pro test key is maintained for release verification
- the live rate-limit proof depends on an operator-provided Pro API key plus a controlled low-threshold redeploy window whenever thresholds are changed in the future
- cleanup/retention behavior for the Postgres limiter still needs observation over real traffic patterns

## Recommended Next Step

Keep the Motion Lab verification record aligned with the now-proven Postgres limiter rollout:

- record the completed rate-limit evidence in the verification checklist and handoff summary
- rotate the exposed Pro API key used during rollout verification
- return to user-facing docs and docs-page refinement work
