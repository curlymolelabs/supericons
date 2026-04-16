# Motion Lab "Recipe" Term Audit

Date: April 13, 2026
File audited: `docs-pages.js`
Issue: The word "recipe" in plain text copy is tonally mismatched for a premium motion design tool.
Recommendation: Replace prose instances with **"preset profile"**.
Scope: Text copy only. All `<code>` tag references, tool names, and JSON field names are untouched.

---

## Replacement Rule

| Context | Keep or Change | Replacement |
|---|---|---|
| Inside `<code>` tags (e.g. `get_motion_recipe`) | Keep | No change |
| HTML element IDs and CSS class names | Keep | No change |
| Plain text prose describing the tool or its output | Change | "preset profile" |
| "recipe generation" as a process description | Change | "preset rendering" |

---

## Full Instance List

19 total hits. 9 are code references. 10 are prose instances to change.

---

### Line 650 - MCP Tools Overview table

```
<code>get_motion_recipe</code> | Get a plain-language description of any preset
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 752 - MCP Motion Tools, "Not sure which preset to use?" callout

```
then <code>get_motion_recipe</code> to understand what a specific preset does before committing.
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 763 - HTML section ID

```
id="motion-tools-recipe"
```

**Type:** CODE (HTML attribute)
**Action:** Leave untouched.

---

### Line 764 - Section heading

```
<h2><code>get_motion_recipe</code></h2>
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 786 - `get_motion_recipe` Returns description

**Before:**
```
A recipe object with <code>preset_id</code>, <code>preset</code>, <code>group</code>...
```

**After:**
```
A preset profile with <code>preset_id</code>, <code>preset</code>, <code>group</code>...
```

**Type:** PROSE
**Action:** Change "A recipe object" to "A preset profile".

---

### Line 815 - `animate_icon` Returns description

**Before:**
```
<code>recipe</code> (the motion recipe object)
```

**After:**
```
<code>recipe</code> (the preset profile)
```

**Type:** MIXED - the `<code>recipe</code>` field name stays; only the parenthetical label changes.
**Action:** Change "(the motion recipe object)" to "(the preset profile)".

---

### Line 824 - `export_motion_css` Returns description

**Before:**
```
<code>preset</code> (the motion recipe)
```

**After:**
```
<code>preset</code> (the preset profile)
```

**Type:** MIXED - field name stays; parenthetical label changes.
**Action:** Change "(the motion recipe)" to "(the preset profile)".

---

### Line 835 - `export_animated_svg` Returns description

**Before:**
```
<code>preset</code> (the motion recipe)
```

**After:**
```
<code>preset</code> (the preset profile)
```

**Type:** MIXED - field name stays; parenthetical label changes.
**Action:** Change "(the motion recipe)" to "(the preset profile)".

---

### Line 849 - "When to use this vs export_motion_css" table

```
<code>get_motion_recipe</code>
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 1022 - Introduction page, MCP mental model section

**Before:**
```
Premium recipe generation, CSS rendering, and animated SVG rendering resolve through hosted
Supericons functions using a short-lived session token.
```

**After:**
```
Premium preset rendering, CSS generation, and animated SVG output resolve through hosted
Supericons functions using a short-lived session token.
```

**Type:** PROSE
**Action:** "Recipe generation" implies generating a recipe rather than rendering output from a preset. Replace with "preset rendering" which is accurate. Reorder the other two items to "CSS generation" and "animated SVG output" for consistency.

---

### Line 1274 - MCP Workflow page summary

**Before:**
```
Inspect presets, compare recipes, choose an output type, and export with full context before committing.
```

**After:**
```
Inspect presets, compare preset profiles, choose an output type, and export with full context before committing.
```

**Type:** PROSE
**Action:** Change "recipes" to "preset profiles".

---

### Line 1277 - MCP Workflow body intro paragraph

**Before:**
```
Motion Lab through MCP is a complete icon animation workflow inside your coding agent:
inspect presets, compare recipes, export CSS for inline SVG, get a self-contained animated SVG,
or generate both in one call.
```

**After:**
```
Motion Lab through MCP is a complete icon animation workflow inside your coding agent:
inspect presets, compare preset profiles, export CSS for inline SVG, get a self-contained animated SVG,
or generate both in one call.
```

**Type:** PROSE
**Action:** Change "recipes" to "preset profiles".

---

### Line 1281 - MCP Workflow, core mental model section

**Before:**
```
Premium recipe generation, CSS render, animated SVG render, and bundled <code>animate_icon</code>
output resolve through hosted Supericons functions using a short-lived session token.
```

**After:**
```
Premium preset rendering, CSS render, animated SVG render, and bundled <code>animate_icon</code>
output resolve through hosted Supericons functions using a short-lived session token.
```

**Type:** PROSE
**Action:** Change "recipe generation" to "preset rendering". Same rationale as line 1022.

---

### Line 1288 - MCP Workflow, recommended tool order list

```
Call <code>get_motion_recipe</code> on one or more candidates before committing.
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 1306 - MCP Workflow, "when to use each tool" table

```
<code>get_motion_recipe</code> | understand how a preset behaves before exporting
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 1309 - MCP Workflow, "when to use each tool" table, `animate_icon` row

**Before:**
```
get recipe, CSS, and animated SVG together in one call
```

**After:**
```
get the preset profile, CSS, and animated SVG in one call
```

**Type:** PROSE (table cell description, no `<code>` tag)
**Action:** Change "get recipe" to "get the preset profile". Also remove the redundant "together".

---

### Line 1317 - MCP Workflow, human vs agent section

```
Then use <code>get_motion_recipe</code> to confirm the fit before exporting.
```

**Type:** CODE (tool name in `<code>` tag)
**Action:** Leave untouched.

---

### Line 1318 - MCP Workflow, AI agents paragraph

**Before:**
```
<strong>AI agents</strong> should inspect presets, narrow candidates by UI context, compare recipes,
justify the chosen preset, and only then export.
```

**After:**
```
<strong>AI agents</strong> should inspect presets, narrow candidates by UI context, compare preset profiles,
justify the chosen preset, and only then export.
```

**Type:** PROSE
**Action:** Change "recipes" to "preset profiles".

---

### Line 1385 - Client Setup, verification section

**Before:**
```
<code>get_motion_recipe</code> returns a recipe object.
```

**After:**
```
<code>get_motion_recipe</code> returns a preset profile.
```

**Type:** MIXED - tool name in `<code>` stays; "a recipe object" is prose.
**Action:** Change "a recipe object" to "a preset profile".

---

## Change Summary

| Lines | Change |
|---|---|
| 786 | "A recipe object" → "A preset profile" |
| 815 | "(the motion recipe object)" → "(the preset profile)" |
| 824 | "(the motion recipe)" → "(the preset profile)" |
| 835 | "(the motion recipe)" → "(the preset profile)" |
| 1022 | "Premium recipe generation" → "Premium preset rendering" |
| 1274 | "compare recipes" → "compare preset profiles" |
| 1277 | "compare recipes" → "compare preset profiles" |
| 1281 | "Premium recipe generation" → "Premium preset rendering" |
| 1309 | "get recipe, CSS, and animated SVG together" → "get the preset profile, CSS, and animated SVG" |
| 1318 | "compare recipes" → "compare preset profiles" |
| 1385 | "a recipe object" → "a preset profile" |

**Total prose changes: 11 substitutions across 10 lines.**
**Code references left untouched: 9 instances.**
