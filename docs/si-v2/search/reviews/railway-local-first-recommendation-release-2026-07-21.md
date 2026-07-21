# Railway local-first recommendation release

Date: 2026-07-21
Status: deployed and observed live

## Release identity

- Source commit: `49581b67612ccc797123425125ab42bd8c5832fb`
- Service: `scintillating-imagination`
- Public endpoint: `https://mcp.supericons.dev`
- Deployment: `ff667522-5e54-426d-b737-04a415e0b59e`
- Prior deployment and rollback target: `3745b7da-abd8-4f7d-8c53-5406c9f205ac`

The deployment changed only the Railway MCP service. It did not publish npm, deploy a Supabase function, or enable hosted allowance enforcement.

## Local release gates

The exact source passed:

- the real HTTP Railway MCP recommendation verifier;
- 1, 10, and 20 English slots;
- Japanese 20 slots;
- Material solid recommendations;
- a six-slot Lucide quality case;
- clarification without retrieval;
- zero hosted search requests on successful local execution;
- one stable hosted fallback request after an injected local engine exception;
- telemetry failure without user-call failure;
- accurate fallback SVG style labels;
- Material Railway server compatibility;
- agent-readable errors and 20-slot input handling;
- MCP public package safety for 67 packed files;
- the fixed 225-case suite with unchanged fingerprint `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`.

## Live result

Railway health reports local-first enabled with 27,486 indexed icon entries, 15,209 semantic records, and index generation time `2026-07-19T20:30:08.523Z`.

| live case | result | duration |
| --- | --- | ---: |
| 1 slot | 1 of 1 resolved | 523.0 ms |
| 10 slots | 10 of 10 resolved | 2,288.3 ms |
| 20 slots | 20 of 20 resolved | 2,250.1 ms |
| Japanese 20 slots | 20 of 20 resolved | 1,760.5 ms |
| Material solid | 3 of 3 resolved with solid SVGs | included in passing live run |
| Clarification | `run` returned labeled interpretations and no recommendation | included in passing live run |
| Repeated 20 slots | five passing samples | 415.0 ms p95 |

Every recommendation response reported `search_runtime.mode: local_first`, `fallback_used: false`, and `hosted_search_calls: 0`.

## Telemetry and service state

A read-only production ledger check found 11 recent recommendation events from the live verifier. All 11 used channel `hosted_mcp`, execution mode `local_first`, and status `ok`. Railway reported deployment status `SUCCESS`, health remained green, and the deployment log contained no application error entry.

## Remaining observation

The release passed its immediate contract and latency gates. The planned one-day live traffic observation is not complete. During that window, review error rate, tail latency, no-result quality, fallback use, and resource stability. If a public contract or latency gate regresses, restore the prior deployment or set `SUPERICONS_RAILWAY_LOCAL_FIRST=off` while the prior image is restored.
