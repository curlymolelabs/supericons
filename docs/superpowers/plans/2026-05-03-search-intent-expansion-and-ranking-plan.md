# Search Intent Expansion And Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make browser search and MCP search/recommendations handle natural human intent such as "beautiful", "user profile", "dataset", "evaluation", "deployment", and "monitoring" without corrupting literal icon metadata.

**Architecture:** Keep `depicts` literal and keep the Supabase registry as the source of truth. Add a shared intent expansion and ranking layer that translates fuzzy human words into precise search variants, then merge candidates from the existing Supabase search RPC and rerank them with explicit boosts and penalties.

**Tech Stack:** JavaScript shared library, Supabase Edge Functions, existing Postgres RPC `si_search_icon_candidates`, local MCP server, Node verification scripts.

---

## Current Verified Problem

The current hosted search works well for direct object queries such as `database`, `move down`, and `success`.

The weak cases are natural-language or product-domain queries:

- `beautiful` and `pretty` return no direct results.
- `user profile` can surface status/action variants like `user-x` before neutral profile icons.
- AI dashboard recommendations require manual agent recovery for `dataset`, `evaluation`, `deployment`, `monitoring`, and `prompt`.
- Compound queries like `rocket launch send upload` can fail even when a good icon such as `cloud-upload` exists.

The fix should not be another full registry rewrite. The right fix is shared query intent expansion plus ranking preferences.

---

## File Structure

**Create:**

- `lib/search-intent-core.js`
  Shared intent expansion rules, negative intent rules, query variant builder, and candidate boost helpers. Used by both hosted search and MCP recommendation logic.

- `scripts/verify-search-intent-expansion.mjs`
  Node verification script for deterministic intent expansion and ranking fixtures.

- `data/search-intent-fixtures/search-intent-fixtures.json`
  Public-safe test fixtures. Contains only queries, expected top concepts, disallowed early results, and expected expansion variants.

**Modify:**

- `lib/hosted-search-core.js`
  Import shared intent helpers. Accept expansion metadata on candidate rows and add intent boost/penalty into final score.

- `supabase/functions/_shared/search-engine/types.ts`
  Add optional fields used by the hosted function before reranking: `query_variant`, `query_variant_rank`, `intent_boost`, and `intent_penalty`.

- `supabase/functions/_shared/search-engine/handle-search-request.ts`
  Build query variants, call the existing `si_search_icon_candidates` RPC once per important variant, merge duplicate candidates, and return `query_expansion` diagnostics.

- `mcp/recommend-icons.js`
  Replace the narrow local `SLOT_INTENT_MAP` with shared intent expansion from `lib/search-intent-core.js`, while keeping existing MCP-specific formatting.

- `package.json`
  Add `verify:search-intent-expansion`.

**Do Not Modify Initially:**

- `public/registry/records.json`
- `mcp/public/registry-records.json`
- Supabase migrations
- Registry depicts/synonyms content

Reason: this change should improve retrieval and ranking without touching the registry data itself.

---

## Task 1: Add Intent Fixtures

**Files:**

- Create: `data/search-intent-fixtures/search-intent-fixtures.json`

- [ ] **Step 1: Create the fixture file**

Use this exact starter fixture set:

