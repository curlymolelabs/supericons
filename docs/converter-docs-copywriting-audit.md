# Audit: Converter Docs Copywriting and Plan Update

Date: 2026-04-13
Auditor: Antigravity
Scope: Copywriting quality, jargon, clarity, and structure across the four new converter docs pages and the updated enhancement plan. No code changes made.
Files reviewed:
- `docs-pages.js` lines 1472-1696 (four converter product pages)
- `docs/plans/converter-mcp-agent-library-enhancement-plan.md`

---

## 1. Implementation Verification

All four pages are confirmed non-placeholder. `renderPlaceholderBody` is no longer used for
any converter page. The `npm run build` gate passed. The plan status is accurately updated.
The single-color-mark `qualityMode` conflict (QF-8 from prior audit) is resolved: all starting
combinations now use `exact`.

No functional regressions found. The docs render accurately against the live tool surface.

---

## 2. Per-Page Copywriting Audit

### 2a. `docs-converter-guide` (Introduction)

**Overall: Strong. Minor improvements possible.**

What works well:
- The two-direction table (line 1493-1494) is immediately useful and scannable.
- "Preview first, then decide if the output earns a download" callout (line 1515) is a
  memorable framing that sets honest expectations without sounding negative.
- The browser vs MCP distinction (lines 1510-1512) is clear and actionable.

Issues and proposed improvements:

**CP-1 (Low) -- Opening sentence is abstract.**
Current: "Converter handles two practical jobs: tracing flat PNG artwork into SVG, and
rendering SVG files into PNG at the size you actually need."

The phrase "rendering SVG files" may be unfamiliar to a reader who does not know SVG renders
are deterministic. Consider:
- Proposed: "Converter does two things: it traces flat PNG images into SVG files you can edit
  and scale, and it exports SVG artwork as PNG images at any size you choose."

**CP-2 (Low) -- "Strained, jagged, or overly dense" in the callout (line 1516).**
"Strained" is a subtle metaphor that some readers may not connect to visual output quality.
"Overly dense" is slightly technical (density of path nodes).
- Proposed: "If the preview already looks rough, choppy, or cluttered with noise, switching
  output format alone will not rescue it."

**CP-3 (Low) -- "Recovers the original vector source" is passive/abstract (line 1570).**
This appears on the PNG-to-SVG page, but applies to the guide too as a recurring pattern.
See CP-7 below for the same issue on the correct page.

---

### 2b. `docs-converter-png-to-svg` (PNG to SVG)

**Overall: Well-structured. A few phrases use internal-facing language.**

What works well:
- The "How to get the cleanest trace" section (lines 1531-1536) is practical and honest.
- The workflow numbered list (lines 1561-1566) gives clear sequential steps.
- "Do not force vectorization when the source is telling you no" (line 1569) is direct and
  memorable copywriting.

Issues and proposed improvements:

**CP-4 (Medium) -- "Tracing profile" and "trace" are repeated internal terms.**
Lines 1527, 1550, 1563: "tracing profile," "traceable," "tracing profile," "trace."
These are technically accurate but readers unfamiliar with the tool may not know what "tracing"
produces. A one-sentence definition at first use would reduce cognitive load.
- Proposed: Add a parenthetical on first use: "tracing (automatically converting pixels into
  scalable vector shapes)" -- then use "trace" freely after.

**CP-5 (Low) -- "Visual noise" is jargon in the intro (line 1527).**
"Limited visual noise" is a photography/design term most users will understand, but "visual
noise" in the context of tracing can confuse readers who associate noise with audio or
random dots. "Avoid complex backgrounds" or "limited background clutter" is plainer.
- Proposed: Replace "limited visual noise" with "minimal background detail."

**CP-6 (Low) -- "Edge wobble, unnecessary path density, or lost detail" (line 1564).**
"Path density" is a technical term for the number of vector nodes per unit area. A reader
without SVG editing experience will not know what this means.
- Proposed: Replace "edge wobble, unnecessary path density, or lost detail" with "jagged edges,
  bloated file size, or missing detail."

