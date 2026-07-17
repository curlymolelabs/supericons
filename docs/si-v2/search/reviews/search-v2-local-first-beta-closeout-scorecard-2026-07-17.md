# Search v2 local-first beta closeout scorecard

Status: active template, awaiting the first eligible user request
Package: `@supericons/mcp@0.4.19-beta.1`
Route: eligible English-like `search_icons` calls only

## Window state

| field | value |
| --- | --- |
| Published | 2026-07-17 |
| First eligible request | Not observed |
| Earliest evidence-based close | Not available until the first eligible request plus 3 complete days |
| Required organic eligible attempts | 200 |
| Session groups | Reported fact, not a closure gate |
| Daily monitors required | All completed monitors green, or every finding resolved and retained |

Organic task-driven use by the owner, executor, auditor, and external adopters counts when cohort-labeled. Scripted fixed-suite runs, smoke tests, monitors, and verification probes do not start the clock and do not count toward the sample.

A new beta package version starts a new evidence window. Fixing a finding does not remove or relabel the interval in which it occurred.

## Daily guardrails

| guardrail | limit | current result |
| --- | ---: | --- |
| Fixed-suite cases | 225 passing | Awaiting closeout rerun |
| Approved canary violations | 0 | Awaiting closeout rerun |
| Model-provider calls | 0 | 0 in released route verification |
| Beta request error rate | At most 1 percent | Awaiting user traffic |
| Local fixed-suite p95 | Below 500 ms | Passed before publication |
| Package size | Below 7 MB | 6,108,415 bytes |
| Added local memory | Below 75 MB RSS | Passed before publication |
| Required telemetry fields | At least 95 percent present | Awaiting user traffic |

First-process and reused-process latency must be reported separately when the available telemetry supports that distinction.

## Sample and adoption

| measure | result |
| --- | --- |
| Organic eligible attempts | Awaiting user traffic |
| Distinct session groups | Awaiting user traffic |
| Founder share | Awaiting user traffic |
| Agent share | Awaiting user traffic |
| External-adopter share | Awaiting user traffic |
| Completed days | 0 |
| Largest-session share | Awaiting user traffic |
| Largest anonymous-client share | Awaiting user traffic |
| Best available stable-user denominator | Awaiting measurement |
| Observed beta adoption rate | Awaiting measurement |

If stable traffic sources disagree, record the range and the known counting differences.

## Outcome measures

| measure | result |
| --- | --- |
| Reviewed useful-result rate | Awaiting review |
| Zero-result rate | Awaiting user traffic |
| Low-result rate | Awaiting user traffic |
| Results outcomes | Awaiting user traffic |
| Clarification outcomes | Awaiting user traffic |
| Zero outcomes | Awaiting user traffic |
| Error outcomes | Awaiting user traffic |
| Strict, prefer, and all mode coverage | Awaiting user traffic |

Clarification is a separate outcome and must never be counted as zero.

## Required review sample

Review at least 50 distinct query and library-mode combinations, or every distinct combination when fewer than 50 exist. Include all repeated zero clusters, all relevant clarification clusters, long-tail weak results, and a random sample of successful short and exact queries.

Allowed judgments:

- useful
- partly useful
- not useful
- needs clarification
- abuse, noise, or test traffic

Allowed gap types:

- metadata
- intent or rule
- relationship
- library behavior
- missing icon
- localization
- possible semantic gap

## Closeout decision

Select one only after the evidence window is complete:

1. Continue deterministic improvements and keep the beta opt-in.
2. Promote the deterministic path in a separately reviewed release.
3. Reconsider semantic retrieval only if the material-gap requirements are met.
4. Report the beta as underpowered and make no broad quality claim.

The closeout must state plainly that the evidence came from founder plus agent dogfooding and must describe external-user coverage without implying more adoption than was observed.

## Evidence still required

- first verified eligible request time
- daily monitor records
- final eligible attempt and session counts
- reviewed relevance sample
- fixed-suite closeout rerun
- stable-user denominator and adoption range
- final rollout or rollback decision
