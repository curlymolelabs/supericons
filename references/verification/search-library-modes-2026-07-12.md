# Search library modes verification

Date: 2026-07-12
Environment: local workspace
Deployment state: not deployed
Publication state: not published

## Scope

This slice corrects strict-library policy bypasses and implements explicit `strict`, `prefer`, and `all` modes for `search_icons` in local MCP, hosted MCP, and the shared hosted search handler.

The request contract adds optional `library_mode` with a backward-compatible default of `strict`:

- `strict` returns only the requested library;
- `prefer` requires a requested library, puts a safe result from it first, and includes clearly labeled cross-library alternatives; and
- `all` searches every eligible library.

The response adds `library_mode` and `requested_library`. Existing icon result records retain their current shape and library labels.

## Structural correction

Policy enforcement now runs after candidate lanes merge. Strong avoid and brand-collision penalties cannot be bypassed by lexical, synonym, intent-family, or future vector candidates that use the shared final ranking function.

The maintained policy adds query-specific retrieval routes as data, not ranking branches. Bootstrap `combobox` can retrieve `chevron down`, and Phosphor `respond` recognizes the approved `phosphor:arrow-bend-up-left` family member.

## Owner-reviewed cases

All 15 library-mode cases are marked `owner_reviewed`:

- five strict cases;
- five preferred-library cases; and
- five all-library cases.

The bell family keeps `bell` and `notification` as acceptable. `alarm`, `reminder`, and `alert` remain related families.

## Verified results

`npm run verify:search-library-modes` passed all 15 cases and the synthetic tier-bypass checks.

The three previously wrong strict results now begin with:

- Bootstrap `cog`: `bootstrap:building-gear`;
- Phosphor `respond`: `phosphor:arrow-bend-up-left`; and
- Bootstrap `combobox`: `bootstrap:chevron-down`.

The evaluator reports 15 observed library cases, zero library-case zero results, zero proposed avoid hits, and zero unimplemented preferred-library cases.

## Checks

| Check | Result |
| --- | --- |
| `npm run verify:search-library-modes` | Passed: 15 cases, local and hosted synthetic modes, four tier-bypass lanes |
| `npm run verify:search-ranking-policy` | Passed: hello covers four families; picker covers five |
| `npm run verify:semantic-search-v2` | Passed: 71 cases, 37 owner-reviewed |
| `npm run verify:search-intent-graph` | Passed: 9 groups, 12 fixtures |
| `npm run verify:search-query-frame-shadow` | Passed |
| `npm run evaluate:search-v2-candidate-baseline` | Passed: zero library gaps and zero avoid hits |
| `npm run verify:mcp-variant-access` | Passed: 13 checks |
| `node scripts/verify-recommend-icons-response-modes.mjs` | Passed |
| `npm run verify:mcp-docs-setup` | Passed |
| `npm run verify:mcp-search-preview-localization` | Passed |
| Node syntax checks for changed JavaScript modules | Passed |
| MCP `npm pack --dry-run --json` from `mcp/` | Passed: both ranking-policy runtime files included |

## Known adjacent failures

Two pre-existing expectations still fail and remain in their separate triage task:

- `npm run verify:search-query-fixtures` expects `lucide:bot-off` first for `hallucination`, while current search returns `si:hallucination-warn` first.
- `npm run verify:hosted-search-engine` expects normalized synonyms to omit the record label, while the current registry row builder includes `server stack` from that label.

The backend check helper again discovered the full npm build but could not start `npm` on Windows, raising `FileNotFoundError`. The full root build was not run manually because this workspace contains unrelated uncommitted generated and application changes that the build may rewrite.

## Residual limits

- No Supabase deployment or live hosted request was performed.
- The direct hosted handler was syntax-checked and covered through shared reranker tests, but it was not executed against a local Supabase stack.
- The MCP package contents were dry-run verified, not installed from a created archive.
- Preferred-library behavior is implemented for `search_icons`; recommendation clarification and its response contract remain the next P1 feature.
- The evaluation suite remains at 71 of 225 cases, with 28 legacy cases awaiting owner confirmation.
