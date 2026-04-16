# Motion Lab Copy Audit: Full Section Rewrite Proposals

Date: April 13, 2026
Auditor: Antigravity
Scope: All seven Motion Lab pages - summaries, body intros, headings, and key paragraphs
Standard: Lead with product value. Access model is secondary. Confident, specific, no hedging.

---

## Core Problem Across the Section

The Motion Lab pages consistently put the access model ("requires a Pro account or...") before the product description. This is backwards. Premium copy should lead with what the thing *does*, earn the reader's interest, then state what it costs. The current pattern reads like a warning label on a product you have not yet decided you want.

Secondary issue: summaries (the subtitle shown under the page title) that describe the access model or the page structure instead of the product value. A summary should answer "why would I read this page" - not "what category is this."

---

## Page 1: Introduction

### Summary (subtitle under page title)

**Before:**
```
Try presets and preview animations without a Pro account. Export as CSS or animated SVG with a Pro account or a premium collection purchase.
```

**Problems:**
- Opens with access restrictions before the reader knows what Motion Lab is
- Both sentences are about access, neither is about the product
- "Try presets and preview animations" undersells the product as a toy feature
- The second sentence is an entitlement statement used as a value proposition

**After:**
```
A preset-driven animation workspace for Supericons icons. Pick a preset, set the trigger and timing, and export production-ready CSS or animated SVG. No JavaScript required.
```

Access model moves to the body where it belongs.

---

### Body: Opening paragraph (first paragraph under the intro section)

**Before:**
```
Motion Lab is a preset-driven animation workspace for Supericons icons. Choose a preset, adjust the trigger, timing, and intensity, then export the result as a Motion Lab CSS file or a standalone animated SVG. Both outputs are production-ready and require no JavaScript.
```

**Problems:**
- "Motion Lab is a preset-driven animation workspace for Supericons icons" - this was the summary, it should not reopen the body
- Three sentences that are all descriptive definitions, no forward momentum
- "adjust the trigger, timing, and intensity" lists the controls instead of the outcome

**After:**
```
Motion Lab turns icon browsing into a complete animation workflow. Choose any preset from the panel, set the trigger, timing, and intensity, then export the result as production-ready CSS or a self-contained animated SVG. Both formats are drop-in ready. Neither requires JavaScript.
```

---

### Body: Access section heading and content

**Before:**
```
<h2>How to access Motion Lab</h2>

<li><strong>In the browser</strong>: Open the Supericons Motion Lab without a Pro account.
Select any icon to browse the preset panel and preview animations in real time.
Exporting your animation as CSS or SVG requires a Pro account or a premium collection purchase.</li>
<li><strong>Through MCP</strong>: Your coding agent can call Motion Lab tools directly.
See the Motion Lab MCP tools reference.</li>

<Browser:> Open and preview without a Pro account. Exporting CSS or SVG output requires a Pro account or a premium collection purchase.
<MCP:> All Motion Lab tools require a Pro account or a premium collection purchase, plus a valid API key.
```

**Problems:**
- The bullet list and the two bold paragraphs below it say the same thing twice
- The heading "How to access Motion Lab" prioritises access over capability
- "Open the Supericons Motion Lab without a Pro account" - opens a feature description with a restriction
- The two bold paragraphs are exact repetitions of the bullets and should be deleted

**After:**
```
<h2>Two ways to use Motion Lab</h2>

<li><strong>In the browser</strong>: Open Motion Lab directly and browse all presets with any icon.
Preview animations in real time. Exporting CSS or SVG requires a Pro account or a premium collection purchase.</li>
<li><strong>Through MCP</strong>: Your agent calls Motion Lab tools directly.
All tools require a Pro account or a premium collection purchase plus a valid API key. See the Motion Lab MCP tools reference.</li>
```

Delete both bold paragraph restatements below the list.

---

### Body: "How Motion Lab works through MCP" section

**Before:**
```
Motion Lab through MCP is intentionally split into two layers. The local MCP process exposes preset discovery and tool orchestration. The premium recipe and render work runs on Supericons hosted functions behind short-lived session tokens.

That split is intentional. It keeps the local package lightweight for discovery while moving premium rendering logic behind the hosted path.
```

