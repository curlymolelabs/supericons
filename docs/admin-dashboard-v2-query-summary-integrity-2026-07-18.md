# Admin dashboard query summary integrity

Date: 2026-07-18

> Historical evidence: this record describes the version 78 query-level summary. The current Search history contract in `docs/admin-dashboard-v2-prd-2026-07-17.md` keeps different searchers in different rows.

## Problem

The query table combined repeated telemetry into summary rows, but the display made each row look like one event. Three presentation defects followed:

1. The group key did not previously include venue, so a repeatable aggregation could still combine Local MCP and Hosted MCP records.
2. Distinct privacy-safe identifiers were labelled as clients, which could be mistaken for people or registered accounts.
3. The API exposed only the minimum result count for a group. The browser then added `min`, which looked like minutes and hid variation between searches.

Deterministic processing only means the same inputs produce the same output. It does not make an incomplete grouping key or a misleading label correct.

## Corrected data contract

The query table is now labelled **Query summary**. Its documented row grain is:

- query
- library
- query origin
- venue

Repeated activity at that grain is combined.

The visible table now shows:

- **Activity**, such as `4 searches` or `1 lookup`
- **Returned**, with a unit such as `15 icons`, `1 primary pick`, or `1 match`
- an exact returned count when every sample agrees
- a range such as `2 to 8 icons` when samples differ
- an unavailable state when older rollups do not contain enough information

Privacy-safe identifiers remain available in the API as `estimated_client_id_count` for relative reach analysis and worklist prioritization. They are no longer shown as people in the query summary. Their contract states that they are not a people or account count.

The broader dashboard now uses **Estimated reach** instead of **Unique clients** where the source is privacy-safe identifiers. Registered and Pro totals are presented as separate account totals, not as stages in a conversion funnel.

## Verification

Implementation commit: `12f9237e3`

Source fingerprint: `64c0bff9c0f4bb307c2ee28dc7218e9b6c4bc53e20fee5eb033403cf012d83fb`

Local checks:

- dashboard V2.1 contract passed
- helper contract passed 15 cases
- telemetry integrity contract passed 16 checks
- browser contract passed with 33 API requests, three navigation sections, and three inline SVG charts
- error-state contract passed four cases
- operator contract passed
- production build passed
- diff secret scan passed

Production checks:

- `admin-api` version 78 is active with JWT verification disabled as required by the existing admin-secret boundary
- `mcp-search` remains unchanged at version 39
- no database migration, storage change, npm publication, or MCP search deployment occurred
- 100 latest query rows produced zero semantic contract errors
- Local MCP `shield lock` remained separate from two older Hosted MCP groups
- the Local MCP row showed `1 search` and `15 icons`
- the Hosted MCP rows showed `3 searches` and `10 icons`, with two countries stated as a grouped count
- the user-level gatekeeper recommendation showed `1 search` and `1 primary pick`
- the live browser walkthrough passed with 18 API requests, 25 latest activity rows, four SVG charts, a 67 ms warm render, no horizontal overflow, and no credential prompt
- the live API contract passed all routes and supported windows, with warm requests below the 5 second limit

Production pin after the change:

- `admin-api` version 78: `143730d8bf23c0c15a4e44f05ce6aa006c7573466ca0eb96d752f4f669672994`
- `mcp-search` version 39: `90c21f737fa5ac3a1162e8ba527b94c97555e9bd93c94afd4845a66298f570ce`
