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

Pending.

## Rollback

If a post-release hosted check fails, deploy the pinned rollback source to the same Railway service, then verify `/health` and the controlled hosted product gate. npm and Netlify require no rollback because this release does not change them.
