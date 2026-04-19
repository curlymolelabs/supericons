# P0.02 Browse Taxonomy: Socratic Design Analysis

**Date:** April 16, 2026
**Context:** Post-P0.01/P0.02 implementation audit. The database layer is live. The UI expression is under dispute.

---

## 1. The Triggering Question

> "Did we want to add the Jobs menu to the sidebar?"

The builder added a "Jobs" section to the sidebar with three categories: AI & Agents (50), Navigation & Wayfinding (50), Status & Feedback (50). This surfaced a fundamental product question: **what is the correct UI expression of the P0.02 taxonomy?**

---

## 2. What the Master Plan Actually Says (Verbatim)

From `supericons-master-action-plan.html`, Section P0.02:

> "Replace the current library-centric browse categories (Buildings, Arrows, Technology...) with a product-job taxonomy."

And the done criteria:

> "Browse page shows 14 job categories. AI & Agents category is fully populated. At least the 150 most common icons have primary categories assigned."

**Critical observation:** The phrase "Buildings, Arrows, Technology..." refers to category patterns used by other icon libraries (Heroicons, Phosphor). Supericons has never had these subcategories. The current sidebar shows only library names (Lucide, Tabler, Material...) with counts. The taxonomy is a net addition, not a replacement of something that existed.

---

## 3. Socratic Analysis: Five Questions at the Decision Point

### Q1: "What is best practice for this?"

**Answer:** Faceted search. Every major product catalogue (Amazon, Shopify, Figma Community, Iconify) uses multi-dimensional faceted filtering. The established pattern for icon libraries specifically:

- **Iconify:** Library selector (left) + Category filter (top) + Search
- **Phosphor:** Category tabs (top) + Weight filter + Search
- **Heroicons:** Category tabs (top) + Style toggle
- **Material Symbols:** Category tabs (top) + Style/weight filters

None of them put categories as sidebar navigation items parallel to libraries. Categories are always a filtering axis, not a navigation axis.

### Q2: "What would a senior engineer do?"

**Answer:** Separate the data layer from the UI layer. The taxonomy (`icon_metadata`, `JOB_CATEGORY_DEFINITIONS`, telemetry tagging) is correctly built and should not change. Only the presentation needs to change. A senior engineer would also recognize that the existing search engine has 5-layer expansion logic already built (direct match, synonym, reverse lookup, prefix, fuzzy). The path of least resistance is extending `synonyms.json`, not building new UI.

### Q3: "What is the safest reversible option?"

**Answer:** Add AI-domain terms to `synonyms.json` first (zero UI change, zero risk, immediately valuable). Then decide on filter UI after testing the improved search results.

### Q4: "Does the codebase already have a pattern for this?"

**Answer:** Yes. `synonyms.json` already contains 285 synonym groups covering 1500+ terms. The search engine (`main.js`, lines 826-1009) already implements tiered results (Tier 1: direct name match, Tier 2: synonym expansion below a "Related" divider). The pattern is proven. Extending it with AI-domain vocabulary requires no architecture change.

### Q5: "What would break if I am wrong?"

**Answer:** If we ship the Jobs sidebar: users see a confused IA where "AI & Agents" sits alongside "Lucide" as if they are equivalent choices. It creates the wrong mental model about what Supericons is (a category browser vs. a search-first discovery tool). If we ship enhanced search only: worst case is users find more relevant results. Low risk.

---

## 4. IDEO Design Thinking: Three Lenses

### Desirability (What do users want?)

Two user intents:

| Intent | User action | Need |
|---|---|---|
| **Known need** | Types "quota", "inference", "rag pipeline" | Search that understands AI vocabulary beyond icon names |
| **Exploration** | "Show me icons for AI dashboards" | A filter/browse surface organized by use-case |

The Jobs sidebar partially serves exploration but completely fails known-need search. Enhanced synonyms serve known-need immediately. Filter chips serve both.

### Feasibility (What is technically possible?)

