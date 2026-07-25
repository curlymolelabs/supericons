# T3: What "Estimated reach" actually counts

Date: 2026-07-25
Status: **Closed, post-audit.** Source investigation corrected by production audit at cutoff 2026-07-25 11:30 UTC.
Supersedes: the pre-audit version of this document, whose business conclusion was overstated.
Audit request: `docs/si-v2/search/reviews/t3-estimated-reach-definition-audit-request-2026-07-25.md`

## Status line

> Identity definition confirmed. Hosted identities are month-stable and not session-scoped. **Person-level reach and registration conversion remain unverified.**

## The mechanism, confirmed

Identity resolves through a first-available precedence ladder in `lib/admin-dashboard-metrics.js:119`: `user_id`, then `api_key_hash`, then `anonymous_client_hash`, then `session_hash`, then `ip_hash`. Only the first match is used.

Hosted MCP lands on the third rung. `mcp/remote-server.js:1367` builds it as a SHA-256 of `clientIp | userAgent | clientFamily | monthBucket | supericons-hosted-mcp`. There is no per-process or per-request component, so identity persists across requests and across days within a UTC month.

Production confirmed this directly:

| Measure | Value |
| --- | --- |
| Searches in window | 1,773 |
| Estimated identities | 644 (hosted 629, web 13, local 2) |
| Missing identities | 0 |
| Hosted searches | 1,685 |
| `anonymous_client_hash` populated | 1,685 of 1,685 (100%) |
| Public IP confirmed | 1,427 of 1,685 (84.7%) |
| Identities seen on multiple days | 153 |
| Identities making multiple requests | 305 |

The live V2 API reconciled exactly with direct database calculation. The concern that hosted identity silently falls back to a session-scoped rung is **refuted**. Local npm remains per-process per-day, but at 2 identities it is immaterial.

## Corrections to the pre-audit version

Four claims in the original did not survive.

**The registration rate was not a measurement.** Dividing 27 all-time accounts by 632 thirty-day identities compares two populations over two different spans. Only 2 search identities are account-linked, so no attribution connects an anonymous searcher to a registration. Same-window the ratio is 23 accounts to 632 identities, roughly 3.6%, which is suggestive of weak signup adoption but is **not a conversion rate and cannot by itself justify prioritising conversion over traffic.**

**An empty IP does not null the anonymous hash.** `hashUsageValue` returns null on empty input, which holds for the session hash, but the anonymous hash is built from a template string that is never empty. An IP-less request still receives a hash, merely one with less distinguishing power.

**The month-boundary double-count is a future risk, not a current defect.** Trusted data begins 2026-07-15, so the window contained no June identities to double-count. This becomes live once August starts.

**Returning clients are not display-only work.** The current V2 Overview API does not expose `returning_clients_within_month`. The older endpoint returns a value but includes large volumes of controlled local MCP activity, reporting 5,235 searches and 2,645 identities, so surfacing it would reintroduce untrusted telemetry. The metric must be computed and exposed through the V2 final-outcome path. Small backend work, not a UI change.

## A fingerprint is not a person

This is the finding that most changes how the number should be read.

**Only 12 distinct user-agent hashes produced all 629 hosted identities.** With the user agent nearly constant across the population, the fingerprint's distinguishing power comes almost entirely from IP address. The identity is closer to an IP count than a person count.

It therefore **overcounts** one person who switches networks, uses a VPN, or works from more than one client, and **undercounts** several people sharing a corporate NAT or a cloud host with the same client. The honest label is **estimated client or network configurations**, not people.

## The strategic finding inside the audit data

Not a defect, and not flagged in the audit's own conclusions, but the most consequential number produced by this work:

**ChatGPT accounts for 607 of 629 hosted identities, or 96.5%.**

Two consequences.

1. **The ChatGPT app directory is not a channel; it is effectively the entire business.** That is validation that the listing effort worked, and simultaneously a concentration risk. A policy change or ranking shift inside that catalog would be close to an extinction event for current traffic. Unlike the conversion question, this finding does not depend on person-level identity accuracy at all.
2. **The dominant channel has the weakest path to registration.** A user reaching Supericons inside ChatGPT has no browser session, no obvious signup surface, and no reason to leave the conversation. That is a structural explanation for flat account growth that has nothing to do with funnel quality, and it is a hard design constraint on rung 1: if free keys and collections cannot be obtained and used from inside an agent conversation, registration will stay flat no matter how good the offer is.

## Open items

1. **Clarify the 153 collision.** The hosted-scoped production calculation reports 153 multi-day identities over 629 identities; the older endpoint separately reports 153 while covering 2,645 identities. Identical numerators over denominators differing fourfold warrants one clarifying query before either figure is quoted.
2. **Expose `returning_clients_within_month` through the V2 final-outcome path.** Backend plus display.
3. **State the definition on the reach card.** `docs/admin-dashboard-refactor-spec-2026-07-16.md:27` already requires "estimated unique clients" wording. Consider going further to "estimated clients or networks" given the 12-user-agent finding.
4. **Registration attribution cannot exist before rung 1.** Nothing links an anonymous searcher to an account today. Any conversion claim must wait for free keys, which means conversion cannot be the basis of a decision made now.

## What this does and does not license

**Supported by evidence:** the identity is month-stable; reach is a client-or-network estimate; traffic is overwhelmingly hosted and overwhelmingly ChatGPT; signup adoption is low in absolute terms.

**Not supported:** any specific conversion rate; any claim about number of people; any traffic-versus-conversion prioritisation resting on the ratio of accounts to identities.

## Verification basis

Mechanism read from `lib/admin-dashboard-metrics.js`, `mcp/remote-server.js`, `mcp/telemetry.js`, `supabase/functions/admin-api/index.ts`, and the two 2026-07-16 dashboard specifications. Production figures supplied by the independent audit at cutoff 2026-07-25 11:30 UTC, which reported the live V2 API reconciling exactly with direct database calculation. No production data was modified.
