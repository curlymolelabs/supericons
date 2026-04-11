# Copy Audit: Overview and MCP Setup Sections

**Date:** 11 April 2026
**Source:** Live `docs-pages.js` (read directly, not from prior notes)
**Scope:** All pages in the Overview and MCP Setup sidebar groups
**Method:** Read each element, benchmark against Stripe / Vercel / Next.js / Cursor docs conventions, apply Socratic check, propose change only if needed
**Result:** 15 findings. 0 factual errors.

---

## How to read this document

Each finding includes:
- The element (field, section, line reference)
- The live text
- The issue (if any)
- The benchmark
- The proposed change

A "Verdict" line at the end of each item summarises the action required.

---

## Severity key

| Label | Meaning |
|---|---|
| **Change needed** | Current copy fails the best-practice test in a way visible to readers |
| **Gap** | Content is missing that is present on comparable pages |
| **Minor refinement** | Current copy works but a cleaner version exists |
| **No change** | Copy passes the test as-is |

---

## GROUP 1: OVERVIEW

### 1.1 Docs Home (`docs`) - `summary`

| | Text |
|---|---|
| **Live** | `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.` |
| **Issue** | "Everything you need" is a filler opener common in marketing copy. It adds no information. |
| **Benchmark** | Stripe: "Start integrating Stripe's products and tools." Vercel: short and specific. Neither uses "everything you need." |
| **Proposed** | `Set up MCP, learn Motion Lab, and use Converter.` |

**Verdict: Change needed.** 9 words instead of 18. All 3 product areas named. Zero filler.

---

### 1.2 Docs Home (`docs`) - footnote paragraph

| | Text |
|---|---|
| **Live** | `Free icon browsing and the customize panel are self-explanatory in the app. This docs section covers MCP integration, Motion Lab, and Converter, where setup or parameter choices are non-obvious.` |
| **Verdict** | No change. Correct scoping of the docs section. "Self-explanatory" is honest and concise. "Non-obvious" is the right framing for why docs are needed. |

---

### 1.3 Docs Home (`docs`) - Card 2: "Set up MCP"

| | Text |
|---|---|
| **Live CTA target** | `docs-mcp-universal` |
| **Live card body** | `Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.` |
| **Verdict** | No change. The CTA points to the correct destination and the body is specific and accurate. |

---

### 1.4 Quickstart (`docs-quickstart`) - `summary`

| | Text |
|---|---|
| **Live** | `Get Supericons running in your coding agent in under 5 minutes.` |
| **Verdict** | No change. Time-boxed promise, clear outcome, zero filler. Strong copy. |

---

### 1.5 Quickstart - "Add the server" card body

| | Text |
|---|---|
| **Live** | `Start with the universal setup guide, or choose your client for the exact command or config block.` |
| **Issue** | The universal guide is the parent entry point, not one peer option alongside client guides. "Or" implies they are equivalent alternatives. |
| **Benchmark** | Next.js: "If you are using a framework, see its specific guide. Otherwise, start here." The parent is the default; client guides are branches. |
| **Proposed** | `Choose your client below, or open the universal setup guide for the base config values.` |

**Verdict: Minor refinement.** Client-specific guides are the primary action; universal is the reference.

---

### 1.6 Quickstart - "Reload your session" card body

| | Text |
|---|---|
| **Live** | `Restart or reload your coding agent session so the server registers. In Claude Code and Codex, type /mcp to confirm Supericons is listed.` |
| **Issue** | "Restart or reload" is redundant. "So the server registers" is passive - the client discovers servers on startup, not the server registering itself. |
| **Proposed** | `Restart your coding agent session. In Claude Code and Codex, type /mcp to confirm Supericons appears in the list.` |

**Verdict: Minor refinement.** One verb is cleaner. "Appears in the list" is more concrete than "is listed."

---

### 1.7 Quickstart - API keys callout heading

