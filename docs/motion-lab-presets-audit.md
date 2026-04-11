# Motion Lab Presets Audit

**Date:** 11 April 2026  
**Question audited:** Do the docs reflect the real number of Motion Lab presets? If not, where did the current docs count come from?

## Short answer

No. The current Motion Lab docs do **not** reflect the full browser Motion Lab preset library.

There are **80 browser presets** in the live Motion Lab UI.

The current docs page says:

> `Supericons Motion Lab ships 12 presets across 5 categories.`

That statement is inaccurate in two different ways:

1. It does not match the live browser Motion Lab UI, which exposes **80 presets**
2. It does not even match the smaller MCP preset set correctly, because the MCP set has **12 presets across 7 categories**, not 5

## What the live browser UI contains

The browser Motion Lab interface in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6323) renders four preset groups:

- `Motion`
- `Entrances`
- `Exits`
- `Special`

Preset counts by group:

- `Motion`: 25 presets
- `Entrances`: 15 presets
- `Exits`: 15 presets
- `Special`: 25 presets

**Total browser presets: 80**

This total comes directly from the live `data-preset="..."` buttons rendered in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6325) through [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6586).

## What the MCP/library source contains

The MCP-side Motion Lab preset library in [motion-lab-workflow.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/motion-lab-workflow.js#L4) currently defines **12 presets**:

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

Those 12 MCP presets span **7 categories**, not 5:

- `Attention`
- `Rotation`
- `Ambient`
- `Entrance`
- `Effects`
- `Reveal`
- `Interaction`

So the MCP/library side is:

- **12 presets**
- **7 categories**

## Where the current docs count came from

The current docs page in [docs-pages.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1016) says:

> `Supericons Motion Lab ships 12 presets across 5 categories.`

That appears to have been derived from the smaller MCP/library preset set, not the full browser UI.

But the copy drifted in two ways:

1. It borrowed the **12-preset** count from the MCP/library source
2. It introduced an incorrect **5-category** count, even though the 12-preset MCP/library source actually spans **7 categories**

So the docs are currently mixing two different systems:

- the browser Motion Lab product
- the smaller MCP/library preset subset

## Why the mismatch happened

The Motion Lab docs page is currently written as if there is one single preset library shared everywhere.

That is not true in the live codebase today.

There are effectively two different preset surfaces:

1. **Browser Motion Lab UI**
   - 80 presets
   - grouped visually into 4 UI sections

2. **MCP/library preset set**
   - 12 presets
   - grouped by semantic categories in the library source

The docs currently describe the browser product page using MCP/library numbers.

## About the “12 x 5 = 60” concern

The current sentence says:

> `12 presets across 5 categories`

That does **not** mathematically mean 60 presets. It means 12 presets total, distributed among 5 categories.

So the problem is not that the docs imply `12 x 5 = 60`.

The real problem is:

- the docs say **12**
- the browser UI shows **80**
- and even the category count in the docs is still wrong for the smaller 12-preset set

## Audit verdict

### Accurate today

- The live browser Motion Lab UI has **80 presets**
- The MCP/library Motion Lab source has **12 presets**

### Inaccurate today

- The Motion Lab Presets docs page currently says **12 presets across 5 categories**

That sentence should be treated as incorrect.

## What should happen next

The docs need one product decision before the Motion Lab preset page is revised:

### Option 1: Document the browser Motion Lab product

If the page is meant to describe the browser Motion Lab experience, it should document:

- all **80 browser presets**
- the 4 browser UI groups:
  - Motion
  - Entrances
  - Exits
  - Special

This is likely the best choice for the main `Motion Lab Presets` page because that is what users actually see in the browser.

### Option 2: Split browser presets from MCP presets

If the product intentionally has a smaller MCP preset subset, the docs should separate them clearly:

- `Motion Lab Presets` for the browser UI
- `Motion Lab MCP Tools` for the MCP subset

In that case, the docs should explicitly say that the MCP tools currently expose a smaller preset set than the browser UI.

## Recommendation

Use the browser product as the source of truth for the `Motion Lab Presets` page.

Then keep the MCP subset documented separately in the MCP reference.

That would make the docs reflect what users actually see, while still being honest about the smaller MCP-facing preset library.
