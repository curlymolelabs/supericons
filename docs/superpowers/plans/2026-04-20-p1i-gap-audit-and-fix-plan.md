# P1-I Gap Audit And Fix Plan

**Scope audited:** approved semantic record import into the live registry path, MCP semantic exposure, and the planned agent usefulness evaluation layer.

**Audit date:** 2026-04-20

---

## Current Completion Status

### Completed

1. **Approved records are now part of the real registry build path**
   - `data/si-registry/registry-manifest.json` includes the approved purpose-chip records as a free record group.
   - `scripts/build-si-registry-projections.mjs` now emits:
     - `public/registry/records.json`
     - `mcp/public/registry-records.json`
   - `scripts/verify-si-registry-projections.mjs` was updated and passes with the new totals:
     - `436` total records
     - `36` free public-safe records
     - `400` premium protected records

2. **MCP semantic exposure was started and is functionally wired**
   - `mcp/semantic-registry.js` exists and can:
     - load `mcp/public/registry-records.json`
     - build a semantic map
     - attach a trimmed `semantic` payload
   - `mcp/index.js` attaches that semantic payload inside `buildToolIconResult`, which feeds both `search_icons` and `get_icon`.
   - `mcp/package.json` now includes the new registry record artifacts in package files.

3. **Build and narrow verification passed**
   - `npm run build:si-registry`
   - `npm run verify:si-registry`
   - `npm run verify:search-query-fixtures`
   - `npm run build`
   - `node --check mcp/index.js`
   - `node --check mcp/semantic-registry.js`

### Started But Not Finished

1. **Benchmark fixtures exist**
   - `data/si-registry/benchmarks/agent-usefulness-fixtures.json`
   - This means the benchmark prompt set was started.

2. **Plan docs exist**
   - `docs/superpowers/plans/2026-04-20-p1i-approved-semantic-import-and-agent-usefulness-eval-plan.md`
   - `docs/superpowers/plans/2026-04-20-p1i-approved-semantic-import-and-agent-usefulness-eval-plan.html`

### Not Complete

1. **No evaluation harness script yet**
   - Missing: `scripts/evaluate-agent-semantic-usefulness.mjs`

2. **No package script to run the evaluation**
   - `package.json` does not include an evaluation command for this step.

3. **No generated usefulness report yet**
   - Missing the planned human-readable output that explains whether agents actually benefit.

4. **No dedicated end-to-end verification artifact for MCP semantic exposure**
   - The helper works and build passes, but there is no committed script/report yet that proves:
     - a benchmark query
     - top search candidates
     - semantic coverage
     - semantic-assisted pick
     - before-vs-after result summary

---

## Audit Verdict

**Verdict:** `P1-I` is **partially complete, not complete**.

### What is truly done

- The approved semantic records are now in the live registry output path.
- MCP has the code needed to attach semantic metadata to tool results.
- The build still passes after these changes.

### What is still missing

- The actual proof layer.
- We do not yet have the script and report that answer:
  - “Does this help an AI agent choose the right icon better than before?”

That proof layer was part of the planned step, so the step should not be marked complete yet.

---

## Gaps To Fix

### Gap 1: Missing evaluation harness

**Why it matters:**  
Without a repeatable benchmark script, the work is only “wired,” not measured.

**Fix:**  
Create `scripts/evaluate-agent-semantic-usefulness.mjs` that:
- loads the benchmark fixtures
- runs baseline search using the current search engine
- loads semantic records from `mcp/public/registry-records.json`
- calculates semantic coverage in the top `N`
- chooses a semantic-assisted pick from the same candidate list
- writes a JSON summary

### Gap 2: Missing npm script

**Why it matters:**  
There is no single command to rerun the evaluation cleanly.

**Fix:**  
Add a script in `package.json`, for example:
- `evaluate:agent-semantic-usefulness`

### Gap 3: Missing layman-language report

**Why it matters:**  
Right now there is no simple output you can open and inspect to understand the result of the benchmark.

**Fix:**  
Generate:
- a JSON metrics artifact in `data/si-registry/generated/`
- a plain-language HTML report in `docs/superpowers/plans/`

### Gap 4: No durable proof artifact for MCP semantic exposure

**Why it matters:**  
The helper-level smoke checks are useful, but they are not yet a durable project artifact.

**Fix:**  
Use the evaluation script to also record:
- semantic coverage across benchmark queries
- sample enriched tool payloads
- expected icon hit rate

---

## Fix Plan

### Task 1: Build the evaluation harness

**Files**
- Create: `scripts/evaluate-agent-semantic-usefulness.mjs`
- Use: `data/si-registry/benchmarks/agent-usefulness-fixtures.json`
- Use: `mcp/semantic-registry.js`
- Use: `mcp/search.js`

**Outcome**
- A JSON result file that shows baseline vs semantic-assisted benchmark results.

### Task 2: Add one runnable command

**Files**
- Modify: `package.json`

**Outcome**
- One command to rerun the usefulness benchmark on demand.

### Task 3: Publish a simple checkpoint report

**Files**
- Create: `docs/superpowers/plans/2026-04-20-agent-semantic-usefulness-report.html`
- Create: `data/si-registry/generated/agent-semantic-usefulness-report.json`

**Outcome**
- A layman-language page that explains whether the semantic layer improved agent usefulness.

### Task 4: Re-verify after completion

**Run**
- `npm run build:si-registry`
- `npm run verify:si-registry`
- `npm run evaluate:agent-semantic-usefulness`
- `npm run verify:search-query-fixtures`
- `npm run build`

**Outcome**
- This step can only be marked complete if the evaluation outputs exist and the build still passes.

---

## Recommended Next Move

Do **not** start importing more semantic records yet.

The next best move is to finish the missing evaluation layer first, because this is the point where we prove whether the new semantic metadata is actually useful for AI agents in practice.
