# Supericons Docs - Copy Refinement

This document is the living record of all approved text copy changes for the consolidated docs page.
Changes are organized by pass. Pass 1 came from the initial language audit. Pass 2 came from the second audit (docs-copy-audit-2.md).

---

## Pass 1 - Initial language audit

### Hero Section
**Original:** "Base setup takes under a minute. Premium access follows once your account has a Pro subscription or purchased collection."
**Refined:** "Base setup takes under a minute. Premium features unlock automatically when you link an account with a Pro subscription or purchased collection."

### Premium MCP Setup (Intro)
**Original:** "The API key does not create entitlement by itself. It carries the access your account already has through Pro or purchased collections."
**Refined:** "An API key securely links your coding agent to your Supericons account. It unlocks whatever premium collections or Pro workflow tools you already own."

### Current MCP Tools Grid

**Tool: `search_icons`**
- **Original:** "Find the closest icon match across the free libraries and any premium collections your account is entitled to use."
- **Refined:** "Find the closest icon match across the free libraries and any premium collections your account can access."

**Tool: `list_motion_presets`**
- **Original:** "Browse the Motion Lab presets available through MCP before exporting animation CSS or animated SVG output."
- **Refined:** "Browse available Motion Lab presets before generating CSS or animated SVGs."

**Meta Card: Entitlements**
- **Original:** "Free users get the free libraries. Pro subscribers and collection owners get access to the premium collections tied to their account when they connect an API key."
- **Refined:** "Free users can search and retrieve from all free libraries. Pro subscribers and collection owners can access their premium assets by connecting an API key."

### Client Guides Section
**Original:** "The configuration concept is shared, but each client has its own setup UX and config surface."
**Refined:** "The core configuration is the same, but every client has its own setup process and settings file."

### Troubleshooting Section

**Issue: Server installed but no tools appear**
- **Original:** "Restart or reload the MCP client after changing config. Many setup failures are registry refresh issues."
- **Refined:** "Restart or reload the MCP client after saving your config. Most missing-tool issues are simply caused by the client needing a refresh."

**Issue: Premium icons do not appear**
- **Original:** "Check that your account actually has Pro or purchased collection access, then regenerate or replace the API key in your MCP config."
- **Refined:** "Verify your account has an active Pro subscription or collection purchase, then generate a new API key and update your client's config."

### Footer Tagline
**Original:** "Supericons docs. Truth-first setup guidance for free and premium MCP access."
**Refined:** "Supericons docs. Official setup guidance for free and premium MCP workflows."

---

## Pass 2 - Second-pass copy audit (docs-copy-audit-2.md)

### Hero Section
**Original:** "Base setup takes under a minute. Premium features unlock automatically when you link an account with a Pro subscription or purchased collection."
**Refined:** "Base setup takes under a minute. Add a Supericons API key to your MCP config to access any premium collections or Pro workflow tools tied to your account."
**Reason:** "Link an account" implies OAuth. The actual mechanism is adding an API key to a config file.

### Hero Pill: 8 MCP tools
**Original:** "8 MCP tools live"
**Refined:** "8 MCP tools"
**Reason:** "Live" is launch-state language, not evergreen docs language.

### Quickstart Section - Bridge Sentence (new addition)
**Original:** No bridge sentence before first code block.
**Refined:** Add after the intro paragraph: "Paste the snippet below into your client's MCP config file. If you are not sure where to find it, pick your client from the guides below."
**Reason:** Page jumped abruptly from marketing tone to a code block with no transition.

### MCP Tools Section Heading
**Original:** "Current MCP tools"
**Refined:** "MCP tools"
**Reason:** "Current" implies instability. The sidebar TOC already reads "MCP tools" - align both.

### Access by Plan Card (was: Entitlements)
**Original title:** "Entitlements"
**Refined title:** "Access by plan"
**Reason:** "Entitlements" is enterprise/legal jargon. Not developer-facing language.

### Workflow Tools Require Pro Card (was: Workflow-tool gating)
**Original title:** "Workflow-tool gating"
**Original body:** "Motion Lab MCP and Converter MCP are Pro workflow tools. Collection ownership unlocks premium icon assets, but workflow tools stay Pro-only."
**Refined title:** "Workflow tools require Pro"
**Refined body:** "Motion Lab MCP and Converter MCP are Pro-only. Collection ownership unlocks premium icon assets, but workflow tool access requires a Pro subscription."
**Reason:** "Gating" is internal product management language. Title should be a plain declarative fact.

### Workflow Tools Section - Intro Paragraph (factual fix)
**Original:** "Supericons workflow tools (Motion Lab and Converter) are available in the browser for all users and through MCP for Pro subscribers. The MCP tools provide the same capabilities in coding-agent-friendly tool calls."
**Refined:** "Motion Lab and Converter are free to browse in the browser. Exports (animation CSS, animated SVG, PNG, and SVG tracing) require a Pro subscription, both in the browser and through MCP."
**Second paragraph (new):** "Pro subscribers can also run both tools through MCP, triggering the same exports directly from their coding agent."
**Reason:** The original incorrectly implied full access for free users. Browse is free; exports are gated.

### Starter Prompts Section (was: Recipes and prompts)
**Original heading:** "Recipes and prompts"
**Original intro:** "Copy a prompt and paste it directly into your MCP-capable coding agent."
**Refined heading:** "Starter prompts"
**Refined intro:** "Copy any of these prompts and paste them into your coding agent to get started."
**Reason:** "Recipes and prompts" is a mixed metaphor - the content is only prompts. "MCP-capable" is a redundant qualifier for users already reading MCP docs.

### Explore What's Available Card (was: Tool discovery)
**Original title:** "Tool discovery"
**Refined title:** "Explore what's available"
**Reason:** "Tool discovery" is abstract. The revised title is action-oriented and more inviting.

### Sidebar TOC Link
**Original:** "Recipes"
**Refined:** "Starter prompts"
**Reason:** Matches the renamed section heading.

### Sidebar Callout Heading (was: Current truth)
**Original:** "Current truth"
**Refined:** "What's live"
**Reason:** "Current truth" is internal Socratic methodology language. Not appropriate for external developer docs.

### Sidebar Callout Body
**Original:** "Supericons MCP is live with 8 tools: icon search, icon retrieval, library discovery, Motion Lab presets, motion CSS export, animated SVG export, and two Converter tools. Motion Lab MCP and Converter MCP are Pro-only."
**Refined:** "Supericons MCP includes 8 tools: icon search, icon retrieval, library listing, Motion Lab preset browsing, motion CSS export, animated SVG export, SVG-to-PNG, and PNG-to-SVG tracing. Motion Lab and Converter exports are Pro-only."
**Reason:** "Is live" is launch-state language. "Exports are Pro-only" is more accurate than "MCP tools are Pro-only".

### Useful Links - Sidebar
**Original:** "Back to app"
**Refined:** "Open Supericons"
**Reason:** "App" is ambiguous to external developers arriving from search or a link.

### Nav Bar
**Original:** Three client-specific links (Claude Code, Codex, Cursor)
**Refined:** Single "Client guides" link pointing to `#docs-guides`
**Reason:** Showing 3 of 7 supported clients in the nav implies selective support. A single nav link scales as clients are added.
