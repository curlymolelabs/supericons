# Search v2 deterministic MCP beta plan verification

Date: 2026-07-12
Environment: local workspace
Status: plan prepared; no deployment or publication performed

## Scope

Verified the measurement and rollback plan against the current search audit schema, hosted search handler, MCP usage payload, admin query analysis, package manifest, release constraints, and July 11 baseline.

## Evidence inspected

- `supabase/migrations/20260418_hosted_search_engine_schema.sql`
- `supabase/migrations/20260612_search_audit_geo_account_fields.sql`
- `supabase/migrations/20260704_mcp_usage_ledger.sql`
- `supabase/functions/_shared/search-engine/handle-search-request.ts`
- `supabase/functions/admin-api/index.ts`
- `mcp/hosted-search-client.js`
- `mcp/telemetry.js`
- `mcp/package.json`
- `supabase/config.toml`
- `references/verification/search-query-baseline-2026-07-11.md`
- `docs/si-v2/search/search-engine-v2.md`
- `docs/si-v2/search/implementation-status.md`

## Verified findings

- `search_request_audit` supports query, source, library filter, result count, status, latency, session grouping, locale, tool, client, request, deduplication, MCP version, geography, and account groupings.
- The hosted handler writes successful and error audit rows.
- The admin analysis defines low result as 1 to 3 results.
- The current audit schema does not record library mode, clarification versus zero outcome, or a confidence label.
- Existing MCP telemetry can be disabled and its icon-evidence events do not provide enough acceptance evidence for this beta.
- The July 11 baseline reports 4,007 of 4,045 detailed attempts on rows associated with hosted MCP. The source record warns that channel arrays overlap.
- `mcp/package.json` is version `0.4.17` and its publication setting is public. No prerelease version was created.
- `supabase/config.toml` does not define an isolated search v2 beta function.
- The search specification requires explicit owner approval before Supabase or Netlify deployment and npm publication.

## Release preflight observation

The shared deployment preflight script completed successfully as an inventory command. Its output was noisy because it included vendored `node_modules` and archived files. It found the root Netlify runtime file but did not prove release readiness or deployment state.

## Focused verification

The following commands passed in the current workspace:

- `npm run verify:search-v2-deterministic-mcp-default`
- `npm run verify:search-ranking-policy`
- `npm run verify:search-library-modes`
- `npm run verify:recommend-icons-clarification`
- `npm run verify:semantic-search-v2`
- `git diff --check` for the three scoped files
- punctuation scan for U+2013 and U+2014 in the three scoped files

The semantic-search verifier reported 225 evaluation cases, 225 stable IDs, 219 owner-reviewed cases, and 6 contract fixtures. An initial attempt to run `scripts/verify-search-v2-evaluation-gate.mjs` failed because that stale script name does not exist. The active evaluation gate is part of `scripts/verify-semantic-search-v2.mjs`, and that command passed.

## Verification limits

- No production environment was queried.
- No Supabase function was deployed.
- No npm package was published or tagged.
- No Netlify change was deployed.
- No provider credential was read and no model-provider call was made.
- No acceptance rate can be claimed from the current evidence.

## Result

The plan is grounded in fields that exist today, calls out the missing fields that block correct beta measurement, isolates the beta from the current npm `latest` path, and provides separate Supabase and npm rollback paths. External beta execution remains blocked on implementation, fresh verification, and explicit owner approval.
