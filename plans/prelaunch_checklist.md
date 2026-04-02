# Supericons Pre-Launch Checklist

## P0: Blocking (Must fix before launch)

### Security
- [ ] **Audit all Edge Functions for JWT gate issue** - `create-checkout`, `create-portal`, `serve-premium-asset`, `download-pack`, `redeem-credit` may have the same "Invalid JWT" error that broke `api-keys`. Each function that handles auth internally should have gateway JWT verification OFF.
- [ ] **Rotate exposed API key** - The API key `si_18f7e375...` was visible in console logs and screenshots during debugging. Generate a new key and revoke this one before launch.
- [ ] **Verify RLS policies cover all tables** - Confirm `si_api_keys`, `si_subscriptions`, `si_purchases`, `si_products`, `si_credits` all have proper RLS enabled with correct policies.
- [ ] **Remove Supabase access token from MCP config** - The `sbp_a0f71e...` token in `mcp_config.json` is a management token. Ensure it is not committed to any public repo.

### Payment Flow
- [ ] **Test Stripe checkout end-to-end** - Single pack purchase: product selection, Stripe redirect, webhook processing, purchase record creation. Verify with a Stripe test card.
- [ ] **Test Stripe subscription end-to-end** - Pro monthly/annual: checkout, webhook, subscription record creation, portal access for cancellation.
- [ ] **Verify webhook idempotency** - `stripe-webhook` must handle duplicate events gracefully (no double-inserts).
- [ ] **Test credit redemption flow** - Pro users with credits: redeem credit for a pack, verify purchase record created without Stripe charge.

### Data Integrity
- [ ] **Verify all 8 premium collections have 50 icons each** - Confirm SVGs and CSS files are uploaded to Supabase Storage for all collections: ai-agentic, data-charts, ecommerce, media-playback, navigation-menus, security-auth, social-communication, status-feedback.
- [ ] **Verify manifest.json is complete** - All 8 collections have correct `classMap` entries for CSS reverse-mapping.

---

## P1: High Priority (Should fix before launch)

### Production Build
- [ ] **Run `npm run build`** - `dist/` is stale. The production bundle still has the old `isPro()` gate and missing auth changes.
- [ ] **Deploy updated `dist/` to hosting** - After building, deploy to your hosting provider (Vercel, Netlify, etc.).
- [ ] **Verify production site loads correctly** - Check all pages: icon grid, collections, pricing, dashboard, motion lab, converter.

### MCP Package
- [ ] **Publish `supericons-mcp` to npm** - Current version 0.1.0 has the old broken auth (3 REST calls). Bump to 0.2.0 with the new Edge Function auth and publish.
- [ ] **Update MCP package.json description** - Add keywords, repository URL, author, license fields for npm discoverability.
- [ ] **Test `npx supericons-mcp` installs and runs** - After publishing, verify the npm package works for external users with and without API keys.

### Edge Function Deployment
- [ ] **Verify `validate-mcp-key` is deployed** - Confirm the function exists and responds correctly (done, but double-check).
- [ ] **Verify `api-keys` is deployed with latest code** - Confirm the pack-buyer guard update is live.
- [ ] **Check all Edge Functions are deployed** - Ensure local code matches deployed versions for all 8 functions.

---

## P2: Medium Priority (Should fix within first week)

### Per-Collection Gating
- [ ] **Test pack-buyer access** - Create a test account with 1 purchased pack. Verify MCP returns only that pack's icons (not all 400). Currently only Pro (all icons) has been tested.
- [ ] **Test bundle-buyer access** - Create a test account with a bundle purchase. Verify all 8 packs are accessible.
- [ ] **Test revoked key behavior** - Revoke an API key and verify the MCP correctly rejects it.
- [ ] **Test expired subscription** - Let a Pro subscription expire and verify MCP downgrades to free-only.

### UX Polish
- [ ] **Fix "Failed to load API keys" on page load** - The GET request to api-keys fails initially (may be a timing issue with auth state). Ensure keys load on dashboard open.
- [ ] **Add loading state to Generate Key button** - Disable button and show spinner while the Edge Function processes.
- [ ] **Show toast on successful key generation** - Currently only shows the modal. Add a success toast after the modal is dismissed.
- [ ] **Handle key copy failure gracefully** - If clipboard API is blocked, show the key in a selectable text field.

### Documentation
- [ ] **Write MCP setup guide** - Instructions for Cursor, Claude, VS Code, Windsurf, Antigravity. Include both free and premium setup.
- [ ] **Write API documentation** - Document the REST API for programmatic access (if exposing beyond MCP).
- [ ] **Update README.md** - Project overview, architecture, setup instructions for contributors.

---

## P3: Low Priority (Nice to have)

### Analytics
- [ ] **Track MCP usage** - `last_used` timestamp is updated on each validation. Add a dashboard view showing API key usage stats.
- [ ] **Track premium icon access patterns** - Which collections are most popular via MCP?

### Performance
- [ ] **Add caching to validate-mcp-key** - Consider caching validated keys for 5-10 minutes to reduce Edge Function invocations.
- [ ] **Optimize MCP startup time** - Loading 17,000+ icons takes a moment. Consider lazy-loading or caching the icon index.

### Future Features
- [ ] **Rate limiting on API keys** - Prevent abuse of premium icon access.
- [ ] **API key scoping** - Allow users to create read-only vs full-access keys.
- [ ] **Usage dashboard in My Purchases** - Show API call count, last used, collections accessed.
