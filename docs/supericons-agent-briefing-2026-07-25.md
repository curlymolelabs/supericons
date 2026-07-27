# Agent briefing: current state and open work

Date: 2026-07-25
Audience: executor and auditor agents. Dense by design.
Owner-facing equivalent: `docs/supericons-decisions-2026-07-25.html`

## Verified state

Production audited at cutoff 2026-07-25 11:30 UTC. Live V2 API reconciled exactly with direct database calculation.

| Measure | Value |
| --- | --- |
| Searches (30d) | 1,773 |
| Estimated identities | 644 (hosted 629, web 13, local 2) |
| Missing identities | 0 |
| Hosted `anonymous_client_hash` populated | 1,685 of 1,685 |
| Public IP confirmed | 1,427 of 1,685 (84.7%) |
| Identities on multiple days | 153 |
| Identities with multiple requests | 305 |
| Distinct user agents behind 629 hosted identities | 12 |
| ChatGPT share of hosted identities | 607 of 629 (96.5%) |
| Accounts (all time / in window / linked to a search) | 27 / 23 / 2 |
| Trusted telemetry begins | 2026-07-15 |

## Identity: settled

`buildEstimatedClientIdentity` (`lib/admin-dashboard-metrics.js:119`) resolves first-available: `user_id`, `api_key_hash`, `anonymous_client_hash`, `session_hash`, `ip_hash`.

Hosted lands on rung 3. `mcp/remote-server.js:1367` hashes `clientIp | userAgent | clientFamily | monthBucket | supericons-hosted-mcp`. No per-request component, so identity is month-stable. Local npm lands on rung 4 and rotates per process per day, but is 2 identities.

**Read it as clients or network configurations, never people.** Twelve user agents produced 629 identities, so distinguishing power is essentially IP.

## Withdrawn claims, do not reuse

1. **"4% registration rate."** 27 all-time accounts over 632 window identities compares two populations across two spans. Only 2 identities are account-linked. Conversion is unmeasurable until rung 1.
2. **"Empty IP nulls the anonymous hash."** `hashUsageValue` nulls on empty input, but the anonymous hash uses a template string that is never empty.
3. **"30d window double-counts across months."** True mechanically, but trusted data starts 2026-07-15, so no June identities exist. Becomes live after August begins.
4. **"Returning clients is display-only work."** V2 Overview API does not expose `returning_clients_within_month`. The old endpoint includes untrusted local activity (5,235 searches, 2,645 identities). Needs computing and exposing through the V2 final-outcome path.

## T1: traffic classification

Full spec: `docs/supericons-t1-traffic-classification-rules-2026-07-25.md`

**Already exists, do not rebuild.** `classifyMcpTraffic` (`mcp/usage-event-detail.js:36`) returns `controlled_test`, `preview`, `local`, `named_cohort`, `unclassified_live`, `unclassified`. The controlled-run marker is cryptographically verified via `verifyControlledRunHeaders` against `SUPERICONS_CONTROLLED_RUN_SECRET` (`mcp/remote-server.js:1351`).

**Step 0 is complete. Measured 2026-07-25 at cutoff 13:15:35Z.**

| Channel | `controlled_test` | `unclassified_live` |
| --- | ---: | ---: |
| Hosted | 57 | 1,702 |
| Local | 22 | 20 |
| Web | 11 | 68 |
| Total | **90** | **1,790** |

All other classes are zero. Signed labelling separated 90 controlled events; everything else in production sits in one bucket.

**Correction to an earlier claim in this briefing.** `traffic_class` is *not* populated on all historical rows. Of 1,759 hosted `mcp_usage_events` rows, 1,176 have no stored class. Stored classification begins **2026-07-22T14:41:57Z** for hosted, not 2026-07-15. `search_final_outcomes` rows are fully classified but only begin 2026-07-23 (hosted 18:24Z, web 18:27Z, local 18:37Z). Earlier rows can be replayed through the current fallback, but a replayed `unclassified_live` is not evidence of organic origin, only the absence of a surviving marker.

**Local raw metadata remains inconsistent** (most recent missing class 2026-07-24T19:11Z). Local final outcomes are complete, so **use `search_final_outcomes` as the authoritative local source**.

