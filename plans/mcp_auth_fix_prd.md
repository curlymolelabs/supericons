# MCP Auth Fix: validate-mcp-key Edge Function

## Problem

MCP auth.js makes 3 REST API calls to Supabase using the publishable (anon) key.
All 3 tables (si_api_keys, si_subscriptions, si_purchases) have RLS policies
using `auth.uid() = user_id`. With the anon key, `auth.uid()` is NULL, so every
query returns zero rows. The MCP reports "Invalid or revoked API key" for all
valid keys. Auth is broken for all authenticated tiers.

## Solution

Single Edge Function: `validate-mcp-key`

- MCP hashes the API key client-side (SHA-256), sends the hash
- Edge Function uses service_role key (auto-injected, bypasses RLS)
- Looks up user from si_api_keys, checks subscription, checks purchases
- Updates last_used timestamp
- Returns: `{ authenticated, isPro, purchasedSlugs, userId }`

## Changes

### [NEW] supabase/functions/validate-mcp-key/index.ts

Edge Function. JWT verification OFF (request carries a key hash, not a user JWT).

Input: `POST { key_hash: "sha256hex" }`
Output: `{ authenticated, isPro, purchasedSlugs, userId }`

Logic:
1. Look up si_api_keys where key_hash matches and not revoked
2. If not found: return { authenticated: false }
3. Update last_used = now()
4. Check si_subscriptions for active sub
5. Check si_purchases joined with si_products for slugs
6. Return result

### [MODIFY] mcp/auth.js

Replace 3 REST API calls with 1 fetch to validate-mcp-key Edge Function.
Keep client-side SHA-256 hashing.

Before: 3 fetches (si_api_keys, si_subscriptions, si_purchases) - all broken
After: 1 fetch (validate-mcp-key Edge Function) - works

## Verification

1. Deploy Edge Function
2. Test with no API key: should return anonymous
3. Test with invalid key: should return error
4. Test with valid Pro key: should return isPro=true
5. Test with valid Pack buyer key: should return purchasedSlugs