The search engine already has multi-layer expansion. Adding terms to `synonyms.json` is editorial work, not engineering work. The `JOB_CATEGORY_DEFINITIONS` array already exists in JS and can power filter chips above the grid with minimal code.

### Viability (What makes business sense?)

The taxonomy is the product differentiation. No other icon library organizes by job context. But the differentiation must be expressed as smarter search results, not as additional sidebar clutter. The competitive moat is: "When you type 'quota' on Supericons, you find the right icon. On Iconify, you find nothing."

---

## 5. The E-Commerce Analogy

The user correctly identified the parallel to an electronics store:

```
E-COMMERCE:
  Brand (sidebar)     -->  Product type (category)  -->  Filters (price, color)
  Nike, Adidas             Shoes, Clothing                Size 10, Red, Under $100

ICON LIBRARY:
  Library (sidebar)   -->  Use case (filter chips)   -->  Style filter
  Lucide, Tabler           AI & Agents, Navigation         Outline, Filled
```

This is faceted search. The sidebar IS the "brand" axis. The taxonomy IS the "product type" axis. They are separate, combinable dimensions. Example compound queries:

- `Lucide + AI & Agents` = 25 icons from Lucide tagged as AI-related
- `All Libraries + Navigation` = 100+ icons from all libraries tagged as navigation
- `Tabler + Status` = 50 Tabler icons tagged as status/feedback

The Jobs sidebar makes these compound queries impossible because selecting a Job category replaces the library selection instead of combining with it.

---

## 6. The Search Engine Gap (Root Cause Analysis)

### What exists today

`synonyms.json` (20KB, 285 groups) powers a sophisticated 5-layer search:

1. **Direct key match:** "cpu" -> ["processor", "chip", "compute", "hardware", "silicon"]
2. **Reverse lookup:** if "quota" appears as a value in any group, expand to all group members
3. **Prefix match:** "proc" matches "processor" group (min 3 chars)
4. **Suffix normalization:** "processings" -> "processing" -> match
5. **Fuzzy typo tolerance:** Levenshtein distance <= 1 for queries > 4 chars

### Why "quota" returns 0 results

The term "quota" does not appear anywhere in `synonyms.json`. It is not an icon name, not a synonym key, and not a synonym value. The search engine is sophisticated but can only expand terms it knows about.

The fix: add "quota" to the "cpu" synonym group (or create a new group). The existing tiered search automatically shows `lucide:cpu` under the "Related" divider when "quota" is searched. This is a one-line JSON edit that closes the gap immediately.

### Already partially covered (but with gaps)

The file already has AI-relevant groups:
- "cpu": ["processor", "chip", "compute", "hardware", "silicon"] (line 47)
- "brain": ["ai", "intelligence", "neural", "cognitive", "think", "smart"] (line 78)
- "agent": ["autonomous", "bot", "ai agent", "assistant", "operator", "worker"] (line 276)
- "inference": ["predict", "generate", "run model", "output", "forward pass"] (line 281)

But it is missing:
- "quota" (zero hits)
- "observability" (zero hits, should map to `eye`)
- "rag" (zero hits, should map to `shuffle` or `workflow`)
- "tool-call" (zero hits)
- "guardrail" (zero hits)
- "langchain" / "langgraph" (zero hits)
- "pinecone" / "weaviate" / "chroma" (zero hits)

All of these are documented as amber aliases in `kit01-icon-reference-guide.html`. The reference guide IS the editorial source for the synonym enhancement.

---

## 7. Recommended Priority Order

| Priority | Action | Impact | Effort |
|---|---|---|---|
| 1 | Enhance `synonyms.json` with AI-domain terms from the amber aliases | Fixes "quota = 0 results" immediately. Zero UI change. | Low (editorial) |
| 2 | Remove Jobs sidebar section | Cleans up the wrong UI expression | Low (code removal) |
| 3 | Add Use Case filter chips above grid | Correct P0.02 UI (faceted browsing) | Medium (new UI component) |
| 4 | Library list "show more" toggle | UX polish for sidebar length | Low (optional) |

