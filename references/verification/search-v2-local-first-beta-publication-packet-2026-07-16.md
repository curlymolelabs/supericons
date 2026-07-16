# Search v2 local-first beta publication packet verification

Date: 2026-07-16
Status: finalization replay correction locally verified, awaiting independent audit
Implementation commit: `b06bba157a0f63ef435eadaa8f8797fefe0d8617`

## Outcome

The publication-only packet is rebuilt from the independently approved stdio route correction. It authorizes no action by itself.

The release contains one opt-in npm prerelease. It requires no Supabase function deployment, database migration, migration-history repair, normal database push, site deployment, model-provider call, or monitoring activation.

The first execution stopped during the live version-absence check, before `npm publish`. PowerShell promoted npm's expected nonzero result to a terminating error before the runner could classify the `E404`. Read-only registry checks immediately afterward confirmed npm `latest` at `0.4.17` and the target prerelease absent. The runner now captures native exit code and output under a local non-terminating error preference, then applies the existing fail-closed classification. A direct regression self-test captures exit code 1 and the expected absence marker without terminating the publisher.

The next guarded execution reached the single npm publish command. npm rejected it with `EOTP` and did not create the version. Read-only reconciliation again confirmed npm `latest` at `0.4.17` and the target prerelease absent. The owner then confirmed that this account uses a browser security key rather than a six-digit authenticator code, so the direct OTP route is not usable for this release.

The replacement uses npm staged publishing through pinned npm CLI `11.18.0`. A dry run against the exact archive reproduced the approved package name, version, size, file count, npm shasum, and npm integrity. The staging command does not require 2FA. It uploads the archive privately with tag `beta`, then the guarded runner must download that staged archive, match its SHA-256, and run the 150-case installed-package smoke before the owner approves it on npmjs.com with the account security key.

The staging runner creates an atomic, manifest-bound receipt in user-local application data immediately before the one allowed `npm stage publish` command. The receipt persists after failure, contains no credentials, and prevents a second staging command under the same manifest. A failed preflight does not consume the allowance.

## Bound release

| item | value |
| --- | --- |
| Package | `@supericons/mcp@0.4.19-beta.0` |
| Exact archive | `tmp/search-v2-local-first-beta-release-b06bba157/supericons-mcp-0.4.19-beta.0.tgz` |
| Archive SHA-256 | `211df373b54629b14dfc0d0ab5f1063ad383b0139efec6cd6e0724f0f75dfe37` |
| Archive size | 6,108,415 bytes |
| Files | 47 |
| Manifest SHA-256 | `48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3` |
| Helper fingerprint | `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8` |
| Installed stdio route fingerprint | `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184` |

The archive was generated with `npm pack --ignore-scripts` from a temporary clean worktree at the implementation commit. The verifier independently repacked that commit and reproduced the file count, sizes, npm shasum, npm integrity, and archive SHA-256.

## Guarded staged publication

The staging runner fails before registry contact unless both conditions are supplied and valid:

- `-ExecuteApprovedStaging`; and
- the exact independently audited manifest SHA-256.

The manifest binds the staging runner, packet verifier, installed-package smoke, hosted comparison runner, exact package archive, route fingerprints, external-action limits, and rollback behavior.

The staging runner checks npm authentication, `latest`, target-version absence, and staged-version absence before any upload. It invokes the pinned CLI with the exact archive, tag `beta`, public access, lifecycle scripts disabled, and JSON output. After upload it verifies the returned metadata and private stage record, downloads the staged tarball, matches the approved SHA-256, and runs the installed-package smoke. A failed check blocks browser approval, so no public version exists to roll back.

The manifest also binds a separate post-approval finalizer. It requires the verified stage record and creates an atomic, manifest-bound finalization reservation before the packet verifier, npm authentication check, registry reads, smoke, or comparison can make an external request. It rejects an already-deprecated exact prerelease, checks the public shasum, integrity, `beta` tag, and unchanged `latest`, and runs the installed-package smoke against the registry version. Any integrity, tag, or smoke failure routes through one exact-version deprecation handler and then confirms both the deprecation and unchanged `latest`. The finalizer records `published_and_verified` or `rolled_back`. An existing terminal or in-progress record blocks replay.

A local attempt-budget test produced zero stage calls after failed preflight, one call on first use, and zero calls on second use. The receipt is bound to the manifest and package and contains no credential material.

