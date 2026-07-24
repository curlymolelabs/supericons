# Admin Search Telemetry Final Verification

Status: `passed_after_repair`

Verified at: 2026-07-24 19:35 UTC

## Outcome

The admin dashboard now counts finished product searches separately from internal search attempts.

- Web totals come only from final browser outcomes.
- Hosted MCP and Local MCP totals come only from final tool outcomes.
- Direct gateway calls remain diagnostics and do not enter product totals or zero rates.
- Controlled test traffic is excluded by default and appears only when the test filter is enabled.
- Search Summary, Request Log, and Audit Bundle agree with one another.

## Defect and repair

Before this repair, Web-origin rows from `search_request_audit` were incorrectly presented as finished Web searches. This caused two audit checks to fail:

- `summary_request_count_matches_primary_events`
- `source_reconciliation_passes`

The failed live export contained:

| Measure | Before repair |
|---|---:|
| Search Summary rows | 177 |
| Product requests in Search Summary | 189 |
| Events treated as primary | 360 |
| Request Log rows | 129 |
| Rows treated as Web searches | 231 |
| Diagnostic rows | 344 |

The admin API now keeps every `search_request_audit` row in the diagnostic section. It links Web attempts only by exact episode or recovery-chain identity. A Web diagnostic without a final outcome is accepted only when it explicitly says `superseded` or `incomplete`. Generic or orphaned diagnostics still fail reconciliation.

After the repair, the same default product total remains 189. The incorrect primary-event count falls from 360 to 189. The 171 internal attempts move from product data to diagnostics:

| Measure | After repair |
|---|---:|
| Search Summary rows | 177 |
| Product requests in Search Summary | 189 |
| Events treated as primary | 189 |
| Request Log rows | 129 |
| Final Web search rows | 60 |
| Diagnostic rows | 515 |

This proves the repair changed classification and audit accounting, not product demand totals.

## Live download verification

All six authenticated downloads passed against admin API version 101.

### Test traffic excluded

- Product requests: 189
- Search Summary rows: 177
- Request Log rows: 129
- Final Web rows: 60
- Controlled probe rows in product data: 0
- Reconciliation: passed
- Pending rows: 0
- Unexplained rows: 0
- Structural integrity: passed
- Semantic integrity: passed

Diagnostic accounting:

- 243 raw attempts linked by exact episode identity.
- 165 direct gateway attempts were explicitly retained as unlinked gateway diagnostics.
- 1 browser diagnostic linked to its final episode.
- 106 browser episodes were explicitly classified as non-final.
- 129 MCP usage outcomes linked to final outcomes.

### Test traffic included

- Product requests: 217
- Search Summary rows: 193
- Request Log rows: 152
- Final Web rows: 65
- Controlled Web, Hosted MCP, and Local MCP finals: one each
- Direct gateway probes in diagnostics: one each
- Direct gateway probes in product data: zero
- Product channels: Web, Hosted MCP, Local MCP
- Reconciliation: passed
- Pending rows: 0
- Unexplained rows: 0
- Structural integrity: passed
- Semantic integrity: passed

The dashboard request metadata, visible test filter, and export metadata agreed in both modes.

## Five-probe gate

The production gate passed after the telemetry repairs:

1. Web search
2. Hosted MCP search
3. Published Local MCP search
4. Unsigned direct gateway search
5. Signed direct gateway search

All five response fingerprints matched their baselines, including ordered icon references and response fields. Hosted MCP latency improved from 5,098 ms to 3,612 ms in the fixed comparison. The two direct gateway probes produced diagnostics only.

The accepted controlled traffic classifier remains aligned across the runtime and database:

- `controlled-run:` prefix
- literal `:founder_controlled`
- literal `:controlled_`
- a cohort containing `:controlledX` does not match

## Production state

- Admin API: version 101, active, JWT gateway verification disabled as designed because the function checks the admin secret itself.
- Admin API source SHA-256: `afdaece60a63fa23e771f09f238fcb4e0c486c9311b5f64a893d987e0231fd36`
- Hosted MCP Railway deployment: `c8243baa-b790-421d-ace7-daff51732b30`, status `SUCCESS`
- Hosted MCP image SHA-256: `4cbe147d954fce9a5bfce1a7d2ecdfb365c038257b593d9513c58e2e94bb3c05`
- Hosted MCP health endpoint: HTTP 200
- Controlled Local MCP migration: `20260725090000`, present in the remote migration history

No website behavior, Search v2 ranking, search results, recommendation behavior, npm package, allowance rule, or product channel changed in the final admin repair.

## Rollback

- Admin API rollback: redeploy the captured version 100 bundle.
- Hosted MCP rollback: redeploy the Railway release immediately before `c8243baa-b790-421d-ace7-daff51732b30`.
- Database rollback: use `supabase/rollbacks/20260725090000_preserve_controlled_local_mcp_final_outcomes.down.sql`. Corrected historical controlled rows intentionally remain classified as test traffic.

## Evidence

- `references/verification/admin-search-gateway-reconciliation-final-20260724T191059Z.json`
- `references/verification/admin-search-downloads-live-final-20260725.json`
- `scripts/verify-admin-final-outcome-contract.ts`
- `scripts/verify-admin-search-downloads-live.mjs`
