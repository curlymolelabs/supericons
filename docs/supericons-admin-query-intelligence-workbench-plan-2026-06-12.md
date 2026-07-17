# Supericons Admin Query Intelligence Workbench Plan

Date: 2026-06-12

## Purpose

The admin dashboard should let an operator analyze search demand, query failures, and review backlog without being limited to a short top-list view. It should also produce clean exports that another agent or analyst can use to recommend Supericons updates, such as aliases, missing icons, ranking improvements, or review decisions.

## Current Verified Starting Point

The current admin dashboard already has an Icon Intelligence panel with:

- A search input for evidence filtering.
- A time-window filter.
- Zero-result and low-result query sections.
- A query review form with saved status and note.
- An evidence table.

The current backend search intelligence endpoint computes query intelligence but returns top lists that are sliced to 8 rows before the UI can inspect older or lower-ranked queries.

The current evidence table requests a small fixed result set from the frontend, so it is not enough for deeper analysis or export.

## Goals

1. Add a sortable, filterable query workbench for admin analysis.
2. Make older query records reachable through pagination.
3. Let the admin inspect one query in detail.
4. Export clean CSV and JSON analysis packs.
5. Keep review statuses and notes connected to the query workflow.
6. Verify the result with focused API, UI, and export checks.

## Non-Goals

- Do not expose the admin dashboard publicly without the existing admin gates.
- Do not add internal model names, prompt strategy, hidden confidence fields, or workflow metadata to public or shareable exports.
- Do not require a new database table unless the existing evidence and review tables cannot support the workbench.
- Do not log full user-sensitive search sessions in exports.

## Main User Flow

1. Open the admin Icon Intelligence panel.
2. Use the Query Explorer table to filter by time window, issue type, review status, library, purpose, and text.
3. Sort the table by severity or recency.
4. Open a query detail drawer.
5. Review attempts, result counts, surfaces, related evidence, and the current review note.
6. Mark the query as `needs_alias`, `needs_icon`, `resolved`, or `ignore`.
7. Export the current filtered view or selected query as CSV, JSON, or an agent analysis pack.

## Phase 1: Backend Query Queue API

Add:

```text
GET /intelligence/search/queue
```

Suggested query parameters:

```text
window=30d|90d|1y|all
page=1
page_size=25
q=boxing
issue_type=zero_result|low_result|replacement_heavy|successful|mcp
status=untriaged|needs_alias|needs_icon|resolved|ignore
library_filter=all|lucide|simpleicons|...
job_category=...
sort=zero_attempt_count|low_attempt_count|attempt_count|average_result_count|last_seen|first_seen|status|query
direction=asc|desc
```

Return shape:

```json
{
  "queries": [],
  "pagination": {
    "page": 1,
    "page_size": 25,
    "total": 0,
    "page_count": 1
  },
  "summary": {
    "total_queries": 0,
    "untriaged": 0,
    "needs_alias": 0,
    "needs_icon": 0,
    "resolved": 0,
    "ignore": 0
  },
  "filters": {},
  "sort": {
    "field": "zero_attempt_count",
    "direction": "desc"
  }
}
```

Each query row should include:

```text
query
library_filter
job_category
issue_types
attempt_count
zero_attempt_count
low_attempt_count
average_result_count
minimum_result_count
replacement_count
mcp_batch_count
first_seen
last_seen
review_status
review_note
review_updated_at
```

Implementation notes:

- Reuse the aggregation logic from the current search intelligence endpoint.
- Do not slice the queue to top 8 before applying filters and pagination.
- Fetch query review rows for the paginated result set and merge statuses into each query row.
- Treat empty review status as `untriaged`.
- Keep sorting deterministic by adding query text as a final tie-breaker.

## Phase 2: Query Detail API

Add:

```text
GET /intelligence/search/query-detail
```

Suggested query parameters:

```text
query=boxing%20ring
library_filter=all
job_category=
window=30d
```

Return:

```text
summary
result_count_history
recent_evidence_rows
related_replacements
related_copies
related_favorites
review
```

The detail response should support a drawer view that explains why the query matters. It should show:

- First seen and last seen.
- Total attempts.
- Zero-result attempts.
- Low-result attempts.
- Average and minimum result count.
- Library filter and purpose context.
- Recent raw evidence rows.
- Existing review status and note.

## Phase 3: Export API

Add:

```text
GET /intelligence/search/export
```

Suggested query parameters:

```text
format=csv|json|agent_pack
window=30d
issue_type=zero_result
status=untriaged
sort=zero_attempt_count
direction=desc
```

CSV export:

- One row per query context.
- Include only flat fields.
- Use clear column names.
- Preserve the same filters and sort as the current view.

JSON export:

```json
{
  "exported_at": "2026-06-12T00:00:00.000Z",
  "window": "30d",
  "filters": {},
  "sort": {},
  "summary": {},
  "queries": []
}
```

Agent analysis pack:

```text
summary.md
queries.json
evidence_sample.json
export_manifest.json
```

The agent pack should be organized so a separate analysis pass can recommend:

- Alias additions.
- Missing icon backlog candidates.
- Search ranking review candidates.
- Queries to ignore.
- Queries that look resolved.

## Phase 4: Frontend Query Explorer

Add a Query Explorer area to the existing Icon Intelligence panel.

Controls:

- Search.
- Time window.
- Issue type.
- Review status.
- Library.
- Purpose.
- Sort field.
- Sort direction.
- Page size.
- Export current view.

