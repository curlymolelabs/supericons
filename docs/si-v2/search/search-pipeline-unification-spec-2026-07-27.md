# Search pipeline unification specification

Date: 2026-07-27

Status: Proposed for implementation, revision 2 with implementation blockers resolved

Scope: query understanding, variant planning, relevance gating, and ranking across local npm MCP, hosted MCP, and web. No change to tool schemas, hosted URLs, icon data, or account behavior.

Purpose: make the product promise true. The same query must lead every surface to the same decision about whether relevant icons exist, while allowing hosted search to rank with fresher and protected signals that cannot ship publicly.

## 1. Problem statement

The surfaces share data and components but not orchestration.

| Fact | Evidence |
| --- | --- |
| Local npm returns from a single-shot search and bypasses the rest of the pipeline | `mcp/index.js` local-first branch returns `searchIcons(query, ...)` directly; the variant and fusion work below it never runs |
| Hosted MCP fuses local candidates with hosted search | `mcp/railway-local-search.js` combines both sources before ranking |
| Web builds its own variants, ranks locally, then merges hosted results | `main.js` variant construction and hosted merge |
| Five modules are already shared in both trees | `search-intent-core.js`, `search-query-frame.js`, `generated-search-intent-graph.js`, `search-ranking-policy.js`, `icon-semantic-aliases.js` exist in `lib/` and `mcp/runtime/` |
| The drift is user-visible | Same second, same version: hosted `torrent magnet` returns five magnet icons; local npm returns zero. Also verified zero on local and non-zero on hosted: `view categories`, `go up`, `browser cookies` |
| Local zero rate is inflated by the missing stages | 24 of 71 recorded local searches returned zero; all 24 still return zero on 0.4.22; at least 17 have obvious corpus matches |
| Existing parity coverage is too thin to detect this | The current synchronized-surface check exercises four search cases |

Conclusion: the shared layer is data and components. The missing shared layer is the pipeline that uses them. This is architectural drift, not a ranking-quality problem.

## 2. What unified means: the decision-level parity contract

Identical results across surfaces are neither achievable nor desirable, because `VC-3` forbids shipping protected usage-derived intelligence in public bundles while hosted search may legitimately use it.

The contract is therefore about decisions, not ordering.

For every query in the reviewed corpus, all three surfaces must agree on:

1. **Existence.** Whether a meaningful query finds relevant results at all.
2. **Honest zero.** Whether an unsupported or nonsensical query returns a structured no-result rather than filler.
3. **Library constraint.** Whether a requested library is honored in strict mode and preferred in prefer mode.
4. **Style constraint.** Whether a requested outline or solid style is honored.
5. **Locale behavior.** Whether a maintained-locale query resolves through maintained locale terms.
6. **Exact identity.** Whether an exact `library:id` request resolves to that icon.
7. **Forbidden results.** Whether a known-misleading result is excluded from the top of the list.

The following are explicitly **not** required:

- Identical result ordering.
- Identical result sets.
- Identical result counts.
- Identical scores.

Hosted search may return fresher data, additional matches, and differently ordered results. It may never disagree with local search about the seven decisions above.

### Freshness qualifier

Parity is asserted **against a pinned common data snapshot**, not against whatever each surface happens to hold. Hosted data moves continuously while a published package is frozen at its release cut, so an unqualified existence claim would be false whenever hosted gains an icon or mapping the package does not have.

Therefore:

1. The equivalence run pins the data version on every surface to one agreed snapshot, and parity is judged only on that snapshot.
2. Hosted-only additions arising from newer data are recorded as expected differences, never as parity failures.
3. A parity failure is a disagreement on the seven decisions **with identical data underneath**. That is the drift this contract exists to prevent.
4. The gap between the pinned snapshot and live hosted data is reported as a freshness delta, which is also the honest measure of how stale a published package has become.

### Protected ranking constraint

Hosted protected signals may only **reorder candidates that already passed the shared relevance gate**. They may not reintroduce a result the shared gate excluded, and they may not push a forbidden result into the top of the list. Protected intelligence improves ordering; it never overrides the honesty rules.

## 3. Data boundary

| Class | Ships in npm and web bundles | Hosted only |
| --- | --- | --- |
| Query normalization rules | Yes | |
| Intent graph, meaning groups, phrase mappings | Yes | |
| Aliases and maintained locale terms | Yes | |
| Typo and inflection rules | Yes | |
| Public ranking policy weights | Yes | |
| Relevance floor thresholds | Yes | |
| Usage-derived ranking weights | | Yes |
| Query-behavior signals | | Yes |
| Community curation and contributor reputation data | | Yes |
| Paid design intelligence | | Yes |
| Freshest data cut between package releases | | Yes |

Any change that would move a protected class into a public bundle is a release defect under `VC-3`.

## 4. The shared pipeline

One module, one entry point, used by every surface.

