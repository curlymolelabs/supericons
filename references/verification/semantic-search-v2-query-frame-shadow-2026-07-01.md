# Semantic Search v2 Query Frame Shadow Verification

Date: 2026-07-01

## Scope

This verification covers the Semantic Search v2 query-frame shadow phase.

The implementation adds opt-in query-frame diagnostics to hosted search, local MCP, hosted MCP, and recommendation flows. The default ranking and default public response shape remain unchanged unless callers request `include_query_frame`.

It also includes a recommendation rule fix found during QA: localized account/profile slots now prefer user/profile icons instead of being pulled toward permissions/security icons by expanded intent terms.

## Touched Surfaces

- `supabase/functions/_shared/search-engine/handle-search-request.ts`
- `lib/search-engine-client.js`
- `mcp/hosted-search-client.js`
- `mcp/index.js`
- `mcp/remote-server.js`
- `mcp/recommend-icons.js`
- `mcp/package.json`
- `mcp/CHANGELOG.md`
- `scripts/verify-search-query-frame-shadow.mjs`
- `package.json`

## Checks Run

| Check | Result | Evidence |
| --- | --- | --- |
| `node --check .\mcp\recommend-icons.js` | Passed | Syntax check completed with exit code 0. |
| Targeted zh-Hans settings recommendation fixture | Passed | Returned `["user","bell","shield-lock","palette","globe"]`. |
| `npm run verify:mcp-multilingual-support` | Passed | `verify-mcp-multilingual-support: ok`. |
| `npm run verify:search-query-frame-shadow` | Passed | `verify-search-query-frame-shadow: ok`. |
| `npm run verify:semantic-search-v2-smoke` | Passed | 13 smoke cases passed, including `powerful`, `license plate recognition camera scan car`, `xai`, `grok imagine`, and logo queries. |
| `node .\scripts\verify-recommend-icons-response-modes.mjs` | Passed | Produced response size summary for plan, assets, and full modes. |
| `npm run verify:hosted-search-engine` | Passed | `verify-hosted-search-engine: ok`. |
| `npm run verify:search-intent-graph` | Passed | `verify-search-intent-graph: ok (9 groups, 12 fixtures)`. |
| `npm run verify:mcp-docs-setup` | Passed | `verify-mcp-docs-setup: ok`. |
| `npm --prefix mcp run verify:public-safety` | Passed | `[public-safety] @supericons/mcp: scanned 33 packed files.` |
| `node .\scripts\verify-public-safety.mjs --verbose` | Passed | `[public-safety] supericons: scanned 1 packed files.` |
| `npm --prefix mcp run verify:package` | Passed | `@supericons/mcp@0.4.13`; `Supericons MCP package verified: 33 files, 2263264 bytes unpacked.` |

## QA Gap Found And Fixed

The multilingual recommendation verifier initially exposed a zh-Hans settings-page gap. For the account/profile slot, the recommender returned `shield-lock` instead of `user`.

Root cause: expanded intent terms were allowed to trigger generic slot rules as if they were direct slot labels. In this case, account/profile expansion terms activated permissions/security query variants, which placed `shield-lock` ahead of `user`.

Fix: `getMatchingSlotRules` now treats direct slot-label matches as the default source of slot rules. Expanded intent terms only trigger a slot rule when that rule explicitly opts in with `matchIntentTerms: true`.

## Release Notes

- MCP package metadata was prepared for `@supericons/mcp@0.4.13`.
- No Netlify deploy was run.
- No Supabase deploy or catalog sync was run.
- No npm publish was run.
- `npm run verify:mcp-docs-setup` initially hit a transient Windows `EBUSY` file lock while checks were running in parallel. It passed when rerun sequentially.

Before a public release, run the normal release flow from the main workspace and confirm hosted Supabase functions, npm, and Smithery only after approval.
