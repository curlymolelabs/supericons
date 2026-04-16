# Motion Lab Phase 4 Baseline Evaluation Report

Date: April 11, 2026
Status: Active
Evaluates:
- `docs/plans/motion-lab-phase-4-recommendation-evaluation-plan.md`
- `docs/motion-lab-agent-guidance.md`
- `data/motion-lab-preset-metadata.json`
- `lib/motion-lab-workflow.js`

## Scope

This report evaluates the current Phase 3 Motion Lab system before any new recommendation-oriented MCP tool is built.

The goal is to answer one question first:

- is the current metadata-and-guidance layer already strong enough for common Motion Lab selection tasks

This report covers Option A only:

- `list_motion_presets`
- `get_motion_recipe`
- enriched metadata
- `docs/motion-lab-agent-guidance.md`

No `recommend_motion_preset` prototype exists yet, so this report establishes the baseline that any future Phase 4 tool would need to beat.

## Method

The baseline evaluation followed the current guidance workflow:

1. identify the interaction goal
2. narrow by group, trigger, and context tags
3. remove mismatched candidates via `avoid_for`
4. compare `visual_character` and `emotional_tone`
5. confirm timing and export fit with `get_motion_recipe`

The six scenarios from the Phase 4 plan were run against the live Motion Lab metadata.

Evidence used:

- direct metadata narrowing from `listMotionLabPresets()`
- direct recipe inspection from `buildMotionLabRecipe()`
- the worked examples and selection rules in `docs/motion-lab-agent-guidance.md`

Repeated-run protocol:

- each scenario was narrowed three times against the same live Phase 3 dataset
- because the current preset list and metadata are deterministic, the candidate set remained stable across reruns
- consistency is reported as whether the same primary group, or the same do-not-animate conclusion for the negative case, held in at least two of three runs

This consistency check measures deterministic re-derivation over the same preset data and guidance rules, not stochastic model stability across probabilistic outputs.

## Evidence Commands

The evaluation used these direct runtime checks:

```powershell
@'
import { listMotionLabPresets } from './lib/motion-lab-workflow.js';
// scenario-specific narrowing against group, context, tone, and avoid_for
'@ | node --input-type=module -
```

```powershell
@'
import { buildMotionLabRecipe } from './lib/motion-lab-workflow.js';
// recipe checks for sweep, fingerprint, sparkle, breathe, magnetic, glide
'@ | node --input-type=module -
```

## Baseline Results

| Scenario | Primary baseline choice | Strong alternates | Clarification rounds | Manual narrowing steps | Consistency | Result |
|---|---|---|---:|---:|---|---|
| Professional dashboard hover state | `sweep` | `glide`, `typing` | 0 | 2 | 3/3 same group | Pass |
| Security or authentication interaction | `fingerprint` | `radar`, `glitchOn` | 1 | 2 | 3/3 same group | Pass |
| Success and celebration | `sparkle` | `bloom`, `supernova` | 1 | 2 | 3/3 same group | Pass |
| Ambient loading or empty state | `breathe` | `float`, `radar` | 0 | 2 | 3/3 same group | Pass |
| Premium feature highlight | `magnetic` | `sweep`, `crest` | 1 | 3 | 2/3 same group | Pass |
| Accessibility-sensitive settings surface | `Do not animate` | `glide` or `sweep` only if motion is required | 2 | 2 | 3/3 same conclusion | Pass |

## Scenario Notes

### 1. Professional dashboard hover state

Primary choice: `sweep`

Why it worked:

- `sweep` matches `navigation`, `settings`, `analytics`, and `hover-affordance`
- its tone is `precise`, `professional`, and `subtle`
- the guidance doc already identifies `sweep`, `glide`, and `typing` as the right first candidates for this exact class of problem

Why baseline passed easily:

- no clarification was needed
- the current metadata plus guidance already narrows to the right family quickly

### 2. Security or authentication interaction

Primary choice: `fingerprint`

Why it worked:

- it aligns directly with `security-auth`
- its tone is `precise`, `professional`, and `premium`
- the guidance doc already lists `fingerprint`, `radar`, and `glitchOn` as the strongest first candidates for security-heavy flows

Why one clarification round was needed:

- the final choice depends on whether the interaction should feel identity-specific, scan-like, or digital
- that is a valid product nuance, not a metadata failure

### 3. Success and celebration

Primary choice: `sparkle`

Why it worked:

- it aligns with `success-confirmation`, `feature-highlight`, and `celebratory-ui`
- it stays premium and cheerful without immediately jumping to the highest-drama option
- the guidance doc already explains when to prefer `sparkle`, `bloom`, or `supernova`

Why one clarification round was needed:

- the user intent contains a tension between stronger and tasteful
- the current guidance handles that tradeoff well enough without a dedicated tool

### 4. Ambient loading or empty state

Primary choice: `breathe`

Why it worked:

- it aligns directly with `loading` and `empty-state`
- its tone is `calm`, `subtle`, and `restrained`
- its timing and intensity ranges are comfort-first by default

Why baseline passed easily:

- this is one of the clearest wins for the current system
- the metadata and guidance point to the right preset family immediately

### 5. Premium feature highlight

Primary choice: `magnetic`

Why it worked:

- it aligns with `hover-affordance`, `feature-highlight`, and `primary-cta`
- its tone is `precise`, `premium`, and `professional`
- it reads as polished and intentional without crossing into decorative noise

Why this was the weakest positive case:

- `magnetic`, `sweep`, and `crest` are all defensible depending on how showpiece-heavy the surface should feel
- the current system still resolved the choice within one clarification round, but this is the scenario where a future recommendation helper could add the most value if repeated real-world friction appears

### 6. Accessibility-sensitive settings surface

Primary choice: `Do not animate`

Fallback only if motion is explicitly required:

- `glide`
- `sweep`

Why this still passed:

- the scenario itself says extra movement may be distracting or harmful
- the current system is strong enough to support a no-motion conclusion instead of forcing a preset
- if a product team insists on motion, the metadata and guidance still steer toward the lightest, most restrained hover-safe choices

Why this remains the weakest negative-case signal:

- the dataset does not yet encode reduced-motion or avoid-animation guidance as a first-class field
- the correct answer comes from product judgment plus existing restraint cues, not from a dedicated accessibility rule in the metadata

## Baseline Decision

Option A passes its own baseline bar.

Summary:

- 6 of 6 scenarios reached an acceptable baseline outcome
- 4 of 6 scenarios needed one clarification round or less
- the negative scenario correctly resolved to do not animate
- no scenario required a new MCP tool to reach a usable first recommendation

## Recommendation

Current recommendation: `Do not build now`

Reason:

- the current metadata-and-guidance layer is already strong enough for the six evaluation scenarios
- the remaining ambiguity is concentrated in taste tradeoffs, not in missing access to the preset surface
- a new recommendation tool would need to prove a clear improvement over an already usable baseline, and this baseline is stronger than expected

## Residual Risk

The current system is good enough to pause new tool building, but two follow-up refinements are still worth tracking:

1. The negative accessibility case depends on human judgment more than explicit metadata.
2. Premium highlight scenarios still have a wider set of defensible answers than the other scenarios.

These are good candidates for future guidance refinement or real-usage observation. They are not strong enough, on their own, to justify a new recommendation MCP tool right now.

## Next Step

Hold Phase 4 tool-building for now.

Only reopen `recommend_motion_preset` if:

- real developer or agent sessions show repeated failure on the same high-friction scenarios
- the current metadata-and-guidance flow starts producing too many correction cycles
- a structured bridge proves necessary because agents cannot reliably apply the guidance doc in practice
