# Docs Copy Consolidated Proposal

**Date:** 11 April 2026
**Scope:** Sidebar branding, group labels, nav labels, kicker tags, page titles, page summaries, and content copy for all complete docs pages.
**Format:** For each section - analysis first, then before/after table.
**Source files:** `store.js` (sidebar shell, lines 4970-4975), `docs-pages.js` (all page config)

---

## How to read this document

Each section answers three questions before making a change:
1. What is the design intent of this element?
2. What does best practice look like in comparable docs systems (Stripe, Vercel, Tailwind, Cursor)?
3. Does the current text fulfill that intent at that quality bar?

Changes are only proposed where the answer to question 3 is no.

---

## Section 1: Sidebar Branding

**Source:** `store.js` line 4973-4974

### Analysis

**Design intent:** The sidebar brand introduces the docs system. It gives first-time visitors enough orientation to understand what section they are in without reading the full page.

**Best practice benchmark:**
- Stripe: "Stripe Docs" (brand only, no subtitle)
- Vercel: "Docs" (no subtitle)
- Tailwind: "Tailwind CSS" (no subtitle)
- Cursor: "Cursor Docs" (with subtitle: "Documentation for all things Cursor")
- Supabase: "Supabase Docs" with subtitle: "Build in a weekend. Scale to millions."

The presence or absence of a subtitle is a product decision. A subtitle is most useful when:
(a) the brand name alone does not communicate the scope of the docs, or
(b) users might be confused about what the docs section covers.

For Supericons, the brand is clear but the docs cover only a subset of Supericons features (MCP, Motion Lab, Converter) and not the main icon browsing UI. A subtitle earns its place here.

**Issue with current subtitle:** "Guides, setup, and product reference for Supericons." repeats the word "Supericons" when it already appears in the brand heading directly above. This creates redundancy within a 2-line space.

**Socratic check:** If we removed the subtitle entirely, would a user know what this docs section covers? Probably yes, since the sidebar links are self-explanatory. But a subtitle adds value for first-time visitors who land mid-section. Keep it, but remove the redundancy.

---

### 1.1 Sidebar Brand Heading

| | Text | File / Element |
|---|---|---|
| **Before** | `Supericons Docs` | `store.js:4973` - `docs-shell__sidebar-brand` |
| **After** | `Supericons Docs` | No change. Matches Stripe ("Stripe Docs"), industry standard. |

---

### 1.2 Sidebar Subtitle

| | Text | File / Element |
|---|---|---|
| **Before** | `Guides, setup, and product reference for Supericons.` | `store.js:4974` - `docs-shell__sidebar-copy` |
| **After** | `Setup guides and product reference.` | Removes brand repetition. Still scopes the section. |

**Why this wording:** "Setup guides" covers MCP Setup and the Quickstart. "Product reference" covers MCP Tools, Motion Lab, and Converter. Both concepts are present in 4 words each without redundancy.

---

## Section 2: Sidebar Group Labels

**Source:** `docs-pages.js` lines 27-56 (`docsPageGroups` array, `label` field)

### Analysis

**Design intent:** Group labels are visual section dividers in the sidebar. They give readers a mental model of the docs structure at a glance. They must be short enough to read in scanning speed (1-2 seconds), specific enough to distinguish sections, and consistent in their naming convention (noun phrases, not verbs).

**Best practice benchmark:**
- Stripe: "Guides", "Payments", "Treasury", "Connect", "Issuing" (noun phrases, no qualifiers)
- Vercel: "Getting Started", "Frameworks", "Projects", "Deployments" (noun phrases)
- Tailwind: "Getting Started", "Core Concepts", "Customization" (noun phrases)
- Cursor: "Overview", "Editor", "AI Features", "MCP", "Account" (noun phrases)

Convention: group labels are 1-3 words, noun-first, no verbs except "Getting Started."

**Socratic check per label:**
- "Overview": universal. Keep.
- "MCP Setup": specific and clear. Keep.
- "MCP Tools Reference": "Reference" qualifier adds nothing when the links below are clearly reference entries. "MCP Reference" is the same meaning in 2 words instead of 3.
- "Motion Lab": clean. Keep.
- "Converter": clean. Keep.
- "Access and API Keys": 4 words. The two pages beneath it are "API Keys" and "Pro and Collections", both of which are account-level concerns. "Account" is one word that covers both cleanly. Cursor uses "Account" for the same type of section.
- "Troubleshooting": universal. Keep.

---

### Group label changes

| # | Before | After | Rationale |
|---|---|---|---|
| 1 | `Overview` | `Overview` | Keep |
| 2 | `MCP Setup` | `MCP Setup` | Keep |
| 3 | `MCP Tools Reference` | `MCP Reference` | Drop "Tools" - link labels below provide specificity |
| 4 | `Motion Lab` | `Motion Lab` | Keep |
| 5 | `Converter` | `Converter` | Keep |
| 6 | `Access and API Keys` | `Account` | Both pages are account-level. One word covers both. |
| 7 | `Troubleshooting` | `Troubleshooting` | Keep |

---

## Section 3: Sidebar Nav Link Labels

**Source:** `docs-pages.js`, `navLabel` field on each page config

### Analysis

**Design intent:** Nav labels are the primary navigation affordance. A user scanning a sidebar reads only the labels. Each label must communicate what the destination page covers - ideally in 1-3 words - with zero reliance on the surrounding context to be understood.

**But:** Group labels provide context. A link labeled "Overview" under the "Motion Lab" group is understood as "Motion Lab Overview." So labels can be shorter when the group provides a clear namespace.

**Test for each label:** Read the label in isolation. If the destination is unclear without group context, make the label standalone. If the group context is strong enough, a shorter label works.

---

### Group 1: Overview

#### `docs` - navLabel: "Docs Home"

**Analysis:** "Docs Home" creates a semantic conflict. The user is already in the docs section; labeling it "Docs Home" implies there is a non-docs homepage elsewhere (which there is - supericons.dev). On many docs sites, the first link under "Overview" is the introduction or landing page.

**Benchmark:** Stripe: "Introduction". Next.js: "Introduction". Cursor: "Overview". None use "Docs Home" as a sidebar link.

**The word "Home"** has a specific meaning in UI: it navigates to the top of the site. Using it for a docs-section landing page creates a navigational misread.

| | navLabel | pageTitle | kicker |
|---|---|---|---|
| **Before** | `Docs Home` | `Supericons Docs` | `Overview` |
| **After** | `Introduction` | `Supericons Docs` | *(remove kicker - user decision)* |

**Page title stays as "Supericons Docs"** - this is correct for the `<h1>` even though the sidebar uses "Introduction." They serve different contexts.

---

#### `docs-quickstart` - navLabel: "Quickstart"

**Analysis:** Universal docs convention. Time-boxed promise pages are always called "Quickstart" or "Quick Start." Zero ambiguity.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Quickstart` | `Quickstart` |
| **After** | `Quickstart` | `Quickstart` |

No change.

---

#### `docs-what-is-supericons` - navLabel: "What Is Supericons"

**Analysis:** "What Is Supericons" is a conversational question format that reads like a blog post or FAQ headline. In a sidebar it takes up space and feels informal compared to the neighboring labels.

**What does this page actually do?** It explains the product scope - what the product is, what is free, what is Pro, what each feature does. This is a "product orientation" page.

**Benchmark:** Supabase: "Introduction". Stripe: no equivalent (the API is self-evident). Vercel: "What is Vercel?" exists but only as a marketing FAQ, not a docs page. Most mature docs systems avoid "What Is X" in favor of "About" or a specific descriptive noun.

**Socratic question:** Would a developer scanning the sidebar understand that "Product Overview" leads to an explanation of the full Supericons product? Yes. Would they understand what "What Is Supericons" leads to? Also yes, but it reads oddly next to "Introduction" and "Quickstart."

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `What Is Supericons` | `What Is Supericons` |
| **After** | `Product Overview` | `Product Overview` |

---

### Group 2: MCP Setup

#### `docs-claude-code`, `docs-codex`, `docs-cursor`

**Analysis:** Client names as labels are the universal standard for client-specific setup guides. Stripe uses language/framework names ("Node.js", "Python", "Ruby"). These are unambiguous. No changes needed.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Claude Code` / `Codex` / `Cursor` | `Claude Code` / `Codex` / `Cursor` |
| **After** | `Claude Code` / `Codex` / `Cursor` | `Claude Code` / `Codex` / `Cursor` |

No change.

---

### Group 3: MCP Reference (was "MCP Tools Reference")

#### `docs-mcp-tools` - navLabel: "MCP Tools Overview"

**Analysis:** The group label "MCP Reference" provides the "MCP" namespace. Within that group, the first link is the section entry point. "MCP Tools Overview" repeats "MCP" unnecessarily. The first link under a group is conventionally labeled "Overview" (Stripe, Vercel) or "Introduction."

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `MCP Tools Overview` | `MCP Tools Overview` |
| **After** | `Overview` | `MCP Tools Overview` |

**Nav label shortened to "Overview"; page title keeps the specificity** since it is the `<h1>` seen outside sidebar context (in pagination, page head, browser history).

---

#### `docs-mcp-icons` - navLabel: "Icon Tools"

**Analysis:** Clear, specific, 2 words. No ambiguity. Keep.

| | navLabel |
|---|---|
| **Before** | `Icon Tools` |
| **After** | `Icon Tools` |

No change.

---

#### `docs-mcp-motion` - navLabel: "Motion Lab Tools"

**Analysis:** Under the group "MCP Reference", "Motion Lab Tools" repeats "Tools" which is implied by the group context. "Motion Lab" is the product name and sufficient as a label. The reader understands this as "the Motion Lab MCP tools page."

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Motion Lab Tools` | `Motion Lab MCP Tools` |
| **After** | `Motion Lab` | `Motion Lab MCP Tools` |

**Page title unchanged** - it is the `<h1>` and needs full context.

---

#### `docs-mcp-converter` - navLabel: "Converter Tools"

**Analysis:** Same reasoning as Motion Lab above. Under "MCP Reference", "Converter" alone is sufficient.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Converter Tools` | `Converter MCP Tools` |
| **After** | `Converter` | `Converter MCP Tools` |

