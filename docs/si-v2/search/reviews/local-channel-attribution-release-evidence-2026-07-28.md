# Local channel attribution release evidence

Date: 2026-07-28

Status: production telemetry and dashboard verified, npm package staged privately, npm publication paused for owner approval

## Outcome

Local MCP package `0.4.24` adds best-effort installation, client, operating
system, and country attribution without changing search behavior.

The package sends final Local MCP outcomes to
`si_log_local_mcp_search_outcome_v3`. Supabase supplies the trusted country,
hashes the installation identifier with a server-only key, and writes only the
hash. The existing v2 RPC remains available for older packages and as the
narrow missing-v3 fallback.

## Frozen baseline

The 24-hour baseline from 2026-07-26 17:06:35 UTC to 2026-07-27 17:06:35 UTC
contained:

- 77 Local MCP events
- 77 Local MCP final outcomes
- 53 result-bearing outcomes
- 24 zero outcomes
- 0 country values
- 0 installation identities
- package version 0.4.22 on all 77 rows

Source:
`docs/si-v2/search/reviews/local-channel-attribution-baseline-2026-07-28.json`

## Trusted country result

The Supabase PostgREST path resisted caller spoofing. A controlled request sent
NZ, CA, and JP through caller-controlled country headers. Supabase recorded SG
from its own `cf-ipcountry` context.

The production v3 verification also confirmed:

- one final outcome for one episode
- one usage row and one final row after a duplicate retry
- v2 still accepts older package writes
- v2 attribution fields remain null
- raw installation identifier stored: false
- controlled rows added to the ordinary dashboard: 0

Source:
`docs/si-v2/search/reviews/local-channel-attribution-v3-production-verification-2026-07-28.json`

## Privacy and safety boundaries

- Supericons telemetry records do not store raw IP addresses.
- Supabase infrastructure processes network information and may retain request
  metadata according to its platform logging policy.
- Raw installation UUIDs are never stored or logged.
- Installation hashes use a server-only, versioned HMAC key.
- Installation hashes are retained for at most 90 days.
- The package preserves all four telemetry opt-outs.
- The request body is limited to 8 KiB.
- Fields have strict type and length limits.
- The endpoint limits one installation to 120 requests per minute.
- Package telemetry has a 750 ms timeout and runs outside the tool response.
- Fallback to v2 occurs only for a definitive missing v3 endpoint or signature.
- Shareable dashboard output never exposes installation hashes.

## Production state

### Supabase

Applied migrations:

- `20260728100000_local_mcp_attribution_v3.sql`
- `20260728110000_local_mcp_attribution_v3_public_ingest.sql`

The failed Edge feasibility path was removed. The final endpoint is the
geo-aware PostgREST RPC:

`POST /rest/v1/rpc/si_log_local_mcp_search_outcome_v3`

### Admin dashboard

- Active admin API version: 116
- Active admin API hash:
  `a245155d9fb9e96dbd4df3334c4e141de75b8231fb616ddbc27283ef741605c9`
- Local npm panel shows observed, new, and returning installations
- Breakdown includes country, client, package version, and operating system
- Default view excludes controlled traffic
- Existing Include test traffic filter reveals controlled verification rows
- Live browser test found 4 controlled installations and no private identifiers

Source:
`docs/si-v2/search/reviews/local-channel-attribution-dashboard-live-2026-07-28.json`

## Search isolation

The clean-installed package and the downloaded npm stage both passed:

- 225 of 225 maintained stdio cases
- fixed search fingerprint:
  `84a5e8b3c1b4e31e25cc865b37f397effb6c6c4c820b98706995012b8b80e3ff`
- stdio route fingerprint:
  `c447744c04d2d7628959f685090b95159f912c5ca74ce3ec950d0c3175f89f44`
- ordered result parity: passed
- response bytes with delayed telemetry: unchanged
- ordered results with delayed telemetry: unchanged
- v2 retry after an unknown delivery result: 0

Search v2, ranking, queries, results, recommendations, tool schemas, website
search, Hosted MCP, routing, and allowances were not changed.

## Package security

The package requires MCP SDK `^1.30.0` and Node.js 20 or newer. Its lockfile
resolves MCP SDK `1.30.0` and Hono server `2.0.12`.

The candidate passed three consumer checks:

- a fresh installation;
- an upgrade from public package `0.4.23`; and
- an upgrade from a forced legacy state using MCP SDK `1.27.1` and Hono server
  `1.19.14`.

All three finished on MCP SDK `1.30.0` and Hono server `2.0.12`.

Final production dependency audit:

- total vulnerabilities: 0
- high vulnerabilities: 0
- critical vulnerabilities: 0

Source:
`docs/si-v2/search/reviews/local-channel-attribution-npm-security-verification-2026-07-28.json`

## Private npm stage

- Package: `@supericons/mcp@0.4.24`
- Stage ID: `404298b5-a643-4b6e-a316-9b2f50c12830`
- Intended tag after approval: `latest`
- Files: 71
- Packed size: 6,190,093 bytes
- Unpacked size: 25,863,134 bytes
- npm shasum: `1c38b87c1ff420cd215f4f55f4009c1cbf90ca4b`
- Archive SHA-256:
  `3e1af277c1a6b83bb1ca21625c7c2f5058086d12f3b2e67468ad2e0c1c87b186`
- Downloaded stage SHA-256: exact match
- Downloaded stage security audit: 0 vulnerabilities
- Downloaded stage search contract: 225 of 225 passed
- Current public `latest`: `0.4.23`
- Published: false

The superseded stage `87ae615a-d477-4c83-8879-f26ac983e420` was rejected and
removed before this replacement was created.

The owner must approve this exact stage before npm can publish it.

## Independent rollback targets

### Supabase data model

Run the reviewed rollback files in this order:

1. `supabase/migrations/rollback/20260728110000_local_mcp_attribution_v3_public_ingest.down.sql`
2. `supabase/migrations/rollback/20260728100000_local_mcp_attribution_v3.down.sql`

This leaves the existing v2 RPC available.

### Telemetry endpoint

Run only the public-ingest rollback file to remove v3 package access while
keeping the internal v3 data model and v2 RPC.

### npm

Before approval, reject stage `404298b5-a643-4b6e-a316-9b2f50c12830`.

After approval, if rollback is required, restore `latest` to `0.4.23` and
deprecate only `0.4.24`.

### Admin dashboard

Restore admin API version 115, hash
`81b721424af07ec5c023aa6acb8a1a4aceae9892de8250f6cedd6c8b8fc9b04d`,
and revert the Local npm dashboard commits.

## Expected early dashboard state

Organic attribution begins only after users install version `0.4.24`. Until
publication and adoption, the normal dashboard can truthfully show zero
measured installations. Controlled verification rows are visible only when
test traffic is included.
