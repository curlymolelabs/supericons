# P0.02 Phase 3 Implementation Audit

**Date:** April 17, 2026
**Auditor:** Antigravity
**Scope:** Phase 3 curated alias precision layer, builder search gap discovery, and readiness assessment for Phase 4

---

## 1. What Changed in Phase 3

The builder added three things:

1. `lib/icon-semantic-aliases.js` -- the curated alias map (16 icons, 90 aliases)
2. Alias scoring functions (`getCuratedAliasScore`, `getDirectSearchScore`) in both `main.js` and `mcp/search.js`
3. A unified Tier 1 that combines direct matches AND curated alias matches, before Tier 2 (synonym recall)

---

## 2. What is Correct and Working

### Shared alias source confirmed

`main.js` line 39 imports `createIconSemanticAliasMap` from `./lib/icon-semantic-aliases.js`.
`mcp/search.js` line 6 imports the same file.
One source of truth. Plan requirement met.

### Scoring architecture is sound

Alias score (max 420) intentionally beats direct substring score (max 320). A search for `quota` ranks `lucide:cpu` (alias score 420 for exact match) above anything with "quota" as an accidental substring. Correct winner ordering: curated concept precision beats substring noise.

### Score logic is identical between site and MCP

The score constants in `mcp/search.js` (lines 109-130) are byte-equivalent to `main.js` (lines 934-956). No drift between platforms.

### Rank-based tie-breaking is correct

When both alias score and direct score are equal, `getIconJobRank()` is used as the tie-breaker. Taxonomy-seeded icons bubble above untagged icons with equal scores.

### Plan matrix queries resolve correctly

| Query | Resolves via | Expected first result | Status |
|---|---|---|---|
| `tool call` | Alias exact match on `tabler:api` | `tabler:api` at score 420 | PASS |
| `observability` | Alias exact match on `lucide:eye` | `lucide:eye` at score 420 | PASS |
| `langgraph` | Alias exact match on `lucide:workflow` | `lucide:workflow` at score 420 | PASS |
| `semantic search` | Alias multi-word all-token match on `lucide:shuffle` | `lucide:shuffle` at score 320 | PASS |
| `quota` | Alias exact match on `lucide:cpu` | `lucide:cpu` at score 420 | PASS |

All five plan verification matrix cases resolve correctly in code.

---

## 3. Critical Bug Found: Hyphenated Queries Return Zero Results

### Root cause

`expandSingleTerm` splits the query on `\s+` (whitespace only). A hyphenated term like `self-hosted` is treated as **one word** with no whitespace, becoming a single token.

The fuzzy distance check has an 11-character string (`self-hosted`) vs synonym keys like `server` (6 chars): `Math.abs(11 - 6) = 5 > 2`, so it early-returns `99` and fuzzy matching fails.

Result: **zero results** for any hyphenated query.

### Affected queries

- `self-hosted`
- `model-server`
- Any future hyphenated concept (`on-premise`, `load-balanced`, `rate-limit`, etc.)

### Fix

One line in both `main.js` and `mcp/search.js` -- normalize hyphens to spaces before tokenization:

```js
// In expandSearchTerms (or at query entry point):
const normalizedQuery = query.toLowerCase().replace(/-/g, ' ').trim();
```

This is a one-line change that fixes the entire class of hyphenated queries permanently.

**Severity: Medium. This is Phase 2/3 cleanup, not a Phase 4 item.**

---

## 4. User's Gap Term Analysis

The user tested 12 terms that return zero or near-zero results. Root cause per term:

### Zero-result terms

