# Copy and Offer Alignment Plan: Landing Page, Go Pro Banner, Pricing, FAQ, Terms

Date: 2026-04-06
Owner: Frontend (Store UI + Landing Page) + Product
Status: Draft - refined after audit and annual-offer revision

## Goal

Fix stale, misleading, or inconsistent copy across landing and store surfaces tied to icon counts, library counts, MCP terminology, and the approved Pro Annual offer. Establish one source of truth for counts, naming, and offer definitions so future library additions, index refreshes, or pricing updates do not create copy drift.

---

## Source of Truth

- Icon count: `public/icon-index.json.totalCount` (currently `21,264` in generated data dated `2026-03-26`)
- Library count: `public/icon-index.json.libraries.length` (currently `10`)
- Canonical library roster: MingCute, Simple Icons, Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Iconoir, Ionicons, Material Symbols
- Static marketing count: use `20,000+` across titles, descriptions, placeholders, pricing copy, and FAQ copy
- Precise landing stat: if retained, derive it from `icon-index.json.totalCount`; do not treat the hard-coded `24,005` as authoritative
- Runtime-owned landing copy: `main.js`
- Store and legal copy: `store.js`
- Approved offer definitions:
  - `Pro Monthly`: 1 premium collection/month to keep permanently + access all collections while active
  - `Pro Annual`: own all 8 current premium collections now + future premium drops while annual is active
  - `Launch Bundle`: all 8 current premium packs permanently + future updates to those packs; no Pro tools
- Related product decision docs that must be updated or superseded before ship: `docs/pro-tools-credit-system-decision.md`
- Optional follow-up surfaces: `mcp/index.js`, `mcp/package.json`, `supabase/functions/download-pack/index.ts`

> [!IMPORTANT]
> Refined proposal: use `20,000+` for all static marketing copy, and either render the landing icon stat dynamically from `icon-index.json.totalCount` or round it to `20,000+`. Do not keep a hard-coded precise count.
>
> The annual offer change is no longer "copy only." Do not ship annual-offer UI copy unless pricing UI, FAQ, terms, and entitlement behavior all match the approved annual model.

---

## Refined Audit Findings

### Finding 1: Count drift has no authoritative owner

The current product exposes three different icon totals:

- `19,000+` in static landing and SEO copy
- `20,000+` in pricing and FAQ copy
- `24,005` in the hard-coded landing stat

The generated icon index currently reports `21,264` icons across 10 libraries, so the plan should stop treating `24,005` as the live truth.

| Surface | Current copy | Proposed treatment |
|---|---|---|
| `index.html` `<title>`, meta, OG, Twitter, JSON-LD, hero H1, search placeholder | `19,000+` | Update to `20,000+` |
| `index.html` landing stat | `24,005` | Make dynamic from `icon-index.json` or round to `20,000+` |
| `main.js` empty-state runtime copy | `19,000+` | Update to `20,000+` |
| `store.js` pricing + FAQ | `20,000+` | Keep as-is |

### Finding 2: Library roster drift spans marketing and legal surfaces

The app currently serves 10 libraries, but copy still says 9 libraries in multiple places. The legal copy is also using the wrong roster, not just the wrong count.

| Surface | Current | Fix |
|---|---|---|
| Hero subtitle | `9 libraries` | `10 libraries` |
| Hero stat | `9` | `10` |
| Meta description | 9 libraries, missing MingCute | Rewrite as concise summary using `10 libraries` plus representative names |
| JSON-LD | `9 libraries` | `10 libraries` |
| Pricing Free card desc | `9 libraries` | `10 libraries` |
| Pricing Free features | `9 libraries` | `10 libraries` |
| Terms Usage Rights | old 9-library set, includes wrong libraries | Replace with current 10-library roster or simplify wording |

> [!IMPORTANT]
> Recommendation: when a full list is needed, use one canonical ordered roster everywhere: MingCute, Simple Icons, Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Iconoir, Ionicons, Material Symbols.
>
> For space-constrained copy such as SEO descriptions or dense UI paragraphs, do not force the full 10-library roster into one sentence. Use `10 libraries` plus 3-4 representative names instead.

### Finding 3: Monetization language no longer matches the product

The landing hero still uses pre-premium messaging:

- `100% Free`
- `No login. No paywall.`

That is now misleading because the product includes paid packs and a Pro subscription.

**Refined recommendation:**

1. Replace `100% Free` with `1` / `MCP Server`
2. Replace `No login. No paywall.` with `No login required for free icons.`

If layout becomes too tight, the fallback shorter variant is `No login required.`

> [!IMPORTANT]
> Proposal: prefer `1` / `MCP Server` over `MCP` / `AI-ready`. The landing stats currently follow a `number` over `label` pattern, so a non-numeric replacement breaks the visual system. Avoid `0` / `Dependencies` unless product explicitly wants to make a narrower claim about exported code, because it is not currently established as product copy elsewhere in the app.

