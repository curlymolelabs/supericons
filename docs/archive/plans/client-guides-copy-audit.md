# Client Guides Copy Audit

Scope: `store.js` - `getDocsGuideConfig()` function, lines 4531-4742.
Pages audited: Claude Code (`docs-claude-code`), Codex (`docs-codex`), Cursor (`docs-cursor`).
No code was changed.

---

## Audit methodology

Each guide is evaluated against five criteria:

1. **Accuracy** - Is every factual claim correct?
2. **Consistency** - Does terminology match the consolidated docs page and the other guides?
3. **Tone** - Is the language active, developer-facing, and appropriately direct?
4. **Parallelism** - Do the three guides follow the same structural and linguistic pattern?
5. **Editorial quality** - Are there redundant phrases, jargon, awkward constructions, or missing context?

---

## Cross-guide issues (apply to all three)

### CG-1: Brand casing inconsistency - "SuperIcons" vs "Supericons"

**Severity: High.**

The Claude Code and Codex guides use **"SuperIcons"** (capital I) in the `title` and `heroCopy` fields. The Cursor guide also uses "SuperIcons" in the hero copy. The consolidated docs page, the MCP package name (`supericons-mcp`), and the canonical domain (`supericons.dev`) all use lowercase "Supericons". This is a brand name inconsistency that will erode trust if users cross-reference any of these surfaces.

| Field | Claude Code | Codex | Cursor |
|---|---|---|---|
| `title` | "SuperIcons" | "SuperIcons" | "SuperIcons" |
| `heroCopy` | "SuperIcons" | "SuperIcons" | "SuperIcons" |
| `exampleCode` | "SuperIcons" | "SuperIcons" | not present |

**Recommended fix:** Replace every instance of "SuperIcons" with "Supericons" across all three guide configs.

---

### CG-2: "entitlement" / "entitlements" jargon

**Severity: Medium.**

The word "entitlement" and its variants appear in multiple places across the guides:
- Codex `premiumCards[0].title`: "Entitlement first"
- Codex `premiumCards[0].copy`: "carries the premium collections your Supericons account already owns"
- Claude Code `troubleshootingCards[2].copy`: "right Supericons entitlement"
- Codex `troubleshootingCards[2].copy`: "depends on your Supericons entitlement"
- Cursor `premiumCards[0].copy`: "Supericons entitlement"

This word was already flagged and replaced in the consolidated docs page (the "Entitlements" card was renamed to "Access by plan"). The guides should use the same plain-English alternatives: "account" + subscription/collection phrasing is sufficient context without "entitlement".

**Recommended replacements:**
- "entitlement" (noun) -> "Pro subscription or collection purchase"
- "right Supericons entitlement" -> "an active Pro subscription or purchased collection"
- "Supericons entitlement" -> "your Supericons account"

---

### CG-3: "paid plan" is vague and undervalues the product

**Severity: Low-Medium.**

Three troubleshooting cards across the guides use the phrase "paid plan":
- Claude Code: "without a paid plan"
- Codex: "without a paid plan"
- Cursor: "without a paid plan"

This is generic SaaS language. "Paid plan" understates the product's actual model (which has a Pro subscription tier and individual collection purchases). It should say "Pro subscription" to be specific and to reinforce the upgrade path.

**Recommended fix:** Replace "paid plan" with "Pro subscription" in all three guides.

---

### CG-4: Hero CTA buttons are generic and identical across all three guides

**Severity: Low-Medium.**

Every guide renders two CTA buttons from the shared template:
- "Docs hub" -> `/?view=docs`
- "Pricing" -> `/?view=pricing`

"Docs hub" is internal language - the page it links to is called "Docs" or "Supericons docs" everywhere else. A developer who has landed on the Claude Code guide page and sees "Docs hub" may not know where that goes, or may think it is a generic external link.

**Recommended fix:** Change "Docs hub" to "Back to docs" across the template. This is more directional, implies the guide is a sub-page, and matches what the breadcrumb or back navigation would convey.

Note: This is a template change (`renderDocsGuidePage`), not a per-guide copy change, but it originates from the guide content system.

---

### CG-5: "agent loop" phrasing in hero copy is inconsistent between guides

**Severity: Low.**

- Claude Code: "inside the same coding loop as edits, refactors, and UI iteration."
- Codex: "inside the same agent loop as code edits, refactors, and UI fixes."
- Cursor: "inside the same editor flow as your code assistant and patching workflow."

The intent of each hero copy is to explain the value of running icon search inside the coding agent session, not as a separate browser step. But the phrasing differs in structure and vocabulary ("coding loop", "agent loop", "editor flow"). This creates an inconsistent reading experience when a developer hops between guides.