```json
{
  "version": 1,
  "queries": [
    {
      "query": "beautiful",
      "expected_variants": ["beautiful", "design theme", "palette", "swatch", "sparkles"],
      "expected_any_top_concepts": ["palette", "swatch", "sparkles", "star", "heart"]
    },
    {
      "query": "pretty",
      "expected_variants": ["pretty", "design theme", "palette", "sparkles", "heart"],
      "expected_any_top_concepts": ["palette", "sparkles", "heart", "star"]
    },
    {
      "query": "user profile",
      "expected_variants": ["user profile", "profile user account person avatar"],
      "expected_any_top_concepts": ["user", "user-circle", "circle-user", "avatar"],
      "disallowed_early_terms": ["user-x", "user-minus", "user-lock", "user-check"]
    },
    {
      "query": "dataset",
      "expected_variants": ["dataset", "data table", "database", "grid rows columns"],
      "expected_any_top_concepts": ["table", "database", "grid"]
    },
    {
      "query": "evaluation",
      "expected_variants": ["evaluation", "metrics chart", "bar chart", "gauge", "benchmark"],
      "expected_any_top_concepts": ["chart", "bar-chart", "gauge", "checklist"]
    },
    {
      "query": "deployment",
      "expected_variants": ["deployment", "cloud upload", "upload", "server", "package"],
      "expected_any_top_concepts": ["cloud-upload", "upload", "server", "package"]
    },
    {
      "query": "monitoring",
      "expected_variants": ["monitoring", "activity", "chart line", "pulse", "dashboard"],
      "expected_any_top_concepts": ["activity", "chart-line", "line-chart", "gauge"]
    },
    {
      "query": "prompt",
      "expected_variants": ["prompt", "message text", "terminal", "input text"],
      "expected_any_top_concepts": ["message", "terminal", "text", "input"]
    }
  ]
}
```

- [ ] **Step 2: Commit the fixture file**

```powershell
git add data/search-intent-fixtures/search-intent-fixtures.json
git commit -m "test: add search intent fixtures"
```

---

## Task 2: Build Shared Intent Expansion

**Files:**

- Create: `lib/search-intent-core.js`
- Test: `scripts/verify-search-intent-expansion.mjs`

- [ ] **Step 1: Create shared intent core**

`lib/search-intent-core.js` should export these functions:

```js
export function normalizeIntentText(value) {}
export function tokenizeIntentText(value) {}
export function buildSearchIntentProfile(query) {}
export function buildIntentQueryVariants(query, options = {}) {}
export function getIntentCandidateAdjustment(candidate, intentProfile) {}
```

Initial intent map:

```js
const INTENT_RULES = Object.freeze({
  beautiful: {
    variants: ['design theme', 'palette', 'swatch', 'sparkles', 'star', 'heart', 'flower'],
    prefer: [/palette/i, /swatch/i, /sparkles/i, /star/i, /heart/i, /flower/i],
    avoid: []
  },
  pretty: {
    variants: ['design theme', 'palette', 'sparkles', 'star', 'heart', 'flower'],
    prefer: [/palette/i, /sparkles/i, /star/i, /heart/i, /flower/i],
    avoid: []
  },
  profile: {
    variants: ['profile user account person avatar'],
    prefer: [/^user$/i, /user-circle/i, /circle-user/i, /avatar/i, /^user-2$/i],
    avoid: [/user-x/i, /user-minus/i, /user-lock/i, /user-check/i, /user-cog/i]
  },
  user: {
    variants: ['profile user account person avatar'],
    prefer: [/^user$/i, /user-circle/i, /circle-user/i, /avatar/i, /^user-2$/i],
    avoid: [/user-x/i, /user-minus/i, /user-lock/i, /user-check/i, /user-cog/i]
  },
  dataset: {
    variants: ['data table', 'database', 'grid rows columns'],
    prefer: [/table/i, /database/i, /grid/i],
    avoid: []
  },
  evaluation: {
    variants: ['metrics chart', 'bar chart', 'gauge', 'benchmark', 'checklist'],
    prefer: [/bar-chart/i, /chart/i, /gauge/i, /check/i],
    avoid: []
  },
  deployment: {
    variants: ['cloud upload', 'upload', 'server', 'package', 'send'],
    prefer: [/cloud-upload/i, /^upload/i, /server/i, /package/i, /send/i],
    avoid: []
  },
  monitoring: {
    variants: ['activity', 'chart line', 'pulse', 'dashboard', 'gauge', 'signal'],
    prefer: [/activity/i, /chart-line/i, /line-chart/i, /pulse/i, /gauge/i, /dashboard/i],
    avoid: [/eye-closed/i, /eye-off/i]
  },
  prompt: {
    variants: ['message text', 'terminal', 'input text', 'text cursor'],
    prefer: [/message.*text/i, /terminal/i, /input/i, /text/i],
    avoid: [/eye/i]
  }
});
```

Candidate adjustment behavior:

