# MCP Hosted Search Public Setup Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore public MCP behavior so the documented setup works as promised while keeping hosted search server-side and protected.

**Architecture:** Introduce a Supericons-owned public search boundary for MCP traffic that does not require user-supplied Supabase credentials. Keep the ranking engine, evidence graph, and private scoring inside the existing hosted search stack. Preserve the current JWT-based path for first-party and internal verification flows where it is still useful.

**Tech Stack:** Node MCP package, Supabase Edge Functions, existing hosted search core, `search_request_audit`, optional `SUPERICONS_API_KEY` entitlement validation, current docs system in `docs-pages.js`

---

## Problem Statement

The public docs promise a simple MCP setup:

- free users: `npx -y supericons-mcp`
- paid users: `npx -y supericons-mcp` plus `SUPERICONS_API_KEY`

But the current hosted MCP search path requires a legacy Supabase anon JWT when JWT enforcement is enabled. That is an internal infrastructure detail, not acceptable public setup.

The fix is not to teach users about Supabase. The fix is to restore a product-owned public boundary for MCP traffic.

## Recommended Approach

Use a dedicated public MCP search gateway that sits in front of the existing hosted search engine.

Recommended properties:

- no Supabase credential required from end users
- anonymous free tier supported with rate limits
- optional `SUPERICONS_API_KEY` for premium entitlements
- private ranking and scoring remain server-side
- internal first-party JWT path remains available for operational verification

## Success Criteria

- A fresh Codex Desktop install using only `npx -y supericons-mcp` can run `search_icons` successfully.
- A premium user with only `SUPERICONS_API_KEY` can access the documented premium behavior.
- No public doc or MCP client setup requires a Supabase credential.
- Hosted search remains server-side.
- `search_request_audit` continues to capture MCP traffic with useful source attribution.
- Internal verification can still probe the hosted engine directly.

## Scope

In scope:

- public MCP gateway design and implementation
- MCP package auth-path changes
- docs alignment
- verification scripts for docs-only and premium MCP setup

Out of scope:

- changing the ranking model itself
- moving search into the MCP package
- replacing Supabase as the backend

### Task 1: Freeze the Product Contract in Docs and Internal Notes

**Files:**
- Modify: `docs-pages.js`
- Modify: `docs/mcp-hosted-search-auth-boundary-decision.md`
- Create or modify: `docs/internal-mcp-hosted-search-testing.md`

- [ ] **Step 1: Add a short internal-only note in the docs system or internal reference**

Record that Supabase anon JWT configuration is for internal verification only and must never be added to public MCP setup guidance.

Suggested note content:

```md
Internal note: `SUPABASE_ANON_KEY` and `SUPERICONS_SEARCH_ENGINE_ANON_KEY` are internal debugging and rollout variables. Public MCP docs must only mention `npx -y supericons-mcp` and optional `SUPERICONS_API_KEY`.
```

- [ ] **Step 2: Review public docs copy for drift**

Confirm the public Codex section still shows:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
```

and premium shows only:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
env = { SUPERICONS_API_KEY = "your-key-here" }
```

- [ ] **Step 3: Commit**

```bash
git add docs-pages.js docs/mcp-hosted-search-auth-boundary-decision.md docs/internal-mcp-hosted-search-testing.md
git commit -m "docs: lock public MCP auth boundary"
```

### Task 2: Create a Public MCP Search Gateway

**Files:**
- Create: `supabase/functions/mcp-search/index.ts`
- Modify: `supabase/functions/_shared/search-engine/rank.ts`
- Modify: `supabase/functions/_shared/search-engine/catalog.ts`
- Modify: `supabase/functions/_shared/search-engine/rate-limit.ts`
- Modify: `supabase/functions/_shared/search-engine/types.ts`

- [ ] **Step 1: Write the failing integration expectation**

Document the intended request contract:

```ts
type McpSearchRequest = {
  query: string;
  library?: string | null;
  limit?: number;
  source?: "mcp";
  apiKey?: string | null;
};
```

And the public behavior:

```ts
// anonymous free request must work without Supabase credentials
await fetch("/functions/v1/mcp-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "calendar", limit: 5, source: "mcp" }),
});
```

