# Admin dashboard v2: round-2 fix report

- Date: 2026-07-17
- Source: owner walkthrough round 2 on live production data, plus independent live verification of the flagged rows.
- Status: ready for execution. Priority order is binding: P1 items are data-correctness defects and block everything else.

## Verified evidence motivating this report

1. Live get_icon probes against production for the exact IDs the dashboard shows as zeros: tabler:snowflake FOUND with valid SVG, tabler:cut FOUND, lucide:snowflake FOUND. Same-night dashboard rows for these lookups display Zero with 0 results.
2. Owner smoke tests through a real MCP client: search "snowflake" in lucide returned 4 results; in tabler returned 7 results. Dashboard 7-day rows for equivalent queries display Zero with 0 results.
3. Window contradiction: "map plan location nearby" displays Success with 5 results and country ES in the 24-hour view, and Zero with 0 results and country Unknown in the 7-day view. In the captured 7-day screenshot, every visible row reads Zero, 0 results, Unknown country.
4. Registered users panel with the 24h filter active lists only 2 users (both signed up that day, 0 searches); the database holds 23 registered users.
5. The All period renders Unavailable for every KPI and list with the message "exact client profiles exceed the bounded identity-row limit."
6. Chart typography (axis labels, legends, tick values) is too small to read comfortably; the owner flags the charts area specifically.

## P1: data correctness (fix first, in this order)

### 1. Aggregated-window explorer misread
- Symptom: evidence items 2 and 3. The 7d and 30d explorer paths, which read the per-query rollup tables, render healthy queries as Zero with 0 results and Unknown country.
- Required fix: derive the outcome for rollup-backed rows from the rollup's own semantics: a query with attempt_count > 0 and zero_count < attempt_count is not Zero; display Zero only when zero_count equals attempt_count for the window, mixed outcomes as their true mix (or a "N of M zero" presentation); result figures must come from the rollup's result columns, not defaults. Country is absent from the per-query rollup key by design: aggregate rows must show no country rather than an "Unknown" pill styled like data.
- Acceptance: the same query shows semantically consistent outcomes across 24h, 7d, 30d, and All; no healthy query renders as Zero in any window; a spot list of 10 queries verified against raw events matches in every window mode.

### 2. icon_lookup false zeros
- Symptom: evidence item 1. Successful exact-ID lookups are recorded or displayed with 0 results.
- Required fix: trace where the zero enters: either the Railway usage-event payload writes result_count 0 for successful get_icon calls, or the dashboard's outcome derivation misclassifies icon_lookup rows. Fix at the true source. Additionally, per the Phase A specification, icon_lookup rows belong in their own bucket and must never contribute to the headline true-zero KPI or render as Zero pills in default views.
- Acceptance: a fresh get_icon call observed end to end (live call, then its telemetry row, then its dashboard row) shows a successful lookup as successful; icon_lookup rows are excluded from zero-rate KPIs.

### 3. Strengthen the parity gate that missed both defects
- The release parity check passed while entire window modes misclassified outcomes, because it compared aggregate counts rather than row semantics.
- Required fix: extend the parity verification to sample individual rows and compare outcome, result count, and country presence between raw events and every window mode (24h, 7d, 30d, All), failing on any semantic mismatch.
- Acceptance: the strengthened gate fails against the current broken build and passes after fixes 1 and 2.

## P2: scoping and degradation

### 4. Registered users list scoping
- Symptom: evidence item 4.
- Required fix: the registered-users list always shows all users regardless of the global period (sorted by signup date or last active, newest first); the global period scopes only the activity columns (searches in window, last active highlighting, venues). The total user count displays on the panel.
- Acceptance: with any period selected including 24h, all 23 current users are listed with signup dates.

### 5. All-period graceful degradation
- Symptom: evidence item 5.
- Required fix: for unbounded periods, KPIs and charts fall back to rollup-derived figures with honest labels (client-day sums labeled "client-days", searches from rollups); the hard refusal with "choose a shorter range" applies only to the per-client profile list, which states that reason in its own panel.
- Acceptance: the All view renders every KPI and chart with labeled estimates; only the client-profile list shows the bounded-range notice.

## P3: presentation

### 6. Chart typography
- Symptom: evidence item 6; the owner locates the problem largely in the charts area.
- Required fix: increase SVG chart text sizes (axis tick labels, axis titles, legends, tooltip text) to a comfortable minimum of 12px equivalent at default zoom; sweep the rest of the dashboard for any text below 11px and raise it.
- Acceptance: owner confirms readability in round-3 walkthrough.

## Verification required before reporting done

1. The strengthened parity gate (fix 3) passes.
2. A live-versus-dashboard spot check matches: at least three fresh searches and two fresh lookups performed against production, then located in the dashboard with correct outcome, result count, and country in the 24h view, and consistent aggregation in 7d.
3. Existing suites still pass: Phase A metrics, dashboard contracts, browser acceptance.
4. Evidence and screenshots retained per the established pattern; production mutation limited to the admin-api deploy needed for whichever fixes land server-side, under the standard internal gates.

## Out of scope for this round

MRR price linkage, returned-icons web linkage, npm publication (handed off), any mcp-search or Railway change.