---

### Group 4: Motion Lab

#### `docs-motion-lab` - navLabel: "Guide"

**Analysis:** "Guide" is the weakest label in the current sidebar. Two problems:

1. **Ambiguity in isolation:** If a user reads just "Guide" they learn nothing about the destination. Stripe never uses "Guide" as a label - it always names the content ("Charges", "Refunds", "Webhooks").

2. **Pagination problem:** The pager at the bottom of adjacent pages uses `navLabel` to render links: "Previous: Guide" tells the reader nothing about where they are going.

**Why not "Motion Lab Overview" or "About Motion Lab"?** Because "Motion Lab" is already the group label. The first page under a group is its introduction - using "Introduction" is the standard pattern (Stripe: the first page under "Payments" is "Overview").

**Socratic question:** What does this page actually do? It explains what Motion Lab is, how to access it (browser vs. MCP), and what it produces. That is the role of an introduction page.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Guide` | `Motion Lab Guide` |
| **After** | `Introduction` | `Motion Lab` |

**Page title simplified to just "Motion Lab"** - when you land on this page, "Motion Lab" as the `<h1>` is clean. The subtitle (summary field) provides the "what this page covers" context.

---

#### `docs-motion-lab-presets` - navLabel: "Presets"

**Analysis:** Short, specific, correct. Keep.

| | navLabel |
|---|---|
| **Before** | `Presets` |
| **After** | `Presets` |

No change.

---

#### `docs-motion-lab-triggers` - navLabel: "Trigger Types"

**Analysis:** "Trigger Types" - the word "Types" is a qualifier that adds length without adding meaning. "Triggers" is the noun and contains all the needed information. Stripe labels entries with bare nouns: "Products", "Prices", "Subscriptions". Tailwind does the same.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Trigger Types` | `Motion Lab Trigger Types` |
| **After** | `Triggers` | `Trigger Types` |

**Page title simplified** from "Motion Lab Trigger Types" (verbose `<h1>`) to "Trigger Types" - still clear, less redundant with the sidebar group context the reader already has.

---

#### `docs-motion-lab-exports` - navLabel: "Exports"

**Analysis:** Short, specific, noun. Keep.

| | navLabel |
|---|---|
| **Before** | `Exports` |
| **After** | `Exports` |

No change.

---

### Group 5: Converter

#### `docs-converter-guide` - navLabel: "Guide"

**Analysis:** Same problem as "Guide" under Motion Lab. "Guide" alone is ambiguous in pagination, and redundant with the page title.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Guide` | `Converter Guide` |
| **After** | `Introduction` | `Converter` |

**Page title simplified to "Converter"** when used as `<h1>` - mirrors the Motion Lab pattern above.

---

#### `docs-converter-png-to-svg` and `docs-converter-svg-to-png`

**Analysis:** Directional conversion labels are the clearest possible format. Any alternative ("Rasterize", "Trace", "Export PNG") would be less clear.

| | navLabel |
|---|---|
| **Before** | `PNG to SVG` / `SVG to PNG` |
| **After** | `PNG to SVG` / `SVG to PNG` |

No change.

---

#### `docs-converter-settings` - navLabel: "Settings Reference"

**Analysis:** "Reference" is a meta-descriptor that adds pattern noise to the sidebar. The content type (reference vs. guide) should be communicated by the page itself, not the nav label. Tailwind calls its equivalent page "Configuration." Stripe calls it by the subject noun. "Settings" is the shortest accurate label.

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Settings Reference` | `Converter Settings Reference` |
| **After** | `Settings` | `Settings Reference` |

**Page title "Settings Reference"** kept for the `<h1>` since it clarifies the content type at page level.

---

### Group 6: Account (was "Access and API Keys")

#### `docs-access-api-keys` - navLabel: "API Keys"

**Analysis:** Specific, standard, correct. "API Keys" is the universal label for this type of page (Stripe uses it, Supabase uses it, most API-enabled products use it).

| | navLabel |
|---|---|
| **Before** | `API Keys` |
| **After** | `API Keys` |

No change.

---

#### `docs-access-premium` - navLabel: "Pro and Collections"

**Analysis:** "Pro and Collections" is 3 words and describes two distinct things. In a sidebar, "and" often signals a page that is trying to cover too much or hasn't found the right abstraction.

**What does this page do?** It explains the two ways to access premium features: a Pro subscription or individual collection purchases. Both are "plans" - pricing and access tiers.

**Benchmark:** Stripe uses "Plans" for subscription tier docs. Intercom uses "Plans". The concept of "here are your account access options" maps cleanly to "Plans" in developer docs vocabulary.

**Socratic question:** If someone sees "Plans" in an Account section, do they know it covers Pro and collection access? Yes - "Plans" in developer tools universally means "pricing tiers and what they include."

| | navLabel | pageTitle |
|---|---|---|
| **Before** | `Pro and Collections` | `Pro and Collections` |
| **After** | `Plans` | `Plans` |

---

### Group 7: Troubleshooting

#### `docs-troubleshooting` - navLabel: "Troubleshooting"

**Analysis:** The group is named "Troubleshooting" and has one link also named "Troubleshooting." This creates a visual stutter. However, the alternative (making Troubleshooting ungrouped) requires a structural change to the sidebar renderer. Given the constraint that the group is needed architecturally, the simplest fix is to rename the link to "Common Issues" - which is a more specific and actionable label, and avoids the repeat.

**Benchmark:** Stripe: "Troubleshooting" under a Troubleshooting section header. Supabase: "Troubleshooting" as a standalone section with no subsection header. Both patterns exist.

**Decision:** If the group header can be removed and Troubleshooting made a top-level ungrouped link, that is cleaner. If not, rename the link to "Common Issues" to eliminate the stutter.

| | navLabel |
|---|---|
| **Before** | `Troubleshooting` |
| **After (if group removed)** | `Troubleshooting` (bare) |
| **After (if group kept)** | `Common Issues` |

---

## Section 4: Kicker Tags

**Source:** `store.js` line 5016 - `config.kicker` renders above `<h1>` as `.docs-shell__kicker`

**User decision:** Remove kicker tags.

**Design thinking confirmation:** Kicker tags serve to orient the reader within site structure. In a docs system with a persistent left sidebar that shows the active group and active link, the kicker duplicates information the sidebar already provides.

**Benchmark:** Stripe removes kickers in favor of sidebar state alone. Tailwind has no kickers. Cursor has no kickers. This is the right call.

**Implementation note:** Remove the kicker rendering line in `store.js`:
```html
<!-- Remove this line: -->
<span class="docs-shell__kicker">${config.kicker}</span>
```

The `kicker` field can remain in `docs-pages.js` as metadata (for potential future use) or be removed from the data too.

---

## Section 5: Page Summaries (Subtitle Copy)

**Source:** `docs-pages.js`, `summary` field. Renders as `.docs-hero__copy` below the `<h1>`.

**Design intent:** The summary acts as the page subtitle. It answers "what will I find here?" in one sentence. It must be specific enough to orient a new reader but short enough to read at a glance. Best practice: 1 sentence, under 20 words, active voice.

Only complete pages with real summaries are assessed here. Placeholder pages will receive summaries when their content is written.

---

### Docs Home (`docs`)

**Current summary:** "Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter."

**Analysis:** "Everything you need" is a filler phrase common in marketing copy. It adds no information. The rest of the sentence is good - it names the three areas covered. But the sentence buries the main value in a dependent clause.

**Socratic question:** Who reads this subtitle? A developer who just opened the docs section and wants to confirm they are in the right place. What do they need to know? What this section covers, in 3-4 nouns.

| | summary |
|---|---|
| **Before** | `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.` |
| **After** | `Set up MCP, learn Motion Lab, and use Converter.` |

**Rationale:** 9 words instead of 18. All 3 product areas named. Action verbs orient the reader (set up, learn, use). Zero filler.

---

### Quickstart (`docs-quickstart`)

**Current summary:** "Get Supericons running in your coding agent in under 5 minutes."

**Analysis:** Time-boxed promise, clear outcome, no filler. This is strong copywriting.

| | summary |
|---|---|
| **Before** | `Get Supericons running in your coding agent in under 5 minutes.` |
| **After** | `Get Supericons running in your coding agent in under 5 minutes.` |

No change.

---

### Claude Code (`docs-claude-code`)

**Current summary:** "Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons."

**Analysis:** Three sentences. The first sentence is a product description of Claude Code - does the reader need this? A developer reading a "Claude Code" docs page already knows what Claude Code is. The description wastes the prime subtitle real estate. The third sentence ("Use either method below to add Supericons") is a good directional prompt.

**Socratic question:** What does a developer landing on this page need most in the subtitle? Confirmation that this page will show them, specifically, how to add Supericons to Claude Code.

| | summary |
|---|---|
| **Before** | `Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons.` |
| **After** | `Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Pick the method that fits your workflow.` |

**Rationale:** Skips the product description (reader already knows what Claude Code is). Leads with the practical value (two methods). Sets expectation for what the page teaches. 24 words vs 38 words.

---

### Codex (`docs-codex`)

**Current summary:** "Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly."

**Analysis:** Better than the Claude Code summary - skips the product description and goes straight to the method. "TOML config file" is a useful technical detail. The "or edit the config file directly" phrasing is slightly redundant with "through a TOML config file."

| | summary |
|---|---|
| **Before** | `Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly.` |
| **After** | `Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.` |

**Rationale:** Leads with the action ("Add Supericons"). Specifies both methods in 5 words. Adds the scope note (CLI and IDE extension) which is important context given the web app does not support MCP. 17 words vs 32 words.

---

### Cursor (`docs-cursor`)

**Current summary:** "Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project."

**Analysis:** Clean and specific. Two useful facts: the config format (JSON) and scoping (global vs. project). No filler.

**One gap:** Does not tell the user what they will accomplish on this page. It describes the mechanism but not the outcome.