More importantly, the Cursor hero copy adds "patching workflow" which is the most jargon-heavy of the three - developers don't generally call their work a "patching workflow".

**Recommended approach:** Standardize the idea while keeping client-specific details. Proposed pattern:

> "Add icon search and SVG retrieval to [client] without leaving your editor. Search, pick, and insert icons in the same session as your code edits."

Adapted per client:
- Claude Code: "...Add icon search and SVG retrieval to Claude Code without leaving the command line. Search, pick, and insert icons in the same session as your code edits."
- Codex: "Add icon search to your Codex session. Search, pick, and insert icons without context-switching to a browser."
- Cursor: "Add icon search and SVG retrieval to Cursor. Find and insert icons in the same editor session as your code."

---

## Claude Code - specific issues

### CC-1: Title capitalizes inconsistently with the product name

**Field:** `title`
**Current:** "Set up SuperIcons MCP in Claude Code"
**Issue:** "SuperIcons" brand casing error (covered in CG-1). Additionally, "Set up" is the correct two-word verb form for a setup instruction (not "Setup"). This is already correct here.
**Recommended:** "Set up Supericons MCP in Claude Code"

---

### CC-2: `heroNote` is not a note - it is a fallback instruction

**Field:** `heroNote`
**Current:** "If you manage Claude Code config as JSON instead of CLI commands, use the same `command` and `args` values in the MCP server entry Claude Code reads."
**Issue:** The sentence is passive and ends vaguely with "Claude Code reads." The developer needs to know where this JSON lives so they can act on the note.
**Recommended:** "Prefer JSON config over CLI? Use the same `command` and `args` values in your Claude Code MCP server entry (`~/.config/claude-code/mcp.json` or equivalent)."

This gives the developer an actionable reference point, not just a vague fallback.

---

### CC-3: Flow step 2 - unnecessary equivocation

**Field:** `flowCards[1].copy`
**Current:** "Use `claude mcp list` or restart the session so Claude Code discovers the new tool cleanly."
**Issue:** "discovers the new tool cleanly" is an informal phrase that pads the sentence without meaning. "Cleanly" is not a meaningful modifier here.
**Recommended:** "Run `claude mcp list` to verify the server registered, or restart the session if it is not listed."

---

### CC-4: Flow step 3 - "confirm the results come back" is weak

**Field:** `flowCards[2].copy`
**Current:** "Ask Claude Code to find an icon for a small UI task, then confirm the results come back from SuperIcons."
**Issue:** "Results come back from SuperIcons" is developer backend language. The user is interacting via natural language in the agent, so the confirmation should be framed accordingly. Also "small UI task" is vague.
**Recommended:** "Ask Claude Code to find an icon (e.g., a settings or navigation icon) and verify that the results include Lucide or Tabler options."

---

### CC-5: Premium card "How premium actually works" - "actually" is confrontational

**Field:** `premiumCards[0].title`
**Current:** "How premium actually works"
**Issue:** "Actually" as an emphasis word implies the reader may have been misled. It is confrontational. The intent is to clarify a common misunderstanding, which can be done without the confrontational framing.
**Recommended:** "How premium access works" or "What triggers premium access"

---

### CC-6: Premium card copy - "Claude Code launches the MCP server with your key" is technically loose

**Field:** `premiumCards[0].copy`
**Current:** "They unlock when your Supericons account has Pro or purchased collection access and Claude Code launches the MCP server with your `SUPERICONS_API_KEY`."
**Issue:** Claude Code does not "launch the MCP server" itself in all configurations - it reads the env or secrets field. "Launches the MCP server" implies execution control that the user might not associate with their setup step.
**Recommended:** "They unlock when your Supericons account has Pro or collection access and `SUPERICONS_API_KEY` is present in the MCP server config Claude Code uses at startup."

---

### CC-7: Troubleshooting - "stale registry issues" is jargon

**Field:** `troubleshootingCards[0].copy`
**Current:** "Most failures here are stale registry issues."
**Issue:** "Stale registry issues" is an implementation detail the user cannot act on. What they can act on is the instruction to restart.
**Recommended:** "If `claude mcp list` still does not show it, restart the Claude Code session."

---

## Codex - specific issues

### CX-1: Title - brand casing error

**Field:** `title`
**Current:** "Set up SuperIcons MCP in Codex"
**Recommended:** "Set up Supericons MCP in Codex"

---

### CX-2: Hero copy - "agent loop" is the most jargon-heavy of the three

