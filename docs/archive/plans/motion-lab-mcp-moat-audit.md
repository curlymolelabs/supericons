# Motion Lab MCP Moat Protection: Audit and Gap Analysis

Date: April 12, 2026
Status: Review
Author: Antigravity (audit agent)
Source document: `docs/plans/motion-lab-mcp-moat-protection-proposal.md`
Methodology: Socratic prompting applied to five dimensions: threat model accuracy, architecture completeness, transition risk, business logic, and execution readiness.

---

## Audit Method

Each section below applies a Socratic probe before stating a finding.
The probe is the question a senior engineer would ask first.
The finding is what the code and proposal actually show.
The recommendation follows from that.

---

## 1. Threat Model: Is the Risk Actually as Described?

### Probe

> "What specific artifacts does an attacker inspect, and what can they reproduce from them?"

### Finding: The risk is real but the proposal narrows it incorrectly.

Reading the actual package structure reveals four concrete exposure planes, not one:

**Plane 1: keyframe definitions in `lib/motion-lab-presets.js`**
The full 80-preset keyframe dataset (1,265 lines, verified in session) ships as plain readable JavaScript via the relative import chain:
`mcp/motion-lab.js` -> `../lib/motion-lab-workflow.js` -> `./motion-lab-presets.js`.
A competitor installing `supericons-mcp` via `npx` gets every `translateX`, `scale`, `rotate`, `clip-path`, `drop-shadow`, and `easing` value verbatim. The proposal treats keyframes as "shared preset ids and groups" that are safe to ship locally. That classification is incorrect. The *ids and group names* are low-risk. The *keyframe geometry* is the actual product innovation.

**Plane 2: intensity-scaling algorithm in `lib/motion-lab-workflow.js`**
The `scaleKeyframesByIntensity` function (lines 17-55) is a non-trivial algorithm that handles five different CSS property types with special-cased scaling rules. It is not a commodity utility. It ships locally and is fully readable.

**Plane 3: curated agent metadata in `data/motion-lab-preset-metadata.json`**
Confirmed referenced by `getMotionLabAgentMetadata` (imported in `lib/motion-lab-workflow.js`), served in full on every `list_motion_presets` call. The fields `visual_character`, `emotional_tone`, `recommended_contexts`, and `avoid_for` represent hand-curation effort. They ship locally.

**Plane 4: the CSS export assembly pipeline**
`buildMotionCss`, `buildKeyframesCss`, `getAnimationRule`, `buildMotionLabExternalCss`, `buildMotionLabAnimatedSvg`, and `buildMotionLabBundle` are all in the shipped package. The full CSS output is algorithmically reconstructable because the complete keyframe source is also shipped.

**What the proposal gets wrong:** It focuses on "premium workflow heuristics and decision logic" as the primary protection target. The more immediately copyable assets are the keyframe geometry and the intensity-scaling engine. A competitor does not need the decision heuristics to clone the animation product. They need the keyframes.

**Proposal gap:** The protection classification (Section 4 of the proposal) does not name keyframes and the intensity-scaling function as items that "should move behind Supericons-controlled infrastructure." They should be the first item in that list, not an implicit omission.

### Recommendation

Rewrite the Protection Classification section to lead with:
1. Keyframe geometry (the 80-preset keyframe arrays)
2. Intensity-scaling algorithm
3. Curated agent metadata (already identified)
4. Export orchestration logic (already identified)
5. Future recommendation logic (already identified)

---

## 2. Architecture: Is the Target Architecture Technically Coherent?

### Probe

> "If we move the keyframes server-side, can the local MCP still produce deterministic CSS output, and what does the request/response shape look like?"

### Finding: The proposal describes a direction but skips the critical shape question.

The target architecture (Section 5: "Proposed Moat Strategy") says:

> "The local process can call Supericons services when premium functionality is requested."

But it does not specify what the local thin adapter receives from the server. There are two fundamentally different server responses possible, and they have different security trade-offs:

**Model A: Server returns pre-rendered CSS**
The server takes `(presetId, trigger, durationMs, intensityPercent)`, runs `buildMotionCss` server-side, and returns finished CSS text. The local package never sees the keyframe source.
- Pro: keyframes stay fully opaque on the client.
- Con: the server must produce a large CSS string per call; caching by parameter is straightforward but the surface area is wide.

**Model B: Server returns resolved keyframe data**
The server returns a compressed or version-tagged keyframe payload, the local package assembles CSS from it.
- Pro: smaller response, more flexible local rendering.
- Con: the keyframe data is back on the client, defeating the purpose if the client stores or logs it.

**Model C: Hybrid - server returns compressed+signed keyframe snapshot**
Similar to B but the keyframe representation is not human-readable (e.g. binary delta encoding), the local assembler cannot easily extract and reuse it.
- Pro: operationally more flexible than Model A while raising the reverse-engineering cost.
- Con: more complex to implement correctly.

**The proposal does not choose.** Phase B (hybrid spec) is listed as a deliverable, but its shape must be decided *before* Phase A (exposure audit) can classify what to move, because the classification depends on the server-response model.

### Recommendation

Add an **Architecture Decision Record** stub to the Phase B deliverable. It must answer:
- Does the server return rendered CSS, raw keyframe data, or a signed opaque payload?
- Is the local package allowed to cache server responses, and for how long?
- What is the fallback rendering quality when the server is unavailable?

The order of Phase A and Phase B should be considered carefully. The exposure audit cannot be fully completed without knowing the target state.

---

## 3. Entitlement: Is the Current Auth Model Sufficient to Gate Premium Endpoints?

### Probe

> "If we add a premium hosted endpoint today, what does auth look like, and is there a risk of the same key being shared by many users?"

### Finding: The auth model exists and is used, but it is call-time validated only at startup.

Reading `mcp/auth.js`:
- Auth is validated once at MCP server startup via `initAuth()`.
- The result is stored in module-level `authState`.
- All subsequent tool calls use the cached `authState` without re-validation.

This means:
- If a Pro user's key is revoked after the server starts, the server continues to behave as Pro until restarted.
- If a key is shared by multiple simultaneous `npx supericons-mcp` processes on different machines (a policy concern, not a technical one), each process independently validates against the server and gets its own `authState` snapshot. The server cannot distinguish sessions.

For the current icon access model, this is an accepted trade-off. For premium Motion Lab endpoints that return rendered CSS assembled from server-side keyframes, the startup-only validation creates a window. If the premium endpoint serves anything cacheable (e.g. rendered CSS strings), a single validation pass at startup is not auditable per-call.

**Proposal gap:** Section 2 of the requirements says "Entitlement enforcement and usage metering" should move to hosted infrastructure. But the plan does not acknowledge that the current startup-only auth pattern must change to per-call auth when calls proxy to a premium hosted endpoint.

### Recommendation

Add an explicit requirement to Phase B to specify the auth request pattern for premium endpoint calls:
- Per-call token validation, or
- Short-lived session token issued at startup and re-validated on expiry, or
- API-key forwarding with server-side rate limiting and per-request logging.

This is not a breaking change to add to the plan; it is a gap in the current requirements.

---

## 4. Transition: What Does a "Thin Adapter" Actually Break for Existing Users?

### Probe

> "If we ship Phase D (thin MCP migration) and the Supericons hosted service is unavailable, what does the user's AI coding agent see?"

### Finding: The proposal lists fallback behavior as a Phase B spec concern but does not pre-answer the design question.

Section 5 (Requirement 3: Preserve local DX) says:

> "The MCP should still feel easy to install and use."

But the current six Motion Lab tools (`list_motion_presets`, `get_motion_recipe`, `export_motion_css`, `export_animated_svg`, `animate_icon`, and the bundle tool) all produce complete outputs locally with zero network dependency. After the thin migration, every premium call will add a round-trip to Supericons services.

The fallback question has at least three valid answers with different product implications:

