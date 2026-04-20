# P2-B MingCute Editor Review Batch 01 Plan

## Goal

Move the first safe slice of MingCute staged records from automation into reviewed and approved registry records.

## Why this is the next step

MingCute batch 01 is already staged:

- `226` icons selected
- `185` routed to editor review
- `41` routed to visual review

The next safe move is not to review all `185` at once. It is to take a strong first editor batch, approve the clean records, and prove that MingCute can feed the live registry path the same way the purpose-chip rollout did.

## Batch 01 Scope

Use a curated first slice of high-signal MingCute icons:

- strong source-name signal
- obvious UI-control meaning
- close to already-approved semantic patterns
- avoid the trickiest directional, playback, and mixed-metaphor icons for now

Target:

- about `50` to `60` reviewed MingCute icons

## Included patterns

- search
- back and forward
- dashboard
- home
- filter
- sort
- refresh
- delete
- lock and key
- visibility
- menu
- fullscreen

## Deferred for later

- diagonal arrows that need tighter direction wording
- backspace-like or mixed back/delete icons
- AI-refresh hybrids
- playback and rewind variants

## Work to do

### 1. Create the MingCute review batch

Add a batch selection file that picks the strongest first `50` to `60` MingCute records from the staged queue.

### 2. Build reviewed records

Transform the staged candidates into reviewed records with:

- corrected labels
- clearer purpose text
- stronger `use_when`
- stronger `avoid_when`
- public-safe evidence fields only

### 3. Promote approved records

Write the approved MingCute records into:

- `data/si-registry/automation/mingcute/approved-records.json`

and keep library-specific hold data separate.

### 4. Wire MingCute into the live registry

Add the MingCute approved-record path to the SI Registry manifest so approved MingCute records become part of the real free registry projections.

### 5. Verify the result

Run:

- MingCute approved-record verification
- SI Registry projection verification
- full build

## Success criteria

This step is successful if:

- the first MingCute review batch is generated cleanly
- the approved MingCute records are public-safe
- the SI Registry count grows with MingCute records included
- the verification scripts and full build pass

## Recommendation

After this batch lands, the next MingCute step should be:

- the first MingCute visual-review batch

That keeps the rollout moving while the stronger first editor slice is already in the registry.