- [ ] **Step 2: Implement the gateway entry point**

Create a new function with JWT verification turned off at deployment time.

Core handler outline:

```ts
serve(async (req) => {
  const body = await req.json();
  const apiKey = req.headers.get("x-supericons-api-key") ?? body.apiKey ?? null;
  const tier = await resolveMcpTier(apiKey);
  await enforceMcpRateLimit(req, tier);
  const results = await runHostedSearch({
    query: body.query,
    library: body.library ?? null,
    limit: body.limit ?? 10,
    source: "mcp",
    tier,
  });
  await auditSearchRequest({ query: body.query, source: "mcp", resultCount: results.length, status: "ok" });
  return json({ query: body.query, results });
});
```

- [ ] **Step 3: Reuse shared ranking logic instead of forking search behavior**

Keep ranking shared with the existing hosted engine so MCP and web both use the same protected intelligence core.

Expected shared call shape:

```ts
const results = await searchEngine({
  queryNorm,
  library,
  limit,
  source: "mcp",
  authTier: tier.name,
});
```

- [ ] **Step 4: Add anonymous and premium policy handling**

Anonymous requests should be allowed but limited. Premium entitlements should come from `SUPERICONS_API_KEY`, not Supabase JWTs.

Suggested helper boundary:

```ts
const tier = apiKey
  ? await validateSupericonsApiKey(apiKey)
  : { name: "anonymous", canUsePremiumLibraries: false };
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/mcp-search/index.ts supabase/functions/_shared/search-engine/types.ts supabase/functions/_shared/search-engine/catalog.ts supabase/functions/_shared/search-engine/rank.ts supabase/functions/_shared/search-engine/rate-limit.ts
git commit -m "feat: add public MCP search gateway"
```

### Task 3: Repoint the MCP Package to the Public Gateway

**Files:**
- Modify: `mcp/hosted-search-client.js`
- Modify: `mcp/auth.js`
- Modify: `mcp/index.js`

- [ ] **Step 1: Write the failing behavior expectation**

The MCP package must work in docs-only mode:

```js
process.env.SUPABASE_ANON_KEY = "";
process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY = "";
process.env.SUPERICONS_API_KEY = "";
```

Expected outcome:

```js
await searchIconsHostedMcp({ query: "calendar", limit: 5 });
// returns results instead of throwing "requires a legacy Supabase anon JWT"
```

- [ ] **Step 2: Remove the public dependency on Supabase anon JWT**

Change the request shape so MCP sends only product-owned headers.

Suggested request logic:

```js
const headers = {
  "Content-Type": "application/json",
};

if (apiKey) {
  headers["x-supericons-api-key"] = apiKey;
}
```

Use an internal override only when explicitly enabled for debugging.

- [ ] **Step 3: Keep an internal debug escape hatch**

Preserve a clearly internal-only path for direct platform verification.

Suggested guard:

```js
const useInternalHostedDebug =
  process.env.SUPERICONS_INTERNAL_HOSTED_DEBUG === "1";
```

Only in that mode may the client use Supabase-specific credentials.

- [ ] **Step 4: Ensure failure modes stay product-safe**

If the public hosted gateway is unavailable, return a user-safe MCP error or optionally fall back to local search only when explicitly allowed for internal debugging.

Suggested boundary:

```js
if (!response.ok) {
  throw new Error(`public MCP search failed (${response.status})`);
}
```

- [ ] **Step 5: Commit**

```bash
git add mcp/hosted-search-client.js mcp/auth.js mcp/index.js
git commit -m "feat: align MCP auth with public hosted search boundary"
```

### Task 4: Add Verification for Docs-Only and Premium Setups

**Files:**
- Create: `scripts/verify-mcp-docs-setup.mjs`
- Modify: `scripts/verify-hosted-search-engine.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a docs-only verification script**

The script should fail if docs-only MCP setup still needs Supabase credentials.

Suggested check:

```js
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY;
delete process.env.SUPERICONS_API_KEY;

