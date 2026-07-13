# Search v2 latency Gate A preparation verification

Date: 2026-07-13
Status: local preparation passed; external measurement awaits owner approval

## Verified artifacts

| artifact | verified state |
| --- | --- |
| Control commit | `ba7f7ea18`, old candidate RPC, no final SVG lookup |
| Treatment commit | `cacd283cb`, lightweight candidate RPC, final SVG lookup enabled |
| Commit difference | Only `supabase/functions/mcp-search-v2-beta/index.ts`, with three beta measurement flags changed |
| Migration | Version `20260713150000`, SHA-256 `8ad558920ae3565bd26fe3706a1ba8ef0e8c3b2ac9ddafce9f7b15e995ede42e` |
| Authorization manifest | SHA-256 `fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25` |
| Hosted runner | Owner-gated, hidden password prompt, hash-pinned, single transaction, exact history repair |

## Verification matrix

| scope | command | result |
| --- | --- | --- |
| Stage timing and payload estimate | `npm run verify:search-v2-stage-timing` | Passed |
| Complete hosted HTTP parity | `npm run verify:search-v2-hosted-http-parity` | Passed, five exact response cases |
| Lightweight RPC source parity | `npm run verify:search-v2-lightweight-candidates` | Passed |
| Guarded hosted runner | `npm run verify:search-v2-lightweight-hosted-runner` | Passed |
| PostgreSQL migration and checks | `npm run verify:search-v2-lightweight-candidates-smoke` | Passed in disposable PostgreSQL 17 |
| Final SVG hydration | `npm run verify:search-v2-result-hydration` | Passed |
| Fixed-suite parity | `npm run verify:search-v2-phase1-parity` | Passed, 225 cases |
| Evaluation structure | `npm run verify:semantic-search-v2` | Passed, 225 stable IDs |
| Ranking canaries | `npm run verify:search-ranking-policy` | Passed |
| Library modes | `npm run verify:search-library-modes` | Passed, 15 cases |
| Recommendation clarification | `npm run verify:recommend-icons-clarification` | Passed |
| Beta Gate A | `npm run verify:search-v2-beta-gate-a` | Passed for control and treatment commits |
| Provider-call boundary | `npm run verify:search-v2-deterministic-mcp-default` | Passed, zero provider calls |
| Deno type check | Shared handler, beta index, and HTTP parity script | Passed |

The broad `verify:hosted-search-engine` command retains the documented unrelated dirty-worktree synonym failure: the current taxonomy builder includes `server stack`, while the test expectation does not. None of the Gate A preparation files change that taxonomy path.

## Contract result

The local handler comparison proves exact equality for HTTP status, headers, and raw JSON bytes across:

- SVG result;
- null-SVG result;
- empty query;
- invalid library mode; and
- candidate lookup failure.

This is a controlled integration harness with injected rate-limit and database boundaries. It does not claim live network, Supabase gateway, or hosted database parity.

## External state

No hosted SQL, function deployment, npm publication, Netlify deployment, user invitation, or external model-provider call was performed during this preparation.

## Residual risk

- Live latency improvement is unverified.
- First-request behavior is unverified.
- Live candidate payload estimates and stage timing are unverified.
- Recommendation may remain above 3,000 ms because it still performs several serialized hosted searches.
- The hosted migration ledger remains incomplete for older migrations, so normal `db push` remains prohibited.

The authorization manifest and approval request bind the next external step to one migration, one isolated endpoint, two immutable commits, four deployments at most, matched search and recommendation samples, and endpoint deletion after measurement.
