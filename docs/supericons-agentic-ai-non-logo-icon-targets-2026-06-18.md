# Supericons Agentic AI Non-Logo Icon Targets

Date checked: 2026-06-18

This note proposes the next Supericons-native icon batch after the `agentic-ai-tools-logos-001` logo pack. The scope is deliberately non-logo: original icons, state icons, animated loaders, workflow glyphs, badges, and agentic work-surface symbols for AI products.

Local verification: `data/si-registry/source/libraries/supericons.json` currently has 50 records, and all 50 are `brand_identity`. This means the current Supericons library covers logo identity, but not yet the reusable agentic concepts that builders need inside products.

## Research Basis

Official source signals reviewed:

- OpenAI Agents SDK describes agents as apps that plan, call tools, collaborate across specialists, and keep state for multi-step work: https://developers.openai.com/api/docs/guides/agents
- OpenAI Agents SDK tool docs group tool use into hosted tools, local runtime tools, function tools, agents-as-tools, and workspace-scoped Codex tools: https://openai.github.io/openai-agents-python/tools/
- OpenAI Agents SDK handoff docs describe delegation between specialist agents and handoff payloads: https://openai.github.io/openai-agents-python/handoffs/
- OpenAI Agents SDK guardrail docs cover input guardrails, output guardrails, tool guardrails, and tripwires: https://openai.github.io/openai-agents-python/guardrails/
- OpenAI Agents SDK sessions docs cover client-side session memory and conversation history across agent runs: https://openai.github.io/openai-agents-python/sessions/
- OpenAI Agents SDK tracing docs track LLM generations, tool calls, handoffs, guardrails, and custom events in traces and spans: https://openai.github.io/openai-agents-python/tracing/
- MCP docs frame MCP as a standard for connecting AI applications to data sources, tools, and workflows: https://modelcontextprotocol.io/docs/getting-started/intro
- LangGraph persistence docs distinguish short-term checkpointers from long-term stores: https://docs.langchain.com/oss/python/langgraph/persistence
- Google Agent Development Kit docs emphasize agents, tools, workflow agents, dynamic routing, multi-agent systems, debugging, deployment, and scaling: https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk
- CrewAI docs emphasize collaborative agents, crews, flows, guardrails, memory, knowledge, observability, tasks, and human-in-the-loop triggers: https://docs.crewai.com/
- Microsoft Agent Framework handoff docs distinguish handoff orchestration from agents-as-tools by control flow, task ownership, and context management: https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff
- OpenTelemetry GenAI attributes include conversation IDs, retrieval documents, token usage, reasoning tokens, workflow names, evaluation score labels, and sensitive input/output message cautions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
- OWASP LLM Top 10 highlights prompt injection, insecure output handling, supply chain risk, sensitive information disclosure, insecure plugin design, excessive agency, and overreliance: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OpenAI evals docs confirm evals are important for testing model outputs, but also say the current Evals platform is scheduled to become read-only on 2026-10-31 and shut down on 2026-11-30. Use generic evaluation icons, not product-specific OpenAI Evals icons: https://developers.openai.com/api/docs/guides/evals

## Product Direction

The next batch should make Supericons useful for building AI-native products, not just showing AI brand marks.

Recommended pack:

```text
packId: agentic-ai-concepts-001
packName: Agentic AI Concepts
targetCount: 72
assetTypes: static_icon, state_icon, animated_loader, workflow_icon, badge, work_surface
defaultStyle: 24x24, 1.5px stroke, currentColor, rounded caps and joins
```

Why this pack matters:

- Generic libraries already have basic robots, loaders, databases, shields, and arrows.
- Agentic products need more specific concepts: context compaction, handoff, tool calls, checkpointers, guardrails, approval gates, trace spans, eval runs, and resumable work.
- These are original Supericons assets, so they can become premium sets without trademark concerns.
- The icons can power UI, docs, onboarding, MCP directories, agent marketplaces, admin dashboards, search result pages, and product diagrams.