| | summary |
|---|---|
| **Before** | `Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.` |
| **After** | `Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.` |

**Rationale:** Leads with the action. Keeps both technical details. Slightly more instructional phrasing ("Set it globally" vs. "You can scope it").

---

## Section 6: Docs Home Card Content

**Source:** `docs-pages.js` lines 65-98 (`docs` bodyHtml)

### Analysis

The Docs Home page has 4 routing cards. Each card has an `<h3>` heading, body copy, and a CTA link. The heading and CTA label are the most-read elements. Body copy is secondary.

**Card 2: "Set up MCP"**

Two issues:
1. The card body currently ends "Step-by-step setup for Claude Code, Codex CLI, and Cursor." - should include "and other coding agents" since any stdio MCP client works.
2. The CTA button "Choose your client" links to `docs-claude-code` - but "choose your client" implies a choice is being offered. A link that goes directly to Claude Code is not a choice.

**The user specifically suggested:** "Step-by-step setup for Claude Code, Codex CLI, Cursor and other coding agents." - accept this.

---

### Card 1: "Get started fast"

| | heading | body | CTA label | CTA target |
|---|---|---|---|---|
| **Before** | `Get started fast` | `Set up the MCP server and run your first icon query in under 5 minutes.` | `Read the quickstart` | `docs-quickstart` |
| **After** | `Get started fast` | `Set up the MCP server and run your first icon query in under 5 minutes.` | `Read the quickstart` | `docs-quickstart` |

No change.

---

### Card 2: "Set up MCP"

| | heading | body | CTA label | CTA target |
|---|---|---|---|---|
| **Before** | `Set up MCP` | `Step-by-step setup for Claude Code, Codex CLI, and Cursor.` | `Choose your client` | `docs-claude-code` |
| **After** | `Set up MCP` | `Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.` | `Choose your client` | `docs-quickstart` |

**CTA target change:** Route to `docs-quickstart` which already has inline links to all three client guides. Pointing "Choose your client" directly to Claude Code is contradictory.

---

### Card 3: "Learn Motion Lab"

| | heading | body | CTA label | CTA target |
|---|---|---|---|---|
| **Before** | `Learn Motion Lab` | `Presets, trigger types, and how to export animations as CSS or standalone SVG.` | `Open the guide` | `docs-motion-lab` |
| **After** | `Learn Motion Lab` | `Presets, trigger types, and how to export animations as CSS or standalone SVG.` | `Open the guide` | `docs-motion-lab` |

No change. Body is specific and accurate. CTA is consistent.

---

### Card 4: "Use the Converter"

| | heading | body | CTA label | CTA target |
|---|---|---|---|---|
| **Before** | `Use the Converter` | `PNG to SVG, SVG to PNG, and how to choose the right settings for your source image.` | `Open the guide` | `docs-converter-guide` |
| **After** | `Use the Converter` | `PNG to SVG, SVG to PNG, and how to choose the right settings for your source image.` | `Open the guide` | `docs-converter-guide` |

No change.

---

## Section 7: Complete Pages - Content Refinements

### 7.1 Claude Code: Verify Step

**Issue:** The verify instruction uses `/mcp` as the command. The `client-guides-copy-refined.md` references `claude mcp list` as an alternative. These are different commands with different contexts:
- `/mcp` is a slash command used inside an active Claude Code session (in the terminal TUI)
- `claude mcp list` is a CLI command run from the shell

The current `docs-pages.js` text says: "After adding the server, type this command inside a Claude Code session: `/mcp`"

This is correct IF the reader is inside a Claude Code session. The instruction "inside a Claude Code session" makes the context clear.

| | text |
|---|---|
| **Before** | `After adding the server, type this command inside a Claude Code session:` |
| **After** | `After adding the server, type this command inside an active Claude Code session:` |

Add the word "active" to reinforce that this is a running session command, not a shell command.

---

### 7.2 Claude Code: Verified Timestamp

**Requirement from `client-guides-copy-refined.md`:** Add "Verified as of April 10, 2026" below the free setup section header.

The `store.js` renderer already supports a `verifiedNote` field on page config (line 5004):
```js
const verifiedMarkup = config.verifiedNote
  ? `<p class="docs-shell__verified">${config.verifiedNote}</p>`
  : '';
```

| | field | value |
|---|---|---|
| **Before** | `verifiedNote` field | Not present on any page config |
| **After** | `verifiedNote: 'Verified against official documentation as of April 10, 2026.'` | Add to `docs-claude-code`, `docs-codex`, `docs-cursor` |

---

### 7.3 Cursor: Missing Context Note (no CLI add command)

The Claude Code and Codex pages both offer two setup methods (CLI command + config file). The Cursor page goes directly to the JSON config with no explanation of why there is no CLI option.

| | location | text |
|---|---|---|
| **Before** | `docs-cursor` free setup section | No contextual note. Opens directly with config JSON. |
| **After** | Opening line before config block | `Cursor uses a JSON config file. There is no CLI add command.` |

Short, honest. Prevents a reader coming from Claude Code from wondering where the `cursor mcp add` command is.

---

### 7.4 Cursor: Verify Step

**Current:** "Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: 'Search for a settings icon.'"

**Issue:** No instruction to reload/restart after editing the config. Without a restart, the server may not appear.

| | text |
|---|---|
| **Before** | `Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."` |
| **After** | `Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the supericons server appears in the list.` |

---

### 7.5 Cursor: Missing Third Troubleshooting Card

Claude Code and Codex each have 3 troubleshooting cards. Cursor has 2. The missing one (npx first-run delay) is universally applicable and should appear on all three pages.

| | content |
|---|---|
| **Before** | 2 cards only: "Server is not responding", "Premium tools are not available" |
| **After** | Add 3rd card: "npx takes a long time on first run" |

**Card copy:**

```
Title: npx takes a long time on first run
Body:  The first run of npx -y supericons-mcp downloads the package from npm.
       This is a one-time delay. Subsequent starts are faster.
```

---

## Section 8: Complete Change Registry

### `store.js` changes

| Line | Element | Before | After |
|---|---|---|---|
| 4974 | Sidebar subtitle | `Guides, setup, and product reference for Supericons.` | `Setup guides and product reference.` |
| 5016 | Kicker rendering | `<span class="docs-shell__kicker">${config.kicker}</span>` | Remove line |

### `docs-pages.js` changes - group labels

| Group | Before | After |
|---|---|---|
| Group 3 | `MCP Tools Reference` | `MCP Reference` |
| Group 6 | `Access and API Keys` | `Account` |

### `docs-pages.js` changes - navLabel

| View key | Before | After |
|---|---|---|
| `docs` | `Docs Home` | `Introduction` |
| `docs-what-is-supericons` | `What Is Supericons` | `Product Overview` |
| `docs-mcp-tools` | `MCP Tools Overview` | `Overview` |
| `docs-mcp-motion` | `Motion Lab Tools` | `Motion Lab` |
| `docs-mcp-converter` | `Converter Tools` | `Converter` |
| `docs-motion-lab` | `Guide` | `Introduction` |
| `docs-motion-lab-triggers` | `Trigger Types` | `Triggers` |
| `docs-converter-guide` | `Guide` | `Introduction` |
| `docs-converter-settings` | `Settings Reference` | `Settings` |
| `docs-access-premium` | `Pro and Collections` | `Plans` |

### `docs-pages.js` changes - pageTitle

| View key | Before | After |
|---|---|---|
| `docs-what-is-supericons` | `What Is Supericons` | `Product Overview` |
| `docs-motion-lab` | `Motion Lab Guide` | `Motion Lab` |
| `docs-motion-lab-triggers` | `Motion Lab Trigger Types` | `Trigger Types` |
| `docs-converter-guide` | `Converter Guide` | `Converter` |
| `docs-access-premium` | `Pro and Collections` | `Plans` |

### `docs-pages.js` changes - summary

| View key | Before | After |
|---|---|---|
| `docs` | `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.` | `Set up MCP, learn Motion Lab, and use Converter.` |
| `docs-claude-code` | (3 sentences about Claude Code and methods) | `Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Pick the method that fits your workflow.` |
| `docs-codex` | (description of TOML config approach) | `Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.` |
| `docs-cursor` | `Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.` | `Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.` |

### `docs-pages.js` changes - verifiedNote (new field)

| View key | Value |
|---|---|
| `docs-claude-code` | `Verified against official documentation as of April 10, 2026.` |
| `docs-codex` | `Verified against official documentation as of April 10, 2026.` |
| `docs-cursor` | `Verified against official documentation as of April 10, 2026.` |

### `docs-pages.js` changes - bodyHtml (targeted edits)

| View key | Location | Before | After |
|---|---|---|---|
| `docs` | Card 2 body | `Step-by-step setup for Claude Code, Codex CLI, and Cursor.` | `Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.` |
| `docs` | Card 2 CTA target | `data-docs-view="docs-claude-code"` | `data-docs-view="docs-quickstart"` |
| `docs-claude-code` | Verify instruction | `After adding the server, type this command inside a Claude Code session:` | `After adding the server, type this command inside an active Claude Code session:` |
| `docs-cursor` | Before config JSON | *(nothing)* | `<p class="docs-section__copy">Cursor uses a JSON config file. There is no CLI add command.</p>` |
| `docs-cursor` | Verify step | `Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."` | `Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the supericons server appears in the list.` |
| `docs-cursor` | Troubleshooting | (2 cards) | Add 3rd card: "npx takes a long time on first run" |

---

## Total scope

| File | Changes |
|---|---|
| `store.js` | 2 (subtitle text, kicker line removal) |
| `docs-pages.js` | 2 group labels + 10 navLabels + 5 pageTitles + 4 summaries + 3 verifiedNote fields + 5 bodyHtml edits |
| **Total** | **~31 targeted text changes, 0 structural changes** |

---

## Section 9: Placeholder Page Content Proposals

These are the 15 pages currently using `renderPlaceholderBody()`. Each section provides:
1. Design thinking analysis of the page's role and audience
2. Exact proposed copy for every field: `pageTitle`, `summary`, and all `bodyHtml` sections, paragraph by paragraph

