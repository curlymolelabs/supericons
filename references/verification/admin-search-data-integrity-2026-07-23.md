# Admin Search Data Integrity Verification

## Decision

GO for a bounded internal `admin-api` deployment after the verified source is committed.

The change does not add controls, downloads, table columns, database migrations, or public product behavior. It corrects the shared Search history projection used by the main table, Search summary, Request log metadata, and Audit bundle.

## Acceptance criteria

- Approximate low results display as Low in the main table.
- Approximate low requests are included in `low_count` in Search summary.
- A Search summary Success label requires every represented request to be successful.
- An unclassified request displays Unknown and makes the Audit bundle request attention.
- A positive result without usable icon references is not marked as recorded.
- Empty searcher detail is not described as available.
- The Audit bundle reports structural and meaning checks separately.
- The Audit bundle overall status passes only when both sets of checks pass.
- Existing Search history layout and the three approved downloads remain unchanged.

## Reproduction

Before the fix, the helper regression case failed with:

`actual: successful, expected: low_result`

The failure reproduced the live export defect where requests held only in `approximate_low_attempt_count` fell through to Success.

## Verification evidence

The following checks passed:

- `node scripts/verify-admin-dashboard-v2-helpers.mjs`
- `node scripts/verify-admin-dashboard-search-events.mjs`
- `node scripts/verify-admin-dashboard-search-export-contract.mjs`
- `node scripts/verify-admin-dashboard-v2-api.mjs`
- `node scripts/verify-admin-dashboard-phase-b.mjs`
- `node scripts/verify-admin-dashboard-v2-error-states.mjs`
- `node scripts/verify-admin-dashboard-v2-operator-contract.mjs`
- `node scripts/verify-admin-dashboard-v2-searcher-sync.mjs`
- `node scripts/verify-admin-dashboard-search-history-cap.mjs`
- `node scripts/verify-admin-dashboard-phase-b-browser.mjs`
- `node --check` for every changed JavaScript module and verification script
- `deno check supabase/functions/admin-api/index.ts`
- `npm run build:admin-html`

The browser verification confirmed:

- `approximate low results` displays a Low badge, not Success
- Search summary exports the same row as Low with `low_count = 2`
- Audit bundle meaning checks pass for the deterministic fixture
- the table layout and three-download interface remain unchanged

Screenshot:

`references/verification/admin-search-data-integrity-2026-07-23.png`

## Deployment inventory

- Deployment unit: `supabase/functions/admin-api`
- Database migrations: none
- Secret changes: none
- Current production function before rollout: version 91, active, JWT verification disabled by design
- Current production bundle SHA-256: `c65a0f027b790a5389fcd4468f6dc31449d85ac3c9862c3d80054ff251a00b13`
- Local dashboard source: `public/admin-app.js`
- Shared projection source: `lib/admin-dashboard-v2.js`

## Observability

After deployment:

1. Confirm `admin-api` is active and its version advanced from 91.
2. Confirm an unauthenticated `/v2/search` request returns HTTP 403.
3. Confirm an authenticated 24-hour Search response loads.
4. Confirm an affected approximate-low row is Low in the response.
5. Download a fresh Audit bundle and confirm its meaning status reflects the exported data.

## Rollback

Rollback source is pre-release commit `abe3c63a4`.

If the authenticated smoke check fails, redeploy `supabase/functions/admin-api` from that commit, confirm the function returns to active status, then repeat the unauthenticated and authenticated checks.

## Residual risk

- Existing query text already stored with replacement question marks cannot be reconstructed by this release. The Audit bundle now flags strong signs of that damage.
- Historical positive-result rows that never recorded icon references remain incomplete. They are now reported honestly instead of counted as recorded.
- The credentialed live rollup-parity verifier is a post-deployment check because it requires the release fingerprint and the deployed function.
