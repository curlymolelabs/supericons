# Supericons icon expansion: research, schema, and 21 new originals

Date: 2026-07-29
Commit: `8342b9d12` (68 files, not pushed)
Library: 106 to 127 si icons in the web and MCP catalogs

---

## 1. Summary

This work started as a request to recover a handful of icons that existed only inside a
prototype file, and grew into three connected pieces:

1. **Demand research.** A coverage audit of the nine bundled open icon libraries plus an
   analysis of 30 days of real user searches, to decide what is actually worth drawing.
2. **A 34-icon proposal** with complete registry records written before any artwork.
3. **21 icons drawn, wired, and committed**, along with the taxonomy and localization
   plumbing needed for them to be reachable in the product.

Two pieces of infrastructure came out of it that outlast this batch: a repeatable
icon-drawing workflow with visual verification, and a reference-gathering tool.

---

## 2. What shipped

21 original si concept icons, all with full registry records, all at `status: draft` so the
human taste gate still applies before they count as canonical.

| Category | Icons |
|---|---|
| Agent identity | `agent-scout`, `agent-wink`, `agent-pod` |
| Game assets | `game-pad`, `game-ghost` |
| Everyday objects | `toothpaste`, `house-key`, `screw` |
| Health and body | `bacteria`, `stomach` |
| Physical automation | `lawn-mower` |
| Agentic payments | `cashback`, `lottery-ticket` |
| Food and dining | `noodle-bowl` |
| Nature and animals | `dinosaur`, `fossil` |
| Personal care | `comb`, `hairbrush`, `hair-clipper`, `mascara`, `nail-polish` |

**Origins.** Five (`agent-scout`, `agent-wink`, `game-pad`, `game-ghost`, `toothpaste`) were
extracted from a prototype at `supericons-v2-mvp/index.html`, where they existed only as
inline glyph strings and were in no library. Their path data was copied verbatim, and they
keep the prototype's stroke width of 1.85 rather than the pack's 1.6, deliberately, to
preserve the original look. Two changes were made on request: the gamepad's face buttons
shrank from radius 0.9 to 0.5, and `agent-muse` was renamed `agent-wink`.

`agent-pod` is the original bacteria drawing, kept unchanged and recatalogued as an agent
face after the bacteria icon was redrawn.

Ten answer searches that returned zero results in the last 30 days: `bacteria`, `stomach`,
`lawn-mower`, `house-key`, `screw`, `cashback`, `lottery-ticket`, `noodle-bowl`, `dinosaur`,
`fossil`.

---

## 3. Research findings

### 3.1 Coverage audit of the open libraries

Audited across material, lucide, tabler, phosphor, heroicons, bootstrap, ionicons, iconoir,
and mingcute. Simple Icons and si were excluded from coverage judgments.

**Personal care and grooming: a wide open field.** 20 of 35 audited concepts exist in no
open library. Bathroom fixtures are well covered (soap, shower, bathtub, towel, mirror), but
**oral care and cosmetics are absent entirely**: no toothbrush, toothpaste, dental floss,
shampoo, lotion, sunscreen, comb, hairbrush, hair clipper, makeup, mascara, nail polish,
deodorant, tissue, cotton swab, or tweezers anywhere.

**Kitchenware: dining covered, prep tools missing.** 16 of 45 concepts missing. Bowls, mugs,
cutlery, and major appliances are well covered. The gap is food-prep tools: wok, cutting
board, rolling pin, grater, peeler, tongs, colander, corkscrew, bottle opener, can opener,
kitchen scale, mixer, toaster, and, unexpectedly, a plain dinner **plate**.

### 3.2 The 30-day search log

19 demand themes were identified from the failed-search export.

**The most important finding: 15 of 19 themes fail on search wording, not on missing icons.**
Three recurring causes:

- **Non-English queries return nothing.** Spanish, Portuguese, Russian, Chinese, Japanese,
  Thai, and Arabic queries all return zero while the English icons exist. `tuerca`, `tornillo`,
  `toalla`, and `almacen` all return zero although nut, screw, towel, and warehouse icons
  are present.
- **Stacked multi-noun phrases.** Queries like "verification audit shield check" match no
  single icon name, though every component exists.
- **Unmapped synonyms.** `magnify`, `profit`, `cargo`, `noodle`, `parcel`, and `animal` return
  nothing while the concepts ship under other names.

This is fuel for search work, not for drawing. Creating icons will not fix any of it.

