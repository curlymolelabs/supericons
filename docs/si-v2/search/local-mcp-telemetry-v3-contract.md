# Local MCP telemetry v3 contract

Date: 2026-07-28

Status: implementation contract

Endpoint: `POST /functions/v1/local-mcp-telemetry`

## Purpose

The endpoint records one final Local MCP search outcome without changing the
search response. It hashes the package installation identifier before any
database write.

The existing `si_log_mcp_search_outcome_v2` RPC remains available for older
packages and for a new package that cannot persist its installation file.

## Request

The request body is JSON and is limited to 8 KiB.

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

Unknown request fields are ignored and never stored.

## Trusted server fields

The package cannot choose these values:

- `install_hash`: HMAC-SHA-256 of the raw installation UUID using a server-only
  versioned secret
- `install_key_version`: current server key version
- `country_code`: validated `cf-ipcountry` supplied by Supabase infrastructure
- `geo_source`: `supabase_edge_cf` only when a country is accepted
- channel: `local_mcp`
- environment: `production`
- created time: server time

The endpoint ignores `x-vercel-ip-country` and `x-country-code` because the
live preflight proved callers can forge them.

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

Both responses use HTTP 202.

## Failure behavior

| Status | Meaning | Package behavior |
| --- | --- | --- |
| 400 | Invalid or unsupported payload | Drop telemetry |
| 401 | Project key missing or invalid | Drop telemetry |
| 404 | Endpoint is definitively absent | Retry once through v2 |
| 413 | Body exceeds 8 KiB | Drop telemetry |
| 415 | Body is not JSON | Drop telemetry |
| 429 | Rate limit reached | Drop telemetry |
| 500 to 599 | Temporary server failure | Drop telemetry |
| Timeout or connection failure | Delivery is unknown | Drop telemetry |

Only a definitive HTTP 404 permits v2 fallback after a v3 attempt. This avoids
duplicates when v3 may already have committed the event.

## Privacy and logging

- The raw installation UUID exists only in package memory, the local
  `install.json` file, and the in-memory endpoint request parser.
- The endpoint never writes or logs the raw UUID.
- The endpoint never stores or logs raw IP addresses or forwarded address
  headers.
- Error logs contain only a fixed error code.
- Installation hashes remain in protected tables for at most 90 days.
- Shareable downloads never include `install_hash`.

## Rate and timeout behavior

The endpoint allows at most 120 telemetry requests per installation per
minute. Package delivery uses a short timeout and runs separately from the
tool response. A telemetry failure cannot delay, fail, or change a search.