**Field:** `heroCopy`
**Current:** "Use SuperIcons MCP in Codex when you want icon search to live inside the same agent loop as code edits, refactors, and UI fixes."
**Issues:** "agent loop" is internal ML/infra terminology. "UI fixes" frames icons as a repair task, not a build task.
**Recommended:** "Add icon search to your Codex session. Find and insert icons without switching to a browser - search, pick, and drop SVGs in the same coding flow as your edits."

---

### CX-3: `heroNote` references the config path incompletely

**Field:** `heroNote`
**Current:** "The CLI command is the quickest path. If you manage Codex manually, use the same values in `~/.codex/config.toml`."
**Issue:** This is actually helpful and accurate, but "manage Codex manually" is ambiguous - it sounds like a power-user warning rather than a simple alternative. "Manually" should be replaced with the actual scenario: managing config via a file instead of the CLI.
**Recommended:** "The CLI command is the quickest path. Prefer a config file? Add the same values to `~/.codex/config.toml` under `[mcp_servers.supericons]`."

---

### CX-4: Premium card 1 title - "Entitlement first" is jargon

**Field:** `premiumCards[0].title`
**Current:** "Entitlement first"
**Issue:** "Entitlement" jargon (covered in CG-2). The intent is to clarify that the API key alone is not enough - you need the account/subscription first.
**Recommended:** "Your account comes first"

---

### CX-5: Premium card 1 copy - redundant clause structure

**Field:** `premiumCards[0].copy`
**Current:** "Your API key carries the premium collections your Supericons account already owns through Pro or purchased collections. The key alone is not the entitlement."
**Issue:** The key does not "carry" collections - it authenticates to your account, which has the collections. "The key alone is not the entitlement" uses the jargon being replaced. The two sentences also repeat the same idea.
**Recommended:** "Your API key authenticates to your Supericons account. The collections and tools you can access depend on what your account actually owns - either a Pro subscription or purchased collection packs."

---

### CX-6: Premium card 2 title - "Codex setup note" is a meta-label, not a heading

**Field:** `premiumCards[1].title`
**Current:** "Codex setup note"
**Issue:** A card title should describe the content, not label it as "a note". This tells the reader nothing about what the note contains.
**Recommended:** "How to add your API key in Codex"

---

### CX-7: Troubleshooting - "Config saves but tool is absent"

**Field:** `troubleshootingCards[0].title`
**Current:** "Config saves but tool is absent"
**Issue:** "Tool is absent" sounds like a software debug log. This is a user-facing heading.
**Recommended:** "Server saved but not visible in Codex"

---

### CX-8: Troubleshooting - "Package resolution fails"

**Field:** `troubleshootingCards[1].title`
**Current:** "Package resolution fails"
**Issue:** "Package resolution" is npm/Node.js internals terminology. A developer troubleshooting this issue should see a heading that describes the symptom they observe, not the underlying npm process.
**Recommended:** "The `npx` command does not run"

---

### CX-9: Troubleshooting - "results are unavailable" is too passive

**Field:** `troubleshootingCards[2].title`
**Current:** "Premium results are unavailable"
**Issue:** Passive phrasing. Inconsistent with the other guides which say "Premium icons are missing" (Claude Code) or "Premium collections are missing" (Cursor). Should use the same pattern.
**Recommended:** "Premium icons do not appear"

---

## Cursor - specific issues

### CU-1: Title - brand casing error

**Field:** `title`
**Current:** "Set up SuperIcons MCP in Cursor"
**Recommended:** "Set up Supericons MCP in Cursor"

---

### CU-2: Hero copy - "patching workflow" is the worst phrase in the guides

**Field:** `heroCopy`
**Current:** "Use Cursor with SuperIcons MCP when you want icon search and SVG retrieval inside the same editor flow as your code assistant and patching workflow."
**Issues:** "Patching workflow" is not how developers describe their work. It sounds like bug-patching, not building UI. "Code assistant" is also redundant since Cursor is already established as an AI coding editor.
**Recommended:** "Add icon search and SVG retrieval to Cursor. Find and insert icons without leaving the editor - in the same session as your code edits and component builds."

---

### CU-3: Flow step 1 - "config surface your installation uses" is vague

**Field:** `flowCards[0].copy`
**Current:** "Open Cursor MCP settings and place the `supericons` server entry in the config surface your installation uses."
**Issue:** "Config surface your installation uses" is the most abstract phrase in the entire set of guides. The developer needs to know what they are looking for (a settings UI and/or a JSON file), not just that a "surface" exists.
**Recommended:** "Open Cursor settings, navigate to MCP, and paste the server config. Or add it directly to `~/.cursor/mcp.json`."

---

### CU-4: Flow step 2 - "Cursor should show the server" is hedged

