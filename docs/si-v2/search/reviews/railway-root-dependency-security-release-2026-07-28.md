# Railway root dependency security release

Date: 2026-07-28

## Scope

This release changes only the root production dependency manifest and lockfile
used by Railway. It does not change Search v2 code, hosted MCP handlers,
recommendations, previews, telemetry, allowances, the website, Supabase, the
admin dashboard, or the public npm package.

Changed dependency:

- `@modelcontextprotocol/sdk`: `^1.29.0` to `^1.30.0`

Safe transitive lockfile updates:

- `@hono/node-server`: `1.19.14` to `2.0.12`
- `fast-uri`: `3.1.2` to `3.1.4`
- `body-parser`: `2.2.2` to `2.3.0`

## Security result

Before the change, `npm audit --omit=dev` reported four production
vulnerabilities:

- 1 high
- 2 moderate
- 1 low

After the lockfile update, the same command reports zero vulnerabilities.

## Runtime install

`npm run verify:railway-mcp-runtime-install` passed from a fresh production
install using the root lockfile.

Verified installed versions:

- MCP SDK `1.30.0`
- Hono Node server `2.0.12`
- `fast-uri` `3.1.4`
- `body-parser` `2.3.0`
- MaxMind `5.0.6`
- GeoLite2 country data `2.3.2026061719`

## Search and product behavior

The fixed 225-case search suite passed with the unchanged fingerprint:

`84a5e8b3c1b4e31e25cc865b37f397effb6c6c4c820b98706995012b8b80e3ff`

The candidate Railway server passed 39 product cases through both the public
HTTP route and hosted MCP. Ordered result references matched across both
surfaces. Candidate latency was:

- p95: 2,887.6 ms
- maximum: 2,965.3 ms

Additional passing checks:

- Railway runtime install
- hosted search routing and error truthfulness
- hosted search resilience
- grouped recommendations and fallback behavior
- recommendation clarification behavior
- preview persistence
- exact-reference previews
- preview image output
- plain-language MCP errors
- allowance error propagation
- health endpoint and version

The candidate detail is stored locally at
`references/verification/railway-root-dependency-security-candidate-2026-07-28.json`.

## Existing test findings

Two additional repository tests failed on both this candidate and an untouched
archive of the baseline commit `114e484b6`:

1. `verify-railway-local-first-recommendations.mjs` expected 13 telemetry
   events and received 12.
2. `verify-material-railway-server-contract.mjs` expected every all-mode row
   in one fixture to be a Material solid row.

The exact same failures occurred before the dependency change. They are
recorded as existing test defects and are not evidence of a dependency
regression. The live product matrix covers the related recommendation,
Material, HTTP, MCP, health, and result-parity paths.

## Rollout and rollback

Pre-release Railway deployment:

`df24709f-ae4f-4003-a00d-091750952804`

It remains the rollback target. The release changes no environment variables,
database state, public package, or external interface.

Production deployment and live verification are pending.
