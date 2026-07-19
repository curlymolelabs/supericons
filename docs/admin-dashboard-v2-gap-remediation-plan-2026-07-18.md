# Admin dashboard v2 gap remediation plan

- Date: 2026-07-18
- Status: completed
- Branch: `codex/admin-dashboard-v2-gap-repair`
- Design authority: `mockups/admin-dashboard-v2-mockup-2026-07-17.html`
- Product authority: `docs/admin-dashboard-v2-prd-2026-07-17.md`
- Correctness authority: `docs/admin-dashboard-v2-fix-round-2-2026-07-17.md`
- Completion evidence: `references/verification/admin-dashboard-v2-gap-remediation-2026-07-18.md`

## 1. Goal

Finish the admin dashboard as a truthful, fast, secure operator tool. Every verified gap must either be fixed and covered by a regression check, or remain visibly unavailable with a precise reason when the required source data does not exist.

This plan does not force MCP registration, publish npm, push a Git remote, change pricing, or invent data. MRR stays unavailable until a verified billing price source exists. The dashboard may explain that state, but it must not show a made-up currency value.

## 2. Verified baseline

The current dashboard passes its happy-path contract and browser suites, but the broader sweep reproduced defects that those suites do not cover:

1. Failed API requests leave a false "Up to date" freshness message and zero-valued KPIs.
2. A window change followed by failed requests can show stale data from the previous window as current.
3. Long query windows silently cap rollup rows and present partial query lists as complete.
4. `internal_test` rows can leak through production-only filters.
5. Local npm MCP calls are still attributed as Hosted MCP in the live data path.
6. The newest dashboard and local telemetry repairs live on separate branches.
7. Completed-window distinct client fields are client-day sums but render as people.
8. Low-result rates can look authoritative when only a small fraction of attempts are eligible.
9. Auth account rows discard telemetry enrichment already returned by the API.
10. Gap and icon-request lists are passive even though the PRD requires operator actions.
11. Exports cover only the currently fetched page, and the contact inbox has no export.
12. CSV cells do not neutralize spreadsheet formulas from user-supplied text.
13. Initial loading is unnecessarily sequential and interactive explorer changes reload unrelated panels.
14. API list caps and UI row choices disagree.
15. Required chart toggles, funnel sparklines, worklist links, and diagnostics access are incomplete.
16. Direct Vite mode stores the admin secret in browser session storage and lacks one documented managed start command.
17. Dialog, filter, period selector, and hidden-scroll regions have accessibility gaps. A stale legacy browser test and a flaky migration startup check reduce release confidence.

## 3. Repair order and acceptance

### Phase 1: truthful screen state

#### G01. Error states must not become zeros

Change:
- Preserve endpoint errors as explicit per-panel error states.
- Do not compute KPI values from missing payloads.
- Replace the global success freshness line with a truthful complete, partial, stale, or failed state.

Regression proof:
- A browser test forces every endpoint to return HTTP 500.
- Every affected panel states that data could not be loaded.
- No failed panel displays zero as a measured result.
- The freshness line does not say "Up to date."

#### G02. Window changes must not retain wrong-window data

Change:
- Bind cached and rendered payloads to the active filter key.
- Clear or mark previous-window data as stale while the new window loads.
- Never update the refresh timestamp when required requests fail.

Regression proof:
- Load a 30-day fixture, switch to 7 days, then fail all 7-day calls.
- The screen does not present 30-day values as 7-day values.

### Phase 2: data-contract correctness

#### G03. Long-window truncation must be complete or explicit

Change:
- Add stable pagination over rollup query rows so API aggregation is not limited to the first 10,000 source rows.
- Retain bounded pages and deadlines.
- If a deadline prevents complete aggregation, return an unavailable reason instead of partial rankings.
- Expose completeness metadata to the UI.

Regression proof:
- A fixture with more than 10,000 rollup rows returns the same totals and query groups across paged and unpaged reference calculations.
- The All period never shows a partial top list without a visible limitation.

