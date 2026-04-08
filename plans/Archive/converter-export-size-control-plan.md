# PNG to SVG Export Size Control Plan

## Goal

Let users control the downloaded SVG size independently from the source PNG dimensions, while keeping the current preview behavior and trace quality intact.

## Product Decision

`PNG -> SVG` should no longer assume:

- input crop size
- preview reference size
- downloaded SVG dimensions

are all the same thing.

Instead:

- trace quality should follow the input crop
- preview should follow the preview fit model
- export dimensions should follow a separate user-controlled setting

## Proposed UX

Add a new control:

- `OUTPUT SIZE`

Options:

- `Auto`
- `Original`
- `Custom`

### Auto

Default behavior.

Suggested normalized target:

- `Logo` mode: longest edge `512px`
- `Icon` mode: longest edge `128px`

This keeps exports practical without forcing users to manually resize every large input.

### Original

Preserve the current behavior:

- export `width` and `height` equal to the cropped source dimensions

This is useful for users who explicitly want source-sized output.

### Custom

Expose one numeric input:

- `Width (px)`

Height is derived from aspect ratio automatically.

Optional follow-up:

- add a lock icon or simple “aspect ratio locked” note

## Technical Strategy

### 1. Add converter state

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- `exportSizeMode: 'auto' | 'original' | 'custom'`
- `exportTargetWidth: number`
- optional derived `exportSize: { width, height }`

### 2. Compute export dimensions separately

Add a helper such as:

- `getConverterExportSize({ assetMode, cropWidth, cropHeight, exportSizeMode, exportTargetWidth })`

Behavior:

- `original` -> `{ width: cropWidth, height: cropHeight }`
- `auto` -> normalize longest edge according to asset mode
- `custom` -> set width to the chosen target and scale height proportionally

### 3. Preserve traced geometry, change only output dimensions

Do **not** retrace just to resize.

Instead:

- keep the traced coordinate system in the `viewBox`
- rewrite only exported `width` and `height`

This should happen centrally in `buildConverterTraceArtifact(...)` / `normalizeSvgOutput(...)`.

Recommended output contract:

- `viewBox="0 0 originalCropWidth originalCropHeight"`
- `width="exportWidth"`
- `height="exportHeight"`

That keeps path geometry stable and makes resizing cheap and deterministic.

### 4. Keep preview size independent

Do not reuse export size for preview fitting.

Preview should continue to use:

- the actual cropped source dimensions
- the current compare/default fit model

That way:

- the preview remains a trustworthy inspection surface
- export size becomes a user choice

### 5. Update UI metadata

Current metadata only shows one size.

Update it to show both:

- source crop size
- export size

Example:

- `SVG (1264x1170 cropped -> 512x474 export)`

or a cleaner compact variant:

- `SVG · cropped 1264x1170 · export 512x474`

### 6. Ensure copy/download uses the selected export size

Any action that uses the generated SVG must use the rewritten export dimensions:

- `Download SVG`
- `Copy SVG`

## Implementation Sequence

### Step 1

Add the export-size state and helper logic.

### Step 2

Thread export-size values into the artifact-building pipeline.

### Step 3

Add the `OUTPUT SIZE` UI control and state wiring.

### Step 4

Update output metadata to show export size explicitly.

### Step 5

Run regression checks on:

- Shell large source
- KFC large source
- McDonald’s square tile
- one small icon case

## Verification

### Shell

Input:

- large source raster

Expected:

- preview still fits
- `Auto` export is normalized
- `Original` export keeps the large dimensions
- `Custom` width updates the export dimensions without changing geometry

### KFC

Expected:

- same visual trace quality
- export size can be reduced without affecting preview correctness

### McDonald’s

Expected:

- square export remains square
- custom width keeps aspect ratio

## Non-Goals

This change does **not** aim to:

- reduce path count
- reduce path precision
- make heavy traces smaller by geometry simplification

That is a separate optimization problem.

This fix is specifically about:

- giving users sane export dimensions
- separating preview logic from download sizing

