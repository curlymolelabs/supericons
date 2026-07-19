# Independent critique: free MCP search, signup, and API key policy

Date: 2026-07-18  
Reviewer: independent product/technical review  
Subject brief: `mcp-free-access-api-key-decision-brief-2026-07-18.md`  
Status: critique only. No implementation, no rewrite of the brief.

---

## 0. My reading of the actual decision

The decision is not really "should free users have a key." It is two different decisions that the brief correctly separates but under-weights:

1. **Hosted MCP** consumes Supericons compute on every request. Authentication here is an economic and operational control. The real question is *what allowance* and *what enforcement*, not whether identity is useful.
2. **Local npm MCP** answers eligible free search from the installed package. Supericons pays nothing per search. Requiring a key here is a measurement/tracking gate dressed up as a cost control. That framing is the brief's weakest point.

The brief mostly gets this right in the table, then quietly lets Option B ("require a key for all MCP search") stand as a symmetric choice, which it is not.

---

## 1. Incorrect assumptions, missing context, weak evidence

### Verified facts (from the brief)
- Today free MCP search is keyless on both hosted and local routes.
- The hosted MCP records "privacy-safe identifiers and service measurements" already, without an account.
- 23 registered users exist; their signup reason is unknown.
- Current public API-key docs incorrectly state MCP requires a key.
- Account-bound value today is mostly purchases and Pro tools; free-only account value is limited (favorites are local-storage only).

### Inferences (my judgment)
- The 23 registrations are an unreliable signal because the docs were wrong; some subset registered *because of the incorrect instruction*. The brief says this but the narrative still treats 23 as a signup-willingness proxy. That is weak.
- "MCP users already accept a technical setup process" is used to argue signup friction is small. This conflates *configuring a tool they chose* with *creating an account with a third party they may not trust*. These are different psychological steps. The brief notes the extra steps but under-discounts abandonment.
- Requiring a key for local free search is presented as having "limited cost protection and may be bypassed." The stronger statement: if the searchable data ships in the npm package, a key gate is **purely a telemetry opt-in and cannot be enforced without also phoning home on every local search**, which would defeat the local-first value proposition. This is understated.

### Unknowns (not established by the brief)
- Actual hosted cost per active user and per 1,000 requests. **Everything economic hinges on this and it is absent.**
- Current anonymous abuse rate. The brief assumes abuse is a problem; it has no evidence of material abuse today.
- Setup completion rate under an accurate flow. Unknown.
- Which MCP clients reliably pass and protect env secrets. Unknown, and this is the single biggest compatibility risk.
- Whether the open-source icon data in the local package is licensed in a way that permits or discourages a key gate. Not addressed.

### Weak evidence specifically
- "Unlimited anonymous hosted use may not remain financially sustainable" is asserted, not measured. If hosted cost per user is tiny (a search against a static-ish index), this may be a non-issue at current scale. The brief lists the cost evidence as *needed* but then argues as if the cost is already a threat.
- The claim that a key "creates a stable account identity for limits, abuse control, and product measurement" is true technically, but the *value* of that identity for free local search is near zero to the user and low to Supericons relative to the friction.

---

## 2. Benefits, costs, risks, user friction by route

### Hosted MCP
- **Benefits of a key:** bounded cost, per-account rate limits that beat IP-only limits, abuse response, usage history, comms channel, paid-path hook. All real.
- **Costs/risks:** signup + secret management friction; support load for missing/invalid/exposed/revoked keys; client compatibility gaps (some MCP clients handle env vars poorly or expose them in logs); abandonment by users who only wanted a quick local tool.
- **Friction:** moderate. Acceptable *if* there is a real free allowance and clear instructions.

### Local npm MCP (free, eligible search)
- **Benefits of a key:** identity and measurement only. No cost protection (search is local).
- **Costs/risks:** turns a private, offline, zero-cost action into an account-linked event; may require phoning home to enforce, destroying local-first privacy; alienates open-source-minded users; provides Supericons little economic return for real user cost.
- **Friction:** high relative to benefit. This is the route where a key requirement is hardest to justify.

---

## 3. Dimensions the brief asks me to consider