#### G04. Test traffic must obey the toggle

Change:
- Exclude `internal_test` by channel as well as non-production environments when test traffic is off.
- Apply the rule consistently to activity, overview, search, audience, and exports.

Regression proof:
- Mixed production, preview, and `internal_test` fixtures return no test rows with the toggle off and return them with the toggle on.

#### G05. Local MCP attribution must reach the complete path

Change:
- Integrate the reviewed local telemetry source changes and additive correction migration.
- Keep hosted, local, web, CLI, API, and test channels distinct.
- Preserve the beta cohort as a separate field, not a venue.

Regression proof:
- Local stdio telemetry posts `local_mcp` with production environment.
- Hosted calls remain `hosted_mcp`.
- The migration corrects eligible historical rows and is repeatable.
- A fresh local MCP smoke search appears in the Local MCP dashboard venue.

#### G06. Consolidate the repair branches

Change:
- Keep dashboard and local telemetry changes on this single integration branch.
- Resolve conflicts against the approved dashboard PRD and Search v2 charter.

Regression proof:
- One clean revision contains both feature sets.
- Dashboard, MCP, and migration checks pass from that revision.

#### G07. Distinguish clients from client-days

Change:
- Keep exact distinct-client labels only where exact identities are available.
- Label completed rollup sums as client-days.
- Do not use client-day totals to rank or describe distinct people without a clear estimate label.

Regression proof:
- Raw-window fixtures render "clients."
- completed-window fixtures render "client-days."
- Cross-window output does not silently change the meaning of a column.

#### G08. Make low-result coverage visible

Change:
- Treat a zero eligible denominator as unavailable, not 0 percent.
- Show coverage next to the rate whenever eligibility is incomplete.
- Plot gaps in the quality series when a day has no eligible observations.

Regression proof:
- A low-coverage fixture shows its eligible fraction and warning.
- A zero-eligibility day does not plot a false 0 percent.

#### G09. Preserve registered-user enrichment

Change:
- Join auth accounts with the API's telemetry rows by stable user identity.
- Show signup timestamp, true last activity, searches in the selected window, venues, and country.
- Keep the list independent of the period while activity columns obey the period.

Regression proof:
- All account rows stay visible for every period.
- Matching telemetry populates activity fields.
- Unmatched accounts show a named no-activity reason rather than a misleading date.

### Phase 3: operator workflow completion

#### G10. Implement worklist and icon-request actions

Change:
- Add WHY triage and Alias, Add icon, Resolve, and Ignore controls to the gap worklist.
- Add New, Planned, Added, and Declined status controls to icon requests.
- Use the existing authenticated review-write boundary and refresh only the affected panels.
- Link Top zero queries to the corresponding worklist entry.

Regression proof:
- Authorized write fixtures persist each allowed transition.
- Invalid transitions and missing credentials fail safely.
- Read-only lists remain available if a write fails.

#### G11. Export the complete filtered set

Change:
- Add paged export endpoints or an export mode with bounded streaming for all lists.
- Make query, client, account, gap, request, activity, geography, top-list, diagnostics, and contact exports honor all active filters.
- Add both CSV and JSON where the UI offers both formats.

Regression proof:
- Export row counts match complete filtered totals, not the current UI page.
- Contact inbox includes export controls.
- A capped UI page and its full export intentionally have different row counts.

#### G12. Make CSV safe for spreadsheets

Change:
- Prefix cells beginning with `=`, `+`, `-`, or `@` so spreadsheets treat them as text.
- Apply the same rule to browser-generated and API-generated CSV.

Regression proof:
- User query, icon request, and contact fixtures containing formula prefixes export as inert text.

### Phase 4: speed, completeness, security, and accessibility

#### G13. Load panels independently

Change:
- Start activity, overview, search, audience, and account requests together.
- Add a bounded client timeout and per-panel abort handling.
- Refresh only the endpoint affected by explorer filters, pagination, or a write.
- Do not reload the all-account list when unrelated filters change.

