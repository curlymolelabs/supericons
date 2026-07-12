# Search v2 embedding candidate shortlist

Date checked: 2026-07-12

Status: current research shortlist, no model selected

Authority: experiment input only. Provider documentation must be checked again immediately before paid execution.

## Recommendation

Run the first offline comparison with four primary configurations and one optional cost control:

| ID | provider and model | output | purpose |
| --- | --- | ---: | --- |
| E1 | Voyage `voyage-4-large` | 1024 float dimensions | Quality ceiling for general and multilingual retrieval |
| E2 | Voyage `voyage-4-lite` | 512 float dimensions | Latency and cost floor |
| E3 | Google `gemini-embedding-001` | 1024 float dimensions | Independent multilingual and task-aware candidate |
| E4 | OpenAI `text-embedding-3-large` | 1024 float dimensions | Independent multilingual quality candidate |
| E5 | OpenAI `text-embedding-3-small` | 1024 float dimensions | Optional low-cost cross-provider control |

This is a test shortlist, not a production recommendation. The winning configuration is determined only by the approved evaluation and rollback contract.

## Why 1024 dimensions

Supabase recommends HNSW for general vector-index performance and documents a 2,000-dimension maximum for indexed `vector` values in current pgvector versions. Voyage 4 supports 256, 512, 1024, and 2048 dimensions. Google supports reduced output dimensions from a 3072-dimension default. OpenAI supports shortening `text-embedding-3` outputs through the `dimensions` parameter. A common 1024-dimension lane therefore fits the planned Supabase index and allows a fairer quality and storage comparison.

The 512-dimension Voyage Lite lane measures whether a smaller index is sufficient for this catalog. A 2048-dimension float-vector lane is excluded from the first HNSW comparison because it exceeds Supabase's documented 2,000-dimension `vector` index limit.

## Current official facts

### Voyage

- Voyage documents `voyage-4-large`, `voyage-4`, and `voyage-4-lite` as current general and multilingual retrieval models with a 32,000-token context and 256, 512, 1024, or 2048 output dimensions.
- The API supports separate `query` and `document` input types.
- Current listed prices are $0.12 per million tokens for `voyage-4-large`, $0.06 for `voyage-4`, and $0.02 for `voyage-4-lite`, before any stated free allowance or batch discount.

Sources: [Voyage text embeddings](https://docs.voyageai.com/docs/embeddings), [Voyage pricing](https://docs.voyageai.com/docs/pricing).

### Google

- The current shortlist still names `gemini-embedding-001`, but Google now also lists stable `gemini-embedding-2`. The newer model supports text and other media, while this experiment requires text only.
- The default output is 3072 dimensions, with reduced output dimensions supported.
- Retrieval task types are supported for query and document inputs.
- Reduced-dimension output from `gemini-embedding-001` must be normalized by the runner. Google documents automatic normalization for reduced-dimension `gemini-embedding-2` output.
- Current Vertex pricing lists Gemini Embedding at $0.00015 per 1,000 input tokens for online requests and $0.00012 for batch requests.

Sources: [Google Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings), [Google text embeddings](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings), [Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing).

### OpenAI

- OpenAI documents `text-embedding-3-large` as its most capable embedding model for English and non-English tasks.
- It supports shortening from its 3072-dimension maximum through the `dimensions` parameter.
- Current model pages list $0.13 per million tokens for `text-embedding-3-large` and $0.02 per million tokens for `text-embedding-3-small`.
- OpenAI embeddings are normalized, so cosine similarity and Euclidean distance produce the same ranking according to the official embedding FAQ.

Sources: [OpenAI large embedding model](https://developers.openai.com/api/docs/models/text-embedding-3-large), [OpenAI small embedding model](https://developers.openai.com/api/docs/models/text-embedding-3-small), [OpenAI embedding FAQ](https://help.openai.com/en/articles/6824809-embeddings-faq).

### Supabase and pgvector

- Supabase recommends HNSW in general for performance and robustness as data changes.
- Current indexed limits are 2,000 dimensions for `vector` and 4,000 for `halfvec`.
- The first experiment should use cosine distance and record the installed pgvector version before creating an index.

Sources: [Supabase vector indexes](https://supabase.com/docs/guides/ai/vector-indexes), [pgvector](https://github.com/pgvector/pgvector).

## Deferred candidate

Cohere `embed-v4.0` remains a reserve candidate. Official documentation confirms multilingual support, retrieval input types, and 256, 512, 1024, or 1536 dimensions. The public pricing page captured during this review did not provide a clear self-serve per-token Embed 4 price, so it is not in the first cost-comparable run. Add it only after current API pricing and access are confirmed.

Sources: [Cohere embedding models](https://docs.cohere.com/docs/cohere-embed), [Cohere pricing](https://cohere.com/pricing).

## First implementation batch

### Provider-neutral plan

Create an offline adapter contract with:

- provider ID and exact model ID;
- document and query input type;
- requested and returned dimensions;
- content hash and embedding version;
- token or character usage from the provider response;
- retryable and terminal error classification;
- batch limit and concurrency setting; and
- dry-run support that makes no network request.

### Runner modes

1. `plan`: count documents, hashes, locales, and estimated input size without an API call.
2. `sample`: embed the approved smoke subset and validate dimensions and normalization.
3. `build`: generate one isolated candidate version with resumable batches.
4. `evaluate`: compare deterministic, vector-only, and offline hybrid results.
5. `rollback`: deactivate and remove a candidate version while preserving source documents.

### Storage plan

Extend the existing semantic-document path with a separate versioned embedding table. Do not place provider-specific fields on the source document rows. The first indexed experiment uses `vector(1024)` with cosine HNSW. The 512-dimension candidate uses a separate version-specific index or table so indexed rows never mix dimensions.

### Safety gates before paid execution

- Owner approves a maximum experiment spend.
- Required API keys are present through environment variables and never written to artifacts.
- The runner reports the planned input count and estimated billable size before confirmation.
- Detailed result traces stay local and private; only approved aggregates enter repository evidence.
- Failure injection and deterministic fallback tests exist before any shadow retrieval code is enabled.

## Open decisions

- Approve or change the five candidate configurations.
- Decide whether E3 preserves the approved `gemini-embedding-001` comparison or changes to `gemini-embedding-2` before the first paid sample.
- Set the maximum total experiment spend.
- Decide whether Google authentication complexity is acceptable for the first run.
- Decide whether E5 should run only after E1 through E4, reducing initial provider work.
- Set the per-locale material-regression limit and minimum cases per locale.

## Research limitations

- No provider API was called, so latency, response shape, actual billing, and account-specific limits remain unverified.
- Prices are current official list prices observed on 2026-07-12 and may change.
- Provider benchmark claims are not Supericons evidence. Only the Supericons evaluation suite can select the winner.
