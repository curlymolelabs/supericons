# Docs Page Copy Audit - Pass 2

Scope: `docs/plans/docs-ui-ux-mockup.html`
Purpose: Second-pass copywriting and UX audit covering six specific issues raised, plus a full-scan sweep for additional gaps.
No code or docs were changed.

---

## Issue 1: "Current truth" sidebar heading

### Problem
"Current truth" is internal engineering language borrowed from a Socratic audit methodology. To an external developer arriving at this docs page for the first time, it reads as unexplained jargon. "Truth" in copywriting usually implies contrast with something false, which creates unnecessary cognitive friction.

### Discussion
The intent of the callout is to give developers a reliable, at-a-glance snapshot of what the MCP server actually supports right now, as opposed to what might be announced or planned. That is a useful function. The title just needs to communicate that intent in plain English.

### Options considered

| Option | Assessment |
|---|---|
| "What's live now" | Clear, friendly, evergreen. Works well. |
| "Live status" | Concise, familiar from status page conventions. |
| "Available tools" | Accurate but generic. Overlaps with the MCP tools section. |
| "MCP snapshot" | Technical but precise. Likely fine for a developer audience. |
| "Right now" | Too casual. |
| "Current status" | Already used as a card title in the Workflow Tools section. Avoid the collision. |

### Recommendation
**"What's live"** - Short, developer-friendly, implies currency without sounding like engineering jargon, and avoids conflicting with the adjacent "Current status" card heading.

---

## Issue 2: Workflow Tools introductory paragraph (factual inaccuracy)

### Problem (line 642 in mockup)
> "Supericons workflow tools (Motion Lab and Converter) are available in the browser for all users and through MCP for Pro subscribers."

This is misleading. Motion Lab and Converter **load** for all users in the browser, but **exports are gated by Pro**. A free user who opens Motion Lab and clicks export will hit a paywall. The sentence implies full feature access for all, which is factually incorrect and will confuse or frustrate free users who expect full export capability.

### Proposed correction
> "Motion Lab and Converter are available to browse in the browser for all users. Exports (CSS, animated SVG, PNG, SVG tracing) require a Pro subscription, both in the browser and through MCP."

This version distinguishes between browse access and export access, which is the real access model. The parenthetical gives free users a quick heads-up on exactly what is gated before they invest time in the tool.

### Secondary issue
The sentence "The MCP tools provide the same capabilities in coding-agent-friendly tool calls" is also slightly inaccurate. The MCP tools are Pro-only from the start, so they do not provide "the same capabilities" as the browser (which has a free browse tier). Revised:

> "Pro subscribers can access Motion Lab and Converter through MCP, with the same export capabilities available in the browser."

---

## Issue 3: "Premium features unlock automatically when you link an account" (hero, line 466)

### Problem
"Link an account" implies an OAuth or social login flow - something a user actively clicks to connect (like "Link your Google account"). In Supericons, you do not link an account. You generate an API key from your account, then paste that key into your MCP client config. The mechanism is passive inference: the server reads the key, looks up your account, and grants access based on what that account owns.

"Unlock automatically" is also slightly over-promising. The unlock happens at runtime when the MCP server validates the key, not at the moment of pasting it.

### Discussion
The right mental model to convey: the API key is a credential, not a link. The user does two steps: (1) get a key, (2) add it to their config. Access then follows from those two steps.

### Options considered

| Option | Assessment |
|---|---|
| "Base setup takes under a minute. Premium icons and workflow tools are available when you add a Supericons API key linked to your Pro account or purchased collection." | Accurate, specific, and tells the user the action (add a key) rather than the effect (unlock). |
| "Add your Supericons API key to unlock premium collections and Pro workflow tools." | Active, imperative. Good for CTAs, slightly short for a one-liner hero description. |
| "Premium access follows from your Pro subscription or collection purchase. Add an API key to your MCP config to activate it." | Two clear sentences. Accurate. Slightly long for a tagline. |

### Recommendation
> "Base setup takes under a minute. Add a Supericons API key to your MCP config to access any premium collections or Pro workflow tools tied to your account."

This version is accurate (the action is adding a key to the config), does not over-promise automatic behavior, and gives the user a concrete next step.

---

## Issue 4: Should these be called "tools", "commands", "functions", or something else?

### Discussion
In the MCP specification, the correct technical term for what Supericons exposes is **tool**. The MCP spec defines three primitives:
- **Tools** - callable functions the model can invoke (e.g., `search_icons`)
- **Resources** - data sources the model can read
- **Prompts** - reusable prompt templates

