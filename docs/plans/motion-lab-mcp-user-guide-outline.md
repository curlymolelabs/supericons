# Motion Lab MCP User Guide Outline

Date: April 12, 2026
Status: Draft outline
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/motion-lab-agent-guidance.md`
- `docs/motion-lab-mcp-post-implementation-report.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `mcp/index.js`
- `mcp/motion-lab.js`
- `mcp/motion-lab-client.js`

## Purpose

Define a clear, easy-to-understand user-guide structure that works for:

- human developers using Motion Lab through MCP
- AI coding agents calling Motion Lab tools
- the Supericons owner or operator who needs to understand what is local, what is hosted, and how the protection model works

This outline is for a future polished guide, not the final guide text.

## Recommended Guide Structure

Use one umbrella guide with three clear tracks:

1. `Start here` overview for everyone
2. `For humans` usage path
3. `For AI agents` usage path
4. `For the owner/operator` appendix

This keeps the concepts in one place while avoiding repeated explanations.

## Proposed Title

`Motion Lab MCP User Guide`

Optional subtitle:

`How humans and AI agents use Motion Lab through Supericons MCP, and how the hosted premium path works`

## Section Outline

### 1. What Motion Lab MCP Is

Audience:
- everyone

Goal:
- explain what the product does in plain English

Cover:
- what Motion Lab is
- what MCP adds
- what kinds of outputs it can generate
- who it is for

Suggested subsections:
- `What you can do with it`
- `Who should use it`
- `What is free vs Pro`

### 2. Quick Start

Audience:
- everyone

Goal:
- get a reader from zero to first success quickly

Cover:
- install or connect the MCP server
- add `SUPERICONS_API_KEY`
- confirm Motion Lab tools are visible
- run one first successful motion task
- show exact config examples for supported clients

Suggested subsections:
- `Quick start for humans`
- `Quick start for AI agents`
- `Client-specific setup examples`
- `Your first successful Motion Lab call`

### 3. Core Mental Model

Audience:
- everyone

Goal:
- explain the system simply before diving into commands

Cover:
- local baseline vs hosted premium path
- why `list_motion_presets` is local
- why recipe/render calls are hosted
- why session tokens exist

Suggested subsections:
- `What stays local`
- `What runs on Supericons servers`
- `Why the premium path uses a session token`

### 4. Motion Lab Tool Map

Audience:
- everyone

Goal:
- show what each tool does and when to use it

Cover:
- `list_motion_presets`
- `get_motion_recipe`
- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

Suggested format:
- one short card or subsection per tool
- `When to use it`
- `Inputs`
- `What it returns`
- `Best for`

### 5. Human Developer Guide

Audience:
- human developers

Goal:
- teach a developer how to use Motion Lab MCP in real product work

Cover:
- picking a preset
- choosing trigger, duration, and intensity
- deciding between CSS and animated SVG
- integrating the output into a real app

Suggested subsections:
- `How to choose a preset`
- `When to use CSS`
- `When to use animated SVG`
- `How to use the {{ICON_SELECTOR}} placeholder`
- `How to test the output in your app`

### 6. AI Agent Guide

Audience:
- AI coding agents and the humans configuring them

Goal:
- teach agents a reliable decision sequence

Cover:
- recommended tool order
- how to narrow candidates
- how to explain tradeoffs
- when to avoid animation

Suggested subsections:
- `Recommended tool order`
- `How an agent should choose a preset`
- `How an agent should explain its choice`
- `When an agent should say no motion`
- `Good agent behavior examples`

### 7. Common Use Cases

Audience:
- everyone

Goal:
- ground the guide in concrete UI situations

Cover:
- professional dashboard hover
- security/authentication
- success/celebration
- ambient loading or empty state
- accessibility-sensitive settings panel

Suggested format:
- `Situation`
- `Likely presets`
- `Why`
- `What to avoid`

### 8. Output Types and Integration

Audience:
- mostly humans, useful to agents

Goal:
- make the outputs feel practical, not abstract

Cover:
- recipe output
- CSS output
- animated SVG output
- full bundle output

