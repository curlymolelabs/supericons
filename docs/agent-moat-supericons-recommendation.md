# Agent Moat: Feasibility Audit for Supericons (Zero-Cost, Right Now)

Date: 2026-04-14
Status: Recommendation
Scope: Evaluate all 13 techniques in agent-moat-ai-cloning-protection.md against
Supericons' actual stack and select the best zero-cost approaches

---

## Stack Reality Check

Before scoring anything, the constraints are non-negotiable:

| Constraint | Reality |
|---|---|
| Frontend | Vite SPA, static build, deployed to Netlify CDN |
| Backend | Supabase Edge Functions (Deno runtime, 15 active functions) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Rendering | Pure client-side. No SSR. No per-request server HTML generation |
| Premium asset delivery | Supabase Storage via Edge Functions (`serve-premium-asset`) |
| Cost budget | Zero (no new paid services, no new infra) |
| Infra control | Netlify headers/redirects, Supabase Edge Functions |

The biggest architectural constraint: **no SSR**. Any technique that requires generating different HTML per request (Structural Polymorphism, per-session DOM divergence) cannot be done without either adding a server render layer or a Netlify Edge Function. Netlify Edge Functions run on the Deno runtime and are free within Netlify's generous tier, making them available but only for response-level interception, not full HTML composition.

---

## Per-Technique Feasibility Scoring for Supericons

### 1. Safety Filter Poisoning
**Zero-cost feasibility: HIGH**
Just HTML. Add one hidden div to `index.html` or inject it from a script.

**Supericons fit: LOW value**
The app's primary attack surface is its icon library data and UI pattern, not server logic.
An agent inspecting the DOM for icon data structures will strip `aria-hidden` nodes before
processing. This buys friction of hours, not days.

**Verdict: Implement as a one-line addition. Do not treat as real protection.**

---

### 2. Adversarial Vision Layers (Anti-VLM Canvas Noise)
**Zero-cost feasibility: MEDIUM**
Computationally feasible in pure JS/Canvas. No server needed. However, computing a
perturbation that works across GPT-4V, Gemini Vision, and Claude Vision simultaneously
requires research and testing, and the perturbation must be re-tuned as models update.

**Supericons fit: MEDIUM-LOW**
The app's UI is not the primary value at risk. The icon library data (SVG paths,
search index, collection structures) is. An agent cloning Supericons would likely
read the JS bundle, not screenshot the UI. Canvas noise does nothing against bundle parsing.

**Verdict: Deprioritize. Effort vs. protection ratio is poor for this app's attack surface.**

---

### 3. Foveated Biometric Rendering
**Zero-cost feasibility: LOW**
Mouse tracking is free, but gating DOM render on biometrics creates real accessibility
liability (keyboard users, touch users, screen readers). Supericons has public-facing
content the plan explicitly says must remain accessible.

**Verdict: Skip. Accessibility risk is not acceptable.**

---

### 4. Token Tarpit
**Zero-cost feasibility: HIGH technically**
But the bypass is trivial (agent DOM pre-processors strip hidden nodes) and the
collateral damage is real (PageSpeed, SEO crawl budget). Supericons is SEO-dependent
for discovery.

**Verdict: Do not implement. Damages the product more than the attacker.**

---

### 5. Ephemeral WASM State Streaming
**Zero-cost feasibility: NEAR-ZERO**
This is a full re-architecture of the frontend. Not feasible without massive engineering
investment. Also kills SEO, which Supericons depends on.

**Verdict: Out of scope for zero-cost.**

---

### 6. Structural Polymorphism
**Zero-cost feasibility: LOW without SSR**
Randomizing class names and DOM structure per request fundamentally requires
per-request HTML generation. Supericons has no SSR layer -- the app is a static Vite
build served from Netlify CDN. The only path to per-request variation without SSR would
be a Netlify Edge Function that intercepts the HTML response and mutates it in-flight.

**Netlify Edge Function path:**
- Netlify Edge Functions run on Deno, have access to `Response` objects, and can
  rewrite HTML before it reaches the client.
- A lightweight edge function could inject randomized wrapper class tokens into the
  `<head>` of the served HTML on each request.
- Cost: zero (Netlify free tier includes 500k Edge Function invocations/month and
  1M/month on the free plan).
- However, full DOM structural polymorphism (randomizing component nesting, tag types)
  is impractical without React/component-level SSR.