- **Hard fail:** Tool returns an error when the server is unreachable. Simplest. Worst DX if the server has an outage during a developer's session.
- **Graceful degradation:** Tool returns a reduced-quality result (e.g. basic CSS from local keyframe stubs) and signals that premium enrichment was unavailable. Preserves some value but requires maintaining a thin local stub layer.
- **Cached-response replay:** Tool returns the last successful server response for the same parameters. Works for deterministic inputs; risks serving stale data if the metadata changes server-side.

**Proposal gap:** The proposal identifies residual risk from the fallback question ("offline or unauthenticated") in Phase B but does not commit to a fallback design principle. This is a product decision that will affect Phase B spec, Phase C implementation, and Phase D migration. It should be a named open question, not buried in a phase deliverable.

### Recommendation

Promote the fallback design decision to the Open Questions section of the proposal. Phrase it as:

> "When the hosted premium endpoint is unreachable during a developer session, what should the local MCP return: a hard error, a degraded local result, or a cached replay of the last successful response?"

This decision gates the level of effort in Phase C and D.

---

## 5. Business Logic: Does the Phase Order Minimize Risk?

### Probe

> "What is the smallest change we could make right now that reduces exposure without requiring any hosted infrastructure?"

### Finding: The proposed phases are correct in direction but miss a high-value, low-cost pre-phase.

Before building any hosted infrastructure, there is one meaningful action that reduces exposure immediately: **strip the keyframe geometry from the npm tarball without changing the API surface.**

Specifically:
- The `lib/motion-lab-presets.js` file could be replaced at publish time with a stub that maps preset IDs to server endpoint calls.
- Or a separate `mcp/` publish bundle could omit `lib/` and instead include a compressed, non-human-readable representation of the keyframes that is only useful at runtime (not for reading and copying).
- Or the npm tarball's `files` field in `package.json` could be audited and tightened to exclude files that do not need to be there.

Currently, `mcp/package.json` has **no `files` field**. This means npm publishes everything in the `mcp/` directory and all relative imports it resolves, which includes the full `lib/` tree.

**Proposal gap:** Phase A (packaging and exposure audit) identifies this correctly as a deliverable ("audit exactly what the npm tarball includes"). But it frames the output as an "exposure matrix" rather than a "pre-publish hardening action." The distinction matters: an exposure matrix is documentation; a pre-publish hardening action is a deployable change.

### Recommendation

Split Phase A into two parallel tracks:
- **Phase A1:** Exposure inventory (the matrix).
- **Phase A2:** Immediate tarball hardening. Add a `files` field to `mcp/package.json` that excludes everything except what is strictly needed to run the MCP server. This does not require any hosted infrastructure and can ship before Phase B is designed.

Phase A2 is a reversible, one-file change that meaningfully reduces the "inspectable surface" of an npm install today.

---

## 6. Execution Readiness: Is There a Decision Dependency the Plan Has Not Named?

### Probe

> "What decision must be made before Phase B can produce a correct spec?"

### Finding: The browser app's premium path is not addressed, creating a silent architectural fork risk.

Open Question 4 in the proposal asks:

> "Does the browser app already need the same hosted premium layer, or should MCP be the first consumer?"

This is correctly identified as an open question, but it is also an execution blocker. If the browser app ever needs the same hosted premium endpoints, then Phase C (first hosted premium endpoints) must be designed with two consumers in mind from the start. Retrofitting a second consumer after the endpoint is designed for MCP-only often requires breaking changes to the response shape or auth flow.

The proposals says MCP should be the first consumer, but does not commit to a timeline for when the browser app joins. This creates a risk that Phase C is designed as a one-consumer endpoint and then must be redesigned for the browser.

### Recommendation

Resolution before Phase B begins:

1. **Commit to "MCP first, browser later" with an explicit constraint:** The Phase C endpoint design must be consumer-agnostic from day one (standard bearer token auth, standard JSON response shape, no MCP-specific protocol assumptions). This prevents a retrofit.

2. **Name the browser integration as Phase F** (after Phase E docs) so it is on the roadmap but visibly deferred.

---

## 7. Success Metrics: Are They Verifiable?

### Probe

> "For each success metric, what test could a developer run to check it?"

### Finding: Three of the five success metrics are not measurable as written.

