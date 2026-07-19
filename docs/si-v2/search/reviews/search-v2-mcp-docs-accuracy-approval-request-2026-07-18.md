# Search v2 MCP setup and access accuracy release request

Date: 2026-07-18

## Outcome

This web-only release removes two setup traps before beta invitations are shared:

- The API key docs now state today's real policy. Free local and hosted MCP search, preview, retrieval, and library listing work without a key. A key connects an eligible account to purchased packs or Pro access.
- The landing page now shows a working setup and file location for each advertised MCP client. The seven client labels are functional tabs instead of decorative labels over one generic setup.

The public setup continues to use `@supericons/mcp@latest`. It does not advertise a beta package.

## User-visible behavior

- Claude Code, Codex, Cursor, OpenCode, Cline, GitHub Copilot CLI, and Windsurf each show their own setup.
- Selecting a tab changes the file location and setup text.
- The copy button copies the active setup.
- Keyboard users can move through the tabs with Arrow, Home, and End keys.
- The tab row remains reachable on a narrow screen.
- The API key docs explain which free MCP tools work without a key.
- The docs state that API keys are currently available to accounts with an active Pro subscription or at least one pack purchase.
- The future registered-free higher-limit offer is not advertised before that product exists.

## Local evidence

- The exact protected web artifact contains 188 files and 41,235,944 bytes.
- Its content-tree SHA-256 is `c465324c7a8294a76f5f483bad6606755925b63fa577591763262d6b86ab3487`.
- Browser checks pass for all seven tabs, exact setup text, file locations, clipboard behavior, keyboard navigation, and narrow-screen access.
- The browser test verifies the English keyless statement and a German localized spot check.
- Website and MCP locale catalogs match their maintained source files.
- Human review owns the meaning and truthfulness of the wording across all 12 maintained locales. The packet does not claim a mechanical truth check.
- The earlier MCP preview persistence behavior remains green.
- VC-3 and VC-4 pass against the exact protected web directory.
- The dependency audit reports zero known vulnerabilities.

## Exact production boundary

- Netlify site: `supericons.dev`
- Site ID: `dcccabac-ae47-4c69-80c4-aefc8c15e2e5`
- Current and rollback deploy: `6a5a62e4382d02608226d0f7`
- Maximum production deploys: 1
- Maximum exact restores: 1
- Builds after artifact verification: 0

The runner stops before reservation if production no longer matches the pinned rollback deploy. It writes a one-use local receipt immediately before deployment. Any failure after a deployment attempt restores only the pinned deploy, verifies that restoration, records the outcome, and blocks replay.

The Netlify command is bound to version `23.15.1` and to the exact hashes of its entry point and package record.

## First release attempt

The first one-use manifest was consumed on 2026-07-20. Netlify accepted deploy `6a5d3aaf20758f02b79be91a`, but its site record briefly continued to report the previous production deploy. The runner treated that temporary response as a mismatch and restored the pinned deploy `6a5a62e4382d02608226d0f7`. The local receipt records status `rolled_back`.

The second one-use manifest added a bounded visibility wait. Netlify accepted deploy `6a5d3c3a02c7340daaf4715e`, and the intended deploy became visible. The later live check incorrectly normalized the provenance file's line endings before comparing them with its raw-byte hash, so the runner again restored the pinned deploy. Direct checks against that deploy's permanent URL confirmed the raw provenance SHA-256 is the expected `e86d3d35ad3b5bd1436d19d3c44964a5693ff3044db21480511f0e4b26628a94`, all three canaries are present, and the client-tab and preview suites pass.

The current replacement packet keeps the same site, artifact, mutation budget, and rollback target. It checks the published deploy up to 30 times at two-second intervals before treating visibility as failed, and it verifies the provenance file as exact response bytes. A timeout or any later live verification failure still restores only the pinned deploy.

## External action status

This replacement packet prepares evidence for independent review after both earlier attempts restored production. It does not itself authorize or perform another deployment. The replacement manifest must pass its full packet verification before external execution.

The accepted product decision is unchanged: correct the public MCP setup and access guidance before invitations are shared. Review is the remaining safety gate, not a request to revisit that product decision.