**A likely bug worth separate attention.** OpenAI, Anthropic, Figma, and Supabase all returned
zero under both the `si` and `simpleicons` filters. The bundled Simple Icons subset genuinely
lacks a plain `openai` entry and any `amazon` entry, while tabler and bootstrap have them.
Separately, `sf_symbols` is accepted as a library filter but is not a bundled library, so any
query scoped to it returns zero regardless of wording.

**Caveat on the data.** The log is thin. Most clusters are one builder wiring one application
in a single session, so only repeat, multi-searcher, multi-country signals were treated as
real demand.

---

## 4. The 34-icon proposal

Structured in three waves. Full records for all unbuilt icons live in
`data/si-registry/source/libraries/supericons-proposed-2026-07-29.json`.

- **Wave 1, demand singles (10).** Each answers a specific failed search.
- **Wave 2, personal care (12).** The biggest open field, where Supericons would be the
  first findable source.
- **Wave 3, kitchen prep (12).** Dining and appliances stay with the libraries that already
  cover them well.

`tow-truck` was deliberately excluded: material and tabler already have one, so that is a
ranking fix, not a drawing target.

---

## 5. Schema and record design

Every icon carries the same record shape as the existing 56 si concept records. Two rules
were settled during this work and applied to all 34 records.

### 5.1 Three-layer semantic tags

Tags must span **appearance** (what a person sees and types, such as "tube" or "robot face"),
**role** (the job it does), and **domain**. An earlier draft leaned almost entirely on role
and would have made icons unfindable by appearance: nobody would locate `agent-wink` by
typing "wink".

### 5.2 The `avoid_when` rule

`avoid_when` may only name a **genuine misread**, meaning a wrong meaning someone would
plausibly attribute to the drawing. Territory claims that exist only to protect another icon
are banned.

The rule came from a real defect. An early record said "do not use as a generic chatbot face,
use agent-face for that", which was an invented boundary suppressing legitimate use. Under the
corrected rule, 15 of 34 records carry no `avoid_when` at all, and the 19 that do name real
shape collisions: comb as a barcode, grater as a document or signal bars, rolling pin as a
barbell, tongs as scissors, plate as a plain circle, toaster as a UI toast notification.

### 5.3 Honest `depicts`

`depicts` describes only what the drawing literally shows. Where artwork changed during
review, the field was rewritten to match. `agent-wink` is described as a winking robot head;
the persona reading lives in `purpose` and `synonyms`, not in a claim about the drawing.

---

## 6. Infrastructure changes

### 6.1 Seven new tag categories

`agent-identity`, `game-assets`, `everyday-objects`, `health-body`, `personal-care`,
`food-dining`, `nature-animals`.

Each is registered in both the browser and MCP taxonomy copies
(`lib/supericons-ai-taxonomy.js` and `mcp/runtime/supericons-ai-taxonomy.js`, kept byte
identical) and translated across all 12 locales in three catalog directories, 36 files total.

### 6.2 A defect this surfaced

The first five icons were merged into the catalogs but were **unreachable from the tag menu**.
The menu is driven by the taxonomy seed, not by the record files, so job categories that are
not registered there leave their icons orphaned. This was invisible in search and only showed
up when the tag dropdown was inspected. An orphan check now confirms all 127 si icons resolve
to a tag category.

### 6.3 Files touched by the build

Promoting icons regenerates `public/icon-taxonomy.json` and rewrites
`supabase/migrations/20260416_icon_taxonomy_seed_p0.sql`. The migration diff was verified as
purely additive, new rows only, nothing altered or removed. The hardcoded si icon count in
`scripts/verify-icon-grid-behavior.mjs` is a snapshot that must be updated whenever the
library grows; it moved from 106 to 127 across three assertions.

---

## 7. The icon drawing workflow

This is the most reusable output. Drawing from a mental model of an object produced shapes
that were geometrically valid but read as the wrong thing. Two steps fixed it.

### 7.1 Reference first

Before drawing, gather real reference images for the term **and related terms**, and identify
the one or two structural features that make the object unmistakable. Examples from this
batch:

| Icon | The feature that decides it |
|---|---|
| Stomach | Two tubes, esophagus in and duodenum out. One tube is a bottle. |
| Bacteria | Uneven organic body with many irregular hairs. Four symmetric limbs is a crab. |
| Dinosaur | Heavy tapering tail balancing the head. A thin tail is a bird. |
| Fossil | Radial ribs on the spiral. A bare spiral is a snail. |
| Cashback | The arrow wraps the coin. A separate arrow above it does not read. |
| Noodles | Vertical strands lifted by chopsticks, not waves inside the bowl. |
| Hairbrush | Bristle tips as dots on the face. Radiating lines make a sun. |
| Clipper | Upright body with a toothed blade on top, not a horizontal corded device. |