const result = await searchIconsHostedMcp({ query: "calendar", limit: 3 });
if (!Array.isArray(result.results) || result.results.length === 0) {
  throw new Error("Docs-only MCP setup did not return hosted search results");
}
```

- [ ] **Step 2: Add a premium-path verification**

Run the same path with only `SUPERICONS_API_KEY` set.

Suggested check:

```js
process.env.SUPERICONS_API_KEY = process.env.TEST_SUPERICONS_API_KEY;
const result = await searchIconsHostedMcp({ query: "sparkles", limit: 3 });
```

- [ ] **Step 3: Add package scripts**

```json
{
  "scripts": {
    "verify:mcp-docs-setup": "node scripts/verify-mcp-docs-setup.mjs"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-mcp-docs-setup.mjs scripts/verify-hosted-search-engine.mjs package.json
git commit -m "test: verify docs-only MCP setup"
```

### Task 5: Update Deployment and Ops Runbooks

**Files:**
- Modify: `.env.example`
- Modify: `docs/mcp-hosted-search-auth-boundary-decision.md`
- Create or modify: `docs/internal-mcp-hosted-search-testing.md`

- [ ] **Step 1: Clarify public vs internal environment variables**

Add labels that separate:

- public MCP user config
- internal debugging config
- first-party web config

Suggested internal note:

```env
# Internal only: do not document for public MCP setup
SUPABASE_ANON_KEY=
SUPERICONS_SEARCH_ENGINE_ANON_KEY=
SUPERICONS_INTERNAL_HOSTED_DEBUG=false
```

- [ ] **Step 2: Document deployment settings**

Record that:

- `mcp-search` public gateway must deploy with JWT verification off
- internal `search-icons` may keep its current first-party auth path
- rate limits and audit capture must be enabled on the public gateway

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/mcp-hosted-search-auth-boundary-decision.md docs/internal-mcp-hosted-search-testing.md
git commit -m "docs: separate public MCP config from internal search debug config"
```

### Task 6: Run End-to-End Verification Before Release

**Files:**
- Verify only: no new files required

- [ ] **Step 1: Verify local web still works**

Run:

```bash
npm run dev
```

Expected:

- web search returns results
- `search_request_audit` receives fresh `source = 'web'` rows

- [ ] **Step 2: Verify docs-only MCP setup**

In Codex Desktop or Codex config, use only:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
```

Expected:

- `search_icons` returns results
- `search_request_audit` receives fresh `source = 'mcp'` rows
- no Supabase credential is required

- [ ] **Step 3: Verify premium MCP setup**

Use only:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
env = { SUPERICONS_API_KEY = "your-key-here" }
```

Expected:

- premium-entitled behavior works
- no Supabase credential is required

- [ ] **Step 4: Verify internal debug path still exists**

Use internal-only env:

```env
SUPABASE_ANON_KEY=<legacy anon JWT>
SUPERICONS_SEARCH_ENGINE_ANON_KEY=<legacy anon JWT>
SUPERICONS_INTERNAL_HOSTED_DEBUG=1
```

Expected:

- operators can still probe the direct hosted-search boundary when needed

- [ ] **Step 5: Run verification commands**

Run:

```bash
node scripts/verify-hosted-search-engine.mjs
node scripts/verify-mcp-docs-setup.mjs
node scripts/verify-search-query-fixtures.mjs
npm run build
```

Expected:

- all commands pass
- no public-user flow depends on a Supabase credential

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: verify MCP public setup alignment"
```

## Risks to Watch

- Anonymous public MCP search can be abused if rate limits are weak.
- Reusing the current `search-icons` function directly may blur first-party and public concerns if boundaries are not explicit.
- Hiding Supabase from users does not remove the need for strong server-side rate limits and audit coverage.
- Free public hosted search can never rely on a truly secret client credential; the moat still depends on server-side intelligence and operational controls.

## Recommended Sequencing

1. Freeze the auth-boundary decision and docs language.
2. Build the public MCP gateway.
3. Repoint the MCP package.
4. Add docs-only verification.
5. Run end-to-end checks from Codex Desktop and local web.

## Release Gate

Do not call this fixed until a real Codex Desktop test succeeds with:

- `npx -y supericons-mcp`
- no Supabase env vars
- successful `search_icons`
- fresh `source = 'mcp'` audit rows
