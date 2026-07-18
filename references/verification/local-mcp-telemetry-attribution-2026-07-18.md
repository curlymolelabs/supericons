# Local MCP telemetry attribution verification

Date: 2026-07-18
Status: local correction verified, production migration not yet applied

## Scope

This change corrects telemetry from the installed npm MCP server. The client entry point is now `local_mcp`, real user activity uses the `production` environment, and beta cohort information remains separate. A hosted search fallback does not change the client venue.

The database migration is compatible with the currently published `0.4.19-beta.1` package. Applying the migration corrects new calls from that package and relabels historical local stdio records. No npm publication is required for the attribution correction.

## Verified root cause

The installed beta package labeled beta cohort calls as `hosted_mcp` and `preview`. The dashboard excludes preview traffic by default, so genuine local npm searches were hidden and the venue selector showed Hosted MCP.

The first regression run failed before implementation:

```text
node scripts/verify-local-mcp-telemetry-attribution.mjs
AssertionError: Local MCP telemetry correction migration is missing.
```

## Correction

- Local stdio usage always records `local_mcp` and `production`.
- Beta cohort, package version, client family, and execution route stay in their own fields.
- Hosted fallback search retains local client attribution.
- Returned icon evidence records `local_mcp`.
- The migration normalizes writes from the published beta package and corrects historical local stdio rows.
- A hosted fallback search does not create a duplicate tool outcome when the hosted request audit already records the attempt.

## Verification

| Check | Result |
| --- | --- |
| `node scripts/verify-local-mcp-telemetry-attribution.mjs` | Passed |
| `node scripts/verify-search-v2-tool-latency-migration-smoke.mjs` | Passed against disposable PostgreSQL 17, including two migration applications |
| `node scripts/verify-search-v2-local-first-beta.mjs` | Passed, including exact result count, local fallback attribution, and returned icon venue |
| `node scripts/verify-search-v2-tool-scoped-beta.mjs` | Passed |
| `node scripts/verify-search-v2-tool-scoped-package.mjs` | Passed with a clean package install |
| `node scripts/verify-admin-dashboard-phase-a-metrics.mjs` | Passed, 11 tests |
| `node scripts/verify-admin-dashboard-v2-helpers.mjs` | Passed, 13 cases |
| `node scripts/verify-admin-query-workbench.mjs` | Passed |
| `node scripts/verify-search-v2-protected-public-artifacts.mjs` | Passed the npm and staged web content, license, and canary probes |
| `npm run verify:public-safety` in `mcp` | Passed, 63 packed files scanned |
| Credential, database URL, local path, and prohibited dash scan of the change | Passed |
| `git diff --check` | Passed |

## Existing verification issue outside this change

`npm run verify:package` reaches its package allowlist check and rejects files that are already part of the current package surface, including the license and third party notice files. The clean-install package verification above passes with the same 63-file package. This stale allowlist is not changed in this attribution fix.

## Release boundary

The source correction is locally verified. Production behavior will remain unchanged until migration `20260718100000_local_mcp_telemetry_attribution.sql` is independently reviewed and applied.

The production mutation is limited to:

1. Replace the existing local MCP outcome RPC without changing its signature.
2. Add two normalization triggers.
3. Correct historical local stdio venue and environment labels.
4. Correct historical local MCP icon evidence labels.

The migration does not deploy hosted search, change ranking, publish npm, modify storage, or change the public MCP response.

After release, live verification must confirm:

1. A new search from the installed npm MCP server appears in the default dashboard view.
2. Its venue is Local MCP and its result count matches the MCP response.
3. A hosted fallback from the installed npm MCP server remains Local MCP.
4. A remote MCP request remains Hosted MCP.
5. The default dashboard does not need preview traffic enabled to show genuine local npm activity.