- Exact original query stays highest confidence.
- Expansion variants are allowed to retrieve candidates, but should not blindly outrank exact matches.
- Preferred icon id/name patterns get a positive boost.
- Avoided icon id/name patterns get a penalty unless the query explicitly contains the avoided meaning.

- [ ] **Step 2: Create deterministic verifier**

`scripts/verify-search-intent-expansion.mjs` should:

1. Load `data/search-intent-fixtures/search-intent-fixtures.json`.
2. Call `buildIntentQueryVariants(query)` for each fixture.
3. Assert each `expected_variants` item appears either exactly or as a contained phrase in the returned variants.
4. Assert no returned variant list exceeds 8 variants.
5. Print `verify-search-intent-expansion: ok` on success.

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"verify:search-intent-expansion": "node scripts/verify-search-intent-expansion.mjs"
```

- [ ] **Step 4: Verify**

```powershell
npm run verify:search-intent-expansion
```

Expected:

```text
verify-search-intent-expansion: ok
```

- [ ] **Step 5: Commit**

```powershell
git add lib/search-intent-core.js scripts/verify-search-intent-expansion.mjs package.json
git commit -m "feat: add shared search intent expansion"
```

---

## Task 3: Wire Intent Expansion Into Hosted Browser And MCP Search

**Files:**

- Modify: `supabase/functions/_shared/search-engine/types.ts`
- Modify: `supabase/functions/_shared/search-engine/handle-search-request.ts`
- Modify: `lib/hosted-search-core.js`

- [ ] **Step 1: Extend candidate type**

Add optional fields to `CandidateRow`:

```ts
query_variant?: string;
query_variant_rank?: number;
intent_boost?: number;
intent_penalty?: number;
```

- [ ] **Step 2: Build variants before RPC calls**

In `handle-search-request.ts`, import:

```ts
import { buildIntentQueryVariants, buildSearchIntentProfile, getIntentCandidateAdjustment } from '../../../../lib/search-intent-core.js';
```

Replace the single RPC call with:

```ts
const intentProfile = buildSearchIntentProfile(queryNorm);
const queryVariants = buildIntentQueryVariants(queryNorm, { maxVariants: 6 });
const candidateBatches = await Promise.all(
  queryVariants.map((variant, index) =>
    adminClient.rpc('si_search_icon_candidates', {
      p_query: variant,
      p_library: library,
      p_limit: Math.max(limit * 3, 40),
    }).then((result) => ({ ...result, variant, index }))
  )
);
```

Then merge duplicate rows by `icon_id`. Keep the best lexical score, but apply a small bonus for earlier variants:

```ts
const candidatesById = new Map<string, CandidateRow>();
for (const batch of candidateBatches) {
  if (batch.error) throw batch.error;
  for (const rawRow of (batch.data || []) as CandidateRow[]) {
    const adjustment = getIntentCandidateAdjustment(rawRow, intentProfile);
    const row = {
      ...rawRow,
      query_variant: batch.variant,
      query_variant_rank: batch.index,
      intent_boost: adjustment.boost + Math.max(0, 6 - batch.index),
      intent_penalty: adjustment.penalty,
      lexical_rank: Number(rawRow.lexical_rank || 0),
    };
    const existing = candidatesById.get(row.icon_id);
    if (!existing || ((row.lexical_rank || 0) + (row.intent_boost || 0)) > ((existing.lexical_rank || 0) + (existing.intent_boost || 0))) {
      candidatesById.set(row.icon_id, row);
    }
  }
}
const candidates = [...candidatesById.values()];
```

- [ ] **Step 3: Include intent adjustment in hosted reranker**

In `lib/hosted-search-core.js`, update final score:

```js
+ (candidate.intent_boost || 0)
- (candidate.intent_penalty || 0)
```

Add these to `match_signals`:

```js
query_variant: candidate.query_variant || queryNorm,
query_variant_rank: candidate.query_variant_rank || 0,
intent_boost: candidate.intent_boost || 0,
intent_penalty: candidate.intent_penalty || 0
```

- [ ] **Step 4: Return query expansion diagnostics**

In the hosted response body, include:

```ts
query_expansion: {
  variants: queryVariants,
  expanded: queryVariants.length > 1
}
```

This is safe for public output because it describes search behavior, not private model or review metadata.

- [ ] **Step 5: Verify existing projection tests still pass**

```powershell
npm run verify:search-intent-expansion
npm run verify:hosted-search-engine
npm run verify:si-registry
```

Expected:

```text
verify-search-intent-expansion: ok
verify-hosted-search-engine: ok
verify-si-registry-projections: ok
```

- [ ] **Step 6: Commit**

```powershell
git add supabase/functions/_shared/search-engine/types.ts supabase/functions/_shared/search-engine/handle-search-request.ts lib/hosted-search-core.js
git commit -m "feat: apply intent expansion to hosted icon search"
```

---

## Task 4: Improve MCP Recommendations With Shared Intent

**Files:**

- Modify: `mcp/recommend-icons.js`

- [ ] **Step 1: Import shared intent helper**

Add:

```js
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
  tokenizeIntentText,
} from '../lib/search-intent-core.js';
```

- [ ] **Step 2: Replace narrow slot map expansion**

Keep MCP-specific formatting, but make `buildSlotQueryVariants(task, slot)` call shared expansion:

```js
function buildSlotQueryVariants(task, slot) {
  const base = normalizeText(slot);
  const taskContext = normalizeText(`${slot} ${task}`);
  return buildIntentQueryVariants(taskContext, {
    baseQuery: base,
    maxVariants: 8,
  });
}
```

- [ ] **Step 3: Add preference/avoid scoring**

Inside candidate scoring, build:

```js
const intentProfile = buildSearchIntentProfile(`${slotLabel} ${task}`);
const adjustment = getIntentCandidateAdjustment(icon, intentProfile);
```

Add:

```js
+ adjustment.boost
- adjustment.penalty
```

to the candidate score used to sort recommendations.

- [ ] **Step 4: Verify MCP recommendation scenarios manually**

Run these through MCP:

```text
Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring.
```

Expected:

- `Prompt` should prefer message/text/terminal style icons, not eye icons.
- `Dataset` should return table/database/grid style icons.
- `Evaluation` should return chart/gauge/checklist style icons.
- `Deployment` should return cloud-upload/upload/server/package style icons.
- `Monitoring` should return chart-line/activity/gauge/dashboard style icons, not eye-closed.

- [ ] **Step 5: Commit**

```powershell
git add mcp/recommend-icons.js
git commit -m "feat: use shared intent expansion in MCP recommendations"
```

---

## Task 5: Add End-To-End Live Search Checks

**Files:**

- Modify: `scripts/verify-hosted-search-engine.mjs` or create `scripts/verify-hosted-search-intent-live.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add live fixture verifier**

