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

## Required Commands Before Publish

1. `npm --prefix mcp run verify:package`
2. `npm pack --prefix mcp --dry-run --json`
3. `npm run verify:motion-lab-mcp-clean-install`
4. `npm run verify:motion-lab-hosted-fallback`
5. `npm run verify:motion-lab-hosted-live`
6. `npm run verify:motion-lab-negative-paths`
7. `npm run build`

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

## Recommended Next Step

Run the live negative-path batch against the deployed Motion Lab backend:

- `npm run verify:motion-lab-negative-paths`
- optionally provide `SUPERICONS_NON_PRO_API_KEY` to verify the real non-Pro denial path

After that, record the evidence in the Motion Lab verification checklist before the next release decision.