**CP-7 (Medium) -- "Recover the original vector source" (line 1570) is passive and vague.**
This is asking the user to do something but using passive voice and an internal metaphor.
- Proposed: Replace "recover the original vector source" with "find the original SVG or design
  file and use that instead."

**CP-8 (Low) -- "Over-segmented" and "detail-starved" in the callout (line 1570).**
Both are vivid but niche descriptors. "Over-segmented" may read as jargon to someone new.
- Proposed: "If the preview already looks patchy, broken up, or missing fine detail, the
  better decision may be to keep the PNG as-is or find the original design file."

---

### 2c. `docs-converter-svg-to-png` (SVG to PNG)

**Overall: Best page of the four. Clear, honest, and well-framed. One minor issue.**

What works well:
- "The simpler direction" in the intro (line 1581) immediately calibrates expectations.
- The "two controls that matter" table (lines 1595-1596) is tight and actionable.
- "Converter is rendering the file, not redesigning it" (line 1611) is excellent copywriting:
  honest, deflects unrealistic expectations, and sticks in memory.
- "Oversized exports increase file weight and can make teams think they solved quality when
  they only increased pixels" (line 1615) is a mature insight delivered plainly.

Issues and proposed improvements:

**CP-9 (Low) -- "Fixed bitmap" is slightly technical jargon (line 1581).**
"Bitmap" is accurate but may not resonate with users who think in terms of PNG/JPG rather
than bitmap vs vector.
- Proposed: Replace "a fixed bitmap instead of live SVG rendering" with "a fixed image file
  instead of a live scalable SVG."

**CP-10 (Low) -- "Brittle markup" is developer jargon (line 1611).**
"Brittle markup" will be understood by developers but not by designers or non-technical users.
- Proposed: Replace "brittle markup" with "broken or incomplete code."

---

### 2d. `docs-converter-settings` (Settings Reference)

**Overall: The strongest analytical page. One structural gap and one tone issue.**

What works well:
- The `traceClass` table with "Avoid when" column (lines 1640-1645) is genuinely useful
  decision support -- significantly better than a table with only "Best for."
- The `qualityMode` advice "Start with `exact`. Move to `compact` only after you have seen
  that the detailed trace is already faithful" (line 1656) is the clearest and most honest
  single instruction in the entire converter docs.
- The closing callout (line 1693) is accurate and humble without being discouraging.

Issues and proposed improvements:

**CP-11 (Medium) -- The intro (line 1626) describes failure modes before success.**
"The wrong combination can produce noisy paths, softened geometry, or output that technically
works but feels careless" -- starting with failure framing puts readers on the defensive.
Best practice: lead with the benefit, place the risk second.
- Proposed: "These settings shape how PNG tracing behaves. Getting them right preserves clean
  edges and keeps the SVG to a manageable size. Getting them wrong can produce noisy paths,
  softened geometry, or output that is technically complete but visually imprecise."

**CP-12 (Low) -- "Softened geometry" is an internal visual design term (line 1626).**
Designers will understand this immediately. Developers and non-designers may not.
- Proposed: Replace "softened geometry" with "blurred or rounded shapes."

**CP-13 (Low) -- `uiMode` heading says "tell the tracer what kind of geometry to respect".**
"Geometry to respect" is indirect. The simpler framing:
- Proposed: "`uiMode`: shape the output for icons or for logos."

**CP-14 (Low) -- `colorMode` description repeats "intentionally" (line 1669).**
"Use it only when the source is intentionally single-color or when that simplification is
part of the goal." The second clause ("is part of the goal") already implies intent, so
"intentionally" in the first clause is redundant.
- Proposed: "Use it only when the artwork is single-color, or when collapsing it to one color
  is the specific result you want."

**CP-15 (Low) -- Starting combinations table is missing "Full-color illustration" row.**
The settings page intro mentions "logos, single-color marks, UI icons, and flat illustrations"
but the "Good starting points" table (lines 1682-1687) has four rows:
- Flat logo
- Single-color wordmark
- Small UI icon
- General illustration with multiple colors