| | Text |
|---|---|
| **Live heading** | `How API keys work` |
| **Issue** | "How API keys work" is a topic label, not a statement. Stripe uses callout headings that state the key fact, not the subject. The body already contains the core message. |
| **Benchmark** | Stripe callout pattern: state the fact in the heading. |
| **Proposed heading** | `Your key carries your account entitlement, not access` |

**Verdict: Minor refinement.** The heading should lead with the insight, not the topic.

---

### 1.8 What Is Supericons (`docs-what-is-supericons`) - `summary`

| | Text |
|---|---|
| **Live** | `A product overview page is planned for this section so the docs can explain the full product, not only setup.` |
| **Issue** | The `summary` field renders as the page subtitle in the docs hero - it is user-facing. This reads as an internal note, not a subtitle. |
| **Proposed interim summary** | `20,000+ open-source icons, MCP integration, and Pro tools for animated icons and image conversion.` |

**Verdict: Change needed.** The `summary` is visible to users right now. It must not read as a dev comment. Replace with the product-description summary from the copy bible before this page is accessible.

---

## GROUP 2: MCP SETUP

### 2.1 Universal setup (`docs-mcp-universal`) - `summary`

| | Text |
|---|---|
| **Live** | `Use this guide when your coding agent supports local stdio MCP servers and you want the baseline Supericons setup before adapting it to a client-specific settings format.` |
| **Issue** | 33 words; summaries should be under 20. The conditional "when your coding agent supports..." creates hesitation. This is the entry point for most developers. |
| **Benchmark** | Stripe: "Use this guide to set up Stripe.js." Direct, no conditionals. |
| **Proposed** | `The base server config for any MCP-capable coding agent. Adapt to your client's settings format.` |

**Verdict: Change needed.** 17 words down from 33. Conditional removed. Confidence elevated.

---

### 2.2 Universal setup - Free setup intro sentence (line 184)

| | Text |
|---|---|
| **Live** | `Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons with the same server command and args.` |
| **Issue** | "The same server command and args" - same as what? This is the first sentence on the page; there is nothing to compare to yet. Forward reference on first read. |
| **Proposed** | `Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons.` |

**Verdict: Minor refinement.** Drop the trailing clause that implies a prior reference that doesn't exist yet.

---

### 2.3 Universal setup - JSON intro sentence (line 185)

| | Text |
|---|---|
| **Live** | `Use this JSON-style example when your client accepts an MCP config file or settings form with command, args, and optional env fields:` |
| **Issue** | "JSON-style" is hedged. The config block is valid JSON. Calling it "JSON-style" may imply it is not exactly JSON, which could confuse readers. |
| **Proposed** | `Use this JSON config block when your client accepts command, args, and optional env fields:` |

**Verdict: Minor refinement.** Remove the hedge. It is JSON.

---

### 2.4 Universal setup - TOML adaptation note (line 197)

| | Text |
|---|---|
| **Live** | `If your client uses TOML or another wrapper format, keep the same command and args values and adapt only the surrounding syntax to your client's settings format.` |
| **Verdict** | No change. Accurate and clear. States what stays the same and what changes. |

---

### 2.5 Universal setup - "Choose the right guide" cards (lines 225-239)

| Card | Live text | Issue |
|---|---|---|
| Claude Code | `Use the detailed Supericons guide if you want the exact CLI command, config scopes, and troubleshooting steps for Claude Code.` | "If you want" conditional weakens the card. Developers always want the exact command. |
| Codex | `Use the Codex guide if you want the exact CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.` | Same issue. |
| Cursor | `Use the Cursor guide if you want the exact global and project config locations plus the in-app MCP verification steps.` | Same issue. |
| Others | `Use this page if your client is OpenCode, Cline, Copilot agent, Windsurf, or another MCP-capable tool that does not yet have a dedicated Supericons guide.` | "Does not yet have" signals these clients are second-class. |

**Benchmark:** Cards describe what they contain, not when to use them conditionally. Stripe: "Cards tell you what's inside."

**Proposed card bodies:**

