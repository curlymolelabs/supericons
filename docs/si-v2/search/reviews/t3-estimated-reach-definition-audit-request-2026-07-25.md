# Audit request: T3 estimated-reach definition

Date: 2026-07-25
Requested by: planning session
Audit type: adversarial verification of a source-only investigation
Priority: blocks T1, and materially affects the current strategic read

## Why this audit is being requested

The T3 finding was produced by reading source code. **No production data was queried.** Every conclusion is therefore an inference about runtime behavior from static code, and the central claim is exactly the kind that can pass a code reading while being false in production.

This project has already been burned by that failure mode once. The 2026-07-22 zero-result audit found real defects only because someone went to the source rows instead of trusting the layer above. The recorded process lesson from the telemetry incident was that validation happened at the wrong level, and that internal parity can pass while the business outcome is wrong. This request exists to avoid repeating it.

**Please try to refute the central claim rather than confirm it.**

## The artifacts

| Document | Role |
| --- | --- |
| `docs/supericons-t3-estimated-reach-definition-2026-07-25.md` | The finding under audit |
| `docs/supericons-tactical-plan-2026-07-25.html` | Work queue; T3 marked complete, T1 next |
| `docs/supericons-t1-t3-success-states-2026-07-25.html` | Acceptance criteria for T1 to T3, and the funnel visual that this finding just resolved |
| `docs/supericons-strategy-canvas-and-level-up-plan-2026-07-25.md` | The strategic read that depends on this |
| `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md` | Downstream consumer of the same telemetry |
| `docs/admin-dashboard-refactor-spec-2026-07-16.md` | Prior specification of identity precedence and month-scoped returning clients |

## The central claim

> "Estimated reach 632" counts distinct estimated client identities. For hosted MCP, which is roughly 95% of searches, those identities are stable within a calendar month rather than per session. Reach is therefore a defensible client estimate, not a session count, and the roughly 4% registration rate is a real signal rather than a measurement artifact.

## Claims, each falsifiable, with where they were verified

| # | Claim | Verified at | Confidence |
| --- | --- | --- | --- |
| C1 | Identity resolves by first-available precedence: `user_id`, `api_key_hash`, `anonymous_client_hash`, `session_hash`, `ip_hash` | `lib/admin-dashboard-metrics.js:119-137` | High, read directly |
| C2 | Hosted `anonymous_client_hash` = SHA-256 of `clientIp\|userAgent\|clientFamily\|monthBucket\|supericons-hosted-mcp` | `mcp/remote-server.js:1367-1369` | High, read directly |
| C3 | Hosted rows in production actually carry a non-null `anonymous_client_hash`, so they land on rung 3 | **NOT VERIFIED** | **Inference only** |
| C4 | `monthBucket` rotates monthly | Variable name plus `docs/admin-dashboard-refactor-spec-2026-07-16.md:27` | Medium, derivation not read |
| C5 | Local npm identity rotates per process per day | `mcp/telemetry.js:27-32` | High, read directly |
| C6 | Empty header input yields null rather than a shared hash | `mcp/remote-server.js:1105-1108` | High, read directly |
| C7 | Rows without a recorded client key are excluded from the identity count rather than counted as unique | `supabase/functions/admin-api/index.ts:3412-3442` | Medium, one path traced |
| C8 | `returning_clients_within_month` exists and counts identities active on 2+ days in a month | `lib/admin-dashboard-metrics.js:423-437` | High, read directly |
| C9 | A 30-day window ending 2026-07-25 crosses the month boundary and double-counts anyone active either side | Derived from C2 and C4 | Medium, derived |

**C3 is the load-bearing claim and it is the weakest.** Everything strategic rests on it.

## Priority 1: the decisive production checks

These are read-only. C3 stands or falls on the first three.

**Q1. Do hosted rows actually populate `anonymous_client_hash`?**
Count hosted `mcp_usage_events` rows in a recent window grouped by whether `user_id`, `api_key_hash`, `anonymous_client_hash`, `session_hash`, and `ip_hash` are null. If `anonymous_client_hash` is largely null, C3 is false and identity is falling through to the session rung.

**Q2. Do identities repeat across days?** *(the killer test)*
For hosted rows in a single calendar month, count distinct `anonymous_client_hash` values and the number of distinct days each appears on. If nearly every hash appears on exactly one day, identity is effectively per-session or per-request regardless of what the derivation looks like, and the finding is wrong. If a meaningful share appear on multiple days, C3 holds.

**Q3. Does the count reconcile with the dashboard?**
Compute distinct identity keys using the C1 precedence over the same 30-day window the dashboard used, and compare to 632. A material gap means either the precedence is applied differently in the live path, or deduplication is doing something not accounted for here.

**Q4. Does identity survive across the month boundary?**
Check whether any `anonymous_client_hash` value appears in both June and July. If yes, C4 is wrong and the monthly rotation is not doing what the spec claims. If none do, C4 and C9 both hold.

**Q5. Is IP actually available on Railway?**
`client_ip_public` and `country_coverage_rate` exist in the metrics lib, and the dashboard reports 81% country coverage. If `clientIp` is empty or a proxy placeholder for a material share of hosted requests, the hash degrades to `userAgent + clientFamily + monthBucket`, which would collapse many distinct people into one identity and make 632 an undercount. Establish what fraction of hosted rows have a usable client IP.

## Priority 2: code paths not fully traced

**Q6.** `clientKey()` in `lib/admin-dashboard-v2.js:142` reads `_estimated_client_key`, `estimated_client_key`, or `client_key`. Confirm these cannot diverge such that the Overview card and the query workbench count different things.

**Q7.** `buildEstimatedClientIdentity` is called at three sites in `supabase/functions/admin-api/index.ts` (lines 762, 894, 1553) covering different source tables. Confirm all three feed the reach total consistently, and that dedupe by `dedupe_key` between `search_request_audit` and `mcp_usage_events` does not double-count or drop identities.

**Q8.** Read the actual `monthBucket` derivation in `mcp/remote-server.js` and confirm C4 directly rather than by name and spec.

**Q9.** Confirm `returning_clients_within_month` is actually reachable through the admin API response, so the claim that surfacing it is "display work only" is true rather than optimistic.

## What changes if the audit finds C3 false

This is not academic. Three things flip:

1. **The funnel diagnosis reverses.** If 632 counts sessions, true client count is lower, registration rate is higher than 4%, and the strategic advice changes from "fix conversion" to "go get traffic." The success-states page currently shows this alternative as ruled out; that would need reverting.
2. **T1's evidence weakens.** The probe hypothesis rests on one rare phrase showing six distinct client IDs. If IDs are session-scoped, six IDs could be one person across six sessions, which reclassifies that row from probe to internal test and changes the classification rule.
3. **The tactical plan's instrument panel is wrong.** It currently shows the reach metric as resolved and green.

## Requested output

For each claim C1 to C9: **confirmed**, **refuted**, or **unverifiable with available access**, with the evidence used. Please state explicitly which checks you could not run and why, rather than marking them confirmed by inference. Inference is what produced this finding and is exactly what needs independent checking.

Disagreement is more useful than agreement here. If the reasoning is sound but the conclusion is overstated relative to the evidence, say that too; the distinction between an integrity finding and a confidence-calibration finding matters.
