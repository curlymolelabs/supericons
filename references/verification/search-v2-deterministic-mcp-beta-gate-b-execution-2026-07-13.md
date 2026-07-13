# Search v2 deterministic MCP beta Gate B execution

Date: 2026-07-13
Status: database stage complete; isolated function deployment and npm publication blocked on owner reauthentication

## Approved scope

Gate B approval covers only:

- `20260712_search_v2_beta_measurement.sql`;
- migration history repair for version `20260712` after successful SQL verification;
- isolated function `mcp-search-v2-beta`;
- `@supericons/mcp@0.4.18-beta.0` under the npm `beta` tag;
- cohort `deterministic-v2-beta`;
- production endpoint and npm `latest` left unchanged.

## Database execution

The guarded hosted runner completed these stages in order:

1. Read-only hosted preflight passed.
2. The exact approved migration applied.
3. Hosted postflight passed.
4. The valid audit-write check ran inside a transaction and rolled back.
5. Four invalid-input checks were rejected.
6. Hosted migration version `20260712` was marked applied.
7. The final migration list showed `20260712` locally and remotely.

The older hosted ledger entry and unmatched historical local migrations remain unchanged. Normal `db push` remains prohibited.

## Function deployment attempt

The isolated function deployment command stopped with `401 Unauthorized` while listing functions. No successful upload or deployment receipt was returned. The function is therefore treated as not deployed for this release until a new authenticated deployment succeeds and is verified.

## Package verification

Passed locally:

- Gate A contract
- deterministic default with zero external model-provider calls
- 225-case evaluation gate
- MCP public-safety scan across 38 packed files
- MCP package verification across 38 files
- npm package dry-run for `0.4.18-beta.0`

The dry-run reported 350,950 packed bytes, 2,396,680 unpacked bytes, and 38 files. No npm publication occurred.

## Authentication blockers

- Supabase management session: `401 Unauthorized`
- npm session: `npm whoami` returned `401 Unauthorized`

The owner must authenticate directly in the terminal. Access tokens, passwords, and one-time codes must not be sent through chat or written to the repository.

## External state

- Beta measurement schema deployed
- Hosted migration version `20260712` recorded as applied
- Isolated beta function not verified as deployed
- npm prerelease not published
- npm `latest` not changed by this execution
- Production `mcp-search` not changed by this execution
- No Netlify deployment
- No model-provider call