---

## 8. Decision Points for Builder

### Decision 1: Synonym Enhancement Scope

Should the builder add only the amber aliases from Kit 01 (31 icons worth of terms), or also extract terms from the full 150-icon P0.02 taxonomy seed?

**Recommendation:** Start with Kit 01 amber aliases only. The reference guide documents them explicitly per icon. The remaining 100 icons in the taxonomy seed do not have editorial semantic aliases yet.

### Decision 2: Filter Chip Data Source

Should the filter chips be powered by the static `JOB_CATEGORY_DEFINITIONS` array (already in JS), or query `icon_metadata` from Supabase?

**Recommendation:** Use `JOB_CATEGORY_DEFINITIONS` (client-side). It is already loaded at startup, already counted in `rebuildJobCategoryCounts()`, and requires zero API calls. The database is for telemetry and MCP, not for the browse UI.

### Decision 3: Filter Chip Behavior

Should selecting a filter chip AND a library in the sidebar show only icons that match both dimensions (intersection)?

**Recommendation:** Yes, intersection (AND). This is the e-commerce standard. "Nike + Shoes" shows Nike shoes, not all Nike products plus all shoes. "Lucide + AI & Agents" should show only Lucide icons tagged as AI.

---

## 9. What NOT to Do

1. **Do not tag all 20K icons manually with keywords first.** The 150 seeded icons and the existing synonym corpus cover the highest-traffic cases. Expand editorially over time, driven by search analytics showing zero-result queries.

2. **Do not put filters inside the search bar as a dropdown.** Search-bar filter dropdowns have poor mobile UX and add interaction complexity. Keep the search bar as a text input. Keep filters as a separate visual row.

3. **Do not add more sidebar sections.** The sidebar serves library navigation. Adding another dimension there creates a parallel-axis confusion. The filter chip row is the correct surface for the second dimension.

4. **Do not build a faceted search backend.** The current client-side filter+search architecture works at 20K icons. A server-side faceted search is overengineering for this scale.

---

## 10. Summary Verdict (Browse UI)

The P0.02 data layer is correct and complete. The evidence pipeline is live. The taxonomy seed is applied. The only error is the UI surface: a Jobs sidebar section that should be a filter chip row above the grid. The highest-impact immediate action is not UI work, it is adding AI-domain synonym terms to the existing `synonyms.json` so that search queries like "quota", "rag", and "observability" return results today.

---

## 11. Tag All 20K Icons vs. Enhance Synonyms: Socratic Conclusion

**Context:** The user observed that searching "compute" returns 4 results including `computer_line`, `computer_camera_line`, and `computer_camera_off_line` -- icons that are about the physical device, not the abstract concept of computing. This exposes a precision limitation of synonyms-only search. Does the solution require tagging every icon in the library?

---

### The Four Socratic Questions

**Q1: "What is the actual problem being solved?"**

Two distinct problems exist, often conflated:

| Problem | Symptom | Root cause |
|---|---|---|
| **Gap problem** | "quota" returns 0 results | Term not in synonyms.json at all |
| **Noise problem** | "compute" returns camera icons | Substring match: "computer" contains "compute" |

Synonyms alone solve the gap problem. They do not solve the noise problem. Per-icon tags solve both, but only for tagged icons.

**Q2: "What is the cost of tagging all 20K icons?"**

Manual editorial tagging of 20,000 icons at an average of 5 tags each = 100,000 editorial decisions. At 30 seconds per icon (read, think, tag), that is 167 hours of human time. This is not a sprint task. It is a sustained multi-month operation.

The alternative: let behavioral data from `icon_evidence` (P0.01, already live) tell you which icons need tags. When users search "compute" and consistently copy `lucide:cpu` but skip `computer_line`, that is evidence that `computer_line` should be excluded from the "compute" synonym expansion. The data pipeline does the gap discovery automatically.

