# Web Country and Interface Language Telemetry Plan

Status: accepted implementation plan
Date: 2026-07-26

## Goal

Show reliable country data for Web searches and record the effective Supericons interface language, without changing search results, ranking, MCP behavior, allowances, or product channel counts.

## Verified baseline

The default dashboard scope contains 76 production Web final outcomes:

- 74 link by exact `episode_id` to a Web audit row with a country.
- 2 have no exact audit-row match.
- 0 linked episodes contain conflicting country values.
- 76 of 76 final outcomes report that a public IP was seen.
- 0 final outcomes currently contain a country.
- 2 final outcomes contain query locale.
- 0 final outcomes contain interface language.

Across production and controlled tests, 81 of 87 Web final outcomes link to a country. The lower combined rate is caused by four old controlled probes and two old production rows without exact links.

## Decisions

1. Copy country only from `search_request_audit` rows with the same exact `episode_id`.
2. Require the audit row to use channel `web` and the same environment as the final outcome.
3. If several audit attempts share an episode, use the country only when all non-null country values agree.
4. Preserve the audit row's existing `geo_source`.
5. Never join by query text, timestamp, searcher hash, or proximity.
6. Leave unmatched or conflicting episodes with a null country.
7. Backfill exact historical matches. This copies recorded evidence and does not infer history.
8. Keep query `locale` unchanged.
9. Add nullable `interface_locale` for the effective website language.
10. Keep raw IP out of storage, logs, exports, and evidence.

## Scope

### Included

- Web final outcomes
- Exact country linkage from the existing Railway audit record
- Exact historical country backfill
- Effective interface language in Web telemetry
- Additive schema migration
- Admin API, Request log, Search summary, and Audit bundle
- Focused tests, browser verification, rollout, and rollback evidence

### Excluded

- A new GeoIP resolver
- MaxMind or country-database changes
- External geolocation services
- Query-and-time matching
- Hosted MCP or Local MCP behavior
- Search retrieval, ranking, synonyms, results, or result order
- Recommendation behavior
- Allowance accounting
- Raw IP storage
- User Requests data from `icon_evidence`
- A new main-table column

## Data contract

| Field | Meaning | Source |
|---|---|---|
| `country_code` | Estimated country for the Web request | Exact linked Web audit rows |
| `geo_source` | Existing resolver that produced the country | Exact linked Web audit rows |
| `client_ip_public` | Whether the Web telemetry function saw a public IP | Existing Web telemetry identity logic |
| `locale` | Query language inferred by search | Existing query plan |
| `interface_locale` | Effective language shown by the website | Browser `activeLocale` |

Country and both language fields remain separate.

## Rollback plan

Write rollback controls before implementation:

1. Restore the previous website deployment if the payload change causes a browser regression.
2. Restore the previous Web telemetry function if final-outcome writes regress.
3. Restore the previous admin API if reads or exports regress.
4. Leave the nullable `interface_locale` column in place during an emergency rollback.
5. Keep copied country values because they are exact existing evidence. A rollback must not delete correct historical data.

## Implementation

### Stage 1: Country linkage

1. Add a server helper that reads Web audit rows using exact episode, channel, and environment.
2. Normalize valid two-letter countries.
3. Return a country only when every matching non-null value agrees.
4. Preserve a single agreed `geo_source`, otherwise leave the source null.
5. Treat query errors, missing rows, null countries, and conflicts as country unavailable.
6. Continue writing the final outcome even when country is unavailable.
7. Replace request-header country attribution for Web finals with exact audit linkage.
8. Add an idempotent historical backfill with the same identity and agreement rules.

The Railway audit write completes before the hosted Web response is returned. The browser sends the final telemetry event after receiving that response. New final outcomes should therefore find the audit row without a retry or trigger.

### Stage 2: Interface language

1. Add nullable `interface_locale text` to `search_final_outcomes`.
2. Add a length and normalized-locale format constraint.
3. Pass the current `activeLocale` into each Web search episode.
4. Send it as `interface_locale` on final and diagnostic telemetry payloads.
5. Normalize against the supported interface-locale list on the server.
6. Store it on final outcomes.
7. Store it in diagnostic metadata without adding another diagnostic-table column.
8. Keep old clients valid when the field is absent.

### Stage 3: Admin display and downloads

1. Keep the existing Country column.
2. Keep Language meaning query language.
3. Include Interface language in Request log and Audit bundle data.
4. Add aggregated interface locales to Search summary only when present.
5. Add coverage counts for country, query locale, and interface locale to Audit bundle metadata.
6. Keep controlled tests excluded by default.
7. Do not add another main-table column.

## Expected file inventory

- `main.js`
- `lib/web-search-episode.js`
- `supabase/functions/web-search-telemetry/index.ts`
- `supabase/functions/admin-api/index.ts`
- `public/admin-app.js`
- One additive migration and paired rollback
- Focused verification scripts
- One public-safe verification report

No MCP runtime, MCP package, search engine, ranking, or allowance file should change.

## Verification gates

### Country integrity

- One matching audit row copies its country and source.
- Multiple matching attempts with one country copy that country.
- Conflicting countries produce null.
- Missing audit rows produce null.
- Rows from another channel or environment cannot match.
- Browser-provided country fields are ignored.
- Exact backfill changes only eligible null Web finals.
- Backfill is idempotent.

### Interface-language integrity

- Supported interface locales are accepted.
- Unsupported or oversized values become null.
- Query `locale` remains unchanged.
- Old payloads without `interface_locale` remain valid.
- Final and diagnostic records retain the same interface language.

### Product non-regression

- Search v2 fingerprint is exactly unchanged.
- Fixed English and multilingual queries return the same ordered icon references.
- One Web search still produces one final outcome.
- Search rendering never waits for telemetry.
- Hosted MCP, Local MCP, recommendations, allowances, and channel totals remain unchanged.
- No new browser console error or warning appears.

### Dashboard and exports

- Default production totals remain unchanged after country backfill.
- Country appears for exact linked Web rows.
- Unlinked rows remain honestly unknown.
- Request log contains country, country source, query locale, and interface locale.
- Search summary totals reconcile with Request log.
- Audit bundle integrity and source reconciliation report passed.
- Controlled probes remain excluded when `include_test=false`.

## Deployment order

1. Run the country migration and function tests locally.
2. Deploy the idempotent country backfill migration.
3. Deploy Web telemetry country linkage.
4. Verify country in live final outcomes, dashboard, and downloads.
5. Deploy the additive interface-locale migration.
6. Deploy Web telemetry and website payload changes.
7. Deploy the admin API and verify both test-filter modes.
8. Run final browser and export checks.

## Completion

The work is complete only when exact linked country data appears in the existing dashboard and exports, new Web events record interface language separately from query language, all reconciliation checks pass, search behavior remains exact, and rollback points are recorded.