- **Practical partial version:** randomize CSS custom property names and a short
  token prefix on each request via edge function injection. This breaks cached selector-
  based scraping without breaking the app itself since all selectors are generated
  consistently within a session.

**Verdict: Partial implementation is feasible at zero cost via Netlify Edge Function.
  Highly recommended as one of the primary defenses.**

---

### 7. Honeypot API (Legal Tripwire)
**Zero-cost feasibility: VERY HIGH**
This is the easiest high-value technique in the entire list for Supericons:

- Supabase Edge Functions are already in use. Adding a new function takes under an hour.
- Create 2-3 plausible-looking but undocumented endpoints (e.g., `POST /functions/v1/export-design-tokens`,
  `GET /functions/v1/internal-icon-manifest`).
- Any request to these endpoints logs: timestamp, IP, headers, TLS fingerprint.
- Supabase's built-in logging captures this automatically in the dashboard.
- Return a response containing unique canary data (text, JSON) that can be identified
  if it appears in a clone. Register that canary data with a copyright notice in a
  README or terms doc.
- Zero cost: Supabase free tier handles this. No new infra.

**Supericons fit: VERY HIGH**
An agent scraping Supericons for its architecture will almost certainly inspect network
traffic. The icon API patterns (`serve-premium-asset`, `validate-mcp-key`) make it
obvious there are more endpoints to find. A honeypot plays directly into this.

**Verdict: Implement first. Highest value-to-effort ratio of all 13 techniques.**

---

### 8. Server-Side Behavioral Fingerprinting
**Zero-cost feasibility: MEDIUM for a lightweight version**
Full behavioral fingerprinting (HTTP/2 multiplexing patterns, TLS cipher ordering)
requires network-layer access that neither Netlify nor Supabase exposes to user code.

However, a practical lightweight version is fully achievable:

- In each Supabase Edge Function, read `request.headers`: user-agent, accept-language,
  accept-encoding, sec-ch-ua, sec-fetch-site, sec-fetch-mode.
- Build a composite bot-probability score from these signals:
  - Missing `sec-ch-ua` (set by real browsers, usually absent in headless agents)
  - Missing `sec-fetch-site` or `sec-fetch-mode`
  - User-agent matches known headless browser patterns (Playwright, Puppeteer, etc.)
  - Request sequencing anomalies (if the same IP calls multiple endpoints in
    microsecond intervals, it is not a human)
- Supabase Edge Functions already validate MCP keys (`validate-mcp-key`). The same
  function can append a bot-probability score to the request context.
- Cost: zero. This runs in existing Edge Functions.

**Supericons fit: HIGH**
Every premium data request already flows through an Edge Function. This is the right
chokepoint for detection.

**Verdict: Implement as a lightweight header-signal scorer inside existing Edge Functions.
  Feed the score to Technique 10 (Decoy Layer).**

---

### 9. Cryptographic DNA Watermark
**Zero-cost feasibility: HIGH for text/copy watermarking**
Unicode homoglyphs embedded in static copy require no server logic. The implementation
is a one-time build-time pass across the app's text content.

For layout-variance watermarking, SSR is required for per-session variation. Skip that
variant.

For image/SVG watermarking: LSB steganography applied to icon SVG files at publish
time is achievable but complex. Simpler: embed a watermark comment in every SVG
bundle file that identifies its origin.

**The key insight for Supericons:** The premium icon bundles themselves are the primary
asset worth protecting. Embedding a watermark string in every `bundle.json` or
within SVG paths costs nothing and makes forensic identification trivial.

**Verdict: Implement the copy-layer homoglyph watermark and the bundle.json origin
  comment. Skip per-session layout variance (requires SSR). Zero cost.**

---

### 10. Semantic Decoy Layer
**Zero-cost feasibility: MEDIUM**
Requires integration with Technique 8 (behavioral fingerprinting) to know when to
serve the decoy. Once a bot score threshold is exceeded, the Edge Function can return
subtly wrong data:

- For icon data: return correct icon names but with slightly wrong viewBox dimensions
  (e.g., `viewBox="0 0 25 25"` instead of `0 0 24 24`).
- For CSS values: return token values that are off by one step.
- For pricing/plan data: return nothing (empty stubs) rather than real data.

The decoy should be configured, not hardcoded, to allow updates without redeployment.
A single JSON file in Supabase Storage serves as the decoy config.

**Supericons fit: HIGH for the data layer (Edge Functions)**
All premium data already routes through Edge Functions. Inserting a decoy response
branch when bot probability is high is architecturally clean with current infrastructure.

