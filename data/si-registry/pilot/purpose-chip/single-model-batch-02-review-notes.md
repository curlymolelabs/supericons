# Single-Model Batch 02 Review Notes

## Why this batch exists

This batch exists to test the single-model semantic path on a navigation-heavy slice after unlocking local Material SVGs.

The goal is to judge whether one strong model can still produce trustworthy reviewed drafts when the batch contains:

- common app-shell navigation icons
- close and settings controls
- a few abstract developer-facing icons
- one intentionally ambiguous power control

## Main findings

### 1. The Material SVG unlock was worth it

Before the local Material path, the Navigation lane had no real visual payloads in this pilot.

With the local export fallback, this batch could visually inspect:

- `material:menu`
- `material:close`
- `material:home`
- `material:search`
- `material:settings`
- `material:arrow_back`
- `material:arrow_forward`

That makes the Navigation lane meaningfully testable instead of name-only.

### 2. Common navigation icons benefited from visual confirmation, but less dramatically than abstract icons

The strongest navigation icons were already directionally obvious from their names:

- `home`
- `search`
- `arrow_back`
- `arrow_forward`

But visual confirmation still helped tighten the recommendation:

- `menu` became specifically about opening app menus or drawers, not generic wayfinding
- `close` became a surface-dismiss control, not an error or failure state
- `settings` became clearly configuration, not tools or automation

### 3. The abstract AI-lane icons exposed why purpose-chip lane assignment is not enough

The visuals showed that some icons currently seeded under `AI & Agents` are not naturally AI-specific:

- `lucide:binary` reads as binary data or machine encoding
- `lucide:blocks` reads as modular components or system pieces
- `lucide:code-xml` reads as code or markup

This is a valuable result. It means the semantic workflow is doing its job by correcting weak lane assumptions instead of rubber-stamping them.

### 4. `tabler:power` remains meaningfully context-sensitive

The icon clearly reads as power, but it still needs surrounding UI context to know whether it means:

- turn on or off
- availability state
- start or stop
- system session control

That makes it a good example of a medium-confidence icon even after visual review.

## Record-by-record highlights

### `material:menu`

- upgraded from vague navigation wording to a precise menu or drawer entry point
- marked medium ambiguity because the hamburger can overlap with list or drag-handle meanings

### `material:close`

- clarified as close or dismiss
- explicitly separated from failure or rejection status meaning

### `material:home`

- confirmed as a strong home or root-destination icon
- one of the clearest records in the batch

### `material:search`

- confirmed as plain search and discovery
- does not need extra AI or scanning meaning layered onto it

### `material:settings`

- confirmed as configuration or preferences
- visual review prevents it from drifting into generic “tools” language

### `material:arrow_back`

- confirmed as previous or back navigation
- low ambiguity in interface use

### `material:arrow_forward`

- clarified as forward or next
- still slightly broader than `arrow_back` because it can also mean continue

### `lucide:binary`

- corrected away from an AI reading
- best understood as binary data or low-level compute

### `lucide:blocks`

- corrected toward modular systems or components
- still broad enough to keep medium ambiguity

### `lucide:code-xml`

- corrected toward source code or markup
- strong low-ambiguity developer icon

### `tabler:alert-triangle`

- confirmed as warning or caution
- strong and low ambiguity

### `tabler:power`

- kept medium ambiguity after visual review
- still a useful record, but clearly context-sensitive

## Recommendation after batch 02

The single-model path continues to look strong.

This batch is especially useful because it did not only confirm easy icons. It also corrected lane drift where the seeded category was too broad or simply wrong.

The next sensible move is:

1. run one more SVG-ready batch with more borderline icons
2. start a stronger editor-review rubric for medium-confidence records
3. keep expanding real visual coverage for the remaining `metadata_only` icons before scaling publication
