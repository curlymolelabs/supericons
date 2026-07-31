# Agent UX contract refinement Railway release

## Scope

This release changes only the hosted MCP agent contract and response guidance. It does not change search ranking, query planning, result selection, telemetry, database schema, npm, the website, or directory listings.

## Candidate

- Source commit before the release record: `8824a9588ffaad9b7b5a87639e5b543e55f296e5`
- Target service: Railway production service `scintillating-imagination`
- Hosted MCP URL: `https://mcp.supericons.dev/mcp`
- Pre-release deployment: `094b470a-e633-4f86-9ce6-19da91cc2a55`
- Rollback source: `70f1252926c0cbc92d0d1470098e9d4641a122d0`

## Pre-release verification

The following checks passed against the exact candidate source:

- MCP agent UX contract
- Explicit SI library access through the real local MCP process
- Search library modes, 15 of 15
- Agent-friendly error and output schemas
- One-call search contract
- Preview image and exact-reference resolution
- Hosted route integrity and error visibility
- Protected public artifact checks
- Hosted product matrix, 39 of 39 through HTTP and MCP

The existing unrelated `si:wok` semantic-document failure is outside this release and is unchanged by it.

## Deployment result

- Source commit: `ec5ed82db1f6781b854fedfef4d7b5660c8b6528`
- Railway deployment: `c8e7bf9f-1e5c-40b3-b326-1b1ddf277001`
- Railway image: `sha256:dfbb3ef144f0b44daa38cbe9cc4f495b8195d4635e0e0ab965c1af67ec42f44b`
- Status: successful
- Public health: healthy, version `0.4.26`, hosted circuits closed
- Controlled live product matrix: 39 of 39 passed through public HTTP and hosted MCP
- Hosted search modes remained `hosted`, `hosted_fused`, or `local_fallback` as expected
- Honest no-result cases remained empty

The focused live MCP contract check also passed:

- Server instructions say an omitted library means all libraries
- Server instructions tell agents not to infer `si` from the product name
- An omitted-library database search returned five libraries in `all` mode
- An explicit `si` search returned only SI refs in `strict` mode
- Preview output included the browser fallback guidance
- A missing icon returned `icon_not_found` through the declared output schema

The live matrix used signed controlled-run headers, so its calls remain test traffic.

No npm publication, Netlify deployment, Supabase change, telemetry change, or directory update occurred.

## Rollback

If a post-release hosted check fails, deploy the pinned rollback source to the same Railway service, then verify `/health` and the controlled hosted product gate. npm and Netlify require no rollback because this release does not change them.

The pre-release Railway reference is deployment `094b470a-e633-4f86-9ce6-19da91cc2a55` with image `sha256:26b71e38a3cb538eea9f3fb8b001a6871f8b38cfbae3b8d3e6005e27d4921e80`. Railway marks the superseded deployment as removed, so operational rollback uses a new deployment from the pinned source rather than assuming the old container remains active.
