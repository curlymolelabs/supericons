# Material Railway hydration narrow recovery completion

Date: 2026-07-16

Status: Completed. Candidate retained in production.

## Production outcome

- Railway deployment: `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`
- Image digest: `sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58`
- MCP version: `0.4.18`
- Material assets available: 8,524
- Pinned Material source revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Rollback used: no

The release used approval fingerprint `6fde47285e50415b2b25233606a6ae7530ed87fecfee8b05a43c32c7354f8165` and implementation revision `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`.

## Verification result

The guarded runner completed 17 of 17 production checks.

Material-local checks passed:

- Material capability count is 4,262 icon IDs.
- Outline search and exact lookup return valid SVG.
- Solid search and exact lookup return valid SVG.
- Outline and solid SVG payloads are distinct.
- Material preview returns real PNG content.
- The 20-query relevance fixture passed 20 of 20 in both styles.
- Material search warm p95 was 330.6 ms against a 2,000 ms limit.
- Exact lookup warm p95 was 254.2 ms against a 2,000 ms limit.
- Preview warm p95 was 258.4 ms against a 2,000 ms limit.

Follow-up correctness and candidate-local checks passed:

- Material recommendation returned valid SVG in 561.4 ms.
- Recommendation warm p95 was 578.3 ms against a 3,000 ms limit.
- All-mode solid returned 10 deliverable Material rows in 323.1 ms.
- All-mode `settings` returned 10 deliverable rows.
- All-mode `cog` returned 10 deliverable rows.
- Strict Lucide returned five valid SVG rows.

## Existing engine latency observations

The release recorded these non-blocking measurements from paths that depend on the unchanged Supabase search engine:

- All-mode `settings`: 5,387.8 ms
- All-mode `cog`: 3,578.3 ms
- Strict Lucide `calendar`: 3,288.6 ms

These responses were correct. They remain evidence for the separate search-engine investigation and were not treated as Material release failures.

## Runtime observation

The deployed service health endpoint reported version `0.4.18`, a complete 8,524-asset bundle, and status `ok` after the gates completed. Railway runtime logs showed the server listening on port 8080. The only entries labeled as errors were npm configuration warnings recommending `--omit=dev`; no application error was present in the inspected startup logs.

## Retained evidence

- `material-railway-recovery-narrow-legacy-preflight-2026-07-16.json`
- `material-railway-recovery-narrow-stability-preflight-attempt-1-2026-07-16.json`
- `material-railway-recovery-narrow-material-gate-2026-07-16.json`
- `material-railway-recovery-narrow-follow-up-gate-2026-07-16.json`
- `material-railway-recovery-narrow-completion-2026-07-16.json`

No Supabase deployment or configuration, database data, storage data, npm package, beta endpoint, Railway configuration, or other Railway service was changed by this release.
