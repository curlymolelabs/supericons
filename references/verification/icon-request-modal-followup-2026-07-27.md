# Icon request modal follow-up verification

Date: 2026-07-27

## Scope

This follow-up changes only the website icon request presentation:

- The Request an icon sidebar action uses the same font size as other sidebar items.
- A sidebar request opens in a centered modal with a backdrop and close control.
- Zero-result and low-result request forms stay inline.
- Opening the sidebar request does not scroll the grid or trigger another icon batch.

No database, admin API, search, ranking, MCP, recommendation, or icon ordering
logic changed.

## Reproduction

The production page reproduced both reported defects before the fix:

- Request an icon computed to `16px`; Favorites computed to `12.8px`.
- Clicking Request an icon scrolled the grid to `1858px`, loaded another 200
  icons, and pushed the inline form about 806 pixels farther down after it
  briefly appeared.

The first new Chromium regression failed on the font mismatch before the
implementation changed.

## Root cause

The sidebar button used `font: inherit`, which replaced the shared sidebar item
font size with the larger parent size.

The request form lived after the infinite-scroll grid. Calling
`scrollIntoView()` moved the grid to its bottom sentinel, loaded another batch,
and moved the form out of view.

## Verification matrix

| Check | Result |
| --- | --- |
| JavaScript syntax | Passed |
| Icon request static contract | Passed |
| Chromium request flow | Passed |
| Sidebar font size equality | Passed |
| Modal fixed inside viewport | Passed |
| Modal does not scroll or load the grid | Passed |
| Escape and backdrop close behavior | Passed |
| Focus returns to the sidebar action | Passed |
| Five request payload cases | Passed |
| Existing grid behavior | Passed |
| Twelve locale catalogs | Passed |
| Production build | Passed |
| Release preflight inventory | Passed |

The production build contains the modal markup, fixed modal styles, dedicated
request RPC, and no admin artifacts.

## Visual evidence

![Centered icon request modal](icon-request-modal-2026-07-27.png)

The local Chromium screenshot used the shipped icon index. The modal card was
inside the viewport, the input had focus, and the grid scroll position stayed
at zero.

![Live icon request modal card](icon-request-modal-live-card-2026-07-27.png)

## Production release

Website deploy `6a671da03887ad34f1ef7057` was published from commit
`cac55a308`. The previous website deploy
`6a66db661eee4ce20a26e8e0` is the exact rollback target.

The released bundle fingerprints are:

- HTML: `5c2048a3f9981b80561d805a655df6cc83981794aac5747af053f519345d5165`
- JavaScript: `17894a9f9563a596ef1c08fab94de53ede5862f0698dd463ff0959627d130d62`
- CSS: `9d42a805b6d669dee262c40d8bc4df2b4ef2e755d6b2d62ac2db84334bfd3393`

Live Chromium verification passed on both the exact deploy URL and
`supericons.dev`. It confirmed:

- The sidebar action and Favorites both compute to `12.8px`.
- The modal remains fixed and inside the viewport after one second.
- The input receives focus.
- The grid stays at 200 rendered cells and scroll position zero.
- Escape returns focus to the sidebar action.
- Clicking the backdrop closes the modal.
- No page errors occurred.

No production request was submitted during this visual smoke test.

## Request icon hover follow-up

The Request an icon action now uses an inline circle and plus icon. The circle
stays still while the plus grows, contracts, and settles back to its original
size. The motion runs with transforms only and inherits the sidebar text color
through `currentColor`.

The motion sequence is scale 1, 1.28, 0.86, 1.08, 0.98, then 1 over 760
milliseconds. The existing reduced-motion rule disables the animation when the
visitor requests less motion.

Verification completed before release:

- The static contract confirms the icon markup and animation are present.
- Chromium confirms only the plus animates on hover.
- Chromium confirms the icon stroke matches the sidebar item color.
- Chromium confirms reduced-motion mode disables the animation.
- The complete icon request browser flow still passes.
- Existing grid behavior, all twelve locale catalogs, and the production build
  still pass.

The hover follow-up was released from commit `0f37a8f66` as website deploy
`6a6727129065e56af56cdc3a`. Deploy `6a671da03887ad34f1ef7057` is the exact
rollback target.

