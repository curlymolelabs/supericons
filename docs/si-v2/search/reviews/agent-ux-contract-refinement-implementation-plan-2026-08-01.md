# Agent UX contract refinement implementation plan

Status: implemented and locally verified

Branch: `codex/agent-ux-contract-refinement-20260801`

## Objective

Make Supericons easier for agents of different capability levels to use correctly without changing Search v2 ranking, icon data, or user-facing website behavior.

The batch addresses verified failures from the agent harness evaluation:

- An omitted library was incorrectly inferred as `si` by multiple agents.
- `library_mode = prefer` was sent without a named library.
- Agents guessed icon refs before searching.
- A `get_icon` not-found response failed strict MCP output validation.
- Successful previews did not always produce a visible fallback link.
- A single verified result could be described as weak only because the requested limit was larger.

## In scope

1. Shared hosted and local MCP instructions.
2. Search argument normalization for omitted or non-specific libraries.
3. `get_icon` hosted response schema parity.
4. Search-result interpretation and compact response wording.
5. Preview suggested response with an explicit browser fallback.
6. Focused regression tests and existing search fingerprint verification.

## Out of scope

- Search ranking, query expansion, candidate retrieval, or result ordering.
- Icon catalog, taxonomy, SVG, or registry changes.
- Website UI changes.
- Admin dashboard or telemetry changes.
- Database migrations.
- Railway, Netlify, npm publication, or any production deployment.
- A Codex client renderer fix. Supericons can provide a fallback, but it cannot modify Codex image rendering.

## Planned contract behavior

### Library choice

- No named library means all-library search.
- A named library with no explicit mode means strict search in that library.
- An explicit `library = si` request remains available and uses strict SI-only search.
- `library = all` or `library = any` means no library restriction.
- `prefer` without a named library becomes all-library search with a warning.
- `si` continues to mean the Supericons library. It is never treated as Simple Icons.

### Tool order

- One concept uses `search_icons` first.
- Two or more named UI slots use `recommend_icons` first.
- `preview_icons` receives canonical refs returned by search or recommendation.
- `get_icon` receives an exact returned ref and is not used to guess IDs.

### Search presentation

- Successful responses report an explicit result count and outcome type.
- A single verified result is not described as low quality solely because it is one result.
- Compact result lines include a short semantic reason when verified metadata provides one.
- No-result and tool-error responses remain distinct.

### Preview presentation

- Preview responses provide ready-to-use suggested Markdown.
- The suggested Markdown includes the image when available and always includes the browser preview link.
- The response states that the browser link is the fallback when the client cannot render inline images.

### Exact lookup errors

- The hosted `get_icon` output schema declares every field returned by the not-found response.
- Strict MCP clients can read the structured not-found response instead of rejecting it with `-32602`.

## Expected file inventory

- `mcp/search-tool-shell.js`
- `mcp/preview-icons.js`
- `mcp/index.js`
- `mcp/remote-server.js`
- `scripts/verify-mcp-agent-ux-contract.mjs`
- `scripts/verify-search-v2-one-call-contract.mjs`
- `scripts/verify-search-library-modes.mjs`
- `package.json`
- This plan and the final verification evidence

The inventory may shrink. Any additional product file requires a written reason in the verification evidence.

The final inventory also includes `scripts/verify-mcp-agent-friendly-errors.mjs`. This existing verifier was the correct place to prove that a strict hosted MCP client accepts the structured `get_icon` not-found response. No additional product surface was added.

## Regression-first acceptance gates

1. New focused verifier fails against the pre-change behavior.
2. Omitted library normalizes to all mode without a warning.
3. Named library with omitted mode normalizes to strict.
4. `prefer` without a named library normalizes to all with a warning.
5. Literal `library = all` does not become a strict library filter.
6. Hosted and local instructions contain the same golden-path rules.
7. Search match, no-match, and service-error responses have distinct outcome types.
8. One-result wording does not call the result weak or low.
9. Preview suggested Markdown includes both image Markdown and a browser link when results exist.
10. `get_icon` not-found validates through the hosted MCP client.
11. Existing preview, agent-friendly error, library-mode, hosted-route, and one-call checks pass.
12. The established 225-case search fingerprint remains unchanged.
13. No public protected intelligence enters an npm or web artifact.
14. The final worktree contains only reviewed files and is clean after commit.
15. A real local MCP stdio call proves that explicit SI access still works while an omitted library remains global.

## Stop conditions

Stop without expanding scope if:

- Any proposed response-quality label cannot be derived conservatively.
- Existing ordered search results or fingerprints change.
- A client-rendering fix requires changes outside this repository.
- The same regression fails twice after attempted correction.

New findings become separate tasks. They are not folded into this batch.

## Completion

The bounded implementation is complete on this branch. No search ranking, result ordering, catalog data, website UI, telemetry, database, deployment, or publication behavior changed.

Verification details and the one inherited unrelated failure are recorded in [agent-ux-contract-refinement-2026-08-01.md](../../../../references/verification/agent-ux-contract-refinement-2026-08-01.md).
