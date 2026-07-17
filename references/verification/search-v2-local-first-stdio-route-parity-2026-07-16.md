# Search v2 local-first stdio route parity verification

Date: 2026-07-16
Status: locally verified; independent review required; no publication authorized

## Finding

The original clean-install package gate called `search.js` directly. The published MCP entry point performs additional work around that helper. A full clean-install replay found that the real stdio `search_icons` route differed from the approved helper observations on 51 of 150 eligible no-locale ASCII cases.

Representative differences included:

- `license plate` changed from an approved zero to camera results;
- `openai codex` gained unrelated tail results;
- `lovable` lost the required brand identity from the top eight; and
- `swift` lost the approved expressive fallback result.

This gap blocked publication even though the lower-level 225-case fingerprint still passed.

## Cause

The eligible local route called the approved deterministic `searchIcons` engine once for every generated intent variant, then merged semantic candidates and reranked the combined list again. The helper already performs the approved interpretation-family and ranking-policy work. Applying a second expansion and merge changed result composition and could displace required candidates.

The any-style route also searched both outline and solid indexes. That introduced one additional difference in the strict Bootstrap `cog` case after the duplicate pipeline was removed.

## Correction

For an eligible local-first request, the stdio handler now:

1. calls the approved deterministic `searchIcons` engine once;
2. uses the outline contract index for `any` and `outline` requests;
3. keeps the solid index for an explicit `solid` request; and
4. leaves localized, non-ASCII, recommendation, and hosted fallback behavior unchanged.

No query-specific ranking rule or result exception was added.

## Permanent package gate

`scripts/verify-search-v2-tool-scoped-package.mjs` now installs the packed archive, launches its real stdio entry point, and sends all 150 eligible fixed cases through MCP `search_icons`.

For every case, the gate requires exact equality of the ordered result references. Missing, extra, reordered, or substituted references fail the gate.

The route-level contract is:

- eligible cases: 150;
- route fingerprint: `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184`;
- ordered result parity: true; and
- local runtime mode required on every case: `local_first`.

The package prepublication command now includes this clean-install route gate.

## Local evidence

The following check passed after the correction:

```powershell
npm run verify:search-v2-tool-scoped-package
```

It reported:

- clean install: true;
- fixed 225-case helper fingerprint: `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8`;
- 150 eligible stdio cases;
- stdio route fingerprint: `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184`; and
- exact ordered result parity: true.

The full local regression run also passed:

- local-first routing and telemetry isolation;
- tool-scoped routing and recommendation byte parity;
- 225-case helper fingerprint parity;
- ranking policy, brand, ambiguity, and expressive fallback checks;
- strict, prefer, and all library-mode checks;
- recommendation clarification;
- multilingual stable fallback;
- Material bundle and clean-install checks;
- intent graph and query-frame checks; and
- the deterministic no-provider-call gate.

The corrected feasibility run measured 223.658 ms p95 across 225 helper cases, 51,523,584 bytes p95 combined RSS, and 6,108,673 packed bytes. These remain below the 500 ms, 75,000,000 byte, and 7,000,000 byte local release limits.

The package's actual `prepublishOnly` command passed with the new clean-install stdio route gate included.

The first publication packet draft was withdrawn. A new archive and packet must be created only after this correction receives independent review.

## External state

No package was published. No function was deployed. No database or hosted service was changed.
