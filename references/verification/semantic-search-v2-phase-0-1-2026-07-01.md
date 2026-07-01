# Supericons Semantic Search v2 Phase 0/1 Verification

Date: 2026-07-01

## Scope

This verification covers the safe local implementation slice for Semantic Search v2:

- Public-safe semantic search evaluation set.
- Semantic document builder for current public icon and registry projections.
- Additive Supabase migration draft for semantic document storage.
- Local verification scripts and package commands.
- PRD update with implementation status and generated visual maps.
- Search-intent coverage for adjective queries such as `powerful` and `strong`.
- Alias coverage for generic LLM/model queries so concept icons remain visible alongside AI brand logos.

No production ranking behavior, hosted search deployment, Netlify deployment, npm publish, or Supabase deployment was performed as part of this verification.

## Changed Files Checked

- `data/semantic-search-v2/evaluation-set.json`
- `docs/supericons-semantic-search-v2-prd-implementation-plan-2026-07-01.md`
- `docs/assets/semantic-search-v2/*.png`
- `lib/semantic-search-documents.js`
- `lib/icon-semantic-aliases.js`
- `lib/generated-search-intent-rules.js`
- `mcp/runtime/icon-semantic-aliases.js`
- `mcp/runtime/generated-search-intent-rules.js`
- `scripts/build-semantic-search-documents.mjs`
- `scripts/build-search-intent-core-from-dictionary.mjs`
- `scripts/verify-search-intent-expansion.mjs`
- `scripts/verify-web-cjk-search.mjs`
- `scripts/verify-semantic-search-v2-smoke.mjs`
- `scripts/verify-semantic-search-v2.mjs`
- `supabase/migrations/20260701_semantic_search_v2_documents.sql`
- `package.json`

## Verification Results

| Check | Result | Evidence |
| --- | --- | --- |
| PRD section coverage | Passed | `compare_prd_sections.py` reported all required sections present and no missing sections. |
| Semantic Search v2 verification | Passed | `npm run verify:semantic-search-v2` returned status `ok`, 28 evaluation queries, 75,560 semantic documents, and 41 skipped unresolved or duplicate resolved registry rows. |
| Semantic Search v2 local MCP smoke | Passed | `npm run verify:semantic-search-v2-smoke` returned status `ok` across 13 exact-logo, adjective-intent, and long natural-language smoke cases. |
| Semantic document build | Passed | `npm run build:semantic-search-documents -- --out output/semantic-search-v2/semantic-documents.json` wrote 75,560 local documents across 11 libraries. |
| Search intent expansion | Passed | `npm run verify:search-intent-expansion` returned `ok`. |
| Web/CJK search plan | Passed | `npm run verify:web-cjk-search` returned `ok`, including web intent variants for `powerful` and `strong`, and Japanese LLM coverage including `material:model_training`. |
| Search catalog sync | Passed | `npm run verify:search-catalog-sync` returned `ok`. |
| Hosted search engine verification | Passed | `npm run verify:hosted-search-engine` returned `ok`. |
| Supericons registry projections | Passed | `npm run verify:si-registry` returned `ok`. |
| JavaScript syntax checks | Passed | `node --check` passed for the new document builder and verification scripts. |
| MCP package verification | Passed | `npm --prefix mcp run verify:package` built Motion Lab MCP artifacts and verified 31 MCP package files. |
| Public safety scan | Passed | `node scripts/verify-public-safety.mjs --verbose` completed successfully. |
| Public file sensitive string scan | Passed | No matches were returned for privileged credential strings or internal review metadata patterns in the new public-facing plan, evaluation set, and migration files. |

## Local Build Summary

The semantic document builder produced:

- 75,560 total semantic documents.
- 15,112 documents for each document type: `identity`, `meaning`, `visual`, `domain`, and `negative`.
- 250 Supericons-library documents, representing the current 50 `si` records across five document types.
- 41 skipped registry rows because they were unresolved or duplicate resolved rows.

## QA Smoke Refinement

The smoke pass found that raw semantic scoring could treat short query fragments as accidental substrings. For example, `car` could contribute to `Cartesia`, and `pain` could contribute to `paint`.

The semantic registry scorer was refined so exact token overlap still counts, while substring overlap only contributes for longer terms. This keeps useful exact matches like `scan`, `camera`, `person`, `moon`, and `star`, while reducing accidental matches from unrelated words.

The new smoke coverage checks:

- Exact Supericons logo discovery for xAI, Grok, OpenAI Codex, Lovable, and Kickbacks.ai.
- Adjective-intent fallback for `powerful` and `strong`, returning related `power`, `bolt`, `zap`, `rocket`, `shield`, or `gauge` concepts while avoiding obvious off/low-power meanings.
- Long-query fallback for `license plate recognition camera scan car`.
- Short related fallback for `license plate`.
- Brand/tool intent fallback for `cursor ai code editor logo` and `vercel v0 ai app builder logo`.
- Unmet-demand concept fallback for `neck pain person` and `dream interpretation moon star eye mystical`.

## Adjective Intent Refinement

The user-reported `powerful` query reproduced as a no-result gap because the typed adjective was not connected to existing power/energy/performance icon concepts. The search-intent dictionary now maps `powerful` to `power`, `bolt`, `zap`, `rocket`, `gauge`, and `flame`, and maps `strong` to `power`, `bolt`, `zap`, `shield`, `gauge`, and `dumbbell`.

The generated intent rules were rebuilt for both the web/hosted runtime and the MCP package runtime. The generator now writes both generated-rule files so future dictionary changes stay aligned.

During the broader smoke run, Japanese `LLM` search surfaced a separate top-8 ranking gap: `material:model_training` existed at rank 10 behind several AI brand logos. `material:model_training` now includes clean semantic aliases for `llm`, `language model`, `large language model`, `ai model`, and `model training`, keeping that concept icon visible without removing relevant brand-logo matches.

## Release Notes

This slice is safe to review and commit locally. It prepares the foundation for Semantic Search v2 but does not activate vector ranking or change production search results.

Before production rollout, the next implementation slice should add a shadow evaluation path, embedding generation, pgvector storage, and a gated candidate-fusion ranker with logs and rollback controls.
