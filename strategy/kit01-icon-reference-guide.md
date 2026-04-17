# Kit 01 — AI SaaS Dashboard Icon Reference Guide

Prepared: April 2026
Purpose: Curation reference for selecting icons from free libraries for Kit 01. Each entry covers what the icon looks like, what AI concept it represents, when to use it, and what not to use it for. These entries form the foundation for `usage-map.md`.

---

## Rule Before You Start

One icon per AI concept. One concept per icon. Every `usage-map.md` entry must answer: "Why this icon and not the obvious alternative?" That answer is the curation value.

---

## Lucide Icons

### `lucide:cpu`

**Looks like:** A square microchip with connector pins on all four sides.

**AI concept:** Compute resources, inference processing, "the model is running."

**Use for:**
- Inference compute metric in a cost dashboard
- CPU/GPU usage panel header
- Processing loading state while model is running
- Compute allocation or quota indicator

**Not for:** The model itself (use `brain`), speed (use `zap`), storage.

**Selection note:** `lucide:cpu` and `heroicons:cpu-chip` represent the same concept. Pick one based on which library dominates the rest of your kit. Do not use both.

---

### `lucide:brain`

**Looks like:** A simplified brain silhouette with left and right hemisphere outline.

**AI concept:** The AI model itself, reasoning capability, memory, knowledge.

**Use for:**
- Model section header
- AI Memory or Knowledge base label
- The agent's reasoning or thinking process indicator
- Model hub navigation item

**Not for:** Infrastructure (too biological), compute stats (use `cpu`), outputs (use `sparkles`).

**Selection note:** Most intuitive "the AI is thinking" icon. Reads immediately to any audience, technical or not.

---

### `lucide:network`

**Looks like:** A cluster of dots (nodes) connected by lines — topology or mesh diagram.

**AI concept:** Multi-agent systems, connected services, RAG retrieval graph, agent networks, knowledge graph.

**Use for:**
- Agent Network view header
- Connected data sources section
- Multi-model routing visualization
- Knowledge graph navigation item
- Integrations or Connections panel

**Not for:** Sequential pipelines (use `workflow`), speed (use `zap`), data storage.

**Selection note:** Network = mesh/parallel/interconnected. Workflow = sequential/directed. Do not conflate these two.

---

### `lucide:workflow`

**Looks like:** A simplified flow diagram with boxes connected by directed arrows.

**AI concept:** Pipelines, LangGraph/LangChain chains, processing sequences, orchestration flows, DAGs.

**Use for:**
- Pipeline view header
- Workflow builder navigation item
- Chain steps or Processing flow visualization
- LangGraph or n8n-style orchestration UI

**Not for:** Parallel/mesh architectures (use `network`), real-time streaming (use `signal` or `zap`).

**Selection note:** If users can see a clear "step 1 to step 2 to step 3" sequence, this is the right icon. If relationships are more "these things are connected," use `network`.

---

### `lucide:shuffle`

**Looks like:** Two arrows crossing — like the shuffle button on a music player.

**AI concept:** RAG retrieval (probabilistic, non-deterministic), semantic / vector search, sampling, random selection from a large space.

**Use for:**
- RAG retrieval step in a pipeline diagram
- Vector search indicator
- Sampling / temperature visualization
- Find similar or semantic search UX element
- Approximate nearest neighbor indicator

**Not for:** Deterministic sequential operations (use `workflow`), exact lookup (use a search icon).

**Selection note:** This is the counterintuitive but most accurate icon for RAG retrieval. The crossing arrows imply "finding across a space, not following a path." Do not use a magnifying glass for semantic search — magnifying glass implies exact text match, not probabilistic retrieval.

---

### `lucide:layers`

**Looks like:** Three or four horizontal stacked lines or sheets — like a stack of paper or geological strata.

**AI concept:** Model layers, embedding layers, abstraction layers, context stack, the R-A-G sequence as layered stages.

