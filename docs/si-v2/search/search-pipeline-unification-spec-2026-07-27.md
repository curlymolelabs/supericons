# Search pipeline unification specification

Date: 2026-07-27

Status: Proposed for implementation, owner handover ready

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

## 5. The deliverable: the cross-surface equivalence test

The unification is the means. **The test is the deliverable**, because it is what makes this class of drift impossible to reship.

Requirements:

1. It runs the reviewed corpus against all three surfaces: the installed npm package over stdio, the hosted endpoint, and the web search path.
2. It asserts the seven decisions in section 2, not ordering.
3. It reports per-query, per-surface outcomes so a failure names the surface and the decision that diverged.
4. **It must fail before the fix lands.** A test that passes against today's code proves nothing. The executor must demonstrate the failing run, including `torrent magnet`, before implementing.
5. It joins the release gates for every surface and the weekly audit.

## 6. Test corpus

Assembled once, then maintained:

- The 24 production local-zero queries, including `torrent magnet`, `view categories`, `go up`, `browser cookies`, `ip blocked`, and the domain shorthand cases.
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

1. For each reviewed query, at least one owner-reviewed relevant icon appears in the top three on every surface.
2. A forbidden-result list is enforced: known misleading matches must not appear in the top three. Seed entries: `user profile` must not lead with account-balance icons; `dark mode` must not include moderator icons; `unit test` must not lead with aspect-ratio icons; `docker container` must not lead with animated-image icons.
3. Nonsense inputs return the structured no-result contract with no fabricated references.
4. The fixed 225-case fingerprint changes only with a case-by-case review recorded in the release notes.
5. The 244 English meaning checks, 612 localized checks, and 638 multilingual fixtures stay green on the exact candidate.

## 8. Offline and performance gates

1. Local npm search works with no network access, including when hosted search is unreachable.
2. Local first-search latency and warm p95 stay within the current published budgets; the added pipeline stages must not regress the local median beyond an agreed bound recorded in the release evidence.
3. Package size, cold-start time, and memory are measured before and after; a material increase requires an explicit owner-visible note.
4. Hosted eligible-search p95 does not regress.
5. The variant plan is bounded. Fanout has a hard maximum so a single search cannot multiply into unbounded retrieval work.

## 9. Implementation plan

**Phase 1: contract and failing test.** Write the parity contract and corpus. Build the equivalence test. Demonstrate it failing against current code, with the failure list recorded as the baseline.

**Phase 2: extract the shared pipeline.** Create one module implementing stages 1 through 8, built from the five modules already shared, with no surface-specific behavior inside it.

**Phase 3: adopt it on local npm first.** Replace the single-shot local-first branch with the shared pipeline. Rerun the equivalence test; the local column should turn green. Rerun the fixed suite and review any changed cases.

**Phase 4: adopt it on hosted and web.** Route both through the same entry point, with hosted retaining its protected ranking layer after stage 7 and its fusion of hosted candidates at stage 5.

**Phase 5: delete the old orchestrations.** Remove the superseded surface-specific variant and fusion code rather than leaving it dormant. Dormant duplicates are how drift returns.

**Phase 6: gate it.** Equivalence test, quality gates, offline and performance gates join the release process for every surface.

## 10. Non-goals

No embeddings, no request-time model call, no protected ranking data in public bundles, no hosted URL change, no tool schema change, no forced identical ordering across surfaces, no ranking redesign beyond the relevance floor required by the contract, and no telemetry work in this specification.

## 11. Risks

| Risk | Response |
| --- | --- |
| The shared pipeline slows local search | Bounded variant plan, measured budgets, and a release gate on local latency |
| Ranking shifts broadly when the relevance floor lands | The fixed 225-case suite plus case-by-case review; the floor ships as its own reviewed change |
| Hosted regresses while local improves | The corpus includes queries that succeed on hosted today; hosted p95 and quality are gated |
| Package grows beyond acceptable size | Size measured per phase; public data classes unchanged by this work |
| Old orchestrations linger and drift again | Phase 5 deletes them; the equivalence test guards the boundary permanently |
| Parity is misread as identical results | The contract states the seven decisions and the four explicit non-requirements in the specification and the decision record |

## 12. Definition of done

- One shared pipeline module is the only query-understanding path on all three surfaces.
- The equivalence test failed before the change, passes after, and runs in the release gates.
- All 24 production local-zero queries return reviewed-relevant results on every surface, or an honest zero justified by a recorded review.
- Quality, offline, performance, and fixed-suite gates pass on the exact candidate bytes.
- The parity contract is recorded as a numbered decision and a requirement in the Search v2 specification.
- Superseded orchestration code is deleted, not disabled.
