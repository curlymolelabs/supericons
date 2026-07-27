# T1: Traffic classification rules

Date: 2026-07-25
Status: Proposed rule specification, for owner approval before implementation.
Inputs: the T3 production audit (2026-07-25), `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md` goal 6.
Purpose: produce a trustworthy organic denominator so popularity ranking and demand mining read a clean stream.

## Scope correction: most of this already exists

Before writing new machinery, note what is already built and working.

**`classifyMcpTraffic` in `mcp/usage-event-detail.js:36`** already assigns a traffic class on every hosted event, and it already treats the signed controlled-run marker as authoritative, which is precisely the auditor's first rule. Its current outputs are `controlled_test`, `preview`, `local`, `named_cohort`, `unclassified_live`, and `unclassified`.

**The controlled-run marker is cryptographically verified**, not a self-declared header. `mcp/remote-server.js:1351` calls `verifyControlledRunHeaders` against `SUPERICONS_CONTROLLED_RUN_SECRET`, and only a valid signature produces `beta_cohort: controlled-run:<label>`. The web path does the same in `supabase/functions/web-search-telemetry/index.ts:449-451`.

**An unknown class already exists.** `unclassified_live` is the default for production traffic, so the auditor's rule about never forcing every row into a binary is already the shipped behavior.

**Therefore T1 is not "build a classifier."** It is two narrower jobs:

1. add probe detection, because nothing currently separates automated probing from organic use inside `unclassified_live`;
2. expose the organic denominator, because no surface today reports "of N searches, M are organic."

## Step 0: measure the magnitude before building anything

Cheap, and it determines how much the rest is worth.

Query the existing `traffic_class` distribution over the trusted window (2026-07-15 onward), split by channel. Three outcomes:

- **`controlled_test` is already capturing most non-organic traffic and `unclassified_live` is clean.** Then probe detection is a small refinement, and T2 should proceed immediately.
- **`unclassified_live` dominates and contains obvious probe patterns.** Then build the detection described below.
- **Traffic class is unpopulated or inconsistent on historical rows.** Then fix the read path before anything else, because the field exists but is not usable.

Do not build detection machinery until this query says it is needed. At current volume an elaborate classifier is likely to cost more than the error it removes.

## Classes

| Class | Meaning | Authority |
| --- | --- | --- |
| `controlled_test` | Signed controlled-run, internal test, test environment | **Authoritative.** Signature verified; never overridden by heuristics. |
| `preview`, `local`, `named_cohort` | Existing non-production or cohort-labelled traffic | Authoritative, unchanged |
| `probe` | Automated probing or scanning, newly detected | Heuristic, always reviewable |
| `organic` | Live traffic with no contrary evidence | Residual |
| `unknown` | Live traffic with conflicting or insufficient evidence | **Preserved, never forced** |

## Rules

**R1. Signed markers win.** A verified controlled-run signature classifies the row absolutely. No heuristic may reclassify it, in either direction.

**R2. Known executor and audit traffic is separated, not deleted.** Work performed by the executor agent, by auditors, and by verification scripts is its own cohort. It stays queryable; it is excluded from organic.

**R3. Identity count alone never classifies anything.** This rule exists because the working hypothesis that produced T1 was wrong. `network proximity graph nodes` showed 7 searches across 6 fingerprints, but also 4 IP hashes, 5 user agents, four client families, and 3 countries inside roughly four hours. It was the client-family and country spread that indicated deliberate testing, not the fingerprint count. Since fingerprints are network configurations rather than people, a high identity count on its own means nothing.

**R4. Behavioral signals are supporting evidence only, and only in combination.** Burst timing, client-family diversity on one rare query, country diversity in a short window, query rarity, and mechanical request patterns may raise probe suspicion. **No single signal is sufficient.** Require at least two independent signals before classifying as probe.

**R5. Agent retry behavior is not probe behavior.** Agents legitimately rephrase, retry, and issue near-identical sequential queries. This is the product working as designed. Any rule must be validated against sessions known to be genuine before it is trusted, and over-filtering is a worse failure than under-filtering because it silently destroys the demand signal.

**R6. Preserve `unknown`.** A row with conflicting evidence stays unknown. The unknown share is reported, not hidden. If unknown grows large, that is a finding, not a defect to paper over.

**R7. The rule is re-runnable.** It is a query or a function, never a hand-curated list. It must produce the same classification next month without human recall.

**R8. Recompute organic reach only after classification lands**, and report organic searches, organic identities, and the unknown share together. Never quote one without the others.

## Consequences for T2

Two labelling requirements follow directly, both flowing from T3's audit.

**The popularity ranking reads the organic stream**, with controlled test, preview, and probe excluded and unknown excluded by default.

**The ranking carries an honesty label about who it represents.** The audit found ChatGPT accounts for 607 of 629 hosted identities, roughly 96.5%. So "most used icons" currently means, in substance, "most used by ChatGPT users." That is a legitimate and useful signal, but describing it as universal popularity would be a VC-6 problem. State the population.

## Done when

1. The `traffic_class` distribution over the trusted window is known and documented.
2. Every search row in the window carries one of the classes above, with the unknown share reported.
3. Organic searches, organic identities, and unknown share are stated as one figure set, defensible on request.
4. The rule re-runs unattended and is committed as code, not prose.
5. Popularity and demand mining both read the organic stream, and the ranking states the population it represents.
6. The rule has been validated against at least one session known to be genuine, confirming R5.

## Explicitly out of scope

Person-level identity resolution. The T3 audit established that fingerprints are client or network configurations, not people, and no classification rule changes that. Any attempt to deduplicate fingerprints into people is a separate question that cannot be settled before accounts exist.
