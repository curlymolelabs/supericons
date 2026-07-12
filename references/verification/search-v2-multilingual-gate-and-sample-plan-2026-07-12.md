# Search v2 multilingual gate and sample-plan verification

Date: 2026-07-12

## Scope

- Correct the 225-case multilingual composition without changing the total.
- Record multilingual meaning approval, language assurance, and native review separately.
- Establish hard-safety, per-locale, and aggregate embedding quality gates.
- Switch E3 to Gemini Embedding 2 at 1024 dimensions.
- Build an exact no-network sample plan and provider-response validator.

## Initial gaps

- The required `OpenAI 标志` case was absent.
- Traditional Chinese had four candidate cases, below the five-case locale gate.
- E3 still selected `gemini-embedding-001` despite current Google documentation listing stable `gemini-embedding-2`.
- No sample request contract or unit-norm response check existed.

## Verified results

| check | result | evidence |
| --- | --- | --- |
| Fixed evaluation size | Passed | `npm run verify:semantic-search-v2` reports 225 cases and 225 stable IDs. |
| Multilingual composition | Passed | The 71 candidates cover 11 locales with at least five cases each; Traditional Chinese has five; `OpenAI 标志` exists exactly once. |
| Honest review state | Passed | All four multilingual groups record owner meaning review as awaiting, automated language assurance without native-review claims, and native review as not completed. |
| Candidate configuration | Passed | The runner verifier lists `e3-gemini-embedding-2-1024`. |
| Exact sample plan | Passed | Four primary candidates, six documents, six queries, and 12 inputs per candidate. |
| Authorization fingerprint | Passed | `a95e424c435893b9009d898dcd386c79cacd382c49238c69c5729645ade8f287`. |
| Provider response validation | Passed with synthetic responses | Count, dimensions, finite values, and unit norm within 0.02 are required; wrong count, wrong dimensions, non-finite values, and non-unit vectors fail. |
| Network and writes | Passed | Sample-plan code contains no network execution primitive and declares provider execution unimplemented, network disabled, and writes disabled. |
| Adjacent search regressions | Passed | Brand classification, ranking policy, query-frame shadow, 15 library-mode cases, recommendation clarification, and intent graph checks passed. |
| Corpus planning compatibility | Passed | The 75,810-document plan and a 304-batch Gemini Embedding 2 dry run remained no-network and no-write. |

## Check not run

The backend discovery helper found `npm run build` but could not start npm through Python on Windows (`FileNotFoundError: [WinError 2]`). The full repository build was not used as substitute evidence because the worktree contains unrelated in-progress changes and generated outputs. The focused Node checks directly exercised the changed contracts.

## Accepted evaluation gates

- Exact identity, blocked-alias, and safety fixtures allow zero failures.
- Every reviewed locale with at least five cases may fail at most one semantic case.
- At least 90 percent of reviewed multilingual cases must pass overall.
- Native-language review remains separately visible and is not implied by automated assurance.

## Current provider contract sources

- [Voyage embedding API](https://docs.voyageai.com/reference/embeddings-api)
- [Google embedding API](https://ai.google.dev/api/embeddings)
- [Google Gemini Embedding 2](https://ai.google.dev/gemini-api/docs/embeddings)
- [OpenAI embedding API](https://platform.openai.com/docs/api-reference/embeddings/object)

## External effects

- No provider API was called.
- No credential value was read.
- No embedding was generated or stored.
- No provider usage or latency was measured.
- No deployment or publication occurred.
- No sample spend was incurred.

## Remaining gates

- The owner meaning review for 71 multilingual candidates is not approved yet.
- The exact sample fingerprint and sample-only spend cap are not approved yet.
- Provider execution is deliberately absent until that approval is recorded.
- Full-corpus cost remains unverified until provider-reported sample usage exists.
- Native-language review remains a later quality loop.