`tmp/refsheet.mjs` downloads reference images and composes them into a single contact sheet
for study.

### 7.2 Render before wiring

`tmp/render-check.mjs` rasterizes named icons to a labelled PNG sprite at both large and 24px
sizes using `@resvg/resvg-js`, already a dependency. Nothing gets a manifest entry until its
render has been looked at.

Two bugs in this harness were themselves worth catching, because both caused it to
misreport artwork:

- It forced `fill="none"` and a stroke onto every icon, so a filled icon could never display
  correctly.
- It stripped `width` and `height` from **every** element rather than just the root `<svg>`,
  which silently deleted any `<rect>` in the artwork. Two icons appeared broken for this
  reason alone.

The script must live inside the project so Node can resolve `@resvg/resvg-js`.

### 7.3 Style decisions that came out of drawing

- **Secondary stroke weight.** Fine detail nested inside a container uses a lighter stroke
  (about 1.0 to 1.15) against the pack's 1.6: comb teeth, clipper teeth, mascara bristles, and
  the dollar sign on the lottery ticket. The v2 schema already anticipates this with a
  `weight_hierarchy` field.
- **Two icons ship solid rather than outline**, `comb` and `dinosaur`. Both carry fine
  repeated detail that an outline cannot hold at 24px. An outlined comb tooth needs roughly
  2.2 units of interior plus 2.2 of gap against a 1.6 stroke, which caps the head at three
  teeth, and a three-toothed comb reads as a fork.
- **Two dots plus a curve always reads as a face.** This caught the stomach twice, once with
  particle dots above a fluid line, and it is why the bacteria's dots sit in a line rather
  than in eye positions.

---

## 8. Current state

**Committed** (`8342b9d12`): 21 icons, records, manifest, taxonomy for both surfaces, 36
locale files, both icon catalogs, the taxonomy snapshot, the seed migration, and the updated
count assertions.

**Verified**: `verify-icon-grid-behavior`, `verify-i18n-catalogs`, `verify-search-catalog-sync`,
`verify-si-registry-source-boundaries`, `verify-search-query-fixtures`, `verify-view-route-policy`
all pass.

**Update, later the same day:** the proposal is complete. All 34 icons are drawn, recorded,
merged, and committed, and the proposed-records file is empty. The library stands at 146 si
icons in both catalogs (127 after `8342b9d12`, 132 after the personal care five in
`8f73c044b`, 137 after `87237e4a6`, 142 after `1d3bd889d`, 146 after `f8b95bf81`).
Review-driven reworks landed as `0b79b95e8` (toothbrush and sunscreen to outline),
`031dd003a` (toothbrush slimmed to the canonical silhouette), `8a4519945` and `e83e087bd`
(dental floss thread and open lid), and `1e7bc63d3` (cutting board and cotton swab). The
solid exceptions in the pack are comb and dinosaur; everything else is outline. A `kitchen`
tag category was added alongside the earlier seven, and the missing-category failure mode
is now caught by verify-icon-grid-behavior, which flagged it once during this work.

**Not committed, deliberately:**

- `docs/si-v2/vision-charter.md`, which has 72 deletions from another workstream.
- `.claude/` and an unrelated audit briefing document.
- `tmp/`, holding the scratch scripts and downloaded reference images. **`tmp/` is not
  gitignored**, so these files sit untracked and could be swept into a future broad `git add`.

**Remaining from the proposal**: 19 icons need artwork, 5 of which have rejected drafts on
disk. All 19 have complete records already written.

---

## 9. Open decisions

1. **Solid versus outline.** Two icons now break the pack's outline convention for
   legibility reasons. Either accept a mixed pack where fine detail demands it, or accept
   chunkier three-toothed combs and simplified animals.
2. **`agent-pod` and `bacteria` resemble each other**, since one was derived from the other.
   They are distinguishable, and the misread is recorded in `agent-pod`'s `avoid_when`, but
   straightening the pod upright would separate them further.
3. **The five unapproved icons**: redraw with the reference workflow, or drop them from the
   wave.
4. **Search fixes outrank new icons.** The single highest-value item found in this work is
   not an icon at all: 15 of 19 demand themes fail on non-English queries, stacked phrases,
   and unmapped synonyms, plus the brand-logo filter gap and the `sf_symbols` phantom filter.
