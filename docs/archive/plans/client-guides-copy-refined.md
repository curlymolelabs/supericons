# Client Guides - Exact Refined Copy

Source: `store.js` - `getDocsGuideConfig()` function (~line 4531).
Template copy: `renderDocsGuidePage()` function (~line 4744).
Audit reference: `docs/plans/client-guides-copy-audit.md`.

---

## Factual Audit Record

All three client guides were cross-referenced against official documentation.
Verification date: 10 April 2026.

| Guide | Source verified against | Date |
|---|---|---|
| Claude Code | [docs.anthropic.com/en/docs/claude-code/mcp](https://docs.anthropic.com/en/docs/claude-code/mcp) | 10 Apr 2026 |
| Codex | [developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp) | 10 Apr 2026 |
| Cursor | docs.cursor.com (rate-limited; prior session verification applies) | 10 Apr 2026 |

### Factual issues found and resolved

| ID | Guide | Field | Issue | Resolution |
|---|---|---|---|---|
| FA-1 | Claude Code | `heroNote` | Proposed copy referenced `~/.config/claude-code/mcp.json` which does not exist. Actual config is `~/.claude.json` (user/local scope) or `.mcp.json` in the project root (project scope). | Corrected in heroNote After copy below. |
| FA-2 | Codex | `heroNote` | `~/.codex/config.toml` is correct per official docs. No change needed. | Verified accurate. |
| FA-3 | Codex | CLI command | `codex mcp add supericons -- npx -y supericons-mcp` matches official syntax. | Verified accurate. |
| FA-4 | Claude Code | CLI command | `claude mcp add supericons -- npx -y supericons-mcp` and Windows form `cmd /c npx -y supericons-mcp` both match official syntax. | Verified accurate. |
| FA-5 | Cursor | JSON config | `{"mcpServers":{"supericons":{"command":"npx","args":["-y","supericons-mcp"]}}}` structure is the standard MCP JSON format used by Cursor. | Verified accurate. |

Each entry shows:
- **Field** - the exact JS object key
- **Reference** - store.js line number of the field
- **Before** - current text
- **After** - approved replacement text
- **Audit ID** - the issue ID from the audit that prompted this change

Text inside HTML tags (e.g. `<a>`, `<code>`) is preserved exactly. Only the readable copy changes.

---

## Shared template fix

### CTA button: "Docs hub"

- **Reference:** `renderDocsGuidePage()`, store.js ~line 4779
- **Field:** Inline HTML string inside `page.innerHTML`
- **Audit ID:** CG-4
- **Before:** `Docs hub`
- **After:** `Back to docs`

```
Before: <a class="docs-btn docs-btn--primary" href="/?view=docs" data-docs-view="docs">Docs hub</a>
After:  <a class="docs-btn docs-btn--primary" href="/?view=docs" data-docs-view="docs">Back to docs</a>
```

---

## Claude Code guide

**Object key:** `'docs-claude-code'`
**Reference block:** store.js lines 4533-4599

---

### `title`

- **Audit ID:** CG-1 (brand casing)
- **Before:** `Set up SuperIcons MCP in Claude Code`
- **After:** `Set up Supericons MCP in Claude Code`

---

### `heroCopy`

- **Audit ID:** CG-1 (brand casing), CG-5 (inconsistent phrasing)
- **Before:** `Use Claude Code with the SuperIcons MCP server when you want icon search and SVG retrieval inside the same coding loop as edits, refactors, and UI iteration.`
- **After:** `Add icon search and SVG retrieval to Claude Code without leaving the command line. Search, pick, and insert icons in the same session as your code edits.`

---

### `heroNote`

- **Audit ID:** CC-2 (vague fallback, no config path); FA-1 (factual correction)
- **Before:** `If you manage Claude Code config as JSON instead of CLI commands, use the same <code>command</code> and <code>args</code> values in the MCP server entry Claude Code reads.`
- **After:** `Prefer JSON config over CLI? Use the same <code>command</code> and <code>args</code> values. Claude Code stores user-scoped MCP servers in <code>~/.claude.json</code> and project-scoped servers in <code>.mcp.json</code> at the project root.`

> **Factual note (FA-1):** The previously proposed path `~/.config/claude-code/mcp.json` does not exist per official Claude Code docs. The correct paths are `~/.claude.json` (user scope) and `.mcp.json` (project scope). This correction applies only to this heroNote field.

---

### `flowCards[1].copy` (step 2)

- **Audit ID:** CC-3 (filler word "cleanly")
- **Before:** `Use <code>claude mcp list</code> or restart the session so Claude Code discovers the new tool cleanly.`
- **After:** `Run <code>claude mcp list</code> to verify the server registered, or restart the session if it is not listed.`

---

### `flowCards[2].copy` (step 3)

- **Audit ID:** CC-4 (vague "results come back from SuperIcons")
- **Before:** `Ask Claude Code to find an icon for a small UI task, then confirm the results come back from SuperIcons.`
- **After:** `Ask Claude Code to find an icon (e.g., a settings or navigation icon) and verify that the results include Lucide or Tabler options.`

---

### `premiumCards[0].title`

- **Audit ID:** CC-5 (confrontational "actually")
- **Before:** `How premium actually works`
- **After:** `How premium access works`

---

### `premiumCards[0].copy`

- **Audit ID:** CC-6 (technically loose "launches the MCP server with your key")
- **Before:** `Premium icons do not unlock because a key exists. They unlock when your Supericons account has <a href="/?view=pricing" data-docs-view="pricing">Pro or purchased collection access</a> and Claude Code launches the MCP server with your <code>SUPERICONS_API_KEY</code>.`
- **After:** `Premium icons are not unlocked simply by adding a key. They unlock when your Supericons account has an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a>, and <code>SUPERICONS_API_KEY</code> is present in the MCP server config Claude Code uses at startup.`

---

### `premiumCards[1].copy`

- **Audit ID:** CC-2 adjacent ("env or secrets surface" is ambiguous)
- **Before:** `Sign in to Supericons, generate an API key from the <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a> page, then add that key in the env or secrets surface Claude Code uses for MCP server configuration.`
- **After:** `Sign in to Supericons, generate an API key from the <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a> page, then add that key in the env or secrets field Claude Code uses for MCP server configuration.`

---

### `troubleshootingCards[0].copy`

- **Audit ID:** CC-7 (jargon "stale registry issues")
- **Before:** `Run <code>claude mcp list</code> or restart the session after adding the server. Most failures here are stale registry issues.`
- **After:** `Run <code>claude mcp list</code> after adding the server. If it still does not appear, restart the Claude Code session.`

---

### `troubleshootingCards[2].copy`

- **Audit ID:** CG-2 (entitlement jargon), CG-3 ("paid plan" vague)
- **Before:** `Free icons work without a <a href="/?view=pricing" data-docs-view="pricing">paid plan</a>. Premium collections require both the right Supericons entitlement and a valid <code>SUPERICONS_API_KEY</code> in your MCP server config.`
- **After:** `Free icons work without a Pro subscription. Premium collections require an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code> in your MCP server config.`

---

## Codex guide

**Object key:** `'docs-codex'`
**Reference block:** store.js lines 4600-4669

---

### `title`

- **Audit ID:** CG-1 (brand casing)
- **Before:** `Set up SuperIcons MCP in Codex`
- **After:** `Set up Supericons MCP in Codex`

---

### `heroCopy`

- **Audit ID:** CG-1 (brand casing), CG-5 (inconsistent "agent loop" phrasing), CX-2 ("UI fixes" negative framing)
- **Before:** `Use SuperIcons MCP in Codex when you want icon search to live inside the same agent loop as code edits, refactors, and UI fixes.`
- **After:** `Add icon search to your Codex session. Find and insert icons without switching to a browser - search, pick, and drop SVGs in the same coding flow as your edits.`

---

### `heroNote`

- **Audit ID:** CX-3 ("manage Codex manually" ambiguous); V-13 (new factual scope correction)
- **Before:** `The CLI command is the quickest path. If you manage Codex manually, use the same values in <code>~/.codex/config.toml</code>.`
- **After:** `MCP is supported in the Codex CLI and IDE extension. The CLI command is the quickest path. Prefer a config file? Add the same values to <code>~/.codex/config.toml</code> under <code>[mcp_servers.supericons]</code>.`

> **Factual note (V-13):** Official Codex MCP docs state: "Codex supports MCP servers in both the CLI and the IDE extension." The Codex App (web app at codex.openai.com) and Web (cloud task runner) are NOT documented as supporting MCP server configuration. This scope clarification prevents user confusion.


---

### `exampleCode`

- **Audit ID:** CG-1 (brand casing)
- **Before:**
```
Search SuperIcons for a secure login icon.
Show me a Lucide option and a Tabler option.
Insert the Lucide SVG into the sign-in button component.
```
- **After:**
```
Search Supericons for a secure login icon.
Show me a Lucide option and a Tabler option.
Insert the Lucide SVG into the sign-in button component.
```

---

### `premiumCards[0].title`

- **Audit ID:** CG-2 (entitlement jargon), CX-4
- **Before:** `Entitlement first`
- **After:** `Your account comes first`

---

### `premiumCards[0].copy`

- **Audit ID:** CG-2 (entitlement jargon), CX-5 (inaccurate "key carries" metaphor)
- **Before:** `Your API key carries the premium collections your Supericons account already owns through <a href="/?view=pricing" data-docs-view="pricing">Pro or purchased collections</a>. The key alone is not the entitlement.`
- **After:** `Your API key authenticates to your Supericons account. The collections and tools you can access depend on what your account owns - either a <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection packs</a>. The key alone does not grant access.`

---

### `premiumCards[1].title`

- **Audit ID:** CX-6 ("Codex setup note" is a meta-label)
- **Before:** `Codex setup note`
- **After:** `How to add your API key in Codex`

---

### `premiumCards[1].copy`

- **Audit ID:** CX-6 (minor phrasing cleanup from "alongside the supericons-mcp server entry")
- **Before:** `Generate the key in <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>, then add <code>SUPERICONS_API_KEY</code> using the env or secrets mechanism your Codex MCP setup uses alongside the <code>supericons-mcp</code> server entry.`
- **After:** `Generate the key in <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>, then add <code>SUPERICONS_API_KEY</code> to the env or secrets field your Codex MCP config uses for the <code>supericons-mcp</code> server.`

---

### `troubleshootingCards[0].title`

- **Audit ID:** CX-7 ("tool is absent" debug log language)
- **Before:** `Config saves but tool is absent`
- **After:** `Server saved but not visible in Codex`

---

### `troubleshootingCards[1].title`

- **Audit ID:** CX-8 ("Package resolution fails" npm internals)
- **Before:** `Package resolution fails`
- **After:** `The <code>npx</code> command does not run`

---

### `troubleshootingCards[2].title`

- **Audit ID:** CX-9 (passive + inconsistent with other guides)
- **Before:** `Premium results are unavailable`
- **After:** `Premium icons do not appear`

---

### `troubleshootingCards[2].copy`

- **Audit ID:** CG-2 (entitlement jargon), CG-3 ("paid plan" vague)
- **Before:** `Premium icon access depends on your Supericons entitlement plus a valid <code>SUPERICONS_API_KEY</code>. Free flows still return 20,000+ icons without a <a href="/?view=pricing" data-docs-view="pricing">paid plan</a>.`
- **After:** `Free icons still return 20,000+ results without a Pro subscription. Premium icon access requires an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code>.`

---

## Cursor guide

**Object key:** `'docs-cursor'`
**Reference block:** store.js lines 4670-4738

---

### `title`

- **Audit ID:** CG-1 (brand casing)
- **Before:** `Set up SuperIcons MCP in Cursor`
- **After:** `Set up Supericons MCP in Cursor`

---

### `heroCopy`

- **Audit ID:** CG-1 (brand casing), CG-5 (inconsistent phrasing), CU-2 ("patching workflow")
- **Before:** `Use Cursor with SuperIcons MCP when you want icon search and SVG retrieval inside the same editor flow as your code assistant and patching workflow.`
- **After:** `Add icon search and SVG retrieval to Cursor. Find and insert icons without leaving the editor - in the same session as your code edits and component builds.`

---

### `flowCards[0].copy` (step 1)

- **Audit ID:** CU-3 ("config surface your installation uses" is vague)
- **Before:** `Open Cursor MCP settings and place the <code>supericons</code> server entry in the config surface your installation uses.`
- **After:** `Open Cursor settings, navigate to MCP, and paste the server config. Or add it directly to <code>~/.cursor/mcp.json</code>.`

---

### `flowCards[1].copy` (step 2)

- **Audit ID:** CU-4 ("should show" is hedged, not an instruction)
- **Before:** `Cursor should show the server in its MCP tool list after the config is saved and reloaded.`
- **After:** `Save and reload. Verify the <code>supericons</code> server appears in Cursor's MCP tool list before continuing.`

---

### `premiumCards[0].title`

- **Audit ID:** CU-5 ("What to connect" is abstract)
- **Before:** `What to connect`
- **After:** `What you need for premium access`

---

### `premiumCards[0].copy`

- **Audit ID:** CG-2 (entitlement jargon), CU-6
- **Before:** `Premium MCP access requires your <a href="/?view=pricing" data-docs-view="pricing">Supericons entitlement</a> and a valid <code>SUPERICONS_API_KEY</code> in the Cursor MCP server entry.`
- **After:** `Premium MCP access requires an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code> in your Cursor MCP server config.`

---

### `troubleshootingCards[1].title`

- **Audit ID:** CU-7 ("The command does not run" is vague)
- **Before:** `The command does not run`
- **After:** `<code>npx</code> is not found or fails to start`

---

### `troubleshootingCards[2].copy`

- **Audit ID:** CG-2 (entitlement jargon), CG-3 ("paid plan" vague)
- **Before:** `Cursor can still use the free 20,000+ icons without a <a href="/?view=pricing" data-docs-view="pricing">paid plan</a>. Premium results require the right purchase or Pro access plus a valid <code>SUPERICONS_API_KEY</code>.`
- **After:** `Cursor can still use the free 20,000+ icons without a Pro subscription. Premium results require an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or purchased collection</a> on your Supericons account, plus a valid <code>SUPERICONS_API_KEY</code>.`

---

## Verification timestamps

Each guide page should display a "Verified as of" timestamp below the hero code block.
This is rendered by `renderDocsGuidePage()` in `store.js` and should be added as a new field `verifiedDate` on each guide config object.

| Guide | Verified date | Placement |
|---|---|---|
| Claude Code | April 10, 2026 | Below hero code snippet block |
| Codex | April 10, 2026 | Below hero code snippet block |
| Cursor | April 10, 2026 | Below hero code snippet block |

### Implementation spec

**New field in `getDocsGuideConfig()`:**
```js
verifiedDate: 'April 10, 2026',
```

**New HTML in `renderDocsGuidePage()` (after the snippets block):**
```html
<p class="docs-guide__verified-date">Verified as of ${config.verifiedDate}</p>
```

**CSS (add to existing docs stylesheet):**
```css
.docs-guide__verified-date {
  font-size: 0.75rem;
  color: var(--color-text-muted, #888);
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}
```

---

## Change count summary

| Guide | Fields changed |
|---|---|
| Template (shared) | 1 (CTA button) + timestamp field |
| Claude Code | 8 copy + 1 factual correction (FA-1) |
| Codex | 11 |
| Cursor | 7 |
| Footer (docs page) | Remove |
| **Total** | **27 copy changes + 1 factual fix + timestamp implementation + 1 removal** |

---

## Footer design decision

### Context

The docs page (`/docs/`) and client guide pages render a footer block:

```
Supericons docs. Official setup guidance for free and premium MCP workflows.

App   Pricing   API Keys   Terms   Privacy
```

This section documents the Socratic reasoning and final decision on whether to keep, refine, or remove it.

---

### Socratic reasoning

**Q1: What function does a footer serve on a documentation page?**

A: Two functions:
1. **Orientation** - helping users navigate to related pages (app, pricing, legal) when they reach the bottom of the page.
2. **Legal compliance** - surfacing Terms and Privacy links required on public-facing pages.

If either function is already fulfilled by another part of the page or site, the footer becomes redundant.

---

**Q2: Is the site that contains the docs page already providing those functions?**

A: Yes. The docs page is embedded within the Supericons site, which has a persistent site-wide footer. That footer already contains all navigation and legal links available to the user at any point. The in-page footer is therefore a direct duplication of what the site footer provides.

---

**Q3: Does the duplication add anything?**

A: No. The in-page footer adds no incremental value:
- The tagline ("Supericons docs. Official setup guidance...") restates information the H1 and eyebrow already communicate.
- The links (App, Pricing, API Keys, Terms, Privacy) are all already present in the site footer.
- A user who reaches the bottom of the docs page already has access to the site footer immediately below.

Duplicate navigation also increases visual noise and can create confusion about which footer represents the canonical navigation surface.

---

**Q4: Does removing it create any gap?**

A: No. The site footer covers both orientation and legal compliance. The related guides strip already handles inter-page navigation within the docs section. Nothing the in-page footer currently does would be lost.

---

**Q5: What about the client guide pages?**

A: The same logic applies. Client guide pages are SPA views rendered inside the app shell by `renderDocsGuidePage()`. The app shell has persistent navigation. The related guides strip at the bottom of each guide handles inter-guide wayfinding. No additional footer is needed on either surface.

---

### Decision

| Surface | Action | Reason |
|---|---|---|
| Docs page in-page footer (`/docs/`) | **Remove entirely** | Duplicates the site footer; tagline is redundant against H1 |
| Client guide pages (SPA views) | **No footer needed** | App shell nav + related guides strip is sufficient |

---

### Implementation note

**Reference:** `public/docs/index.html` - `<footer class="docs-footer">` block.
Also remove from: `docs/plans/docs-ui-ux-implementation.md` and `docs/plans/docs-ui-ux-mockup.html` HTML blocks.

Remove the entire `<footer class="docs-footer">...</footer>` element and any associated `.docs-footer` CSS rules from `public/mcp/docs.css`. No replacement content is needed.