## Priority Key

| Priority | Meaning |
| --- | --- |
| `P0` | Build first. These are core agentic primitives with high reuse across almost every AI app. |
| `P1` | Build after the core. Strong product value, especially for teams building agent infrastructure or production dashboards. |
| `P2` | Useful extension icons. Good for premium bento sets, docs, diagrams, and vertical-specific packs. |

## Target List

| # | Icon ID | Name | Priority | Asset type | Visual direction | Search terms |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `si:agent-core` | Agent Core | `P0` | `static_icon` | Rounded node with small orbiting capability dots. | ai agent, agent, assistant, autonomous agent |
| 2 | `si:plan-tree` | Plan Tree | `P0` | `workflow_icon` | Root task splitting into ordered branches. | plan, planning, agent plan, task plan |
| 3 | `si:task-decomposition` | Task Decomposition | `P1` | `workflow_icon` | Large task tile breaking into smaller tiles. | split task, subtask, task breakdown |
| 4 | `si:goal-stack` | Goal Stack | `P1` | `static_icon` | Layered goal cards with a small target mark. | goal, objective, agent goal, task stack |
| 5 | `si:instruction-card` | Instruction Card | `P1` | `static_icon` | Document card with directive lines and a lock notch. | instructions, system prompt, policy prompt |
| 6 | `si:reasoning-path` | Reasoning Path | `P1` | `workflow_icon` | Dotted path from question node to answer node. | reasoning, chain, decision path |
| 7 | `si:structured-output` | Structured Output | `P0` | `static_icon` | Braced object or table grid with check mark. | json, schema output, structured response |
| 8 | `si:confidence-meter` | Confidence Meter | `P2` | `state_icon` | Gauge with a small uncertainty band. | confidence, certainty, quality score |
| 9 | `si:tool-call` | Tool Call | `P0` | `workflow_icon` | Cursor or lightning entering a tool socket. | tool call, function call, call tool |
| 10 | `si:tool-result` | Tool Result | `P1` | `workflow_icon` | Tool socket returning a small result card. | tool result, function output, tool output |
| 11 | `si:tool-search` | Tool Search | `P1` | `static_icon` | Magnifier over small tool tiles. | tool search, discover tools, deferred tools |
| 12 | `si:mcp-client` | MCP Client | `P1` | `static_icon` | App window with connector port. | mcp client, ai client, connector |
| 13 | `si:mcp-server` | MCP Server | `P0` | `static_icon` | Server block exposing three tool/resource pins. | mcp server, server, tool server |
| 14 | `si:resource-link` | Resource Link | `P1` | `static_icon` | Chain link connected to document/database tile. | resource, mcp resource, data source |
| 15 | `si:prompt-template` | Prompt Template | `P1` | `static_icon` | Prompt card with variable braces. | prompt, prompt template, prompt variable |
| 16 | `si:schema-contract` | Schema Contract | `P0` | `static_icon` | Document plus bracketed fields and a seal. | schema, contract, tool schema, json schema |
| 17 | `si:context-window` | Context Window | `P0` | `state_icon` | Framed window with token blocks inside. | context window, context, prompt window |
| 18 | `si:context-budget` | Context Budget | `P1` | `state_icon` | Token blocks filling a small meter. | token budget, context budget, context limit |
| 19 | `si:context-compaction` | Context Compaction | `P0` | `workflow_icon` | Wide thread compressing into a compact summary card. | compaction, summarize context, compress context |
| 20 | `si:session-thread` | Session Thread | `P1` | `static_icon` | Chat turns connected by a vertical thread line. | session, thread, conversation history |
| 21 | `si:short-term-memory` | Short-Term Memory | `P1` | `state_icon` | Small memory chip with clock badge. | short term memory, session memory, checkpoint |
| 22 | `si:long-term-memory` | Long-Term Memory | `P1` | `state_icon` | Memory chip with archive layer or infinity mark. | long term memory, durable memory, store |
| 23 | `si:memory-checkpoint` | Memory Checkpoint | `P0` | `workflow_icon` | Snapshot marker on a timeline. | checkpoint, checkpointer, save state |
| 24 | `si:retrieval-source` | Retrieval Source | `P0` | `static_icon` | Document/database source emitting a grounded result. | retrieval, rag, grounding, source |
| 25 | `si:agent-handoff` | Agent Handoff | `P0` | `workflow_icon` | One agent node passing a baton or context capsule to another. | handoff, transfer agent, delegate |
| 26 | `si:agent-as-tool` | Agent As Tool | `P0` | `workflow_icon` | Agent node inside a tool socket. | agent as tool, subagent, callable agent |
| 27 | `si:supervisor-agent` | Supervisor Agent | `P1` | `workflow_icon` | Central agent node watching smaller worker nodes. | supervisor, orchestrator, manager agent |
| 28 | `si:specialist-agent` | Specialist Agent | `P1` | `static_icon` | Agent node with small expertise badge. | specialist agent, expert agent, domain agent |
| 29 | `si:collaboration-mesh` | Collaboration Mesh | `P1` | `workflow_icon` | Several peer nodes connected without a central owner. | multi agent, mesh, collaboration |
| 30 | `si:task-owner` | Task Owner | `P1` | `state_icon` | Task card held by one highlighted agent node. | ownership, task owner, responsible agent |
| 31 | `si:delegation-route` | Delegation Route | `P1` | `workflow_icon` | Arrow route through specialist checkpoints. | delegation, routing, agent routing |
| 32 | `si:critique-loop` | Critique Loop | `P2` | `workflow_icon` | Two arrows between draft and review nodes. | critique, review loop, self reflection |
| 33 | `si:approval-gate` | Approval Gate | `P0` | `state_icon` | Gate or checkpoint with human check mark. | approval, approve action, permission gate |
| 34 | `si:human-in-loop` | Human In Loop | `P0` | `workflow_icon` | Human dot inserted into an agent workflow loop. | human in the loop, review, oversight |
| 35 | `si:policy-guardrail` | Policy Guardrail | `P0` | `state_icon` | Rail or shield wrapping a path. | guardrail, policy, safety check |
| 36 | `si:tripwire` | Tripwire | `P1` | `state_icon` | Thin line across a path with alert spark. | tripwire, blocked, policy triggered |
| 37 | `si:prompt-injection-shield` | Prompt Injection Shield | `P0` | `static_icon` | Shield between prompt card and malicious arrow. | prompt injection, jailbreak, malicious prompt |
| 38 | `si:output-validation` | Output Validation | `P0` | `state_icon` | Output card passing through a check frame. | validate output, output guardrail, safety |
| 39 | `si:sensitive-data-mask` | Sensitive Data Mask | `P1` | `state_icon` | Text lines redacted behind a privacy shield. | pii, redaction, sensitive data, privacy |
| 40 | `si:sandbox-boundary` | Sandbox Boundary | `P1` | `static_icon` | App box inside a dashed isolation boundary. | sandbox, isolation, secure runtime |
| 41 | `si:durable-run` | Durable Run | `P0` | `workflow_icon` | Workflow path with a reinforced anchor. | durable execution, reliable agent, persistence |
| 42 | `si:resumable-run` | Resumable Run | `P0` | `state_icon` | Paused path restarting from checkpoint. | resume, resumable, continue run |
| 43 | `si:retry-loop` | Retry Loop | `P1` | `workflow_icon` | Circular arrow around a failed tool call. | retry, retry loop, recover |
| 44 | `si:long-running-task` | Long-Running Task | `P1` | `state_icon` | Timeline stretching past a clock marker. | long running, background task, async |
| 45 | `si:background-agent` | Background Agent | `P1` | `state_icon` | Agent node behind a small dimmed panel. | background agent, worker, async agent |
| 46 | `si:event-trigger` | Event Trigger | `P1` | `workflow_icon` | Lightning event entering a workflow node. | trigger, event, webhook, automation |
| 47 | `si:queue-worker` | Queue Worker | `P2` | `workflow_icon` | Queue cards flowing into worker node. | queue, worker, jobs, task queue |
| 48 | `si:rollback-run` | Rollback Run | `P2` | `state_icon` | Curved arrow returning to previous checkpoint. | rollback, undo run, restore state |
| 49 | `si:trace-span` | Trace Span | `P0` | `static_icon` | Nested timeline span bars. | trace, span, observability, telemetry |
| 50 | `si:trace-timeline` | Trace Timeline | `P1` | `workflow_icon` | Full timeline with model, tool, and guardrail markers. | trace timeline, agent trace, run log |
| 51 | `si:tool-call-log` | Tool Call Log | `P1` | `static_icon` | Log sheet with small tool-call rows. | logs, tool log, audit trail |
| 52 | `si:eval-run` | Eval Run | `P0` | `workflow_icon` | Test tube or checklist over output card. | eval, evaluation, test run |
| 53 | `si:eval-rubric` | Eval Rubric | `P1` | `static_icon` | Score grid with rubric rows. | rubric, scoring, evaluation criteria |
| 54 | `si:eval-score` | Eval Score | `P1` | `state_icon` | Score badge on model output. | score, eval score, quality score |
| 55 | `si:token-meter` | Token Meter | `P0` | `state_icon` | Token blocks counted by a meter. | tokens, token usage, cost, usage |
| 56 | `si:drift-monitor` | Drift Monitor | `P2` | `state_icon` | Trend line drifting outside a tolerance band. | drift, monitor, model drift, regression |
| 57 | `si:thinking-loader` | Thinking Loader | `P0` | `animated_loader` | Inner pulse moving around an agent core. | thinking, reasoning, ai loader |
| 58 | `si:planning-loader` | Planning Loader | `P1` | `animated_loader` | Branches appearing one by one in a plan tree. | planning, planning loader, agent planning |
| 59 | `si:tool-use-loader` | Tool Use Loader | `P0` | `animated_loader` | Orbiting tool dots briefly dock into a socket. | using tools, tool loading, function call |
| 60 | `si:browsing-loader` | Browsing Loader | `P1` | `animated_loader` | Cursor scanning webpage rows. | browsing, web agent, web search |
| 61 | `si:code-writing-loader` | Code Writing Loader | `P1` | `animated_loader` | Brackets typing into a code tile. | coding, code generation, writing code |
| 62 | `si:streaming-response` | Streaming Response | `P1` | `state_icon` | Output line growing from left to right. | streaming, response stream, live output |
| 63 | `si:queued-generation` | Queued Generation | `P2` | `state_icon` | Spark or output card waiting in a queue. | queued, generation queued, waiting |
| 64 | `si:paused-awaiting-user` | Paused Awaiting User | `P0` | `state_icon` | Pause mark beside a human approval dot. | awaiting user, needs input, blocked |
| 65 | `si:browser-agent` | Browser Agent | `P0` | `work_surface` | Browser window with agent core and cursor path. | browser agent, web automation, computer use |
| 66 | `si:research-agent` | Research Agent | `P0` | `work_surface` | Agent core over search results and source cards. | research agent, web research, source search |
| 67 | `si:code-agent` | Code Agent | `P0` | `work_surface` | Agent core beside terminal and code brackets. | coding agent, software agent, code assistant |
| 68 | `si:docs-agent` | Docs Agent | `P1` | `work_surface` | Agent core reading document stack. | document agent, docs, knowledge work |
| 69 | `si:meeting-agent` | Meeting Agent | `P2` | `work_surface` | Agent core with transcript bubbles and clock. | meeting agent, note taker, transcript |
| 70 | `si:data-room-agent` | Data Room Agent | `P2` | `work_surface` | Agent core inside secure folder/database room. | data room, due diligence, enterprise agent |
| 71 | `si:workflow-bento` | Workflow Bento | `P0` | `work_surface` | Four small tiles for plan, tool, memory, output. | workflow bento, agent dashboard, ui kit |
| 72 | `si:agent-marketplace` | Agent Marketplace | `P0` | `work_surface` | Storefront/grid of agent or tool cards. | agent marketplace, tool marketplace, agent store |