**Use for:**
- Embedding layer label in a model visualization
- Context layers in a prompt inspector
- Processing stack or abstraction levels visualization
- Model architecture overview header

**Not for:** Sequential steps (use `workflow`), connections (use `network`), compute (use `cpu`).

**Selection note:** Use when you want to communicate depth or multiple tiers. The RAG system (retrieval layer, augmentation layer, generation layer) is the canonical use case.

---

### `lucide:zap`

**Looks like:** A single diagonal lightning bolt / flash.

**AI concept:** Fast inference, instant mode, real-time triggers, streaming, webhook / event triggers, reactive processing.

**Use for:**
- Streaming mode toggle label
- Fast inference badge
- Trigger / event indicators
- Real-time status pill
- Webhook event indicator in agent workflow

**Not for:** Batch / async processing, slow jobs, anything that should feel deliberate rather than instant.

**Selection note:** `heroicons:bolt` serves the same purpose. Choose one. `zap` is slightly more universal (used in Vercel, Supabase branding). `bolt` feels slightly heavier visually.

---

### `lucide:bot`

**Looks like:** A cartoon robot face — two square eyes, simple antenna on top, rectangular head outline.

**AI concept:** AI agent, chatbot instance, automated assistant, the agent itself as an entity.

**Use for:**
- Agent label in a list of agents
- Chatbot interface entry point
- AI assistant section header
- Agent avatar placeholder in a roster

**Not for:** The underlying model or infrastructure (too toy-like for serious infra), observability, data.

**Selection note:** `bot` = the agent as a thing or entity. `brain` = the reasoning or intelligence inside it. An agent roster shows bots. A model selector shows brains.

---

### `lucide:sparkles`

**Looks like:** Three or four small star / glimmer shapes in a cluster — the universal "magic" sparkle pattern.

**AI concept:** AI-generated content, "powered by AI" badge, AI suggestions, generative output, AI enhancement applied.

**Use for:**
- AI-generated badge on content
- Enhance with AI button label
- AI suggestions section header
- Any user-facing feature that surfaces AI output
- Copilot or AI assist features

**Not for:** Backend infrastructure, technical AI concepts — this reads as user-facing consumer AI, not engineering infra.

**Selection note:** Now the globally understood "AI is here" signal — GitHub Copilot, Notion AI, Linear AI all use sparkles. Use it for anything your users directly experience as "this was made or improved by AI."

---

### `lucide:wand-2`

**Looks like:** A wand with a decorative star or sparkle at the tip.

**AI concept:** "Apply AI to this," one-click AI transformation, generate / rewrite action.

**Use for:**
- Auto-generate button
- Rewrite with AI action
- Transform CTA
- Any button that triggers an AI action on existing content

**Not for:** Showing that content IS AI-generated (use `sparkles`), infrastructure.

**Selection note:** `sparkles` = "AI was here." `wand-2` = "click to use AI." The distinction is passive vs active. An AI badge = sparkles. A generate button = wand-2.

---

### `lucide:git-merge`

**Looks like:** A git merge diagram — two lines (branches) converging into one, with nodes at the branch points.

**AI concept:** Context merging (the A in RAG = Augmentation), combining retrieved context with the user query, agent handoff, combining multiple outputs.

**Use for:**
- Augmentation step in a RAG pipeline diagram
- Context merge indicator
- Agent handoff visualization
- Combine results step in a multi-agent workflow
- Tool call result aggregation

**Not for:** Anything diverging (use a fork metaphor), pure retrieval (use `shuffle`), generation (use `sparkles`).

**Selection note:** In a RAG pipeline: Retrieve = `shuffle`, Augment = `git-merge`, Generate = `sparkles` or `wand-2`. This makes the three stages visually distinct and immediately readable.

---

### `lucide:eye`

**Looks like:** An eye — the classic open eye outline.

**AI concept:** Observability, tracing, monitoring what the model is doing internally, LLM ops (Langfuse, LangSmith, etc.), span tracing.

