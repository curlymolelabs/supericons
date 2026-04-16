# Agentic AI Kit: Premium Bundle #01

> Following the [Premium Bundle Workflow](premium_bundle_workflow.md) step by step.
> Bundle ID: `supericons-agentic-ai-kit-v1.0`
> Created: 2026-03-23

---

## Phase 1: EMPATHIZE

### Step 01: Buyer Persona

**One-paragraph buyer brief:**

Solo developer or 2-3 person team building an AI-powered product: a chatbot UI, coding assistant, agent orchestrator, RAG pipeline dashboard, or LLM wrapper application. Uses React/Next.js, Svelte, or Vue. Has no icon design skills and cannot justify hiring a designer for 40 icons. Needs domain-specific concepts like "agent," "prompt," "embedding," "fine-tune," and "guardrail" that do not exist in any open-source icon library. Budget: $29 impulse buy (justified as "saves me 3 hours in Figma"). Expects SVG + React component export. Wants the icons to match a clean, minimal outline style (like Lucide or Heroicons) so they blend into existing UI kits.

### Step 02: Buyer's Journey Map

Walking through a typical AI product's screens and identifying where icons appear:

```
Landing Page      -> Hero illustration, feature icons, CTA
Auth/Login        -> (covered by free libraries: user, lock, email)
Dashboard         -> Agent status, model selector, token usage, recent sessions
Chat/Prompt UI    -> Send, prompt template, context window, stop, regenerate
Agent Builder     -> Workflow canvas, tool-use, trigger, condition, chain
RAG Pipeline      -> Document upload, chunk, embed, retrieve, augment, generate
Model Config      -> Model picker, temperature slider, max tokens, system prompt
Monitoring        -> Guardrail alerts, token counter, latency, cost tracker
Settings          -> API keys, rate limits, team access (covered by free libs)
Empty States      -> No agents, first prompt, no documents indexed
```

**Screen-by-screen icon inventory:**

| Screen | Icons Needed | Free Library Coverage | Gap Icons |
|---|---|---|---|
| Dashboard | agent, model, token usage, session | Partial (generic chart/grid) | agent status, model card, token meter |
| Chat/Prompt | send, prompt, context, stop, regenerate | send/stop exist | prompt template, context window, regenerate-ai |
| Agent Builder | workflow, tool, trigger, condition, chain | Basic arrows only | agent workflow, tool-use, chain link, node |
| RAG Pipeline | upload, chunk, embed, retrieve, generate | upload exists | chunk split, embedding vector, retrieve, RAG flow |
| Model Config | model, temperature, tokens, system prompt | Settings gear only | temperature dial, model selector, system prompt |
| Monitoring | guardrail, token count, latency, cost | Alert exists | guardrail shield, token counter, AI cost |
| Empty States | no agents, first prompt | None domain-specific | empty agent, first prompt sparkle |

---

## Phase 2: DEFINE

### Step 03: Full Icon List

**40 icons, grouped by function:**

#### Core Navigation (6 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 1 | `ai-home` | Dashboard home with sparkle accent |
| 2 | `ai-search` | Search with neural node accent |
| 3 | `ai-settings` | Gear with AI circuit detail |
| 4 | `ai-history` | Clock with conversation trail |
| 5 | `ai-help` | Question mark with brain outline |
| 6 | `ai-menu` | Hamburger with node connections |

#### Agent and Workflow (8 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 7 | `agent` | Humanoid silhouette with circuit lines |
| 8 | `agent-workflow` | Connected nodes in a directed graph |
| 9 | `agent-group` | Multiple agent silhouettes (multi-agent) |
| 10 | `tool-use` | Wrench with plug connector |
| 11 | `chain` | Chain links with directional arrow |
| 12 | `orchestrator` | Central hub with radiating connections |
| 13 | `agent-loop` | Circular arrow with agent node |
| 14 | `agent-stop` | Agent with stop/pause indicator |

#### Prompt and Context (7 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 15 | `prompt` | Text bracket with cursor |
| 16 | `prompt-template` | Document with placeholder brackets |
| 17 | `system-prompt` | Terminal window with lock |
| 18 | `context-window` | Stacked layers with size indicator |
| 19 | `conversation` | Chat bubbles with AI sparkle |
| 20 | `regenerate` | Circular arrow with sparkle |
| 21 | `streaming` | Flowing dots (text streaming) |

#### RAG and Data (7 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 22 | `embedding` | Vector arrows converging to a point |
| 23 | `chunk` | Document split into segments |
| 24 | `retrieve` | Magnifying glass pulling from stack |
| 25 | `rag-pipeline` | Document to brain connected flow |
| 26 | `vector-db` | Database with vector arrows |
| 27 | `knowledge-base` | Book with neural connections |
| 28 | `document-index` | Document with numbered index lines |

#### Model and Configuration (6 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 29 | `model` | Brain outline (generic model) |
| 30 | `model-selector` | Brain with dropdown chevron |
| 31 | `temperature` | Thermometer with gradient scale |
| 32 | `token-counter` | Hash/number with tally marks |
| 33 | `fine-tune` | Sliders with sparkle/precision dot |
| 34 | `max-tokens` | Bar with limit marker |