1. **Normalize.** Case, whitespace, punctuation, Unicode form, plural and inflection handling.
2. **Understand.** Build the intent frame; expand through meaning groups, aliases, and maintained locale terms; apply typo recovery.
3. **Plan variants.** Produce a bounded, ordered set of query variants, each carrying provenance (exact, alias, meaning group, decomposed token, typo correction, locale term). Exact identity terms are never replaced by broader metaphors.
4. **Retrieve candidates.** Execute the variant plan against whichever sources the surface has. Sources differ; the plan does not.
5. **Fuse and deduplicate.** Merge candidates from all available sources, deduplicate by icon reference, preserve best provenance per icon.
6. **Gate relevance.** Apply the confidence floor. Weak substring matches are suppressed rather than promoted to fill a requested limit. Fewer honest results beat filler.
7. **Rank.** Apply the shared public ranking policy. Hosted may apply protected signals as an additional layer after this stage.
8. **Assemble the contract.** Results, or a structured honest no-result with recovery guidance, in the agreed response shape.

Surfaces may differ only in: transport, telemetry, presentation, which candidate sources exist, and the hosted-only protected ranking layer.

### Hosted-primary safety boundary

The shared pipeline must preserve `FR-52` exactly:

1. Hosted MCP and the public website gateway require a valid hosted-engine response before a search is considered complete.
2. A hosted timeout, network failure, `5xx`, malformed response, or dependency error remains visible as an error. Local results must not turn that failure into a success.
3. Local fallback is permitted only after the hosted engine returns a valid structured zero-result response.
4. Route metadata must report the route that actually produced the response. It must never label a local fallback as hosted.
5. Local npm remains independently offline-capable and is not subject to the hosted-primary requirement.

These rules prevent pipeline unification from recreating the hosted-search regression that this work is intended to eliminate.

## 5. The deliverable: the cross-surface equivalence test

The unification is the means. **The test is the deliverable**, because it is what makes this class of drift impossible to reship.

Requirements:

1. **It runs through the real surface adapters, never by calling the shared helper three times.** Calling one module three ways would prove the module is deterministic and prove nothing about surface parity. The three subjects are: the exact npm archive executed over stdio, the built browser artifact executing the web search path, and the real Railway HTTP server. Candidate providers are dependency-injected so retrieval is deterministic.
2. It asserts the seven decisions in section 2 against the pinned snapshot, not ordering.
3. It reports per-query, per-surface outcomes so a failure names the surface and the decision that diverged.
4. **A failing baseline is captured before the fix, as evidence, not as a merged gate.** The executor records the pre-fix failing run (including `torrent magnet`) in the release evidence. A permanently failing test is never merged into the normal gate; the gate turns green only when the fix lands.
5. **Deterministic pre-release testing and live production smoke are separate.** The gate is deterministic and offline-capable. A small live smoke against production runs after deployment and is reported separately, never as a merge blocker.
6. It joins the release gates for every surface and the weekly audit once green.

## 6. Test corpus and evidence

**Sanitization rule, applied before the corpus is committed:** the corpus is derived from production traffic, so it is frozen and reviewed once, with raw user queries excluded from any repository file. Entries are either generic reproductions of the observed gap, or reviewed and cleared for inclusion. No personal, project, or identifying text enters a public artifact.

Before implementation begins, Phase 1 produces a public-safe evidence artifact containing:

1. The exact UTC cutoff.
2. The source tables or files.
3. The complete query and traffic filters, including controlled-traffic exclusion.
4. The reproducible SQL or local analysis command.
5. The sanitized fixture identifier and content hash.
6. One expected decision per case: `expected_positive`, `expected_zero`, or `expected_error`.
7. For positive cases, reviewed relevant references or concepts and any forbidden top results.
8. For zero cases, the reason an honest zero is correct.

The previously reported "24 of 71" figure is context only until this artifact exists. It is not a release denominator or acceptance gate.

The maintained corpus includes:

- Sanitized generic reproductions of reviewed production local-zero gaps, including `torrent magnet`, `view categories`, `go up`, `browser cookies`, `ip blocked`, and domain shorthand cases.
- Agent-style multiword phrases from real hosted traffic.
- Compound interface labels such as `settings permissions` and `columns settings`.
- Misspellings including `databse`, `notifcation`, `analtyics dashbord`, and `staock`.
- Strict-library and prefer-library cases across several libraries.
- One or more cases in each of the eleven maintained locales.
- Nonsense inputs that must return honest zeros.
- Queries known to succeed on hosted today, to prove no hosted regression.
- The existing fixed 225-case suite, unchanged, as the ranking-stability anchor.

## 7. Quality gates

Nonzero is not a passing condition.

1. For each `expected_positive` query, at least one **reviewed-relevant** icon appears in the top three on every surface. Ordinary corpus relevance is judged by an independent reviewer, not the implementing agent. Owner review is reserved for genuinely ambiguous product calls, per `VC-9`, so the owner is not the bottleneck for routine judgments.
2. A forbidden-result list is enforced: known misleading matches must not appear in the top three. Seed entries: `user profile` must not lead with account-balance icons; `dark mode` must not include moderator icons; `unit test` must not lead with aspect-ratio icons; `docker container` must not lead with animated-image icons.
3. Every `expected_zero` query returns the structured no-result contract with no fabricated references.
4. Every `expected_error` case preserves the specified error. In hosted-primary cases, local results cannot hide the error.
5. The fixed 225-case fingerprint changes only with a case-by-case review recorded in the release notes.
6. The 244 English meaning checks, 612 localized checks, and 638 multilingual fixtures stay green on the exact candidate.