The released bundle fingerprints are:

- HTML: `5b2385d447c0447a484eb8ac2090f7eabf53320f341afacfbc11d722fcf29fc1`
- JavaScript: `2917f79db409691be6d1a62cf12739aaea8e666ebc628f7b356992375195acc5`
- CSS: `b730bb20959247b8349d50d57e4b70e4e4f8a5f2cca8b8e95f05f0a9fe29f9da`

Live Chromium verification passed on both the exact deploy URL and
`supericons.dev`. It confirmed the plus animation, unchanged ring, inherited
sidebar color, reduced-motion opt-out, modal behavior, sidebar font size, and
grid order. All request writes were intercepted locally, so the live checks did
not create production request records.

## Ring and spark hover follow-up

The hover motion now adds two restrained layers to the existing plus pop:

- The circle grows to 1.08 times its size, contracts slightly, and settles.
- Three small same-color sparks rotate clockwise around the circle and fade.

The ring and sparks use transforms and opacity, do not affect layout, and remain
inside the icon view box. Reduced-motion mode disables the plus, ring, and spark
animations together.

Verification completed before release:

- The static contract confirms the ring and spark animation markup and styles.
- Chromium confirms the ring grows and the sparks rotate on hover.
- Chromium confirms the sparks inherit the sidebar item color.
- Chromium confirms reduced-motion mode disables all three animation layers.
- The complete icon request flow, grid behavior, twelve locale catalogs, and
  production build still pass.

The ring and spark follow-up was released from commit `5b8d2b6df` as website
deploy `6a6729ca897987792e9147ff`. Deploy `6a6727129065e56af56cdc3a` is the
exact rollback target.

The released bundle fingerprints are:

- HTML: `73fea262d83249800d377c6b411eec01fa6187a2c5926beceaf842d01a2a498d`
- JavaScript: `f1d762013d6a971a2b681aeb6e29d6373e71bf5775a8471ce4f67f1991043184`
- CSS: `08a079bfe08751ae7a8c851ba182c840d716e0d692bb91e10835320ceeba5477`

Live Chromium verification passed on both the exact deploy URL and
`supericons.dev`. It confirmed the ring animation, clockwise spark orbit,
inherited sidebar color, reduced-motion opt-out, modal behavior, sidebar font
size, and grid order. All request writes were intercepted locally, so the live
checks did not create production request records.

## Draw and add hover follow-up

The tiny orbiting sparks were not legible enough at the sidebar icon size. The
replacement uses a clearer motion tied to the action:

- A thicker stroke draws the circle clockwise from the top.
- The circle grows slightly while the plus pops in the center.
- A soft outer ripple expands and fades as confirmation.

The effect uses the full icon silhouette instead of small particles. It remains
inside the sidebar item, uses the inherited sidebar color, and changes no
layout. Reduced-motion mode disables the plus, ring, draw, and ripple
animations.

Verification completed before release:

- The earlier static test failed until the new ring draw and ripple existed.
- Chromium confirms the clockwise draw, expanding ripple, ring motion, and plus
  pop at the real sidebar size.
- Chromium confirms both new layers inherit the sidebar item color.
- Chromium confirms reduced-motion mode disables all animation layers.
- The complete icon request flow and grid-order regression still pass.

The draw and add follow-up was released from commit `02012230e` as website
deploy `6a672ccb9065e58af56cdc32`. Deploy `6a6729ca897987792e9147ff` is the
exact rollback target.

The released bundle fingerprints are:

- HTML: `f5ec9e13c423cc48ba9cf86b5abf9a3c88030eac8df9200626086061f1ae5f3a`
- JavaScript: `a64230dbea910ca58821c10bb4a39ff50e088496d3eaf0ecc20ec1cca7603eaf`
- CSS: `a0b1af45d17801bec628ed73d5291f9dff7e12850a7f7e355000148b043beca2`

Live Chromium verification passed on both the exact deploy URL and
`supericons.dev`. It confirmed the clockwise ring draw, confirmation ripple,
ring and plus motion, inherited sidebar color, reduced-motion opt-out, modal
behavior, sidebar font size, and grid order. The old spark markup is absent.
All request writes were intercepted locally, so the live checks did not create
production request records.
