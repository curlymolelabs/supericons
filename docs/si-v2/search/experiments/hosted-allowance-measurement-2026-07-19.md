# Hosted allowance measurement and candidate thresholds

Date: 2026-07-19

Satisfies: `CP-07` in [`search-v2-completion-prd-2026-07-18.md`](../search-v2-completion-prd-2026-07-18.md), under decision [`D-028`](../decisions.md#d-028-public-local-core-and-tiered-hosted-allowances)

Status: measurement complete; candidate thresholds recorded below. Tier enforcement remains OFF until every `FR-43` readiness condition passes.

## Method

Read-only aggregation over `public.search_request_audit` for the trailing 30 days (2026-06-19 to 2026-07-19), 26,886 rows. Rows whose `source` is internal (`audit`, `verify`, `debug`, `manual-*`, `*internal-test*`, `gate-c-*`, `rollback-*`, `region-diagnostic-*`) were excluded, leaving 25,994 public rows (`web`, `local_web`, `mcp`, `mcp_beta`). Client identity is the stored `ip_hash` only; no raw identifiers were read or reproduced. A secondary read of `public.mcp_usage_events` (2,977 events) provided channel, client family, and registration flags.

## Measured distribution (public traffic only)

| measure | value |
| --- | --- |
| Total requests, 30 days | 25,994 |
| Distinct clients (ip_hash) | 870 |
| Client-days observed | 1,363 |
| Requests per client per day: p50 / p90 / p95 | 2 / 50 / 85 |
| Requests per client per day: p99 / p99.9 / max | 198 / 879 / 1,078 |
| Requests per client per minute: p99 / p99.9 / max | 62 / 82 / 123 |
| Top 1 / top 5 / top 10 client share of volume | 9.3% / 23.8% / 30.6% |
| Top 10 clients, average requests per day | 80.7 down to 9.2 |
| Zero-result rate | 25.2% |
| Error rate | 2.5% |
| Hosted latency ms: p50 / p95 / p99 | 1,335 / 8,516 / 36,544 |
| Source split | mcp 24,479; web 715; mcp_beta 626; local_web 174 |

Volume trend: daily volume grew from tens of requests in late June to a 1,800 to 3,400 range in the July 11 to 18 week.

`mcp_usage_events` confirms hosted MCP dominates current traffic (2,961 of 2,977 events) and that no registered or key-attributed public usage exists yet (`is_registered` false on all sampled public events), so anonymous behavior is the only measurable tier today.

## Cost basis

At roughly 26,000 hosted searches per month the marginal Supabase cost is negligible relative to the fixed project tier; no measured cost pressure exists at current volume. The allowance therefore exists for abuse and runaway-agent protection, not cost recovery, and the copy must not claim otherwise.

## Candidate thresholds

Calibration rule from `D-028`: the anonymous allowance targets at or above measured p99 so fewer than one in one hundred client-days ever meets the limit; the registered tier must fit every observed legitimate heavy client so registration is a real benefit, never a wall.

| tier | daily hosted search allowance | burst | basis |
| --- | --- | --- | --- |
| Anonymous (keyless) | 300 per client per day | keep existing 120 per minute | 1.5x measured public p99 (198); affects under 1% of observed client-days |
| Registered free (self-service key) | 1,500 per client per day | 120 per minute | covers measured p99.9 (879) and the observed maximum (1,078); every legitimate client observed in 30 days fits |
| Paid (Pro or pack key) | 5,000 per client per day, fair use | 120 per minute | headroom well above any observed behavior; labeled fair use with a contact path |

Reset: daily at 00:00 UTC. The limit response must state the reset time, a retry-after value, and the registration URL, and may promise only benefits that are live.

Local-first search in the npm package remains unlimited and keyless at every tier and is unaffected by these numbers.

## Enforcement preconditions (unchanged from `D-028` and `FR-43`)

1. Free-only registered users can generate and use keys that deliver the registered allowance without granting paid entitlements, proven by the two-layer gate (integration fixture plus one guarded live smoke on the dedicated `internal_test` account).
2. Railway and the Supabase gateway resolve tiers identically and pass the two-ingress behavior tests.
3. Limit-response copy promises only live benefits; no analytics claim before the dedupe fix and dashboard ship.
4. These thresholds are re-validated against a fresh 30-day window before enforcement is switched on, because current volume is growing quickly and the distribution may shift.

## Limits of this evidence

- `ip_hash` under-counts clients behind shared egress addresses and over-counts mobile or rotating addresses.
- Owner and agent traffic is present in the public rows and cannot be fully separated; the true organic p99 is therefore at or below the measured value, which makes the chosen thresholds conservative in the generous direction.
- Local package telemetry is best-effort and opt-out; nothing in this artifact treats it as a complete denominator.
