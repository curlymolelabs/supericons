# Search v2 web preview persistence release request

Date: 2026-07-18

## Outcome

This release fixes the preview links returned by MCP searches. Today, an explicit list briefly displays the shared icons, then the page replaces them with the full grid when popularity data arrives. The corrected page keeps preview mode active until the visitor selects **Browse all icons**.

This is a web-only release. It does not change the npm beta, Railway, Supabase, search ranking, recommendations, database data, or the default icon catalogue.

## User-visible behavior

- Explicit MCP icon lists remain exact and keep their requested order.
- Query previews remain filtered.
- Unknown icon references show zero results, never the full grid.
- The page shows a small message: "Results shared by your AI agent."
- **Browse all icons** deliberately leaves preview mode.
- The URL keeps `view=icons`.
- A late hosted search response cannot restore a preview after the visitor leaves it.

## Evidence already reproduced locally

- The final web artifact contains 188 files and 40,904,711 bytes.
- Two independent builds produced tree SHA-256 `8a65c6719102494e67eb83cd2f3ab28e2b522f787cfb585f536a1d9874be3359`.
- The browser verification passed against the exact staged artifact, not a later rebuild.
- Explicit and query previews survived delayed popularity, a locale change, and authentication events.
- Unknown references stayed at zero results.
- A late hosted response was ignored after preview exit.
- The route-policy test and existing icon-grid and localization checks passed.
- VC-3 and VC-4 passed against the exact staged web directory.
- Root and MCP dependency audits reported zero known vulnerabilities.

## Exact production boundary

- Netlify site: `supericons.dev`
- Site ID: `dcccabac-ae47-4c69-80c4-aefc8c15e2e5`
- Current and rollback deploy: `6a4c656b9a68bd1909b8ba2c`
- Maximum production deploys: 1
- Maximum exact restores: 1
- Build after artifact verification: 0

The runner stops before deployment if the current published deploy is not the pinned rollback deploy. It writes a one-use local receipt immediately before the deploy. Any post-deploy failure restores only the pinned deploy and makes the manifest terminal.

## Independent review requested

Review the manifest, rebuild the exact artifact, run the packet verifier, and inspect the deploy and rollback command boundaries. The external action should proceed only after two independent reviewers return GO on the same manifest and source commit.

The accepted product decision is unchanged: repair MCP preview links on the website before invitations are shared. Independent review is the remaining safety gate, not a request to revisit that decision.
