# Account value ladder

Status: parallel product strategy, not a blocker for Search v2 quality or Railway local-first delivery

Date: 2026-07-18

Decision basis: [`D-028`](decisions.md#d-028-public-local-core-and-tiered-hosted-allowances)

## Product principle

Supericons starts with keyless access and asks for registration only when an account delivers a real benefit. Local-first search stays free and keyless. Hosted allowances protect shared compute and create a fair path to higher limits. [SOURCE: `D-028`]

The public package is the versioned core. The living service earns registration and payment through freshness, higher hosted allowances, account continuity, reliable analytics, premium entitlements, and future protected intelligence. [SOURCE: `VC-3`; SOURCE: `D-028`; ASSUMPTION: these service benefits can support conversion]

## Rung 0: anonymous access

- Eligible local-first search is free, keyless, and not metered by Supericons. [SOURCE: `D-028`]
- Hosted MCP starts without a key and receives a generous measured allowance. [SOURCE: `D-028`]
- Local telemetry is best-effort, disclosed, and optional. [SOURCE: `FR-44`]
- The current tier limiter is not yet implemented; existing IP, concurrency, and spend controls remain the interim protection. [SOURCE: `supabase/functions/_shared/search-engine/rate-limit.ts`; ASSUMPTION: platform spend controls remain configured outside this repository]

Exit condition: the hosted distribution and cost artifact defines candidate thresholds without enabling enforcement. [SOURCE: `FR-43`]

## Rung 1: registered free account

- Self-service free key creation, rotation, and revocation. [ASSUMPTION: lifecycle controls are required for a useful key]
- A higher hosted allowance at both hosted entry points. [SOURCE: `D-028`]
- A limit message may mention only this live higher allowance and the reset time. [SOURCE: `D-028`]
- Synced favorites or collections may be added independently when their data isolation and migration design pass. [ASSUMPTION]

Exit condition: anonymous and registered behavior, key lifecycle, account isolation, two-ingress tier parity, and disabled-until-ready controls pass. [SOURCE: `FR-43`]

## Rung 2: accurate personal analytics

- Fix and verify the usage deduplication and identity contract before presenting counts as personal truth. [SOURCE: `D-028`; SOURCE: `mcp/usage-dedupe.js`]
- Show searches over time, tool and client mix, top searches, and zero-result searches only when the user has voluntarily attached a key. [ASSUMPTION: these are useful first analytics]
- Keep anonymous and aggregate reporting separate from account-specific analytics. [SOURCE: `G-08`; ASSUMPTION: separation reduces privacy and interpretation risk]
- Add analytics wording to limit and signup messages only after this rung is live. [SOURCE: `D-028`]

Exit condition: dedupe, authorization, user isolation, coverage labeling, deletion or retention policy, and dashboard accuracy pass. [SOURCE: `FR-44`; ASSUMPTION: user analytics needs a clear retention policy]

## Rung 3: paid service value

- Paid accounts receive the highest fair-use hosted allowance plus existing Pro and pack entitlements. [SOURCE: `D-028`]
- Team or fleet analytics is considered only after personal analytics demonstrates demand. [ASSUMPTION]
- Fresh hosted intelligence, account continuity, and paid design value remain service-side. [SOURCE: `VC-3`; SOURCE: `D-028`]
- Pricing, packaging, and default experience remain owner decisions. [SOURCE: `VC-9`]

Exit condition: separate product evidence supports a paid extension without weakening the free static library commitment. [SOURCE: `VC-1`; SOURCE: `VC-9`]

## Metrics to learn

| question | measure | status |
| --- | --- | --- |
| How much anonymous hosted use is normal? | Daily and burst distribution by privacy-safe anonymous client, ingress, and tool. | Required before thresholds. [SOURCE: `FR-43`] |
| Does a higher allowance motivate registration? | Limit-message views, signup starts, free-key issuance, and later authenticated use. | [ASSUMPTION] |
| Are registered users receiving the promised value? | Successful higher-tier requests, reset behavior, key lifecycle success, and support failures. | [ASSUMPTION] |
| Is personal analytics trustworthy? | Dedupe correctness, identity coverage, late or missing events, and user-visible count reconciliation. | Required before launch. [SOURCE: `D-028`; SOURCE: `FR-44`] |
| Does free distribution create paid demand? | Conversion to existing Pro or packs, later team demand, and retention by venue. | [ASSUMPTION] |

## Guardrails

- Never require registration for local-first search. [SOURCE: `D-028`]
- Never activate hosted tier enforcement before measured thresholds, working free keys, and honest live-benefit copy. [SOURCE: `FR-43`]
- Never describe best-effort local telemetry as complete. [SOURCE: `FR-44`]
- Never put VC-3 protected classes in npm or web bundles. [SOURCE: `FR-41`]
- Never promise analytics before its data and privacy gates pass. [SOURCE: `D-028`]
- Never use a hidden tier difference at only one hosted entry point. [SOURCE: `FR-43`]
- Never present a fair-use allowance as permanent capacity; adjust it only from measured cost, abuse, and user-impact evidence. [SOURCE: `D-028`; ASSUMPTION: operating conditions can change]
