# Admin search quality scorecard

Status: Implemented locally. Live evidence is required after the admin API and hosted MCP telemetry changes are deployed.

## Decision supported

This scorecard supports weekly decisions about search gaps, lookup failures, recommendation reliability, telemetry health, and whether there is enough reviewed live evidence for a language-quality claim. It does not create one combined quality score because no single current field measures relevance.

## Source and grain

Use the Search history Events JSON download. Each row is one telemetry event after exact key-based source merging.

- `mcp_usage_events` rows are the source for top-level MCP tool metrics.
- `search_request_audit` rows describe lower-level hosted search work. They are diagnostics and are not added to the top-level MCP counts.
- Controlled tests, preview traffic, and local traffic are reported separately from unclassified live traffic.
- Unclassified live traffic is not called organic.
- Missing values remain null. They are not changed to zero.

This source separation prevents a hosted fallback from being counted once as a tool call and again as a lower-level hosted search.

## Metric framework

| Metric | Calculation | Decision use | Guardrail |
| --- | --- | --- | --- |
| Direct-search zero rate | Top-level live `search_icons` events with outcome `zero`, divided by all top-level live `search_icons` events | Find meaning families and locales that need retrieval work | Excludes recommendation variants, exact lookups, tests, previews, and local traffic |
| Direct-search error rate | Top-level live `search_icons` events with outcome `error`, divided by the same attempts | Detect service failures separately from content gaps | Never combine errors with zeros |
| Low-result rate | Top-level live direct searches returning one or two icons, divided by direct searches with a recorded result count | Find narrow coverage that a zero-only review misses | Report result-count coverage with the rate |
| Recommendation completion | Top-level live `recommend_icons` events with outcome `success`, divided by all top-level live recommendation events | Monitor operational completion | Completion does not prove relevance |
| Recommendation clarification rate | Top-level live recommendations with outcome `clarification`, divided by all top-level live recommendation events | Check whether request context is sufficient | Keep separate from errors and zeros |
| Exact lookup not-found rate | Top-level live `get_icon` events with outcome `not_found`, divided by all top-level live lookups | Find missing IDs, aliases, and brand coverage | Keep separate from direct-search zeros and system errors |
| Field coverage | Recorded values divided by all selected events for each optional field | Decide whether a segmented analysis is supportable | A low coverage rate blocks the affected claim, not every operational count |

Internal recommendation variants are reported only as a hosted search pipeline diagnostic. They do not represent a final user-visible failure.

## Claim limits

- Returned icon relevance is not measured until a human relevance judgment is added.
- Recommendation relevance is not inferred from completion.
- Locale analysis uses only an explicit recorded locale. It does not guess from query text.
- The proposed 100 direct-search attempts per locale is a review trigger, not an industry standard and not proof of parity.
- A live multilingual parity claim also needs reviewed relevance evidence.
- A composite quality score remains disabled because it would hide these different meanings and evidence gaps.

## Weekly run

1. In the local admin dashboard, choose the seven-day window and the intended venue and test-traffic filters.
2. Download Events JSON from Search history. Do not use Summary JSON for this scorecard.
3. Run:

```powershell
npm run analyze:admin-search-quality -- --input "C:\path\to\supericons-query-events-7d.json" --output "C:\path\to\search-quality-scorecard-7d.json"
```

4. Confirm `data_quality.trustworthy_for_operational_counts` is true before using the operational rates.
5. Review every `data_quality.blockers` item. A partial export, duplicate event identifier, invalid outcome, contradictory count, or future timestamp blocks the affected report.
6. Review primary metrics, then use hosted pipeline, exact lookup, locale, and field-coverage diagnostics to choose the next bounded fix.
7. Record relevance judgments separately before making any relevance or multilingual parity claim.

## Automated verification

Run:

```powershell
npm run verify:admin-search-quality-scorecard
```

The verifier checks traffic separation, source separation, fallback double-count protection, exact lookup classification, locale handling, incomplete-export blocking, duplicate identifiers, and unsupported claim limits.