The finalization replay test recorded zero simulated external requests after verified success, confirmed rollback, and interrupted in-progress states. The already-deprecated rollback case made zero further deprecation calls. The comparison allowance test reserved 50 requests once, then allowed zero requests on both complete-run and partial-run replays. Both local record types were manifest-bound and contained no credential material.

## Published-package smoke

The smoke was run locally against the exact archive with telemetry disabled. It clean-installed the package, launched its real stdio entry point, and verified:

- 150 eligible `search_icons` cases use `local_first`;
- the installed route fingerprint matches `7a56bd23...32184`;
- Material outline returns three packaged SVGs;
- Material solid returns three packaged SVGs; and
- an outbound-call interceptor measures zero hosted calls; and
- a controlled one-call negative probe is rejected.

The same smoke script is required first against the downloaded private staged archive and again against the registry version after browser approval.

## Informational comparison plan

The comparison runner defaults to plan-only mode and made zero network calls during local verification. Execution requires the exact independently audited manifest hash. It creates an atomic one-use receipt immediately before the first stable-hosted request. A complete run or partial run consumes the 50-request total allowance for that manifest, and a rerun makes zero additional requests.

The approved plan contains exactly 50 reviewed fixed cases. It allows:

- 50 stable hosted requests;
- concurrency one;
- zero retries; and
- a 30-second timeout for each request.

The report stores case IDs and result references, not private user queries. It is informational and does not gate the first beta.

## Fail-closed checks

The packet verifier confirmed:

- the staging runner rejects a missing execution switch;
- the staging runner rejects the wrong audited fingerprint before npm contact;
- a failed preflight makes zero stage calls and creates no attempt receipt;
- the first simulated execution invokes staging once and the second same-manifest execution invokes it zero times;
- the persistent staging receipt is bound to the manifest and package and contains no credential material;
- the staged result must carry the approved package, version, size, shasum, integrity, tag, and stage ID;
- the downloaded staged archive must match the approved SHA-256 before browser approval;
- the downloaded staged archive must pass the real installed-package smoke before browser approval;
- the post-approval finalizer rejects a missing or wrong-manifest stage record;
- the finalizer records terminal success or rollback atomically and rejects success, rollback, and interrupted replays before external work;
- integrity mismatch, tag mismatch, and installed-smoke failure each invoke one exact-version deprecation;
- an already-deprecated exact prerelease cannot return success and invokes no further deprecation;
- all four rollback cases make zero publish calls and zero `latest` mutations;
- the comparison runner rejects the wrong approval fingerprint before network contact;
- the comparison runner's default mode reports zero network calls;
- the first comparison reserves at most 50 requests, while complete-run and partial-run replays make zero requests;
- finalization and comparison receipts are manifest-bound and contain no credential material;
- every critical executable hash matches the manifest; and
- external-action limits contain zero deployments, zero database mutations, zero npm `latest` changes, zero model calls, and zero monitoring activations.

## Verification commands

```powershell
node --check scripts/smoke-search-v2-local-first-beta-published.mjs
node --check scripts/run-search-v2-local-hosted-comparison.mjs
node --check scripts/verify-search-v2-local-first-beta-publication-packet.mjs
& .\scripts\stage-search-v2-local-first-beta.ps1 -RunStageAttemptSelfTest
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunStageRecordSelfTest
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunFinalizationOutcomeSelfTest
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunRollbackSelfTest -RollbackTestScenario integrity_mismatch
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunRollbackSelfTest -RollbackTestScenario tag_mismatch
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunRollbackSelfTest -RollbackTestScenario smoke_failure
& .\scripts\finalize-search-v2-local-first-beta.ps1 -RunRollbackSelfTest -RollbackTestScenario already_deprecated
node scripts/run-search-v2-local-hosted-comparison.mjs --run-attempt-budget-self-test
npx --yes npm@11.18.0 stage publish tmp/search-v2-local-first-beta-release-b06bba157/supericons-mcp-0.4.19-beta.0.tgz --tag beta --ignore-scripts --dry-run --json
node scripts/verify-search-v2-local-first-beta-publication-packet.mjs --expected-manifest 48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3
```

The packet verifier, replay self-tests, exact archive repack, 150-case installed-route smoke, hosted-call negative probe, and npm staged-publication dry run passed. No staged upload, npm publication, deployment, database action, hosted comparison, automated public message, monitoring activation, or model-provider call occurred.