Suggested subsections:
- `Recipe output`
- `CSS output`
- `Animated SVG output`
- `Bundle output`
- `Common integration mistakes`

### 9. Hosted Premium Path Explained

Audience:
- humans, agents, owner

Goal:
- explain the protected architecture simply

Cover:
- API key hash
- session exchange
- short-lived bearer token
- hosted recipe/render endpoints
- fallback behavior during development

Suggested subsections:
- `How premium calls work`
- `Why premium logic is hosted`
- `What happens when the service is unavailable`

### 10. Protection Model Explained

Audience:
- owner, technical readers, curious users

Goal:
- explain cloning/copying protection in clear non-legal language

Cover:
- what the local package exposes
- what it no longer exposes
- what moved server-side
- what this protects against
- what it does not fully prevent

Suggested subsections:
- `What changed from the earlier local model`
- `What stays visible to users`
- `What is now harder to copy`
- `What is still possible to imitate`

### 11. Troubleshooting

Audience:
- everyone

Goal:
- reduce support friction

Cover:
- missing API key
- Motion Lab tools not visible
- auth denied
- placeholder selector confusion
- hosted service unavailable
- expired session token

Suggested subsections:
- `I only see baseline preset info`
- `I get auth errors`
- `My CSS does not apply`
- `The agent keeps falling back`
- `The hosted path is unavailable`

### 12. Security and Key Handling

Audience:
- humans and owner/operators

Goal:
- document safe operational behavior

Cover:
- do not paste real keys into chat
- rotate exposed keys
- use a separate test key when possible
- where the key is used

Suggested subsections:
- `How to store your key`
- `How to rotate a key`
- `What to do if a key is exposed`

### 13. Verification and Confidence

Audience:
- owner, auditors, advanced users

Goal:
- show what has actually been proven

Cover:
- local build checks
- clean-install check
- hosted live verification
- what still remains to test

Suggested subsections:
- `What is already verified`
- `What is still being tightened`
- `Current confidence level`

### 14. FAQ

Audience:
- everyone

Goal:
- answer the repeat questions quickly

Suggested questions:
- `Do I need Pro for Motion Lab MCP?`
- `What is the difference between list_motion_presets and get_motion_recipe?`
- `Why is some Motion Lab behavior local and some hosted?`
- `Can I use CSS without changing my DOM?`
- `Is this fully protected from copying?`
- `Can an AI agent use this without seeing the full premium engine?`

### 15. Glossary

Audience:
- everyone

Goal:
- keep language approachable

Terms to define:
- MCP
- preset
- trigger
- recipe
- animated SVG
- hosted path
- local baseline
- session token
- selector placeholder

## Recommended Writing Pattern

Keep the final guide easy to scan:

- short intro paragraphs
- flat lists
- one clear example per concept
- minimal jargon
- show the path before explaining the architecture

For technical sections:

- explain the user-facing behavior first
- explain the backend reason second

For protection sections:

- avoid hype
- avoid claiming perfect security
- explain the tradeoff plainly

## Suggested Deliverables

### Deliverable A: One unified guide

Primary file:

- `docs/motion-lab-mcp-user-guide.md`

Use when:

- the goal is one main source of truth with sections for each audience

### Deliverable B: Split guides

Files:

- `docs/motion-lab-mcp-human-guide.md`
- `docs/motion-lab-mcp-agent-guide.md`
- `docs/motion-lab-mcp-owner-operator-guide.md`

Use when:

- the guide becomes too long
- human and agent usage patterns diverge enough to justify separate docs

## Recommended Next Step

Write the unified guide first.

Suggested sequence:

1. write `What Motion Lab MCP Is`
2. write `Quick Start`
3. write `Motion Lab Tool Map`
4. write `Human Developer Guide`
5. adapt the existing agent guidance into the `AI Agent Guide`
6. write `Hosted Premium Path Explained`
7. write `Protection Model Explained`
8. finish with troubleshooting, FAQ, and glossary

This keeps the first draft practical before it becomes exhaustive.
