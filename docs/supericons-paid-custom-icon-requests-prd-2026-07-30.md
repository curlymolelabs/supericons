# Paid Custom Icon Requests PRD

Date: 2026-07-30
Status: Draft for owner review. Prices and SLA numbers are proposals; final pricing is an owner decision (VC-9 convention).
Builds on: `supericons-creation-flywheel-idea-capture-2026-07-27.html` (idea capture, intake shipped), `si-v2/search/account-value-ladder-2026-07-18.md` (tiers, D-028), `x402-vs-stripe-payment-research-2026-07-05.md` (payment rails), `supericons-kickbacks-shaped-opportunities-2026-07-20.md` (framework fit).
Scope boundary: this doc specs only the paid commission lane. Tiered hosted access is already specced in the account value ladder and is not restated here.

## Purpose

Turn the shipped free request intake (zero-result form, low-result form, sidebar request, Demand Inbox) into a two-lane system: the free lane stays as demand signal and library triage, and a paid lane sells guaranteed craftsmanship with a deadline. Demand is measured, not hypothesized: about 165 zero-result queries and 9 typed requests per 30 days, and the Cybertruck loop already ran request-to-shipped-icon manually once.

## Product shape: two lanes

### Free lane (exists today, unchanged)
- Any user or agent can request an icon. No promise, no deadline.
- Requests feed the Demand Inbox and library triage. Accepted items ship to the free library when capacity allows.
- Never degraded to push people to the paid lane. The free library commitment (VC-1) stays intact.

### Paid lane (new): commissioned icons
- A requester pays a flat fee for a guaranteed decision and, on acceptance, a Supericons-grade icon by a deadline.
- Two delivery modes, priced differently because they trade against the flywheel:
  - **Published** (default, cheaper): the icon ships to the requester and joins the public library. The buyer pays for priority and craft, not exclusivity. This mode grows the library with every sale.
  - **Exclusive** (premium): the icon is delivered privately and withheld from the library. Higher price reflects the lost library value.
- Proposed starting prices, to be set by owner: Published $19 per icon, Exclusive $49 per icon, themed mini-pack (6 to 8 icons) quoted case by case starting near $99. Rationale: high enough to filter noise and respect craft time, low enough for an individual builder's card.

## Flow

### Phase A: manual fulfillment (ship first, weeks not months)
1. Requester submits via the existing forms plus new fields: paid lane opt-in, delivery mode, optional deadline note, contact email.
2. Owner triages in the Demand Inbox: accept, reject, or redirect to free lane. Triage response target: 2 business days.
3. On acceptance, requester receives a Stripe payment link. Nothing is built before payment.
4. Icon is crafted through the Icons Lab pipeline (concept, geometry, real-size review, export). Delivery target: 5 business days from payment.
5. Delivery: download link with SVG plus usage guidance. One revision round included; further rounds are a new request.
6. Published-mode icons enter the library with normal tags and search metadata.

### Phase B: MCP-native requests
- A `request_custom_icon` MCP tool: agent submits name, description, intended use, delivery mode. Response returns a request id and quote terms; payment stays a human step via emailed Stripe link.
- Zero-result responses on hosted search may mention the request path once per session, as information, never as an upsell that displaces results.

### Phase C: agent-paid lane (x402)
- The commission endpoint accepts x402 USDC payment so an agent with a budget can commission without a human checkout. This is a stronger x402 fit than the $1 single icon: the alternative human workflow (find a designer, brief, invoice) is exactly the friction the rail removes.
- Gated on Phase A demonstrating real demand and on the existing x402 deployment approvals. No mainnet deployment without separate owner approval, per the Phase 0 handover.

## Rejection and refund policy

- Reject at triage (before payment): trademark and brand-logo requests that fail the legal review bar in the license integration docs, hate or deception uses, requests outside icon scope.
- After payment, if Supericons cannot deliver to spec, full refund. If the requester abandons revision, delivery stands as-is after 14 days.
- Brand logos of third parties follow the existing logo vetting rules; when in doubt the request is redirected to the free lane as a library candidate instead of sold.

## Success metrics (90-day evaluation)

| question | measure | healthy signal |
| --- | --- | --- |
| Is there paid demand? | Paid requests per month from the ~174 monthly demand events | 3 or more paid in first 90 days |
| Does pricing filter correctly? | Triage acceptance rate, junk rate | Most paid submissions are buildable |
| Does the flywheel benefit? | Published-mode share, library additions from commissions | Published mode dominant |
| Is fulfillment sustainable? | Hours per icon, on-time delivery rate | Under 3 hours craft time per standard icon |
| Does it convert onward? | Commission buyers who later hold Pro or packs | Any nonzero rate |

## Guardrails

- Free intake and free library never degrade to sell commissions.
- No commerce metadata inside delivered SVGs or library payloads; commerce lives in the delivery email and web pages only.
- Zero-result mentions of the paid lane are single, factual, and secondary to showing best-effort results.
- Fulfillment promises scale with solo capacity: if open commissions exceed capacity, the form pauses new paid intake rather than missing deadlines.
- All Phase C crypto steps follow the existing x402 kill-switch and approval plans.

## Open questions for owner

1. Confirm or adjust the three price points.
2. Exclusive mode at launch, or Published only until volume exists?
3. Should commission buyers receive a Pro trial with delivery as a conversion bridge?
4. Minimum viable legal text for commission terms (delivery, refund, license of delivered icon).
