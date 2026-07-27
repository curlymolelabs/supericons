# Local MCP telemetry v3 contract

Date: 2026-07-28

Status: implemented and production verified

Endpoint: `POST /rest/v1/rpc/si_log_local_mcp_search_outcome_v3`

## Purpose

The endpoint records one final Local MCP search outcome without changing the
search response. Supabase converts the package installation identifier to a
server-keyed hash before any telemetry row is written.

The existing `si_log_mcp_search_outcome_v2` RPC remains available for older
packages and for a new package that cannot persist its installation file.

## Request

The request body uses a `p_payload` JSON object and is limited to 8 KiB.

| Field | Required | Limit |
| --- | --- | --- |
| `contract_version` | Yes | Must equal 3 |
| `install_id` | Yes | Random UUID version 4 |
| `episode_id` | Yes | Random UUID version 4 |
| `attempt_id` | Yes | Random UUID version 4 |
| `recovery_chain_id` | Yes | Random UUID version 4 |
| `query` | Yes | 1 to 500 normalized characters |
| `result_count` | Yes | Integer from 0 through 100000 |
| `library_filter` | Yes | Token up to 80 characters |
| `library_mode` | Yes | `strict`, `prefer`, or `all` |
| `search_outcome` | Yes | `results`, `clarification`, `zero`, or `error` |
| `tool_name` | Yes | `search_icons` or `recommend_icons` |
| `locale` | No | Text up to 32 characters |
| `confidence_label` | No | `low`, `medium`, or `high` |
| `beta_cohort` | No | Token up to 80 characters |
| `mcp_server_version` | No | Text up to 40 characters |
| `latency_ms` | No | Integer from 0 through 600000 |
| `client_family` | Yes | Normalized token up to 64 characters |
| `client_version` | No | Text up to 40 characters |
| `os_platform` | Yes | `win32`, `darwin`, `linux`, or `other` |
| `session_hash` | No | Existing 64-character SHA-256 value |

Unknown request fields are rejected and never stored.

## Trusted server fields

The package cannot choose these values:

- `install_hash`: HMAC-SHA-256 of the raw installation UUID using a server-only
  versioned secret
- `install_key_version`: current server key version
- `country_code`: validated `cf-ipcountry` supplied by Supabase infrastructure
- `geo_source`: `supabase_postgrest_cf` only when a country is accepted
- channel: `local_mcp`
- environment: `production`
- created time: server time

The endpoint ignores `x-vercel-ip-country` and `x-country-code`. A live
controlled request supplied NZ, CA, and JP, but Supabase stored SG from its own
country header.

## Response

Accepted first write:

```json
{
  "accepted": true,
  "duplicate": false
}
```

Accepted repeat of the same episode:

```json
{
  "accepted": true,
  "duplicate": true
}
```

## Failure behavior

| Result | Meaning | Package behavior |
| --- | --- | --- |
| Success | Accepted or already recorded | Stop |
| 400 validation error | Invalid or unsupported payload | Drop telemetry |
| 404 | Endpoint is definitively absent | Retry once through v2 |
| `PGRST202` | Endpoint signature is definitively absent | Retry once through v2 |
| Rate limit | Per-installation rate reached | Drop telemetry |
| Server failure | Temporary server failure | Drop telemetry |
| Timeout or connection failure | Delivery is unknown | Drop telemetry |

Only a definitive missing endpoint or signature permits v2 fallback after a
v3 attempt. This avoids duplicates when v3 may already have committed.

## Privacy and logging

- The raw installation UUID exists only in package memory, the local
  `install.json` file, and the in-memory database function call.
- The database function never writes or logs the raw UUID.
- The database function never stores or logs raw IP addresses or forwarded
  address headers.
- The production verification found no raw installation UUID in stored event
  rows.
- Installation hashes remain in protected tables for at most 90 days.
- Shareable downloads never include `install_hash`.

## Rate and timeout behavior

The endpoint allows at most 120 telemetry requests per installation per
minute. Package delivery uses a 750 ms timeout and runs separately from the
tool response. A telemetry failure cannot delay, fail, or change a search.
