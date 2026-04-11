# Factual Verification Report: Supericons Client Guides

**Verification date:** 10 April 2026
**Verifier:** Antigravity (Gemini)

## Sources verified against

| Guide | URL |
|---|---|
| Claude Code | [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) |
| Codex MCP | [developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp) |
| Codex Agents SDK | [developers.openai.com/codex/guides/agents-sdk](https://developers.openai.com/codex/guides/agents-sdk) |
| Cursor | [cursor.com/docs/mcp](https://cursor.com/docs/mcp) (rate-limited; prior session verification applies) |

---

## Verdict table

| ID | Guide | Item being verified | Status | Finding |
|---|---|---|---|---|
| V-1 | Claude Code | CLI install command: `claude mcp add supericons -- npx -y supericons-mcp` | PASS | Official syntax: `claude mcp add [options] <name> -- <command> [args...]`. Match confirmed. |
| V-2 | Claude Code | Windows variant: `cmd /c npx -y supericons-mcp` | PASS | Official docs explicitly document `cmd /c npx -y @some/package` as the Windows form. Match confirmed. |
| V-3 | Claude Code | heroNote proposed config path `~/.config/claude-code/mcp.json` | FAIL | Path does not exist. Official docs state config is stored in `~/.claude.json` (local/user scope) and `.mcp.json` (project scope). Corrected in refined copy plan as FA-1. |
| V-4 | Claude Code | Corrected heroNote paths `~/.claude.json` and `.mcp.json` | PASS | Confirmed from official scope table in the docs. |
| V-5 | Claude Code | `/mcp` TUI command to check servers | PASS | Official docs show `# (within Claude Code) Check server status /mcp`. Match confirmed. |
| V-6 | Codex | CLI install command: `codex mcp add supericons -- npx -y supericons-mcp` | PASS | Official syntax: `codex mcp add <server-name> -- <stdio server-command>`. Example confirms `codex mcp add context7 -- npx -y @upstash/context7-mcp`. Match confirmed. |
| V-7 | Codex | Config file path: `~/.codex/config.toml` | PASS | Official: "By default this is `~/.codex/config.toml`". Match confirmed. |
| V-8 | Codex | Project-scoped config: `.codex/config.toml` | PASS | Official: "scope MCP servers to a project with `.codex/config.toml` (trusted projects only)". Match confirmed. |
| V-9 | Codex | TOML block: `[mcp_servers.supericons]` | PASS | Official: "Configure each MCP server with a `[mcp_servers.<server-name>]` table". Match confirmed. |
| V-10 | Codex | TOML field `command = "npx"` and `args` array | PASS | Official example: `[mcp_servers.context7] command = "npx" args = ["-y", "@upstash/context7-mcp"]`. Match confirmed. |
| V-11 | Codex | `/mcp` TUI command to see active MCP servers | PASS | Official: "In the codex TUI, use `/mcp` to see your active MCP servers." Match confirmed. |
| V-12 | Codex | MCP config shared across CLI and IDE extension | PASS | Official: "The CLI and the IDE extension share this configuration." Useful fact to surface in guide copy. |
| V-13 | Codex | "Web" and "App" Codex clients using MCP | NEW FINDING | Official Codex MCP docs state MCP applies to "both the CLI and the IDE extension." The Codex App (web app) and Web (cloud task runner) are NOT confirmed to support local stdio MCP servers. |
| V-14 | Cursor | JSON config `{"mcpServers": {"supericons": {"command":"npx","args":["-y","supericons-mcp"]}}}` | PARTIAL | Cursor docs were rate-limited. Based on standard MCP JSON format (same as Claude Desktop) this is correct. Prior session research confirmed `~/.cursor/mcp.json`. Cannot re-confirm today. |
| V-15 | Codex Agents SDK | `codex mcp-server` command to run Codex as an MCP server | NOT APPLICABLE | This is about Codex acting as a server, not a client. Not relevant to the Supericons guide. |

---

## Critical new finding: Codex MCP scope (V-13)

The official Codex MCP page states:

> "Codex supports MCP servers in both **the CLI and the IDE extension**."

This means:
- **Codex CLI** - MCP supported. `codex mcp add` command works.
- **Codex IDE extension** - MCP supported. Shares `~/.codex/config.toml` with the CLI.
- **Codex App** (codex.openai.com web app) - MCP NOT mentioned in MCP docs.
- **Codex Web** (cloud task runner) - MCP NOT mentioned in MCP docs.

### Impact on the Supericons guide

The current Codex guide in `store.js` targets MCP setup for "Codex" broadly. It should be scoped to **CLI and IDE extension** only to avoid misleading users on the web app or cloud runner.

### Corrected heroNote - After copy (in `client-guides-copy-refined.md`)

> `MCP is supported in the Codex CLI and IDE extension. The CLI command is the quickest path. Prefer a config file? Add the same values to <code>~/.codex/config.toml</code> under <code>[mcp_servers.supericons]</code>.`

---

## Summary of all changes tracked

| Action | Item | Status |
|---|---|---|
| Already corrected | FA-1: Claude Code heroNote config path `~/.config/claude-code/mcp.json` to `~/.claude.json` / `.mcp.json` | Done in `client-guides-copy-refined.md` |
| Corrected (V-13) | Codex heroNote updated to scope MCP to CLI and IDE extension only | Done in `client-guides-copy-refined.md` |
| Verified | All CLI command syntax for all three guides | PASS - no changes needed |
| Rate-limited | Cursor config path and JSON schema | Prior session PASS remains; flagged for re-check |

---

## Cursor note

Cursor's docs were rate-limited (429) on both verification attempts. However:
1. The JSON config structure `{"mcpServers": {"supericons": {"command":"npx","args":["-y","supericons-mcp"]}}}` is the universal MCP JSON format used across all MCP clients.
2. The `~/.cursor/mcp.json` path was confirmed in prior session research.
3. No contradictory information was found.

Cursor findings remain: **PASS** with caveat that rate-limiting prevents re-confirmation from `cursor.com/docs/mcp` as of 10 April 2026.

---

## Verification sources used

| Source | Outcome |
|---|---|
| `code.claude.com/docs/en/mcp` | Fetched and read in full. Same content as `docs.anthropic.com/en/docs/claude-code/mcp`. |
| `developers.openai.com/codex/mcp` | Fetched and read. Setup content confirmed at lines 1028-1393. |
| `developers.openai.com/codex/guides/agents-sdk` | Fetched and read. This covers Codex-as-server, not relevant to Supericons guide. |
| `cursor.com/docs/mcp` | Rate-limited (HTTP 429). Cannot re-confirm. |