**Source of truth:** All technical data (tool names, parameters, preset IDs, config paths) sourced from `mcp/index.js`, `lib/motion-lab-workflow.js`, and the verified copy bible (`docs/docs-copy-bible.md`).

---

### 9.1 Product Overview (`docs-what-is-supericons`)

**Page role:** The orientation page for new visitors who clicked through from the home page or a search engine and need to understand what Supericons is before they commit to setup. This page builds trust and helps users self-select: am I a free user or a Pro user?

**Socratic questions answered:**
- Who reads this? A developer who landed on Supericons for the first time and is evaluating whether this tool is worth setting up.
- What decision are they trying to make? Is this worth 5 minutes of my time?
- What is the one thing they need to leave with? A clear mental model of what is free, what is Pro, and how MCP fits in.
- What is the risk of a bad page here? They leave and never set up MCP.

**Design thinking:** Lead with the product value, not the category. "20,000+ open-source SVG icons" is more convincing than "an icon search platform." The Free vs. Pro table should answer the question before they ask it: "Do I need an account?"

---

**pageTitle**

| | text |
|---|---|
| **Before** | `What Is Supericons` |
| **After** | `Product Overview` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `20,000+ open-source icons, MCP integration, and Pro tools for animated icons and image conversion.` |

**bodyHtml - Opening paragraphs**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After (paragraph 1)** | `Supericons gives you 20,000+ open-source SVG icons from 10 libraries in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill in real time. Export as SVG, PNG, or React, Vue, or Svelte components with one click.` |
| **After (paragraph 2)** | `For AI-assisted development, Supericons ships a dedicated MCP server. Your coding agent can search and retrieve icons without switching to a browser. Pro subscribers also get access to Motion Lab (animation presets with CSS and SVG export) and Converter (PNG-to-SVG and SVG-to-PNG conversion), both available in the browser and through MCP tools.` |

**bodyHtml - Section: Free vs. Pro**

Section heading: `Free vs. Pro`

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | Full table below |

| Feature | Free | Pro |
|---|---|---|
| 20,000+ SVG icons from 10 libraries | Yes | Yes |
| AI semantic search | Yes | Yes |
| Real-time customization (color, size, stroke, fill) | Yes | Yes |
| Export as SVG, PNG, React, Vue, Svelte | Yes | Yes |
| MCP: search and retrieve icons | Yes | Yes |
| Premium animated icon collections | No | Yes |
| Motion Lab: animation presets, browser | No | Yes |
| Motion Lab: CSS and SVG export via MCP | No | Yes |
| Converter: PNG to SVG, browser | No | Yes |
| Converter: SVG to PNG, browser | No | Yes |
| Converter: PNG to SVG and SVG to PNG via MCP | No | Yes |
| 30-day rolling collection claim (1 per billing cycle) | No | Yes |

**bodyHtml - Section: The 10 free icon libraries**

Section heading: `The 10 free icon libraries`

| Library | Style |
|---|---|
| Lucide | Clean, consistent, open-source |
| Tabler | 5,000+ bold one-line icons |
| Phosphor | Flexible, multi-weight |
| Heroicons | Tailwind CSS companion, outline and solid |
| Bootstrap Icons | Official Bootstrap companion |
| Iconoir | High-quality clean outlines |
| Ionicons | Web and mobile interface icons |
| Material Symbols | Google variable font icons (weight, fill, grade, optical size) |
| MingCute | Broad interface coverage, modern |
| Simple Icons | 3,400+ brand and company logos |

**bodyHtml - Section: Where to go next**

Section heading: `Where to go next`

| Link label | Destination | Description |
|---|---|---|
| `Set up MCP` | `docs-quickstart` | Get the MCP server running in your coding agent |
| `Get Pro` | external: `/?view=pricing` | See what a Pro subscription includes |
| `API Keys` | `docs-access-api-keys` | Understand how authentication works |

---

### 9.2 MCP Tools Overview (`docs-mcp-tools`)

**Page role:** The entry point for the MCP Reference section. A developer who has just set up the server but doesn't know what tools are available comes here. This page is a map of all 11 tools with access levels, so they know exactly what they have before reading the detailed references.

**Socratic questions:**
- What does the reader need immediately? A clear list of all tools, which are free, which need Pro.
- What is the risk if this page is vague? They try a Pro tool without a key and get a confusing error.
- Should this page try to explain all tools deeply? No. That is for the 3 detailed reference pages. Keep it as a scannable overview with links.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `MCP Tools Overview` |
| **After** | `MCP Tools Overview` (keep - this is the `<h1>`, needs full context) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `11 tools in total. Three are free. Eight require Pro or a purchased collection.` |

**bodyHtml - Opening paragraphs**

| | text |
|---|---|
| **After (paragraph 1)** | `The Supericons MCP server exposes 11 tools your coding agent can call directly. Three tools are free and work without an account. Eight tools are Pro-only and require a valid SUPERICONS_API_KEY linked to an account with Pro or a purchased collection.` |
| **After (paragraph 2)** | `Your agent can discover what tools are available when it first connects to the server. You can also call tools explicitly by name.` |

**bodyHtml - Section: All tools**

Section heading: `All tools`

| Tool | What it does | Access |
|---|---|---|
| `search_icons` | Search 20,000+ free icons across 10 libraries | Free |
| `get_icon` | Retrieve a specific icon by ID and library | Free |
| `list_libraries` | List all available icon libraries | Free |
| `list_motion_presets` | List all Motion Lab animation presets | Pro |
| `get_motion_recipe` | Get a plain-language description of any preset | Pro |
| `animate_icon` | Get Motion Lab CSS and animated SVG in one call | Pro |
| `export_motion_css` | Get only the Motion Lab CSS for an icon | Pro |
| `export_animated_svg` | Get only the standalone animated SVG | Pro |
| `inspect_converter_options` | List Converter settings and valid values | Pro |
| `convert_svg_to_png` | Render an SVG as a PNG at any resolution | Pro |
| `convert_png_to_svg` | Trace a PNG image into an SVG | Pro |

**bodyHtml - Callout note**

`Premium animated icon collections from get_icon and search_icons also require Pro or collection access and a valid API key.`

**bodyHtml - Section: Detailed references**

Section heading: `Detailed references`

Three links (routing cards or link list):
- `Icon tools (search_icons, get_icon, list_libraries)` - target `docs-mcp-icons`
- `Motion Lab tools (list_motion_presets, get_motion_recipe, animate_icon, export_motion_css, export_animated_svg)` - target `docs-mcp-motion`
- `Converter tools (inspect_converter_options, convert_svg_to_png, convert_png_to_svg)` - target `docs-mcp-converter`

---

### 9.3 Icon Tools (`docs-mcp-icons`)

**Page role:** Reference page. A developer asking "how do I use search_icons?" lands here. They need exact parameter names, types, and what gets returned. No ambiguity tolerated.

**Design thinking:** Reference pages must be scannable. Tables are better than prose for parameters. Access level must be stated per tool, not just once in the intro, because developers may skip the intro.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Icon Tools Reference` |
| **After** | `Icon Tools Reference` (keep - specific `<h1>`) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `search_icons, get_icon, and list_libraries. All three are free for the standard 20,000+ library.` |

**bodyHtml - Intro**

`These three tools are free and do not require an API key for the standard 20,000+ icon library. Premium animated icon collections from these tools require Pro or collection access.`

---

**bodyHtml - Tool: search_icons**

Tool heading: `search_icons`

Description: `Search 20,000+ free icons across 10 libraries using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections are available when your API key is linked to a Pro subscription or purchased packs.`

Parameters:

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query` | string | Yes | - | Natural language search term. Example: "heart", "login", "download arrow" |
| `library` | string | No | - | Filter by library. Valid values: `lucide`, `tabler`, `phosphor`, `heroicons`, `bootstrap`, `iconoir`, `ionicons`, `material`, `simpleicons`, `mingcute`, or a premium pack name |
| `limit` | integer | No | 10 | Max results returned. Range: 1 to 50 |

Returns: `Matching icons with SVG code, icon ID, library name, and metadata. When no results are found, returns a message indicating no match.`

Access badge: **Free**

---

**bodyHtml - Tool: get_icon**

Tool heading: `get_icon`

Description: `Retrieve a specific icon by its ID and library. Returns the full SVG code and metadata. Premium icons require an API key linked to a Pro subscription or purchased packs.`

Parameters:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Icon ID. Example: "heart", "arrow-right", "settings" |
| `library` | string | Yes | Library name. Example: "lucide", "tabler", "phosphor", or a premium pack name |

Returns: `Full SVG code plus icon metadata (ID, name, library, premium status). For premium animated icons, also returns the CSS animation block and a usage HTML snippet.`

Access badge: **Free for standard icons. Pro or collection access required for premium animated icons.**

---

**bodyHtml - Tool: list_libraries**

Tool heading: `list_libraries`

Description: `List all available icon libraries with their names, icon counts, and descriptions. Premium libraries are marked.`

Parameters: None.

Returns: `An array of library objects, each with: id, name, count, description, premium (boolean), and accessible (whether your current API key can access it).`

Access badge: **Free**

---

### 9.4 Motion Lab MCP Tools (`docs-mcp-motion`)

**Page role:** Reference for all 5 Motion Lab MCP tools. A Pro user who just unlocked Motion Lab comes here to understand which tool to call first. The callout ("not sure which preset? Call list_motion_presets first") is a critical UX hint that saves them from a failed first call.

**Design thinking:** Lead with the recommended first-call tool (`list_motion_presets`), then flow through the logical usage sequence: discover presets, understand one preset, then export.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Motion Lab MCP Tools` |
| **After** | `Motion Lab MCP Tools` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Five Pro-only tools for discovering presets, previewing recipes, and exporting CSS and animated SVG.` |

**bodyHtml - Intro + callout**

Intro: `These five tools expose Motion Lab capabilities to your coding agent. All five are Pro-only and require a valid SUPERICONS_API_KEY linked to a Pro account or a purchased animated collection.`

