# Premium Special Animation Extraction Audit

## Purpose
Extract the premium-pack animation ideas that feel materially more special than the current Motion Lab preset set, exclude overlap with what Motion Lab already does well, and produce a shortlist worth showcasing and later building.

This audit does **not** change any app code. It only catalogs what is new enough to matter.

## Source Set
- `public/packs/ai-agentic/ai-agentic.css`
- `public/packs/data-charts/data-charts.css`
- `public/packs/ecommerce/e-commerce.css`
- `public/packs/media-playback/media-playback.css`
- `public/packs/navigation-menus/navigation-menu.css`
- `public/packs/security-auth/security-auth.css`
- `public/packs/social-communication/social-communication.css`
- `public/packs/status-feedback/status-feedback.css`
- Baseline overlap check: `store.js`

## Current Motion Lab Baseline
The current preset library already covers these families well enough that premium-pack variants should be treated as overlap unless they add a clearly different motion story:

- Bounce / pop / spring / squish
- Pulse / heartbeat / breathe / glow / flicker
- Ring / wobble / pendulum / shake / tremor
- Spin / flip / vortex / dissolve / implode
- Slide / launch / glide / telegram / sink / puff
- Fade / scale / bloom / warp / shockwave
- Simple orbit, simple magnetic pull, simple jitter

## Excluded As Overlap
These are interesting in the premium packs, but they are too close to current Motion Lab behavior to justify a new preset by themselves.

### Direct overlaps
- `sparkle`, `ring`, `heartbeat`, `rubber band`, `jelly`, `pendulum`, `tremor`
- `loader-2`, `refresh`, `bell`, `phone`, `globe`, `search tilt`, `head bob`
- `bookmarked ribbon drop`, `send launch`, `flag flutter`, `archive drop`, `lock rattle`
- `thumb up`, `thumb down`, `arrow up`, `arrow down`, `trending up`, `trending down`
- `fade/slide/grow` variants that only differ in amplitude or direction

### Weak variations
- simple gear rotations
- simple glow confirms
- simple scale confirmations
- single-part stamp drops
- single-part shake alarms
- single-part wobble notification states

These can still inspire tuning, but they do not qualify as "special" enough on their own.

## Surviving Special Motion Candidates
These are the motion ideas that feel distinct enough to matter because they introduce a new visual logic, a more cinematic sequence, or a richer multi-part story.