### Finding 4: `MCP + API` wording implies a separate access product

The Go Pro banner, FAQ, and Terms copy still imply there is a separate API product. Current implementation suggests the MCP server is the programmatic access channel, with keys used for auth and entitlement.

| Surface | Current | Fix |
|---|---|---|
| Go Pro banner features | `MCP + API access for AI agents` | `MCP access for AI agents` |
| FAQ MCP answer | `API access to their premium collections` | `MCP access to their premium collections` |
| Terms AI Output | `SuperIcons MCP server or API` | `SuperIcons MCP server` |
| Dashboard subtitle | `For MCP and programmatic access` | OK |

### Finding 5: Some landing copy is controlled at runtime and should be shortened, not fully enumerated

The empty-state copy appears in both `index.html` and `main.js`. Editing only the HTML fallback will not fix the live experience after the app renders. Also, expanding the sentence to list all 10 libraries will make the paragraph heavier without adding much value.

| Surface | Current | Fix |
|---|---|---|
| `index.html` grid empty state | stale count, incomplete roster | Replace with shorter summary copy |
| `main.js` runtime empty state | stale count, incomplete roster | Update runtime string to match the same shorter summary |

**Recommended summary copy:**

`20,000+ icons across 10 libraries including Material, Lucide, Tabler, and 3,400+ brand logos via Simple Icons. Search, customize, and export in seconds.`

### Finding 6: Smaller factual polish items remain

Two remaining copy issues are small but worth cleaning up in the same pass.

| Surface | Current | Fix |
|---|---|---|
| Feature card palette copy | `Material, Tailwind, Radix, Mono presets.` | `Default, Material, Tailwind, Radix, Mono presets.` |
| Footer link label | `API` | `MCP` or `MCP Setup` |

### Finding 7: Pro Annual now needs distinct offer copy and explicit implementation targets

The current UI still treats annual as monthly with upfront billing:

- the Go Pro banner uses one generic description
- the monthly and annual banner tooltip lists are effectively the same
- the pricing toggle only changes price, not feature copy
- the FAQ explains monthly claiming, not the approved annual offer

That now conflicts with the approved annual proposition:

1. Own all 8 premium collections now
2. Future premium drops while annual is active
3. Motion Lab, Converter, MCP, and commercial use remain included

| Surface | Current | Fix |
|---|---|---|
| Go Pro banner annual tooltip | `1 premium collection/month` | `Own all 8 premium collections now` |
| Go Pro banner workflow bullet | generic workflow wording | `Workflow tools: Motion Lab, Converter (PNG <-> SVG)` |
| Go Pro banner description | one generic string for both plans | Make the description plan-aware so annual highlights immediate ownership |
| Pricing Pro card annual state | price changes only; features remain monthly | Make feature list period-aware and remove monthly cadence from annual |
| FAQ premium-collections answer | monthly-only claim language | Explain monthly and annual separately |
| FAQ cancel/access answer | assumes only claimed-pack ownership | Distinguish owned current collections from future-drop access during active annual term |
| Product decision/support docs | annual = `1 collection/month` model | Update or supersede before launch |

**Recommended annual copy direction:**

1. Annual primary ownership line: `Own all 8 premium collections now`
2. Annual future-drop line: `Future premium drops while annual is active`
3. Do not mention `1 premium collection/month` anywhere in annual UI surfaces
4. Do not imply permanent ownership of future drops unless product explicitly changes entitlement again

---

## Proposed Changes

### Landing Page (`index.html`)

#### [MODIFY] `index.html`

1. Update SEO copy (`<title>`, meta description, OG title, Twitter title, JSON-LD) to use `20,000+`
2. Update SEO copy to use `10 libraries`; in the meta description, summarize with representative libraries instead of forcing the full 10-library roster
3. Update hero H1 from `19,000+` to `20,000+`
4. Update hero subtitle from `9 libraries` to `10 libraries`
5. Replace `No login. No paywall.` with `No login required for free icons.`
6. Change hero stat library count from `9` to `10`
7. Replace hero `100% Free` stat with `1` / `MCP Server`
8. If precise icon stat is retained, add stable ids/hooks so `main.js` can set it from `icon-index.json.totalCount`
9. Update search placeholder from `19,000+` to `20,000+`
10. Update the initial grid empty-state fallback copy to the shorter summary copy, not the full 10-library roster
11. Change footer label from `API` to `MCP`

---

### Landing Runtime Copy (`main.js`)

#### [MODIFY] `main.js`

1. Update the runtime empty-state string to the same shorter `20,000+` summary copy used in `index.html`
2. If dynamic precise landing stats are desired, set the icon count from `data.totalCount.toLocaleString()` after loading `icon-index.json`
3. If dynamic precise landing stats are desired, set the library count from `data.libraries.length`
4. Avoid any future hard-coded precise icon totals in runtime strings