The naming "General illustration with multiple colors" partially covers it but is wordy.
"Multi-color illustration" or "Color illustration or artwork" reads more naturally.

---

## 3. Enhancement Plan Audit

The updated plan (`converter-mcp-agent-library-enhancement-plan.md`) is accurate and honest.

**Structurally sound:**
- Workstream statuses are correctly marked (A: complete, B: mostly complete, C: complete,
  D: good enough).
- The open decision about `suggest_converter_settings` is framed correctly with the right
  Socratic question (line 111).
- The duplication risk between `mcp/runtime/converter-workflow.js` and `lib/converter-workflow.js`
  is acknowledged (lines 94-100).

**One improvement to propose:**

**PP-1 (Low) -- "Bottom line" section (lines 290-302) is repetitive of the decision summary.**
The bottom line re-states points already covered in the decision summary (lines 16-35). In a
living plan document, this creates drift risk: if the decision summary is updated, the bottom
line section must also be updated or it goes stale.
- Proposed: Either fold the bottom line into the decision summary as a closing paragraph, or
  remove the bottom line and let the decision summary stand alone. Keep one canonical statement
  of current status.

**PP-2 (Low) -- "Mostly complete" as a status string lacks precision.**
"Mostly complete" is honest but subjective. A reader who did not follow the full history
will not know which specific items are done vs pending.
- Proposed: Replace "Mostly complete" with "Complete -- one decision pending" and link to
  the specific pending item (the `suggest_converter_settings` decision).

---

## 4. Summary Table

| ID | Page | Severity | Issue | Quick Fix |
|----|------|----------|-------|-----------|
| CP-1 | Guide | Low | Opening sentence abstract | Rewrite to two plain clauses |
| CP-2 | Guide | Low | "Strained" and "overly dense" in callout | "Rough, choppy, or cluttered" |
| CP-4 | PNG-to-SVG | Medium | "Tracing" undefined on first use | Add parenthetical definition |
| CP-5 | PNG-to-SVG | Low | "Visual noise" jargon | "Minimal background detail" |
| CP-6 | PNG-to-SVG | Low | "Path density" jargon | "Bloated file size" |
| CP-7 | PNG-to-SVG | Medium | "Recover the original vector source" passive | "Find the original SVG or design file" |
| CP-8 | PNG-to-SVG | Low | "Over-segmented, detail-starved" | Plainer failure language |
| CP-9 | SVG-to-PNG | Low | "Fixed bitmap" jargon | "Fixed image file" |
| CP-10 | SVG-to-PNG | Low | "Brittle markup" developer jargon | "Broken or incomplete code" |
| CP-11 | Settings | Medium | Intro leads with failure framing | Lead with benefit, then risk |
| CP-12 | Settings | Low | "Softened geometry" design jargon | "Blurred or rounded shapes" |
| CP-13 | Settings | Low | `uiMode` heading is indirect | "Shape the output for icons or for logos" |
| CP-14 | Settings | Low | "Intentionally" is redundant | Remove first instance |
| CP-15 | Settings | Low | "General illustration" row is wordy | "Multi-color illustration or artwork" |
| PP-1 | Plan | Low | Bottom line repeats decision summary | Merge or remove |
| PP-2 | Plan | Low | "Mostly complete" is vague | "Complete -- one decision pending" |

**No blockers. Two medium-severity issues (CP-4, CP-7, CP-11) are the highest-value fixes.
All others are low severity and can be addressed in a single copy-tightening pass.**

---

## 5. Overall Verdict

The four converter docs pages are a genuine improvement over the prior placeholder state.
The structure, honesty about quality limitations, and workflow guidance are all at a suitable
level for a product-side docs section. The tone is appropriate and avoids overselling.

The copywriting issues found are mostly surface-level: a few jargon terms that designers and
developers will understand but general users may not, and one intro that leads with failure
framing instead of benefit-first. None undermines comprehension for the primary audience.

If a single-pass cleanup is planned, prioritize CP-4, CP-7, and CP-11 in that order.
The rest can be batched and addressed in the next editorial pass.
