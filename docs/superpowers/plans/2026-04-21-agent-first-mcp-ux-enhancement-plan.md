# Agent-First MCP UX Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supericons MCP easy for any agent to use well, even when the agent has weak reasoning, weak search strategy, or poor visual judgment.

**Architecture:** Keep the current search and semantic registry foundation, but add an agent-first recommendation layer on top. The MCP should handle intent normalization, semantic retrieval, graceful fallback, and preview-oriented output so agents do not need to manually break a design problem into brittle keyword searches.

**Tech Stack:** Node.js ESM modules, existing MCP server, SI semantic registry JSON, local search fallback, benchmark scripts, plain-language HTML docs.

---

## Why This Enhancement Exists

The recent external MCP client test showed a mixed result:

- the MCP server connected correctly
- MingCute retrieval worked for simple single-word queries
- the agent still had to manually simplify natural requests into keyword fragments
- one search returned a raw hosted `502` error
- the preview experience fell back to raw SVG text instead of a clean visual review surface

This means the system worked as infrastructure, but the **agent experience** still put too much burden on the agent.

The real design question is:

- if a weaker agent than Kimi used this MCP, would it still choose the right icon without manual prompt gymnastics?

Right now the answer is:

- sometimes yes for obvious keyword matches
- not yet for consistent product-quality icon recommendation

## What We Learned

### 1. The SI semantic data **did** help

The semantic usefulness benchmark already proved that semantic retrieval improves candidate quality when the retrieval layer uses it:

- baseline top-1: `1 / 12`
- semantic-augmented top-1: `11 / 12`
- semantic-assisted pick: `11 / 12`

So the issue is **not** that semantic tagging failed.

The issue is:

- the current MCP UX does not always expose that benefit in the easiest possible way for agents

### 2. The current MCP is still too search-primitive

Today the agent often has to:

1. guess a keyword
2. try `search_icons`
3. inspect raw results
4. reformulate the query
5. fetch the chosen icon
6. mentally compare raw SVG output

That is too much reasoning overhead for a repetitive workflow.

### 3. We should optimize for the weakest competent agent

If the MCP is only pleasant for a strong reasoning model, the UX is not finished.

The right target is:

- a weaker agent should still get to a good answer by following the tool contract
- a stronger agent should simply get there faster and with better judgment

## North Star

An agent should be able to solve this request in one clean pass:

> "Find the best MingCute icons for these 4 navigation buttons and show previews before implementation."

without needing to:

- manually decompose the prompt into single-word searches
- recover from raw hosted errors
- read raw SVG text to compare candidates

## Design Principles

### Human-centered design principle

The tool should fit the way designers and agents actually think:

- "I need an icon for Home"
- not "I need to guess which token in this library matches the right lexical string"

### Lower the reasoning tax

The MCP should do more of the routine work:

- normalize intent
- expand likely synonyms
- search semantic fields
- compare close matches
- prepare preview-ready candidates

### Graceful failure

The local MCP should never surface a raw hosted `502` when it has local data available.

### Preview before action

If the user asks to review before implementation, the tool response should make that easy by design.

### Capability-agnostic UX

The MCP should be usable by:

- weak agents
- medium agents
- strong agents

without requiring different prompts for each capability level.

## Desired End State

After this enhancement, an external MCP client should be able to do this in one or two tool calls:

1. ask for icon recommendations for UI slots
2. receive:
   - recommended icons
   - compact rationale
   - semantic fit explanation
   - preview-ready payload
3. optionally fetch the final icon for implementation

## Files

- Modify: `mcp/index.js`
- Modify: `mcp/search.js`
- Modify: `mcp/semantic-registry.js`
- Modify: `mcp/package.json`
- Create: `mcp/recommend-icons.js`
- Create: `scripts/evaluate-agent-first-mcp-ux.mjs`
- Create: `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`
- Create: `docs/superpowers/plans/2026-04-21-agent-first-mcp-ux-report.html`

## Tasks

### Task 1: Define the agent UX contract

**Files:**
- Create: `data/si-registry/benchmarks/agent-first-mcp-ux-fixtures.json`
- Modify: `docs/superpowers/plans/2026-04-21-agent-first-mcp-ux-enhancement-plan.md`

- [ ] Define benchmark prompts that reflect real agent tasks instead of isolated keyword lookup.
- [ ] Include at least these prompt types:
  - bottom navigation icon replacement
  - destructive action icon choice
  - trust or security icon choice
  - AI or workflow icon choice
  - menu and navigation icon choice
- [ ] Define success criteria:
  - no manual query splitting required
  - no raw transport or hosted errors shown to the agent
  - preview-ready output available before implementation
  - top candidate suitable without requiring a human to reinterpret raw SVG code

