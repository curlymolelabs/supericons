# Search v2 beta.2 release candidate

Date: 2026-07-20

Lifecycle state: built and verified locally, not published, not merged to main, and not promoted on any public venue.

## Candidate identity

- Source commit: `baf714960cf44f3ba658354c609ec64ced3f8f54`
- Package: `@supericons/mcp@0.4.19-beta.2`
- Intended npm tag: `beta`
- Archive: `tmp/search-v2-beta2-release-baf714960/archive/supericons-mcp-0.4.19-beta.2.tgz`
- Archive SHA-256: `520c9c99986a4eddd2f7d38cf3f517be412953e4471669f0db9c24c6bfdcec73`
- npm shasum: `1bf884205b55c57cf04d562f7ef9b9c4f0aea900`
- npm integrity: `sha512-40VCC6kk8oVY0bzOm4eq65vi7qhy5dKpDr97QQSAb/VCnBjlixrIUiAHu024qgVqhxb5Nhwimm8Kq8ld9J2+Eg==`
- Packed size: 6,132,653 bytes
- Unpacked size: 25,403,364 bytes
- File count: 65

Two protected builds from the same source commit produced the same archive SHA-256. The protected build includes three private canaries, minifies the three generated public engine modules, and normalizes timestamps before packing.

## Search contracts

- Fixed 225-case fingerprint: `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`
- Eligible 150-case stdio fingerprint: `357d161cf6059b9371ea38591f267f623e43e37cfd680cb5a097af50861c1659`
- Eligible stdio hosted calls: 0
- Material outline and solid checks: 3 results each
- Clean source fingerprint inputs: yes

The fixed-suite change review found 19 changed cases relative to the first quality-batch commit. Each change follows the same general correction: synonym matches now use token boundaries, and reverse synonym lookup no longer imports unrelated sibling terms. This removes cases such as `star` matching `start`, `save` matching `saver`, and `respond` importing question icons. The direct Material `favorite` check now returns:

1. `material:favorite`
2. `material:favorite_border`
3. `material:award_star`
4. `material:bookmark`
5. `material:bookmark_add`

## Beta.1 rejection matrix

The exact 14 scenarios from the beta.1 manual report passed against the protected archive:

| id | scenario | protected beta.2 result |
| --- | --- | --- |
| 1 | exact database search | five exact database refs |
| 2 | strict Lucide user settings | three Lucide user and cog refs |
| 3 | preferred Tabler analytics dashboard | `tabler:dashboard`, `material:dashboard`, `tabler:device-analytics` |
| 4 | restore deleted item | `material:restore`, `material:undo`, `lucide:archive-restore` |
| 5 | two-word analytics typo | analytics and dashboard results |
| 6 | `si` versus Simple Icons | honest `si` no-result, exact `simpleicons:claude` |
| 7 | Material favorite styles | five relevant refs in both outline and solid |
| 8 | Spanish calendar fallback | five calendar results through the approved hosted route |
| 9 | nonsense query | structured `no_icons_found`, no image fields, no fabrication |
| 10 | cloud deployment determinism | three identical runs with cloud, deployed code, and rocket launch |
| 11 | six recommendation slots | six distinct Lucide outline recommendations with SVG |
| 12 | bare `run` | labeled software execution and physical running interpretations |
| 13 | result maximum | 50 unique refs with SVG and valid preview links |
| 14 | invalid limit | limit 51 rejected with the exact maximum of 50 |

## Package and public-boundary checks

- Full package prepublication suite: passed.
- Package public-safety scan: 65 files passed.
- One-call match and honest no-result paths: passed.
- Structured 429 propagation: passed with an unclamped 43,200-second retry.
- Packaged query frame: passed with non-empty concepts for maintained semantic queries.
- Recommendation clarification behavior: passed.
- Material package and clean-install gates: passed.
- Semantic smoke: 13 cases passed.
- Full semantic verification: 225 evaluation queries and 75,840 semantic documents passed.
- `VC-3_bundle_content`: passed for npm and web surfaces.
- `VC-4_license_and_canary`: passed for npm and web surfaces.
- Third-party provenance SHA-256: `e86d3d35ad3b5bd1436d19d3c44964a5693ff3044db21480511f0e4b26628a94`
- Private canary record SHA-256: `abed31fb65d8ae606680ac55e862ef2f06a091617e3c266b79ecd12c2fd03963`

## Index timestamp and payload identity

The public and packaged indexes were repackaged with the pinned timestamp `2026-07-19T20:30:08.523Z`. This was a timestamp-only refresh of the current maintained catalog, not a claim that new icon entries were imported.

| index | icons | payload SHA-256, excluding `generatedAt` | output SHA-256 |
| --- | ---: | --- | --- |
| outline | 21,427 | `4efd195a2b14a2186b3509ba9857a635dad46664b7003da86d21929d442480a1` | `2993987e874733e6343f2bf4a95ee363910baf73e50312844331bd89937cf4da` |
| solid | 6,059 | `bf9c7b5bdaa54ace83fc1d9575713e2aac2cf298c0e172c254accc75a4d59196` | `110db1a63e556efcca644391a9e94bd939c794245f22dd0b46a86c8fd61cd40a` |

The refresh script proves that public and packaged copies match before and after the operation and that the icon payload hash does not change.

## GeoIP maintenance result

The pinned GeoLite2 Country package is dated 2026-06-17 and is 32 days old. A registry query on 2026-07-20 returned `2.3.2026061719` as the newest published version, which is the version already pinned in the package and lockfile. No unavailable update was invented. The freshness gate now requires a registry check no older than seven days and requires the installed version to equal the recorded registry latest version.

## Remaining gates

1. An independent reviewer must reproduce the archive identity, 14-case matrix, 150-case route fingerprint, and VC-3 and VC-4 probes.
2. Publication requires the existing explicit approval for the `beta` tag. npm `latest` must remain unchanged.
3. After publication, verify the registry tarball hash, installed package behavior, `beta` tag, and unchanged `latest` tag.
4. Public venue replacement remains a later decision. This candidate is the beta.2 validation package, not approval to promote every surface.

The keyless docs artifact is a separate production release. Its browser smoke passed, but its production deploy still waits for the independent docs packet GO.

## Independent reproduction commands

Run the source probes from a clean worktree at source commit `baf714960cf44f3ba658354c609ec64ced3f8f54`:

```powershell
node scripts/verify-search-v2-phase1-parity.mjs
node scripts/verify-search-v2-tool-scoped-package.mjs
node scripts/verify-search-v2-protected-public-artifacts.mjs
```

Run the archive probes from the integration worktree where the ignored release archive is stored:

```powershell
node scripts/verify-search-v2-beta2-14-case-matrix.mjs --tarball tmp/search-v2-beta2-release-baf714960/archive/supericons-mcp-0.4.19-beta.2.tgz
node scripts/smoke-search-v2-local-first-beta-published.mjs --package-spec tmp/search-v2-beta2-release-baf714960/archive/supericons-mcp-0.4.19-beta.2.tgz --expected-version 0.4.19-beta.2 --expected-route-fingerprint 357d161cf6059b9371ea38591f267f623e43e37cfd680cb5a097af50861c1659
```

The independent rebuild should use `scripts/build-search-v2-protected-public-artifacts.mjs`, the pinned private-record SHA-256 above, and `npm pack --ignore-scripts`. Its archive SHA-256 must equal `520c9c99986a4eddd2f7d38cf3f517be412953e4471669f0db9c24c6bfdcec73`.
