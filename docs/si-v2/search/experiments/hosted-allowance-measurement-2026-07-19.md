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
| Registered free (self-service key; includes pack purchasers without Pro) | 1,500 per account per UTC day | 120 per minute | covers measured p99.9 (879) and the observed maximum (1,078); every legitimate client observed in 30 days fits |
| Pro (active subscription) | 5,000 per account per UTC day, fair use | 120 per minute | headroom well above any observed behavior; labeled fair use with a contact path; recurring hosted compute matches the recurring subscription |

Reset: daily at 00:00 UTC. The limit response must state the reset time and a retry-after value, and may promise only benefits that are live; the registration URL joins the response only once self-service free keys exist.

Local-first search in the npm package remains unlimited and keyless at every tier and is unaffected by these numbers.

## Enforcement preconditions (unchanged from `D-028` and `FR-43`)

1. Free-only registered users can generate and use keys that deliver the registered allowance without granting paid entitlements, proven by the two-layer gate (integration fixture plus one guarded live smoke on the dedicated `internal_test` account).
2. Railway and the Supabase gateway resolve tiers identically and pass the two-ingress behavior tests.
3. Limit-response copy promises only live benefits; no analytics claim before the dedupe fix and dashboard ship.
4. These thresholds are re-validated against a fresh 30-day window before enforcement is switched on, because current volume is growing quickly and the distribution may shift.
5. Registered allowances aggregate per account across all of that account's keys and clients, so multiple keys cannot multiply the limit.
6. The gateway trusts a forwarded per-client hash only from authenticated server ingresses; an anonymous caller must not be able to evade metering by supplying an arbitrary `ip_hash` in the request body.
7. The public docs unit and the enforcement counter unit are proven identical (searches versus tool calls) by a behavioral test that includes one `recommend_icons` call.
8. Quota consumption is made atomic or approximately race-safe. The current check counts existing audit rows and then inserts later, so concurrent requests near the limit can both pass; acceptable while dormant, not for enforcement.
9. The 429 response gains the registration or upgrade URL only when self-service free keys are live, so the message never advertises an unavailable benefit.
10. Every hosted search pipeline that bypasses the single-search handler (today: the shared recommendation pipeline, plus any future variant) calls the same allowance check; a route-coverage test enumerates the pipelines and fails when one is missing.

## Measurement grain and definitions

Added 2026-07-19 after independent review raised grain questions. These definitions bind the artifact and the dormant enforcement wiring.

1. One measured request is one row in `search_request_audit`, which is one hosted logical search executed by the gateway. It is not one user-initiated MCP tool call.
2. `recommend_icons` counts once per generated hosted search, so a single recommendation call consumes several units. Event-level data confirms the difference: the same window holds 1,209 `search_icons` tool events and 435 `recommend_icons` tool events against roughly 24,000 mcp-source audit rows.
3. Localized retry fallbacks issue additional hosted searches and are counted, not deduplicated.
4. The allowance period is the UTC calendar day; it resets at 00:00 UTC. It is not a rolling window or refill bucket.
5. The anonymous subject is the SHA-256 hash of the client IP, or the per-client hash a trusted server ingress (Railway) forwards. It rotates whenever the client IP changes.
6. Several users behind one shared egress IP share one anonymous allowance. Known limitation, accepted for launch.
7. Tier is resolved per account, but the counter subject is still the per-client hash. Account-wide aggregation across devices and keys is NOT implemented; without it a registered user with several clients receives the allowance per client. This is recorded as an enforcement precondition below.
8. The dataset includes both ingresses: Railway-forwarded traffic and direct gateway traffic both land in the audit table under the client hash.
9. Only hosted searches are measured and metered. `get_icon`, `preview_icons`, `preview_image`, and `list_libraries` are outside the daily allowance.
10. Direct exceedance counts, not inferred from percentiles: 8 of 1,382 public client-days (0.58%) exceeded 300; none exceeded 1,500 or 5,000. Snapshot note: the exceedance query ran later in the day than the distribution table above, so its trailing 30-day window contains 19 more client-days (1,382 versus 1,363). Both reads are correct for their instant; rerun `scripts/measure-hosted-allowance-distribution.mjs` for a single consistent snapshot before enforcement.

Because the unit is a hosted search rather than a tool call, any public copy must use the word "searches". The drafted public docs section is held out of the maintained sources until enforcement and free-key issuance are live (preserved in git history at commit `eb5d6878c`). An open product question remains whether to re-meter on user-initiated tool calls (simpler to explain) or keep search-grain metering with explicit fanout disclosure; either way the docs and the counter must use the same unit before enforcement is enabled.

Paid tier definition: the current tier resolver maps active Pro subscribers to `paid` (5,000) and all other registered accounts, including pack purchasers without Pro, to `registered_free` (1,500). A one-time pack purchase grants purchased content access, not the highest ongoing hosted compute tier. This is deliberate.

Failure mode: allowance lookup errors fail open. Metering exists for abuse protection; a metering outage must never remove search availability. The 120 per minute burst limiter and provider spend caps remain the backstop.

## Tool-level segmentation (hosted MCP events, same window)

| tool | events | zero rate | error rate | latency p50 ms | latency p95 ms |
| --- | --- | --- | --- | --- | --- |
| `search_icons` | 1,209 | 1.7% | 0.1% | 2,461 | 10,669 |
| `get_icon` | 1,323 | 0% | 0% | 1,731 | 5,804 |
| `recommend_icons` | 435 | 0.2% | 0% | 41,957 | 115,660 |
| `list_libraries` | 73 | 0% | 0% | 0 | 1 |
| `preview_icons` | 17 | 0% | 0% | 32 | 13,783 |
| `preview_image` | 27 | 0% | 0% | 6,275 | 12,335 |

The aggregate 25.2% zero-result rate and 8.5 second p95 in the distribution table above are search-row grain and are dominated by recommendation fanout searches. At tool-call grain, direct `search_icons` quality is far better (1.7% zero) and the dominant latency problem is `recommend_icons`. Railway local-first addresses eligible `search_icons` latency; it does not by itself fix recommendation latency, which needs its own measured change.

## Limits of this evidence

- `ip_hash` under-counts clients behind shared egress addresses and over-counts mobile or rotating addresses.
- Owner and agent traffic is present in the public rows and cannot be fully separated; the true organic p99 is therefore at or below the measured value, which makes the chosen thresholds conservative in the generous direction.
- Local package telemetry is best-effort and opt-out; nothing in this artifact treats it as a complete denominator.