| Term | Root cause | Fix type |
|---|---|---|
| `llm` | Not in synonyms.json or alias map | Synonym addition: `"llm"` -> `["brain", "neural", "model", "language model"]` |
| `foundation model` | AND query -- "foundation" has no mapping so the whole query fails even if "model" hits | Alias on `lucide:brain` + synonym for "foundation" |
| `distributed` | Not in synonyms. "distribute" only maps to "share" (wrong domain) | Synonym addition: `"distributed"` -> `["network", "server", "cluster", "decentralized"]` |
| `interconnected` | Not in synonyms at all | Alias extension for `lucide:network` |
| `sampling` | Not in synonyms. Suffix strip yields `sampl` -- no match | Synonym addition: `"sampling"` -> `["trace", "observe", "probability", "random"]` |
| `nodes` | Suffix strip yields `node` -- not in synonyms | Synonym addition: `"node"` -> `["network", "graph", "server", "vertex"]` |
| `tracing` | `tracing -> trac` after strip (4 chars, passes check but `trac` is not a key). Fails. | Synonym addition: `"trace"` as a key -> `["eye", "observe", "inspect", "debug"]` |
| `latency` | Not in synonyms | Synonym addition: `"latency"` -> `["timer", "delay", "response time", "p95", "slow"]` |
| `self-hosted` | Hyphen bug (see Section 3) + no synonym entry | Hyphen fix + synonym/alias for `lucide:server` |
| `model-server` | Hyphen bug (see Section 3) + no synonym entry | Hyphen fix + synonym/alias |

### Shallow-result terms

| Term | Issue | Fix |
|---|---|---|
| `workload` | Hits `material:assured_workload` (substring) only. No synonym expansion. | Synonym + alias extension on `lucide:activity` |
| `performance` | Not in synonyms. Only hits direct icon name substrings. | Synonym addition: `"performance"` -> `["activity", "metrics", "benchmark", "speed", "throughput"]` |
| `instant` | Not in synonyms. Only hits direct substring matches. | Synonym: `"instant"` -> `["bolt", "fast", "speed", "realtime", "zap"]` |
| `agents` | Suffix strip yields `agent` -> hits synonym group correctly. But no plural/group visual. | Content gap (no "group of bots" icon) -- cannot fix at search layer |

### Key insight: plural/group visual concept

The `agents` result is correct behavior from the engine's perspective. The gap is in the icon library: there is no icon representing "multiple agents" or "agent cluster." This is a **content curation gap**, not an engine gap. It belongs in the Icon Curation Design backlog, not the search fix list.

---

## 5. Alias Map Coverage Assessment

The alias file currently covers **16 icons** from the 150-icon seeded set.
Coverage: **16 / 150 = 10.7%**.

The 16 icons covered are the highest-priority AI-domain concepts. This is correct prioritization. However, the plan's own acceptance criteria states "curated seed" as the scope. The gap list from the user's testing reveals 6 additional icons that need alias entries immediately:

### Alias map extensions needed now

```js
// Extend lucide:brain (already exists, missing LLM terms)
'lucide:brain': [
  ...existing,
  'llm',
  'large language model',
  'foundation model',
  'base model',
  'pretrained model',
],

// Extend lucide:activity (already exists, missing workload)
'lucide:activity': [
  ...existing,
  'workload',
  'system load',
  'request volume',
],

// Extend lucide:eye (already exists, missing sampling/tracing)
'lucide:eye': [
  ...existing,
  'tracing',
  'distributed tracing',
  'sampling',
  'span sampling',
  'trace viewer',
],

// New: lucide:server
'lucide:server': [
  'self-hosted',
  'on-premise',
  'on-prem',
  'local deployment',
  'private cloud',
  'model server',
  'model-server',
  'inference server',
],

// New: lucide:timer (or material:timer)
'lucide:timer': [
  'latency',
  'response time',
  'p95',
  'p99',
  'tail latency',
  'time to first token',
  'ttft',
],

// Extend lucide:network (already exists, missing distributed/nodes)
'lucide:network': [
  ...existing,
  'distributed',
  'distributed system',
  'interconnected',
  'nodes',
  'node network',
  'mesh network',
  'decentralized',
],
```

---

## 6. Synonym Additions Needed

These terms have zero synonym coverage and should be added to `public/synonyms.json` AND `mcp/public/synonyms.json`:

```json
{
  "llm": ["language model", "neural", "model", "brain", "ai model", "gpt", "transformer"],
  "node": ["vertex", "network", "graph", "server", "point", "element"],
  "distributed": ["cluster", "decentralized", "network", "federated", "parallel", "spread"],
  "latency": ["delay", "response time", "lag", "slow", "p95", "p99", "wait time"],
  "trace": ["tracing", "span", "debug trace", "call trace", "audit trail", "observe"],
  "sampling": ["sample rate", "probability", "random", "fraction", "subset"],
  "performance": ["benchmark", "throughput", "speed", "metrics", "optimize", "fast", "efficient"],
  "instant": ["realtime", "fast", "immediate", "live", "now", "zap", "bolt"],
  "workload": ["load", "jobs", "tasks", "compute jobs", "batch", "processing"],
  "foundation": ["base", "core", "pretrained", "underlying", "model family"]
}
```

