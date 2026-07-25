# Work handoff: three jobs, two agents

Date: 2026-07-25
From: coordinating session
Context you must read first: `docs/supericons-agent-briefing-2026-07-25.md`
Authority: `docs/si-v2/vision-charter.md`, `AGENTS.md`, decisions `D-039` to `D-043` in `docs/si-v2/search/decisions.md`

## Assignment

| Job | Assigned to | Surface | Start |
| --- | --- | --- | --- |
| 1. Traffic distribution query | **Auditor** | read-only telemetry | now |
| 2. Restore Demand Inbox | **Executor** | admin dashboard | now |
| 3. Cross-channel icon popularity | **Executor** | public grid + scoring | after Job 1 reports |

**Job 1 goes to the auditor**, not the executor. It is a read-only production measurement with no build step, the auditor already holds that access from the 2026-07-25 identity audit, and it needs precision rather than product judgment. Running it there lets the executor start Job 2 immediately instead of waiting.

**Jobs 1 and 2 run in parallel.** Different surfaces, no collision.

**Job 3 waits on Job 1.** Its result decides whether Job 3 needs a filtering step at all.

## Standing rules for all three

- **Evidence-first.** Do not claim a thing works unless you verified it against the exact artifact this session. Completion claims must carry their proof in the same report. No proof, no claim.
- **No em dashes or en dashes** in any output, including code comments, commit messages, and UI copy.
- **Branch discipline.** Separate branch or worktree per job. Scoped `git add <paths>` only, never `git add -A`. Leave the tree clean.
- **Do not reopen ratified decisions.** `D-039` to `D-043` are owner-ratified. If you believe one is wrong, stop and report; do not build a variant.
- **Plain language in anything user-visible.** Avoid insider terms in UI copy.
- **Read-only means read-only.** Job 1 must not write, migrate, or backfill anything.

---

## Job 1: measure the traffic distribution

**Goal.** Find out whether probe detection needs building at all. `D-041` gates the build on this measurement.

**Why this exists.** `classifyMcpTraffic` (`mcp/usage-event-detail.js:36`) already labels every hosted event, and the controlled-run marker it trusts is cryptographically verified via `verifyControlledRunHeaders` against `SUPERICONS_CONTROLLED_RUN_SECRET` (`mcp/remote-server.js:1351`). Signed test traffic may already be separated correctly, in which case building a detector is wasted work.

**Do this.**

1. Over the trusted window (2026-07-15 onward), report the count of search events grouped by `traffic_class` and by channel (hosted, web, local).
2. Report what share of live traffic sits in `unclassified_live`.
3. Confirm whether `traffic_class` is populated consistently, including on rows written before the field existed. If historical rows are null, say so and give the date it starts.
4. Resolve the open **153 collision**: the hosted-scoped calculation reports 153 identities active on 2+ days out of 629, while an older endpoint reports 153 out of 2,645. Determine whether these are the same figure, a coincidence, or an error. **Do not let anyone quote either number until this is answered.**

**Report back with.** The distribution table, the `unclassified_live` share, the historical coverage date, the 153 answer, and a one-line recommendation: build detection, or skip it.

**Do not.** Write any classification yet. Modify any row. Infer a conclusion the query did not produce.

---

## Job 2: restore the Demand Inbox

**Goal.** Bring back the demand view that lets the owner see what users searched for and could not find. `D-042`.

**Why it went missing.** It was deleted unintentionally on 2026-07-17 in commit `5f84df33a` ("Build admin dashboard v2 interface"), which removed 6,861 lines and rewrote the admin surface. No product decision retired it. Its value is demonstrated: a user request surfaced here led to the shipped Cybertruck icons.

**Recovery source.** `5f84df33a^`. Known reference points in that tree:

- `admin.html:2252` — "Search demand details"
- `public/admin-app.js:750` — Search Demand meta with environment filter
- `public/admin-app.js:771` — "Agent demand" label
- `public/admin-app.js:817` — zero-result, feedback, and MCP demand watch copy

**Do this.**

