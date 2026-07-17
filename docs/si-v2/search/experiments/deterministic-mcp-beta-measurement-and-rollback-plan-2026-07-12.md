# Deterministic MCP beta measurement and rollback plan

Date: 2026-07-12
Amended: 2026-07-17
Status: local-first npm beta published and verified; evidence window awaiting its first eligible user request
Authority: operational beta plan under `D-021`, `D-025`, `FR-26`, `FR-31`, `FR-32`, and `FR-40`

## Purpose

Ship the locally verified deterministic search behavior in an opt-in MCP prerelease, measure whether it solves the real English-like search problems, and decide whether any important meaning gap remains.

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

- `search_icons` requests with no locale and ASCII query text
- deterministic query understanding and ranking policy
- ambiguity handling and result diversification
- strict, prefer, and all library modes
- packaged Material outline and solid SVGs
- MCP tool-outcome telemetry for the eligible local beta cohort
- the 225-case fixed evaluation suite
- reviewed live query clusters from the beta

### Excluded

- default npm release under the `latest` tag
- general public rollout
- Netlify or web search changes
- local-first localized or non-ASCII search
- local-first `recommend_icons`
- a Supabase beta function or search migration
- semantic vector retrieval
- model-provider calls
- database writes unrelated to beta measurement
- paid search behavior changes

## Required isolation

The beta must not replace the current production search path for all users.

Before any external beta, engineering must provide:

1. A prerelease MCP package version, installed by explicit version or the `beta` npm tag. It must not change the `latest` tag.
2. A package-only local route limited to `search_icons` requests with no locale and ASCII query text.
3. The stable hosted route for localized and non-ASCII search and every recommendation request, without a beta cohort on those stable requests.
4. A beta identifier carried into the local tool-outcome record through MCP server version and beta cohort.
5. A default-off release. Users who do not install the prerelease must remain on the current path.

No hosted function deployment or database migration is required for this beta. A later hosted web or recommendation gate still requires a separate approved attribution measurement and its own isolation plan.

## Measurement prerequisites

The `mcp_usage_events` tool-outcome path is the beta scorecard source. The following behavior must be implemented and locally verified before publication:

| prerequisite | reason |
| --- | --- |
| Record `library_mode` | A library filter alone cannot distinguish strict from prefer behavior. |
| Record `search_outcome` as `results`, `clarification`, `zero`, or `error` | A clarification response with no icons must not be counted as a failed zero result. |
| Record a public confidence label when present | This supports low-confidence monitoring without exposing private scores. |
| Record the beta cohort and prerelease version | Beta and non-beta traffic must not be mixed. |
| Add a sanitized export with locale counts | Locale coverage and localized failures need stable denominators. |
| Link a later icon-use event to a request when possible | This is needed for a real usefulness measure. Until then, reviewed samples remain the quality check. |
| Record one outcome attempt per eligible local tool call | Local search bypasses the hosted request audit and the tool-level outcome insert has no hosted deduplication key. |
| Record the packaged index generation date in the response and release record | Local results are a point-in-time snapshot that changes only when a new package ships. |

The audit record must not store raw IP addresses, raw API keys, private prompts, numeric internal scores, or model and review-process metadata.

## Eligible beta attempt

An eligible attempt is one `mcp_usage_events` tool-outcome row that meets all of these rules:

- channel is `hosted_mcp`
- cohort identifies the deterministic beta
- tool is `search_icons`
- client family is `mcp_stdio`
- MCP server version is the approved prerelease
- locale is null
- status is not an internal test
- the query is non-empty

Repeated user calls remain separate eligible attempts. The local tool-outcome RPC does not write a deduplication key. Release verification must instead prove that each eligible tool call reaches exactly one results, zero, or error outcome branch. Errors remain in the reliability denominator but are not added to the relevance denominator.

## Measurement period and minimum sample

Start the measurement clock with the first verified eligible beta request, not with publication or an internal smoke test.

The beta may close when all three conditions are met:

1. At least 200 eligible attempts are available from at least 20 session hashes.
2. At least 3 complete days have elapsed since the first eligible request.
3. Every completed daily monitor is green, or every non-green finding has been resolved and recorded without hiding failed intervals.

If either sample minimum is not reached, continue for up to 14 days. If the minimum is still not reached, report the beta as underpowered and do not make a broad quality claim.

Closeout must also report the observed beta adoption rate against the best available stable-user denominator. If the stable denominator is uncertain or disagrees across sources, report the range and the reason rather than choosing one figure silently.

Any code, package, or safety correction that requires a new beta package version starts a new evidence window for that version. A resolved daily finding remains in the record and never converts its failed interval into a green interval.

## Scorecard

### Primary measures

| measure | definition | decision use |
| --- | --- | --- |
| Reviewed useful-result rate | Reviewed beta queries whose visible results or clarification match the intended icon need, divided by all reviewed beta queries | Main relevance measure while linked use telemetry is sparse |
| Zero-result rate | Eligible `zero` outcomes divided by eligible relevance attempts | Detects unresolved retrieval gaps |
| Material unresolved meaning clusters | Reviewed clusters that meet the material-gap rules below | Decides whether semantic retrieval deserves reconsideration |