The proposal's success metrics are:

| Metric | Measurable? | Gap |
|---|---|---|
| "the local MCP package remains easy to use" | No. | "Easy" is subjective. No DX test is defined. |
| "premium functionality depends on Supericons-controlled services" | Yes, after Phase D. Run the package without a server connection; premium tools should fail or degrade. | None. |
| "cloning the npm package no longer reproduces the premium workflow quality" | Partially. Requires a manual recreation test. | The baseline quality standard is not defined. |
| "recommendation and export quality improve without being fully inspectable in the client" | No. | Quality improvement is not tied to any benchmark. |
| "entitlement enforcement and usage visibility improve" | Yes, after server-side metering is live. | Only measurable post-Phase C. |

### Recommendation

For each metric, add a "verification method" field in the proposal:

- Easy to install: measured by the number of setup steps in the install doc. Target: three or fewer.
- Premium gated: verified by running the package offline after setup. Premium tools must return an error or degraded result.
- Clone resistance: verified by a manual recreation test where a competitor installs the npm package and attempts to reproduce a given preset's CSS output. The test passes if the output is not reproducible without a server call.
- Quality improvement: deferred until Phase C produces the first hosted endpoint. Baseline is the current local output for a fixed set of test parameters.
- Entitlement: verified by a server-side call log showing per-user, per-call tracking.

---

## Summary Table

| Finding | Severity | Proposal Gap | Recommended Action |
|---|---|---|---|
| Keyframes and intensity-scaling algorithm are the primary copyable assets, not decision heuristics | High | Protection classification mis-orders the priority | Reorder to lead with keyframe geometry and scaling engine |
| Server response model for premium endpoints is not defined | High | Phase B spec cannot proceed without this choice | Add Architecture Decision Record to Phase B scope |
| Startup-only auth does not support per-call metering | Medium | Entitlement requirement does not address auth frequency | Add per-call auth pattern to Phase B requirements |
| Fallback behavior when server is unreachable is not committed to | Medium | Buried in Phase B spec concern, not a named decision | Promote to Open Questions section |
| No `files` field in `mcp/package.json` means the full lib tree ships today | High | Phase A is framed as inventory-only, not hardening | Split into Phase A1 (inventory) and Phase A2 (tarball hardening, no infrastructure needed) |
| Browser app integration is an unresolved Phase C design constraint | Medium | Named as open question but not connected to a Phase C constraint | Commit to consumer-agnostic endpoint design from Phase C, name browser as Phase F |
| Three of five success metrics are not measurable | Low | Metrics section lacks verification methods | Add verification method for each metric |

---

## Immediate Next Step (Refined)

The agent who wrote this proposal recommended:

> "Write a Motion Lab MCP exposure inventory and hybrid-boundary implementation plan."

That is the right next artifact. Based on this audit, it should include:

1. **Exposure inventory** with four planes named explicitly: keyframe geometry, intensity-scaling algorithm, curated agent metadata, and export assembly pipeline.
2. **Tarball hardening action** (Phase A2): add a `files` field to `mcp/package.json` as a zero-infrastructure first step.
3. **Architecture Decision Record stub** for the server response model: choose between rendered CSS, raw keyframe data, or signed opaque payload before Phase B spec is written.
4. **Auth pattern clarification**: per-call vs session token for premium endpoint proxying.
5. **Fallback decision**: commit to hard-fail, graceful degradation, or cached-replay before Phase C implementation begins.
6. **Consumer-agnostic endpoint constraint** applied to Phase C from the start, with browser integration named as Phase F.

---

## What the Proposal Gets Right

These sections of the proposal are well-reasoned and should be preserved as written:

- The core principle: "keep the MCP local, but make it thinner over time." This is the correct strategic direction.
- The decision not to prioritize public documentation first. This is the right call.
- The identification of entitlement enforcement as a server-side concern.
- The phased ordering (audit before spec before endpoints before migration). The order is correct; the content of each phase needs more precision.
- The open question about recommendation logic: Phase 4 evaluation correctly preceded this moat proposal, and the proposal correctly defers recommendation until protection is in place.
