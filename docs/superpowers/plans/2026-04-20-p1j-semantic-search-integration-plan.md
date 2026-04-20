# Semantic Search Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MCP search actually benefit from the approved SI semantic records by retrieving and merging semantically relevant icons into the candidate set.

**Architecture:** Keep the current search engine intact as the base layer. Add a small semantic retrieval layer on top of the public-safe registry records, then merge those semantic matches into MCP search results so reviewed icons can appear even when lexical search misses them.

**Tech Stack:** Node.js ESM modules, existing MCP server, public-safe registry JSON artifacts, local search benchmark harness.

---

## Scope

- do not replace the current search engine
- do not widen semantic coverage yet
- do add semantic-aware retrieval for the existing reviewed records
- do rerun the usefulness benchmark to see if the result set improves

## Files

- Modify: `mcp/semantic-registry.js`
- Modify: `mcp/index.js`
- Modify: `scripts/evaluate-agent-semantic-usefulness.mjs`
- Create or update: `docs/superpowers/plans/2026-04-20-agent-semantic-usefulness-report.html`

## Tasks

### Task 1: Add semantic retrieval helpers

- [ ] Add a helper that can score all public semantic records against a query.
- [ ] Add a helper that returns the best semantic record matches above a reasonable threshold.
- [ ] Keep the payload public-safe and free of internal workflow metadata.

### Task 2: Merge semantic results into MCP search

- [ ] Keep hosted or local search as the base result set.
- [ ] Add semantic matches from approved records when they are not already present.
- [ ] Preserve existing direct and alias matches ahead of weak semantic guesses.
- [ ] Cap the merged result list to the requested limit.

### Task 3: Update the benchmark to test retrieval lift

- [ ] Change the usefulness benchmark so it compares:
  - baseline lexical search
  - semantic-augmented search result set
  - semantic-assisted best pick from that result set
- [ ] Record whether the expected icon now appears in top `N`.

### Task 4: Regenerate the report and verify

- [ ] Run:
  - `npm run evaluate:agent-semantic-usefulness`
  - `npm run verify:search-query-fixtures`
  - `npm run build`
- [ ] Confirm the report shows whether semantic retrieval actually improved candidate coverage.
