# Global SVG Motion Bleed Effect

Date captured: 2026-04-09

## Summary

This document records an accidental but visually striking effect discovered while testing premium animated icons in the customize panel.

When a premium inline SVG preview was clicked, the animation intended for the icon propagated to the entire page. The result was a full-page shake, pulse, or transform that mirrored the selected icon's motion language. The same thing could also happen when using the preview `Play` and `Stop` controls.

This is not the desired default UX for the customize panel, but it is a useful motion pattern worth preserving for future experiments.

Working name: `Global SVG Motion Bleed`

## What It Looked Like

- Clicking an animated icon could make the whole page react as if the page itself were the icon.
- The page could shake, pulse, rise, glow, or tilt based on the selected premium animation.
- The effect felt cinematic and expressive, especially for security-themed icons such as `firewall-wall`.
- It was also disruptive enough that users could interpret it as a bug instead of intentional feedback.

## Root Cause

The effect came from the standalone premium SVG builder in [store.js](../store.js).

The collection bundle CSS was authored to target an icon wrapper plus the SVG, for example:

```css
.si-icon-cell:hover .mnv3on svg,
.icon-card:hover .mnv3on svg {
  animation: qascmc 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
```

During preview/export rewriting, the selector was transformed into a root selector:

```css
:root {
  animation: qascmc 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
```

Because the preview SVG was mounted inline in the page, `:root` referred to the document root rather than an isolated icon wrapper. That made the whole page inherit the motion.

## Where It Happened In This Repo

- Premium collection source animation CSS: [public/packs/security-auth/bundle.json](../public/packs/security-auth/bundle.json)
- Selector rewrite logic: [store.js](../store.js)
- Relevant rewrite behavior:
  - `.si-anim--{name} svg -> :root`
  - `.si-anim svg -> :root`
  - collection token + `svg -> :root`
  - hover replay variants converted to `:root:hover`

## Dependency Chain

1. A premium icon bundle defines hover-driven animation CSS against a wrapper class and `svg`.
2. The customize panel selects a premium icon.
3. `buildAnimatedSvg()` rewrites collection CSS so it can run inside a standalone SVG preview/export.
4. Root-targeted animation selectors are converted to `:root`.
5. The SVG is injected into the page as inline markup.
6. The browser treats `:root` as the page root, so the whole document reacts.

## Why It Felt Good

- It translated a tiny icon interaction into a product-level motion cue.
- It made the page feel alive and reactive.
- It suggested a possible future pattern for threat-state, success-state, or cinematic mode transitions.

## Why It Is Not Good As The Default

- It breaks the user's mental model of what they clicked.
- It creates motion outside the local interaction target.
- It can feel like layout instability or a rendering bug.
- It risks accessibility and motion-sickness concerns if used without clear intent and reduced-motion handling.

## Potential Future Uses

- Threat detected page pulse for security dashboards
- Confirmation burst after completing a protected action
- Full-screen transition between locked and unlocked states
- Marketing/demo mode for premium animated collections
- Controlled ambient motion during hero interactions

## Best-Practice Version Of The Idea

If we want this in the future, we should reproduce it intentionally with an explicit page or container class instead of relying on inline SVG root selector bleed.

### Unsafe accidental version

```css
:root {
  animation: threatShake 500ms ease forwards;
}
```

### Safer intentional version

```css
.motion-surface.is-animated {
  animation: threatShake 500ms ease forwards;
}
```

```html
<main class="motion-surface" id="motionSurface">
  ...
</main>
```

```js
const surface = document.getElementById('motionSurface');
surface.classList.remove('is-animated');
void surface.offsetWidth;
surface.classList.add('is-animated');
```

## Guardrails If We Reuse It

- Scope motion to a dedicated wrapper, not `:root`.
- Give it an intentional trigger and clear UI meaning.
- Respect `prefers-reduced-motion`.
- Keep duration short and amplitude restrained.
- Use on state transitions, not every icon click.
- Avoid coupling it directly to inline SVG selector rewriting.

## Recommendation

Preserve this as a motion concept, not as a side effect. The accidental version was impressive, but the reusable version should be implemented as a deliberate page-surface animation system with named states such as `threat`, `success`, `scan`, or `alarm`.

