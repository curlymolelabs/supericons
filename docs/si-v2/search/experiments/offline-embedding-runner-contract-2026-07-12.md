# Search v2 offline embedding runner contract

Date: 2026-07-12

Status: `plan` and `dry-run` implemented locally; networked modes not implemented

The separately bounded sample plan and provider-response validation contract lives in [`offline-embedding-sample-contract-2026-07-12.md`](offline-embedding-sample-contract-2026-07-12.md). No provider executor is implemented.

## Name

Search v2 offline embedding runner.

## Caller

An internal operator running a local repository command before any provider-backed embedding experiment.

## Trigger

- `npm run plan:search-v2-embeddings`
- `npm run dry-run:search-v2-embeddings`

Optional CLI inputs:

- `--candidate <id>` selects one or more comma-separated candidate IDs;
- `--batch-size <positive integer>` changes the planning batch size; and
- `--mode plan|dry-run` is restricted to the two local modes.

## Auth and permissions

No authentication or provider key is used. These modes do not permit network access or writes. Future provider-backed modes require a separate approved contract and are intentionally rejected by this runner.

## Input shape

The runner reads:

- `public/icon-index.json`;
- `public/registry/records.json`;
- generated semantic documents in memory; and
- `data/semantic-search-v2/embedding-candidates.json`.

Each candidate requires a stable ID, provider, exact model ID, dimensions from 1 through 2,000, document input type, query input type, and purpose.

## Output shape

The JSON output includes:

- schema and mode;
- `network_allowed: false` and `writes_allowed: false`;
- document, character, byte, type, locale, and skipped counts;
- a deterministic content fingerprint;
- selected candidate metadata;
- a deterministic proposed embedding version; and
- in dry-run mode, batch count and the first five document IDs.

The runner does not estimate provider token billing because providers tokenize differently. A future sample mode must use provider-reported usage before any spend forecast is treated as verified.

## Side effects

None. Both modes read local public-safe artifacts and write only JSON to standard output.

## Failure modes

- Unknown CLI arguments fail with a clear error.
- Any mode other than `plan` or `dry-run` fails closed.
- Missing or malformed candidate data fails before planning.
- Duplicate candidate IDs fail validation.
- Dimensions above the planned pgvector HNSW limit fail validation.
- Missing or duplicate semantic document IDs fail validation.
- Unknown requested candidates fail validation.

No retry behavior is needed because these modes have no downstream dependency or external side effect.

## Current verified plan

The local 2026-07-12 plan reports:

- 75,810 documents;
- 15,162 documents for each of the five document types;
- 8,471,270 content characters;
- 8,471,510 UTF-8 bytes;
- 41 skipped records;
- five candidate configurations; and
- only the `en` locale in generated semantic documents.

The all-English document plan is a known limitation. It does not satisfy the multilingual model-selection contract.
