# Search v2 embedding sample contract

Date: 2026-07-12

Status: sample planning implemented; provider execution not implemented or authorized

## Name

Search v2 provider comparison sample.

## Caller and trigger

The caller is a local owner-approved operator. The implemented command is:

```text
npm run plan:search-v2-embedding-sample
```

It prints the exact provider request descriptions, input limit, expected query-to-document pairs, and authorization fingerprint. It does not call a provider.

## Authorization

Planning needs no credentials. A future executor must require all of the following before one provider request is made:

- explicit owner approval of the exact authorization fingerprint;
- an approved sample spend cap;
- the selected candidate IDs;
- no more than 12 total inputs per candidate;
- provider credentials supplied only through environment variables; and
- confirmation that response vectors and usage stay local.

Credential environment variables are `VOYAGE_API_KEY`, `GEMINI_API_KEY`, and `OPENAI_API_KEY`. The plan contains the variable names but never reads or prints their values.

## Input

The fixed public-safe sample contains six English document descriptions and six multilingual queries. Queries cover Simplified Chinese, Traditional Chinese, Japanese, Hindi, Arabic, and the mixed-script `OpenAI 标志` case.

The default sample includes four primary candidates. Optional E5 is excluded unless explicitly selected.

## Provider request descriptions

- Voyage uses `POST /v1/embeddings`, separate `document` and `query` input types, float output, and the configured output dimension.
- Google uses `POST models/{model}:batchEmbedContents`, separate retrieval task types, and the configured output dimension.
- OpenAI uses `POST /v1/embeddings`, float output, and the configured `dimensions` value.

Sources: [Voyage embedding API](https://docs.voyageai.com/reference/embeddings-api), [Google embedding API](https://ai.google.dev/api/embeddings), [Google Gemini Embedding 2](https://ai.google.dev/gemini-api/docs/embeddings), [OpenAI embedding API](https://platform.openai.com/docs/api-reference/embeddings/object).

## Response validation

Every provider response must pass these checks before retrieval quality is calculated:

- returned vector count equals requested input count;
- every vector has the configured dimensions;
- every value is finite;
- every vector has unit norm within a tolerance of 0.02; and
- provider-reported usage is retained for the local cost record.

The unit-norm check applies to every provider, including Gemini Embedding 2, even though Google documents automatic normalization for reduced dimensions.

## Output

The planning output contains:

- schema and mode;
- no-network and no-write declarations;
- exact sample and candidate counts;
- expected query-to-document pairs;
- request method, URL, credential variable name, and body for each candidate; and
- a deterministic SHA-256 authorization fingerprint.

## Side effects

The implemented planner reads local JSON and writes JSON to standard output. It has no network primitive, reads no credential value, writes no file, and creates no embedding.

## Failure modes

Planning fails closed on an unsupported provider, unknown candidate, empty input, duplicate sample ID, missing expected document, too many inputs, or invalid candidate dimensions.

Response validation fails on a missing vector list, wrong vector count, wrong dimensions, non-finite value, or failed unit-norm check.

No automatic retry behavior is approved for the first paid sample. A failure returns to owner review before another provider call.
