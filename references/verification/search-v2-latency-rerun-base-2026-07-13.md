# Search v2 latency rerun base verification

Date: 2026-07-13
Status: local base passed; not deployed

## Live observations reproduced

Read-only calls against production `mcp-search` confirmed:

- `cog` returned zero results in all, prefer, and Bootstrap strict modes;
- `gear` returned seven Bootstrap gear icons in strict mode;
- the Simplified Chinese settings query returned five results through the real MCP client after two hosted requests, first the localized query and then the maintained English expansion.

The localized client call took 5,856.092 ms in the single observation. This is not a representative latency sample.

## Hosted retrieval root cause

The ranking policy family for settings contains `cog`, `gear`, and `settings` retrieval terms. The hosted variant builder selected only the first family term. For an exact `cog` query, that first term duplicated the original query, so no useful family expansion reached the database.

The correction keeps the original query and adds the first distinct retrieval term for each family. For `cog`, the hosted variants become `cog` and `gear`. This is a generic rule and adds at most one maintained term per interpretation family. It does not expand every synonym.

## Measurement correction

The rerun harness now separates:

1. repeated direct-response parity;
2. direct hosted search latency using result-producing requests;
3. the end-to-end localized MCP retry chain; and
4. recommendation latency.

Parity uses three requests for each of five fixed cases in each variant. A variant fails if any case produces more than one response hash. Cross-variant verification requires equal status, exact body hash, result order, and SVG availability.

Every artifact requires the approved manifest hash on the command line. Missing or malformed hashes fail before any request.

## Local verification

| check | result |
| --- | --- |
| Ranking policy and `cog` retrieval variants | Passed |
| Shared runtime copies | Passed through the ranking-policy parity assertion |
| 225-case Phase 1 suite | Passed, fingerprint unchanged |
| Library modes | Passed, 15 cases |
| Deterministic tie ordering | Passed |
| Complete handler HTTP parity | Passed, five cases |
| Live parity verifier exact-match path | Passed |
| Live parity verifier changed-response path | Rejected as required |
| Measurement runner invalid fingerprint | Rejected before network activity |

No migration, function deployment, npm action, provider call, or public message occurred during this local correction.
