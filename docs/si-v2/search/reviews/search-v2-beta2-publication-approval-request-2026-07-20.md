# Search v2 beta.2 npm publication request

Date: 2026-07-20

Status: packet prepared for exact verification and one private npm stage.

## Outcome

Publish `@supericons/mcp@0.4.19-beta.2` under the npm `beta` tag. Keep npm `latest` at `0.4.17`. This is an npm-only prerelease and does not promote any default public surface.

The exact manifest SHA-256 is `c15133ea945ca350959aa2eb64341b6390a812618d47ee147552261ab646cfd6`.

## Exact package

- Package: `@supericons/mcp@0.4.19-beta.2`
- Archive SHA-256: `520c9c99986a4eddd2f7d38cf3f517be412953e4471669f0db9c24c6bfdcec73`
- npm shasum: `1bf884205b55c57cf04d562f7ef9b9c4f0aea900`
- npm integrity: `sha512-40VCC6kk8oVY0bzOm4eq65vi7qhy5dKpDr97QQSAb/VCnBjlixrIUiAHu024qgVqhxb5Nhwimm8Kq8ld9J2+Eg==`
- Packed size: 6,132,653 bytes
- Unpacked size: 25,403,364 bytes
- Files: 65
- Package source commit: `baf714960cf44f3ba658354c609ec64ced3f8f54`

## Verification basis

- Two protected builds produced the same archive SHA-256.
- The exact 14-case beta.1 rejection matrix passes on the archive.
- The installed 150-case eligible route fingerprint is `357d161cf6059b9371ea38591f267f623e43e37cfd680cb5a097af50861c1659`, with zero hosted calls.
- The fixed 225-case fingerprint is `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`.
- One-call match and honest no-result behavior, 429 details, query-frame loading, and clarification behavior pass.
- VC-3 and VC-4 pass on the protected npm and web build surfaces.
- The package dependency audit reports zero known vulnerabilities.
- The beta.2 incident guardrail and daily monitor match D-030 and the controlled-evidence gate.

## Bounded external actions

The packet permits:

1. One private staged upload of the exact archive.
2. One owner browser approval of that exact stage with the npm account security key.
3. One post-approval finalization that verifies registry identity, tags, and the installed-package smoke.
4. At most one rollback that deprecates only beta.2 and restores the `beta` tag to `0.4.19-beta.1`.

No Railway, Supabase, database, or web deployment is permitted. No npm `latest` change, public invitation, production load test, scheduled warm ping, or model-provider call is permitted.

## Rollback

Before browser approval, any failure stops without a public package. After publication, any identity, tag, or installed-package failure deprecates only `0.4.19-beta.2`, restores the `beta` tag to `0.4.19-beta.1`, confirms `latest` remains `0.4.17`, and records a terminal result. Replaying a used staging or finalization manifest is rejected.

## Owner access step

After the private staged archive is downloaded, hash-checked, and installed-smoke verified, the owner opens npmjs.com Staged Packages and approves only the stage ID reported by the runner. No manual package upload or tag command is needed.