Supericons exposes `search_icons`, `get_icon`, `list_libraries`, etc. as **tools** in the MCP sense. This is correct and consistent with the spec.

"Commands" suggests a CLI. "Instructions" suggests a recipe or a workflow. "Prompts" is a different MCP primitive entirely. "Functions" is accurate from a programming perspective but foreign to non-engineers.

### Verdict on "MCP tools"
**Correct.** "MCP tools" is the right term. The entire MCP ecosystem (Claude Code docs, Cursor docs, OpenCode docs) uses "tools" consistently. Developers who are setting up MCP will already be familiar with this term.

### Issue with "Current MCP tools" as a heading
The word "Current" is unnecessary and weakens the heading. It implies the list might change at any moment, which creates mild anxiety. "Available MCP tools" or simply "MCP tools" is more confident and evergreen.

### Recommendation
Rename the section heading from **"Current MCP tools"** to **"MCP tools"**.

Also note: the sidebar TOC entry already reads "MCP tools" (without "Current"), which creates an inconsistency between the TOC label and the section heading. This inconsistency should be resolved in favor of the shorter label.

---

## Issue 5: Why "Recipes"? What does this term mean?

### Discussion
"Recipes" is a widely used developer documentation convention borrowed from cooking. The metaphor works because:
- A recipe has ingredients (tools, prompts, context)
- A recipe has steps in order
- A recipe produces a predictable output
- You can follow it without fully understanding why each step works

Examples of developer documentation that uses "recipe" in this sense: Vue.js Cookbook, React patterns, Tailwind CSS recipes, Stripe recipes, GitHub Actions recipe library.

In the docs page, the section currently called "Recipes and prompts" contains copy-pasteable prompt templates for specific tasks. These are indeed "recipes" in the developer sense: ready-to-use templates, each with a defined task and expected outcome.

### Is the term appropriate here?
Partially. The traditional recipe metaphor is strongest when the recipe shows multi-step workflows. The prompts here are single-shot pastes (copy, paste, done), which are less "recipe" and more "example prompt" or "starter prompt".

The hybrid heading "Recipes and prompts" also creates confusion: are these recipes or prompts? The content is prompts. Calling them "recipes and prompts" simultaneously implies they are two different things, but the section only contains prompts.

### Options considered

| Option | Assessment |
|---|---|
| "Recipes and prompts" (current) | Redundant conjunction. Conflates two things that are one thing here. |
| "Example prompts" | Accurate and plain. Could feel dry. |
| "Starter prompts" | Friendly, implies the user can build on them. Good. |
| "Quick-start prompts" | Slightly long but clear. |
| "Prompt examples" | Reads backward from natural language. Avoid. |
| "Recipes" alone | Acceptable if the section intro explains the metaphor. |

### Recommendation
Rename to **"Starter prompts"** and update the section intro to:  
> "Copy any of these prompts and paste them into your coding agent to get started."

This removes ambiguity, sets clear expectations, and uses language any developer or technical user will understand immediately without needing to know the recipe convention.

---

## Issue 6: Full-scan sweep - additional gaps and inconsistencies

### 6A: "stdio server" in client guides intro
**Location:** Client guides section (was present in the implementation plan HTML, not in the mockup for this section).
**Status:** The mockup text correctly says "The core configuration is the same..." without the "stdio server" phrasing. This was already fixed in the refined copy. No action needed.

---

### 6B: "Entitlements" meta card title (jargon)
**Location:** MCP tools section, muted meta card.
**Problem:** "Entitlements" is enterprise/legal product management language. Developers don't think in terms of "entitlements" - they think in terms of "what do I get?" or "what do I have access to?".
**Proposed title:** "Who gets what" or "Access levels" or simply "Access".
**Recommendation:** **"Access by plan"** - immediately scannable, tells the user the card explains access tiers without using legal jargon.

---

### 6C: "Workflow-tool gating" meta card title (internal language)
**Location:** MCP tools section, second muted meta card.
**Problem:** "Gating" is internal product management language (feature gating, paywall gating). It is not developer-facing language.
**Proposed title:** "Workflow tools require Pro" - this is a factual statement the user needs to know, phrased as a direct declarative rather than an abstract noun phrase.

---

### 6D: "8 MCP tools live" hero pill
**Location:** Hero pill badges.
**Problem:** "live" again implies a launch state, as if this was just shipped. Once the page is stable, this reads oddly. Also the number will need manual updating every time a new tool is added.
**Recommendation:** Either remove the count ("MCP tools included") or frame it without "live" ("8 MCP tools"). However the count-based pill is valuable for communicating scope, so if the number can be kept accurate: **"8 MCP tools"**.

---