Callout note: `Not sure which preset to use? Call list_motion_presets first to see all available options with descriptions, then get_motion_recipe to understand what a specific preset does before committing.`

---

**bodyHtml - Tool: list_motion_presets**

Description: `List the Motion Lab presets currently available through Supericons MCP.`

Parameters: None.

Returns: `An array of preset objects. Each preset includes: id, label, category, description, supportedTriggers (always ["loop", "hover", "click"]), defaultDurationMs (500), and intensityRange (min: 25, max: 200, default: 100).`

Access: **Pro**

---

**bodyHtml - Tool: get_motion_recipe**

Description: `Return a human-readable description of how a preset behaves, including trigger type, timing, easing, and intended use. Use this before calling animate_icon or the export tools to understand what output to expect.`

Parameters:

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `preset` | string | Yes | - | Preset ID. Example: "pulse", "bounce", "spin", "trace", "typing" |
| `trigger` | string | No | `loop` | How the animation starts. Valid values: `loop`, `hover`, `click` |
| `durationMs` | integer | No | 500 | Animation duration in milliseconds. Range: 100 to 4000 |
| `intensityPercent` | integer | No | 100 | Scales the intensity of the animation effect. Range: 25 to 200 |

Returns: `Plain-language description of the preset, including label, category, description, trigger behavior, duration, intensity, and usage notes.`

Access: **Pro**

---

**bodyHtml - Tool: animate_icon**

Description: `Generate both the Motion Lab CSS and a self-contained animated SVG for one icon in a single call. Use this when you want both outputs without making two separate calls.`

Parameters:

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | string | Yes | - | Icon ID. Example: "heart", "scan-virus", "fingerprint-scan" |
| `library` | string | Yes | - | Library or premium pack name |
| `preset` | string | Yes | - | Motion preset ID |
| `trigger` | string | No | `loop` | `loop`, `hover`, or `click` |
| `durationMs` | integer | No | 500 | 100 to 4000 |
| `intensityPercent` | integer | No | 100 | 25 to 200 |
| `color` | string | No | - | Optional CSS color override for icons that inherit `currentColor` |

Returns: `An object with: id, library, recipe (the motion recipe object), css (Motion Lab CSS), and animatedSvg (standalone SVG with embedded animation).`

Access: **Pro**

---

**bodyHtml - Tool: export_motion_css**

Description: `Generate only the Motion Lab CSS for an icon. Use this when you have the SVG inline in your markup and want to manage the animation as a separate stylesheet.`

Parameters: Same as `animate_icon`.

Returns: `An object with: id, library, preset (the motion recipe), and css (the Motion Lab CSS with @keyframes and animation rules).`

Note: `The CSS selector targets #icon-container svg by default. To animate the SVG, wrap it in a container with id="icon-container".`

Access: **Pro**

---

**bodyHtml - Tool: export_animated_svg**

Description: `Generate a self-contained animated SVG with the animation embedded directly in the file. Drop it into any HTML page without external CSS.`

Parameters: Same as `animate_icon`.

Returns: `An object with: id, library, preset (the motion recipe), and animatedSvg (a complete SVG string with a <style> block embedded inside).`

**bodyHtml - "Which to use" table**

| You want to... | Use |
|---|---|
| Use the SVG inline with your own CSS pipeline | `export_motion_css` |
| Drop a portable self-contained animated file anywhere | `export_animated_svg` |
| Get both outputs in one call | `animate_icon` |
| Understand the preset before using it | `get_motion_recipe` |

Access: **Pro**

---

### 9.5 Converter MCP Tools (`docs-mcp-converter`)

**Page role:** Reference for the 3 Converter MCP tools. A Pro user who wants to convert images via their agent comes here. The `traceClass` table is the most important element on this page - developers will bookmark this.

**Design thinking:** `traceClass` has 6 values and choosing the wrong one produces bad output. Front-load the warning, then give them a quick reference table to pick correctly. Reference tables reduce support burden.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Converter MCP Tools` |
| **After** | `Converter MCP Tools` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Three Pro-only tools for image conversion. Read the traceClass reference before choosing settings for PNG to SVG.` |

**bodyHtml - Intro**

`These three tools expose Converter capabilities to your coding agent. All three are Pro-only. The traceClass parameter in convert_png_to_svg has six values with meaningfully different output results - read the reference below before choosing.`

---

**bodyHtml - Tool: inspect_converter_options**

Description: `List the current Converter MCP options and their valid values. Call this first if you are unsure which settings to use for your source image.`

Parameters: None.

Returns: `An object describing all available converter settings, valid values, default values, and limits.`

Access: **Pro**

---

**bodyHtml - Tool: convert_svg_to_png**

Description: `Render an SVG string as a PNG at any output width.`

Parameters:

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `svg` | string | Yes | - | Raw SVG string to render |
| `targetWidth` | integer | No | 512 | Output width in pixels. Range: 16 to 2048 |
| `background` | string | No | `transparent` | Background color. Use `transparent` or a hex value like `#ffffff` |

Returns: `PNG as a base64 string.`

Access: **Pro**

---

**bodyHtml - Tool: convert_png_to_svg**

Description: `Trace a raster PNG image into an SVG. Output quality depends heavily on the source image and the settings you choose. Simple, flat-color images trace well. Complex photographs and gradient-heavy images do not.`

Parameters:

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `imageBase64` | string | Yes | - | PNG as base64 text or a data URL |
| `colorMode` | string | No | `color` | `color` or `mono` |
| `qualityMode` | string | No | `exact` | `exact` or `compact` |
| `traceClass` | string | No | `general-color` | See traceClass reference below |
| `uiMode` | string | No | `logo` | `logo` or `icon` |

Returns: `SVG string.`

Access: **Pro**

---

**bodyHtml - traceClass reference**

Section heading: `traceClass reference`

Intro: `The traceClass parameter selects the tracing profile tuned for your source image type. Choosing the wrong class will produce imprecise or overweight output.`

| traceClass value | Best for |
|---|---|
| `general-color` | Most full-color images. A safe default when unsure. |
| `flat-logo-color` | Logos with solid, flat color fills and no gradients |
| `tile-icon-color` | Small repeating tile icons |
| `tiny-line-icon` | Very small icons with fine line detail |
| `single-color-mark` | Single-color logos, wordmarks, or simple marks |
| `mono-mask` | High-contrast black and white images |

**bodyHtml - qualityMode reference**

| qualityMode value | Behavior |
|---|---|
| `exact` | Preserves maximum path detail. Output file is larger. Recommended for most use cases. |
| `compact` | Simplifies paths to reduce file size. Some fine detail will be lost. |

**bodyHtml - uiMode reference**

| uiMode value | Behavior |
|---|---|
| `logo` | Optimizes output for logo-style artwork with free-form shapes and curves |
| `icon` | Optimizes output for icon-style artwork, favoring geometric precision and clean edges |

**bodyHtml - Recommended combinations**

| Source image | Recommended settings |
|---|---|
| Full-color logo with gradients | `general-color`, `exact`, `logo` |
| Simple flat logo | `flat-logo-color`, `exact`, `logo` |
| Single-color wordmark | `single-color-mark`, `compact`, `logo` |
| Small UI icon | `tiny-line-icon`, `exact`, `icon` |
| Black and white illustration | `mono-mask`, `exact`, `logo` |

---

### 9.6 Motion Lab Introduction (`docs-motion-lab`)

**Page role:** The entry point for the Motion Lab section. A developer who just finished MCP setup and has Pro access comes here to understand: what is Motion Lab, how do I access it, what does it produce? This page converts a Pro subscriber into an active Motion Lab user.

**Socratic question:** What is the one risk on this page? That the reader finishes reading and still doesn't know where to start. The "Where to go next" cards must be obvious and actionable.

**Design thinking:** No deep technical content on this page. It is an orientation layer. The 3 routing cards at the bottom are as important as the body copy.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Motion Lab Guide` |
| **After** | `Motion Lab` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `CSS animation presets for Supericons icons.` |

**bodyHtml - Intro paragraph**

`Motion Lab is a preset-driven animation workspace for Supericons icons. Choose a preset, adjust the trigger, timing, and intensity, then export the result as a Motion Lab CSS file or a standalone animated SVG. Both outputs are production-ready and require no JavaScript.`

**bodyHtml - Section: How to access Motion Lab**

Section heading: `How to access Motion Lab`

Body: `Motion Lab is available in two ways:`

- `In the browser: Open the Supericons app with a Pro account. Select any icon and use the Motion Lab panel to preview and export animations.`
- `Through MCP: Your coding agent can call Motion Lab tools directly. See the Motion Lab MCP tools reference.`

Callout: `Both paths require a Pro subscription or a purchased animated icon collection.`

**bodyHtml - Section: What Motion Lab produces**

Section heading: `What Motion Lab produces`

Body: `Motion Lab generates two types of output from any preset:`

- `Motion Lab CSS - A stylesheet with @keyframes and animation rules. Apply the animation to an inline SVG element using the class target #icon-container svg. The SVG and animation live in separate files.`
- `Animated SVG - A self-contained SVG file with the animation embedded in a <style> block inside the SVG. Drop it anywhere without external CSS.`

**bodyHtml - Section: Where to go next**

Section heading: `Where to go next`

Three routing cards:
1. Heading: `Presets` / Body: `Full list of available presets with descriptions and categories.` / Link: `docs-motion-lab-presets`
2. Heading: `Trigger Types` / Body: `Understand loop, hover, and click behavior before exporting.` / Link: `docs-motion-lab-triggers`
3. Heading: `Exports` / Body: `How to use CSS and animated SVG output in your project.` / Link: `docs-motion-lab-exports`

---

### 9.7 Motion Lab Presets (`docs-motion-lab-presets`)

**Page role:** Reference page. A developer choosing a preset animation needs to know: what does "bounce" look like vs. "pop"? Which category should I use for a notification icon? This page answers both.

**Design thinking:** The table is the main content. The category descriptions are secondary but important for users who don't know which preset to pick first. Order the table to put the most commonly used presets (Attention category) first.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Motion Lab Presets` |
| **After** | `Motion Lab Presets` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `12 presets across 5 categories. All support loop, hover, and click triggers.` |