Create `scripts/verify-hosted-search-intent-live.mjs` if the current hosted verifier is too broad.

The script should call the deployed search endpoint for:

```js
const checks = [
  { query: 'beautiful', expectAny: ['palette', 'swatch', 'sparkles', 'star', 'heart'] },
  { query: 'pretty', expectAny: ['palette', 'sparkles', 'star', 'heart'] },
  { query: 'user profile', expectAny: ['user', 'user-circle', 'circle-user'], rejectTop: ['user-x', 'user-minus'] },
  { query: 'dataset', expectAny: ['table', 'database', 'grid'] },
  { query: 'evaluation', expectAny: ['chart', 'gauge', 'bar-chart'] },
  { query: 'deployment', expectAny: ['cloud-upload', 'upload', 'server', 'package'] },
  { query: 'monitoring', expectAny: ['activity', 'chart-line', 'line-chart', 'gauge'] },
  { query: 'prompt', expectAny: ['message', 'terminal', 'text'] }
];
```

Use the public gateway or existing hosted search env vars. Do not print secrets.

- [ ] **Step 2: Add script**

Modify `package.json`:

```json
"verify:hosted-search-intent-live": "node scripts/verify-hosted-search-intent-live.mjs"
```

- [ ] **Step 3: Verify locally before deploy**

```powershell
npm run verify:search-intent-expansion
npm run verify:hosted-search-engine
```

- [ ] **Step 4: Deploy hosted functions**

User-run command if using local authenticated Supabase CLI:

