# Search v2 local-first beta publication execution record

Date: 2026-07-16
Status: awaiting independent audit and owner terminal access for npm OTP
Manifest fingerprint: `a0fe25b1cd948c5c4112c81604daf8d9399e0bb7ef1b3a218794298277050663`

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

The corrected execution reached `npm publish`, which npm rejected with `EOTP` before creating the version. Read-only reconciliation again confirmed that the prerelease remained absent and `latest` remained `0.4.17`. The guarded runner now requires `-PromptForNpmOtp`, reads the six-digit code as a secure terminal value, exposes it to npm only through the child-process environment, and restores the previous environment immediately afterward.

Independent audit then found that the one-additional-command limit existed only in the manifest. The runner now creates an atomic, manifest-bound receipt in the current user's local application data immediately before the npm publish child starts. The receipt contains the manifest hash, package, action, and timestamp only. It survives process exit and blocks a second publish command under the same manifest. Failed preflight and invalid OTP format stop before the allowance is consumed.

These runner corrections do not change the package archive, user experience, release scope, or rollback decision. Under the owner's delegated-judgment rule, a regenerated manifest for these equivalent safety corrections does not require renewed product approval. The remaining owner step is physical access only: entering the npm OTP directly in the terminal.

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

1. Publish the exact archive once as `@supericons/mcp@0.4.19-beta.0` under npm tag `beta`.
2. Keep npm `latest` at `0.4.17`.
3. Clean-install the published prerelease and run 150 local stdio search cases plus Material outline and solid checks. Telemetry is disabled during this smoke. An outbound-call interceptor must measure zero hosted calls, and a controlled one-call probe must prove the smoke fails when any call is observed.
4. Run at most 50 sequential, sanitized fixed-case requests against stable hosted search for an informational local-versus-hosted comparison. Concurrency is one and retries are zero.
5. If any check after publication fails, including archive identity, npm tags, or the published-package smoke, deprecate only `0.4.19-beta.0`, confirm the deprecation, and keep npm `latest` unchanged.
6. Keep the beta open for seven days from the first verified eligible user request. It may extend to 14 days if fewer than 200 eligible attempts or 20 session hashes are available.

The owner may manually share reviewed, plain-language invitations. No automated public message is authorized.

## Preflight and authentication

Immediately before publication, the guarded runner must confirm:

- npm `latest` is still `0.4.17`;
- `0.4.19-beta.0` is still absent;
- the exact archive, publisher, smoke, comparison runner, and manifest hashes match; and
- the local packet verifier still passes.

The preflight must classify npm's expected version-absent response without terminating or publishing. Any other absence-check failure still stops before registry mutation.

Immediately before `npm publish`, the runner must atomically consume the one remaining command allowance. If npm rejects that command, including an expired OTP, the manifest cannot be rerun. A further attempt requires a new independently audited manifest.

npm login and an npm one-time code are required. The owner enters the code directly into the guarded runner's secure terminal prompt. No credential or code is placed in chat, the repository, or the evidence record.

## Informational comparison

The 50 stable hosted requests use fixed, reviewed cases from the evaluation set. The report stores case IDs and result references, not private user queries. It reports exact ordering, top-result agreement, and top-eight overlap.

This comparison does not gate the first beta. It shows where the packaged public index and stable hosted ranking differ. It does not authorize a production load test.

## Monitoring and closeout

The daily beta monitor and weekly maintenance audit remain drafts. This release does not activate either routine. Monitoring activation requires a separate reviewed scope and cost decision under `FR-26`.

The beta closeout follows the existing scorecard: relevance review, zero-result clusters, error rate, latency, telemetry coverage, traffic concentration, and remaining deterministic gaps. A broad rollout requires a separate decision.

## Rollback

- Before publication: any mismatch stops with no registry change.
- Failed post-publication verification: deprecate only the exact prerelease, confirm the deprecation, and keep `latest` unchanged.
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

After the independent audit passes, the owner runs the bound publisher in the integration worktree:

```powershell
& .\scripts\publish-search-v2-local-first-beta.ps1 `
    -ExecuteApprovedPublication `
    -PromptForNpmOtp `
    -ApprovedManifestSha256 a0fe25b1cd948c5c4112c81604daf8d9399e0bb7ef1b3a218794298277050663
```

The owner enters the six-digit npm code at the hidden prompt. This is an access step, not a new product approval.