**Problems:**
- "is intentionally split" then "That split is intentional" - identical claim stated twice in two consecutive sentences across two paragraphs
- Second paragraph adds nothing beyond restating the sentence above it

**After:**
```
Motion Lab through MCP runs on two layers by design. The local process handles preset discovery and request orchestration. Premium recipe generation, CSS rendering, and animated SVG rendering resolve through hosted Supericons functions using a short-lived session token. The local package stays lightweight; premium rendering stays behind the hosted path.
```

---

### Body: "What Motion Lab produces" section

**Before:**
```
Motion Lab generates two types of output from any preset:

<strong>Motion Lab CSS</strong> - A stylesheet with <code>@keyframes</code> and animation rules.
Replace the placeholder token <code>{{ICON_SELECTOR}}</code> with the selector for your inline SVG,
then keep the SVG and animation in separate files.

<strong>Animated SVG</strong> - A self-contained SVG file with the animation embedded in a
<code><style></code> block inside the SVG. Drop it anywhere without external CSS.
```

**Problems:**
- "Motion Lab CSS" is named before explaining what CSS does in this context
- "Drop it anywhere" is casual in an unexpected way after precise technical descriptions
- Both descriptions are good but the labels can be stronger

**After:**
```
Motion Lab produces two output types:

<strong>Motion Lab CSS</strong>: A stylesheet with <code>@keyframes</code> and animation rules.
Keep your SVG inline in markup and link the CSS separately.
Replace <code>{{ICON_SELECTOR}}</code> in the returned CSS with your SVG's selector.

<strong>Animated SVG</strong>: A complete SVG with the animation embedded inside a
<code><style></code> block. No external stylesheet needed. Use it as an <code><img></code> reference or paste it inline.
```

---

## Page 2: Presets

### Summary

**Before:**
```
Supericons Motion Lab includes ${motionLabPresetCount} presets across ${motionLabGroupCount} live groups: Motion, Entrances, Exits, and Special. Every preset supports loop, hover, and click triggers, with duration from 100ms to 4000ms and intensity from 25% to 200%.
```

**Problems:**
- "live groups" is an internal QA term, not a user term
- Dense data list as a summary; a summary should tell you why to open the page
- "Every preset supports loop, hover, and click triggers" is good - but it is buried at the end

**After:**
```
Full preset reference for Motion Lab. ${motionLabPresetCount} presets across ${motionLabGroupCount} groups: Motion, Entrances, Exits, and Special. Every preset works with loop, hover, and click triggers. Duration: 100ms to 4000ms. Intensity: 25% to 200%.
```

---

### Body: Opening paragraph

**Before:**
```
This reference reflects the same Motion Lab preset set used in the browser and exposed through MCP. Use it when you want a complete view of the preset names, groups, and baseline descriptions in one place.
```

**Problems:**
- "This reference reflects the same...set used in the browser" - users know the docs match the product
- "Use it when you want a complete view" - says use the page to see the page
- Both sentences are padding

**After:**
```
Each row includes the preset ID to use as the <code>preset</code> parameter in any Motion Lab tool call. Use the Group column to narrow candidates by intent before committing to an export.
```

---

### Body: "Preset groups explained" heading

**Before:**
```
<h2>Preset groups explained</h2>
<th>How to use it</th>
```

**After:**
```
<h2>Preset groups</h2>
<th>When to reach for it</th>
```

The column header "How to use it" sounds like usage instructions. "When to reach for it" matches the intent-first framing the copy uses elsewhere.

---

## Page 3: Trigger Types

### Summary

**Before:**
```
Every Motion Lab preset supports three trigger types. The trigger controls when the animation starts and how many times it plays. Choose based on the context where the icon appears.
```

**Problems:**
- "Choose based on the context where the icon appears" - vague; context tells them to choose based on context
- Three short sentences; could be tighter

**After:**
```
Three trigger types control when a Motion Lab animation starts and how many times it plays. The right choice depends on how the icon is used in the interface: always-visible, interactive, or state-driven.
```