#### Safety and Monitoring (4 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 35 | `guardrail` | Shield with rail/barrier lines |
| 36 | `safety-filter` | Funnel with check mark |
| 37 | `token-cost` | Coin with token symbol |
| 38 | `latency` | Clock with speed lines |

#### Status and Empty States (2 icons)
| # | Icon Name | Metaphor |
|---|---|---|
| 39 | `sparkle` | AI sparkle/magic star |
| 40 | `empty-agent` | Dashed agent outline (empty state) |

**Total: 40 icons.** Exceeds the 30-icon minimum, stays under 50.

**Socratic gate:** "Does any of these icons already exist in free Supericons libraries in a matching style?"
- `send`, `stop`, `search`, `settings`, `upload`, `alert` exist in free libraries and are excluded.
- All 40 icons above are domain-specific AI concepts not found in Lucide, Tabler, Phosphor, etc.
- Pass.

### Step 04: Visual Brief

| Parameter | Decision | Rationale |
|---|---|---|
| **Grid** | 24x24 | Industry standard. Matches Lucide/Tabler/Heroicons. |
| **Live area** | 20x20 (2px padding) | Allows optical centering. |
| **Stroke width** | 1.5px | Matches Lucide default. Not too thin (Phosphor), not too bold (Tabler). |
| **Corner radius** | 2px on rectangles, round on organic shapes | Modern, approachable, not sharp. |
| **Cap style** | Round | Softer, friendlier. Matches Lucide. |
| **Join style** | Round | Consistent with caps. |
| **Fill style** | Outline only (`stroke="currentColor"`, `fill="none"`) | Maximum versatility. User applies color. |
| **viewBox** | `0 0 24 24` | Standard. |
| **Stroke attributes** | `stroke-linecap="round" stroke-linejoin="round"` | Consistent with Lucide convention. |
| **Style reference** | Lucide-adjacent. Clean minimal, slightly more personality via AI-specific metaphors. | Blends with the most common UI kit pairing. |
| **Color** | `currentColor` only. No hardcoded hex. | Inherits from parent CSS. |
| **File naming** | Lowercase, hyphen-separated: `agent-workflow.svg` | Consistent with Supericons convention. |

**Socratic gate:** "If I place 3 of these icons next to 3 Lucide icons, can I tell which is which?"
- Structurally similar (same grid, stroke, caps). The differentiation comes from the subject matter (AI-specific concepts), not from conflicting visual treatment. This is intentional: buyers want icons that blend into their existing Lucide/shadcn-based UI.
- Pass.

---

## Phase 3: IDEATE

### Step 05: Key Icon

The key icon is `agent` (icon #7). It establishes the visual language for the entire set.

**Design decisions:**
- A simplified humanoid silhouette (head circle + shoulder curve) combined with circuit/node details
- The circuit detail (small circles connected by lines) is the signature element that will appear across other icons in the set
- Stroke: 1.5px, round caps, round joins
- Fits cleanly in 20x20 live area within 24x24 viewBox

### Step 06: Proof Icons

Five proof icons spanning structural types:

| Type | Icon | Tests |
|---|---|---|
| Simple geometric | `sparkle` | Stroke consistency with small elements |
| Complex composite | `agent-workflow` | Multiple connected shapes, visual weight balance |
| Organic/curved | `embedding` | Converging curves, arrow tips |
| Directional | `chain` | Linear flow, optical alignment |
| Text-adjacent | `prompt` | Bracket shapes with cursor, small detail legibility |

---

## Phase 4: PROTOTYPE

### Step 07-08: Full SVG Production

All 40 icons produced as optimized SVGs. Each icon:
- 24x24 viewBox with 2px padding (20x20 live area)
- stroke="currentColor", fill="none"
- stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round"
- Clean paths, no editor cruft
- Under 500 bytes each

See `/premium/agentic-ai-kit/svg/` for all files.

---

## Phase 5: TEST

### Step 09: Quality Audit

**Visual audit checklist:**
- [ ] All 40 icons viewed at 16px, 24px, 48px
- [ ] All icons tested on dark (#111) and light (#faf8f4) backgrounds
- [ ] 6 proof icons printed at 4x, no "off" feeling
- [ ] 3 random icons placed next to 3 Lucide icons: style blends, subject differs

**Technical audit checklist:**
- [ ] All SVGs valid XML
- [ ] All use `currentColor` (no hardcoded hex)
- [ ] All have `viewBox="0 0 24 24"`
- [ ] No icon exceeds 2KB
- [ ] Total ZIP under 500KB

### Step 10: Package

**Bundle structure:**
```
supericons-agentic-ai-kit-v1.0/
  svg/                     # 40 optimized SVGs
  react/                   # 40 JSX components (auto-generated)
  vue/                     # 40 Vue SFCs
  preview.html             # Visual gallery
  LICENSE.md               # Proprietary license
  README.md                # Usage guide, icon list, changelog
```

**Pricing:** $29 individual, $79 team/unlimited
**Listing:** Supericons app "Premium" filter, Gumroad, Lemon Squeezy