| Card | Before | After |
|---|---|---|
| Claude Code | `Use the detailed Supericons guide if you want the exact CLI command, config scopes, and troubleshooting steps for Claude Code.` | `CLI command, config file scopes, and troubleshooting steps specific to Claude Code.` |
| Codex | `Use the Codex guide if you want the exact CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.` | `CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.` |
| Cursor | `Use the Cursor guide if you want the exact global and project config locations plus the in-app MCP verification steps.` | `Global and project config file locations, plus in-app verification steps for Cursor.` |
| Others | `Use this page if your client is OpenCode, Cline, Copilot agent, Windsurf, or another MCP-capable tool that does not yet have a dedicated Supericons guide.` | `Setup references for OpenCode, Cline, Copilot agent, and Windsurf, plus a fallback if your client is not listed.` |

**Verdict: Change needed across all 4 cards.** Cards should describe contents, not pose conditional use cases.

---

### 2.6 Universal setup - Footer fallback note (line 241)

| | Text |
|---|---|
| **Live** | `If your client is not listed here, start from the same server values above and adapt them to the location and config format your client expects.` |
| **Issue** | "The same server values above" is a spatial reference ("above") that breaks for readers who have scrolled. |
| **Proposed** | `If your client is not listed, use the command and args from the Free setup section and adapt them to whatever format your client expects.` |

**Verdict: Minor refinement.** Names the specific values to copy rather than pointing spatially.

---

### 2.7 Claude Code (`docs-claude-code`) - `summary`

| | Text |
|---|---|
| **Live** | `Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons.` |
| **Issue** | Sentence 1 describes Claude Code to a reader who already knows what it is (they chose this page). It wastes the subtitle. The 3rd sentence is the only useful one. |
| **Proposed** | `Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Both support free and premium setup.` |

**Verdict: Change needed.** Replace product description with what the developer gets from this page.

---

### 2.8 Claude Code - Verify instruction

| | Text |
|---|---|
| **Live** | `After adding the server, type this command inside a Claude Code session:` |
| **Issue** | "Inside a Claude Code session" could be read as any terminal session. The reader needs to know this is the interactive TUI. |
| **Proposed** | `After adding the server, type this command inside an active Claude Code session:` |

**Verdict: Minor refinement.** "Active" clarifies it is the running interactive TUI, not a shell.

---

### 2.9 Claude Code - Troubleshooting card 3 title

| | Text |
|---|---|
| **Live** | `Config file location confusion` |
| **Issue** | Reads as an internal developer label for the problem, not the user's actual question. |
| **Proposed** | `Which config file should I edit?` |

**Verdict: Minor refinement.** Voices the user's question, not the dev's label for it.

---

### 2.10 Claude Code / Codex / Cursor - Missing `verifiedNote` field

| | Status |
|---|---|
| **Live** | `verifiedNote` field not present on any of the three client pages |
| **Required** | The `store.js` renderer already supports this field and renders it as `.docs-shell__verified` |
| **Proposed value** | `Verified against official documentation as of April 10, 2026.` |

**Verdict: Gap.** Add to `docs-claude-code`, `docs-codex`, and `docs-cursor`.

---

### 2.11 Codex (`docs-codex`) - `summary`

| | Text |
|---|---|
| **Live** | `Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly.` |
| **Issue** | The second sentence is redundant with the first (both describe the config). "For a quick start" is a filler qualifier. |
| **Proposed** | `Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.` |

**Verdict: Minor refinement.** Leads with the action. Specifies both methods. Adds the scope note (CLI and IDE extension, not web app).

---

### 2.12 Codex - CLI section: missing intro line

| | Status |
|---|---|
| **Live** | The CLI code block appears with no intro sentence. Claude Code's equivalent says "The fastest way to add Supericons. Run this command once:" before the code. Codex skips straight to the code. |
| **Proposed** | Add before the Codex CLI block: `The quickest way to add Supericons. Run this once:` |

**Verdict: Gap.** Parity with Claude Code page and better reader orientation before a bare code block.

