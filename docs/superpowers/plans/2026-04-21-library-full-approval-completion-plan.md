# Full Library Approval Completion Plan

**Goal:** Change the library rollout standard so a library is only called complete when every icon in that library has approved semantic metadata or has been escalated to the user for a final decision.

**Why this plan exists:** The earlier rollout closed libraries when every icon had been processed through the pipeline. That was useful for scale testing, but it is weaker than the business standard we want now. Under the stricter standard, processed drafts and holds still count as incomplete work.

## New completion standard

- A library is **fully complete** only when:
  - `source_total_icons = approved_records`
  - there are `0` hold records
  - there are `0` reviewed drafts
- If an icon still cannot be resolved after deeper review, it must be escalated to the user instead of being quietly left behind.
- “Operationally complete” is no longer enough for the main completion milestone.

## Completion workflow

### 1. Reopen the unresolved queue

- For each incomplete library, load:
  - the editor hold queue
  - the reviewed draft set
  - the current approved summary
- Build one working queue that includes every unapproved icon.
- Do not skip any icon because it was previously put in a draft bucket.

### 2. Reclassify by semantic lane

Every unresolved icon must move into the right semantic lane instead of staying trapped in the generic UI lane.

Main lanes:
- `brand_platform`
  - logos, brands, product marks, platforms, payment rails, AI brands, browser brands, crypto brands
- `ui_control`
  - actions, direction, refresh, delete, search states, layout controls
- `domain_object`
  - climate devices, appliance controls, cultural objects, hardware surfaces
- `human_action`
  - posture, movement, exercise, face direction, body state
- `abstract_shape`
  - basic geometry and abstract markers that may still be useful when described precisely

### 3. Review the actual icon shape

- For every unresolved icon, inspect the actual SVG or rendered shape.
- Do not rely only on the icon name.
- If the current wording is weak, rewrite the semantic record until it becomes precise enough to be useful.

### 4. Iterate until the icon becomes suitable

Allowed fixes:
- move the icon into the correct lane
- tighten the label
- rewrite `purpose`
- rewrite `use_when`
- rewrite `avoid_when`
- improve `depicts`
- change category and domain
- add better tags and synonyms

Rule:
- do not stop at “still ambiguous” if a better semantic framing can make the icon suitable
- only escalate to the user after real iteration fails

### 5. Rebuild and verify after each completion slice

- rebuild approved records
- rebuild registry projections
- run library verification
- run the library completion audit again

The library only closes when:
- unresolved count reaches zero
- completion audit reflects full approval

## MingCute completion plan

MingCute is the first incomplete library under the stricter standard.

Current MingCute gap:
- approved: `1529`
- hold: `8`
- reviewed drafts: `119`
- missing from the decision path entirely: `6`
- unresolved total: `133`

Current MingCute unresolved buckets:
- `98` brand and platform icons
- `13` ambiguous UI controls
- `8` human posture or action icons
- `3` domain-specific objects
- `2` abstract shapes
- `3` misc edge cases
- `6` transfer-direction icons that were never written into any approval, hold, or draft file

### MingCute resolution order

1. Resolve `brand_platform`
- Move the brand and platform icons into the same semantic style already proven in Simple Icons.
- These should become normal approved brand records, not permanent drafts.

2. Resolve `ambiguous_ui`
- Tighten semantics for alignment arrows, delete-back, refresh-for-AI, search-none, border-left/right, and similar controls.
- Use the actual SVG shape plus the product meaning, not only the current generic label.

3. Resolve `human_action`
- Reframe these icons as real-world action or posture semantics when that is the clearest honest meaning.
- Do not force them into UI-navigation language if that is not what the icon actually shows.

4. Resolve `domain_object`
- Approve the object or device meaning directly if the icon is clear enough.

5. Resolve `abstract_shape`
- Approve only if the shape can support a stable semantic description.
- If not, escalate to the user with specific choices.

## User escalation rule

Escalate only when all of these are true:
- the actual SVG has been inspected
- at least one better semantic framing was attempted
- the icon still supports multiple equally plausible meanings
- a bad approval would likely hurt agents or users

When escalation is needed, present:
- the icon id
- the shape meaning options
- the recommended interpretation
- why it is still not safe to auto-approve

## Success criteria

- MingCute reaches:
  - `1662` approved
  - `0` hold
  - `0` reviewed drafts
- registry projection updates cleanly
- completion audit shows full approval rather than operational completion only

## Immediate execution

- Write this stricter completion plan
- Start with the largest clean MingCute bucket: `brand_platform`
- Rebuild, verify, and measure the remaining MingCute unresolved count
- Continue through the remaining buckets until MingCute is truly complete or a small user escalation set is reached
