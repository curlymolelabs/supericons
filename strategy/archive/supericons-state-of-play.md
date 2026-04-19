# Supericons: What We Have and What We Need to Build

A definitive state-of-play document consolidating all strategy docs.

---

## Part 1: What We Have Today

### 1. Icon Search Engine (supericons.dev)

**What it is**: A search aggregator for 20,000+ free icons across 10 open-source libraries.

**Libraries**: Material Symbols, Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Iconoir, Ionicons, Simple Icons, MingCute.

**Features**:
- AI-powered semantic search (hosted search with synonym expansion)
- Customization panel: colors, sizes, containers
- Multi-format export: raw SVG, React, Vue, Svelte components
- Batch export (ZIP via JSZip)
- Umami analytics tracking
- SEO: structured data, OG tags, canonical URLs

**Current positioning (hero text)**: "20,000+ free icons, one search."

---

### 2. Premium Animated Collections

**What exists**:
- **Agentic AI Kit**: Multiple SVG variants (8 generation scripts: v1-v5, duotone, frost, traced). These are AI-generated icon experiments with preview HTML pages.
- **Status Feedback**: A CSS animation collection (status-feedback.css, 6.9KB) with a preview page.

**How they are sold**: Via Stripe payments on supericons.dev. Customers get API keys linked to their purchases.

**Honest assessment**: The premium packs are early experiments. The agentic-ai-kit has multiple generation approaches but none are finalized as a production collection. The status-feedback pack exists as CSS only.

---

### 3. Motion Lab (Pro Workflow Tool)

**What it is**: A system for applying animation presets to any icon.

**Capabilities**:
- 15+ animation presets (pulse, bounce, spin, trace, typing, etc.)
- Configurable trigger (loop, hover, click), duration, intensity
- CSS export (with selector token)
- Animated SVG export (self-contained)
- Bundle export (CSS + animated SVG in one call)
- Recipe preview (human-readable description of what the animation does)

**Access**: Free to preview on the website. Pro account required for MCP export.

---

### 4. Converter (Pro Workflow Tool)

**What it is**: PNG-to-SVG and SVG-to-PNG conversion.

**Capabilities**:
- SVG to PNG (16-2048px width, transparent or colored background)
- PNG to SVG tracing (multiple quality modes: exact/compact, color/mono, 6 trace profiles)
- Input inspection (structural hints, risk analysis, recommended settings)

**Access**: Pro account required.

---

### 5. MCP Server (v0.3.0)

**What it is**: A Model Context Protocol server for AI coding assistants (Claude, Cursor, etc.)

**11 tools total**:

| Tool | What it does | Access |
|---|---|---|
| `search_icons` | Keyword search across all libraries | Free |
| `get_icon` | Retrieve specific icon by ID + library | Free |
| `list_libraries` | List all available libraries with counts | Free |
| `list_motion_presets` | List Motion Lab presets | Pro |
| `get_motion_recipe` | Preview animation recipe (human-readable) | Pro |
| `export_motion_css` | Generate CSS for icon animation | Pro |
| `export_animated_svg` | Generate self-contained animated SVG | Pro |
| `animate_icon` | Bundle: CSS + animated SVG in one call | Pro |
| `inspect_converter_options` | List Converter options and hints | Pro |
| `inspect_converter_input` | Analyze PNG before tracing | Pro |
| `convert_svg_to_png` | SVG to PNG conversion | Pro |
| `convert_png_to_svg` | PNG to SVG tracing | Pro |

**Auth tiers**:
- Anonymous: free icons only
- Authenticated (free tier): free icons, premium locked
- Pack buyer: free + purchased packs
- Pro subscriber: everything

**Backend**: Hosted search via Supabase Edge Functions. Telemetry logging (search attempts, batches).

---

### 6. Docs Section

**What exists**:
- `Icons_Past_Present_Future.md` + HTML (research essay on icon evolution)
- `icons-future-vision.html` (interactive vision page)
- Internal MCP testing docs
- Hosted search alignment plan
- Docs pages (docs-pages.js, ~124KB) serving docs on the site

**Assessment**: MVP docs. Functional but not comprehensive. Missing: getting started guide, API reference, contribution guide, troubleshooting is separate.

---

### 7. Infrastructure

- **Hosting**: Netlify
- **Backend**: Supabase (auth, database, edge functions)
- **Payments**: Stripe
- **Analytics**: Umami
- **Admin**: admin.html (user management dashboard)
- **Auth**: auth.js (~59KB, full auth flow)

---

### 8. Strategy Docs (45 files in strategy/)