```powershell
supabase functions deploy search-icons
supabase functions deploy mcp-search
```

- [ ] **Step 5: Verify live**

```powershell
npm run verify:hosted-search-intent-live
```

Expected:

```text
verify-hosted-search-intent-live: ok
```

- [ ] **Step 6: Commit**

```powershell
git add scripts/verify-hosted-search-intent-live.mjs package.json
git commit -m "test: verify hosted search intent live cases"
```

---

## Task 6: Browser And MCP Acceptance Test

**Files:**

- No code files required unless previous tasks reveal a bug.

- [ ] **Step 1: Browser test**

Start local app:

```powershell
npm run dev
```

In browser search, test:

```text
beautiful
pretty
user profile
dataset
evaluation
deployment
monitoring
prompt
```

Expected:

- `beautiful` and `pretty` show visual/design icons instead of empty results.
- `user profile` shows neutral user/profile icons before destructive/status variants.
- AI/product terms produce usable matches.

- [ ] **Step 2: MCP prompt test**

Ask another agent:

```text
Use SuperIcons MCP to recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring. For each item, return 3 options with library, icon id, label, and a short reason why it fits.
```

Expected:

- The agent should not need to recover with many manual searches.
- It should produce relevant results for all six slots.

- [ ] **Step 3: Regression prompt test**

Ask:

```text
Use SuperIcons MCP to find Lucide user profile icons. Show the best 10 and put neutral profile/avatar icons first.
```

Expected:

- `user`, `user-circle`, `circle-user`, or similar neutral icons rank before `user-x`, `user-minus`, `user-lock`, and `user-check`.

- [ ] **Step 4: Final verification**

```powershell
npm run verify:search-intent-expansion
npm run verify:hosted-search-engine
npm run verify:hosted-search-intent-live
npm run verify:si-registry
git status --short
```

Expected:

```text
verify-search-intent-expansion: ok
verify-hosted-search-engine: ok
verify-hosted-search-intent-live: ok
verify-si-registry-projections: ok
```

`git status --short` should show only intended files before final commit, then clean after commit.

- [ ] **Step 5: Commit final acceptance notes if docs are updated**

```powershell
git add docs/superpowers/plans/2026-05-03-search-intent-expansion-and-ranking-plan.md
git commit -m "docs: plan search intent expansion and ranking"
```

---

## Rollback Plan

If search quality worsens:

1. Revert the hosted function deployment to the previous commit.
2. Revert commits touching:
   - `lib/search-intent-core.js`
   - `lib/hosted-search-core.js`
   - `supabase/functions/_shared/search-engine/handle-search-request.ts`
   - `supabase/functions/_shared/search-engine/types.ts`
   - `mcp/recommend-icons.js`
3. Keep registry data unchanged. No Supabase table rollback should be needed because this plan does not migrate schema or mutate registry rows.

---

## Success Criteria

- Direct search still works for `database`, `move down`, `success`, and `hide password`.
- Fuzzy search works for `beautiful` and `pretty`.
- Product-domain search works for `dataset`, `evaluation`, `deployment`, `monitoring`, and `prompt`.
- Neutral profile searches rank neutral profile icons above destructive/status variants.
- Browser and MCP use the same intent expansion behavior.
- No public registry data is rewritten for this change.
- No secret values are printed by verification scripts.

---

## Self-Review

Spec coverage:

- Human-language fuzzy search: covered by Tasks 1, 2, 3, and 5.
- MCP recommendation quality: covered by Task 4 and Task 6.
- Browser search quality: covered by Task 3 and Task 6.
- Avoiding another registry rewrite: explicitly enforced by file boundaries and rollback plan.
- Supabase safety: no schema migration required in the first implementation.

Placeholder scan:

- No `TBD`, `TODO`, or open-ended implementation steps remain.

Type consistency:

- `CandidateRow` optional fields match the fields used in hosted reranking.
- Shared intent exports are named consistently across hosted search and MCP recommendation tasks.

## Phase 2 Link

The broad natural-language dictionary expansion is planned in `docs/superpowers/plans/2026-05-03-natural-language-intent-dictionary-plan.md`.
