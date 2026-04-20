# Single-Model Batch 01 Review Notes

## Why this batch exists

This batch is the first focused test of the single-model path for SVG-ready purpose-chip icons.

The goal is to judge whether one strong model can:

- visually confirm what each icon depicts
- detect ambiguity and confusion risk
- improve the draft semantic fields enough to meet the current minimum viable standard

## Main findings

### 1. The lexical drafts were directionally useful but far too generic

The current pilot drafts mostly say:

- `Show X to represent ai & agents in the interface`
- `Show X to represent status & feedback in the interface`

That is enough for queueing, but not enough for trusted semantic publication.

### 2. Visual confirmation materially improved the records

The image confirmed important distinctions such as:

- `tabler:ban` means blocked or prohibited more than generic failure
- `tabler:circle-x` means failed or rejected more than prohibited
- `tabler:toggle-right` means enabled on-state, not generic success
- `tabler:trophy` means achievement or milestone, not ordinary completion
- `lucide:scan-search` fits retrieval or inspection better than plain search
- `lucide:bot-message-square` is specifically assistant-message shaped, not broad AI branding

### 3. The batch suggests one strong model can produce much better first-pass semantics

For this batch, the strong-model review was especially good at:

- turning vague draft purpose lines into usable UI recommendations
- tightening `use_when` and `avoid_when`
- separating nearby but different meanings
- adding better tags and synonyms

## Record-by-record highlights

### `lucide:bot-message-square`

- upgraded from generic AI lane fit to a precise assistant-message meaning
- best for assistant-authored replies and bot conversation surfaces

### `lucide:brain-circuit`

- kept in the AI lane, but narrowed to reasoning, cognition, and intelligent processing
- marked as medium ambiguity because it can drift into generic AI branding

### `lucide:scan-search`

- clarified as scan plus retrieval or inspection, not plain search
- this is a useful example of visual context sharpening the purpose

### `lucide:workflow`

- confirmed as orchestration or multi-step automation
- strong low-ambiguity fit

### `tabler:circle-check`

- corrected to plain success or completion
- explicitly separated from trust or security verification

### `tabler:alert-circle`

- clarified as warning or attention-needed, not hard failure

### `tabler:shield-check`

- correctly belongs in security, not generic status
- one of the clearest cases in the batch

### `tabler:trending-up`

- moved from broad status wording to trend and analytics meaning
- this is a good example of why broad purpose-chip lane labels are not enough

### `tabler:ban`

- corrected to blocked or prohibited
- strong separation from `circle-x`

### `tabler:circle-x`

- corrected to failed, rejected, or cancelled
- not the right icon for restriction or not-allowed

### `tabler:toggle-right`

- corrected to enabled on-state
- this would have been badly under-specified by lexical lane defaults alone

### `tabler:trophy`

- corrected to achievement, reward, or milestone
- marked as medium ambiguity because it can overlap with generic success

## Recommendation after batch 01

The single-model path looks promising for SVG-ready icons.

The next sensible move is:

1. run another SVG-ready batch with more mixed ambiguity
2. keep saving reviewed drafts outside the live registry
3. only after a few batches, decide whether one strong model is the default operating path for the free corpus