**Read `unclassified_live` correctly.** It is the designed default for live production traffic, not a classification failure. Every unmarked production event lands there by construction, so "100% of live traffic is unclassified_live" is tautological and is not by itself evidence that probe detection is required. What is unmeasured is how much of that bucket is non-organic.

**The 153 collision is resolved.** Both calculations share the same hosted population producing 153 returning identities out of 629. The old endpoint then adds 2,016 local identities, none returning, inflating the denominator to 2,645 while the numerator stays at 153. `153/629` is arithmetically correct for hosted. `153/2,645` is contaminated and must not be quoted. Neither may be called an organic return rate.

**Binding rules.** Signed markers are absolute and never overridden. Identity count alone classifies nothing (the original hypothesis that 6 fingerprints meant 6 users was disproved: that row had 4 IPs, 5 user agents, 4 client families, 3 countries in 4 hours). Behavioral signals are supporting evidence only, minimum two independent signals. Agent retries are not probes; over-filtering is worse than under-filtering. Preserve and report `unknown`. The rule ships as re-runnable code.

## T2: cross-channel popularity

PRD: `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md`

**Live defect:** `icon_scores` holds 162 rows all stamped 2026-04-18. The public All Icons grid currently orders by a three-month-old snapshot.

**Both gating decisions are now ratified. Build to these; do not reopen.**
- **Use = confirmed takes only** (copy, download, fetch). Preview and search-result exposure are explicitly not use. `D-039`.
- **Unevidenced tail is alphabetical grouped by library**, with a visible divider in the interface at the point where evidence-backed ranking stops. `D-039`.
- **State the population.** With 96.5% of identities on one client, "most used" means "most used by ChatGPT users." `D-040`.

**Reads the organic stream** once T1 lands: controlled test, preview, and probe excluded, unknown excluded by default.

## Demand Inbox restore (`D-042`)

Removed unintentionally on 2026-07-17 in commit `5f84df33a` ("Build admin dashboard v2 interface"), which deleted 6,861 lines and rewrote the admin surface. Not a product decision.

Prior implementation is recoverable at `5f84df33a^`. Known reference points in that tree: `admin.html:2252` ("Search demand details"), `public/admin-app.js:750` (Search Demand meta with environment filter), `:771` ("Agent demand" label), `:817` (zero-result, feedback, and MCP demand watch copy).

Restore into the v2 dashboard as its own scoped task. Do not attempt to re-import the old markup wholesale; the v2 interface is a different structure. Recover the data queries and the demand triage actions, render them in the v2 idiom. Its value is demonstrated: a user request surfaced here produced shipped Cybertruck icons.

Touches admin surfaces only, so it is safe to run in parallel with the public-grid popularity work. Use separate branches or worktrees per `AGENTS.md`.

## Open follow-ups

1. Clarify the 153 collision: hosted-scoped reports 153 multi-day over 629; the old endpoint reports 153 over 2,645. Identical numerators over fourfold denominators needs one query.
2. Expose `returning_clients_within_month` through the V2 final-outcome path.
3. Correct the reach card label. `docs/admin-dashboard-refactor-spec-2026-07-16.md:27` requires "estimated unique clients". Consider "estimated clients or networks" given the 12-user-agent finding.

## Standing constraints

- **Broad trust promises remain parked.** The owner decided on 2026-07-27 that the npm package must include a factual notice of the telemetry it sends and all four ways to disable it. The notice must match the released code.
- **Rung 1 hard constraint.** The dominant channel has no registration surface: a user inside ChatGPT has no browser session. If a key cannot be obtained and used from inside an agent conversation, registration stays flat regardless of offer quality.
- **Concentration outranks funnel work** on current evidence. 96.5% single-channel dependency is measured and does not rely on identity precision.
- Charter authority: `docs/si-v2/vision-charter.md`. Entry criteria, never dates.

## Communication convention

Owner-facing deliverables are HTML, visual, short sentences, plain words, with recommendations marked. Agent-facing deliverables are markdown and may be dense. Do not hand the owner a wall of prose; do not strip detail from agent briefings. See the "Owner-facing communication" section in `AGENTS.md`.
