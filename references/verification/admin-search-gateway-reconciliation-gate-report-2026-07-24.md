# Admin search gateway reconciliation gate report

## Verdict

No-go for the conditional admin repair.

The query-free browser preflight passed. The five-probe gate then ran once. Four probes passed. The published Local MCP probe failed because its controlled-run label did not survive into the final-outcome row.

No production repair was attempted.

## Browser preflight

- Production route: `https://supericons.dev/?view=icons`
- Application visible: yes
- Search input visible: yes
- Search input remained empty: yes
- Visible Start searching action used: yes
- Hidden desktop toggle used: no
- Watched search or telemetry POST requests: 0

Evidence: `admin-search-gateway-query-free-preflight-20260724T153129Z.json`

## Five-probe result

The run started at `2026-07-24T15:32:57.967Z`. Its fixed data cutoff was `2026-07-24T15:35:27.974Z`, after the required 120-second reconciliation window.

| Probe | Result | Verified outcome |
|---|---|---|
| Production website | Passed | One controlled Web final, two linked Web diagnostics |
| Production Hosted MCP | Passed | One controlled Hosted MCP final, one usage row, one linked diagnostic |
| Published Local MCP | Failed | One Local MCP usage row and one Local MCP final existed, but the final was `unclassified_live` instead of `controlled_test` |
| Unsigned direct gateway | Passed | No product final, one unclassified gateway diagnostic |
| Signed direct gateway | Passed | No product final, one controlled gateway diagnostic |

The Local MCP search itself succeeded with six results through `local_first`. This is a telemetry classification failure, not a search-result failure.

## Exact Local MCP boundary

The Local MCP usage row retained `controlled-run:gateway_gate_64d62cfc` in `beta_cohort`.

The linked final row had:

- channel: `local_mcp`
- environment: `production`
- traffic class: `unclassified_live`
- final outcome: `success`
- result count: 6

Repository inspection explains the loss:

- `20260724100000_enable_stable_local_mcp_final_outcomes.sql` stores the Local MCP controlled label in `beta_cohort`.
- `20260724120000_repair_final_outcome_history_fields.sql` derives the final traffic class from `metadata.traffic_class` or `environment`.
- That final-outcome writer does not use `beta_cohort` when deciding whether a Local MCP row is controlled traffic.

This is a separate final-outcome writer defect. It is outside the current authorization.

## Confirmed admin accounting gap

Both direct gateway diagnostics existed in `search_request_audit`.

- Eligible direct gateway diagnostics: 2
- Visible through the current admin diagnostic rule: 0
- Unexplained source rows: 0
- Explained exclusions: 2

The current admin rule requires `episode_id`, so both valid direct gateway diagnostics disappear from its diagnostic view. This confirms the bounded admin accounting gap described by the handoff, but that repair must wait because the product-path gate failed first.

## Separate proposed task

Open a narrowly scoped telemetry-writer task to preserve verified Local MCP controlled traffic from `mcp_usage_events.beta_cohort` into `search_final_outcomes.traffic_class`.

The task should:

1. Change only the final-outcome classification boundary and its tests.
2. Treat a valid `controlled-run:` Local MCP cohort as `controlled_test`.
3. Leave missing or invalid markers as normal or unclassified traffic.
4. Verify one Local MCP usage row produces one controlled Local MCP final.
5. Rerun the five-probe gate once after that separate fix.

Do not change search behavior, results, allowances, the website, MCP search logic, npm packages, or the admin dashboard under that task.

## Evidence

- `admin-search-gateway-query-free-preflight-20260724T153129Z.json`
- `admin-search-gateway-reconciliation-before-20260724T153259Z.json`
