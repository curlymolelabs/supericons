# Search v2 search-only beta 0.4.19 preparation verification

Date: 2026-07-16
Environment: local Windows workspace, temporary clean Git worktrees, disposable PostgreSQL 17, npm registry read-only checks, and Supabase function metadata read-only checks
Status: ready for independent packet audit; not approved, deployed, or published

## Verified release shape

- Implementation commit: `415f401b7a034690ab039b5245f77b01f1d4fab2`.
- Authorization manifest: `bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734`.
- Package: `@supericons/mcp@0.4.19-beta.0`, 44 files.
- Clean package SHA-256: `6bb6bda4563ba2edef60bc5ce053a1f8dc4d22ba274956a1231b5d9ce7965c1c`.
- `search_icons` route: isolated `mcp-search-v2-beta`.
- `recommend_icons` route: stable `mcp-search`, with no beta cohort.
- Monitoring documents: drafted but inactive.

The clean package hash reproduced twice from temporary clean worktrees at the implementation commit. The approval requires publishing that exact verified archive. This avoids line-ending differences in an active Windows checkout changing the npm archive.

## Verification matrix

| area | command or evidence | result |
| --- | --- | --- |
| Packet binding | `npm run verify:search-v2-search-only-beta-packet:2026-07-16` twice | Passed with the same manifest and archive hashes |
| Guarded SQL runner | `npm run verify:search-v2-tool-latency-hosted-runner` | Passed; LF-normalized SQL hash, hidden password, one exact repair, no normal push |
| Tool latency migration | `npm run verify:search-v2-tool-latency-migration-smoke` | Passed on disposable PostgreSQL 17; hosted systems untouched |
| Beta audit migration | `npm run verify:search-v2-beta-migration-smoke` | Passed on disposable PostgreSQL 17; hosted systems untouched |
| Beta handler and telemetry | `npm run verify:search-v2-beta-gate-a` | Passed success and failure telemetry paths |
| Incident guards | `npm run verify:search-v2-beta-incident-gates` | Passed concurrency, error evidence, dedupe, latency, Material, dependency, and no-model-call checks |
| Tool routing | `npm run verify:search-v2-tool-scoped-beta` | Passed; legal English and localized workloads and full recommendation response parity |
| Clean package install | `npm run verify:search-v2-tool-scoped-package` | Passed at 44 files with search beta and recommendation stable |
| Material package | `npm run verify:material-mcp-package` | Passed 4,262 Material IDs and 8,524 outline and solid assets |
| Material clean install | `npm run verify:material-mcp-clean-install` | Passed truthful library listing and exact outline and solid SVG |
| Material fallback | `npm run verify:material-railway-hydration` | Passed 11 checks including bounded process-wide concurrency |
| Usage integrity | `npm run verify:mcp-usage-dedupe` | Passed separate-session and same-session retry cases |
| Grouped request | `npm run verify:search-v2-grouped-http-request` | Passed logical cost, order, audit, and maximum concurrency 2 |
| Hosted response parity | `npm run verify:search-v2-hosted-http-parity` | Passed exact status, headers, body, SVG, semantic order, and error response |
| Fixed suite | `npm run verify:search-v2-phase1-parity` | Passed 225 cases with clean fingerprint `ef293409...a76c8` |
| Deterministic default | `npm run verify:search-v2-deterministic-mcp-default` | Passed with zero external model-provider calls |
| Public safety | `npm --prefix mcp run verify:public-safety` | Passed across 44 packed files |
| Dependency audit | `npm --prefix mcp audit --omit=dev --audit-level=moderate` | Passed with zero vulnerabilities |
| Beta entry check | `deno check supabase/functions/mcp-search-v2-beta/index.ts` | Passed |
| Punctuation | changed-file U+2013 and U+2014 scan | Passed |

## Read-only live state

Read-only checks on 2026-07-16 found:

- npm `latest`: `0.4.17`;
- npm `0.4.19-beta.0`: not published;
- `search-icons`: active version 35;
- `mcp-search`: active version 38;
- `serve-material-snapshot`: active version 49; and
- `mcp-search-v2-beta`: absent.

No database password was supplied during preparation. The hosted migration ledger must be checked during execution preflight before SQL is applied.

## Release gates and rollback

Gate C is sequential and is not a load test. npm publication is blocked unless both platform error evidence and audit error evidence are readable, audit capture is at least 95 percent, errors are no more than 1 percent, search latency passes, recommendation response bytes remain unchanged, and Material outline and solid SVG pass.

If SQL fails, its transaction rolls back and history repair does not run. If Gate C fails or required live evidence is unavailable, delete the isolated endpoint and do not publish. If the prerelease is published and later fails, deprecate only the prerelease, delete the isolated endpoint, stop invitations, and keep npm `latest` unchanged.

## Residual limits

- No beta behavior has been observed live.
- The hosted migration ledger still needs an authenticated database-password check.
- Platform error evidence was not exercised because the isolated endpoint does not exist yet.
- `recommend_icons` remains on the stable path. The local shared recommendation treatment is outside this approval.
- The monitoring routines are drafts only and are not scheduled.
- No production function, Railway service, npm tag, database object, or site was changed during this preparation.
