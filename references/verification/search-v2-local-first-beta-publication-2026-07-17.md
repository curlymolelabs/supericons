# Search v2 local-first beta publication

Date: 2026-07-17
Status: published and verified under the npm `beta` tag
Environment: public npm registry and clean installed-package smoke on Windows with Node.js 24

## Outcome

`@supericons/mcp@0.4.19-beta.0` is publicly available under the npm `beta` tag. npm `latest` remains `0.4.17`, so existing stable users receive no change.

The published prerelease uses the packaged deterministic index for eligible English-like `search_icons` calls. Localized searches, non-ASCII searches, every `recommend_icons` call, website search, and stable hosted services remain unchanged.

## Public package identity

| item | verified value |
| --- | --- |
| Package | `@supericons/mcp@0.4.19-beta.0` |
| npm tag | `beta` |
| npm `latest` | `0.4.17` |
| npm shasum | `8889bdf8ebdc94aa1ff06117c1b0e7586b90ff33` |
| npm integrity | `sha512-k4XmYmAxQV/+Uj2n2aXSw8ECBqIC6BEbQb2KH2JLOLPqMxHizZJj0RnLkgbIa3Ks3V7zIgOslyxHQX1dDgVSVQ==` |
| Approved archive SHA-256 | `211df373b54629b14dfc0d0ab5f1063ad383b0139efec6cd6e0724f0f75dfe37` |
| Deprecation | None returned by the registry |

The public shasum and integrity match the exact archive prepared from implementation commit `b06bba157a0f63ef435eadaa8f8797fefe0d8617`.

## Installed-package verification

The public registry version passed the bound installed-package smoke before the finalization record became terminal:

- 150 eligible stdio cases used `local_first`;
- ordered results reproduced route fingerprint `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184`;
- Material outline and solid each returned three packaged SVG results;
- telemetry was disabled during smoke; and
- the outbound-call interceptor measured zero hosted calls.

The manifest-bound finalization record is terminal at `published_and_verified`. Repeating the same finalizer is prohibited before any external request.

## Stable-hosted comparison result

The separate informational comparison reached its first stable-hosted request and hit the fixed 30-second timeout. It made no retry and wrote no comparison report because the first request did not complete.

The manifest marks this comparison as non-gating. Its purpose was to describe ranking differences, not to validate the published local-first package. The package therefore remains published and is not deprecated.

The manifest-wide comparison receipt is present, so the full 50-request allowance is consumed. No rerun is allowed under this manifest. Hosted latency attribution remains unresolved and requires a future, separately bounded measurement if it is still needed.

## Safety boundary

- No Supabase function was deployed.
- No database action occurred.
- No site or Railway service changed.
- No npm `latest` mutation occurred.
- No model-provider call occurred.
- No scheduled warm ping or automated public message occurred.
- The integration worktree remained clean after finalization.

## Remaining beta work

The beta remains opt-in. The evidence window starts only after the first verified eligible user request. It may close after at least 200 eligible attempts, 20 session groups, 3 complete days, and green or resolved daily monitoring. Closeout must report relevance, zeros, errors, telemetry coverage, traffic concentration, adoption, and remaining deterministic gaps. If either sample minimum is not reached, the window may continue to 14 days and must otherwise be reported as underpowered.
