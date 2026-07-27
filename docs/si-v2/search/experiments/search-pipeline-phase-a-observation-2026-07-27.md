# Search pipeline Phase A observation

Date: 2026-07-27

## Source

- Snapshot: `supericons-request-log-24h-20260727T113649Z.csv`
- SHA-256: `756A2F0706366165B6E0C7CB9CB0EAE3AF4FEBF2D15E7BCEA3616EA0CC75A9FD`
- First event: `2026-07-26T11:44:29.419196Z`
- Last event: `2026-07-27T11:17:50.209527Z`
- Source rows: 288

The source snapshot contains private production query text and is not committed. The hash identifies the reviewed input without publishing it.

## Reproducible filter

Filter the CSV to:

- `channel = local_mcp`
- `tool_name = search_icons`
- `server_version = 0.4.22`

Group the filtered rows by `outcome`, `traffic_class`, and `estimated_client_id`. Do not publish the identifier values.

## Observed result

- Stable local search outcomes: 77
- Success outcomes: 53
- Zero outcomes: 24
- Traffic classification: all 77 rows are `unclassified_live`
- Largest estimated client concentration: 67 of 77 rows

## Interpretation boundary

The observation confirms that stable local outcomes are being recorded. It does not establish organic adoption, a genuine user zero rate, or an installation count. Controlled traffic cannot be reliably excluded because all rows are unclassified, and the current estimated client identifier is episode-like rather than an installation identity.

The sanitized equivalence corpus uses only generic reviewed reproductions. Raw production query text is not copied into the repository.
