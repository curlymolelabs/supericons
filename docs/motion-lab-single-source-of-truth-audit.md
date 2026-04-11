# Motion Lab Single Source Of Truth Audit

Date: April 11, 2026

## Question

Why does Motion Lab appear to have one preset set in the browser and a different preset set for MCP? Is this a docs mistake, a hallucinated copy issue, or a real architecture split in the code?

## Short Answer

This is a real code-level split, not just a docs mistake and not text hallucination.

There are currently two separate Motion Lab preset sources in the product:

- the browser Motion Lab UI uses its own preset system in `store.js`
- the MCP Motion Lab tools use a separate preset registry in `lib/motion-lab-workflow.js`

The browser version currently exposes **80 presets**.  
The MCP version currently exposes **12 presets**.

So the product does not have a single source of truth for Motion Lab presets today.

## What I Audited

I audited:

- the live browser Motion Lab preset buttons and preset definitions
- the MCP Motion Lab preset registry and MCP tools
- git history and blame data to determine when each preset system was introduced

## Findings

### 1. The browser Motion Lab UI has 80 presets

The browser-side Motion Lab UI defines preset buttons directly in `store.js`.

The visible browser preset groups are:

- Motion
- Entrances
- Exits
- Special

The current browser counts are:

- Motion: 25
- Entrances: 15
- Exits: 15
- Special: 25

Total: **80 presets**

These browser presets are also backed by a browser-side preset definition object in `store.js`.

### 2. The MCP Motion Lab tools use a different preset registry

The MCP Motion Lab implementation defines a separate preset registry in `lib/motion-lab-workflow.js`.

That registry currently contains 12 presets:

- `pulse`
- `bounce`
- `spin`
- `shake`
- `float`
- `pop`
- `magneticIn`
- `sparkle`
- `trace`
- `sweep`
- `typing`
- `tap`

The MCP helper `listMotionLabPresets()` returns those entries, and the Motion Lab MCP tools use that same registry for recipe generation and output building.

This is not a mirror of the browser preset library. It is a smaller authored subset.

### 3. The docs mismatch came from using the MCP subset as if it described the full Motion Lab product

The docs previously said Motion Lab shipped with `12 presets across 5 categories`.

That statement is inaccurate in two ways:

- it does not match the browser product, which currently shows 80 presets
- it does not even match the MCP subset accurately, which spans 7 categories rather than 5

So the docs problem is real, but it is a symptom of a deeper architecture split rather than the only issue.

### 4. The browser preset system came first

Git history shows the browser Motion Lab preset system existed before the MCP Motion Lab preset registry.

The browser preset set was expanded over several commits, including:

- `51f6c73` for a large preset expansion
- `396a72c` for entrance refinements and additions such as `magneticIn`
- `64b2f15` for more premium-oriented special presets

The browser preset UI and definitions were built incrementally over time.

### 5. The MCP preset registry was introduced later as a separate implementation

Git history shows `lib/motion-lab-workflow.js` was introduced later in commit:

- `0c8f3e0` `Add MCP workflow tools and docs hub`

Blame data shows the file was authored as one coherent unit in that commit, rather than gradually derived from the browser preset source.

That means the MCP Motion Lab preset system was not generated from the browser preset source of truth. It was created as a separate preset layer.

### 6. This does not look like random hallucination injected into code

The split is unlikely to be accidental AI hallucination in the narrow sense.

Why:

- both implementations are internally coherent
- both implementations are functional
- the MCP preset registry is deliberate and structured
- the MCP code has clear helpers for listing presets, building recipes, and generating outputs

So this is not random fake code or stray copy drift. It is a real implementation decision.

### 7. The likely issue is architectural divergence, not just bad wording

The strongest code-based explanation is:

1. Motion Lab browser presets were built first
2. MCP Motion Lab was added later
3. instead of reusing the browser preset source, MCP introduced a smaller v1 subset in a new file
4. docs then described that smaller subset as if it represented the whole Motion Lab product

This explains:

- why humans see many more presets
- why agents only get a smaller preset list through MCP
- why the docs became inconsistent

## What This Means

Today, Motion Lab behaves like two related but different products:

- **browser Motion Lab**: large visual preset surface for humans
- **MCP Motion Lab**: smaller callable preset surface for agents

That may be workable temporarily, but it is not a clean product model if the goal is one Motion Lab system across interfaces.

If the intended product principle is a single source of truth, the current architecture does not satisfy that principle.

## What Needs Clarification

The code proves the split exists, but code alone cannot answer the product intent behind it.

The open product question is:

- Was the MCP subset intentionally launched as a smaller first version?
- Or was MCP expected to match browser Motion Lab and parity simply never happened?

That decision should be made explicitly, because the docs and product model depend on it.

## Recommendations

### Recommended product direction

Move toward a single Motion Lab preset source of truth.

That means one canonical preset registry that can power:

- browser Motion Lab
- MCP Motion Lab
- docs
- future agent-facing motion metadata

### Immediate options

There are three realistic paths:

#### Option 1. Expand MCP to full browser parity

Make MCP expose the same preset library humans can see and use in the browser.

Pros:

- strongest product consistency
- best single-source-of-truth story
- better support for agent workflows

Cons:

- more engineering work
- may require parameter compatibility review for all presets

#### Option 2. Reduce browser Motion Lab to the MCP subset

Only keep the 12 MCP-supported presets in the browser.

Pros:

- easiest way to create parity quickly

Cons:

- major product downgrade
- weakens the browser experience
- likely not acceptable from a UX perspective

#### Option 3. Keep the split temporarily, but document it honestly

Treat browser Motion Lab and MCP Motion Lab as different capability surfaces for now.

Pros:

- lowest short-term engineering effort

Cons:

- still violates single-source-of-truth principle
- confusing long term
- creates maintenance and copy drift risk

## Recommended Next Step

The best next step is a follow-up product and engineering audit that answers:

- should MCP reach full preset parity with browser Motion Lab?
- if not, why not?
- what is the canonical preset model going forward?
- where should the shared preset source live?

Until that is resolved, docs should avoid implying that the Motion Lab preset library is fully unified across human and agent interfaces.

## Conclusion

This is not merely a docs hallucination and not merely stale copy.

The current codebase contains **two real Motion Lab preset systems**:

- one for the browser
- one for MCP

The browser system came first.  
The MCP system was added later as a smaller separate implementation.

That is the root reason the docs became inconsistent and the root reason the product currently lacks a single source of truth for Motion Lab presets.
