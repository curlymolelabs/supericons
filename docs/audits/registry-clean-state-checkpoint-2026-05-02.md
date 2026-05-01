# Registry Clean State Checkpoint - 2026-05-02

This checkpoint records the verified state after completing the Supabase-backed semantic registry cleanup for the live review queue.

## Verified State

- Live Supabase `icon_registry_records`: 15,103
- Live Supabase `icon_registry_public_export`: 15,103
- Open quality findings: 0
- Open review queue rows: 0
- Open review queue by library: none
- Public registry records: 15,103
- MCP registry records: 15,103

## Exported Registry Files

Both exported registry projections currently have the same SHA-256 hash:

- `public/registry/records.json`
- `mcp/public/registry-records.json`
- SHA-256: `b74d44007f0a5eb39b5dcf45f428ef155ea59b97a93fda888185b9fd5b3c781e`
- File size: 11,123,018 bytes each

## Blocked Phrase Scan

Direct scan of `public/registry/records.json` found:

- `a symbol representing`: 0
- `a symbol for`: 0
- `product mark`: 0
- depicts containing both `official` and `brand`: 0

## Rollback Snapshot

A fresh rollback snapshot was created after the clean export:

- Snapshot: `data/si-registry/archive/rollback-snapshots/latest-registry-rollback-snapshot.json`
- Files: 19
- Bytes: 109,661,628
- Aggregate SHA-256: `fef03f9c7083b3bcf23a92272a8abeaa151cc65127434a0d0c3351241595ba6a`

## Verification Commands

The following commands passed:

```powershell
node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs
npm run verify:si-registry
npm run snapshot:registry-rollback
```

Additional direct scan command confirmed the exported public registry has no blocked depicts phrases listed above.

## Notes

- Supabase is the working source of truth for registry record updates.
- JSON exports remain the distribution format for the public website and MCP package.
- The next cleanup should be repository hygiene only: archive or remove stale generated/manual workflow folders in a separate checkpoint, after deciding which artifacts must remain for rollback or evidence.