**Use for:**
- Observability section header
- Trace viewer navigation item
- Monitor tab label
- Inspect or Audit tool UI
- Span or trace logging indicator

**Not for:** Visibility in the access-control sense (use `lock` or `shield`), analytics (use `activity` or `trending-up`).

**Selection note:** In AI ops tooling, "observability" is a distinct category — seeing inside model calls, tracking spans, debugging prompts. `eye` is the correct icon for this specific concept. Do not use `activity` — that implies live metrics, not deep inspection.

---

### `lucide:activity`

**Looks like:** A heartbeat / ECG line — the oscillating waveform seen on a heart monitor.

**AI concept:** Real-time metrics, live system health, token throughput, current performance, live activity feed.

**Use for:**
- Live metrics widget header
- System health indicator
- Token throughput or requests per second chart label
- Activity feed section (recent events)
- Real-time usage monitoring dashboard

**Not for:** Historical trends (use `trending-up`), inspection / tracing (use `eye`), static counts.

**Selection note:** Activity = right now, live, pulse. Trending-up = direction over time. If the data refreshes every second, it's `activity`. If it shows a 30-day chart, it's `trending-up`.

---

### `lucide:trending-up`

**Looks like:** A line chart with an upward slope and an arrow at the end.

**AI concept:** Improving performance metrics, model improvement over time, usage growth, accuracy trends, cost trends.

**Use for:**
- Performance trends chart header
- Model improvement section
- Usage growth KPI widget
- Accuracy over time visualization
- Cost or efficiency trend indicators

**Not for:** Real-time current state (use `activity`), neutral or downward metrics.

**Selection note:** This implies positive direction. If you need a neutral "here is a chart," consider `bar-chart` or `line-chart` instead. Use `trending-up` specifically when the metric is expected to go up.

---

## Heroicons

### `heroicons:cpu-chip`

**Looks like:** A semiconductor chip — square with internal circuit traces or connector pins, often with more internal detail than Lucide:cpu.

**AI concept:** Same as `lucide:cpu` — inference compute, GPU/TPU usage, hardware resources.

**Selection note:** Choose `lucide:cpu` OR `heroicons:cpu-chip`. Not both. Default to whatever library is dominant in your kit.

---

### `heroicons:server-stack`

**Looks like:** Two or three stacked server or rack units — a typical data-center server tower stack.

**AI concept:** Model hosting infrastructure, LLM API server, backend deployment, self-hosted model setup.

**Use for:**
- Hosted on infrastructure indicator
- Model server status
- Deployment section header
- Self-hosted LLM configuration panel

**Not for:** Data storage (use `circle-stack` or `database`), cloud APIs (use `cloud`).

---

### `heroicons:circle-stack`

**Looks like:** Stacked circles or ovals — like a stack of coins or database table records.

**AI concept:** Vector database, embedded documents, stored embeddings, indexed knowledge base records.

**Use for:**
- Vector DB label
- Knowledge base section (specifically the stored or indexed data)
- Indexed documents count indicator
- Embeddings store label

**Not for:** Compute infrastructure (use `server-stack`), live retrieval (use `shuffle`).

**Selection note:** `circle-stack` = stored data records. `server-stack` = running machines. Use the first for data, the second for compute.

---

### `heroicons:cloud`

**Looks like:** Standard cloud outline.

**AI concept:** Cloud API calls to external models (OpenAI, Anthropic, Google), cloud deployment, remote model access.

**Use for:**
- Cloud API connection indicator
- Remote model badge
- Cloud deployment status
- External API provider label when no specific logo is available

---

### `heroicons:signal`

**Looks like:** Radiating arcs like wifi bars or radio waves — signal strength pattern.

**AI concept:** Streaming output, live token stream, SSE / WebSocket connection, real-time inference stream.

**Use for:**
- Streaming mode indicator
- Live connection status
- Token streaming visualization
- SSE / WebSocket connection health

**Selection note:** `signal` = the stream is actively flowing. `zap` = it was triggered or fast. Different moments in the user experience.