**bodyHtml - Intro paragraph**

`Supericons Motion Lab ships 12 presets across 5 categories. All presets support three trigger types (loop, hover, click) and accept duration (100ms to 4000ms) and intensity (25% to 200%) adjustments.`

**bodyHtml - Full preset reference table**

Section heading: `All presets`

| ID | Label | Category | Description |
|---|---|---|---|
| `pulse` | Pulse | Attention | Scales gently in and out for soft emphasis. |
| `bounce` | Bounce | Attention | Lifts the icon with a quick rebound. |
| `shake` | Shake | Attention | Adds a quick side-to-side alert motion. |
| `pop` | Pop | Attention | Snaps up with a springy overshoot. |
| `spin` | Spin | Rotation | Rotates the full icon around its center. |
| `float` | Float | Ambient | Gives the icon a subtle hovering drift. |
| `sparkle` | Sparkle | Effects | Adds a glow burst that peaks mid-cycle. |
| `trace` | Trace | Reveal | Reveals the icon with a directional trace. |
| `sweep` | Sweep | Reveal | Sweeps across the icon with a lit edge. |
| `typing` | Typing | Reveal | Stages the icon in with stepped reveal timing. |
| `tap` | Tap | Interaction | Presses forward with a quick action glow. |
| `magneticIn` | Magnetic In | Entrance | Pulls the icon inward with a magnetic snap. |

**bodyHtml - Parameter ranges**

Section heading: `Parameter ranges`

| Parameter | Minimum | Default | Maximum |
|---|---|---|---|
| Duration | 100ms | 500ms | 4000ms |
| Intensity | 25% | 100% | 200% |

**bodyHtml - Preset categories explained**

Section heading: `Preset categories explained`

- `Attention - Designed to draw the eye. Use on icons that mark errors, warnings, notifications, or calls to action.`
- `Rotation - Full icon rotation. Use on loading indicators, refresh controls, and spinners.`
- `Ambient - Subtle, continuous motion. Use on hero sections, decorative backgrounds, and always-on branding icons.`
- `Effects - Glow and filter-based effects. Use on feature icons, premium badges, and highlight states.`
- `Reveal - Entrance and disclosure animations. Use on icons that appear when a panel opens, a page loads, or content becomes available.`
- `Interaction - Feedback animations for user input. Use on confirm, submit, tap-return, and toggle icons.`
- `Entrance - Cinematic entrance motion. Use on first-visible hero icons and splashscreen elements.`

---

### 9.8 Trigger Types (`docs-motion-lab-triggers`)

**Page role:** Reference page for animation trigger behavior. A developer who is unsure whether to use `loop`, `hover`, or `click` for their use case reads this page to make the right call before exporting.

**Design thinking:** The "when to use / when not to use" structure is the most useful format here. Developers think in use cases, not definitions. End with the summary table so they can bookmark it for future reference.

**Key technical fact (source-verified from `lib/motion-lab-workflow.js`):** `click` trigger plays 3 times per activation.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Motion Lab Trigger Types` |
| **After** | `Trigger Types` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `loop, hover, or click. Choose based on where the icon appears and how users interact with it.` |

**bodyHtml - Intro paragraph**

`Every Motion Lab preset supports three trigger types. The trigger controls when the animation starts and how many times it plays. Choose based on the context where the icon appears.`

**bodyHtml - Section: loop**

Section heading: `loop`

Body: `The animation plays continuously as soon as the icon is rendered. It repeats indefinitely with no user interaction required.`

When to use: `Loading states, ambient decorations, hero section branding icons, always-on visual interest.`

When not to use: `Interactive elements where continuous motion would compete with user focus.`

---

**bodyHtml - Section: hover**

Section heading: `hover`

Body: `The animation plays while the user hovers the icon element. It starts on mouseenter and stops naturally when the animation completes after mouseleave.`

When to use: `Interactive buttons, links, menu items, and call-to-action icons that reward pointer interaction.`

When not to use: `Touch-only interfaces where hover has no reliable equivalent.`

---

**bodyHtml - Section: click**

Section heading: `click`

Body: `The animation plays when the icon is pressed (:active) or when an .active class is applied. It plays 3 times on activation, then stops.`

When to use: `Toggle states, like/unlike actions, confirmation icons, submit button feedback, and state changes the user triggers explicitly.`

When not to use: `Icons that have a persistent hover state (use hover trigger instead).`

---

**bodyHtml - Trigger behavior summary table**

Section heading: `Trigger behavior summary`

| Trigger | Starts when | Repeats | Count |
|---|---|---|---|
| `loop` | Icon renders | Continuously | Infinite |
| `hover` | User hovers | Until unhovered | Infinite while hovered |
| `click` | User presses (`:active` or `.active` class) | On click | 3 times per click |

---

### 9.9 Motion Lab Exports (`docs-motion-lab-exports`)

**Page role:** Practical guide. A developer who has generated CSS or an animated SVG from Motion Lab needs to know: how do I actually use this in my project? This page has code examples that developers copy directly.

**Design thinking:** Code examples are the most valuable element. Keep prose minimal. The "which format should I use?" decision table removes ambiguity and reduces back-and-forth with the agent.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Motion Lab Exports` |
| **After** | `Motion Lab Exports` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Two output formats: Motion Lab CSS and animated SVG. Both are production-ready. No JavaScript required.` |

**bodyHtml - Intro paragraph**

`Motion Lab produces two output formats: Motion Lab CSS and animated SVG. Both are production-ready. Choose based on how you want to manage the SVG and animation in your project.`

---

**bodyHtml - Section: Motion Lab CSS**

Section heading: `Motion Lab CSS`

Sub-heading: `What it is`

`A stylesheet with @keyframes definitions and animation rules. Apply it alongside an SVG element in your HTML or JSX. The SVG and the animation are separate files.`

Sub-heading: `How to use it`

Steps:
1. `Get the SVG from Supericons using search_icons or get_icon.`
2. `Get the CSS from export_motion_css using your chosen preset and trigger.`
3. `Place the SVG inside a container with id="icon-container":`

```html
<div id="icon-container">
  <!-- paste your SVG here -->
</div>
```

4. `Link the CSS file, or paste the CSS rules into your existing stylesheet.`

Sub-heading: `What the CSS contains`

- `A brand comment: /* Supericons Motion Lab */`
- `A preset label comment with your chosen preset, trigger, duration, and intensity`
- `A @keyframes block for the animation`
- `An animation rule targeting #icon-container svg`
- `overflow: visible, transform-box: fill-box, and transform-origin: center on the SVG and its children to ensure transforms behave correctly`

---

**bodyHtml - Section: Animated SVG**

Section heading: `Animated SVG`

Sub-heading: `What it is`

`A self-contained SVG file with the animation embedded inside a <style> block within the SVG itself. No external CSS needed.`

Sub-heading: `How to use it`

`Drop the animated SVG file directly into any HTML page:`

```html
<img src="icon-animated.svg" alt="animated icon" width="24" height="24">
```

`Or paste the SVG inline:`

```html
<!-- paste the entire animated SVG string here -->
```

Sub-heading: `Compatibility note`

`Self-contained animated SVGs work in most modern browsers. When used as an <img> source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events as normal.`

---

**bodyHtml - "Which format should I use?" table**

Section heading: `Which format should I use?`

| Situation | Recommended format |
|---|---|
| SVG is in your HTML or JSX, styled through your CSS pipeline | Motion Lab CSS |
| You want one portable file with no dependencies | Animated SVG |
| You are embedding in email or a documentation site | Animated SVG |
| You need to update the animation without changing the SVG | Motion Lab CSS |
| You want both formats at once | Call `animate_icon` |

---

### 9.10 Converter Introduction (`docs-converter-guide`)

**Page role:** Entry point for the Converter section. A Pro subscriber who wants to use Converter but doesn't know where to start reads this first. The "what it does well / doesn't do well" structure immediately manages expectations and prevents wasted conversions.

**Socratic question:** What is the biggest mistake a new Converter user makes? Running a photograph through PNG-to-SVG and getting garbage output. This page prevents that by front-loading the limitations.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Converter Guide` |
| **After** | `Converter` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Convert between PNG and SVG format. Available in the browser and through MCP.` |

**bodyHtml - Intro paragraph**

`Converter transforms images between raster and vector formats. Convert a PNG logo or icon into a clean SVG, or render any SVG as a PNG at any resolution. Both workflows are available in the browser and through MCP tools with a Pro subscription or purchased collection.`

**bodyHtml - Section: What Converter does well**

Section heading: `What Converter does well`

`Converter produces clean, accurate output when the source image is:`
- `A flat-color logo with solid fills`
- `A single-color mark or wordmark`
- `A simple UI icon with clear edges`
- `A high-contrast black and white illustration`

**bodyHtml - Section: What Converter does not do well**

Section heading: `What Converter does not do well`

`Converter produces imprecise or overweight SVG output when the source image is:`
- `A photograph or realistic illustration`
- `An image with gradients, shadows, or complex texture`
- `A very small raster image (under 64px in any dimension with fine detail)`

Callout note: `If your source image has gradients or photographic detail, PNG-to-SVG tracing is unlikely to produce a usable result. The tool is designed for graphics that were originally vector and exist in raster form.`

**bodyHtml - Section: How to access Converter**

Section heading: `How to access Converter`

`Converter is available in two ways:`
- `In the browser: Open the Supericons app with a Pro account. Use the Converter tool from the navigation.`
- `Through MCP: Use convert_png_to_svg or convert_svg_to_png from your coding agent. Call inspect_converter_options first if you are unsure which settings to use.`

Callout: `Both paths require a Pro subscription or a purchased collection.`

**bodyHtml - Section: Where to go next**

Section heading: `Where to go next`

