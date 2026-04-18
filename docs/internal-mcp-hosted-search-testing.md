# Internal MCP Hosted Search Testing

Date: 2026-04-18
Audience: Supericons maintainers and operators

## Purpose

This note exists to prevent product drift.

Public MCP setup and internal hosted-search verification are not the same thing.

## Public Product Contract

For end users, the setup remains:

- free: `npx -y supericons-mcp`
- paid: `npx -y supericons-mcp` plus `SUPERICONS_API_KEY`

End users should not be asked to configure any Supabase credential.

## Internal Verification Setup

Use Supabase-specific environment variables only when you are deliberately testing internal hosted-search plumbing.

Internal-only variables:

```env
SUPABASE_ANON_KEY=<legacy anon JWT>
SUPERICONS_SEARCH_ENGINE_ANON_KEY=<legacy anon JWT>
SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT=true
SUPERICONS_INTERNAL_HOSTED_DEBUG=1
SUPERICONS_SEARCH_ENGINE_URL=https://<project-ref>.supabase.co/functions/v1/search-icons
```

## Public MCP Gateway Verification

Use this mode when you want to verify the user-facing MCP path:

```env
SUPERICONS_INTERNAL_HOSTED_DEBUG=0
SUPERICONS_MCP_SEARCH_URL=https://<project-ref>.supabase.co/functions/v1/mcp-search
SUPERICONS_API_KEY=
```

Expected properties:

- no Supabase bearer token from the MCP package
- no Supabase apikey header from the MCP package
- fresh `source = 'mcp'` rows in `public.search_request_audit`

## Deployment Rule

Keep these boundaries explicit:

- `search-icons`: first-party/internal hosted engine path
- `mcp-search`: public MCP gateway path

Deployment expectation:

- `mcp-search` should have JWT verification off
- `search-icons` can retain the current first-party verification model

## Regression Check

Before calling MCP setup "fixed," verify all of the following:

1. Docs-only MCP setup works with no Supabase env vars.
2. Premium MCP setup works with only `SUPERICONS_API_KEY`.
3. Internal direct-hosted debug mode still works when explicitly enabled.
4. Public docs do not mention Supabase credentials for MCP users.
