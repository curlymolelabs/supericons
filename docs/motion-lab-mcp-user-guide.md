# Motion Lab MCP User Guide

How humans and AI agents use Motion Lab through Supericons MCP, and how the hosted premium path works.

## What Motion Lab MCP Is

Motion Lab MCP gives you a motion workflow for icons inside an MCP client.

With it, a human developer or AI agent can:

- inspect the available Motion Lab presets
- ask for a motion recipe before exporting anything
- export portable CSS for an inline SVG
- export a self-contained animated SVG
- generate both outputs together in one call

If you are using Motion Lab through MCP today, the setup is:

- a local MCP server process
- a hosted premium Motion Lab path for recipe and render calls
- a Pro-linked `SUPERICONS_API_KEY` for Motion Lab access

## Quick Start

### What you need

- a local checkout of this repo
- Node.js installed
- a Supericons API key linked to Pro
- an MCP client such as Cursor or Claude Desktop

### Local server command

The current local server entrypoint is:

```text
node /absolute/path/to/supericons/mcp/index.js
```

On this repo, that path looks like:

```text
node d:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons\mcp\index.js
```

### Cursor setup example

Add this to your MCP config and replace the path and key value:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "node",
      "args": [
        "d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js"
      ],
      "env": {
        "SUPERICONS_API_KEY": "si_your_pro_key_here"
      }
    }
  }
}
```

### Claude Desktop setup example

Use the same server block in your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "node",
      "args": [
        "d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js"
      ],
      "env": {
        "SUPERICONS_API_KEY": "si_your_pro_key_here"
      }
    }
  }
}
```

### First successful Motion Lab call

After restarting the client, confirm these tools are visible:

- `list_motion_presets`
- `get_motion_recipe`
- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

Then try this sequence:

1. `list_motion_presets`
2. `get_motion_recipe` with preset `sweep`, trigger `hover`, duration `240`, intensity `100`
3. `export_motion_css` or `animate_icon`

If this works, the local MCP and hosted premium path are both connected.

## Core Mental Model

The Motion Lab MCP flow is split into two layers.

### What stays local

The local MCP keeps a reduced preset baseline for listing and discovery:

- preset id
- label
- group
- description
- supported triggers

This helps the user or agent browse the motion set without shipping the richer premium logic in the normal local response.

### What runs on Supericons servers

These premium Motion Lab operations resolve through hosted endpoints:

- recipe generation
- CSS render
- animated SVG render
- bundled `animate_icon` output

### Why a session token exists

The MCP client does not send the raw API key to every Motion Lab endpoint.

Instead it:

1. hashes the API key locally
2. exchanges that hash for a short-lived session token
3. uses the session token for hosted Motion Lab calls

This keeps the premium path more controlled than a purely local package model.

## Motion Lab Tool Map

### `list_motion_presets`

Use it when you want to see what presets exist.

Best for:

- browsing
- quick preset discovery
- giving an agent a starting point

### `get_motion_recipe`

Use it before exporting when you want to confirm the fit.

Best for:

- comparing presets
- checking tone and context
- explaining why a motion choice makes sense

### `export_motion_css`

Use it when you want to keep your existing SVG markup and apply animation with CSS.

Best for:

- inline SVG in a UI
- cases where you want to control DOM placement yourself

### `export_animated_svg`

Use it when you want one self-contained animated asset.

Best for:

- standalone asset output
- direct embedding
- simpler handoff in some workflows

### `animate_icon`

Use it when you want both CSS and animated SVG in one call.

Best for:

- agent workflows
- fast comparison
- one-call export

## Recommended Tool Order

For both humans and AI agents, the safest order is:

1. `list_motion_presets`
2. `get_motion_recipe`
3. choose output type
4. `export_motion_css`, `export_animated_svg`, or `animate_icon`

This reduces trial-and-error and makes the result easier to explain.

## Human Developer Guide

### How to choose a preset

Start with the UI intent, not the animation name.

Examples:

- subtle professional hover: `sweep`, `glide`
- security or identity feel: `fingerprint`, `radar`
- celebration or success: `sparkle`, `bloom`
- ambient empty state: `breathe`, `float`

If you are unsure, call `get_motion_recipe` first and read the returned guidance.

### When to use CSS

Choose CSS when:

- you already render the SVG inline in the DOM
- you want to keep markup and styling separate
- you want to attach motion to an existing component tree

### When to use animated SVG

Choose animated SVG when:

- you want one self-contained output
- you want fewer integration steps
- you need a shareable asset result

### How to use `{{ICON_SELECTOR}}`

Some Motion Lab CSS responses return:

```text
{{ICON_SELECTOR}}
```

This is a placeholder token. Replace it with the selector that targets your inline `<svg>` element.

Examples:

- `.settings-button svg`
- `#login-icon svg`
- `.sidebar .nav-icon svg`

If the response includes:

- `selector_mode: "placeholder"`

you need to replace the token.

If the response includes:

- `selector_mode: "literal"`

the CSS already contains your real selector and you can use it directly.

The MCP tool response now also includes `selector_instructions` to make this explicit.

## AI Agent Guide

### Recommended decision sequence

An agent should usually:

1. inspect available presets
2. narrow candidates by UI intent
3. call `get_motion_recipe` on the finalists
4. choose the most defensible preset
5. export only after the choice is justified

### How an agent should explain its choice

A good agent should explain:

- what UI context it is solving for
- why the preset fits that context
- why stronger or noisier presets were avoided
- why CSS or animated SVG is the better output for the job

