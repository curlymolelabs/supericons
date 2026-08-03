# Agent-friendly library recovery source record

Date: 2026-08-03

## Scope

This source change helps an agent recover after a valid strict-library zero. It does not add icons, change the catalog, change the MCP schema, change the hosted MCP URL, deploy a service, or publish a package.

Baseline commit: `beec2a540d3a69c89f107d7b1767d0eeb0e1ba6f`

Baseline MCP package version: `0.4.26`

## Product behavior

- `strict` still returns only the requested library.
- `prefer` still prefers the requested library and may recover elsewhere.
- `all` still searches all eligible libraries.
- A valid strict zero keeps `results` empty.
- After that zero, the server may run one bounded alternate lookup and place exact, query-matching alternatives in existing guidance fields.
- A hosted timeout, network failure, or server failure remains visible and cannot trigger alternate recovery.
- Tool instructions tell agents to search all libraries when the user did not name one, use `prefer` for a self-chosen library, and reserve `strict` for an explicit user requirement.
- Tool instructions state that `si` means Supericons and `simpleicons` means Simple Icons.

## Before and after examples

### OpenAI with strict `si`

Before:

- `results` was empty.
- Guidance only suggested broadening the term or removing the filter.
- No known OpenAI alternative was named.

After:

```json
{
  "code": "no_icons_found",
  "result_count": 0,
  "hint": "The requested si library had no match. Relevant alternatives exist elsewhere: tabler:brand-openai, bootstrap:openai, mingcute:openai_line.",
  "next_step": "Use get_icon with an exact alternate ref such as tabler:brand-openai, or retry search_icons once without library and with library_mode \"all\"."
}
```

The verifier followed that instruction with an all-library query and received:

```text
tabler:brand-openai
bootstrap:openai
mingcute:openai_line
```

### Copy.ai brand safety

Before, the baseline returned unrelated action icons:

```text
lucide:book-copy
lucide:clipboard-copy
tabler:clipboard-copy
material:content_copy
lucide:copy
```

After, `copy.ai`, `copy.ai logo`, `copy.ai?`, `copy.ai,`, and `Can you find copy.ai?` return an honest zero. No generic copy, clipboard, or duplicate icon is suggested.

### `.ai` file searches

The first source revision treated every `name.ai` token as a company domain. This incorrectly forced file searches such as `file.ai icon` to zero. The correction protects reviewed company domains while allowing explicit file contexts to use normal icon search.

Verified examples:

```text
file.ai icon                -> lucide:file-search and Material file icons
document.ai file            -> tabler:file-ai, tabler:file-text-ai, mingcute:file_ai_line
download design.ai file     -> file, download, and design icons
Adobe Illustrator .ai file  -> lucide:file and iconoir:adobe-illustrator
```

## Permanent fixtures

- `data/search-intent-fixtures/agent-library-recovery-corpus.json` contains 33 strict success, strict recovery, file-extension, honest brand zero, and honest catalog zero cases.
- `data/semantic-search-v2/surface-equivalence-corpus.json` binds 45 browser decisions, including all reviewed Copy.ai punctuation forms and `.ai` file contexts.
- `scripts/verify-search-agent-library-recovery.mjs` exercises the direct search pipeline, Local MCP over stdio, a Hosted MCP candidate, public HTTP, agent follow-up, hosted error visibility, and bounded recovery latency.

## Verified results

| Command | Result |
| --- | --- |
| `node scripts/verify-search-agent-library-recovery.mjs` | 33 of 33 focused cases passed. Hosted MCP and public HTTP `.ai` cases passed, hosted strict-zero recovery passed, and hosted error visibility passed. First recovery call was 801.2 ms. Warm recovery p95 was 673.4 ms under the 1,000 ms two-lookup gate. |
| `node scripts/verify-search-v2-surface-equivalence-baseline.mjs` | 45 of 45 decisions passed. |
| `node scripts/verify-search-v2-browser-equivalence.mjs` | 45 of 45 cases passed against a built browser artifact. Hosted failure remained visible. |
| `npm run verify:search-v2-phase1-parity` | 225 of 225 cases passed. Fingerprint remained `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`. |
| `npm run verify:search-v2-semantic-latency` | Local search p95 was 411.1 ms under the established 500 ms gate. First search was 639.3 ms under the 1,000 ms cold limit. |
| `npm run verify:mcp-agent-ux-contract` | Passed. |
| `node scripts/verify-search-v2-one-call-contract.mjs` | Passed. |
| `npm run verify:search-library-modes` | Passed. |
| `npm run verify:search-brand-classification-review` | Passed. |
| `npm run verify:search-v2-hosted-route-repair` | Passed. |
| `node scripts/verify-search-v2-hosted-route-integrity.mjs` | Passed. |
| `npm run verify:search-v2-hosted-route-product` | 39 product cases passed across the local candidate, hosted HTTP, and Hosted MCP fixtures. |
| `npm run verify:recommend-icons-grouped-search` | Passed, including grouped failure propagation and result parity. |
| `npm run verify:search-v2-shared-recommendation-pipeline` | Passed, including candidate identity parity and failure evidence. |

The two copies of `search-ranking-policy.js` were byte-identical at SHA-256 `D3621615DEE9A9326877A23A2B418A25FBCC1342A05A4A323EDB6064042264B2` before the corrective commit.

## Catalog gaps for the icon workstream

The pinned catalog snapshot had no exact approved identity for:

- Copy.ai
- Salesforce
- Jasper
- Ahrefs
- fighter jet
- pineapple
- mosquito

These are catalog candidates only. This workstream does not add them.

## Release impact

- Local npm users need a new package version to receive the Local MCP guidance and brand-safety correction.
- Railway needs a deployment from approved exact source bytes for Hosted MCP and public HTTP to receive the correction.
- The website needs a build and deployment from approved exact source bytes for the browser brand-safety decision.
- The existing hosted MCP URL can remain unchanged.
- The MCP input and output schemas can remain unchanged because the guidance uses existing response fields.
- ChatGPT, Codex, and other hosted clients do not need a configuration change if the hosted URL remains the same.

No release artifact is approved by this source record. npm publication, Railway deployment, and website deployment remain separate exact-artifact steps.