---

### Body: hover trigger

**Before:**
```
The animation plays while the user hovers the icon element. It starts on <code>mouseenter</code> and stops naturally when the animation completes after <code>mouseleave</code>.
```

**Problems:**
- Opens with implementation detail (`mouseenter`) before establishing the use case
- The technical detail is accurate but secondary

**After:**
```
The animation plays while the user hovers the icon. It starts when the pointer enters and stops naturally after the animation completes when the pointer leaves. Internally this is CSS <code>:hover</code>, driven by <code>mouseenter</code> and <code>mouseleave</code> events.
```

---

## Page 4: Exports

### Summary

**Before:**
```
Motion Lab produces two export formats: Motion Lab CSS and animated SVG. Both are production-ready. Exporting requires a Pro account or a premium collection purchase. Choose the format based on how you manage your SVG and animation files.
```

**Problems:**
- Four choppy standalone sentences in a row
- "Both are production-ready" is a claim that needs a beat of proof to earn it - or it should move to the body
- The access gate interrupts the flow between format description and format choice guidance

**After:**
```
Two production-ready formats: Motion Lab CSS for inline SVG with a separate stylesheet, and animated SVG for a self-contained drop-in file. Both require a Pro account or a premium collection purchase. The right choice depends on how you integrate SVG into your project.
```

---

### Body: "Selector fields you will see in MCP responses" heading and bullets

**Before:**
```
<h3>Selector fields you will see in MCP responses</h3>

<li><code>selector_mode: "placeholder"</code> means the CSS still contains <code>{{ICON_SELECTOR}}</code> and needs one replacement step.</li>
<li><code>selector_token</code> gives you the exact placeholder token returned in the CSS.</li>
<li><code>selector_instructions</code> gives a plain-language explanation of what to replace and what kind of selector to use.</li>
<li><code>selector_mode: "literal"</code> means the CSS already contains your real selector and can be used directly.</li>
```

**Problems:**
- "you will see" implies upcoming feature; these fields exist now
- The list has no consistent structure: some start with `code`, some start with "gives you", some start with "means"
- `selector_mode: "literal"` is fourth but logically pairs with `"placeholder"` as the two possible values of the same field
- "still contains" implies a previous state that did not have the placeholder

**After:**
```
<h3>Selector fields in MCP responses</h3>

<li><code>selector_mode: "placeholder"</code>: The CSS contains <code>{{ICON_SELECTOR}}</code>. You must replace it with your SVG's actual CSS selector before applying the stylesheet.</li>
<li><code>selector_mode: "literal"</code>: The CSS already contains your selector. Use it directly.</li>
<li><code>selector_token</code>: The exact placeholder string present in the returned CSS string. Use it to locate and replace programmatically.</li>
<li><code>selector_instructions</code>: Plain-language guidance on what selector format to substitute. Useful when an agent or script is doing the replacement step.</li>
```

---

### Body: Compatibility note

**Before:**
```
Self-contained animated SVGs work in most modern browsers. When used as an <code><img></code> source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events as normal.
```

**Problems:**
- "most modern browsers" is a hedge that lacks specificity and mildly undermines confidence
- "as normal" is a soft filler ending

**After:**
```
Self-contained animated SVGs work in all current major browsers. When referenced as an <code><img></code> source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events as expected.
```

---

## Page 5: MCP Workflow

### Summary

**Before:**
```
The practical human-and-agent workflow for using Motion Lab through MCP without trial-and-error.
```

**Problems:**
- "without trial-and-error" frames the tool as something that requires avoiding mistakes rather than something that gives clear workflow guidance
- Passive title; does not tell you what the workflow achieves

**After:**
```
A step-by-step workflow for using Motion Lab through MCP. Inspect presets, compare recipes, choose an output type, and export with full context before committing.
```

---

### Body: Opening paragraph

**Before:**
```
Motion Lab through MCP gives you a practical icon-motion workflow inside your coding agent. Use it when you want to inspect presets, compare motion recipes, export portable CSS for inline SVG, export a self-contained animated SVG, or generate both outputs together in one call.
```