**Documents covering**:
- Business evaluation and GenAI marketing plan
- Decision roadmap (v1/v2)
- Ultimate blueprint 2026
- Master action plan
- Marketing masterplan and distribution kit
- Free-layer and judgment-layer strategy
- Icon curation system design
- Browse taxonomy discussion and implementation plans
- Phase 3 and Phase 4 audit docs
- Search intelligence triage SQL
- Hosted search engine implementation plan
- Agent icon-selection feedback (how agents choose icons)
- Agent feedback positioning and next steps
- Self-describing icons exploration (si:icon metadata concept)
- Icons-as-agents blockchain analysis
- Marketing proposal 2026
- 2027 vision blueprint (6-pillar strategic plan)
- **Visual protocol thesis** (the consolidated vision document)
- **Visual protocol action plan** (the buildable 8-step plan)

---

## Part 2: What We Need to Build Next

Consolidated from all strategy docs, the visual protocol thesis, and the action plan. Ordered by priority.

### Priority 1: The First Governance Collection (Revenue + Standard Seed)

**What**: Design and ship the Agent Lifecycle Collection (9 icons).
- Agent idle, planning, executing, waiting for approval, blocked, completed, failed, monitoring, learning
- Professional SVG design with CSS hover animations (reusing Motion Lab pipeline)
- si:icon metadata embedded in every SVG (first real artifact of the standard)

**Why first**: This is the validation step. If developers will pay $29-49 for icons that no other library has, the governance niche is real.

**Kill metric**: 50 sales in 3 months.

---

### Priority 2: `request_semantic_icon` MCP Tool

**What**: Add one new tool to the MCP server that accepts intent instead of keywords.
```
request_semantic_icon({
  concept: "waiting_for_human_approval",
  context: "payment_flow"
})
```
Initially resolves only against the Agent Lifecycle pack.

**Why**: Proves the protocol concept. Agents describe needs instead of guessing names. This is the bridge from "search engine" to "visual protocol."

---

### Priority 3: Trust/Authority + Risk Collections

**What**: Two more governance collections (14 icons total).
- Trust and Authority (8 icons): human-initiated, agent-initiated, confidence levels, verified, audit trail, override
- Risk and Consequences (6 icons): irreversible, high-risk, cost, data exposure, rate limit, cascading

**Why**: Expands the governance vocabulary. Creates a bundle product ($99).

---

### Priority 4: Grammar Primitives

**What**: Define composable building blocks (state ring, confidence badge, authority marker, risk stripe) that can combine with base icons to express compound states.

**Why**: This is where icons become a language, not a catalog. Agents can request "shield + executing state + high confidence + agent authority" and get a composed visual.

---

### Priority 5: si:// Specification

**What**: Publish the formal spec for si:icon namespace, URI format, grammar rules, state machines, and semantic events.

**Why**: A published spec lets other tools, frameworks, and AI assistants reference the standard. Makes the standard real, not just an internal idea.

---

### Priority 6: `<si-icon>` Web Component

**What**: A single Web Component that renders any Supericons icon with state management, a11y, and semantic events.

**Why**: Moves Supericons from "icon files" to "programmable components." The highest-value product in the evolution ladder.

---

### Priority 7: Pro MCP Subscription Tier

**What**: Split MCP into free (keyword search) and pro ($12/mo: intent resolution, stateful animations, grammar compositor, governance packs via MCP).

**Why**: Recurring revenue from the primary distribution channel.

---

### Priority 8: Ecosystem Tooling

**What**: Reader library (@supericons/reader), CI/CD linter, VS Code extension, framework wrappers.

**Why**: Each tool adopted increases switching cost. But only after the standard is proven.

---

## What We Explicitly Do NOT Build Yet

- Blockchain or NFT integration
- Enterprise auditing dashboards
- Framework integrations (Vercel AI SDK, AG-UI, LangChain)
- Changing the supericons.dev hero messaging (wait until governance packs are proven)
- Community governance icon proposals

---

## Source Documents

This document consolidates:
- `strategy/visual-protocol-action-plan.md` (the 8-step build plan)
- `strategy/supericons-visual-protocol-thesis.md` (the consolidated vision)
- `strategy/supericons-2027-vision-blueprint.md` (the 6-pillar blueprint)
- `strategy/agent-icon-selection-feedback.md` (how agents choose icons)
- `strategy/self-describing-icons-exploration.md` (si:icon metadata concept)
- `strategy/icons-as-agents-blockchain-analysis.md` (blockchain analysis)
- `strategy/agent-feedback-positioning-and-next-steps-plan.md` (positioning)
- `strategy/business_evaluation.md` (business evaluation)
- `strategy/supericons-ultimate-blueprint-2026.md` (ultimate blueprint)
- `mcp/index.js` (MCP server audit, 881 lines, 11 tools)
- `index.html` (landing page audit)
- `premium/` directory (agentic-ai-kit, status-feedback packs)
- IDEO design thinking discussion (cognitive lock-in, Trust UX positioning)
- YC/a16z VC devil's advocate (framework absorption, AI generation, TAM risks)
