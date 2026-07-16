# Search v2 local-first beta publication execution record

Date: 2026-07-16
Status: finalization replay correction locally verified, awaiting independent audit
Manifest fingerprint: `48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3`

## Purpose

Publish an opt-in MCP prerelease that runs eligible English-like `search_icons` requests from the deterministic index inside the package. This removes the slow hosted round trip for those searches.

The beta does not call an AI agent, language model, or embedding provider. It does not change the website, the stable hosted search functions, the database, or the npm `latest` release.

## Exact release

| item | approved value |
| --- | --- |
| Implementation commit | `b06bba157a0f63ef435eadaa8f8797fefe0d8617` |
| Package | `@supericons/mcp@0.4.19-beta.0` |
| npm tag | `beta` |
| Exact archive SHA-256 | `211df373b54629b14dfc0d0ab5f1063ad383b0139efec6cd6e0724f0f75dfe37` |
| Exact archive size | 6,108,415 bytes |
| npm `latest` that must remain | `0.4.17` |
| Fixed search cases | 225 |
| Eligible installed-package cases | 150 |
| Installed stdio route fingerprint | `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184` |
| Packaged Material assets | 8,524 |

The archive was built from a temporary clean worktree at the implementation commit. Publication must use this exact hash-checked archive with lifecycle scripts disabled. It must not repack the active working folder.

The first execution stopped before publication because PowerShell treated npm's expected version-absent result as a fatal command error. Registry checks immediately afterward confirmed that `0.4.19-beta.0` remained absent and npm `latest` remained `0.4.17`. The runner now captures nonzero native-command results for explicit classification, with a regression test for the expected absence result.

The corrected execution reached `npm publish`, which npm rejected with `EOTP` before creating the version. Read-only reconciliation again confirmed that the prerelease remained absent and `latest` remained `0.4.17`. The owner then confirmed that this npm account uses a browser security key rather than a six-digit authenticator code. The direct OTP path is therefore retired for this release.

The replacement uses npm staged publishing. The executor uploads the exact archive to npm's private staging area with tag `beta`, downloads the staged archive again, verifies its SHA-256, and runs the installed-package smoke before the owner sees an approval step. The owner then approves that exact stage on npmjs.com with the normal browser password and security key.

The staging runner uses npm CLI `11.18.0` through a pinned `npx` command because the installed npm CLI does not yet include staged publishing. A dry run against the exact archive reproduced its name, version, size, file count, npm shasum, and npm integrity. The staging command itself does not require 2FA. Browser approval remains the only owner access step.

The runner creates an atomic, manifest-bound staging receipt in the current user's local application data immediately before the one allowed staging command. It survives process exit, contains no credentials, and blocks a second staging command under the same manifest. Failed preflight does not consume the allowance.

A separate manifest-bound finalizer runs immediately after browser approval. It requires the verified private stage record, atomically reserves finalization before any external request, checks that the exact prerelease is not already deprecated, verifies the public shasum, integrity, `beta` tag, and unchanged `latest` tag, then repeats the real installed-package smoke. Integrity mismatch, tag mismatch, and smoke failure tests each invoke one exact-version deprecation and zero `latest` mutations. The finalizer records either `published_and_verified` or `rolled_back`. A repeated finalizer run is rejected before any external request, including after an interrupted first run.

These corrections do not change the package archive, user experience, release scope, or rollback decision. Under the owner's delegated-judgment rule, a regenerated manifest for this safer access path does not require renewed product approval.

## Route boundary

The prerelease changes only this route:

- `search_icons` with no locale and ASCII query text uses the packaged local index.

These routes stay on stable production:

- localized `search_icons`;
- non-ASCII `search_icons`;
- every `recommend_icons` request; and
- website search.

Users on npm `latest` remain on `0.4.17` and receive no change.

## Verified local gates

The clean-installed package route matched every ordered result reference across all 150 eligible cases. The full 225-case helper fingerprint also remained unchanged. Material outline and solid SVGs came from the package bundle.

Independent local reruns measured search p95 below the 500 ms release limit, memory below the 75 MB limit, and the packed archive below the 7 MB limit. The package prepublication command, public-safety scan, recommendation parity, stable fallback checks, and zero-vulnerability package audit passed.

The shipped search index was generated at `2026-06-28T06:24:19.035Z`. A package update is required to refresh that snapshot.

## Requested external actions

The recorded release decision permits only these actions:

1. Stage the exact archive once in npm's private staging area with tag `beta`.
2. Download the private staged archive, verify its exact SHA-256, and run the 150-case installed-package smoke plus Material outline and solid checks before browser approval.
3. The owner approves only the verified stage on npmjs.com with the account security key, publishing `@supericons/mcp@0.4.19-beta.0` under npm tag `beta`.
4. Keep npm `latest` at `0.4.17`.
5. Verify the live prerelease shasum, integrity, and tags, then repeat the installed-package smoke. Telemetry is disabled during this smoke. An outbound-call interceptor must measure zero hosted calls, and a controlled one-call probe must prove the smoke fails when any call is observed.
6. Run at most 50 sequential, sanitized fixed-case requests against stable hosted search for an informational local-versus-hosted comparison. Concurrency is one and retries are zero. An atomic manifest-bound receipt consumes this total allowance immediately before the first hosted request. A partial comparison consumes the full manifest allowance, so a rerun makes zero additional hosted requests.
7. If a check fails before browser approval, do not approve the stage and reject only that staged package. If a check fails after publication, deprecate only `0.4.19-beta.0`, confirm the deprecation, and keep npm `latest` unchanged.
8. Keep the beta open for seven days from the first verified eligible user request. It may extend to 14 days if fewer than 200 eligible attempts or 20 session hashes are available.

The owner may manually share reviewed, plain-language invitations. No automated public message is authorized.

## Preflight and authentication

Immediately before publication, the guarded runner must confirm:

- npm `latest` is still `0.4.17`;
- `0.4.19-beta.0` is still absent;
- the exact archive, staging runner, smoke, comparison runner, and manifest hashes match; and
- the local packet verifier still passes.

The preflight must classify npm's expected version-absent response without terminating or publishing. Any other absence-check failure still stops before registry mutation.

Immediately before `npm stage publish`, the runner must atomically consume the one remaining staging-command allowance. If npm rejects that command, the manifest cannot be rerun. A further attempt requires a new independently audited manifest.

Immediately before post-approval verification can make any external request, the finalizer must atomically reserve the manifest-bound finalization outcome. An existing `in_progress`, `published_and_verified`, or `rolled_back` record blocks replay. A new independently audited manifest is required after an interrupted or terminal finalization.

npm login is required for the private staging upload. Staging does not require 2FA. After the staged archive passes its checks, the owner opens npmjs.com and approves the exact stage with the account password and security key. No credential is placed in chat, the repository, or the evidence record.

## Informational comparison

The 50 stable hosted requests use fixed, reviewed cases from the evaluation set. The report stores case IDs and result references, not private user queries. It reports exact ordering, top-result agreement, and top-eight overlap. The comparison allowance is one-use per manifest. Complete and partial runs both consume it before the first hosted request.

This comparison does not gate the first beta. It shows where the packaged public index and stable hosted ranking differ. It does not authorize a production load test.

## Monitoring and closeout

The daily beta monitor and weekly maintenance audit remain drafts. This release does not activate either routine. Monitoring activation requires a separate reviewed scope and cost decision under `FR-26`.

The beta closeout follows the existing scorecard: relevance review, zero-result clusters, error rate, latency, telemetry coverage, traffic concentration, and remaining deterministic gaps. A broad rollout requires a separate decision.

## Rollback

- Before publication: any mismatch stops with no registry change.
- Failed post-publication verification: deprecate only the exact prerelease, confirm the deprecation, and keep `latest` unchanged.
- Repeated or interrupted finalization: reject the same manifest before any external request. Do not convert a rollback into success and do not repeat the hosted comparison.
- Beta quality or safety failure: stop invitations, deprecate the exact prerelease, preserve public-safe evidence, and keep stable production unchanged.
- Stable fallback problem: stop the beta and investigate separately. Do not change the production function under this release plan.

## Excluded scope

This request does not authorize:

- a Supabase function deployment;
- a database migration, history repair, or normal database push;
- a production load test;
- a change to npm `latest`;
- local-first localized, non-ASCII, recommendation, or web search;
- a scheduled warm ping;
- an automated public invitation;
- monitoring activation;
- a model-provider call; or
- a Netlify, Railway, or other site deployment.

## Owner access step

After the independent audit passes, the executor runs the bound staging command in the integration worktree:

```powershell
& .\scripts\stage-search-v2-local-first-beta.ps1 `
    -ExecuteApprovedStaging `
    -ApprovedManifestSha256 48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3
```

Only after the runner reports `staged_and_verified` does the owner open npmjs.com Staged Packages and approve the matching package, version, tag, and stage ID. This is an access step, not a new product approval.

Immediately after the owner confirms browser approval, the executor runs the bound finalizer:

```powershell
& .\scripts\finalize-search-v2-local-first-beta.ps1 `
    -ExecuteApprovedFinalization `
    -ApprovedManifestSha256 48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3
```
