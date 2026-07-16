# Icon design fundamentals: six-source research (2026-07-14)

Commissioned to answer "why must the icon shape be orb-like" and to ground the Agent Pulse shape system. Sources read in full: The Noun Project (vector fundamentals), Upslide Design Studio (principles guide), Hugeicons (how to design icons), Skillshare (10 fundamentals), Dribbble Stories (what makes a great icon set), Material Design icons spec (M3 page is JS-rendered; reconstructed from Google's classic static spec plus M3 deltas, flagged as substitution).

## Consensus across sources

1. Grid-first: 24px is the default working grid (Noun Project, Hugeicons, Material), with 2px minimum gutter / 20 live area; integer coordinates only.
2. One stroke weight, one cap/join style, one corner-radius rule per set; mixing them is the most-cited mistake.
3. Simplicity bounded by the smallest deployed size: design for 16px even while zoomed in; test the full range (Dribbble: 256 down to 16).
4. System over single icon: a set is a constraint system different subjects are drawn within. Consistency is never sameness.
5. Recognizability is the terminal goal (Skillshare names it paramount); metaphors come from literal objects, concepts, or established conventions, and vague metaphors are the cardinal sin.

## Points of difference

- Upslide is a thin checklist (ranges, no point of view). Hugeicons has the best working process (11 steps ending in real-UI testing, plus "a differentiating flourish so it does not look like stock").
- Skillshare is the only source treating shape as meaning: circle = wholeness, vitality, continuity, community; square = stability, formality; triangle = power, momentum; sharp = danger/urgency, round = friendly; thick = importance, thin = delicacy.
- Material is the only source with true optical keylines: on a 24 grid, square subjects draw at 18x18, circles at 20 diameter, rectangles at 20x16 / 16x20, deliberately different dimensions calibrated to read as the same size. Never distort a keyline shape; reduce stroke (to 1.5) when space is tight. Exterior corners 2, interior corners square, terminals squared, no fake 3D, no off-pixel placement.

## On the orb question specifically

- No source warns against a recurring base shape for a sub-family. The closest pattern in the literature is Material's keyline system, which is the same move inverted: Material varies outer geometry within constant craft rules; the orb category holds outer geometry constant and varies the interior. Both are shape-as-system-organizer.
- Skillshare's circle semantics (wholeness, vitality, continuity) fit "the agent, alive and persistent across states."
- The real risks the research assigns to this strategy:
  1. Silhouette monotony: 12 icons with one circular outline are indistinguishable at 16px unless the interior mark carries the signal through strong positive/negative contrast. Subtle stroke variation dies at small size.
  2. Cross-category cohesion must come from craft constants (stroke, radius rule, angle vocabulary, style axis), since shape is not shared between orb and non-orb categories.
  3. Optical weight parity: non-orb categories need calibrated bounds (keyline logic), not fill-the-grid sizing.
  4. Shape personality: keep orb interiors rounded by default; reserve sharp angular interior marks for negative states, where sharp = danger reinforces meaning.

## Adopted into the pack law (agent-pulse pack record, 2026-07-14)

- Keyline table for full-frame subjects (circle 20, square 18, rect 20x16 / 16x20) and calibrated total extent for compositions.
- Interior-contrast rule for shared-silhouette state families.
- Sharp-interior-marks-only-for-negative-states rule.
- New Lab lints: optical-footprint check and a manual 16px sibling-distinguishability gate chip.
- Lab templates extended with square-keyline and rect-keyline archetypes so non-orb categories start from calibrated bounds.
