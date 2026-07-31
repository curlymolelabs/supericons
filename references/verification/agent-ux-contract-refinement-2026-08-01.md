# Agent UX contract refinement verification

Date: 2026-08-01

Branch: `codex/agent-ux-contract-refinement-20260801`

## Scope verified

This batch changes only the MCP instructions, argument normalization, response presentation, output schema declarations, and their regression tests.

It does not change Search v2 ranking, query expansion, candidate retrieval, result ordering, the icon catalog, website UI, telemetry, database schema, or production services.

## Regression-first proof

Before the implementation, the new focused verifier failed because an omitted library normalized to `strict` instead of `all`.

The existing library-mode verifier also failed because the local MCP schema still supplied `strict` before normalization could inspect whether a library was present.

These failures established the pre-change defect before the implementation was applied.

## Implemented behavior

- A search with no named library now uses all libraries.
- A named library with no mode remains strict.
- `prefer` or `strict` without a named library becomes all-library search with a warning.
- Literal `library = all` or `library = any` becomes no library restriction with a warning.
- Shared instructions tell agents not to infer `si`, not to guess icon IDs, to use recommendations for multiple named slots, and to expose the browser preview fallback.
- Search responses distinguish results, no-match, and tool-error outcomes.
- One verified result is not described as weak solely because its count is one.
- Result lines can include a short verified semantic reason.
- Preview responses include ready-to-use Markdown with canonical refs and a visible browser link.
- The hosted `get_icon` output schema now declares all structured not-found fields returned by the handler.

## Passing verification

| Command | Result |
|---|---|
| `npm run verify:mcp-agent-ux-contract` | Passed all focused normalization, instruction, interpretation, and preview assertions |
| `npm run verify:search-library-modes` | Passed 15 strict, prefer, and all-library cases |
| `npm run verify:mcp-agent-friendly-errors` | Passed, including strict hosted `get_icon` not-found schema validation |
| `node scripts/verify-search-v2-one-call-contract.mjs` | Passed search, no-result, preview, and recommendation contracts |
| `node scripts/verify-mcp-preview-icons-image.mjs` | Passed with a 3-icon PNG preview |
| `node scripts/verify-mcp-preview-exact-ref-resolution.mjs` | Passed known-ref, mixed-ref, duplicate, invalid-ref, and concurrency cases |
| `npm run verify:search-v2-hosted-route-repair` | Passed hosted-primary, fallback, error truthfulness, concurrency, and recommendation scope |
| `npm run verify:search-v2-protected-public-artifacts` | Passed protected npm and web artifact checks |
| `npm run verify:search-v2-phase1-parity` | Passed 225 of 225 with unchanged fingerprint `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357` |
| `npm run build` | Passed the complete production build |
| `npm run verify:search-v2-hosted-route-product` | Passed all 39 candidate HTTP and MCP product cases |

The 225-case verifier reported clean fingerprint inputs and no ordered-result change.

## Known unrelated failure

`npm run verify:semantic-search-v2` stops at `si:wok#negative#en` because its negative semantic content is not meaningful enough for that verifier. This batch does not touch the SI catalog or semantic record. The failure is recorded here and was not hidden or expanded into this task.

## Build residue

The production build refreshed six generated timestamps without changing their product fields. Those timestamp-only changes were restored to the committed values and are not part of the candidate diff.

## Release state

No deployment, npm stage, publication, database mutation, or production verification traffic occurred. This is a committed source candidate only.