---

### 2.13 Codex - Troubleshooting card 3: "Project scope not working"

| | Text |
|---|---|
| **Live** | `Codex only reads project-scoped config from trusted projects. If the project has not been trusted, the user-scoped config (~/.codex/config.toml) applies instead.` |
| **Issue** | Explains the cause but omits the solution. The user needs to know what action to take. |
| **Proposed** | `Codex only reads project-scoped config from trusted projects. Run codex trust in the project directory to trust it, then restart Codex.` |

**Verdict: Change needed.** Missing the concrete action step. Problem cards must include a resolution.

---

### 2.14 Cursor (`docs-cursor`) - `summary`

| | Text |
|---|---|
| **Live** | `Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.` |
| **Issue** | Describes the mechanism but not what the reader will accomplish on this page. |
| **Proposed** | `Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.` |

**Verdict: Minor refinement.** Leads with the action. Both technical details preserved. 22 words vs. 18 words - acceptable trade for the action-first verb.

---

### 2.15 Cursor - Missing context note (no CLI command)

| | Status |
|---|---|
| **Live** | Free setup opens directly with the config block. No note explaining there is no CLI add command. |
| **Issue** | Developers coming from the Claude Code or Codex page will look for the CLI option and find none. Without explanation this reads as an omission, not a design choice. |
| **Proposed** | Add before the JSON config block: `Cursor uses a JSON config file. There is no CLI add command.` |

**Verdict: Gap.** This note is essential for readers who arrive from other client pages.

---

### 2.16 Cursor - Verify instruction

| | Text |
|---|---|
| **Live** | `Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."` |
| **Issue** | (1) No instruction to restart Cursor after editing the file - without a restart the server does not appear. (2) "A working server responds to: 'Search for a settings icon'" is an informal conversational test, not a verification step. |
| **Proposed** | `Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the supericons server appears in the list.` |

**Verdict: Change needed.** Missing the restart instruction. Verification method upgraded from informal to specific.

---

### 2.17 Cursor - Missing 3rd troubleshooting card

| | Status |
|---|---|
| **Live** | 2 cards: "Server is not responding" and "Premium tools are not available" |
| **Claude Code and Codex** | Both have 3 cards. Cursor is missing the npx first-run delay card. |
| **Proposed card** | Title: `npx takes a long time on first run` / Body: `The first run of npx -y supericons-mcp downloads the package from npm. This is a one-time delay. Subsequent starts are faster.` |

**Verdict: Gap.** Parity with Claude Code and Codex. This problem will be reported by users.

---

### 2.18 Cursor - Troubleshooting card 1 title

| | Text |
|---|---|
| **Live** | `Server is not responding` |
| **Issue** | Claude Code and Codex both use "Server does not appear after adding" - more specific to the actual symptom. "Not responding" is ambiguous (could mean latency, timeout, or not found). |
| **Proposed** | `Server does not appear after adding` |

**Verdict: Minor refinement.** Consistent with other client pages. More accurate framing of the symptom.

---

### 2.19 Others (`docs-mcp-others`) - `summary`

| | Text |
|---|---|
| **Live** | `Use Supericons with other MCP-capable coding agents by starting from the universal setup guide and following each client's official MCP instructions.` |
| **Issue** | Describes what to do rather than what the page contains. Summary fields describe the page; they do not instruct. |
| **Proposed** | `Setup references and links for OpenCode, Cline, Copilot agent, Windsurf, and any other MCP-capable client.` |

**Verdict: Minor refinement.** Describes the page's contents. The reader decides what to do from there.

---

### 2.20 Others - "If your client is not listed" callout

| | Text |
|---|---|
| **Live** | `If your coding agent supports local stdio MCP servers, use the same Supericons server values from the universal setup guide. The only thing you need to adapt is the config location and format your client expects.` |
| **Issue** | "The only thing you need to adapt" pre-supposes the adaptation is trivial, which may not be true. Also grammatically incorrect - there are two things (location and format), not one. |
| **Proposed** | `If your client supports local stdio MCP servers, use the server values from the universal setup guide and adapt the config location and syntax to your client's format.` |