Regression proof:
- A hanging activity request does not block other panels.
- Explorer changes do not call unrelated endpoints.
- Warm first content remains below the PRD target.

#### G14. Align row choices and API limits

Change:
- Support 25, 50, and 100 rows wherever the UI offers them, or remove unsupported choices.
- Keep page counts and totals honest at every list cap.

Regression proof:
- Each offered size returns that many rows when enough data exists.
- Pagination reaches the last row without duplicates or omissions.

#### G15. Finish the required visuals and links

Change:
- Add the Searches over time total and per-venue toggle.
- Render registered and Pro funnel sparklines.
- Add Top zero to worklist navigation.
- Provide usable raw diagnostics access.
- Explain current-day grouped result figures when they are minimums rather than exact totals.

Regression proof:
- Browser checks exercise each chart mode, link, and diagnostics action.
- Chart legends, axes, and values remain at least 12px at default zoom.

#### G16. Keep secrets out of browser storage

Change:
- Make the managed loopback gateway the documented and scripted default.
- Keep the admin secret only in the gateway process.
- Remove direct-mode secret persistence. If direct mode is used for development, require entry per session and keep it only in memory.
- Do not cache email-bearing account payloads in browser storage.

Regression proof:
- Browser storage contains neither the admin secret nor account payloads after a live managed session.
- One package command starts the managed dashboard and documents its URL.

#### G17. Close accessibility and test-harness gaps

Change:
- Give the credential prompt dialog semantics, labels, focus management, Escape handling, and focus restoration.
- Give global search a real accessible name.
- Expose selected period state with appropriate semantics.
- Make hidden-scroll regions keyboard reachable.
- Replace the stale legacy browser test with checks against the current three-section UI.
- Make disposable database startup wait for readiness before migration tests run.
- Add a screen-state matrix covering loading, empty, error, stale, partial, and ready states.

Regression proof:
- Automated browser checks cover keyboard operation and screen-state transitions.
- No actionable element lacks an accessible name.
- Migration verification passes from a cold disposable database start.

## 4. Expected file inventory

Likely changes are limited to:

- `public/admin-app.js`
- `admin.html`
- `style.css`
- `lib/admin-dashboard-v2.js`
- `supabase/functions/admin-api/index.ts`
- an additive migration under `supabase/migrations/`
- MCP telemetry source files already reviewed on `codex/local-mcp-telemetry-fix`
- dashboard and Search v2 verification scripts under `scripts/`
- `package.json`
- public-safe verification summaries under `references/verification/`

The inventory may narrow as each root cause is confirmed. Any new production surface outside this list requires its own evidence and rollback note before change.

## 5. Verification matrix

Before release:

1. Failing-first browser tests prove G01 and G02 against the pre-fix revision.
2. Dashboard helper, API contract, Phase A metric, cache, static, and browser suites pass.
3. Paged rollup, test-traffic, client-day, low-coverage, user-enrichment, write-action, full-export, and CSV-safety fixtures pass.
4. Local MCP attribution and Search v2 local-first checks pass.
5. Migration applies twice and its rollback or reversal steps are documented.
6. Managed live browser verification passes with no secret or account data in browser storage.
7. Live API checks meet existing latency limits and return truthful completeness metadata.
8. Fresh hosted and local searches appear in the correct venues with correct outcomes.
9. The final worktree is clean and every commit is scoped.

## 6. Release and rollback

- No Git remote push occurs as part of this plan.
- No npm publication occurs.
- Do not deploy `mcp-search`.
- The admin API may be deployed only after all local and database gates pass.
- The attribution migration may be applied only with a recorded backup query, bounded update count, post-check, and reversal SQL.
- If live verification fails, restore the previous active admin API revision. Reverse only the migration rows identified by the migration's explicit correction predicate.
- Keep the existing production dashboard available until the repaired build passes the managed real-data walkthrough.
