# Search v2 local-first beta publication approval request

Date: 2026-07-16
Status: awaiting owner approval; this file does not authorize an external action
Manifest fingerprint: `12d163f0a6fc1e6098a04724e15916ce4354e04503190815a956d187c2b2178e`

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

Approval authorizes only these actions:

1. Publish the exact archive once as `@supericons/mcp@0.4.19-beta.0` under npm tag `beta`.
2. Keep npm `latest` at `0.4.17`.
3. Clean-install the published prerelease and run 150 local stdio search cases plus Material outline and solid checks. Telemetry is disabled during this smoke, and it makes zero hosted search calls.
4. Run at most 50 sequential, sanitized fixed-case requests against stable hosted search for an informational local-versus-hosted comparison. Concurrency is one and retries are zero.
5. If the published-package smoke fails, deprecate only `0.4.19-beta.0` and keep npm `latest` unchanged.
6. Keep the beta open for seven days from the first verified eligible user request. It may extend to 14 days if fewer than 200 eligible attempts or 20 session hashes are available.

The owner may manually share reviewed, plain-language invitations. No automated public message is authorized.

## Preflight and authentication

Immediately before publication, the guarded runner must confirm:

- npm `latest` is still `0.4.17`;
- `0.4.19-beta.0` is still absent;
- the exact archive, publisher, smoke, comparison runner, and manifest hashes match; and
- the local packet verifier still passes.

npm login or an npm one-time code may be required. The owner enters it directly in the terminal. No credential or code is placed in chat or in the repository.

## Informational comparison

The 50 stable hosted requests use fixed, reviewed cases from the evaluation set. The report stores case IDs and result references, not private user queries. It reports exact ordering, top-result agreement, and top-eight overlap.

This comparison does not gate the first beta. It shows where the packaged public index and stable hosted ranking differ. It does not authorize a production load test.

## Monitoring and closeout

The daily beta monitor and weekly maintenance audit remain drafts. This approval does not activate either routine. Monitoring activation requires a separate owner decision.

The beta closeout follows the existing scorecard: relevance review, zero-result clusters, error rate, latency, telemetry coverage, traffic concentration, and remaining deterministic gaps. A broad rollout requires a separate decision.

## Rollback

- Before publication: any mismatch stops with no registry change.
- Failed published-package smoke: deprecate only the exact prerelease and keep `latest` unchanged.
- Beta quality or safety failure: stop invitations, deprecate the exact prerelease, preserve public-safe evidence, and keep stable production unchanged.
- Stable fallback problem: stop the beta and investigate separately. Do not change the production function under this approval.

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

## Approval wording

To authorize this exact release, reply:

> Approve Search v2 local-first beta publication manifest `12d163f0a6fc1e6098a04724e15916ce4354e04503190815a956d187c2b2178e`. Publish the exact `@supericons/mcp@0.4.19-beta.0` archive once under npm tag `beta`, keep npm `latest` at `0.4.17`, run the local published-package smoke, and run at most 50 sequential sanitized stable-hosted comparison requests with no retries. If the smoke fails, deprecate only this prerelease. No function deployment, database action, production load test, npm `latest` change, monitoring activation, automated public message, scheduled warm ping, or model-provider call is authorized.