- **Service cost:** Only hosted MCP has a per-request cost. Local does not. Therefore cost-based authentication policy should apply *only* to hosted. Cost evidence is missing and is the gating fact.
- **Abuse prevention:** Keyless hosted can be abused by bots/scripted clients. Account identity helps, but a lightweight anonymous quota (Option D trial) may prevent most abuse at lower friction. Abuse must be *demonstrated*, not assumed.
- **Useful product measurement:** Anonymous service measurements already exist for hosted. The marginal gain from account identity is cohort continuity and limit enforcement, not raw usage insight. For local, measurement requires telemetry that users may reject.
- **Privacy:** Forcing account linkage on a local, offline search is a privacy regression. The brief's "smallest useful dataset" is good, but it does not confront that local search currently needs no data leaving the machine.
- **Client compatibility:** The brief lists this as needed evidence but does not weigh it. In practice, MCP clients vary widely in how they handle `env`. Some (especially agent frameworks and hosted-client wrappers) make secret injection awkward. This is the most likely *silent* failure mode: a key requirement that breaks setup for a meaningful share of users.
- **Future monetization:** A hosted free allowance tied to a free account is the cleanest Pro/premium on-ramp. Mandating a key for local free search does not improve monetization and may reduce the top of the funnel by adding friction before users see value.

---

## 4. A different option (Option E proposal)

The listed options miss the cleanest model: **authenticate the cost-bearing route, anonymize the rest, and decouple "account" from "key."**

**Proposed policy:**
- **Hosted MCP:** free tier requires a free account + key, but only after a small anonymous allowance (e.g., N requests/day or M requests/session) so users can validate before registering. Stable per-account free allowance thereafter. This is Option D for hosted only, made concrete.
- **Local npm MCP:** stays keyless. Measurement is opt-in and clearly labeled ("help improve search"), default off, and never required for function. If telemetry is on, it sends only the smallest dataset and can be disabled without breaking search.
- **Key model:** support a *free publishable key* distinct from paid entitlement keys, so documentation and client config are stable as users upgrade. Revocation and rotation are self-serve.

This preserves the economic control where it matters, avoids a privacy-regressing gate on local use, and keeps the funnel open. It also makes the "why" explainable: hosted costs money, local does not.

The brief's Option C is close but still frames local as a place where a key "mainly serves identity and measurement," which understates that enforcing it there is actively harmful to the local-first promise.

---

## 5. Recommended policy

**Require a free account and key for hosted MCP only, behind a small anonymous trial allowance. Keep local npm free search keyless, with optional, default-off telemetry.**

Rationale:
- Hosted search is the only route with real per-request cost and abuse exposure; authentication there is defensible and economically necessary *if* costs are shown to matter at scale.
- Local search has no Supericons compute cost; a mandatory key there is a privacy and friction tax with little return.
- A trial allowance removes the "wall before value" problem and lets activation and trial-to-signup be measured.
- Decoupling free keys from paid keys keeps client config stable and supports monetization without punishing free users.
- This satisfies the brief's own decision criteria: bounded hosted cost, reduced abuse, simple enough, works across clients (key only where clients already must reach Supericons), clear user benefit, reasonable free offering, minimal defensible data, paid path, and a measurable rollback rule (monitor hosted cost and trial-to-signup; revert trial if abuse spikes).

Do **not** require a key for local free search. If the local package data is public and the search is offline, a key gate there is unenforceable without phoning home and therefore both ineffective and harmful.

---

## 6. Evidence that could change my recommendation

- **Hosted cost per active user / per 1,000 requests is high** (materially above a few cents per user-month): strengthens the case for a hard key wall on hosted, possibly with a smaller or no trial.
- **Demonstrated anonymous abuse** (bot scraping, sustained bursts, cost spikes): justifies stricter hosted limits and possibly a shorter trial.
- **Setup completion drops sharply** when an accurate key-required flow is shown: argues for keeping the trial and for not extending the key to local.
- **A meaningful share of target MCP clients cannot reliably pass/protect env secrets**: argues against any key requirement until client support improves, or for an alternative auth (e.g., a setup command that writes a config file).
- **Local package license or open-source norms forbid a key gate**: removes Option B for local entirely.
- **Trial-to-signup conversion is near zero**: suggests the free account offers too little value and the policy should ship account value (synced favorites, history) before or with the requirement.

Until the cost and abuse evidence exist, the recommendation should be treated as provisional and the trial allowance kept generous.

---

## 7. Smallest useful experiment before making the policy permanent

Run a **hosted-only anonymous trial with measurement, no hard wall yet**:

- Add anonymous hosted measurement already being collected, plus a clearly labeled *optional* "create free key" prompt in the hosted response after N anonymous requests.
- Measure: anonymous request volume per client/IP, burst/abuse distribution, and **trial-to-signup conversion** when the optional prompt is shown with accurate docs.
- Do **not** change local npm behavior or require a key anywhere during the experiment.
- Fix the incorrect public docs (MCP does not require a key) as part of the experiment so the 23-user signal stops being contaminated.

This costs little, produces the missing cost/abuse/activation evidence, and avoids committing to a permanent gate before knowing whether one is even needed. If after the experiment hosted cost and abuse are immaterial, the default stays keyless hosted with optional account; if they are material, promote the trial into the required free-key tier.