Three routing cards:
1. Heading: `PNG to SVG` / Body: `How to trace a raster image into a vector. Settings explained.` / Link: `docs-converter-png-to-svg`
2. Heading: `SVG to PNG` / Body: `Render any SVG at any resolution with transparent or solid background.` / Link: `docs-converter-svg-to-png`
3. Heading: `Settings Reference` / Body: `Full reference for traceClass, qualityMode, and uiMode.` / Link: `docs-converter-settings`

---

### 9.11 PNG to SVG (`docs-converter-png-to-svg`)

**Page role:** Practical guide for the most complex Converter workflow. Requires the most hand-holding because `traceClass` choices are non-obvious. The "before you trace" checklist prevents bad inputs.

**Design thinking:** Checklist format for the pre-trace questions. Quick-reference table for `traceClass`. Code example for MCP usage. Common problems at the end.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `PNG to SVG` |
| **After** | `PNG to SVG` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Trace a raster image into a vector SVG. Output quality depends on the source image and settings.` |

**bodyHtml - Intro paragraph**

`The PNG-to-SVG workflow traces a raster image into a vector SVG. Output quality depends on the source image and the settings you choose. Reading this page before tracing will save you time.`

**bodyHtml - Section: When to use this**

Section heading: `When to use this`

`PNG-to-SVG tracing is useful when you have a logo, icon, or mark in raster format and need a scalable vector. It works best on images that were originally vector and only exist in raster form because of how they were exported or shared.`

**bodyHtml - Section: Before you trace**

Section heading: `Before you trace`

Checklist:
- `Does the image have solid, flat colors? If yes, tracing will produce clean output.`
- `Does the image have gradients or shadows? If yes, expect imprecise or complex paths.`
- `Is the image larger than 100px in both dimensions? If yes, tracing has enough detail to work with.`
- `Is the image a photograph or complex illustration? If yes, PNG-to-SVG is likely the wrong tool.`

**bodyHtml - Section: Choosing your settings**

Section heading: `Choosing your settings`

`The traceClass parameter is the most important choice. It selects the tracing algorithm tuned for your image type.`

traceClass quick guide:

| Your image is... | Use |
|---|---|
| A typical full-color logo | `flat-logo-color` |
| A wordmark or emblem with one color | `single-color-mark` |
| A small icon grid or tile | `tile-icon-color` |
| A tiny line icon | `tiny-line-icon` |
| Black and white with high contrast | `mono-mask` |
| Something else, or unsure | `general-color` |

`For qualityMode, use exact unless file size is a critical constraint. For uiMode, use icon for geometric icon shapes and logo for everything else.`

Callout note: `When unsure, call inspect_converter_options to see all valid settings with descriptions.`

**bodyHtml - Section: Steps via MCP**

Section heading: `Steps via MCP`

1. `Prepare your PNG as a base64 string or data URL.`
2. `Call convert_png_to_svg with your image and your chosen settings:`

```
convert_png_to_svg
  imageBase64: "data:image/png;base64,..."
  traceClass: "flat-logo-color"
  qualityMode: "exact"
  uiMode: "logo"
```

3. `Review the SVG output. If paths are imprecise, try a different traceClass.`

**bodyHtml - Section: Common problems**

Section heading: `Common problems`

Problem 1: `Output SVG has too many paths and looks messy`
Solution: `Use compact for qualityMode to simplify paths. Or use a more specific traceClass (for example, single-color-mark instead of general-color).`

Problem 2: `Output is correct shape but wrong colors`
Solution: `Switch colorMode to mono to force grayscale tracing, then color the SVG manually in your code.`

Problem 3: `Output does not match the source image at all`
Solution: `The source image may not be suitable for tracing. Gradients, textures, and photographic content do not trace to clean SVG.`

---

### 9.12 SVG to PNG (`docs-converter-svg-to-png`)

**Page role:** Practical guide for the simpler Converter workflow. `targetWidth` and `background` are the only decisions. Common problems are predictable.

**Design thinking:** Shorter than the PNG to SVG page. "Choosing your output size" table is the most scanned element - put it first. End with common problems for the `currentColor` gotcha which catches many developers.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `SVG to PNG` |
| **After** | `SVG to PNG` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Render any SVG as a PNG at any output width. Choose your size and background color.` |

**bodyHtml - Intro paragraph**

`The SVG-to-PNG workflow renders any SVG at any output width. Use it to generate PNG assets for contexts where SVG is not supported, or to produce fixed-size icon exports.`

**bodyHtml - Section: Choosing your output size**

Section heading: `Choosing your output size`

`Use targetWidth to set the output pixel width. The height scales proportionally based on the SVG's viewBox. Common values:`

| Use case | Suggested targetWidth |
|---|---|
| Small icon (nav, button) | 24 to 48 |
| Medium icon (card, feature) | 64 to 128 |
| Large feature icon | 256 to 512 |
| Full-resolution export | 1024 to 2048 |

`The default is 512px. The maximum is 2048px.`

**bodyHtml - Section: Choosing your background**

Section heading: `Choosing your background`

`Use background to set the canvas background:`
- `transparent (default) - PNG with a transparent background. Best for icons placed over colored backgrounds.`
- `A hex value like #ffffff - PNG with a solid white (or any color) background. Best for contexts where transparency is not supported.`

**bodyHtml - Section: Steps via MCP**

Section heading: `Steps via MCP`

```
convert_svg_to_png
  svg: "<svg>...</svg>"
  targetWidth: 512
  background: "transparent"
```

`Returns: PNG as a base64 string.`

**bodyHtml - Section: Common problems**

Section heading: `Common problems`

Problem 1: `Output looks blurry`
Solution: `Increase targetWidth. A PNG rendered at 24px and displayed at 48px will appear soft.`

Problem 2: `SVG with currentColor renders as black`
Solution: `Set the color attribute directly on the SVG before passing it to the tool, or replace currentColor with a concrete hex value.`

---

### 9.13 Settings Reference (`docs-converter-settings`)

**Page role:** Complete parameter reference for both Converter tools. A developer who needs to look up what `mono-mask` does or what `compact` vs `exact` means comes here. This is a reference, not a guide - scannable tables, minimal prose.

**Design thinking:** Reference pages are bookmarked and revisited. Structure must be rigid and predictable. Each parameter gets its own table. Recommended combinations table at the end gives developers shortcut answers.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Converter Settings Reference` |
| **After** | `Settings Reference` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Complete reference for colorMode, qualityMode, traceClass, and uiMode.` |

**bodyHtml - Intro paragraph**

`Complete reference for all parameters accepted by convert_png_to_svg and convert_svg_to_png.`

**bodyHtml - colorMode reference**

Section heading: `colorMode`

| colorMode value | Behavior |
|---|---|
| `color` | Traces the full color information from the image. Default. |
| `mono` | Converts the image to grayscale before tracing. Produces simpler, single-color SVG paths. |

**bodyHtml - qualityMode reference**

Section heading: `qualityMode`

| qualityMode value | Behavior |
|---|---|
| `exact` | Preserves maximum path detail. Output file is larger. Recommended for most use cases. |
| `compact` | Simplifies paths to reduce file size. Some fine detail will be lost. |

**bodyHtml - traceClass reference**

Section heading: `traceClass`

| traceClass value | Best for |
|---|---|
| `general-color` | Most full-color images. A safe default when unsure. |
| `flat-logo-color` | Logos with solid, flat color fills and no gradients |
| `tile-icon-color` | Small repeating tile icons |
| `tiny-line-icon` | Very small icons with fine line detail |
| `single-color-mark` | Single-color logos, wordmarks, or simple marks |
| `mono-mask` | High-contrast black and white images |

**bodyHtml - uiMode reference**

Section heading: `uiMode`

| uiMode value | Behavior |
|---|---|
| `logo` | Optimizes output for logo-style artwork with free-form shapes and curves |
| `icon` | Optimizes output for icon-style artwork, favoring geometric precision and clean edges |

**bodyHtml - Recommended combinations**

Section heading: `Recommended combinations`

| Source image | Recommended settings |
|---|---|
| Full-color logo with gradients | `general-color`, `exact`, `logo` |
| Simple flat logo | `flat-logo-color`, `exact`, `logo` |
| Single-color wordmark | `single-color-mark`, `compact`, `logo` |
| Small UI icon | `tiny-line-icon`, `exact`, `icon` |
| Black and white illustration | `mono-mask`, `exact`, `logo` |

---

### 9.14 API Keys (`docs-access-api-keys`)

**Page role:** The most important account page. Gets linked from every client guide and from the premium setup sections. Must be completely unambiguous about the core truth: a key does not grant access, it carries entitlement.

**Socratic questions:**
- What is the number one confusion developers have about API keys? Thinking that having a key equals having access.
- How do we prevent this confusion? State it in a callout at the very top of the page, before any other content.
- What are the practical things they need to know? How to generate, where to add, how to rotate.

**Design thinking:** The core truth callout is the most important element. Everything else is procedural. Keep procedures short and numbered. Code blocks for both JSON and TOML config formats - do not make developers search the client guide pages.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `API Keys` |
| **After** | `API Keys` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `How to generate, add, and manage your Supericons API key for MCP premium access.` |

**bodyHtml - Core truth callout (top of page, before any section)**

Callout text: `An API key does not grant access. It identifies your account and carries whatever entitlement your account already has.`

**bodyHtml - Opening paragraphs**

Paragraph 1: `Your Supericons API key is used to authenticate your account when calling MCP tools that require access beyond the free tier. If your account has an active Pro subscription or a purchased collection, your API key carries that entitlement to the MCP server.`

Paragraph 2: `A key linked to an account with no premium access behaves the same as having no key. Premium tool responses will indicate that the feature requires Pro access.`

**bodyHtml - Section: How to generate a key**

Section heading: `How to generate a key`

Steps:
1. `Sign in to supericons.dev.`
2. `Open the dashboard and go to API Keys.`
3. `Click Generate new key.`
4. `Copy the key immediately. It is only shown once.`

**bodyHtml - Section: How to add your key to MCP**

Section heading: `How to add your key to MCP`

Intro: `Add SUPERICONS_API_KEY to the env block of your MCP server config. The exact syntax depends on your client.`

