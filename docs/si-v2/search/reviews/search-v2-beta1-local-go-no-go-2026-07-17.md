# Search v2 beta.1 local release decision

Date: 2026-07-17

Decision: GO to independent packet review. This decision does not publish or stage the package.

## Acceptance criteria

- The exact archive rebuilds byte-for-byte from the pinned clean implementation commit.
- All 150 eligible local-first cases preserve their approved ordered results.
- The installed package makes zero hosted calls for eligible local-first cases.
- Material outline and solid checks pass from the installed archive.
- VC-3 excludes the five named protected intelligence classes from staged npm and web artifacts.
- VC-4 verifies package terms, third-party notices, and private-record-bound canaries on both staged surfaces.
- Maintained source files do not contain the private canary values.
- The public MCP package dependency audit reports zero vulnerabilities.
- The package remains below the 7 MB archive limit.

## Rollback readiness

The staged flow is single-use. The post-approval finalizer is single-use and verifies the public archive identity, integrity, beta tag, unchanged latest tag, and installed-package behavior.

Integrity, tag, smoke, and already-deprecated test scenarios passed. A post-publication failure deprecates only `0.4.19-beta.1` and does not mutate npm `latest`.

## Residual risk

- Minification and canaries add friction and evidence but cannot prevent a determined party from reading or copying client-delivered bytes.
- The website boundary was verified in a staged artifact, but this packet does not deploy the website.
- The root repository has seven existing development-tool audit findings. The published MCP package has zero dependency findings.
- Runtime beta quality still requires the separate organic evidence window: 200 eligible attempts and three complete green days.

## Worst credible first-day failure

The prerelease could install successfully but fail a real client environment not represented by the fixed smoke. The blast radius is limited because the package is opt-in under the `beta` tag, npm `latest` remains unchanged, and the exact prerelease can be deprecated without changing the stable package.
