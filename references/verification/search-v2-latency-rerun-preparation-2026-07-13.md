# Search v2 latency rerun preparation verification

Date: 2026-07-13
Status: local preparation passed; external rerun awaits owner approval
Manifest SHA-256: `5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6`

## Bound commits

| role | commit | verified state |
| --- | --- | --- |
| Shared base | `5a2d054af` | Stable tie ordering, distinct family retrieval, repeated parity harness, localized MCP measurement |
| Control | `53191e366` | Existing candidate RPC, no final SVG lookup |
| Treatment | `87c445b7c` | Lightweight candidate RPC, final SVG lookup enabled |

Control and treatment differ only in `supabase/functions/mcp-search-v2-beta/index.ts` and only in the three measurement flags.

## Verification

| check | result |
| --- | --- |
| Ranking policy and distinct `cog` retrieval | Passed |
| Shared ranking runtime byte parity | Passed |
| Deterministic tie ordering | Passed |
| 225-case Phase 1 suite | Passed, fingerprint `564464d5da3416a956ff6d900ee1ccf09f3fa491b2b72e7bff3de75c273e08b2` |
| Library modes | Passed, 15 cases |
| Complete handler HTTP parity | Passed, five cases |
| Repeated live-parity verifier | Exact match passed; changed body and below-minimum results rejected |
| Measurement runner fingerprint gate | Invalid hash rejected before network activity |
| Control beta Gate A | Passed |
| Treatment beta Gate A | Passed |
| Control and treatment Deno checks | Passed |

## Authorization boundary

- Maximum isolated deployments: six.
- Hosted SQL mutations: zero.
- Migration-history repairs: zero.
- Production function deployments: zero.
- npm actions: zero.
- Model-provider calls: zero.
- Scheduled warm pings: zero.

The earlier migration remains an existing dependency and is not part of this authorization.

## External state

No hosted function, database, npm package, Netlify site, provider, or user message was changed during this preparation.