**Q3: "What does 'tagging all 20K' actually mean architecturally?"**

It means adding a `tags[]` array to the icon data structure, loading it at startup, and including it in the search segment check (one line of code in `main.js`). This is the correct architecture. The question is not whether to have tags -- it is how to populate them:

| Population method | Coverage | Effort | Precision |
|---|---|---|---|
| Manual editorial (all 20K) | Complete | 167+ hours | High |
| Editorial (150 curated icons) | Partial (known gaps) | ~8 hours | High |
| Behavioral data-driven (P0.01) | Grows over time | Zero editorial effort | Emerges from real usage |
| LLM-assisted tagging pipeline | Near-complete | ~1 day to build + compute cost | Medium (needs QA) |

**Q4: "What is the right sequence?"**

The master plan already answers this. The P0.01 `icon_evidence` pipeline is the engine that discovers which icons need tags next. You do not need to front-load all tagging before traffic. You need traffic to tell you where the gaps are.

```
P0 (now):    Synonyms enhanced + 150 curated icons tagged = closes known gaps immediately
P1-P2:       Traffic starts flowing. Evidence pipeline collects real search behaviors.
P3+:         ico_evidence surfaces next 500 icons needing tags (driven by zero-result queries).
Long term:   LLM-assisted bulk tagging pipeline if/when coverage becomes a priority.
```

---

### The Noise Problem: A Precise Fix

The "compute" vs "computer" substring collision is real but narrow. This is how to fix it without tagging 20K icons:

**Option A (synonyms fix):** Change the synonym value from `"compute"` to `"computation"` (longer string, less likely to be a substring of unrelated icon names). Low precision, quick.

**Option B (per-icon tags for 150 icons):** Add `tags: ["inference", "compute", "quota"]` to `lucide:cpu` and `tags: ["device", "desktop", "laptop"]` to `computer_line`. The search engine prioritizes tag matches over substring matches, so `lucide:cpu` rises to Tier 1 and `computer_line` drops out of the "compute" results. High precision, ~8 hours of editorial work.

**Option B is the right answer.** It fixes the noise for the icons that matter (the 150 curated AI-domain icons) without requiring manual tagging of the full 20K corpus.

---

### Final Decision: Hybrid, Phased

| Layer | What | Coverage | When |
|---|---|---|---|
| **Synonyms** | Broad vocabulary expansion | 20K icons | Now (editorial, ~2 hours) |
| **Per-icon tags** | Precision for curated set | 150 icons | Now (editorial, ~8 hours) |
| **Behavioral data** | Data-driven gap discovery | Grows with traffic | Always on (P0.01 pipeline) |
| **LLM tagging pipeline** | Near-full coverage if needed | 20K icons | If and when needed (not now) |

**The tag-all-20K question is not "yes or no" -- it is "not yet, and maybe never manually."** The behavioral pipeline is designed to discover which icons need tags next, in priority order, driven by actual user behavior. Front-loading 167 hours of manual tagging before traffic exists optimizes for completeness at the cost of correctness -- you would be guessing what users need instead of learning it.

---

## 12. Updated Action List (Consolidated)

| Priority | Action | Solves | Effort |
|---|---|---|---|
| 1 | Enhance `synonyms.json` (amber aliases from Kit 01) | Gap problem: zero-result searches | Low (2 hrs, editorial) |
| 2 | Add `tags[]` to icon data for 150 curated icons | Noise problem: substring collisions | Medium (8 hrs, editorial + 1 line code change) |
| 3 | Remove Jobs sidebar section | Wrong UI expression | Low (code removal) |
| 4 | Add Use Case filter chips above grid | Correct P0.02 browse UI | Medium (new UI component) |
| 5 | Monitor `icon_evidence` for zero-result search queries | Ongoing gap discovery | Continuous (data-driven) |
| Later | LLM tagging pipeline for full 20K coverage | Scale editorial coverage | When traffic justifies it |
