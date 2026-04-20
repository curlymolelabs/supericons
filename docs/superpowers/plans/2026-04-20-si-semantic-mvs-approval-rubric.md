# SI Semantic MVS Approval Rubric

Status: Draft for active use  
Date: April 20, 2026  
Owner: Supericons

## Purpose

Define the minimum viable standard a semantic record must satisfy before it is treated as trustworthy enough to move from draft review work into the approved import path.

This rubric exists to stop two kinds of drift:

- approving records because they "feel close enough"
- rejecting useful records because the quality bar is still vague

The goal is not perfection. The goal is a clear, durable quality floor.

---

## What MVS Means Here

Minimum viable standard means:

- the record is specific enough to be useful
- the record is honest enough to avoid overclaiming
- the record is grounded enough to be trusted
- the record is clean enough to publish later without rewrite

A record does not need to be perfect to pass.

It does need to be better than:

- raw source naming
- generic lane defaults
- vague semantic filler

---

## Core Approval Questions

Every reviewed record should answer these questions well enough:

1. Do we know what the icon appears to depict?
2. Is the recommended purpose plausible from the visual plus context?
3. Is the purpose specific enough to guide real product use?
4. Does `use_when` help someone choose the icon?
5. Does `avoid_when` help someone avoid a bad choice?
6. Do the tags and synonyms support retrieval without overreaching?
7. If the icon was seeded in the wrong lane, did we correct that honestly?
8. Is the confidence level fair rather than inflated?

---

## Approval Gates

## Gate 1: Identity is complete

Required:

- `icon_id`
- `source_library`
- `source_name`
- `label`

Pass rule:

- the identity fields clearly point to one icon and one source

Fail if:

- identity is missing
- naming is inconsistent enough to cause confusion

---

## Gate 2: Visual depiction is grounded

Required when a real visual payload exists:

- `depicts`
- `visual_motifs`
- `visual_ambiguity`
- `visual_confusion_notes`

Pass rule:

- the depiction is grounded in what the icon actually looks like

Fail if:

- the description claims more than the image supports
- the ambiguity level is clearly understated

Note:

- if no visual payload exists yet, the record can still stay in review, but it should not be approved under the stronger visual-confirmed standard

---

## Gate 3: Purpose is specific and responsible

Required:

- `purpose`

Pass rule:

- the purpose describes the most responsible recommended use, not just the object shown

Good:

- "Show a warning, caution, or elevated-risk state that needs attention."

Weak:

- "Show a triangle icon."

Fail if:

- the purpose is only a restatement of the source name
- the purpose is too broad to guide real use
- the purpose ignores obvious visual ambiguity

---

## Gate 4: `use_when` is decision-helpful

Required:

- `use_when`

Pass rule:

- a builder could use this sentence to decide whether to pick the icon

Fail if:

- it is generic filler
- it just repeats the purpose without practical context

---

## Gate 5: `avoid_when` prevents bad use

Required:

- `avoid_when`

Pass rule:

- it clearly rules out nearby wrong interpretations

Fail if:

- it is too vague
- it does not help distinguish the icon from close alternatives

---

## Gate 6: Tags and synonyms support retrieval honestly

Required:

- `semantic_tags`
- `synonyms`

Pass rule:

- they improve findability without inventing meanings the icon does not support

Fail if:

- they overstuff adjacent concepts
- they broaden the icon into unrelated domains

---

## Gate 7: Lane fit is confirmed or corrected

Required:

- explicit judgment on whether the seeded lane still fits

Pass rule:

- if the original lane is wrong or too broad, the reviewed record corrects it instead of preserving the seed by habit

Fail if:

- the lane is obviously wrong after visual review and stays unchanged anyway

---

## Gate 8: Evidence and confidence are honest

Required:

- `evidence_sources`
- `confidence_score`
- `confidence_band`

Pass rule:

- evidence sources reflect what was actually used
- confidence fits the ambiguity level

Fail if:

- confidence is inflated for an icon that clearly remains broad or context-sensitive

---

## Approval Outcomes

### 1. Approve for import

Use this when:

- all gates pass
- the record is useful, honest, and clean enough to publish later

### 2. Hold for editor review

Use this when:

- the record is directionally good
- one or two fields still need tightening
- the icon is publishable soon but not yet

### 3. Keep in reviewed draft only

Use this when:

- the review added value
- but the icon remains too ambiguous or context-sensitive for approval

### 4. Rewrite before reconsidering

Use this when:

- the current semantic frame is still misleading
- the lane fit or purpose is substantially wrong

---

## Confidence Guidance

### High confidence

Use when:

- the icon is visually clear
- the purpose is specific
- the confusion risk is low or well bounded

### Medium confidence

Use when:

- the icon is still useful
- but context matters a lot
- or two interpretations remain plausible

### Low confidence

Use when:

- the semantic recommendation is still fragile
- the icon is too broad
- or the review would mislead more than it helps

Low-confidence records should not move into the approved import path.

---

## Practical Rule For Batch Decisions

A record passes MVS if:

- it passes all eight gates at an acceptable level
- it is at least medium-confidence
- and its remaining ambiguity is explicitly acknowledged rather than hidden

---

## What This Rubric Should Change

After this rubric is in use:

- approvals should become more consistent
- ambiguity should be handled more honestly
- lane drift should be corrected earlier
- approved imports should feel safer and more intentional

That is the real point of the rubric.