**Problems:**
- "gives you a practical icon-motion workflow" is generic product description, not an opener
- The list of use cases in the second sentence is useful but grammatically front-heavy

**After:**
```
Motion Lab through MCP is a complete icon animation workflow inside your coding agent: inspect presets, compare recipes, export CSS for inline SVG, get a standalone animated SVG, or generate both in one call.
```

---

### Body: "Humans and agents should use the flow differently" heading

**Before:**
```
<h2>Humans and agents should use the flow differently</h2>
```

**Problems:**
- Verbose modal construction ("should use the flow differently")
- Not parallel with other headings which are noun phrases or short command phrases

**After:**
```
<h2>Human vs agent workflow</h2>
```

---

### Body: "Sometimes the right answer is no motion" callout

**Before:**
```
Accessibility-sensitive settings, calm admin surfaces, and trust-critical flows may be better with no animation. If motion is still required, pick the most restrained option and explain why.
```

**Problems:**
- "may be better" is hedging; the reader needs a clear signal, not a "maybe"
- "pick the most restrained option" is an instruction without rationale

**After:**
```
Accessibility-sensitive surfaces, calm admin panels, and trust-critical flows are usually better with no motion at all. If motion is required, choose the most restrained option available and be able to explain why it does not compete with the user's focus.
```

---

## Page 6: Client Setup

### Summary

**Before:**
```
Set up Motion Lab through MCP in real clients, add your API key, and confirm the hosted premium path is connected.
```

**Problems:**
- "real clients" implies there are non-real clients, which is confusing
- Lists three things but the most important one (confirming the hosted path) is last

**After:**
```
Connect Motion Lab to your MCP client, add your API key, and verify the hosted premium path is live. Includes setup examples for Cursor and Claude Desktop.
```

---

### Body: "What you need" list capitalisation and entitlement phrasing

**Before:**
```
<li>Node.js installed</li>
<li>a Supericons API key linked to a Pro account or eligible premium entitlement</li>
<li>an MCP client such as Cursor or Claude Desktop</li>
<li>permission to add an MCP server config in that client</li>
```

**Problems:**
- Three items start lowercase; inconsistent within the list
- "eligible premium entitlement" does not match the standard "premium collection purchase" phrasing used on every other page

**After:**
```
<li>Node.js 18 or later</li>
<li>A Supericons API key linked to a Pro account or a premium collection purchase</li>
<li>An MCP client such as Cursor or Claude Desktop</li>
<li>Permission to add an MCP server in that client's config</li>
```

---

### Body: Recommended server command section

**Before:**
```
For normal usage, run the published MCP package instead of pointing users at a local filesystem path:
```

**Problems:**
- "pointing users at a local filesystem path" is odd phrasing from a page that IS for users
- "For normal usage" is weaker than simply stating the instruction directly

**After:**
```
Use the published MCP package. Set this as your <code>command</code> value in the MCP server config:
```

---

### Body: Claude Desktop section

**Before:**
```
<h2>Claude Desktop setup example</h2>
<p>Use the same server block in your Claude Desktop MCP config:</p>
[identical JSON to Cursor section]
```

**Problems:**
- The section looks identical to Cursor with no explanation of why they look the same
- Does not name the actual Claude Desktop config file that users need to locate

**After:**
```
<h2>Claude Desktop setup example</h2>
<p>Claude Desktop uses the same JSON config format as Cursor. Open your Claude Desktop MCP settings file (<code>claude_desktop_config.json</code>), add the same server block, and replace the API key value:</p>
[same JSON]
```

---

### Body: "Your first successful Motion Lab call" verification section

**Before:**
```
After restarting the client, confirm these tools are visible: [list]
Then try this sequence: [numbered steps]
If this works, the local MCP server and hosted premium Motion Lab path are both connected.
```

**Problems:**
- Success signal is at the bottom; users do not know what they are working toward until after running the steps
- "If this works" introduces doubt before the user has even tried