## Recommended First Build Sprint

Build the `P0` icons first as a 30-icon sprint:

`agent-core`, `plan-tree`, `structured-output`, `tool-call`, `mcp-server`, `schema-contract`, `context-window`, `context-compaction`, `memory-checkpoint`, `retrieval-source`, `agent-handoff`, `agent-as-tool`, `approval-gate`, `human-in-loop`, `policy-guardrail`, `prompt-injection-shield`, `output-validation`, `durable-run`, `resumable-run`, `trace-span`, `eval-run`, `token-meter`, `thinking-loader`, `tool-use-loader`, `paused-awaiting-user`, `browser-agent`, `research-agent`, `code-agent`, `workflow-bento`, `agent-marketplace`.

If the first sprint must be smaller, cut the five work-surface icons and ship the 25 primitives first.

## Metadata Shape

Use public-safe records focused on the asset, not on internal review process.

```js
{
  id: 'si:agent-handoff',
  library: 'si',
  pack: 'agentic-ai-concepts-001',
  name: 'Agent Handoff',
  asset_type: 'workflow_icon',
  category: 'multi_agent_orchestration',
  access_tier: 'premium_candidate',
  aliases: ['handoff', 'agent transfer', 'delegate to specialist'],
  search_terms: ['agent handoff', 'multi-agent', 'delegation', 'specialist agent'],
  source_basis: [
    'https://openai.github.io/openai-agents-python/handoffs/',
    'https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff'
  ],
  usage: {
    use_when: 'Use when an agent transfers task ownership or conversation control to another specialist agent.',
    avoid_when: 'Do not use for a simple arrow, file transfer, or generic share action.'
  },
  variants: ['mono.svg', 'animated.svg'],
  motion_meaning: 'A context capsule moves from one agent node to another.',
  verified_at: '2026-06-18'
}
```

