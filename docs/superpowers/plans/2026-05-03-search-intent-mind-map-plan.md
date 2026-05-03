# Search Intent Mind Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable meaning graph so natural words like `smell` and `smelly` can map through concepts such as odor, air, nose, warning, and trash without stuffing every icon registry record with vague words.

**Architecture:** Keep the icon registry factual. Add `data/search-intent-dictionary/search-intent-mind-map.json` as a separate intent layer with concept nodes and term aliases. Update the generator so `lib/generated-search-intent-rules.js` is built from both curated direct entries and mind-map nodes.

**Tech Stack:** Node.js ESM scripts, JSON source data, existing browser search in `main.js`, existing shared search intent core used by browser and Supabase functions.

---

### Task 1: Add Mind-Map Source and Failing Fixture

**Files:**
- Create: `data/search-intent-dictionary/search-intent-mind-map.json`
- Modify: `data/search-intent-dictionary/search-intent-dictionary.json`
- Modify: `data/search-intent-dictionary/search-intent-dictionary-fixtures.json`

- [ ] **Step 1: Move odor intent out of direct dictionary entries**

Remove direct `smell` and `smelly` entries from `search-intent-dictionary.json`; those terms must come from the mind-map source.

- [ ] **Step 2: Add mind-map source**

Create `search-intent-mind-map.json` with an `odor` node and aliases:

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "odor",
      "category": "physical_sense",
      "meaning": "Physical smell, scent, odor, or unpleasant bad smell.",
      "related_terms": ["smell", "scent", "odor", "stink", "bad smell", "dirty air"],
      "icon_concepts": ["nose", "air", "cloud", "wind", "trash", "alert"],
      "avoid_concepts": ["check", "badge-check", "sparkles"],
      "notes": "Use for natural-language smell searches without adding smell words to icon records."
    }
  ],
  "aliases": [
    {
      "term": "smell",
      "node": "odor",
      "extra_related_terms": ["scent", "air"],
      "extra_icon_concepts": ["nose", "wind", "cloud"],
      "extra_avoid_concepts": ["check", "badge-check"]
    },
    {
      "term": "smelly",
      "node": "odor",
      "extra_related_terms": ["bad smell", "stink", "dirty"],
      "extra_icon_concepts": ["trash", "alert", "nose", "cloud"],
      "extra_avoid_concepts": ["sparkles", "check"]
    }
  ]
}
```

- [ ] **Step 3: Keep fixtures**

Keep the `smell` and `smelly` fixtures in `search-intent-dictionary-fixtures.json`; they should fail until the generator reads the mind-map source.

- [ ] **Step 4: Verify failure**

Run: `npm run verify:search-intent-dictionary`

Expected: FAIL showing missing variants/prefer/avoid for `smell` and `smelly`.

### Task 2: Generate Rules From Mind Map

**Files:**
- Modify: `scripts/build-search-intent-core-from-dictionary.mjs`
- Modify: `scripts/verify-search-intent-dictionary.mjs`
- Generated: `lib/generated-search-intent-rules.js`

- [ ] **Step 1: Update generator**

Read `search-intent-mind-map.json`, validate node references, and emit generated rules for each alias. Alias variants should combine alias term, node related terms, extra related terms, node icon concepts, and extra icon concepts. Alias prefer should combine node icon concepts and extra icon concepts. Alias avoid should combine node avoid concepts and extra avoid concepts.

- [ ] **Step 2: Update verifier**

Validate that all aliases point to existing nodes, all node ids are unique, and all alias terms are unique across dictionary entries and mind-map aliases.

- [ ] **Step 3: Rebuild generated rules**

Run: `npm run build:search-intent-dictionary`

Expected: PASS and `lib/generated-search-intent-rules.js` contains generated `smell` and `smelly` rules.

- [ ] **Step 4: Verify dictionary**

Run: `npm run verify:search-intent-dictionary`

Expected: PASS.

### Task 3: Regression Verification

**Files:**
- No new files.

- [ ] **Step 1: Run existing intent checks**

Run: `npm run verify:search-intent-expansion`

Expected: PASS.

- [ ] **Step 2: Run browser grid behavior checks**

Run: `npm run verify:icon-grid-behavior`

Expected: PASS.

- [ ] **Step 3: Run registry projection checks**

Run: `npm run verify:si-registry`

Expected: PASS.

- [ ] **Step 4: Browser smoke test**

In the local browser, search `smell` and `smelly`.

Expected: `smell` shows air/nose/scent-related results and `smelly` shows trash/alert/nose-related results without a no-results flash.

### Task 4: Document the Model

**Files:**
- Create: `docs/audits/2026-05-03-search-intent-mind-map.md`

- [ ] **Step 1: Explain the distinction**

Document that registry records describe icons, while the mind-map describes what humans may mean.

- [ ] **Step 2: Explain maintenance**

Document that new vague words should become aliases to existing meaning nodes where possible, not new tags on icon records.

- [ ] **Step 3: Explain distribution**

Document that browser, hosted search, and MCP all consume generated rules through `lib/search-intent-core.js` after deployment.

---

## Self-Review

- Spec coverage: The plan covers source data, generation, validation, browser behavior, and docs.
- Placeholder scan: No placeholder tasks remain.
- Type consistency: `nodes`, `aliases`, `related_terms`, `icon_concepts`, and `avoid_concepts` are used consistently across tasks.