| Candidate | Source Collections | Motion Story | Why It Survives |
|---|---|---|---|
| Orbit Chase | AI Agentic, Security/Auth | Satellites orbit and chase around a central node | More complex than current single-body `orbit` |
| Streaming Cascade | AI Agentic, Social/Communication | Text rows or bars step in with a terminal-style cadence | Adds feed/stream logic, not just fade-in |
| Trace + Confirm | AI Agentic, Security/Auth | Border or path draws first, confirmation lands last | Distinct draw-sequence family |
| Flow Through | AI Agentic, Data Charts | Particles or nodes travel through a pipeline | Introduces directional system flow |
| Converge to Core | AI Agentic, Data Charts | Distant dots collapse inward and energize a center | Different from pulse or bloom |
| Cube Turn | AI Agentic, Media Playback | Faces rotate with depth and opacity shifts | Strong 3D form story |
| Cursor Type-In | AI Agentic | Line builds in with cursor blink | A communication/reveal hybrid, not a generic fade |
| Node Reasoning Sequence | AI Agentic | Nodes and connectors light up in ordered steps | Useful for system/process icons |
| Donut Sweep | Data Charts | Ring rotates while arc segments breathe in sequence | Progress + arc sequencing, richer than `ring` |
| Scatter Settle | Data Charts | Particles disperse, then calmly settle into shape | Distinct from jitter or tremor |
| Wave Crest | Data Charts | Bars or peaks ripple from center outward | A directional propagated wave, not simple bounce |
| Filter Through | Data Charts, Security/Auth | Particles squeeze through a funnel or aperture | A true processing metaphor |
| Cluster Gather | Data Charts, Social/Communication | Separate units gather into a tighter group | Better than a plain slide-in |
| Contactless Tap | E-commerce, Security/Auth | Device tilts in, makes contact, pulse confirms, returns | Clear interaction narrative |
| Gift Reveal | E-commerce | Card or voucher slides out of its shell | A reveal motion with containment |
| Card Shuffle Mix | Media Playback, E-commerce | Cards cross over with layered shuffle timing | More cinematic than basic slide/flip |
| Figure-8 Loop | Media Playback | A smooth infinity-loop trace | Different travel path from `orbit` or `glide` |
| Spatial Orbit | Media Playback | Elements rotate on different depth planes | More premium than simple rotation |
| Page Flip | Media Playback, Navigation | A sheet flips with hinge depth and settle | A true hinged transition |
| Book Open | Navigation Menus | Panels open like a hardcover spread | Strong, productizable entrance family |
| Domino Cascade | Navigation Menus | Repeating pieces tip forward in sequence | A cascading physical story |
| Zipper Open | Navigation Menus | Two sides separate in alternating steps | Distinct mechanical reveal |
| Supernova Burst | Navigation Menus | Center compresses, then blasts fragments outward | High-drama special preset |
| Black Hole Collapse | Navigation Menus | Outer pieces get pulled inward and vanish | Visually memorable exit/special |
| Fingerprint Scan | Security/Auth | Ridges illuminate ring-by-ring with scanner focus | A unique biometric pattern |
| Face Focus | Security/Auth | Frame contracts to lock focus, then confirms | A clear recognition story |
| OTP Cascade | Security/Auth | Digits roll or step through like a secure code | A precise stepped UI animation |
| VPN Tunnel | Security/Auth | Perspective pulls inward into a vanishing point | Strong depth cue, distinct from warp |
| RFID Badge Tap | Security/Auth | Badge approaches, taps, radiates, pulls back | A reusable near-field interaction motion |
| SSL Handshake | Security/Auth | Two sides pulse outward into a stable lockup | Good for secure connection metaphors |
| Mail Drop | Social/Communication, Status/Feedback | An item falls into a tray or inbox | Clear object-to-container story |
| Broadcast Cascade | Social/Communication, Status/Feedback | Waves or arcs radiate outward in timed steps | More system-like than `ring` |
| Camera Shutter | Social/Communication, Media Playback | Aperture or lens focuses with a click snap | A tighter lens-specific motion family |
| Blink + Dilate | Status/Feedback, Security/Auth | Eye closes briefly, then pupil reacts | Expressive micro-animation family |
| Chain Snap | Status/Feedback, Social/Communication | Separated parts tug and snap back together | Better than generic magnetic pull |
| Clipboard Stamp | Status/Feedback, Security/Auth | Board or document slams down, mark lands after | A stronger confirm sequence |
| Radar Ping | Status/Feedback | A center dot throbs while a circular scan radiates | Distinct from simple pulse |

## Best Special Set For A First Showcase
These are the strongest survivors because they are visibly distinct in under a second and feel premium even in generic demo shapes:

1. Orbit Chase
2. Streaming Cascade
3. Trace + Confirm
4. Flow Through
5. Converge to Core
6. Cube Turn
7. Cursor Type-In
8. Node Reasoning Sequence
9. Donut Sweep
10. Scatter Settle
11. Wave Crest
12. Filter Through
13. Contactless Tap
14. Card Shuffle Mix
15. Figure-8 Loop
16. Spatial Orbit
17. Page Flip
18. Book Open
19. Domino Cascade
20. Supernova Burst
21. Black Hole Collapse
22. Fingerprint Scan
23. Face Focus
24. OTP Cascade
25. RFID Badge Tap
26. Clipboard Stamp

## Naming Direction
For the bottom Motion Lab quadrant, the extracted set feels stronger with a label that suggests rarity and showpiece motion rather than personal saved animations.

Best options:
- `Special`
- `Super Motion`

If the set remains a curated gallery of standout presets, `Special` is the clearest label.
If the set becomes larger, louder, and more dramatic, `Super Motion` is the stronger brand move.

## Practical Build Advice
When this set moves from audit to implementation:

- extract the motion principle, not the literal icon-specific CSS
- prefer transform, opacity, stroke-dash, and restrained filter use
- keep multi-part sequencing only where it survives on many SVG structures
- test every candidate on:
  - simple outline icons
  - multi-part icons
  - solid filled Material glyphs
  - exported self-contained SVG

## Showcase Companion
This audit is paired with:

- `docs/premium-special-animation-showcase.html`

That file is a visual review surface for the extracted survivors only.