---

### `heroicons:bolt`

Same concept as `lucide:zap`. Use in Heroicons-heavy contexts for visual consistency.

---

### `heroicons:command-line`

**Looks like:** A terminal prompt — typically `>_` or `>` in a box.

**AI concept:** Prompt interface, raw model interaction, developer mode, CLI tools, direct API access.

**Use for:**
- Prompt input area header
- Developer mode toggle label
- Direct model interaction panel
- Raw API or terminal-style interface indicator

---

### `heroicons:cog-6-tooth`

**Looks like:** A gear with 6 teeth.

**AI concept:** Model configuration, inference parameters, system settings (temperature, max tokens, system prompt, model selection).

**Use for:**
- Model settings panel header
- Configuration tab
- Parameter tuning UI entry point
- System configuration for the AI layer

**Not for:** Orchestration or coordination — cog implies static config, not dynamic coordination.

---

## Phosphor Icons

### `phosphor:robot`

Same concept as `lucide:bot`. Use in Phosphor-heavy contexts.

---

### `phosphor:graph`

**Looks like:** Nodes and edges in a mathematical graph — more abstract than `lucide:network`.

**AI concept:** Knowledge graph, entity relationship visualization, graph-based RAG (GraphRAG), entity linking.

**Use for:** GraphRAG or knowledge graph-specific contexts where "graph as data structure" is the intended reading.

---

### `phosphor:flow-arrow`

**Looks like:** An arrow that bends or flows — directional path indicator.

**AI concept:** Data flow direction, input to output direction, pipeline stage direction arrows.

**Use for:** Showing directionality within a pipeline diagram — the arrow between stages, not the stage itself.

---

### `phosphor:lightning`

Same concept as `lucide:zap` / `heroicons:bolt`. Choose one source library per concept across the kit.

---

### `phosphor:database`

**Looks like:** The classic cylinder or barrel database icon.

**AI concept:** Data persistence, traditional database, SQL / relational data layer, any persistent data store.

**Use for:** The data persistence layer in a system diagram, database connections, data store labels.

---

## Tabler Icons

### `tabler:brain` + `tabler:network`

Same concepts as the Lucide equivalents. Use in Tabler-heavy contexts for visual consistency.

---

### `tabler:api`

**Looks like:** Often rendered as "API" framed in a box, or as connected data blocks suggesting an interface boundary.

**AI concept:** API calls, REST / GraphQL endpoints, tool calls (function calling), external service calls from an agent.

**Use for:**
- API calls metric label
- Tool calls count in agent observability
- Integrations entry point
- Function or tool use visualization in an agent trace

**Selection note:** Specifically "calling an external interface." When an agent makes tool calls, each tool call is an API event. This is the right icon for that concept.

---

### `tabler:cloud-computing`

**Looks like:** A cloud combined with a CPU or grid symbol — cloud with circuit or compute pattern inside.

**AI concept:** Cloud inference, hosted AI compute, inference-as-a-service.

**Use for:** Cloud AI compute label when you want to distinguish cloud-hosted inference from local or self-hosted inference.

---

## Selection Strategy

Apply this process for each icon in the kit:

1. Identify the AI concept you need to represent (RAG retrieval, agent handoff, observability, etc.)
2. Find the candidate icon from the list above
3. Ask: does the visual shape match the concept without explanation?
4. If yes: write the usage-map.md entry. If no: pick a different icon.
5. Check for conflicts: is this icon already assigned to a different concept in the kit?
6. Write the "chosen over X because Y" rationale. This is the curation value.

The usage-map.md entry format:

```
## icon-name (library:icon-name)

**Concept:** [one-line AI concept label]
**Use for:** [2-4 bullet points of specific UI surfaces]
**Not for:** [1-2 bullet points of contraindications]
**Chosen over:** [alternative icon] because [1 sentence rationale]
**Pairs with:** [2-3 other icons commonly used in the same UI surface]
```