**Verdict: Implement after Technique 8 is live. Zero marginal cost once the detection
  layer exists.**

---

### 11. Auth-Bound Cryptographic Lock
**Zero-cost feasibility: HIGH -- already partially implemented**
Supericons already requires:
- Supabase Auth session to access purchased icons
- A validated MCP API key (`validate-mcp-key`) to use premium features via MCP

The existing architecture already achieves most of what Technique 11 proposes. The
gap is the behavioral proof binding (short-lived tokens with human-timing constraints).

Short-lived session tokens with TTL can be added to `motion-lab-session` and
`validate-mcp-key` at zero cost.

**Verdict: Enhance existing Edge Functions with tighter token TTLs. Partially done already.**

---

### 12. Semantic Canary Network
**Zero-cost feasibility: LOW**
Requires background searches from user browsers (privacy implications and consent
overhead), and either a free search API or scraping to detect clones. Google search
API is not free at meaningful volume. Bing has a limited free tier.

**Verdict: Defer. Privacy friction and API cost make this impractical at zero cost.**

---

### 13. Hardware-Layer Binding (WebAuthn)
**Zero-cost feasibility: HIGH technically, LOW as a priority**
WebAuthn is a browser standard with no server cost beyond what Supabase already handles.
However, adding a WebAuthn challenge layer to premium features requires Supabase Auth
to support MFA, which it does (TOTP and WebAuthn are both supported in Supabase).

For Supericons the main friction is that it adds a login step that users buying icon
packs will notice and push back on. It is appropriate for the highest-value features
(premium Motion Lab exports) but not for general icon access.

**Verdict: Feasible for premium MCP key validation. Not appropriate as a general wall.**

---

## Recommendation: Zero-Cost Priority Stack for Supericons

Ordered by value-to-effort ratio, using only existing infrastructure (Supabase Edge
Functions, Netlify headers/edge functions, Vite build pipeline).

---

### Tier 1: Implement Immediately (Hours each, High value)

#### A. Honeypot API Endpoints (Technique 7)
Add 2-3 decoy Supabase Edge Functions that look like internal APIs.

Examples:
- `POST /functions/v1/export-design-tokens`
- `GET /functions/v1/internal-collection-manifest`
- `POST /functions/v1/icon-scrape-all`

Each function:
1. Logs the full request (IP, headers, timestamp, body) to a Supabase table called `honeypot_hits`
2. Returns a convincing-looking JSON response containing a unique, copyright-registered canary string
3. Costs nothing. Supabase free tier handles the logging and function execution.

**Why first:** Maximum legal leverage, zero user impact, proves cloning attempts, $0 cost.

---

#### B. Bundle.json Origin Watermark (Technique 9, partial)
At build time (`build:bundles` script), embed a watermark comment or field in every
`bundle.json` file:

```json
{
  "_origin": "supericons.dev",
  "_watermark": "SI-2026-[bundle-id-hash]",
  "icons": [...]
}
```

If a cloner packages these bundles, the watermark travels with them. When the clone
is found, the origin is self-evident without any forensic tooling.

**Why now:** One build script edit. Costs nothing. Permanent evidence in every bundle.**

---

#### C. Copy-Layer Unicode Watermark (Technique 9, partial)
In the app's UI copy (marketing text, product descriptions, category labels), replace
a small number of standard Latin characters with visually identical Unicode homoglyphs
at strategically chosen positions. The homoglyph pattern encodes a unique signature.

This is a one-time pass at build time. The encoded positions should be documented
privately and never committed to the repo (treat as a secret).

Tool: a build-time script that reads specific strings from `index.html` or the store
and applies the substitutions before the final bundle is emitted.

**Why now:** Completely invisible to users. Makes the app's marketing copy forensically
identifiable if it appears in a clone. Zero runtime cost.**

---

### Tier 2: Implement as Edge Function Enhancement (Days, Very High value)

#### D. Header-Signal Bot Scorer (Technique 8, lightweight)
In the `validate-mcp-key`, `serve-premium-asset`, and `claim-status` Edge Functions,
add a lightweight bot-probability scorer that evaluates the incoming request headers.

Scoring signals (all available in `request.headers`):
- `sec-ch-ua` absent: +30 points (browsers always set this; agents often do not)
- `sec-fetch-site` absent or `=none`: +20 points (crawlers do not set site context)
- `user-agent` matches headless patterns: +40 points (pattern match against known strings)
- Multiple API endpoints called within 500ms from same IP: +50 points (rate heuristic)
- `accept-language` absent: +15 points (browsers always send this)

