# Audit request: Search v2 session work of 2026-07-19

Requested by: owner

Audit everything below independently. Treat all reported results as claims until reproduced.

## 1. Repository state and environment

The working repository moved from the old D: drive to `C:\backup\...\DailySprint\supericons`. Git worktree pointers were repaired for `supericons-mcp-docs-accuracy`. Other worktrees still show as prunable with dead D: paths and were not touched.

## 2. Commits to audit, in order

| commit | branch | content |
| --- | --- | --- |
| `60d191805` | main | Merge of the previously audited docs-accuracy branch (packet commit `45eb5678a`, manifest `04d1a764...`) into main |
| `eb5d6878c` | main | Allowance thresholds: measurement artifact, dormant tier enforcement wiring, fair-use docs section in 12 locales |
| `f34ef91f9` | main | Measurement grain definitions, direct exceedance counts, tool-level segmentation added to the artifact |
| `dd0098a51` | main | Founder beta validation runner `scripts/run-founder-beta-validation.mjs` |
| `d46dc7110` | `codex/mcp-docs-accuracy-20260718`, merged to main | OpenCode location text now names `opencode.jsonc` and the global config path; browser gate assertion updated |

## 3. Web release packet status: REOPENED, needs rebuild and re-audit

The docs-accuracy packet previously passed verification twice against manifest `04d1a764a90b630efc497833d26697de99f5301963d72effb589550d868b4885` and artifact tree `81b320dc3f101cd4f9431f17e3876a91c16d689f1d4e51d01a2ffbb01fcca5c4` (188 files, 41,234,684 bytes). The owner smoke test on that exact artifact passed with one content correction ordered: the OpenCode tab location text. Commit `d46dc7110` changes source, so the old manifest no longer covers the release.

Executor tasks:

1. Rebuild the artifact from the branch including `d46dc7110`.
2. Rebind the manifest (source commit, file hashes, probe inventory) and rerun the full packet verifier.
3. Confirm the browser gate passes with the new OpenCode assertion.
4. Resubmit for dual GO. Note honestly: the packet verification reproduced in this session was run by the same operator who repaired the release environment, so it should not count as the independent second GO.
5. After dual GO, the owner runs the single guarded Netlify deployment.

Owner decisions already recorded for this release: ship the keyless correction narrowly; the fair-use limits section on main is NOT part of this artifact and ships with a later release.

## 4. Allowance thresholds and dormant enforcement (audit targets)

- Measurement artifact: `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md`. Read-only aggregation of `search_request_audit` (30 days, 25,994 public rows after excluding internal sources) and `mcp_usage_events`. Verify the method, the exclusion list, and reproduce the aggregates if possible.
- Chosen thresholds: anonymous 300, registered free 1,500, paid 5,000 hosted searches per client per UTC day; burst unchanged at 120 per minute. Direct exceedance: 8 of 1,382 client-days over 300, none over 1,500.
- Wiring: `supabase/functions/_shared/search-engine/rate-limit.ts` (policy constants, tier resolver, `enforceDailyAllowance`, fail-open on lookup errors) and the call site in `handle-search-request.ts` after account resolution, metering `auditContext.ip_hash || identity.ipHash`. Gated by `SEARCH_ENGINE_TIER_ENFORCEMENT`, default off. Verify: default-off behavior, 429 shape, and that nothing changes for current traffic. Not deployed.
- Client pass-through: `mcp/hosted-search-client.js` now attaches the 429 `details` payload to thrown errors.
- Recorded enforcement preconditions (in the artifact): free-key issuance live, two-ingress parity, honest copy, fresh-window revalidation, account-level aggregation, forwarded-hash trust hardening, unit alignment between docs and counter.

## 5. Public fair-use docs section (audit targets)

Added to the `docs-access-api-keys` page body in all 12 locale catalogs (`data/i18n/messages`, copied to `public/` and `mcp/public/`; `verify:i18n-catalogs` passes). English wording states the tiers as fair-use policy and describes the registered tier as available once self-service free keys launch. The 11 non-English translations need native-quality linguistic review; they were produced in one pass without a separate reviewer. Also decide: publish these numbers before enforcement exists, or hold the section until enforcement goes live. It is on main only and unreleased either way.

## 6. Founder beta validation runner (audit targets)

`scripts/run-founder-beta-validation.mjs`: manual trigger only, spawns `@supericons/mcp@beta` over stdio, runs about 70 English `search_icons` queries with telemetry on, prints outcomes for the owner quality pass. A quick pass recorded 15 `local_mcp` `0.4.19-beta.1` events, verified in `mcp_usage_events`. Window standing: 30 of 200 attempts, all from one client.

An open owner decision, recommended by an earlier independent review: replace the organic-count gate with functional evidence (labeled `internal_test`), founder quality evidence, and hosted canary evidence from the Railway local-first release. Until that is ratified, scripted runs count only as founder validation and must not be described as organic adoption.

## 7. Data findings the auditor should reverify

- Tool-level segmentation (hosted events, 30 days): `search_icons` zero rate 1.7%, p95 10.7 s; `recommend_icons` p50 42 s, p95 115 s. Recommendation latency is the worst current number and is not fixed by Railway local-first.
- Last 7 days: 448 distinct clients on package version 0.4.17 traffic reaching the gateway directly, 416 distinct clients via the hosted URL, and only 1 client (the owner) on the 0.4.19 beta. Country is recorded only where a trusted server observes the connection.
- Quality gaps already found by the quick pass: fuzzy brand queries ("ai browser company", "agent startup", "code editor with ai") return zero; "user profile" ranks account-balance icons first.

## 8. Known limitations to weigh during audit

- The measurement identity is the per-client hash; shared egress addresses share an allowance, and owner or agent traffic could not be fully separated from the 30-day distribution.
- Local package telemetry is best-effort and opt-out; totals are floors, not complete denominators.
- The smoke test covered English fully; localized pages were spot-checked only and need the localization audit noted in section 5.
