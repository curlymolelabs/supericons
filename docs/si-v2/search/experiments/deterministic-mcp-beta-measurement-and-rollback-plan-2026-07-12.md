# Deterministic MCP beta measurement and rollback plan

Date: 2026-07-12
Status: Gate A target checks complete locally; Gate B remains blocked by historical migration-version collisions; no deployment or publication is authorized by this document
Authority: operational beta plan under `D-021`, `FR-26`, `FR-31`, and `FR-32`

## Purpose

Ship the locally verified deterministic search behavior to a small, isolated MCP beta, measure whether it solves the real search problems, and decide whether any important meaning gap remains.

The default free search path must remain deterministic. It must not call an AI agent, language model, or paid embedding provider.

## Decision this beta must support

At the end of the beta, choose one of these outcomes:

1. Continue deterministic improvements because the remaining problems can be fixed with reviewed data, ranking rules, relationships, library behavior, or new icons.
2. Promote the deterministic beta after its quality and safety gates pass.
3. Reconsider a semantic retrieval experiment only because reviewed evidence shows an important meaning gap that remains after a deterministic repair cycle.

The beta is not successful merely because it is fast and stable. It must also reveal zero-result clusters, localized failures, weak long-tail results, and clarification outcomes.

## Verified evidence available before the beta

The July 11 bounded baseline contains 4,045 detailed attempts. Rows associated with hosted MCP contain 4,007 attempts, or 99.1 percent. Channel arrays overlap, so this does not prove that 99.1 percent of unique traffic is exclusively hosted MCP.

The current audit path records these fields in `search_request_audit`:

- normalized query
- source, channel, environment, client family, and tool name
- library filter
- result count and request status
- latency
- locale
- session, request, and deduplication identifiers
- MCP server version
- country and account groupings when available

The admin analysis currently defines a zero result as 0 results and a low result as 1 to 3 results.

The existing logs do not reliably prove that a result was useful. The July 11 evidence sample contained only one copy signal. Result count must therefore remain a supply measure, not an acceptance measure.

## Scope

### Included

- `search_icons` and `recommend_icons`
- deterministic query understanding and ranking policy
- ambiguity handling and labeled clarification
- strict, prefer, and all library modes
- hosted MCP beta requests only
- the 225-case fixed evaluation suite
- reviewed live query clusters from the beta

### Excluded

- default npm release under the `latest` tag
- general public rollout
- Netlify or web search changes
- semantic vector retrieval
- model-provider calls
- database writes unrelated to beta measurement
- paid search behavior changes

## Required isolation

The beta must not replace the current production search path for all users.

Before any external beta, engineering must provide:

1. A separate beta Supabase function endpoint that imports the deterministic search handler.
2. A prerelease MCP package version, installed by explicit version or the `beta` npm tag. It must not change the `latest` tag.
3. A beta identifier carried into the audit record through MCP server version and environment or a dedicated beta cohort field.
4. A default-off route. Users who do not install the prerelease must remain on the current path.

If a separate endpoint is not implemented, the release is blocked. Deploying the shared handler over the production endpoint is not an isolated beta.

## Measurement prerequisites

The existing audit data is useful but incomplete. The following additions must be implemented and locally verified before deployment:

| prerequisite | reason |
| --- | --- |
| Record `library_mode` | A library filter alone cannot distinguish strict from prefer behavior. |
| Record `search_outcome` as `results`, `clarification`, `zero`, or `error` | A clarification response with no icons must not be counted as a failed zero result. |
| Record a public confidence label when present | This supports low-confidence monitoring without exposing private scores. |
| Record the beta cohort or prerelease version | Beta and non-beta traffic must not be mixed. |
| Add a sanitized export with locale counts | Locale coverage and localized failures need stable denominators. |
| Link a later icon-use event to a request when possible | This is needed for a real usefulness measure. Until then, reviewed samples remain the quality check. |

The audit record must not store raw IP addresses, raw API keys, private prompts, numeric internal scores, or model and review-process metadata.

## Eligible beta attempt

An eligible attempt is one audit row that meets all of these rules:

- channel is `hosted_mcp`
- environment or cohort identifies the deterministic beta
- tool is `search_icons` or `recommend_icons`
- status is not an internal test
- the request is not a duplicate according to its deduplication key
- the query is non-empty

Errors remain in the reliability denominator but are not added to the relevance denominator. A clarification is a separate outcome, not a zero result.

## Measurement period and minimum sample

Run for 7 complete days after the first verified beta request.

Use at least 200 eligible attempts from at least 20 session hashes. If either minimum is not reached, extend the beta to 14 days. If the minimum is still not reached, report the beta as underpowered and do not make a broad quality claim.

## Scorecard

### Primary measures

| measure | definition | decision use |
| --- | --- | --- |
| Reviewed useful-result rate | Reviewed beta queries whose visible results or clarification match the intended icon need, divided by all reviewed beta queries | Main relevance measure while linked use telemetry is sparse |
| Zero-result rate | Eligible `zero` outcomes divided by eligible relevance attempts | Detects unresolved retrieval gaps |
| Material unresolved meaning clusters | Reviewed clusters that meet the material-gap rules below | Decides whether semantic retrieval deserves reconsideration |

### Supporting measures

- low-result rate, using 1 to 3 returned results
- clarification rate and clarification resolution rate
- results by `search_icons` versus `recommend_icons`
- outcomes by strict, prefer, and all library modes
- outcomes by locale, including missing-locale counts
- long-tail query outcomes, reported separately from short exact and brand queries
- repeated or reformulated queries within a session, reported as an approximation until explicit parent-request linkage exists

### Guardrails

