# Motion Lab MCP Migration Verification Checklist

Date: April 12, 2026
Status: Active
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `mcp/index.js`
- `mcp/auth.js`
- `mcp/motion-lab.js`
- `mcp/package.json`
- `scripts/verify-motion-lab-mcp-package.mjs`

## Purpose

Turn the upcoming Motion Lab hosted/local migration into a concrete verification gate.

This checklist is for the first protected Motion Lab release path, where:

- `list_motion_presets` becomes a reduced local baseline
- premium recipe and render flows move to hosted endpoints
- the local MCP package stops depending on rich local Motion Lab logic at startup

## Problem Statement

The Motion Lab migration now has enough architecture detail to start implementation, but without a shared verification gate the work could still drift into “looks right” rather than “proved right.”

The biggest risks are not subtle:

- the package could still fail from a clean install
- the local MCP could accidentally keep loading rich Motion Lab metadata
- hosted endpoints could return more premium structure than intended
- auth or fallback behavior could be left under-tested until late

This checklist turns those risks into explicit gates before any protected Motion Lab release is considered complete.

## Target User

Primary user:
- the Supericons team implementing and reviewing the first protected Motion Lab MCP migration

User job:
- know exactly what must be tested, what evidence must be captured, and what remains risky if a check does not run

Constraints:
- Motion Lab only
- keep the checklist aligned to the accepted ADR, baseline contract, and hosted endpoint spec
- distinguish checks that already pass today from checks that are blocked until the migration exists

## Goals

- define the required verification matrix for the hosted/local Motion Lab split
- make blocking gates explicit before implementation begins
- keep residual risk visible if any gate does not run
- give the next implementation plan a direct QA appendix

## Non-Goals

- implementing the migration
- changing the hosted-boundary ADR
- changing the local baseline contract
- covering converter or full-package release readiness outside Motion Lab

## Verification Scope

Files and surfaces expected to change in the migration:

- `mcp/index.js`
- `mcp/auth.js`
- `mcp/motion-lab.js`
- `mcp/package.json`
- any new Motion Lab client or session helper module under `mcp/`
- any hosted Motion Lab service implementation files
- any Motion Lab docs that describe the MCP contract

## Status Legend

- `Passed now`: already available and currently passing
- `Required now`: now meaningful on the current implementation and should be run before release sign-off
- `Required later`: must pass after the migration is implemented
- `Blocked now`: cannot run meaningfully until the migration exists

## Functional Requirements

### Requirement 1: Verification must cover both local and hosted paths

The checklist must include:

- local listing contract checks
- hosted endpoint contract checks
- MCP wrapper migration checks
- package and build regression checks

Acceptance signal:
- all four categories appear in the verification matrix

### Requirement 2: Blocking gates must be explicit

The checklist must identify the checks that block completion of the Motion Lab migration.

Acceptance signal:
- a dedicated blocking-gates section exists and lists the minimum required pass set

### Requirement 3: Unrun checks must remain visible

The checklist must define what happens when a required verification step does not run.

Acceptance signal:
- residual-risk rules explicitly require unrun checks to stay visible with a stated risk

### Requirement 4: Current confidence must be separated from future proof

The checklist must distinguish what already passes now from what cannot yet be proven until the hosted/local split is implemented.

Acceptance signal:
- the document includes a current confidence snapshot with both categories

## Verification Matrix

| Area | Check | Method | Status now | Evidence required at migration time |
|---|---|---|---|---|
| Packaging | tarball allowlist holds | `npm --prefix mcp run verify:package` | Passed now | command output showing only intended files |
| Packaging | pack output matches expected release surface | `npm pack --prefix mcp --dry-run --json` | Passed now | JSON file list archived in release notes |
| Packaging | clean-install Motion Lab surface imports cleanly | `npm run verify:motion-lab-mcp-clean-install` | Passed now | successful temp install plus Motion Lab baseline/client smoke test |
| Local contract | `list_motion_presets` uses only baseline fields | inspect response shape and compare to local baseline contract | Required later | captured response example with only approved fields |
| Local contract | local listing no longer imports rich metadata loader | code review plus runtime smoke test | Required later | import tree / source read proving no dependency on `motion-lab-agent-metadata.js` |
| Auth | session exchange works with valid key | call hosted session endpoint with valid hashed key | Passed manually | successful token issuance response |
| Auth | denied path works with invalid or missing key | `npm run verify:motion-lab-negative-paths` plus direct hosted session call when needed | Required now | structured `401`/`403` error evidence |
| Auth | token refresh works after expiry | force or simulate expiry and re-run premium call | Blocked now | refresh path succeeds without manual restart |
| Recipe | hosted recipe endpoint returns safe structured fields | contract test against `/v1/motion-lab/recipe` | Passed manually | response sample with no raw keyframes |
| Recipe | unsupported preset returns structured error | `npm run verify:motion-lab-negative-paths` | Required now | `422` error sample |
| CSS render | explicit selector path works | `npm run verify:motion-lab-negative-paths` | Required now | rendered CSS sample using supplied selector |
| CSS render | placeholder selector path works | call `/v1/motion-lab/render/css` without `selector` | Passed manually | CSS sample with `{{ICON_SELECTOR}}` token |
| CSS render | no hardcoded `#icon-container svg` remains in public path | code review and output inspection | Required later | source diff plus output sample |
| Animated SVG | hosted animated SVG render works | call `/v1/motion-lab/render/animated-svg` with SVG input | Passed manually | animated SVG sample and response envelope |
| Fallback | repo development fallback still works before hosted deployment | `npm run verify:motion-lab-hosted-fallback` | Passed now | recipe/CSS/SVG smoke evidence using the repo-local fallback path |
| Fallback | hosted unavailability returns intended hard-fail contract in the protected release path | `npm run verify:motion-lab-negative-paths` | Required now | structured error sample with no local premium fallback |
| Entitlement | non-Pro user is denied premium Motion Lab endpoints | `npm run verify:motion-lab-negative-paths` with `SUPERICONS_NON_PRO_API_KEY` | Required now | `motion_lab_pro_required` response evidence |
| MCP wrapper | `get_motion_recipe` now uses hosted premium path | wrapper contract review and smoke test | Blocked now | successful MCP tool call using hosted recipe path |
| MCP wrapper | `export_motion_css` now uses hosted premium path | wrapper contract review and smoke test | Blocked now | successful MCP tool call using hosted CSS render path |
| MCP wrapper | `export_animated_svg` now uses hosted premium path | wrapper contract review and smoke test | Blocked now | successful MCP tool call using hosted SVG render path |
| MCP wrapper | `animate_icon` correctly composes recipe + CSS + SVG outputs | wrapper smoke test | Blocked now | one successful composed response example |
| Build regression | root app build still passes | `npm run build` | Passed now | passing build after migration branch changes |
| Motion Lab integrity | preset parity still passes | `npm run verify:motion-lab-presets` | Passed now | passing command after migration |
| Motion Lab integrity | any remaining local metadata verification still passes | `npm run verify:motion-lab-agent-metadata` or revised equivalent | Passed now | passing command after migration |

