# Search v2 local-first beta publication packet verification

Date: 2026-07-16
Status: locally verified, awaiting independent packet audit and owner approval
Implementation commit: `b06bba157a0f63ef435eadaa8f8797fefe0d8617`

## Outcome

The publication-only packet is rebuilt from the independently approved stdio route correction. It authorizes no action by itself.

The release contains one opt-in npm prerelease. It requires no Supabase function deployment, database migration, migration-history repair, normal database push, site deployment, model-provider call, or monitoring activation.

## Bound release

| item | value |
| --- | --- |
| Package | `@supericons/mcp@0.4.19-beta.0` |
| Exact archive | `tmp/search-v2-local-first-beta-release-b06bba157/supericons-mcp-0.4.19-beta.0.tgz` |
| Archive SHA-256 | `211df373b54629b14dfc0d0ab5f1063ad383b0139efec6cd6e0724f0f75dfe37` |
| Archive size | 6,108,415 bytes |
| Files | 47 |
| Manifest SHA-256 | `416f698205077aac41c3499b140414500e84cca6fb4709d940dbb0043e99f54b` |
| Helper fingerprint | `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8` |
| Installed stdio route fingerprint | `7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184` |

The archive was generated with `npm pack --ignore-scripts` from a temporary clean worktree at the implementation commit. The verifier independently repacked that commit and reproduced the file count, sizes, npm shasum, npm integrity, and archive SHA-256.

## Guarded publication

The publisher fails before registry contact unless both conditions are supplied and valid:

- `-ExecuteApprovedPublication`; and
- the exact owner-approved manifest SHA-256.

The manifest binds the publisher, packet verifier, published-package smoke, hosted comparison runner, exact package archive, route fingerprints, external-action limits, and rollback behavior.

The guarded publisher checks npm authentication and live registry state before publication. It publishes the exact archive with lifecycle scripts disabled, verifies the registry shasum and integrity, confirms `latest` remains `0.4.17`, then runs the clean-installed published-package smoke. Any failed check after publication uses one rollback handler that deprecates only the exact prerelease, confirms the deprecation, and confirms `latest` remains unchanged.

Mocked integrity-mismatch and tag-mismatch cases each produced exactly one publish call, one exact-version deprecation call, and zero `latest` mutation calls.

## Published-package smoke

The smoke was run locally against the exact archive with telemetry disabled. It clean-installed the package, launched its real stdio entry point, and verified:

- 150 eligible `search_icons` cases use `local_first`;
- the installed route fingerprint matches `7a56bd23...32184`;
- Material outline returns three packaged SVGs;
- Material solid returns three packaged SVGs; and
- an outbound-call interceptor measures zero hosted calls; and
- a controlled one-call negative probe is rejected.

The same smoke script will install the registry version after publication.

## Informational comparison plan

The comparison runner defaults to plan-only mode and made zero network calls during local verification. Execution requires the exact owner-approved manifest hash.

The approved plan contains exactly 50 reviewed fixed cases. It allows:

- 50 stable hosted requests;
- concurrency one;
- zero retries; and
- a 30-second timeout for each request.

The report stores case IDs and result references, not private user queries. It is informational and does not gate the first beta.

## Fail-closed checks

The packet verifier confirmed:

- the publisher rejects a missing execution switch;
- the publisher rejects the wrong approval fingerprint before npm contact;
- integrity and tag mismatches after publication each invoke the exact-version rollback once;
- those rollback cases never republish and never mutate npm `latest`;
- the comparison runner rejects the wrong approval fingerprint before network contact;
- the comparison runner's default mode reports zero network calls;
- every critical executable hash matches the manifest; and
- external-action limits contain zero deployments, zero database mutations, zero npm `latest` changes, zero model calls, and zero monitoring activations.

## Verification commands

```powershell
node --check scripts/smoke-search-v2-local-first-beta-published.mjs
node --check scripts/run-search-v2-local-hosted-comparison.mjs
node --check scripts/verify-search-v2-local-first-beta-publication-packet.mjs
node scripts/verify-search-v2-local-first-beta-publication-packet.mjs --expected-manifest 416f698205077aac41c3499b140414500e84cca6fb4709d940dbb0043e99f54b
```

The packet verifier passed. No npm publication, deployment, database action, hosted comparison, automated public message, monitoring activation, or model-provider call occurred.