---

### Go Pro Banner + Pricing + FAQ + Terms (`store.js`)

#### [MODIFY] `store.js`

1. Change the Go Pro workflow-tools bullet to `Workflow tools: Motion Lab, Converter (PNG <-> SVG)` in both monthly and annual feature lists
2. Keep the monthly banner feature bullet `1 premium collection/month`
3. Replace the annual banner ownership bullet with `Own all 8 premium collections now`
4. Add an annual banner bullet `Future premium drops while annual is active`
5. Change Go Pro banner features from `MCP + API access for AI agents` to `MCP access for AI agents`
6. Make the banner description plan-aware:
   - monthly: keep the current concise value framing
   - annual: use ownership-first copy such as `Own all 8 premium collections now, plus future drops while annual is active.`
7. Change Pricing Free card description from `9 libraries` to `10 libraries`
8. Change Pricing Free features from `9 libraries` to `10 libraries`
9. Update the Pro pricing card so the annual toggle changes feature copy, not just price
10. Remove `1 premium collection/month` from annual pricing copy entirely
11. Add annual-specific pricing bullets covering immediate ownership of the current 8 premium collections and future-drop access while the annual term is active
12. Refine annual cancellation/ownership FAQ answers so they distinguish:
    - permanent ownership of the current 8 included premium collections
    - future premium-drop access only while the annual term remains active
13. Update any FAQ answer that currently speaks only to monthly claiming so monthly and annual are both explained correctly
14. Keep Launch Bundle clearly differentiated as the cheaper one-time icon-only option with no Pro tools
15. Update Terms Usage Rights to reflect the current library roster
16. Update Terms AI Output to remove `or API`
17. Update any annual-offer wording in the pricing/FAQ/legal surfaces so it no longer contradicts the approved annual model

---

### Related Offer Docs and Support Copy

#### [REVIEW / UPDATE BEFORE SHIP]

1. `docs/pro-tools-credit-system-decision.md` because it currently defines annual as `1 collection/month`
2. Any checkout, billing, or help-copy surface that still describes annual as the monthly cadence paid upfront
3. Any entitlement/help text that could imply permanent ownership of future drops if that is not the implemented rule

---

### Optional Follow-up Scope

If the goal remains "every user-facing surface," extend the same terminology and count cleanup to:

1. `mcp/index.js`
2. `mcp/package.json`
3. `supabase/functions/download-pack/index.ts`

If this pass stays UI-first, explicitly mark those surfaces out of scope.

---

## Out of Scope

1. `dist/index.html` changes (rebuilt from source)
2. Layout or CSS changes beyond minor fit adjustments required by the revised copy
3. Granting permanent ownership of future premium drops unless product explicitly approves that as a separate offer change
4. Large checkout/catalog redesign beyond what is required to support the approved annual offer

## Verification Plan

### Automated Verification

1. Run `node --check main.js`
2. Run `node --check store.js`
3. Run `npm run build`

### Manual Verification

1. Verify `<title>`, OG title, and Twitter title use `20,000+`, and verify the meta description / JSON-LD reflect `10 libraries` where applicable
2. Verify the meta description is concise and summarized rather than attempting to enumerate all 10 libraries
3. Verify the landing hero shows `20,000+`, `10 libraries`, and the updated monetization-safe subtitle
4. Verify landing stats show `10` libraries and `1` / `MCP Server`
5. If precise landing icon count is retained, verify it matches `public/icon-index.json.totalCount`
6. Verify the feature card palette copy includes `Default`
7. Verify the search placeholder says `20,000+`
8. Verify the empty-state copy is correct both before and after app render and uses the shorter summary sentence
9. Verify the footer says `MCP`, not `API`
10. Verify the Go Pro banner monthly and annual states show the correct plan-specific description and feature bullets
11. Verify the annual Go Pro banner no longer mentions `1 premium collection/month`
12. Verify the revised workflow-tools bullet fits cleanly on desktop and mobile
13. Verify the pricing Pro card annual state updates feature copy, not just price
14. Verify no annual pricing surface still claims `1 premium collection/month`
15. Verify the Pricing Free card says `10 libraries`
16. Verify the FAQ explains monthly and annual ownership accurately
17. Verify the cancellation/access FAQ distinguishes permanent current-pack ownership from active-term future-drop access
18. Verify the FAQ MCP answer says `MCP access`
19. Verify the Terms page no longer references `API` and no longer lists the wrong library set
20. Verify Launch Bundle still reads as a separate one-time, no-tools purchase and is not accidentally collapsed into Pro Annual positioning
21. Verify the updated or superseding product-decision/support docs no longer describe annual as `1 collection/month`
22. If optional follow-up scope is included, verify MCP tool/package/license copy is aligned too
