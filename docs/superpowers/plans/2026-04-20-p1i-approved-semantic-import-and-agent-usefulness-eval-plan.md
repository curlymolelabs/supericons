# Approved Semantic Import And Agent Usefulness Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the 30 approved free-icon semantic records into the real SI Registry output path, expose those semantics in one agent-facing MCP surface, and generate a before-vs-after usefulness report.

**Architecture:** Keep the import narrow and safe. The approved purpose-chip records will become an additional free record group in the registry build, the public-safe registry projection will emit an MCP-ready semantic artifact, and MCP search/get-icon responses will attach those semantics when present. A separate evaluation script will benchmark whether the enriched metadata helps an agent choose better icons from the same search candidate set.

**Tech Stack:** Node.js ESM scripts, JSON registry artifacts, MCP server on `@modelcontextprotocol/sdk`, existing local fallback search fixtures, Vite build pipeline.

---

## File Map

- Modify: `data/si-registry/registry-manifest.json`
  - Register the approved purpose-chip records as a first-class free record group.
- Modify: `lib/si-registry/projections.js`
  - Build a reusable public semantic record artifact for agent/tool consumption.
- Modify: `scripts/build-si-registry-projections.mjs`
  - Emit the new registry records artifact into both site and MCP public folders.
- Modify: `scripts/verify-si-registry-projections.mjs`
  - Update counts and verify the new free semantic records are present in public-safe outputs.
- Create: `mcp/semantic-registry.js`
  - Load public-safe semantic records and attach them to tool payloads.
- Modify: `mcp/index.js`
  - Attach semantic metadata to at least `search_icons` and `get_icon` responses when available.
- Modify: `mcp/package.json`
  - Ensure the new MCP public semantic artifact is included in packaged files.
- Create: `data/si-registry/benchmarks/agent-usefulness-fixtures.json`
  - Fixed prompt set for before-vs-after agent usefulness evaluation.
- Create: `scripts/evaluate-agent-semantic-usefulness.mjs`
  - Compare baseline search ranking against semantic-assisted candidate selection.
- Create: `docs/superpowers/plans/2026-04-20-agent-semantic-usefulness-report.html`
  - Simple layman-language snapshot of what improved after semantic exposure.
- Modify: `package.json`
  - Add a runnable script for the new evaluation harness.

## Task 1: Import Approved Records Into The Registry Build

**Files:**
- Modify: `data/si-registry/registry-manifest.json`
- Modify: `lib/si-registry/projections.js`
- Modify: `scripts/build-si-registry-projections.mjs`
- Test: `scripts/verify-si-registry-projections.mjs`

- [ ] Add the approved-record group to the registry manifest with `sourceGroup: "free"` and `path: "pilot/purpose-chip/approved-records.json"`.
- [ ] Add a projection artifact for full public-safe records, not just the current summary/preview files.
- [ ] Emit the public-safe record artifact to:
  - `public/registry/records.json`
  - `mcp/public/registry-records.json`
- [ ] Rebuild the registry projections and update verification to reflect the new totals:
  - total records: `436`
  - free records: `36`
  - premium records: `400`
  - public records: `36`

## Task 2: Expose Semantic Metadata To Agents Through MCP

**Files:**
- Create: `mcp/semantic-registry.js`
- Modify: `mcp/index.js`
- Modify: `mcp/package.json`

- [ ] Load the new `mcp/public/registry-records.json` artifact at MCP startup.
- [ ] Build a lightweight `semantic` payload for agent use that includes only public-safe meaning fields such as:
  - `label`
  - `purpose`
  - `category`
  - `semantic_tags`
  - `synonyms`
  - `use_when`
  - `avoid_when`
  - `depicts`
  - `intent`
  - `domain`
  - `confidence`
- [ ] Attach that `semantic` payload to `search_icons` results when a matching public registry record exists.
- [ ] Attach the same `semantic` payload to `get_icon` results when available.
- [ ] Keep behavior unchanged for icons that do not yet have approved semantic records.

## Task 3: Build The Agent Usefulness Evaluation Harness

**Files:**
- Create: `data/si-registry/benchmarks/agent-usefulness-fixtures.json`
- Create: `scripts/evaluate-agent-semantic-usefulness.mjs`
- Modify: `package.json`

- [ ] Create a benchmark set of real user-style icon prompts that rely on the approved semantic records, for example:
  - `assistant reply`
  - `trusted protection`
  - `blocked action`
  - `delete item`
  - `code search`
  - `refresh results`
- [ ] For each fixture, measure:
  - baseline first result from current search ranking
  - whether the expected icon appears in top `N`
  - semantic coverage inside top `N`
  - semantic-assisted pick among those same candidates
- [ ] Output a JSON report that makes it clear whether semantic metadata improves the agent’s ability to choose the right icon without changing the underlying search engine.

## Task 4: Publish A Human-Readable Checkpoint Report

**Files:**
- Create: `docs/superpowers/plans/2026-04-20-agent-semantic-usefulness-report.html`

- [ ] Summarize, in plain language, what changed after importing the 30 approved records.
- [ ] Show the new registry count, the MCP semantic exposure state, and the evaluation headline metrics.
- [ ] Keep the page public-safe and easy to read, with no internal model/process details.

## Verification

- [ ] Run: `npm run build:si-registry`
- [ ] Run: `npm run verify:si-registry`
- [ ] Run: `node scripts/evaluate-agent-semantic-usefulness.mjs`
- [ ] Run: `npm run verify:search-query-fixtures`
- [ ] Run: `npm run build`

## Expected Outcome

- The approved 30 free semantic records are part of the real public registry output.
- MCP search/get-icon results expose public-safe SI semantics for matching icons.
- We have a repeatable benchmark showing whether those semantics actually help an agent choose better icons.
- We have one simple HTML report that explains where we are now in layman language.
