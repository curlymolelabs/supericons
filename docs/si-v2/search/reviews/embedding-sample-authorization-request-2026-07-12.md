# Embedding sample authorization request

Date: 2026-07-12

Status: approved for one exact sample execution

Authorization fingerprint:

```text
a95e424c435893b9009d898dcd386c79cacd382c49238c69c5729645ade8f287
```

## Exact boundary

- Four candidates: Voyage 4 Large at 1024 dimensions, Voyage 4 Lite at 512 dimensions, Gemini Embedding 2 at 1024 dimensions, and OpenAI Text Embedding 3 Large at 1024 dimensions.
- Six document inputs and six query inputs per candidate.
- Two requests per candidate, eight provider requests total.
- Maximum 12 inputs per candidate.
- No automatic retry.
- No vector storage, deployment, publication, or ranking change.
- Response checks require the expected count, configured dimensions, finite values, and unit norm within 0.02.
- Provider-reported usage is required before estimating the full experiment cost.

## Document inputs

1. Search icon showing a magnifying glass used to find information.
2. Settings icon showing a gear or cog for configuration controls.
3. Database icon showing stacked data storage cylinders.
4. Upload file icon showing a document moving upward into storage.
5. Notification icon showing a bell for alerts and updates.
6. OpenAI brand identity and official logo.

## Query inputs

1. `搜索图标`
2. `設定の歯車`
3. `資料庫`
4. `फ़ाइल अपलोड`
5. `جرس الإشعارات`
6. `OpenAI 标志`

## Request parameters

| candidate | endpoint | document setting | query setting | output |
| --- | --- | --- | --- | ---: |
| Voyage 4 Large | `POST https://api.voyageai.com/v1/embeddings` | `input_type=document` | `input_type=query` | 1024 float dimensions |
| Voyage 4 Lite | `POST https://api.voyageai.com/v1/embeddings` | `input_type=document` | `input_type=query` | 512 float dimensions |
| Gemini Embedding 2 | `POST .../models/gemini-embedding-2:batchEmbedContents` | `taskType=RETRIEVAL_DOCUMENT` | `taskType=RETRIEVAL_QUERY` | 1024 float dimensions |
| OpenAI Text Embedding 3 Large | `POST https://api.openai.com/v1/embeddings` | same text endpoint | same text endpoint | 1024 float dimensions |

Run `npm run plan:search-v2-embedding-sample` to reproduce the complete request bodies and fingerprint without a network call.

## Approval requested

Reply with:

> Approve embedding sample fingerprint `a95e424c435893b9009d898dcd386c79cacd382c49238c69c5729645ade8f287`, maximum 12 inputs per candidate, eight requests total, no retries, no storage. Sample spend cap: $[amount].

Approval authorizes implementation and execution of this exact sample only. It does not authorize full-corpus embedding generation.

## Approval recorded

Approved on 2026-07-12 with these fixed limits:

- authorization fingerprint `a95e424c435893b9009d898dcd386c79cacd382c49238c69c5729645ade8f287`;
- maximum 12 inputs per candidate;
- eight provider requests total;
- no retries;
- no vector storage; and
- a local one-run ledger that blocks concurrent or repeated execution; and
- sample spend cap of $1.

This approval is valid for one execution of the exact sample. Any changed payload, candidate, limit, or retry behavior requires a new approval.