### When an agent should say no motion

A strong agent should be willing to recommend no motion when:

- the context is accessibility-sensitive
- the interface needs to feel calm and low-distraction
- animation would weaken clarity or trust

If motion is still required, the agent should pick the safest restrained option.

## Common Use Cases

### Professional dashboard hover

Likely presets:

- `sweep`
- `glide`

Avoid:

- overly playful or explosive presets

### Security or authentication

Likely presets:

- `fingerprint`
- `radar`

Avoid:

- celebratory or bouncy motion

### Success or celebration

Likely presets:

- `sparkle`
- `bloom`

Avoid:

- effects that feel childish if the product tone is premium

### Ambient empty state

Likely presets:

- `breathe`
- `float`

Avoid:

- high-energy motion that becomes tiring over time

### Accessibility-sensitive settings panel

Recommended behavior:

- say no motion if motion is not justified
- if required, choose the most restrained safe fallback

## Output Types And Integration

### Recipe output

Use it for decision-making and explanation.

### CSS output

Use it when you want to animate an inline SVG already in your app.

Important:

- the placeholder selector must be replaced when `selector_mode` is `placeholder`

### Animated SVG output

Use it when you want a self-contained animated icon asset.

### Bundle output

`animate_icon` is the bundle path. It is the fastest way to get:

- recipe
- CSS
- animated SVG

in one response.

## Hosted Premium Path Explained

The premium Motion Lab path works like this:

1. the local MCP hashes your `SUPERICONS_API_KEY`
2. it exchanges the hash for a short-lived session token
3. it calls hosted Motion Lab endpoints with bearer auth
4. the hosted service returns recipe or rendered output

This is why Motion Lab can remain useful for agents while keeping the more valuable premium logic off the normal local MCP surface.

## Protection Model Explained

The goal is not perfect secrecy. The goal is to make copying materially harder.

### What the local package still exposes

- the tool interface
- the reduced preset listing
- the local MCP wrapper logic

### What moved behind the hosted path

- premium recipe resolution
- premium CSS render
- premium animated SVG render
- bundled premium output path

### What this protects against

It becomes harder to copy the full working premium system just by inspecting the normal local MCP surface.

Layman version:

- before: more of the kitchen was shipped to the client
- now: the client sees the menu and receives the finished dish, but less of the kitchen is handed over directly

### What it does not fully prevent

It does not stop a determined competitor from:

- using the product
- studying outputs
- imitating ideas
- building a similar system from scratch

The protection is about making cloning more expensive, not impossible.

## Troubleshooting

### I do not see Motion Lab tools

Check:

- your MCP config loaded successfully
- the client restarted after config changes
- the server path points to `mcp/index.js`

### I get an API key required error

This means `SUPERICONS_API_KEY` is missing from the MCP config or not loaded into the client process.

### I get a Pro required error

This means the key is valid, but the account linked to it is not Pro for Motion Lab workflow access.

### I only see baseline preset info

That is expected for `list_motion_presets`. Richer recipe and render behavior comes from the hosted premium path.

### My CSS does not apply

Check:

- whether `selector_mode` is `placeholder`
- whether you replaced `{{ICON_SELECTOR}}`
- whether your selector actually targets the inline `<svg>`

### The hosted path is unavailable

If the hosted service is unavailable:

- repo-local development may optionally fall back to local workflow logic
- hosted-only verification should run with fallback disabled

## Security And Key Handling

### Safe handling rules

- do not paste real keys into chat or tickets
- use a separate test key when possible
- rotate any key that has been exposed

### If a key is exposed

1. revoke or rotate it
2. update your MCP config with the replacement key
3. rerun a small Motion Lab verification call

## Verification And Confidence

Current confidence is high for the Motion Lab-only path that was just implemented.

Already verified:

- local build passes
- Motion Lab hosted endpoints are deployed
- live session exchange works
- hosted recipe works
- hosted CSS render works
- hosted animated SVG render works
- hosted bundle path works with local fallback disabled

Still worth tightening:

- more negative-path verification
- rate limiting and abuse resistance
- broader non-Motion-Lab MCP release readiness

## FAQ

### Do I need Pro for Motion Lab MCP?

Yes. Motion Lab MCP is a Pro workflow path.

### Why is `list_motion_presets` lighter than `get_motion_recipe`?

Because the local listing is intentionally reduced. Richer premium behavior resolves through the hosted path.

### Which tool should I call first?

Usually `get_motion_recipe` before export.

### When should I use CSS instead of animated SVG?

Use CSS when you already control an inline SVG in the DOM. Use animated SVG when you want one self-contained output.

### Is Motion Lab MCP fully protected from copying?

No. It is designed to be harder to copy, not impossible to copy.

### Can an AI agent use this safely without seeing the full premium engine?

Yes. That is the main point of the hosted premium path.

## Glossary

### MCP

A tool protocol that lets a client call local or connected tools.

### Preset

A named motion behavior such as `sweep` or `breathe`.

### Trigger

How animation starts, such as `loop`, `hover`, or `click`.

### Recipe

A structured explanation of how a Motion Lab preset behaves for a given request.

### Animated SVG

A self-contained SVG that includes its own animation styling.

### Hosted path

The premium Motion Lab route that resolves through Supericons servers.

### Local baseline

The reduced preset listing shipped through the local MCP surface.

### Session token

A short-lived bearer token used after API key hash exchange.

### Selector placeholder

The `{{ICON_SELECTOR}}` token used in portable CSS output until you replace it with the selector for your inline SVG.
