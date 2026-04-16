# Phase 5: Post-Purchase Pipeline

*Designed using IDEO Design Thinking + Socratic Reasoning*

---

## 1. Empathize: The Broken Moment

A user just paid $5. They feel excitement and want instant gratification.

**Current experience:** Stripe redirects to `/?purchase=success`. Nothing happens. The user sees the default "All Icons" page. They think: "Did it work? Where are my icons?"

**Target experience:** User sees a celebration, then lands in their collection with full access.

---

## 2. Define: Three Deliverables

| # | Deliverable | Purpose |
|---|---|---|
| **5A** | Post-purchase welcome flow | Confirm purchase, build confidence |
| **5B** | My Collection view (upgraded) | Show owned collections with unlocked grid |
| **5C** | Premium icon customize panel | Full parity with free icons (color, stroke, export) |

**Critical path:** Purchase → 5A (Welcome) → 5B (My Collection) → Click icon → 5C (Customize) → Export

---

## 3. Detailed UX Design

### 5A. Post-Purchase Welcome

When the page loads with `?purchase=success`:

```
┌──────────────────────────────────────────────┐
│                                              │
│         ✓  Purchase Successful!              │
│                                              │
│    Your collection is ready to use.          │
│                                              │
│         [Go to My Collection]                │
│                                              │
└──────────────────────────────────────────────┘
```

**Behavior:**
1. On page load, detect `?purchase=success` in URL
2. Refresh purchases from Supabase (webhook may have already written the record)
3. Show success toast with confetti-style animation
4. Auto-navigate to My Collection view
5. Clean the URL parameter (use `history.replaceState`)

**Design decision:** No separate page. Use a prominent toast + auto-redirect to My Collection. The user should see their purchased content within 2 seconds of landing, not a wall of text.

---

### 5B. My Collection View (Upgraded)

Currently `renderDownloads()` shows owned collection cards. Upgrade:

```
My Collection
──────────────────────────────────────────────

  ┌──────────────────────────┐
  │ COLLECTION    ✓ OWNED    │
  │                          │
  │   [collection icon]      │
  │                          │
  │ Status & Feedback        │
  │ 50 animated icons        │
  │                          │
  │ [Open Collection →]      │
  └──────────────────────────┘

  (empty state if no purchases)
```

**Click "Open Collection":** Opens the same `renderCollectionDetail()` but with:
- Full opacity (no locked cells)
- No watermark
- No lock badges
- Clicking an icon opens the **premium customize panel** (5C)

---

### 5C. Premium Icon Customize Panel

When a purchased icon is clicked in the collection detail view, the customize panel opens with the same controls as free icons:

```
┌─────────────────────────────┐
│     Customize          ✕    │
│                             │
│    ┌───────────────────┐    │
│    │   [animated SVG   │    │
│    │    preview at     │    │
│    │    64px, colored] │    │
│    └───────────────────┘    │
│                             │
│  checkmark                  │
│  Status & Feedback (SVG)    │
│                             │
│  ── Color ──────────────    │
│  [picker] [hex input]       │
│  [palette swatches]         │
│                             │
│  ── Stroke Width ───────    │
│  [━━━━━━━━━━●━━━━] 2px     │
│                             │
│  ── Container ──────────    │
│  [none][circle][squircle]   │
│  [pill][glass]              │
│  □ Badge dot  □ Light bg    │
│                             │
│  ── Export ─────────────    │
│  [Copy SVG] [Copy Base64]   │
│  [Download SVG]             │
│  ── PNG Size ───────────    │
│  [16][24][32][48][64]       │
│  [128][256] [custom px]     │
│  [Download PNG] [DL ICO]    │
│                             │
│  ── Copy as Component ──    │
│  [React] [Vue]              │
└─────────────────────────────┘
```

**Key difference from free icons:** The SVG source comes from `/packs/{slug}/{name}.svg` (already in public for now), not from `icon-index.json`. The icon object shape differs.

---

## 4. Proposed Changes

### 5A. Post-Purchase Welcome

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- In `initStore()`: detect `?purchase=success` URL param
- Refresh purchases from Supabase
- Show success toast
- Auto-switch to My Collection view (`switchView('downloads')`)
- Clean URL with `history.replaceState`

---

### 5B. My Collection View

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) `renderDownloads()`

- Replace bare card list with styled "My Collection" header
- Each card shows "Open Collection" CTA
- Click opens `renderCollectionDetail()` in unlocked (owned) mode
- In unlocked mode: icon clicks call `selectPremiumIcon()` (new function, 5C)

---

### 5C. Premium Customize Panel

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- Add `selectPremiumIcon(iconName, collectionSlug)` function:
  1. Fetch SVG from `/packs/{slug}/{name}.svg`
  2. Create a mock icon object compatible with `renderPanelForIcon()`
  3. Call `renderPanelForIcon()` from main.js (needs to be exported/accessible)

#### [MODIFY] [main.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

- Export `renderPanelForIcon()` (or make it callable from store.js)
- The function already handles SVG icons. Premium icons fit the same shape:
  ```js
  const mockIcon = {
    id: iconName,
    name: iconName,
    lib: 'premium',
    type: 'svg',
    svg: svgContent, // fetched from /packs/
    style: 'outline'
  };
  ```
- Add `libraryMeta['premium']` entry with `{ name: 'Premium', hasStroke: true }`

#### [MODIFY] [style.css](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

- Success toast animation (confetti/celebration style)
- My Collection header styling

---

## 5. Scoping Decisions

| Decision | Rationale |
|---|---|
| **No separate welcome page** | Toast + auto-redirect is faster than a full page. Users want their icons, not marketing copy. |
| **Reuse `renderPanelForIcon()`** | The free customize panel already has all controls. Building a second panel would violate DRY and the PRD principle ("same customize/export experience as free icons"). |
| **Mock icon object** | `renderPanelForIcon` expects `{id, name, lib, type, svg}`. We create this from the fetched SVG. No new data model needed. |
| **SVGs stay in /public for now** | PRD says private Supabase Storage, but for MVP the SVGs are already in `/public/packs/`. Server-side gating can be layered on later without changing the customize flow. |

---

## 6. Verification Plan

### End-to-End Flow
1. Purchase a collection via Stripe test checkout
2. Verify: redirected to app with `?purchase=success`
3. Verify: success toast appears
4. Verify: auto-navigated to My Collection
5. Verify: owned collection card shows with "Open Collection" button
6. Verify: click opens unlocked detail view (no locks, no watermark)
7. Verify: click icon opens full customize panel (color, stroke, export)
8. Verify: export works (download SVG, download PNG)

### Edge Cases
- User has no purchases: empty state with CTA to browse
- `?purchase=success` but webhook hasn't fired yet: retry fetch after 2s
- User refreshes My Collection: purchases persist from Supabase