## Required Command Set After Migration

### Automated checks

1. `npm --prefix mcp run verify:package`
2. `npm pack --prefix mcp --dry-run --json`
3. `npm run verify:motion-lab-mcp-clean-install`
4. `npm run verify:motion-lab-hosted-live`
5. `npm run verify:motion-lab-negative-paths`
6. `npm run verify:motion-lab-hosted-fallback`
7. `npm run verify:motion-lab-presets`
8. `npm run verify:motion-lab-agent-metadata` or revised local-baseline equivalent
9. `npm run build`

### Manual review checks

1. confirm no raw keyframe payloads are returned by hosted endpoints
2. confirm `list_motion_presets` local output matches the baseline contract exactly
3. confirm no public output or docs still imply a hardcoded selector requirement
4. confirm hosted error messages remain understandable to agent users

## Blocking Gates

The migration must not be called complete until all of these pass:

1. clean-install Motion Lab surface import
2. valid auth path
3. denied auth path
4. hosted recipe contract
5. hosted CSS render contract
6. hosted animated SVG render contract
7. hosted outage hard-fail contract
8. negative-path verification batch
9. root app build
10. package verification

## Success Metrics

### Primary metric

- the Motion Lab migration reaches implementation with a verification matrix that covers every protected-boundary decision already made

Verification method:
- map the ADR, local baseline contract, and hosted endpoint spec to one or more rows in this checklist

### Supporting metrics

- the checklist distinguishes passed-now, required-later, and blocked-now checks
- the implementation plan can point to this checklist as its QA appendix without inventing new gates

Verification methods:
- review the status column coverage
- confirm each future work item maps to a listed check

### Guardrail metrics

- existing build and Motion Lab integrity checks remain green while the planning chain is updated

Verification methods:
- retain current passing evidence for package verification, preset parity, metadata verification, and root build

## Residual Risk Rules

If any required check does not run:

- mark it as unrun, not implied-pass
- explain why it did not run
- record the resulting risk before release discussion continues

If any hosted endpoint returns more than the approved safe response shape:

- treat it as a release blocker
- do not downgrade it to a documentation issue

## Current Confidence Snapshot

### What is strong now

- root app build passes
- Motion Lab preset parity passes
- Motion Lab agent metadata verification passes
- package allowlist and package verification pass

### What is not yet proven

- clean-install Motion Lab surface import from a migrated package
- token refresh after expiry
- live non-Pro denial path if no separate non-Pro key is provided during verification

## Risks And Dependencies

### Risks

- teams may over-trust currently passing monorepo checks and under-test the new hosted path
- a hosted endpoint could satisfy the happy path while still leaking more structure than intended
- wrapper migration could silently preserve local dependencies if import reviews are skipped
- outage behavior could remain unverified until too late if service simulation is deferred

### Dependencies

- accepted hosted-boundary ADR
- accepted local baseline contract
- accepted hosted endpoint spec
- package verification gate
- deployed Motion Lab hosted functions with `--no-verify-jwt`

## Open Questions

1. Should the future clean-install Motion Lab smoke test verify import success only, or a full `list_motion_presets` plus one premium-call failure path as the minimum boot gate?
2. Once the local metadata baseline is implemented, should `verify:motion-lab-agent-metadata` be split into local-baseline and hosted-shape verification checks?
3. Should hosted outage simulation be done with a mocked endpoint in CI, a local server kill test, or both?

## Recommended Next Step

Use this checklist as the active verification source for the current Motion Lab path.

Immediate next run:

- `npm run verify:motion-lab-negative-paths` with a real Pro-linked `SUPERICONS_API_KEY`
- optionally add `SUPERICONS_NON_PRO_API_KEY` to prove the live non-Pro entitlement denial path too