### Supporting measures

- low-result rate, using 1 to 3 returned results
- outcomes by strict, prefer, and all library modes
- long-tail query outcomes, reported separately from short exact and brand queries
- repeated or reformulated queries within a session, reported as an approximation until explicit parent-request linkage exists
- informational local-versus-hosted top-result divergence on a bounded sanitized sample
- packaged index generation date and days since generation

### Guardrails

| guardrail | gate |
| --- | --- |
| Fixed-suite regression | All 225 stable cases pass before release and at the end of the beta. |
| Exact, brand, and unacceptable-result regression | Zero approved canary violations. |
| External model use | Zero AI-agent, language-model, and embedding-provider calls on the default and beta search paths. |
| Error rate | At most 1 percent of beta requests, excluding deliberate invalid-input checks. |
| Local tool latency | Fixed-suite p95 below 500 ms before publication. Live beta tool p95 is reported daily with cold or first-process samples separate from reused-process samples. |
| Package size | Packed prerelease remains below 7 MB. |
| Local memory | Combined icon indexes and Material bundle add less than 75 MB RSS in the fixed startup benchmark. |
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
2. Matched query comparison: replay a bounded sanitized sample of the same English query, library, mode, and style combinations through the local beta and stable hosted paths. Report exact top-result agreement and top-result-set overlap for information. This replay requires explicit approval and must not store raw private context in the repository.
3. Live beta view: report the beta cohort on its own with denominators and concentration warnings.

The July 11 zero-result rates remain sequencing context, not the release target.

## Release sequence

### Gate A: local release candidate

- build the prerelease package without publishing
- include the exact Material outline and solid asset bundle
- include the public synonym map and reproduce the fixed fingerprint from a clean installed tarball
- prove the local route applies only to eligible English-like `search_icons` calls
- prove localized, non-ASCII, and recommendation calls keep the stable hosted route without a beta cohort
- run the 225-case suite and focused ranking checks
- run package public-safety and content checks
- prove zero model-provider calls
- prove one local tool outcome attempt per eligible call and that telemetry failure cannot fail the search
- record local p50 and p95, package size, startup memory, and snapshot date
- save the exact package version and commit

### Gate B: owner approval

Request one explicit approval that names:

- npm prerelease version and `beta` tag
- beta duration and cohort
- beta adoption method: invited users, a prerelease README note, or both
- rollback target
- expected external mutations
- the maximum stable hosted calls allowed for the informational divergence sample

No npm publication or bounded hosted comparison occurs before this approval. The approval must state that no Supabase deployment or database mutation is authorized.

### Gate C: controlled beta

- publish only the approved prerelease under the `beta` tag
- verify one local English search, Material outline, Material solid, one localized stable search, one non-ASCII stable search, one stable recommendation, and one invalid request
- confirm the eligible local tool-outcome row carries the beta identifier and expected fields
- confirm localized, non-ASCII, and recommendation requests do not carry the beta cohort
- preserve approved public-safe response artifacts and bounded usage rows if Gate C fails
- verify the evidence pack is readable and bound to the fixed workload and measurement window before cleanup
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
- live local tool p95 materially exceeds the local release evidence for two consecutive checks
- audit data mixes beta and current traffic so the cohort cannot be separated
- secrets or private search data appear in logs or public responses
- localized, non-ASCII, recommendation, or web traffic enters the local beta route

### Hosted-service rollback

No Supabase function or database change is part of this beta. Verify that stable production functions remain unchanged before publication and at closeout. If a stable fallback is found to carry a beta cohort or changed response behavior, stop the beta and preserve only the approved public-safe evidence.

If the failure exposes secrets or private search data, delete the endpoint immediately and retain only evidence that can be collected without copying the unsafe content. Do not delay a security rollback to complete diagnostics.

The beta requires no data migration.

### npm rollback

1. Do not move the `latest` tag during the beta.
2. Deprecate the affected prerelease version with a clear message.
3. Publish a corrected prerelease only after a new local gate and owner approval.
4. Confirm the `latest` tag and current production package version remain unchanged.

### Evidence after rollback

Record the trigger, time, affected version and endpoint, request volume, user impact, preserved evidence, reversal steps, smoke results, and remaining data caveats. Do not mark rollback complete until the current production path is verified.

## Current blockers before external beta

- the rebuilt publication-only packet requires independent audit and owner approval
- npm authentication is required only after that approval
- acceptance telemetry remains too sparse for an automatic usefulness rate
- hosted attribution remains deferred evidence before a later hosted web or recommendation gate

The rebuilt approval request limits the informational comparison to 50 sanitized fixed cases, run sequentially with no retries.

## Approval boundary

Creating code, tests, a package dry-run, and a publication packet is allowed as local preparation. npm publication, any Supabase or Netlify change, a bounded live hosted comparison, external messages, and any model-provider call require separate explicit owner approval.
