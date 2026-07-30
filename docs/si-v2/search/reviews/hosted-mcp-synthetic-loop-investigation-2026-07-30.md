# Hosted MCP synthetic loop investigation

Date: 2026-07-30

Status: Investigation complete

Scope: The recurring query `assessment checklist quality assurance`

## Executive conclusion

The recurring traffic is consistent with an automated MCP test or monitoring loop.

It is not a dashboard duplicate. Each recorded search has its own event and episode identity. The repeated `1 icon` result is also accurate because the recurring caller requested a maximum of one result.

The available evidence does not identify the operator. A hosted MCP directory, remote test, or cloud agent is possible, but naming a specific vendor would be speculation.

Recommended action:

- Keep the traffic classified as `unclassified_live`.
- Do not block it.
- Do not relabel it as a controlled Supericons test.
- Do not change Search v2 for this traffic pattern.
- Do not treat the repeated searches as independent human demand.

## Question investigated

The dashboard repeatedly showed:

- Query: `assessment checklist quality assurance`
- Channel: Hosted MCP
- Result: 1 icon
- Returned icon: `lucide:list-check`

The investigation asked:

1. Is the dashboard duplicating one request?
2. Did Supericons agents generate the recurring traffic?
3. Is the traffic an attack?
4. Why does the dashboard show one icon?
5. Should the traffic change search quality decisions?

## Directly verified export evidence

Evidence file:

`C:\Users\guanh\Downloads\supericons-audit-bundle-24h-20260730T052918Z.json`

Export cutoff:

`2026-07-30T05:29:18.196Z`

The request log contains 14 exact matches for the query:

| Check | Result |
|---|---:|
| Hosted MCP request rows | 14 |
| Unique event identifiers | 14 |
| Unique episode identifiers | 14 |
| Requests with limit 1 | 12 |
| Requests with limit 5 | 2 |
| Requests classified as `unclassified_live` | 14 |

The largest repeated group contains:

- 11 searches from the same anonymized searcher identifier
- Client family recorded as `unknown`
- Strict Lucide library filter
- Requested limit of 1
- One returned reference: `lucide:list-check`
- Separate event and episode identifiers for every search

This proves that the dashboard is showing distinct recorded searches, not multiplying one stored event.

The export also contains three other searches for the same text:

- One unknown client requested five results and received five Lucide references.
- One other unknown client requested one result.
- One ChatGPT client requested five results and received one result.

These rows should not be assumed to have the same operator merely because the query text matches.

## Production source audit findings

The following findings came from the separate production source audit and are not all represented in the downloadable audit bundle:

1. Each recurring cycle opened a fresh MCP request sequence.
2. RPC request 1 called `search_icons` with strict Lucide and `limit=1`.
3. RPC request 2 immediately called `get_icon` for `lucide:list-check`.
4. The same anonymized identity and user-agent hash recurred.
5. No API key was present.
6. Calls were read-only and successful.
7. Local task records contained only one comparable Supericons call, with `limit=5`, not the recurring limit-1 sequence.
8. At the source audit cutoff, the recurring loop had stopped. This was a point-in-time observation, not proof that it will not return.

Raw identity and user-agent hashes are intentionally omitted from this report.

## Attribution assessment

| Possibility | Assessment | Basis |
|---|---|---|
| Dashboard duplication | Rejected | Every exported row has a unique event and episode identity. |
| Known local Supericons agent tasks | Rejected for the recurring loop | Their comparable recorded call used limit 5, not the repeated limit-1 sequence. |
| Attack | Very unlikely | Low volume, fixed inputs, read-only tools, successful responses, and no mutation or error probing. |
| External automated MCP test or monitor | Most likely | Repeated fixed two-call sequence with fresh sessions and the same anonymized caller signals. |
| Specific vendor, including Smithery | Unverified | `client_family` is `unknown` and no recorded field proves vendor identity. |

## Why the result count is correct

The recurring caller asked for one result. Returning one icon therefore means the server satisfied the requested limit.

The dashboard should communicate this as:

`1 icon of 1 requested`

It must not imply that Supericons found only one possible icon unless the caller requested more than one.

For analysis, requested-limit distribution must remain available in exports. A low result count without the requested limit is not enough to judge search quality.

## Dashboard and demand implications

This traffic currently remains in live totals because it is unsigned and cannot be safely attributed to a controlled Supericons run.

That is the honest classification, but it creates an interpretation limit:

- It counts as real external Hosted MCP traffic.
- It should not be described as confirmed human demand.
- Its repeated query frequency should not drive synonym, ranking, or icon decisions by itself.
- Search quality analysis should separate requests capped at one result from genuine low-recall requests.

Supericons-controlled verification agents should continue using signed controlled-run markers so their traffic is excluded from normal product totals.

## Decision boundary

Do:

- Keep `traffic_class = unclassified_live`.
- Keep the events in the audit trail.
- Show the requested limit beside the result count.
- Preserve requested-limit distribution in exports.
- Monitor recurrence and volume.

Do not:

- Guess the vendor.
- Reclassify the traffic as controlled without a verified signature.
- Block the caller based on the current evidence.
- Change Search v2 ranking, retrieval, aliases, or results because of this loop.
- Count each repetition as a separate confirmed user need.

## When to reopen the investigation

Reopen only if one or more of these conditions occur:

1. The loop runs continuously for more than 24 hours.
2. Request volume rises materially.
3. The tool sequence changes beyond the fixed search and icon lookup.
4. Requests begin probing errors, authentication, write paths, or mutations.
5. Latency, allowance use, or service health is materially affected.
6. New telemetry provides a verified platform or vendor identity.

If none of these occurs, no product or security response is warranted.

## Instructions for the next agent

Treat this as a traffic attribution and dashboard interpretation issue, not a Search v2 defect.

Any follow-up must preserve these boundaries:

- No Search v2 change.
- No vendor attribution without direct evidence.
- No retroactive controlled classification.
- No blocking based only on repeated query text.
- Direct gateway diagnostics must remain separate from product search outcomes.

Related search-gap context:

[Assessment checklist recall-gap handoff](./search-v2-assessment-checklist-recall-gap-handoff-2026-07-30.md)