| guardrail | gate |
| --- | --- |
| Fixed-suite regression | All 225 stable cases pass before release and at the end of the beta. |
| Exact, brand, and unacceptable-result regression | Zero approved canary violations. |
| External model use | Zero AI-agent, language-model, and embedding-provider calls on the default and beta search paths. |
| Error rate | At most 1 percent of beta requests, excluding deliberate invalid-input checks. |
| Hosted latency | p95 at or below 2,000 ms. |
| Audit completeness | At least 95 percent of eligible rows contain tool, version or cohort, library mode, search outcome, and locale field presence, where locale may explicitly be null. |
| Abuse concentration | Report the share of attempts from the largest session and largest anonymous client grouping. Do not use concentrated traffic as proof of broad demand. |

## Review sample

Review at least 50 distinct query and library-mode combinations, or all distinct combinations if fewer than 50 exist. The sample must include:

- every repeated zero-result cluster
- every localized zero result
- every mixed-script zero result
- every clarification outcome with at least two attempts
- long-tail queries that return only low-confidence or weak fallback results
- a random sample of successful short and exact queries to detect hidden regressions

For each reviewed row, record only the product judgment:

- useful
- partly useful
- not useful
- needs clarification
- abuse, noise, or test traffic

Then classify the gap as metadata, intent/rule, relationship, library behavior, missing icon, localization, or possible semantic gap.

## Material unresolved meaning gap

A cluster is a possible semantic gap only when all of these conditions hold:

1. The query describes a reasonable icon need and useful icons already exist.
2. The failure is not explained by strict library mode, missing catalog data, a missing icon, abuse, or a translation error.
3. The cluster has completed one reviewed deterministic repair cycle, including a stable failing fixture, the smallest generic data or rule change, and a rerun.
4. The problem remains without relying on query-specific ranking code.
5. The cluster is repeated in at least one of these ways:
   - five eligible attempts across at least two session hashes;
   - three distinct normalized phrasings for the same intended meaning; or
   - the same intended meaning failing in at least two locales.

Semantic retrieval is not resumed automatically. It returns for owner review only if at least two independent material clusters remain, or one cluster accounts for at least 5 percent of eligible relevance attempts. The evidence packet must include the deterministic repair attempts, expected value, cost and abuse boundary, local-versus-external execution options, and rollback path.

## Comparison method

Do not compare raw July 11 and beta percentages as though the traffic mixes were identical.

Use three views:

1. Fixed-suite comparison: the same 225 cases before and after.
2. Matched query comparison: replay the same sanitized query, library, mode, tool, and locale combinations through the current and beta paths.
3. Live beta view: report the beta cohort on its own with denominators and concentration warnings.

The July 11 zero-result rates remain sequencing context, not the release target.

## Release sequence

### Gate A: local release candidate

- implement the beta endpoint and missing audit fields
- build the prerelease package without publishing
- run the 225-case suite and focused ranking checks
- run package public-safety and content checks
- prove zero model-provider calls
- run failure-injection checks for audit write failure and hosted search failure
- record p50 and p95 latency for a fixed replay set, including environment and sample count
- save the exact package version, endpoint name, and commit

### Gate B: owner approval

Request one explicit approval that names:

- Supabase beta function endpoint
- npm prerelease version and `beta` tag
- beta duration and cohort
- beta adoption method: invited users, a prerelease README note, or both
- rollback target
- expected external mutations

No Supabase deployment or npm publication occurs before this approval.

### Gate C: controlled beta

- deploy only the isolated beta endpoint
- publish only the approved prerelease under the `beta` tag
- verify one search, one recommendation, one clarification, one localized query, and one invalid request
- confirm audit rows carry the beta identifier and new outcome fields
- monitor the guardrails daily

### Gate D: closeout

- export a bounded sanitized beta pack
- rerun the fixed suite
- complete the reviewed sample and gap classification
- record the scorecard and limitations
- choose promote, continue deterministic repair, rollback, or propose semantic reconsideration

## Rollback plan

### Rollback triggers

Rollback immediately if any of these occurs:

- an exact, brand, or prohibited-result canary fails
- any model-provider call appears on the search path
- error rate exceeds 1 percent for two consecutive checks or 3 percent in any one-hour window
- p95 latency exceeds 2,000 ms for two consecutive checks
- audit data mixes beta and current traffic so the cohort cannot be separated
- secrets or private search data appear in logs or public responses
- the beta endpoint affects non-beta users

### Supabase rollback

1. Stop directing the prerelease package to the beta endpoint.
2. Disable or remove the isolated beta function.
3. Leave additive audit columns in place unless a separate migration proves they are safe to remove.
4. Verify the current production endpoint with its saved smoke queries.

The beta must not require a destructive data migration. Search audit additions are nullable and backward-compatible.

### npm rollback

1. Do not move the `latest` tag during the beta.
2. Deprecate the affected prerelease version with a clear message.
3. Publish a corrected prerelease only after a new local gate and owner approval.
4. Confirm the `latest` tag and current production package version remain unchanged.

### Evidence after rollback

Record the trigger, time, affected version and endpoint, request volume, user impact, reversal steps, smoke results, and remaining data caveats. Do not mark rollback complete until the current production path is verified.

## Current blockers before external beta

- the target migration and RPC passed in disposable PostgreSQL, but the repository's full Supabase migration chain cannot rebuild because older migration files share version prefixes
- the safe hosted migration reconciliation and apply method has not been approved
- acceptance telemetry remains too sparse for an automatic usefulness rate
- no deployment or publication approval has been granted

## Approval boundary

Creating code, tests, a package dry-run, and deployment commands is allowed as local preparation. Supabase deployment, npm publication, Netlify deployment, external messages, and any model-provider call require separate explicit owner approval.