### 6E: "Supericons MCP is live with 8 tools" (callout box)
**Location:** "What's live" / "Current truth" sidebar callout.
**Problem:** Same as 6D. "Is live" is a launch announcement, not evergreen documentation language. Nine months from now this reads stale.
**Proposed copy:**
> "Supericons MCP includes 8 tools: icon search, icon retrieval, library listing, Motion Lab preset browsing, motion CSS export, animated SVG export, SVG-to-PNG, and PNG-to-SVG tracing. Motion Lab and Converter exports are Pro-only."

This version is factual, complete, up-to-date in tone, and correctly names all 8 tools so the developer can cross-reference with the tools grid.

---

### 6F: "Back to app" in Useful links sidebar
**Location:** Sidebar "Useful links" section.
**Problem:** External developers arriving via a link or search engine do not know what "the app" is. "App" is ambiguous (is it a mobile app? a web app? a CLI?).
**Recommendation:** **"Open Supericons"** or **"Supericons app"** - adds specificity without much extra length.

---

### 6G: Nav shows only 3 client links (selective representation)
**Location:** Top navigation bar.
**Problem:** The nav links Claude Code, Codex, and Cursor - but the Client guides section also covers OpenCode, Cline, Copilot agent, and Windsurf. A developer using Windsurf who opens the Docs page will not see their client in the nav and may assume they are not supported.
**Options:** (a) Add all 7 clients to the nav (likely too crowded), (b) replace the three client links with a single "Client guides" nav link that jumps to the section, (c) keep as-is with a note that all 7 are in the client guides section.
**Recommendation:** Replace the three individual nav links with one **"Client guides"** link pointing to `#docs-guides`. This is more scalable as clients are added and removes the false impression of selective support.

---

### 6H: "Copy a prompt and paste it directly into your MCP-capable coding agent" (recipes intro)
**Location:** Recipes / Starter prompts section intro.
**Problem:** "MCP-capable coding agent" is a five-word technical qualifier that may confuse users who are still orienting themselves. If they are reading this page, they are already setting up MCP. The qualifier is redundant.
**Simplified:** "Copy any prompt and paste it into your coding agent to get started."

---

### 6I: "Tool discovery" recipe card title
**Location:** Fourth recipe card.
**Problem:** "Tool discovery" is abstract. What is the user actually doing? They are asking the agent to list available tools. The card title should describe the use case, not the mechanism.
**Recommendation:** **"Explore what's available"** or **"See what you can do"** - more action-oriented and inviting for a first-time user.

---

### 6J: No introductory sentence linking the hero to the Quickstart flow
**Location:** Below the hero, above the Quickstart section.
**Problem:** The hero ends with pill badges and CTA buttons. The user then scrolls into a code block with no bridge sentence. The page jumps from marketing framing ("everything you need...") to technical config without a transition.
**Recommendation:** Add a one-line bridge before the first code block inside the Quickstart section:
> "Paste the snippet below into your client's MCP config file. If you are not sure where to find it, pick your client from the guides below."

---

### Summary table

| ID | Element | Current | Problem category | Recommendation |
|----|---------|---------|-----------------|----------------|
| 1 | Sidebar heading | "Current truth" | Jargon | "What's live" |
| 2 | Workflow Tools intro | "available...for all users" | Factual inaccuracy | Distinguish browse vs export access |
| 3 | Hero description | "link an account...unlock automatically" | Inaccurate mechanism | "Add a Supericons API key to your MCP config" |
| 4 | Section heading | "Current MCP tools" | Redundant word | "MCP tools" |
| 5 | Section name/intro | "Recipes and prompts" | Mixed metaphor | "Starter prompts" |
| 6A | Client guides intro | stdio server jargon | Already fixed | No action |
| 6B | Meta card title | "Entitlements" | Jargon | "Access by plan" |
| 6C | Meta card title | "Workflow-tool gating" | Jargon | "Workflow tools require Pro" |
| 6D | Hero pill | "8 MCP tools live" | Launch-state language | "8 MCP tools" |
| 6E | Callout body | "is live with 8 tools" | Launch-state language | Rewrite as evergreen factual statement |
| 6F | Sidebar link | "Back to app" | Ambiguous | "Open Supericons" |
| 6G | Nav bar | 3 client links | Selective representation | Single "Client guides" nav link |
| 6H | Starter prompts intro | "MCP-capable coding agent" | Redundant qualifier | Remove qualifier |
| 6I | Recipe card title | "Tool discovery" | Abstract | "Explore what's available" |
| 6J | Quickstart section | No bridge sentence | Missing transition | Add one-line bridge before first code block |
