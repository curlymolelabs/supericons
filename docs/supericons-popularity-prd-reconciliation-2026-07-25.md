# Popularity PRD reconciliation with D-039

Date: 2026-07-25
Status: Binding addendum. **Read with the PRD. Where they disagree, this document wins.**
Applies to: `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md`
Reason: the PRD was written before `D-039` was ratified. Its proposed scoring model contradicts the ratified decision in two places, and its channel promise cannot be met as written.

## Conflict 1: the scoring model counts things D-039 excludes

The PRD proposes three evidence classes and assigns points to all three:

| PRD signal | PRD points | Status under D-039 |
| --- | ---: | --- |
| Download | 5.0 | **Keep.** Confirmed take. |
| Copy, or successful exact `get_icon` | 4.0 | **Keep.** Confirmed take. |
| Favorite | 3.0 | **Open question, see below.** |
| Explicit preview or recommendation assignment | 1.0 | **Remove.** D-039: preview is not use. |
| Search result exposure | up to 0.20 | **Remove.** D-039: an appearance is not use. |

`D-039` states use is confirmed takes only, and that preview and search-result exposure are explicitly not use. The owner's stated reason is that an icon must never become popular by being shown.

**Instruction to the executor: build classes B and C as zero-weight.** Do not implement them with a small weight. Do not make the weight configurable and default it to nonzero. Exposure may still be *recorded* for demand analysis, but it must not enter the public popularity score.

The PRD's own note that weights are assumptions requiring calibration still holds for the surviving signals. Calibrate download against copy against fetch on a replay before activation.

## Conflict 2: local npm MCP cannot contribute at all

The PRD is titled cross-channel and promises web, hosted MCP, and local npm MCP.

Verified in source on 2026-07-25: `mcp/telemetry.js` exports exactly two logging functions, `logMcpSearchBatch` (line 57) and `logMcpSearchAttempt` (line 88). There is **no `get_icon` or fetch logging in the local npm client**. Local records search results returned, which is exposure, and search outcomes. Both are excluded by D-039.

**Therefore local npm MCP contributes zero confirmed-take signal and cannot appear in the ranking.**

Channel availability under D-039:

| Channel | Confirmed-take signal | Verified at |
| --- | --- | --- |
| Web | copy, download, favorite | `lib/icon-intelligence.js`, `main.js` |
| Hosted MCP | `get_icon` success | `mcp/remote-server.js:1972` via `withMcpUsageEvent` |
| Local npm MCP | **none exists** | `mcp/telemetry.js` has no fetch logger |

**Instruction to the executor: ship web plus hosted, and say so.** `D-040` already requires stating the represented population. That statement must now also disclose that local npm is not represented, rather than implying three channels were counted.

This is immaterial to the ranking itself: local accounts for 2 identities and about 20 searches in the audited window. It is material to the honesty of the claim.

**Separate follow-up, not part of this build:** add take-logging to the local npm client so a future version can include it. Track it, do not bundle it into this job.

## Open question for the owner

**Does a web favourite count as a take?**

`D-039` names copy, download, and fetch. It does not mention favourites, which the PRD scores at 3.0. This is a genuine gap in the decision rather than something an agent should resolve.

Arguments for counting it: favouriting is a deliberate act of choosing an icon and intending to reuse it, which is the same underlying meaning as a take. The existing April scoring already counted it.

Arguments against: a favourite keeps an icon for later rather than taking it now, and it is web-only, which slightly increases web weighting in a ranking already dominated by one population.

**Recommendation: count it, at a lower weight than copy and download.** It is a deliberate choice, not an impression, so it does not violate the principle D-039 was protecting. Awaiting owner confirmation. **Until confirmed, the executor should implement favourites behind a single named weight constant so the answer can be applied without a rebuild.**

## What is unchanged

Everything else in the PRD stands: no personalisation of the default order, no model calls in the computation, no raw IPs or credentials in the score, no hosted URL or tool-schema change, favourites and recent stay personal and separate, and stale data must be visible rather than silent.
