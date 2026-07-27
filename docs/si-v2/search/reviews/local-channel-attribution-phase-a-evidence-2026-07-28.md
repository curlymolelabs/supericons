# Local channel attribution Phase A evidence

Date: 2026-07-28

## Result

Phase A passed.

The production window from 2026-07-26 17:06:35 UTC through
2026-07-27 17:06:35 UTC contained:

- 77 Local MCP search outcomes
- 77 linked Local MCP final outcomes
- 77 stable events without a beta cohort
- 53 result outcomes
- 24 zero outcomes
- 77 events from package version 0.4.22
- 0 country codes
- 0 IP hashes
- 0 anonymous client hashes

The current v2 RPC is present. Its definition fingerprint is:

`3af654cbe4982e0d5a2fc268a11dc535877417ea689d73171a7798590998c447`

The exact read-only query and result are stored in
`local-channel-attribution-baseline-2026-07-28.json`.

## Linkage limitation

The current package does not send episode and attempt identities. The matching
77 usage and final rows prove stable Local MCP recording is active, but they do
not prove exact final and diagnostic linkage. Exact linkage begins with v3.

## Country header preflight

A temporary RPC read the three candidate country headers. It returned only
their country values. It never returned authorization or request identity
headers.

The caller sent these test values:

- `cf-ipcountry: NZ`
- `x-vercel-ip-country: CA`
- `x-country-code: JP`

Observed behavior:

- Supabase replaced `cf-ipcountry` with the infrastructure value `SG`.
- The caller-controlled `NZ` value was not visible.
- The caller-controlled `CA` and `JP` values were visible.

Decision:

- v3 may accept only the infrastructure-controlled `cf-ipcountry` value.
- v3 must ignore `x-vercel-ip-country` and `x-country-code`.
- v3 will use a dedicated telemetry endpoint for hashing, validation, rate
  controls, and ingestion.

The temporary RPC was removed and its absence was verified. The exact safe
result is stored in
`local-channel-country-header-preflight-2026-07-28.json`.

## Reproduction

```powershell
npm run verify:local-channel-baseline-live -- --output docs/si-v2/search/reviews/local-channel-attribution-baseline-2026-07-28.json
npm run verify:local-country-headers-live -- --output docs/si-v2/search/reviews/local-channel-country-header-preflight-2026-07-28.json
```