If score >= 80: flag the request. Log it. Do not block yet.

Store the score in Supabase logs. No new table needed -- append to existing request logs.

**Why this tier:** Requires editing existing Edge Functions carefully. Low risk of
breaking real users but needs testing. Worth getting right the first time.**

---

#### E. Decoy Response for High-Confidence Bot Sessions (Technique 10)
Once the scorer (D above) is live and generating reliable data:

When bot score >= 80 and the request is to a data endpoint (not auth):
- Return empty arrays for icon data instead of real data
- Return stub objects with correct schema but placeholder values
- Return a 200 status (not 403) so the agent does not know it was detected

This prevents the cloner from silently harvesting real data while making the
detection invisible. The clone will build, but will contain no real icons.

**Why this tier:** Depends on D being live and calibrated first.**

---

### Tier 3: Strengthen Existing Auth Layer (Week, Medium value)

#### F. Tighten Token TTL in motion-lab-session (Technique 11, partial)
In the `motion-lab-session` Edge Function, reduce the session token TTL from whatever
it currently is to 60 seconds. Tokens are valid for one render call and expire
immediately. This prevents session token replay by automated scrapers that harvest
valid tokens from legitimate browsing sessions.

---

### Tier 4: Future, When SSR/Edge Rendering is Available

#### G. Partial Structural Polymorphism via Netlify Edge (Technique 6, partial)
If Netlify Edge Functions are ever enabled for the main `index.html` route, inject a
randomized CSS custom property prefix token on each request. This randomizes selector
namespaces without changing the visual output. Breaks session-specific selector scrapers.

Not doing this now because it requires careful integration with the Vite build pipeline
and CSS variable system, and the risk of breaking the production UI is non-trivial.

---

## Summary: Recommended Zero-Cost Moat for Supericons

| Priority | Technique | Effort | Value | Cost | Status |
|---|---|---|---|---|---|
| 1 | Honeypot API endpoints (T7) | 2-4 hours | Very High (legal) | $0 | Implement now |
| 2 | bundle.json origin watermark (T9) | 1-2 hours | High (forensic) | $0 | Implement now |
| 3 | Unicode copy watermark (T9) | 2-4 hours | High (forensic) | $0 | Implement now |
| 4 | Header-signal bot scorer in Edge Functions (T8) | 1-2 days | High (detection) | $0 | Implement next |
| 5 | Decoy responses for detected bots (T10) | 1 day | High (active defense) | $0 | After scorer is live |
| 6 | Motion Lab session token TTL tightening (T11) | 2-4 hours | Medium (hardening) | $0 | Implement next |
| 7 | Partial DOM token randomization via Netlify Edge (T6) | 2-3 days | Medium (structural) | $0 | Future |
| -- | Safety filter poisoning (T1) | 1 hour | Low (friction only) | $0 | Optional |
| -- | Adversarial vision layers (T2) | High effort | Low for this app | $0 | Deprioritize |
| -- | Biometric rendering (T3) | -- | -- | -- | Skip (a11y risk) |
| -- | Token tarpit (T4) | -- | -- | -- | Skip (SEO damage) |
| -- | WASM streaming (T5) | -- | -- | -- | Skip (architecture cost) |
| -- | Semantic canary network (T12) | -- | -- | -- | Skip (API cost) |
| -- | Hardware binding (T13) | Medium | Medium | $0 | Future for MCP |

---

## The Key Insight

The three most powerful defenses for Supericons are not technical barriers at all.
They are **forensic and legal traps**:

1. Honeypot endpoints that log and legally poison anyone who calls them
2. Watermarks in every bundle that make stolen assets self-identifying
3. Unicode watermarks in marketing copy that make it impossible to deny the source

These are all $0, take under a day to implement, and they shift the asymmetry of the
problem: instead of trying to stop a determined agent (which is very hard), they make
every cloning attempt produce legally actionable evidence and self-watermarked output.

**The technical defenses (T8 bot scorer, T10 decoy layer) are the right second layer**
because they degrade the value of a clone silently, without tipping off the attacker.

**The structural defenses (T6 DOM polymorphism) are the right third layer** but carry
real implementation risk for a production SPA and should not be attempted until the
forensic and detection layers are live and verified.
