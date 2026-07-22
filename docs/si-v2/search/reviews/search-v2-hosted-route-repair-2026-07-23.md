# Search v2 hosted route repair record

Date: 2026-07-23

## Release scope

This change repairs the existing Railway hosted search route in place. It does not change the public MCP URL, tool names, tool inputs, website deployment, ChatGPT app configuration, or npm package version. It does not publish npm or deploy Netlify.

The only production mutation authorized by this record is one Railway deployment of the current hosted MCP service. If the live product gate fails, the previous Railway source revision is restored.

## Verified defect

Hosted `search_icons` and the public `/search-icons` route were using the packaged local fallback ranker as their primary engine. That ranker is useful for local and fallback work, but it discarded bounded query variants for many unclassified multiword phrases.

The defect produced false zeros for ordinary agent queries such as:

- `hard hat construction worker` in Lucide
- `network proximity graph nodes` in Phosphor
- `tow truck`
- `verification audit shield check` in Lucide

The public web app appeared healthier because its browser layer retained local variant results when Railway returned no results. The hosted MCP caller received the Railway zero directly.

The production service was checked before deployment. Its health response still reported `search_mode: local_first`, so it does not yet contain this repair.

## Implemented repair

- Hosted `search_icons` and public `/search-icons` now call the established hosted variant engine first.
- The packaged local engine runs only after the hosted engine returns a valid empty result.
- Hosted errors remain visible. They are not converted into search misses.
- Local fallback failures after a valid hosted empty result remain honest empty results.
- `recommend_icons` keeps its current local-first route.
- Responses identify the answering route as `hosted` or `local_fallback`.
- The public HTTP response remains browser-safe and omits SVG and protected semantic fields.

## Product verification

The exact local candidate passed the same 15-case product matrix through both the public HTTP route and MCP `search_icons`. Ordered icon references matched between the two surfaces.

Verified examples include:

| Query | Scope | Verified candidate outcome |
|---|---|---|
| `hard hat construction worker` | Lucide strict | `lucide:hard-hat` ranked first |
| `network proximity graph nodes` | Phosphor strict | network and graph icons in the leading results |
| `tow truck` | all libraries | truck result ranked first |
| `verification audit shield check` | Lucide strict | `lucide:shield-check` in the top three |
| `forklift warehouse logistics` | all libraries | forklift in the top three |
| `fortress secure boundary` | all libraries | fortress ranked first, with no layout or alignment controls in the top five |
| `crane hook construction` | all libraries | construction crane ranked first, with no fish-hook result in the top two |
| `connection two people together care relationship` | Phosphor strict | relevant people and relationship results, with no Wi-Fi result in the top five |
| `amazing` | all libraries | reviewed delight result ranked first |
| `sports` | all libraries | sports results returned |
| Japanese sports query | Japanese locale | local fallback returned sports results |
| `deportes` | Spanish locale | relevant sports and fitness results returned |
| missing brand in strict brand mode | Simple Icons strict | honest no-result |
| `florblequux` | all libraries | honest no-result |

No-result MCP responses contained `code: no_icons_found` and no icon or image fields.

## Verification commands

The following checks passed against the repair worktree:

- `npm run verify:search-v2-hosted-route-repair`
- `npm run verify:search-v2-hosted-route-product`
- `npm run verify:search-v2-semantic-latency`
- `node scripts/verify-search-v2-synchronized-surfaces.mjs`
- `node scripts/verify-search-v2-phase1-parity.mjs`
- `npm run verify:hosted-search-engine`
- `npm run verify:search-library-modes`
- `npm run verify:mcp-multilingual-support`
- `npm run verify:mcp-agent-friendly-errors`
- `node scripts/verify-mcp-preview-icons-image.mjs`
- `npm run verify:recommend-icons-clarification`
- `node scripts/verify-search-v2-one-call-contract.mjs`
- `npm run verify:railway-mcp-runtime-install`
- `npm run verify:hosted-search-resilience`
- `npm run verify:mcp-usage-event-detail`
- `npm run verify:mcp-usage-dedupe`
- `npm --prefix mcp run verify:public-safety`
- `npm run verify:search-v2-protected-public-artifacts`

The 225-case parity fingerprint remained `17ed68b34768e1432fe176d44a994e3da6bac4566c607e229116f85001a7002c` with clean inputs. The semantic latency check recorded a 30-sample p95 of about 446 ms.

The root package safety scanner separately reports a pre-existing `.env.local` text reference in the root `package.json`. This repair does not publish the root package. The actual MCP package safety scan passed 67 packed files.

## Inherited verification issues

These failures also reproduce on the unchanged base and are not caused by the route repair:

- The Railway recommendation verifier has an intermittent asynchronous telemetry count of 12 instead of 13, after its recommendation product assertions pass.
- The local-first beta verifier contains stale prerelease expectations.
- Two search query fixture expectations still pin earlier result ordering.

They remain maintenance work. They do not weaken the new hosted product gate or authorize changes to recommendation behavior in this incident repair.

## Deployment and rollback gate

The release candidate must be rebuilt from the exact source revision currently live in Railway, then receive only this repair commit. The full hosted route product matrix must pass again against that exact release tree.

After deployment, the same product matrix runs against `https://mcp.supericons.dev`. The release is retained only if health reports `hosted_primary` and every HTTP, MCP, relevance, strict-library, multilingual, and honest no-result assertion passes. Any failure restores the prior Railway source revision and verifies the restored health state.

## Production outcome

Railway deployment `c247a50f-151b-4ef0-bedf-b529dc4f4255` is live from release source `82decbb40`, which is the previous live source `ca40658fb` plus only this repair. Railway reports status `SUCCESS` and image digest `sha256:fd2f322846b4ffb156c1dc3afdc8879c7ed8d41385c0537200a5b758380f5c74`.

The full 15-case product matrix passed against `https://mcp.supericons.dev` through both the public HTTP route and hosted MCP. Health reported version 0.4.20, `search_mode: hosted_primary`, `recommendation_mode: local_first`, and a closed hosted-search circuit with zero failures. Ordered result references matched across both surfaces.

The live checks confirmed the four original false-zero cases, English meaning coverage, Japanese and Spanish coverage, strict library behavior, forbidden-result rules, browser-safe output, and honest no-results. Recorded public-route latency across the judged cases ranged from about 0.9 to 4.2 seconds. Search correctness recovered, but production latency remains an observation target.

The prior source `ca40658fb` and deployment record `ee02bdca-96b6-46f2-9637-7636a2271f33` remain the rollback reference. No rollback was required.