Sub-heading: `Claude Code and Cursor (JSON)`

```json
"env": {
  "SUPERICONS_API_KEY": "your-key-here"
}
```

Sub-heading: `Codex (TOML)`

```toml
env = { SUPERICONS_API_KEY = "your-key-here" }
```

**bodyHtml - Section: Rotating and revoking keys**

Section heading: `Rotating and revoking keys`

`You can generate a new key at any time from the dashboard. When you generate a new key, update your MCP config with the new value and restart your client session. Revoked keys return an authentication error from all Pro MCP tools.`

**bodyHtml - Section: One key per account**

Section heading: `One key per account`

`Each Supericons account supports one active API key at a time. Generating a new key does not automatically revoke the old one, but it is good practice to revoke keys you no longer use.`

---

### 9.15 Plans (`docs-access-premium`)

**Page role:** Explains the two access paths to premium features. A developer who wants to unlock MCP Pro tools and doesn't know whether they need a subscription or a one-time purchase reads this page. The comparison table is the decision-making tool.

**Design thinking:** Lead with the two paths, not with features. The developer thinks "which one should I get?" not "what does Pro include?" Answer their actual question first, then give the detail.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Pro and Collections` |
| **After** | `Plans` |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Two ways to access premium features: Pro subscription or individual collection purchase.` |

**bodyHtml - Intro paragraph**

`There are two ways to access premium features: a Pro subscription or an individual collection purchase. Both unlock MCP Pro tools and the purchased content. They differ in what content is included and how billing works.`

**bodyHtml - Section: Pro subscription**

Section heading: `Pro subscription`

Body: `A Pro subscription gives you access to all premium animated icon collections, Motion Lab, Converter, and a rolling claim of one collection per billing cycle to keep permanently.`

What Pro unlocks via MCP:
- `All Motion Lab tools (list_motion_presets, get_motion_recipe, animate_icon, export_motion_css, export_animated_svg)`
- `All Converter tools (inspect_converter_options, convert_svg_to_png, convert_png_to_svg)`
- `All premium animated icon collections via search_icons and get_icon`

How to get Pro: `Subscribe from the Pricing page at supericons.dev.` (link to `/?view=pricing`)

**bodyHtml - Section: Individual collection purchase**

Section heading: `Individual collection purchase`

Body: `Purchasing a specific animated icon collection gives you permanent access to that collection and enables the Motion Lab and Converter MCP tools for that collection's content.`

What a collection purchase unlocks via MCP:
- `Motion Lab and Converter tools for that collection's icons`
- `The purchased collection in search_icons and get_icon`
- `Only the purchased collection - not all premium collections`

How to purchase: `Individual collections are available from the Pricing page or the collection detail page at supericons.dev.` (link to `/?view=pricing`)

**bodyHtml - Comparison table**

Section heading: `Pro vs. individual collection`

| | Pro subscription | Individual collection |
|---|---|---|
| All premium collections | Yes | No (purchased only) |
| Motion Lab MCP tools | Yes | Yes |
| Converter MCP tools | Yes | Yes |
| Collection claim per billing cycle | Yes | No |
| Billing | Monthly subscription | One-time |

**bodyHtml - Callout note**

`Either path requires an API key added to your MCP client config to unlock premium tools in your coding agent.` + internal link to `docs-access-api-keys`: `See API Keys for setup instructions.`

---

### 9.16 Troubleshooting (`docs-troubleshooting`)

**Page role:** The fallback page when something doesn't work. Users arrive here frustrated. The page must be fast to scan, organized by where in the workflow the problem occurs, and provide actionable resolution steps - not vague suggestions.

**Design thinking:** Organize by where the user is in the flow (setup, access, Motion Lab, Converter) so they can jump to the right section immediately. Every problem has a concrete solution. End with the "if your problem isn't listed" contact option so users never feel abandoned.

**Socratic question:** What is the most common problem? Server not appearing after setup. Put that first.

---

**pageTitle**

| | text |
|---|---|
| **Before** | `Troubleshooting` |
| **After** | `Troubleshooting` (keep) |

**summary**

| | text |
|---|---|
| **Before** | *(placeholder)* |
| **After** | `Common problems with MCP setup, premium access, Motion Lab, and Converter.` |

**bodyHtml - Intro paragraph**

`Common problems with MCP setup, premium access, Motion Lab, and Converter. If your problem is not listed here, visit supericons.dev or email hello@supericons.dev.`

---

**bodyHtml - Section: MCP setup**

Section heading: `MCP setup`

Problem 1: `Server does not appear after adding`
Solution: `Type /mcp in Claude Code or the Codex TUI to list active servers. If Supericons is not listed, restart your coding agent session. Confirm your config file is in the correct location for your client and scope.`

Problem 2: `Wrong config file location`
Solution: `Check the table below for your client and scope.`

| Client | Scope | Path |
|---|---|---|
| Claude Code | User | `~/.claude.json` |
| Claude Code | Project | `.mcp.json` (project root) |
| Codex | User | `~/.codex/config.toml` |
| Codex | Project | `.codex/config.toml` (project root) |
| Cursor | Global | `~/.cursor/mcp.json` |
| Cursor | Project | `.cursor/mcp.json` (project root) |

Problem 3: `npx takes a long time on first run`
Solution: `The first time you run npx -y supericons-mcp, npm downloads the package. Subsequent starts are faster. This is normal behavior.`

---

**bodyHtml - Section: Premium access**

Section heading: `Premium access`

Problem 1: `Premium tools are not available`
Solution + numbered list:
1. `Your Supericons account has an active Pro subscription or a purchased collection.`
2. `You have generated an API key from the dashboard under API Keys.`
3. `SUPERICONS_API_KEY is present in the env block of your MCP server config, and your client was restarted after adding it.`

Problem 2: `API key is invalid or revoked`
Solution: `An invalid or revoked key returns an authentication error from all Pro MCP tools. Generate a new key from the dashboard, update your config, and restart your client session.`

Problem 3: `Premium icons appear but show an error`
Solution: `The icon may be in a collection your account does not have access to. Pro accounts can access all collections. Individual collection purchases only unlock the purchased collections.`

---

**bodyHtml - Section: Motion Lab**

Section heading: `Motion Lab`

Problem 1: `Motion Lab tools return an access error`
Solution: `Motion Lab tools are Pro-only. Confirm your API key is present in your config and your account has Pro or an animated collection.`

Problem 2: `Animated SVG does not animate in an <img> tag`
Solution: `CSS animations inside SVGs used as <img> sources work in most browsers, but some older browsers and webviews block scripting and animation in externally loaded SVGs. For guaranteed animation, paste the SVG inline instead.`

Problem 3: `The wrong preset is animating`
Solution: `Confirm the preset parameter matches a valid preset ID exactly. Preset IDs are case-sensitive and use camelCase for multi-word presets (for example: magneticIn, not magnetic-in or MagneticIn). Call list_motion_presets to see all valid IDs.`

---

**bodyHtml - Section: Converter**

Section heading: `Converter`

Problem 1: `PNG-to-SVG output is imprecise or has too many paths`
Solution: `The source image likely has gradients, shadows, or photographic detail that does not trace cleanly. Try a more specific traceClass, or switch qualityMode to compact to simplify the paths.`

Problem 2: `Which traceClass should I use?`
Solution: `Call inspect_converter_options for guided recommendations, or refer to the traceClass reference at Settings.` (link to `docs-converter-settings`)

Problem 3: `SVG-to-PNG output is wrong size`
Solution: `The targetWidth sets the output pixel width. Height scales proportionally from the SVG viewBox. If the output is smaller than expected, increase targetWidth.`

---

**bodyHtml - Bottom callout**

`If your problem is not listed here, visit supericons.dev or email hello@supericons.dev.`

---

## Section 10: MCP Setup Pages - Sanity Check

The MCP setup pages (Claude Code, Codex, Cursor) are complete and verified. The sanity check below confirms they are consistent and correct.

### Claude Code sanity check

| Element | Status | Note |
|---|---|---|
| Scope callout | Not present | Correct - Claude Code supports both CLI and config. No scope limitation to disclose. |
| CLI command | Verified | `claude mcp add supericons -- npx -y supericons-mcp` (macOS/Linux) |
| Windows CLI command | Verified | `claude mcp add supericons -- cmd /c npx -y supericons-mcp` |
| Config file user scope | Verified | `~/.claude.json` |
| Config file project scope | Verified | `.mcp.json` in project root |
| Verify command | Correct | `/mcp` inside active Claude Code session |
| verifiedNote field | Pending | Add: `Verified against official documentation as of April 10, 2026.` |
| 3 troubleshooting cards | Present | Correct count |
| Summary | Pending refinement | See Section 5 above |

### Codex sanity check

| Element | Status | Note |
|---|---|---|
| Scope callout | Present | Correct - CLI and IDE extension only. Web app does not support local MCP. |
| CLI command | Verified | `codex mcp add supericons -- npx -y supericons-mcp` |
| Config file user scope | Verified | `~/.codex/config.toml` |
| Config file project scope | Verified | `.codex/config.toml` in project root |
| Verify command | Correct | `/mcp` in Codex TUI |
| verifiedNote field | Pending | Add: `Verified against official documentation as of April 10, 2026.` |
| 3 troubleshooting cards | Present | Correct count |
| Summary | Pending refinement | See Section 5 above |

### Cursor sanity check

| Element | Status | Note |
|---|---|---|
| Scope note | Missing | Add: "Cursor uses a JSON config file. There is no CLI add command." |
| Config file global | Verified | `~/.cursor/mcp.json` |
| Config file project | Verified | `.cursor/mcp.json` in project root |
| Verify instruction | Needs improvement | Add restart instruction. See Section 7.4 above. |
| verifiedNote field | Pending | Add |
| 2 troubleshooting cards | Incomplete | Add 3rd card: npx first-run delay. See Section 7.5 above. |
| Summary | Pending refinement | See Section 5 above |

**Verdict:** All three pages are correct and verified. No factual errors. Three targeted improvements needed for Cursor. Verified timestamps needed on all three.
