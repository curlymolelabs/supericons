# MCP Hosted Search Auth Boundary Decision

Date: 2026-04-18
Status: Accepted
Owner: Supericons core product and platform

## Summary

Supericons will keep its search engine hosted and server-side, but public MCP users must never be asked to configure Supabase credentials.

The product contract remains:

- Free MCP users: `npx -y supericons-mcp`
- Paid MCP users: `npx -y supericons-mcp` plus `SUPERICONS_API_KEY`

Supabase anon JWTs are an internal implementation detail for first-party web plumbing, local debugging, and internal verification. They are not part of the public MCP setup for Codex, Claude Code, Cursor, or other MCP clients.

## Why This Decision Exists

During the hosted-search rollout, the MCP path drifted into a Supabase-specific auth requirement:

- Public Codex docs describe a simple MCP install flow in [docs-pages.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js).
- The current MCP hosted-search client requires a legacy Supabase anon JWT when JWT enforcement is enabled in [mcp/hosted-search-client.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/hosted-search-client.js).
- The current `search_icons` tool path returns a hosted-search failure unless local fallback is explicitly enabled in [mcp/index.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js).

That behavior is useful for internal testing, but it is not acceptable as the public product experience.

## The Core Principle

We are protecting the engine, not teaching users about the infrastructure.

That means:

- Search ranking, signals, editorial weighting, and private evidence stay server-side.
- Users only receive results, never the private scoring model or raw internal features.
- Public MCP setup must stay minimal and product-owned.
- Internal infrastructure details such as Supabase anon JWTs, Edge Function verification settings, and database wiring must stay hidden from end users.

## Decision

### 1. Public MCP setup stays product-simple

The documented setup remains the intended contract:

- Free use requires no API key beyond the MCP package install path.
- Paid use requires only `SUPERICONS_API_KEY`.
- No public doc should require `SUPABASE_ANON_KEY`, `SUPERICONS_SEARCH_ENGINE_ANON_KEY`, or any other Supabase credential.

### 2. Supabase anon JWT is internal-only

A Supabase anon JWT may still be used for:

- internal local verification
- first-party browser runtime wiring
- staging and operational debugging
- direct platform probes during rollout work

It is not part of public onboarding and must not appear in public MCP documentation.

### 3. The moat is server-side intelligence, not a public client token

Requiring a Supabase anon JWT from users does not meaningfully protect the moat.

What protects the moat:

- hosted ranking logic
- private evidence and scoring inputs
- editorial judgment and curation
- rate limiting and abuse controls
- audit trails and trap endpoints
- premium and workflow entitlements behind Supericons-owned access controls

What does not protect the moat:

- exposing Supabase-specific setup to users
- relying on a public client credential as if it were a secret
- coupling public MCP usage to internal infrastructure details

### 4. MCP must authenticate against a Supericons-owned public boundary

The MCP package should talk to a public Supericons boundary designed for users, not directly depend on a Supabase-specific JWT requirement.

That public boundary may still be implemented on Supabase, but it must behave like a Supericons product surface:

- anonymous free access allowed within limits
- `SUPERICONS_API_KEY` for paid access and entitlement expansion
- server-side enforcement of rate limits, quotas, and policy
- no Supabase credential required from end users

## Implications

### Product implications

- The current docs are closer to the intended product behavior than the current MCP auth implementation.
- The current MCP hosted-search implementation is temporarily too infrastructure-aware.
- We should fix the implementation, not change the docs to expose Supabase.

### Engineering implications

- The current internal hosted-search verification path remains useful and should be preserved for operators and developers.
- Public MCP search needs a dedicated auth boundary that does not depend on user-supplied Supabase JWTs.
- The web app and MCP may use different auth entry points while sharing the same protected ranking core.

### Documentation implications

- Public docs should continue to show only the simple MCP setup and the optional `SUPERICONS_API_KEY`.
- Internal docs should clearly distinguish product-facing setup from internal validation setup.

## Non-Goals

- This decision does not move search back into the client.
- This decision does not weaken the hosted-engine moat.
- This decision does not require abandoning Supabase.
- This decision does not promise that free public search is secret; it only requires that access be mediated through a Supericons-owned public boundary instead of a Supabase-specific user setup.

## Working Rule Going Forward

When there is tension between "protect the engine" and "keep setup simple," the answer is:

- keep the engine private
- keep the public interface simple
- move the complexity inward

Users should experience Supericons. They should not experience our infrastructure.