**After:**
```
<p><strong>What success looks like:</strong> <code>list_motion_presets</code> returns a preset array and <code>get_motion_recipe</code> returns a recipe object. That confirms the local MCP server and the hosted premium path are both live.</p>

<p>After restarting your client, confirm these tools appear: [list]
Then run this sequence:</p>
[numbered steps as-is]
```

---

## Page 7: Use Cases

### Summary

**Before:**
```
Use Motion Lab with more confidence by mapping presets to product context instead of guessing from animation names alone.
```

**Problems:**
- "guessing" implies the tool is normally opaque; that is not a compliment to the product
- "with more confidence" is a soft motivator

**After:**
```
Match presets to product context, not animation names. Each use case maps UI intent to recommended presets and what to avoid.
```

---

### Body: Opening paragraph

**Before:**
```
Start with UI intent, not the animation name. The safest Motion Lab choice is the one that matches the product moment, the tone of the screen, and the amount of motion the user can comfortably tolerate.
```

**Problems:**
- Good idea, but "the amount of motion the user can comfortably tolerate" is a long way to say "what the user can handle"
- "The safest Motion Lab choice" makes safety the primary criterion, which slightly undermines the creativity angle

**After:**
```
Start with the UI context, not the animation name. The best Motion Lab preset is the one that matches the moment in the product, the screen's tone, and the motion budget appropriate for that user.
```

---

### Body: "Restraint is part of good motion design" callout

**Before:**
```
Strong Motion Lab usage includes recommending no motion when animation would weaken clarity, trust, accessibility, or calm. If motion is still required, choose the safest restrained option and explain why.
```

**Problems:**
- "Strong Motion Lab usage includes recommending no motion" is a slightly awkward construction
- "the safest restrained option" - the word "safest" appears again with "restrained" which doubles the cautious framing
- "explain why" is abrupt as a closing sentence

**After:**
```
The strongest Motion Lab decisions include recommending no animation at all when it would weaken clarity, trust, or calm. If motion is still needed, choose the most subtle option and be ready to explain why it earns its place.
```

---

## Summary of All Changes

| Priority | Page | Section | Change |
|---|---|---|---|
| P1 | Introduction | Summary | Replace access-gate opener with product description |
| P1 | Introduction | Body intro | Remove restatement of summary; open with product momentum |
| P1 | Introduction | Access section | Remove duplicate bold paragraph restatements |
| P1 | Introduction | MCP split section | Remove "That split is intentional" duplicate sentence |
| P1 | Client Setup | Prerequisites list | Fix casing and entitlement phrasing |
| P1 | Client Setup | Claude Desktop section | Add config file name; explain why it matches Cursor |
| P1 | Client Setup | Verification section | Move success signal above the steps |
| P2 | Presets | Summary | Remove "live groups"; make data more scannable |
| P2 | Presets | Body intro | Replace filler with what the page actually gives the user |
| P2 | Exports | Summary | Consolidate four choppy sentences; reorder for flow |
| P2 | Exports | selector_mode bullets | Make list parallel; group placeholder/literal as a pair |
| P2 | Client Setup | Server command | Remove "pointing users at" phrasing |
| P3 | Triggers | Summary | Sharpen last sentence from vague to specific |
| P3 | Triggers | hover section | Move mouseenter/mouseleave detail after use case |
| P3 | MCP Workflow | Summary | Lead with what the workflow achieves, not what it avoids |
| P3 | MCP Workflow | Body intro | Tighter single sentence with same information |
| P3 | MCP Workflow | Heading | "Human vs agent workflow" |
| P3 | MCP Workflow | No-motion callout | Remove hedge "may be better"; sharpen instruction |
| P3 | Use Cases | Summary | Lead with action; remove "guessing" framing |
| P3 | Use Cases | Body intro | Tighten "comfortably tolerate" phrasing |
| P3 | Use Cases | Restraint callout | Reduce double-cautious phrasing |
| P4 | Exports | Compatibility note | "most modern" to "all current major" |
| P4 | Presets | Group table column | "How to use it" to "When to reach for it" |
| P4 | Exports | Selector heading | "will see" to present tense |