## Visual System Notes

- Use the Supericons-native 24x24 grid, 1.5px stroke, rounded caps, rounded joins, and `currentColor`.
- Do not use brand logos or product marks in this pack.
- Avoid the generic AI sparkle as the main metaphor. Use it only as a small modifier when the icon would otherwise be ambiguous.
- Prefer clear agentic primitives: node, path, capsule, checkpoint, tool socket, guardrail, meter, trace span, and output card.
- For loaders, motion must explain state. A planning loader should visibly build branches. A tool-use loader should visibly dock into a tool. A thinking loader should pulse inward, not spin randomly.
- Keep most icons static, with optional `animated.svg` or `motion.css` variants for stateful premium assets.

## Access Tier Recommendation

Good free candidates:

- `si:agent-core`
- `si:tool-call`
- `si:context-window`
- `si:approval-gate`
- `si:thinking-loader`
- `si:browser-agent`

Good premium candidates:

- Animated loaders
- Work-surface icons
- Multi-agent orchestration icons
- Safety and guardrail set
- Observability and eval set
- Bento UI/workflow set

This lets Supericons offer a useful free entry point while selling high-quality original agentic systems as paid packs.

## Deferred Backlog

These are worth a later batch after the 72-icon base pack:

- `si:model-router`
- `si:model-fallback`
- `si:model-quorum`
- `si:tool-permission`
- `si:least-privilege-key`
- `si:cost-cap`
- `si:rate-limit`
- `si:hallucination-check`
- `si:citation-trail`
- `si:knowledge-graph-grounding`
- `si:vector-recall`
- `si:document-ocr-agent`
- `si:voice-agent`
- `si:realtime-agent`
- `si:computer-use`
- `si:screen-reader-agent`
- `si:agent-wallet`
- `si:revenue-share`
- `si:paid-tool`
- `si:affiliate-surface`