Table columns:

- Query.
- Issue type.
- Review status.
- Attempts.
- Zero attempts.
- Low attempts.
- Average results.
- Minimum results.
- Library.
- Purpose.
- Last seen.
- Actions.

Actions:

- Open detail.
- Set status.
- Add or edit note.
- Copy query.
- Export selected query.

The existing zero-result and low-result cards can remain as summary widgets, but the table should become the main analysis surface.

## Phase 5: Query Detail Drawer

Clicking a query row should open a right-side drawer.

Drawer sections:

- Query summary.
- Result count history.
- Recent evidence.
- Contexts: library, purpose, surface.
- Review status and note.
- Suggested next action.
- Export this query.

Suggested next action can be rule-based:

- Repeated zero-result query: likely `needs_icon` or `needs_alias`.
- Repeated low-result query: likely `needs_alias` or ranking review.
- Replacement-heavy query: likely ranking review.
- Reviewed and quiet recently: likely `resolved`.

## Phase 6: Evidence Table Improvement

Update the evidence endpoint and table so filtering happens before limiting, then add pagination.

Needed behavior:

- Evidence search should find older matching rows.
- Evidence pagination should support browsing beyond the first small batch.
- Evidence filters should stay in sync with the selected query when a query detail drawer is opened.

## Phase 7: Verification

Backend checks:

- Queue endpoint returns paginated rows.
- Filters work individually and together.
- Sorting works for all supported fields.
- Review statuses merge correctly.
- Export endpoint returns valid CSV and JSON.
- Query detail endpoint returns only the requested query context.

Frontend checks:

- Query Explorer renders empty, loading, error, and populated states.
- Filters update the table.
- Sorting changes row order.
- Pagination reaches older queries.
- Drawer opens from a row and shows matching detail.
- Review status save updates the row and drawer.
- Export buttons download or copy the expected output.

Browser checks:

- Open the admin dashboard locally.
- Verify no table text overlaps at desktop width.
- Verify the table remains usable on narrower screens.
- Verify keyboard focus works for filters, table actions, drawer close, and export buttons.

Suggested command checks:

```text
npm run build:admin-html
npm run build
```

Use narrower focused checks first if a full build is slow, but do not claim completion without reporting exactly which checks passed.

## Rollout Plan

1. Build the backend queue endpoint first.
2. Add frontend table consuming the queue endpoint.
3. Add detail drawer and detail endpoint.
4. Add export endpoint and export buttons.
5. Improve evidence pagination.
6. Run verification.
7. Audit the dashboard manually.
8. Refine UI, edge states, and export shape.
9. Repeat execute, audit, refine/debug until the dashboard is ready.

## Completion Criteria

The revised admin dashboard is complete when an admin can:

- Filter to untriaged zero-result queries.
- Sort by highest zero-result attempts.
- Page into older queries.
- Open a query detail drawer.
- Inspect recent evidence for that query.
- Mark the query as needs alias, needs icon, resolved, or ignore.
- Export the current filtered view as clean CSV and JSON.
- Produce an agent-ready analysis pack.

## Execution Goal Prompt

Use this prompt to execute the plan end to end:

```text
You are working in the Supericons repository at D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons.

Goal: Revise the admin Icon Intelligence dashboard into a Query Intelligence Workbench that supports sorting, filtering, pagination, query detail drill-down, saved query review, and clean exports for agent or analyst review.

Read and follow docs/supericons-admin-query-intelligence-workbench-plan-2026-06-12.md. Also follow the repository AGENTS.md instructions, especially public-safe output and evidence-first truthfulness.

Work in iterative loops:

1. Audit the current admin UI, admin API, data shape, and available tests.
2. Implement the smallest useful slice.
3. Run focused checks.
4. Open the dashboard locally when UI behavior changes and inspect it.
5. Record what was verified and what still needs refinement.
6. Refine or debug the next slice.
7. Repeat until the completion criteria in the plan are met.

Required feature outcomes:

- Add a paginated Query Explorer table.
- Add filters for time window, issue type, review status, library, purpose, and text search.
- Add sorting by severity, result count, recency, status, and query.
- Add a query detail drawer.
- Preserve and improve saved query review status and notes.
- Add CSV export for the current filtered view.
- Add JSON export for the current filtered view.
- Add an agent analysis pack export with summary, query rows, evidence sample, and manifest.
- Improve evidence search and pagination so older matching evidence can be reached.

Verification expectations:

- Verify backend endpoint behavior with focused tests or scripts.
- Verify frontend state and rendering with local checks.
- Run the strongest practical build or validation commands available in the repo.
- Use browser validation for visible admin dashboard changes.
- Do not claim done unless the final exported files, API payloads, and UI behavior have been directly checked in the current turn.

Constraints:

- Do not revert unrelated dirty worktree changes.
- Keep edits scoped to admin dashboard, admin API, tests, and plan-related docs unless evidence shows another file is required.
- Keep all shareable exports public-safe.
- Do not include internal model names, hidden review workflow fields, prompt strategy, or private confidence metadata in product artifacts or exports.
- If live admin credentials are unavailable, verify with local mocks, unit-style scripts, or deterministic fixture data and clearly state what was not live-tested.

Continue executing, auditing, refining, and debugging until the revised admin dashboard satisfies the completion criteria or a genuine blocker requires user input.
```