**Field:** `flowCards[1].copy`
**Current:** "Cursor should show the server in its MCP tool list after the config is saved and reloaded."
**Issue:** "Should show" implies uncertainty. The step should be an instruction, not a prediction.
**Recommended:** "Save and reload. Verify the `supericons` server appears in Cursor's MCP tool list before testing."

---

### CU-5: Premium card 1 title - "What to connect" is abstract

**Field:** `premiumCards[0].title`
**Current:** "What to connect"
**Issue:** "Connect" is vague here. The user is not connecting two services - they are adding an API key to a config block. The title should describe what the action is.
**Recommended:** "What you need for premium access"

---

### CU-6: Premium card 1 copy - "Supericons entitlement" jargon

**Field:** `premiumCards[0].copy`
**Current:** "Premium MCP access requires your Supericons entitlement and a valid `SUPERICONS_API_KEY` in the Cursor MCP server entry."
**Issue:** "Supericons entitlement" jargon (covered in CG-2).
**Recommended:** "Premium MCP access requires an active Pro subscription or purchased collection on your Supericons account, plus a valid `SUPERICONS_API_KEY` in your Cursor MCP server config."

---

### CU-7: Troubleshooting - "The command does not run"

**Field:** `troubleshootingCards[1].title`
**Current:** "The command does not run"
**Issue:** Vague. "The command" could be any command. The heading should identify the specific command or symptom.
**Recommended:** "`npx` is not found or fails to start"

This is consistent with the Codex recommendation (CX-8: "The `npx` command does not run").

---

## Summary table

| ID | Guide | Field | Issue category | Recommended change (short) |
|----|-------|-------|---------------|---------------------------|
| CG-1 | All | title, heroCopy, exampleCode | Brand casing | "SuperIcons" -> "Supericons" |
| CG-2 | All | premiumCards, troubleshootingCards | Jargon | "entitlement" -> account + plan phrasing |
| CG-3 | All | troubleshootingCards | Vague | "paid plan" -> "Pro subscription" |
| CG-4 | All (template) | CTA button | Generic label | "Docs hub" -> "Back to docs" |
| CG-5 | All | heroCopy | Inconsistent phrasing | Standardize the "agent loop" value proposition |
| CC-1 | Claude Code | title | Brand casing | fix capitalisation |
| CC-2 | Claude Code | heroNote | Vague fallback | Add config file path reference |
| CC-3 | Claude Code | flowCards[1] | Weak phrasing | Remove "cleanly" filler |
| CC-4 | Claude Code | flowCards[2] | Vague instruction | Specify what to look for in results |
| CC-5 | Claude Code | premiumCards[0].title | Confrontational | Remove "actually" |
| CC-6 | Claude Code | premiumCards[0].copy | Technically loose | Clarify "launches" as "present in config at startup" |
| CC-7 | Claude Code | troubleshootingCards[0] | Jargon | "stale registry issues" -> actionable instruction |
| CX-1 | Codex | title | Brand casing | fix capitalisation |
| CX-2 | Codex | heroCopy | Jargon + negative framing | "agent loop" -> plain description |
| CX-3 | Codex | heroNote | Ambiguous | "manage Codex manually" -> "prefer a config file?" |
| CX-4 | Codex | premiumCards[0].title | Jargon | "Entitlement first" -> "Your account comes first" |
| CX-5 | Codex | premiumCards[0].copy | Redundant + inaccurate | Rewrite key-carries-collections metaphor |
| CX-6 | Codex | premiumCards[1].title | Meta-label | "Codex setup note" -> "How to add your API key in Codex" |
| CX-7 | Codex | troubleshootingCards[0].title | Debug log language | "Tool is absent" -> "not visible in Codex" |
| CX-8 | Codex | troubleshootingCards[1].title | Technical jargon | "Package resolution fails" -> "`npx` command does not run" |
| CX-9 | Codex | troubleshootingCards[2].title | Passive + inconsistent | "results are unavailable" -> "icons do not appear" |
| CU-1 | Cursor | title | Brand casing | fix capitalisation |
| CU-2 | Cursor | heroCopy | Worst phrase in set | Remove "patching workflow" |
| CU-3 | Cursor | flowCards[0].copy | Vague | "config surface" -> specific UI + file path |
| CU-4 | Cursor | flowCards[1].copy | Hedged instruction | "Should show" -> "Verify...appears" |
| CU-5 | Cursor | premiumCards[0].title | Abstract | "What to connect" -> "What you need for premium access" |
| CU-6 | Cursor | premiumCards[0].copy | Jargon | "entitlement" -> subscription + collection phrasing |
| CU-7 | Cursor | troubleshootingCards[1].title | Vague | "The command" -> "`npx` is not found or fails to start" |