1. Read the prior implementation and extract **what it did**: which queries it ran, which signals it surfaced, and which triage actions it offered. The 2026-07-04 PRD (`docs/supericons-admin-user-intelligence-dashboard-prd-2026-07-04.md`) lists the intended actions: add-icon, add-alias, improve-ranking, improve-docs, watch, ignore, resolved.
2. Rebuild that capability inside the **current v2 dashboard idiom**. Do not paste the old markup back; the surrounding interface changed underneath it.
3. Read from the current V2 telemetry path, not the older contaminated endpoint. The old endpoint mixes in controlled local activity (it reports 5,235 searches and 2,645 identities against a true window of 1,773 and 644).
4. Respect the existing test-traffic filter so demand is not inflated by controlled runs.

**Done when.** The owner can see failed and weak searches with query, channel, language, country, and result count, and can mark a triage action against each. Verified by loading the dashboard and reading real rows, not by reasoning about the code.

**Do not.** Restore anything that writes to canonical records automatically. Human promotion stays manual per `VC-5`.

---

## Job 3: cross-channel icon popularity

**Goal.** Rank the public All Icons grid by recent real use. Spec: `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md`, **read together with the binding addendum `docs/supericons-popularity-prd-reconciliation-2026-07-25.md`. Where the PRD and the addendum disagree, the addendum wins.**

The PRD predates decision `D-039` and its scoring table contradicts it in two places. Two things you must know before reading the PRD: its preview and search-exposure weights are to be built as **zero**, not small; and **local npm MCP contributes nothing**, because `mcp/telemetry.js` has no fetch logging, so this ships as web plus hosted and must say so.

**Live defect being fixed.** `icon_scores` holds 162 rows against 21,000+ icons, every row stamped `2026-04-18`. The public grid currently orders by a three-month-old snapshot, and nothing on the page discloses it.

**Build to these ratified decisions. They are not open.**

**`D-039` What counts as use.** Confirmed takes only: copy, download, fetch. **Preview is not use. A search-result appearance is not use.** An icon must never become popular by being shown.

**`D-039` The unevidenced tail.** Only a minority of icons will have any evidence. Order those with evidence by use. Order **everything else alphabetically, grouped by library**. Render a **visible divider** in the grid at the point where evidence-backed ranking stops. Never let an unevidenced icon occupy a rank position as if it had been measured.

**`D-040` State the population.** 96.5% of hosted identities arrive through one client, so "most used" currently means "most used by ChatGPT users." The interface must say what population the ranking represents. Presenting it as universal popularity breaches `VC-6`.

**Also required.**

- **Freshness must be visible and must fail loudly.** The April failure hid for three months because nothing on screen showed when scores were last computed. Show the computation time in the interface, and make a stale or failed refresh detectable rather than silent. This is a first-class requirement, not polish.
- **Read the organic stream.** Exclude controlled test, preview, and probe. Exclude unknown by default. If Job 1 concluded that existing labelling suffices, filter on that and say so; do not invent a second mechanism.
- **Global ordering only.** Do not personalise the default order by user, account, country, or client. Favourites and Recent stay personal and separate.
- **No model calls** in the popularity computation.
- **No raw IPs, authorization headers, or API keys** in the score or any derived artifact.
- **No hosted MCP URL change, tool-schema change, or ChatGPT app resubmission.**

**Done when.**

1. All Icons orders by recent organic evidence across the three channels.
2. The active sort and the data freshness are visible on the page.
3. The evidence boundary is visibly marked and the tail is alphabetical by library.
4. The represented population is stated.
5. A stale or failed refresh surfaces rather than passing silently.
6. Verified by loading the live page and reading the rendered order, not by inspecting the scoring code alone.

---

## Reporting back

For each job, report: what you did, the exact evidence that proves it (file, query output, or rendered page), what you could not verify and why, and anything you found that contradicts this document. A contradiction is more valuable than a confirmation; say so plainly rather than working around it.

If a ratified decision turns out to be unbuildable as written, stop and report rather than substituting your own answer.
