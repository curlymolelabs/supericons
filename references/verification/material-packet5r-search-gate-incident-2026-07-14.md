# Material Packet 5R search-gate incident

Date: 2026-07-14

Status: Packet 5R stopped. Production `mcp-search` version 37 is active. Packets 6 and 7 are blocked.

## Approved scope

Packet 5R was approved for fingerprint `57ec4b352a2446d1b18a891e1cc74a4bcf9775a5aa142c7410ab3475b49cb026`. It authorized one stable `mcp-search` deployment, the 92-query Material release gate, and the two treatment measurements. It did not authorize rollback.

## Preflight and deployment

The preflight passed before deployment:

- The worktree was clean.
- All three write-once evidence paths were absent.
- The approval fingerprint reproduced exactly.
- Production `mcp-search` was active at version 36 with bundle SHA-256 `3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5` and `verify_jwt=false`.
- The 19-file deploy surface reproduced aggregate SHA-256 `050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733` and passed Deno checking.
- The release-runner and treatment-runner verification commands passed.

Only `mcp-search` was deployed. Production advanced from version 36 to active version 37 with bundle SHA-256 `3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01` and `verify_jwt=false`.

## Gate failure

The 92-query gate stopped on its first HTTP response before writing its evidence artifact. The assertion was:

```text
grouped search response count changed
undefined !== 24
```

`tmp/material-search-production.json` does not exist. Neither treatment measurement ran, and neither treatment artifact exists. No rollback ran.

## Verified cause

The production endpoint accepts one search request per POST. `supabase/functions/mcp-search/index.ts` passes each request directly to `handleSearchRequest` and has no grouped `{ queries: [...] }` contract.

The failed verifier instead sent 24 logical searches inside one `{ queries: [...] }` envelope and expected a `{ responses: [...] }` envelope back. Its local test server implemented that test-only grouped contract, so the local gate passed without matching production. The production endpoint returned an ordinary single-response body, which had no `responses` array.

This failure does not establish whether Material serving passed or failed. It establishes that the release verifier used the wrong HTTP contract and therefore never reached its first Material result assertion.

## Local correction

The release verifier now sends each of the 92 checks as its own stable-endpoint POST. Every request keeps the approved `verify`, `internal_test`, `production`, `material_release_gate`, and `search_icons` audit identity plus a unique dedupe key. The local test server now rejects a grouped query envelope, so this contract mismatch cannot pass locally again.

Local verification passed with 92 individual requests, 40 relevance checks, 50 smoke checks, two all-mode checks, five hosted MCP tool checks, and no hosted system access.

## Recovery rule

Do not rerun Packet 5R. Prepare a new no-deploy approval packet bound to active version 37, its bundle hash, the corrected verifier hashes, the absent write-once evidence paths, the same 92-query criteria, and the same treatment latency limits. No deployment or rollback is part of that recovery packet.
