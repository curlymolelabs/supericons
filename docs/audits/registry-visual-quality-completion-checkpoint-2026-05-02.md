# Registry Visual Quality Completion Checkpoint - 2026-05-02

## Summary

The semantic registry visual-quality cleanup is complete for the current gate.

This checkpoint covers the live Supabase registry, generated public registry exports, MCP registry export, rollback snapshot, and visual-quality review queue.

## Verified State

- Live Supabase semantic records: 15,103
- Public export records: 15,103
- Live open quality findings: 0
- Live open review queue rows: 0
- Visual-quality review queue snapshot rows: 0
- Visual-quality review queue snapshot findings: 0
- Public export hash: `555aa01d37205c1c8424f40d27bda3eaa8b6c6e4e171eda9584eb742457aea27`
- Rollback snapshot aggregate sha256: `4e23871a11802bebb9a992b3c9ae188833e7244dc7506e07c2692e573ea93452`

## Library Scan Results

The exported `public/registry/records.json` was scanned by library for:

- generic depicts phrases such as "icon showing", "navigation cue", "symbol used", "used for", "technical or AI-oriented symbol", and "shell or layout control"
- exact duplicate `depicts` strings within each library

Results:

| Library | Records | Bad phrase findings | Duplicate depicts groups |
| --- | ---: | ---: | ---: |
| bootstrap | 529 | 0 | 0 |
| heroicons | 325 | 0 | 0 |
| iconoir | 534 | 0 | 0 |
| ionicons | 92 | 0 | 0 |
| lucide | 1,951 | 0 | 0 |
| material | 65 | 0 | 0 |
| mingcute | 1,662 | 0 | 0 |
| phosphor | 1,512 | 0 | 0 |
| simpleicons | 3,412 | 0 | 0 |
| tabler | 5,021 | 0 | 0 |

## Verification Commands

The following commands passed:

```powershell
npm run verify:registry-rollback
npm run verify:registry-supabase-review-queues
npm run verify:si-registry
node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs
```

## Engineering Notes

- Supabase is the current source of truth for semantic registry records.
- JSON files remain generated projections for website and MCP use.
- The visual-quality queue builder now checks exact duplicate `depicts` strings within each library, not across different libraries.
- The direction checker now accepts natural variants such as `upward`, `downward`, and `backward`.
- The temporary visual-quality cleanup script was used to repair remaining queue rows in bulk and should be treated as internal maintenance tooling.

## Next Recommended Gate

Before future registry publication, run:

```powershell
node --env-file=.env.local scripts/build-depicts-visual-quality-review-queue.mjs
npm run verify:registry-supabase-review-queues
npm run verify:si-registry
node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs
```

Publication should be blocked if the visual-quality review queue snapshot has any rows.
