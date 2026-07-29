# Search Language and Query Repair Evidence

Date: 2026-07-29

## Scope

This record covers the bounded repair for reviewed language aliases, approved inflection relevance, compound and mixed-script queries, and exact compact brand identity.

It does not claim that locally created icons are deployed.

## Pinned inputs

- Published package: `@supericons/mcp@0.4.24`
- Published package archive SHA-256: `3e1af277c1a6b83bb1ca21625c7c2f5058086d12f3b2e67468ad2e0c1c87b186`
- Local catalog baseline revision: `f8b95bf81cd2f2db300764dcc35a2e307149d173`
- Repair corpus: 22 public-safe cases with complete query, locale, library, mode, style, limit, required-ref, and forbidden-ref fields

## Baseline results

| Baseline | Passed | Failed | Notes |
| --- | ---: | ---: | --- |
| Published npm 0.4.24 | 5 | 17 | Exact clean installed archive |
| Local catalog revision `f8b95bf81` | 7 | 15 | Includes local-only catalog additions |

`tornillo` is an important catalog-state example. It is a false zero in published npm 0.4.24. It passes in the local catalog because `si:screw` and its alias exist locally. This record does not claim that result is public.

## Candidate results

The exact candidate archive:

- filename: `supericons-mcp-0.4.24.tgz`
- SHA-256: `e0af1aa898131722efd8033f3c995b35c0972a79fe4d91e6562833762abd706f`
- npm package version inside archive: `0.4.24`
- publication status: not published

Verification:

| Check | Result |
| --- | --- |
| Clean archive install | Passed |
| 22-case repair corpus through stdio | 22 of 22 passed |
| 225 direct search cases | Passed |
| 225 stdio cases | Passed |
| Ordered stdio result parity | Passed |
| Shared 30-case surface corpus | 30 of 30 passed |
| Built browser artifact | 30 of 30 passed on rerun |
| Existing 11-locale support gate | Passed |
| Existing CJK quality gate | Passed |
| Existing 31-case vocabulary gate | Passed |
| Hosted-primary route repair gate | Passed |
| Hosted error visibility gate | Passed |

The first built-browser verification attempt timed out while waiting for the application icon data. The immediate rerun against the same built artifact passed all 30 cases. No browser result assertion failed.

## Fingerprint review

Direct 225-case fingerprint:

- before: `731cd465de06e6d4ef30ba3f02dc2ab7069bf2561967c0d221246b5f4f3bad9d`
- after: `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`

Locale-route fingerprint:

- before: `f08667139af9a332d73de056d523ed22a1056867a5bd0bf7271b689ec5a7b4bc`
- after: `c924440e54573024cf8570769d9f46e2e360adb3b3f90f857f3507b5f6d69874`

Exactly one case changed in each route:

1. `Supericons 搜尋圖示`: before zero, after relevant search icons.
2. `logo de Pinecone y árbol`: before zero, after tree icons. This matches the existing reviewed rule that brand context must not erase the tree meaning.

No previously positive fingerprint case became zero.

## Timing

The 22-case clean installed package rerun recorded:

- median: 41 ms
- p95: 565 ms
- maximum: 578 ms

The pinned local baseline recorded p95 576 ms. The repair therefore did not create a measured regression, but it does not satisfy the older 500 ms local p95 target on this small clean-process matrix. Performance is not reported as passed.

## Generated data controls

Reviewed aliases live in `data/i18n/reviewed-search-alias-overrides.json`. The multilingual generator merges them into the data, browser, and npm copies. Verification checks that all generated copies match and that every reviewed record survives generation unchanged.

## Release boundary

No publication or deployment was performed.

Before release:

1. Independently audit the branch and exact candidate archive.
2. Confirm which local catalog additions are intended to ship.
3. Rebuild the final versioned archive from the approved merged source.
4. Run the same package and cross-surface gates on the final bytes.
5. Publish and deploy only through the normal bounded release process.
