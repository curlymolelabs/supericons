# Search v2 completion PRD

Status: execution plan subordinate to [`search-engine-v2.md`](search-engine-v2.md)

Date: 2026-07-18

Decision basis: [`D-028`](decisions.md#d-028-public-local-core-and-tiered-hosted-allowances)

## Problem

Search v2 has a verified local-first prerelease, but the current hosted MCP service still sends ordinary non-Material searches to hosted search, and the web app still calls the hosted web search client before applying its fallback. [SOURCE: `implementation-status.md`; SOURCE: `mcp/remote-server.js`; SOURCE: `main.js`]

The existing search baseline also contains repeated zero-result and weak-result demand, especially in recommendation traffic. Speed work alone does not prove that the result set is good enough for the owner or users. [SOURCE: `search-engine-v2.md`, Problem statement]

The current hosted rate limiter is one IP-based allowance with a default of 120 requests per minute. It does not implement anonymous, registered-free, and paid tiers. [SOURCE: `supabase/functions/_shared/search-engine/rate-limit.ts`]

The public npm client sends best-effort search telemetry, including normalized queries and result evidence, but users can disable it and network failure does not block search. It is therefore useful evidence, not a complete usage denominator. [SOURCE: `mcp/telemetry.js`; SOURCE: `mcp/index.js`]

## Target user

### People and agents using hosted MCP

They need faster eligible searches without changing their MCP URL or losing hosted freshness, localized search, recommendations, and account features. [SOURCE: `search-engine-v2.md`, Target users and jobs; ASSUMPTION: hosted continuity is preferable to asking users to change venues]

### Developers using the npm package

They need fast local eligible search, a clear privacy and telemetry contract, stable hosted fallbacks, and predictable updates when the packaged snapshot changes. [SOURCE: `FR-40`; SOURCE: `FR-44`]

### People searching on the website

They need the same maintained meaning and ranking rules as MCP, with web-specific performance and interaction checks before any default change. [SOURCE: `G-03`; SOURCE: `NG-01`]

### Registered free and paid account holders

They need account identity to deliver real benefits: higher hosted allowances first, then accurate personal analytics when its data prerequisites are verified. [SOURCE: `D-028`; ASSUMPTION: a useful account offer will improve voluntary registration]

### Supericons operations

The business needs bounded hosted cost, honest demand evidence, reliable rollback, and clear separation between public snapshot data and private living intelligence. [SOURCE: `VC-3`; SOURCE: `FR-24`; SOURCE: `D-028`]

## Scope

1. Mine and fix confirmed search-quality gaps through maintained data and general ranking rules, with case-level fingerprint review. [SOURCE: `P7`; SOURCE: `D-013`; SOURCE: `FR-21`]
2. Route eligible English Railway `search_icons` requests through the packaged in-process index, with stable hosted fallback for local failure and existing hosted routing for ineligible requests. [SOURCE: `FR-40`; SOURCE: `mcp/remote-server.js`; ASSUMPTION: the local-first contract can be safely extended to the hosted entry]
3. Remeasure hosted search and recommendation on the current database tier before choosing the next recommendation architecture. [SOURCE: `FR-24`; SOURCE: `FR-35`; SOURCE: `OQ-01`]
4. Correct MCP access documentation, disclose best-effort local telemetry, and verify the advertised setup and preview path on each supported client. [SOURCE: `FR-14`; SOURCE: `FR-44`; ASSUMPTION: client-specific checks reduce setup and rendering failures]
5. Produce the hosted usage and cost distribution that sets anonymous, registered-free, and paid allowance thresholds. [SOURCE: `D-028`; SOURCE: `FR-43`]
6. Build self-service free key issuance, consistent two-ingress allowance enforcement, and an honest limit response, but keep enforcement disabled until every readiness condition passes. [SOURCE: `D-028`; SOURCE: `FR-43`]
7. Complete the founder validation window and use its evidence, client compatibility, quality, latency, and error results to decide promotion separately for each venue. [SOURCE: `docs/si-v2/search/reviews/search-v2-beta1-publication-approval-request-2026-07-17.md`; SOURCE: `FR-36`; ASSUMPTION: venue-specific promotion limits blast radius]

## Functional requirements

| ID | requirement | acceptance |
| --- | --- | --- |
| `CP-01` | Every confirmed quality defect receives a stable test case and the smallest maintained-data or general-policy correction. [SOURCE: `D-013`; SOURCE: `FR-21`] | The 225-case suite passes; every fingerprint change has a named case and reviewed cause; no query-specific patch is introduced without a recorded exception. [SOURCE: `search-engine-v2.md`, Change policy] |
| `CP-02` | Eligible Railway search uses the same packaged local-first engine and ordering contract as the verified npm route. [SOURCE: `FR-40`; ASSUMPTION: shared package execution is the lowest-risk hosted acceleration] | The fixed 150-case route suite matches ordered refs, eligible success makes zero Supabase search calls, and live hosted p95 meets a separately bound threshold. [SOURCE: `implementation-status.md`; SOURCE: `FR-24`] |
| `CP-03` | A local-route failure makes at most one stable hosted fallback request; ineligible, localized, non-ASCII, and recommendation requests retain their approved routes. [SOURCE: `FR-40`; SOURCE: `D-025`] | Failure injection proves one fallback maximum, no retry storm, preserved response shape, and unchanged ineligible routing. [SOURCE: `FR-24`; ASSUMPTION: one fallback is sufficient for availability] |
| `CP-04` | Hosted recommendation is measured with legal fixed workloads before another architecture change. [SOURCE: `FR-35`; SOURCE: `FR-37`] | Search and one-slot recommendation report cold and warm distributions, stage evidence, errors, and workload identity; recommendation meets the existing 3,000 ms experimental ceiling or triggers a separately reviewed change. [SOURCE: `docs/si-v2/search/reviews/search-v2-latency-gate-a-approval-request-2026-07-13.md`] |
| `CP-05` | Public MCP docs say that free local and anonymous hosted search start without an API key, explain when a key adds value, and disclose local telemetry fields and opt-out behavior. [SOURCE: `D-028`; SOURCE: `FR-44`] | A repository-wide claim sweep finds no contradictory key requirement; docs match the shipped environment flags and telemetry payload fields. [SOURCE: `mcp/telemetry.js`] |
| `CP-06` | Every advertised MCP client has a maintained setup location, configuration example, search check, and preview rendering result. [SOURCE: `FR-14`; ASSUMPTION: the advertised client list should be behaviorally supported] | The compatibility matrix records install, one search, one preview, and the observed preview form for each advertised client. [ASSUMPTION] |
| `CP-07` | The allowance measurement separates anonymous client, registered key, paid key, entry point, tool, traffic concentration, errors, and attributable hosted cost without exposing raw identifiers. [SOURCE: `G-08`; SOURCE: `D-028`] | A bounded measurement artifact reports the full distribution, measured p99, cost basis, coverage limits, and candidate thresholds; no threshold is selected before it exists. [SOURCE: `FR-43`] |
| `CP-08` | Self-service free keys deliver a higher hosted allowance before any signup prompt is enabled. [SOURCE: `D-028`] | Key creation, rotation, revocation, anonymous use, registered use, and paid use pass authorization and isolation tests. [ASSUMPTION: key lifecycle support is required for a trustworthy free tier] |
| `CP-09` | Railway and Supabase enforce one tier and response contract, controlled by a shared disabled-by-default policy. [SOURCE: `FR-43`] | Two-ingress tests prove equal tier resolution, allowance use, reset time, retry guidance, signup URL, and no analytics promise before analytics is live. [SOURCE: `D-028`] |
| `CP-10` | Promotion remains venue-specific and preserves rollback to the last verified release. [SOURCE: `FR-26`; SOURCE: `FR-36`] | Quality, compatibility, latency, error, package, public-boundary, and rollback gates pass for the exact bytes promoted on each venue. [SOURCE: `VC-3`; SOURCE: `VC-4`; SOURCE: `FR-24`] |

## Non-goals

- Do not require an API key before the first free local or hosted MCP search. [SOURCE: `D-028`]
- Do not add mandatory phoning home to local-first search for metering or enforcement. [SOURCE: `D-028`]
- Do not claim the public package is secret or impossible to copy. [SOURCE: `D-027`; SOURCE: `VC-4`]
- Do not ship usage-derived ranking weights, query-behavior signals, community curation, contributor reputation, or paid design intelligence in npm or web bundles. [SOURCE: `VC-3`; SOURCE: `FR-41`]
- Do not advertise personal analytics until deduplication and the account dashboard are verified. [SOURCE: `D-028`]
- Do not change npm `latest`, Railway, web defaults, or hosted allowance enforcement as one combined release. [SOURCE: `FR-26`; SOURCE: `FR-36`; ASSUMPTION: separate venue releases improve attribution and rollback]
- Do not resume per-request model or embedding-provider calls in the default free path. [SOURCE: `D-021`; SOURCE: `FR-31`]
- Do not put the longer ecosystem, marketplace, or payment roadmap in this completion dependency chain. [SOURCE: `docs/si-v2/vision-charter.md`; ASSUMPTION: completion should stay bounded]

## Success metrics

| metric | completion signal | basis |
| --- | --- | --- |
| Fixed-suite integrity | Zero unexplained fingerprint changes across all 225 cases. | [SOURCE: `FR-21`; SOURCE: `implementation-status.md`] |
| Owner quality | In a structured rerun, the owner judges the top three useful for the reviewed query set, with every miss recorded as a case. | [ASSUMPTION: taste quality needs owner judgment] |
| Local eligible latency | p95 stays below 500 ms on the bound local suite. | [SOURCE: `docs/si-v2/search/reviews/search-v2-beta1-publication-authorization-manifest-2026-07-17.json`] |
| Hosted eligible latency | The Railway local-first release meets a threshold bound before deployment and shows no error-rate regression. | [SOURCE: `FR-24`; SOURCE: `OQ-01`] |
| Recommendation latency | One-slot warm p95 is at or below 3,000 ms on the legal fixed workload. | [SOURCE: `docs/si-v2/search/reviews/search-v2-latency-gate-a-approval-request-2026-07-13.md`] |
| Validation evidence | At least 200 organic eligible attempts across at least three complete green days; session count and traffic concentration are reported, not used as gates. | [SOURCE: `docs/si-v2/search/reviews/search-v2-beta1-publication-approval-request-2026-07-17.md`] |
| Access readiness | Threshold artifact, self-service free keys, two-ingress parity, and live-benefit copy all pass before enforcement can be enabled. | [SOURCE: `FR-43`; SOURCE: `D-028`] |
| Telemetry honesty | Local coverage is labeled partial, opt-out works, telemetry failure never fails search, and public disclosure matches the shipped fields. | [SOURCE: `FR-44`; SOURCE: `mcp/telemetry.js`] |
| Protected boundary | VC-3 and VC-4 package and web probes pass for each released artifact. | [SOURCE: `FR-41`; SOURCE: `FR-42`] |

## Dependency order

1. Start quality mining, documentation correction, hosted allowance measurement design, and Railway local-first implementation in parallel. [SOURCE: `CP-01`; SOURCE: `CP-02`; SOURCE: `CP-05`; SOURCE: `CP-07`]
2. Run the hosted Micro-era baseline when current recovery evidence is green, then choose recommendation tuning from measured results. [SOURCE: `CP-04`]
3. Deploy Railway local-first only after route parity, fallback, safety, and rollback gates pass. [SOURCE: `CP-02`; SOURCE: `CP-03`; SOURCE: `CP-10`]
4. Build free key issuance and two-ingress tier enforcement after the measurement artifact defines thresholds. Keep enforcement off until all readiness gates pass. [SOURCE: `CP-07`; SOURCE: `CP-08`; SOURCE: `CP-09`]
5. Promote each venue only after its own quality, compatibility, performance, boundary, and rollback evidence passes. [SOURCE: `CP-10`]

## Risks

| risk | response |
| --- | --- |
| The free package is mistaken for the complete business | Describe it as a versioned public core; keep freshness, accounts, analytics, and VC-3 intelligence in the living hosted service. [SOURCE: `D-028`] |
| Telemetry creates a false sense of complete local measurement | Publish its best-effort contract, preserve opt-out, report coverage limits, and avoid complete denominators. [SOURCE: `FR-44`] |
| Hosted limits become a hidden signup wall | Use measured p99 as the initial anonymous target, keep entry keyless, show reset information, and offer registration only for a real higher allowance. [SOURCE: `D-028`] |
| One hosted entry bypasses the tier | Resolve the tier and run behavior tests at Railway and the shared Supabase gateway. [SOURCE: `FR-43`] |
| A Railway speed change regresses quality | Bind the route to the fixed ordered-result suite and roll back on any unexplained parity or availability failure. [SOURCE: `FR-21`; SOURCE: `FR-26`] |
| Fresh data reaches venues at different times | Release from one maintained source with an explicit npm, Railway, Supabase, and web delivery checklist. [ASSUMPTION: venue-specific release tracking prevents silent drift] |
| Account analytics are inaccurate | Keep analytics copy and launch blocked until usage deduplication and user isolation are verified. [SOURCE: `D-028`] |
| Public npm execution introduces supply-chain risk | Keep exact staged archives, hashes, license evidence, public-boundary checks, rollback controls, and narrow package dependencies. [SOURCE: `D-027`; SOURCE: `FR-26`; ASSUMPTION: these controls reduce but do not eliminate supply-chain risk] |

## Open questions

1. What hosted eligible-search p95 and error thresholds should bind the Railway release after the current database-tier baseline is measured? [SOURCE: `OQ-01`]
2. What measured anonymous, registered-free, and paid allowance values balance legitimate p99 usage with cost and abuse protection? [SOURCE: `D-028`]
3. Which personal analytics are useful enough to justify registration after the dedupe and dashboard prerequisites pass? [ASSUMPTION]
4. What downstream event best represents recommendation acceptance? [SOURCE: `OQ-03`]
5. Which web performance change, if any, is justified after hosted MCP and quality evidence are complete? [ASSUMPTION]