## 8. Offline and performance gates

Numeric, not adjectival. Every limit is measured on the exact candidate and recorded in release evidence.

1. Local npm search works with no network access, including when hosted search is unreachable, proven by a test run with networking disabled.
2. **Local search p95 at or below 500 ms** on the bound local workload. This is the established blocking budget. First-search cold time is reported separately.
3. Before code freeze, measure and record the current exact workload baselines for first-search cold time, package size, resident memory, and hosted eligible-search latency.
4. Candidate limits for first-search cold time, package growth, resident memory growth, and hosted latency are calibrated from those baselines and recorded before they become release blockers. Earlier proposed values, including a 500 ms hosted target, are targets only until this calibration is complete.
5. The variant plan is bounded: a hard maximum on variants per query and on total candidate retrievals per search, so one search can never multiply into unbounded work.

## 9. Implementation plan

**Phase 1: contract and failing test.** Write the parity contract and corpus. Build the equivalence test. Demonstrate it failing against current code, with the failure list recorded as the baseline.

**Phase 2: extract the shared pipeline.** Create one module implementing stages 1 through 8, built from the five modules already shared, with no surface-specific behavior inside it and candidate retrieval injected as a provider.

**Duplication note:** those five modules exist as byte-identical copies under `lib/` and `mcp/runtime/`. The unified design must either remove the duplication or enforce it: a generation step plus a hash-equality gate that fails the release when the copies diverge. Byte-identical today is not a guarantee tomorrow, and this duplication is exactly the substrate drift grows in.

**Phase 3: adopt it on local npm first.** Replace the single-shot local-first branch with the shared pipeline. Rerun the equivalence test; the local column should turn green. Rerun the fixed suite and review any changed cases.

**Phase 4: adopt it on hosted and web.** Route both through the same entry point, with hosted retaining its protected ranking layer after stage 7 and its fusion of hosted candidates at stage 5.

**Phase 5: delete the old orchestrations.** Remove the superseded surface-specific variant and fusion code rather than leaving it dormant. Dormant duplicates are how drift returns.

**Phase 6: gate it.** Equivalence test, quality gates, offline and performance gates join the release process for every surface, plus the module hash-equality gate from Phase 2.

**Phase 7: promote with owner approval.** Per `VC-9`, changing npm `latest`, the web default, or the hosted default requires explicit owner approval on the exact candidate. Deterministic gates green plus the post-deploy live smoke are the evidence presented for that decision; they are not the decision.

## 10. Release and rollback boundaries

Search pipeline promotion is independent from telemetry work.

1. **npm:** build and verify an exact archive. Rollback restores the prior dist-tag without changing Hosted MCP or the website.
2. **Railway:** deploy the exact reviewed source revision behind the existing hosted URL. Rollback restores the prior Railway deployment. A failed hosted response must remain visible throughout the rollout.
3. **Netlify:** deploy the exact reviewed browser artifact. Rollback restores the prior site deployment.
4. Each surface has an independent mutation budget, verification result, and rollback record.
5. A failure on one surface blocks parity promotion but does not authorize mutation of another surface.
6. No Supabase schema change is authorized by this search specification.

## 11. Non-goals

No embeddings, no request-time model call, no protected ranking data in public bundles, no hosted URL change, no tool schema change, no forced identical ordering across surfaces, no ranking redesign beyond the relevance floor required by the contract, and no telemetry work in this specification.

## 12. Risks

| Risk | Response |
| --- | --- |
| The shared pipeline slows local search | Bounded variant plan, measured budgets, and a release gate on local latency |
| Ranking shifts broadly when the relevance floor lands | The fixed 225-case suite plus case-by-case review; the floor ships as its own reviewed change |
| Hosted regresses while local improves | The corpus includes queries that succeed on hosted today; hosted p95 and quality are gated |
| Package grows beyond acceptable size | Size measured per phase; public data classes unchanged by this work |
| Old orchestrations linger and drift again | Phase 5 deletes them; the equivalence test guards the boundary permanently |
| Parity is misread as identical results | The contract states the seven decisions and the four explicit non-requirements in the specification and the decision record |

## 13. Definition of done

- One shared pipeline module is the only query-understanding path on all three surfaces.
- The equivalence test failed before the change, passes after, and runs in the release gates.
- Every frozen corpus case produces its declared decision on every surface: a reviewed-relevant positive, an honest zero, or the specified visible error.
- Quality, offline, performance, and fixed-suite gates pass on the exact candidate bytes.
- The parity contract is recorded as a numbered decision and a requirement in the Search v2 specification.
- Superseded orchestration code is deleted, not disabled.
