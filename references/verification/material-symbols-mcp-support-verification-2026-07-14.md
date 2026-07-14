# Material Symbols MCP support verification

Date: 2026-07-14

Status: Local implementation verified. Production migration, seed, deploy, live latency measurement, and npm publication remain owner-gated release actions.

## Scope verified

- Fixed Material outline and solid presets.
- Private Material asset schema and rollback.
- Pinned, resumable, timeout-bounded asset seeding.
- Full asset coverage for 4,262 IDs and two variants.
- Hosted direct search and grouped recommendation hydration.
- Material-aware style filtering before hydration.
- Explicit engine errors and audit error codes for unexpected asset gaps.
- Truthful local and hosted library capability advertising.
- Complete npm package contents and clean-install behavior.
- No silent ranked-result drops in the hosted MCP adapter.

## Verification matrix

| Area | Command or artifact | Result | Evidence |
|---|---|---|---|
| Material contract | `npm run verify:material-mcp-contract` | Passed | 4,262 unique IDs. Outline uses fill 0 and weight 300. Solid uses fill 1 and weight 400. |
| Migration and rollback | `npm run verify:material-asset-migration` | Passed | Idempotence, service-role write, rejected invalid rows, denied anonymous read, and rollback verified in disposable PostgreSQL. No hosted system touched. |
| Guarded hosted migration | `npm run verify:material-hosted-migration-runner` | Passed | Exact migration hash, single-transaction apply, narrow migration-history repair, hidden password prompt, partial-apply preflight, and private-access postflight verified. The preflight and postflight SQL also passed in disposable PostgreSQL. |
| Seeder unit and integration | `npm run verify:material-seeder` | Passed | Direct snapshot, pinned alias, checksum-pinned fallback, SVG normalization, unsafe SVG rejection, retries, and resume behavior verified. |
| Full asset coverage | `references/verification/material-full-asset-validation-2026-07-14.json` | Passed | 8,524 of 8,524 assets succeeded, zero exceptions, zero resume reuse in the final from-scratch run. SHA-256: `4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92`. |
| Hosted serving | `npm run verify:material-serving` | Passed | Strict outline and solid hydration, mandatory hydration, all-mode count preservation, grouped recommendation hydration, audited errors, and fail-closed MCP normalization verified. |
| HTTP handler parity | `npm run verify:search-v2-hosted-http-parity` | Passed | Five direct and five grouped cases retained exact response parity, including Material SVG hydration. |
| Grouped recommendation integration | `npm run verify:search-v2-shared-recommendation-pipeline` | Passed | Four logical queries, one candidate RPC, bounded metadata and SVG reads, one audit insert, and error-path audit rows verified. |
| Result hydration regression | `npm run verify:search-v2-result-hydration` | Passed | Order, SVG values, null behavior, and missing-row failure behavior verified. |
| Timing regression | `npm run verify:search-v2-stage-timing` | Passed | Safe fields, sink isolation, disabled path, and payload measurement verified. |
| MCP package inventory | `npm run verify:material-mcp-package` | Passed | Icon indexes, package manifest, capability helper, pinned revision, and 8,524-asset report included in the gate. Packed size was 4,768,631 bytes. |
| Public function configuration | `npm run verify:material-mcp-package` | Passed | Stable MCP search and Material snapshot functions explicitly disable Supabase JWT verification in checked-in configuration. Product access controls remain inside the MCP server. |
| Clean npm install | `npm run verify:material-mcp-clean-install` | Passed | A real tarball install reported 4,262 Material IDs and returned valid SVG for exact outline and solid `material:settings` requests. |
| Production release runner | `npm run verify:material-production-runner` | Passed | A controlled local service exercised 92 production-shaped search checks and five tools through the actual hosted MCP HTTP server. No hosted system was touched. |
| Existing variant behavior | `npm run verify:mcp-variant-access` | Passed | 13 lookup, search, and recommendation checks passed. |
| Existing grouped client | `npm run verify:hosted-search-grouped-client` | Passed | One HTTP request and preserved logical response order. |
| Existing recommendations | `npm run verify:recommend-icons-grouped-search` | Passed | Grouped request behavior and recommendation parity preserved. |
| Existing library modes | `npm run verify:search-library-modes` | Passed | 15 strict, prefer, and all-mode cases passed. |
| Existing ranking policy | `npm run verify:search-ranking-policy` | Passed | Maintained policy and diversity checks passed. |
| Type checks | `deno check` on both shared handlers | Passed | Direct and grouped hosted handlers type-check. |
| Syntax checks | `node --check` on local MCP, hosted MCP, and seeder | Passed | All changed JavaScript entry points parsed successfully. |
| Production build | `npm run build` | Passed | Product facts, registry projections, Material manifest, MCP artifacts, bundles, preset checks, Vite production build, and cleanup completed. |
| Changed-file hygiene | `git diff --check` plus prohibited-character scan | Passed | No whitespace errors and no prohibited dash characters in changed files. |

## Source-path coverage

The final from-scratch asset report contains:

- 8,118 assets from direct pinned snapshots.
- 388 assets resolved through aliases that share the same codepoint in the pinned codepoints file.
- 18 assets from Google static URLs protected by committed SHA-256 checksums.

No SVG payload is committed in the verification report.

## Documented unrelated baseline failure

`npm run verify:hosted-search-engine` fails because the generated registry row contains the synonym `server stack` while the verifier expects only `self hosted` and `server cluster`. The verifier, hosted search core, and registry inputs are unchanged from baseline commit `c37aefccf`. This is not a Material serving regression and is not part of the required Material release gates.

## Production-only gates not yet run

These checks require the owner-gated release sequence:

1. Apply migration `20260714220000_material_icon_assets.sql` to production.
2. Run the hosted seed and verify exactly 8,524 table rows and 8,524 bucket objects.
3. Capture fresh per-tool production latency baselines before the search deploy.
4. Deploy the hosted search and MCP surfaces.
5. Run `npm run verify:material-production-release` with the approved revision, output path, production search URL, and hosted MCP URL. It executes the observed smoke set, the 20-query relevance set in both styles, exact `get_icon`, recommendations, preview, all-mode count checks, and capability checks.
6. Compare post-deploy p95 latency to each fresh baseline using the PRD budget.
7. Publish the npm package only after hosted gates are green.

Browser or Playwright validation is not applicable because this implementation changes no UI screen.