### Task 2: Make local MCP search resilient by default

**Files:**
- Modify: `mcp/index.js`

- [ ] Change local MCP search behavior so hosted search failure does not bubble raw `502` errors to the agent when local data is available.
- [ ] Use local fallback automatically for local stdio installs unless explicitly disabled.
- [ ] Return agent-safe error messaging only when both hosted and local search fail.
- [ ] Keep telemetry and debug logging internal rather than leaking operational details into tool output.

### Task 3: Improve multi-word natural-language retrieval

**Files:**
- Modify: `mcp/search.js`
- Modify: `mcp/semantic-registry.js`

- [ ] Relax the current lexical search so natural phrases like:
  - `notification bell alert`
  - `user profile person account`
  - `home button`
  - `create add plus`
  do not collapse into zero results unnecessarily.
- [ ] Add phrase scoring that distinguishes:
  - exact intent matches
  - close semantic matches
  - weak lexical approximations
- [ ] Use semantic fields more directly in ranking:
  - `purpose`
  - `semantic_tags`
  - `synonyms`
  - `intent`
  - `category`
- [ ] Add tie-break rules that prefer approved semantic records over weak lexical-only matches.

### Task 4: Add an agent-first recommendation tool

**Files:**
- Create: `mcp/recommend-icons.js`
- Modify: `mcp/index.js`

- [ ] Add a new MCP tool focused on recommendation rather than raw lookup.
- [ ] Proposed tool name:
  - `recommend_icons`
- [ ] Proposed input shape:
  - `task`
  - `library`
  - `slots`
  - `limit_per_slot`
- [ ] Example slot values:
  - `home tab`
  - `create action`
  - `alerts tab`
  - `profile tab`
- [ ] Return for each slot:
  - top recommended icon id
  - 2 to 4 alternatives
  - short human-readable reason
  - semantic fit summary
  - preview-ready SVG payload
- [ ] This tool should encapsulate the multi-step reasoning that agents currently do manually.

### Task 5: Add preview-friendly output

**Files:**
- Modify: `mcp/index.js`
- Modify: `mcp/recommend-icons.js`

- [ ] Return preview-ready structures instead of forcing the agent to compare raw SVG text blobs in prose.
- [ ] Keep output lightweight and public-safe.
- [ ] Include:
  - `id`
  - `library`
  - `label`
  - `purpose`
  - `svg`
  - `semantic_fit`
  - `why_selected`
- [ ] Add a compact mode designed for external MCP clients that show JSON blocks more easily than rendered images.
- [ ] Ensure the output is still readable when the client cannot render SVG inline.

### Task 6: Measure UX across agent capability levels

**Files:**
- Create: `scripts/evaluate-agent-first-mcp-ux.mjs`
- Modify: `package.json`
- Create: `docs/superpowers/plans/2026-04-21-agent-first-mcp-ux-report.html`

- [ ] Benchmark three interaction styles:
  - weak-agent behavior: direct natural prompt, no manual query splitting
  - medium-agent behavior: one retry allowed
  - strong-agent behavior: multi-step recovery allowed
- [ ] Record:
  - success rate
  - tool-call count
  - preview usefulness
  - raw error exposure
  - top candidate suitability
- [ ] Use the benchmark to answer:
  - is the MCP now good for all agents?
  - where does capability still matter?

### Task 7: Rollout rules

**Files:**
- Modify: `mcp/index.js`
- Modify: `mcp/package.json`

- [ ] Keep `search_icons` and `get_icon` as base tools.
- [ ] Add the new recommendation workflow without breaking current clients.
- [ ] Make recommendation the preferred path in docs for design-selection tasks.
- [ ] Keep the simpler tools for exact lookup, export, and scripting use cases.

## Acceptance Criteria

- natural multi-word icon-selection requests no longer require manual single-word recovery
- local MCP does not expose raw hosted `502` failures when local search can answer
- agents can review candidates before implementation without reading long raw SVG blobs in prose
- weaker agents can complete common icon-selection tasks with a small number of tool calls
- the usefulness report shows improved performance for direct natural-language tasks, not just benchmark cherry-picks

## Risks

- over-weighting semantic data may bury exact library-specific matches
- preview payloads could become too heavy if not kept compact
- too much automation in recommendation could hide important alternatives from advanced agents

## Mitigations

- keep exact lookup tools unchanged
- keep recommendation output transparent and include alternatives
- use benchmark fixtures from real product tasks, not only idealized prompts
- measure both accuracy and tool-call count

## Recommended Next Move

Implement this enhancement in one small vertical slice first:

1. local fallback safety
2. `recommend_icons` tool
3. bottom navigation benchmark
4. preview-friendly output

That gives a visible before-and-after improvement quickly, without redesigning the whole MCP surface at once.
