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

## External action status

This packet prepares evidence for independent review. It does not itself authorize or perform a deployment. No reviewer GO is recorded in this packet yet.

The accepted product decision is unchanged: correct the public MCP setup and access guidance before invitations are shared. Review is the remaining safety gate, not a request to revisit that product decision.