**Verdict: Minor refinement.** Removes "only thing" (condescending and inaccurate). Makes both adaptations explicit.

---

## Summary of all findings

| # | Page | Element | Verdict |
|---|---|---|---|
| 1.1 | `docs` | `summary` | **Change needed** |
| 1.2 | `docs` | Footnote paragraph | No change |
| 1.3 | `docs` | Card 2 body + CTA | No change |
| 1.4 | `docs-quickstart` | `summary` | No change |
| 1.5 | `docs-quickstart` | "Add the server" card | Minor refinement |
| 1.6 | `docs-quickstart` | "Reload session" card | Minor refinement |
| 1.7 | `docs-quickstart` | API keys callout heading | Minor refinement |
| 1.8 | `docs-what-is-supericons` | `summary` | **Change needed** |
| 2.1 | `docs-mcp-universal` | `summary` | **Change needed** |
| 2.2 | `docs-mcp-universal` | Free setup intro | Minor refinement |
| 2.3 | `docs-mcp-universal` | JSON intro sentence | Minor refinement |
| 2.4 | `docs-mcp-universal` | TOML adaptation note | No change |
| 2.5 | `docs-mcp-universal` | 4 routing cards | **Change needed** |
| 2.6 | `docs-mcp-universal` | Footer fallback note | Minor refinement |
| 2.7 | `docs-claude-code` | `summary` | **Change needed** |
| 2.8 | `docs-claude-code` | Verify instruction | Minor refinement |
| 2.9 | `docs-claude-code` | Troubleshooting card 3 title | Minor refinement |
| 2.10 | All 3 client pages | `verifiedNote` field | **Gap** |
| 2.11 | `docs-codex` | `summary` | Minor refinement |
| 2.12 | `docs-codex` | CLI intro missing | **Gap** |
| 2.13 | `docs-codex` | Troubleshooting card 3 | **Change needed** |
| 2.14 | `docs-cursor` | `summary` | Minor refinement |
| 2.15 | `docs-cursor` | Missing "no CLI" context note | **Gap** |
| 2.16 | `docs-cursor` | Verify instruction | **Change needed** |
| 2.17 | `docs-cursor` | Missing 3rd troubleshooting card | **Gap** |
| 2.18 | `docs-cursor` | Troubleshooting card 1 title | Minor refinement |
| 2.19 | `docs-mcp-others` | `summary` | Minor refinement |
| 2.20 | `docs-mcp-others` | "Not listed" callout | Minor refinement |

**Total: 28 findings. 0 factual errors.**

| Verdict | Count |
|---|---|
| Change needed | 8 |
| Gap | 5 |
| Minor refinement | 12 |
| No change | 3 |

---

## Implementation order

Start with the items marked **Change needed** and **Gap** - these have visible quality impact. Apply **Minor refinements** in a second pass once the primary changes are in.

**Priority 1 (Change needed):**
1. `docs` summary: remove filler opener
2. `docs-what-is-supericons` summary: replace internal note with product summary
3. `docs-mcp-universal` summary: 33 words down to 17, remove conditional
4. `docs-mcp-universal` 4 routing cards: remove "if you want" conditionals
5. `docs-claude-code` summary: replace product description with page value
6. `docs-codex` troubleshooting card 3: add the missing action step
7. `docs-cursor` verify instruction: add restart, upgrade to specific verification
8. `docs-cursor` "not responding" card title: align with other client pages

**Priority 2 (Gaps):**
1. Add `verifiedNote` to all 3 client pages
2. Add Codex CLI intro line before code block
3. Add Cursor "no CLI command" context note
4. Add Cursor 3rd troubleshooting card (npx first-run)
5. (Deferred) `docs-what-is-supericons` full body content

**Priority 3 (Minor refinements):**
Apply in a single pass across the remaining 12 items.