**Important:** Mirror every addition in both `public/synonyms.json` and `mcp/public/synonyms.json`. These must remain in sync.

---

## 7. Phase 3 Verification Scorecard

| Check | Status | Notes |
|---|---|---|
| `lib/icon-semantic-aliases.js` created | PASS | 133 lines, 16 icons, 90 aliases |
| Shared import in both site and MCP | PASS | `main.js:39`, `mcp/search.js:6` |
| Alias score beats direct score | PASS | 420 max vs 320 max |
| Score logic identical between site/MCP | PASS | Byte-equivalent scoring constants |
| Plan matrix queries (5 queries) resolve | PASS | 5/5 at expected Tier 1 |
| Hyphenated queries work | FAIL | `self-hosted`, `model-server` = zero results (engine bug) |
| User's 12 gap terms covered | FAIL | 0/12 terms present in synonyms or alias map |
| Alias coverage of 150-icon seed | PARTIAL | 16/150 = 10.7% |
| MCP synonym parity with site | UNVERIFIED | Builder claimed parity, not confirmed in this session |

---

## 8. Assessment of Phase 4 Recommendation

The builder recommends moving to Phase 4 (admin search intelligence loop) as the next step. This is **strategically correct but tactically premature** given the gaps above.

**Why Phase 4 is directionally right:**
- The evidence pipeline is live
- Synonym and alias layers are functional
- The system can now learn from real query behavior
- Building a zero-result dashboard would surface exactly the gaps found in this audit -- automatically

**Why the engine needs two more fixes first:**

1. **Hyphen normalization bug** -- Phase 4 data will be misleading if `self-hosted` and `model-server` log as zero-result queries when the real problem is a one-line code omission, not a genuine coverage gap.

2. **The 12 missing terms from the user's test** -- These are knowable gaps. Shipping to production before fixing them creates negative first impressions. Phase 4 analytics are most useful when they surface *unknown* gaps, not ones already documented in this audit.

---

## 9. Recommended Action Sequence

**Before Phase 4 (complete first):**

1. Fix hyphen normalization in query tokenizer (one line in `main.js` and `mcp/search.js`)
2. Add 10 synonym entries for zero-result AI/infra terms (see Section 6)
3. Extend alias map with 6 additional icons (see Section 5)
4. Verify MCP synonym parity: diff `public/synonyms.json` vs `mcp/public/synonyms.json`

**Then proceed to Phase 4:**

5. Build admin search intelligence view (zero-result queries, low-conversion queries)
6. Build `semantic_candidates` table for agent-proposed synonym additions
7. Implement approval workflow for semantic updates
8. Ship and generate real `icon_evidence` data

**Estimated effort for steps 1-4:**
- Step 1: 30 minutes (code)
- Step 2: 30 minutes (editorial)
- Step 3: 45 minutes (editorial)
- Step 4: 10 minutes (diff check)

Total: ~2 hours before Phase 4 starts.

---

## 10. Strategic Note: The Moat Is Correct

The builder's analysis of the moat is accurate and should be preserved in planning:

> The moat is not the raw synonym file. That can be copied.
> The moat is: real query logs, zero-result intelligence, replacement behavior, curated concept graph, human-reviewed semantic judgments, agent acceptance outcomes, and shared ranking across site and MCP.

Phase 4's admin intelligence loop is what converts the current technical foundation into a **compounding proprietary advantage**. Code can be copied. A living judgment system with evidence accumulated over months cannot be replicated overnight.

The two-hour fix list above removes known defects before that evidence starts accumulating. Once the fixes land, every real query from a real user becomes a data point in a system that improves continuously.

---

*Audit completed April 17, 2026. All findings based on direct source code inspection of `main.js`, `mcp/search.js`, `lib/icon-semantic-aliases.js`, and `public/synonyms.json`.*
