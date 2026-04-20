# P2-C MingCute Visual Review Batch 01 Plan

## Goal

Resolve the first MingCute visual-review queue and promote the visually confirmed records into the live free registry path.

## Why this is the next step

After the first MingCute editor batch landed, the remaining MingCute stage still had:

- `130` editor-review icons
- `41` visual-review icons

The visual-review lane is the smallest clean unresolved slice, so it should move next.

## Scope

This batch covers the remaining MingCute icons that need visual confirmation, especially:

- file actions
- folder actions
- scan actions
- playback controls
- a few ambiguous alignment or direction icons

## Review rule

Approve the icons when the visual shape clearly supports the semantic meaning.

Hold or keep as draft when:

- the shape still drifts across multiple meanings
- the icon belongs to a different workflow, such as brand/logo handling
- the symbol is too broad to approve safely

## Expected outcomes

Likely approved:

- file download, upload, import, export, locked, secure, unknown, zip
- folder download, upload, open, new, locked, secure, zip
- play, pause, stop, skip previous
- scan and barcode scan

Likely not approved yet:

- align-arrow variants
- generic direction arrow
- Google Play
- Play Football

## Work to do

### 1. Build the MingCute visual-review batch

Create a library-specific batch file from the `41` icons already routed to `needs_visual_review`.

### 2. Create reviewed records

Turn the staged records into visually confirmed reviewed records with tighter wording.

### 3. Promote approved records

Add the approved icons into MingCute approved records and rebuild the shared registry projections.

### 4. Generate a contact sheet

Create a visual sheet so the MingCute batch can still be inspected quickly.

### 5. Verify and rebuild

Run:

- MingCute approved-record build
- MingCute approved-record verification
- SI Registry build
- SI Registry verification
- full app build

## Success criteria

This step is successful if:

- the `41`-icon visual queue is resolved
- the approved MingCute count grows
- the registry count grows with those records included
- only the genuinely ambiguous MingCute icons remain held or drafted

## Recommendation

After this batch, the MingCute rollout should return to the remaining `editor_review` queue with a second editor batch, because the visual lane will no longer be the main blocker.
