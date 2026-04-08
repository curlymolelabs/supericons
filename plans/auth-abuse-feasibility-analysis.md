# Auth Abuse Controls: Feasibility Analysis

Discussion of the [audit findings](file:///C:/Users/guanh/.gemini/antigravity/brain/38578df8-2518-4146-aa8e-5759fe3186a1/auth_abuse_plan_audit.md) through three lenses: agentic-era threat modeling, Socratic reasoning, and IDEO design thinking.

---

## Framework Overview

**Agentic Era Context.** The product lives in a world where AI coding agents are primary consumers. The threat model is not just "bad human spams endpoint." It is "agent autonomously discovers and exercises every public surface." The question at every point: does this gap matter more or less because agents exist?

**Socratic Reasoning.** At each gap, five questions are asked before recommending action:
1. What is the design intent behind the current behavior?
2. What assumption are we making that might be wrong?
3. Who is actually harmed if we do nothing?
4. What is the simplest intervention that closes the gap?
5. What breaks if we are wrong?

**IDEO Design Thinking.** Empathize (who experiences this problem?), Define (what is the real problem?), Ideate (what are the options?), Prototype (what is the smallest testable fix?), Test (how do we verify it works?).

---

## Gap 1: Forgot-Password Has No Frontend Cooldown

### Agentic Era Lens

Agents do not use forgot-password. This flow is human-only by design: it sends an email to a human inbox, the human clicks a link, the human sets a new password. An agent would use API keys, not password recovery.

However, an unsophisticated bot (not an AI agent, just a script) can still hammer this endpoint to weaponize Supabase's SMTP quota against you. Every spam reset email burns a send from your email budget. At scale, this means legitimate users stop receiving their emails.

**Conclusion:** The threat is not "agent abuses forgot-password." The threat is "bot burns your email quota so real humans never get their confirmation emails." This makes the gap more urgent, not less.

### Socratic Reasoning

1. **Design intent?** The forgot-password form exists to help a locked-out human regain access. It should be frictionless for the first request, but there is no reason to allow a second request before the backend is ready to process it.

2. **What assumption might be wrong?** The plan assumes Supabase's backend 60s limit is sufficient protection. This is wrong. Backend rate-limit errors still consume compute, log noise, and potentially SMTP sends before the limit kicks in. The first request always goes through.

3. **Who is harmed if we do nothing?** The user who legitimately forgot their password and clicks "send" three times in frustration. They see an error message that sounds like something broke. They leave.

4. **Simplest intervention?** Copy the `startVerifyResendCooldown()` pattern. Add a `forgotPasswordCooldownUntil` state field. Disable the button with a countdown. Identical implementation, different handler.

5. **What breaks if we are wrong?** Nothing. A 60s cooldown on password reset is standard UX. No user expects to send two reset emails within a minute.

### IDEO Design Thinking

**Empathize.** The user who clicks "forgot password" is already frustrated. They cannot remember their credentials. They want a fast resolution. After clicking "send," they check their inbox, do not see the email (it has not arrived yet), and come back to click "send" again.

**Define.** The real problem is not abuse. It is anxiety. The user does not trust that the email was sent. A cooldown with a countdown timer communicates "we sent it, give it a moment."

**Ideate.**
- Option A: 60s cooldown with countdown (matches resend pattern)
- Option B: Swap the button text to "Email sent. Check your inbox." with no re-send for 60s
- Option C: Both. Countdown timer plus success message.

**Prototype.** Option C. Show a success message ("If an account matches, you'll get a reset link shortly"), then replace the submit button with a disabled countdown button ("Resend in 58s"). Identical to what the verify stage already does.

**Test.** QA scenario: click "send reset" twice within 10s. Expected: second click is blocked by local cooldown. No backend request fires.

### Feasibility Verdict

**Trivial.** The pattern already exists in the codebase. Effort: under 30 minutes. Risk: zero. Should be included in Phase 1 alongside the resend cooldown alignment.

---

## Gap 2: Sign-Up/Sign-In Has No inFlight Guard

### Agentic Era Lens

An AI agent calling `supabase.auth.signUp()` directly would bypass the browser form entirely, so this gap does not apply to agent-driven abuse. The question is whether a browser-based bot could exploit the gap.

Answer: barely. The window between "user clicks submit" and "button.disabled = true" is a single event-loop tick. A human cannot double-click fast enough. A DOM-injecting script could, but such a script already has full page access and could call the Supabase client directly anyway. This gap is a defense-in-depth nicety, not a real vulnerability.

### Socratic Reasoning

1. **Design intent?** The `disabled` toggle during the async call is the intended guard. It works for human interaction.

2. **What assumption might be wrong?** That all callers go through the DOM submit handler. A browser extension or devtools script could fire `signUp()` directly. But at that point, the attacker already has arbitrary code execution on the page.

3. **Who is harmed?** The anxious user who double-clicks. They might see a race condition where signup succeeds twice (Supabase deduplicates by email, so this is benign), or they see a confusing error flash.

4. **Simplest intervention?** A boolean `isSubmitting` flag at the top of the handler. `if (isSubmitting) return;` Three lines of code.

5. **What breaks if we are wrong?** Nothing. This is purely defensive.

### IDEO Design Thinking

**Empathize.** The double-clicker is not malicious. They are uncertain whether their click registered. This is the same anxiety pattern as the forgot-password user.

**Define.** The problem is not security. It is UX confidence. The user needs immediate visual feedback that their action was received.

**Ideate.**
- Option A: Boolean inFlight guard (prevents duplicate calls)
- Option B: Add a loading spinner to the submit button (visual feedback)
- Option C: Both

**Prototype.** Option A alone is sufficient. The button already changes to disabled state, providing visual feedback. Adding a flag just prevents the edge case.

**Test.** Rapid-fire click the sign-up button 5 times. Expected: exactly one network request fires.

### Feasibility Verdict

**Trivial, but low priority.** Three lines of code, zero risk. CAPTCHA (Phase 3) supersedes this for automated abuse. Include it in Phase 1 only if you are already touching the submit handlers.

---

## Gap 3: MCP Key Validator Has No Rate Limiting

### Agentic Era Lens

This is the gap that matters most in an agentic world, because the `validate-mcp-key` endpoint IS the agent-facing surface. Every AI coding agent that uses Supericons MCP hits this endpoint. It is:

- Publicly accessible (JWT verification is off)
- Unauthenticated (the key hash IS the auth)
- Unlimited in request volume

However, the threat model needs careful examination. The attack is brute-forcing a SHA-256 hash. The keyspace is 2^256. Even at 1 billion attempts per second, the expected time to find a valid key is longer than the age of the universe. This is not a practical attack vector.

The timing side-channel (valid keys take longer to process than invalid keys) is real but academic. An attacker would need to distinguish microsecond-level response time differences through a network, which is noisy.

**The actual agentic risk is different:** a legitimate agent in a tight loop (retrying on errors, polling for status) could unintentionally DDoS the endpoint. This is not malicious. It is a badly-written agent integration. Rate limiting protects you from your own users' agents, not from attackers.

### Socratic Reasoning

1. **Design intent?** The endpoint is intentionally open because agents need fast, frictionless validation. Adding auth would defeat the purpose (the key hash IS the auth).

2. **What assumption might be wrong?** That all agent implementations will be well-behaved. A coding agent with a retry loop and no backoff could easily send 100 requests per second. Multiply by N users, and this is a real cost concern at the Edge Function level.

3. **Who is harmed?** Your Supabase Edge Function quota and database connections. Not end users directly, but your infrastructure bill and availability.

4. **Simplest intervention?** Supabase Edge Functions support configurable rate limits at the project level. No code change needed. Alternatively, a per-IP counter with a 60-request-per-minute window would stop runaway loops without affecting normal use.

5. **What breaks if we are wrong about deferring?** If an agent library ships with a retry loop bug, you could see thousands of requests per minute from a single user. Edge Function cold starts compound the problem. But this is a "when it happens" problem, not a "before it happens" problem.

### IDEO Design Thinking

**Empathize.** The agent developer does not want to think about rate limits. They want to call the endpoint and get a response. If the endpoint starts returning 429s, their integration breaks and they blame Supericons.

**Define.** The real problem is not security. It is infrastructure resilience. The question is: "How do we protect our edge function from runaway legitimate usage without degrading the developer experience?"

**Ideate.**
- Option A: Supabase project-level Edge Function rate limits (no code change)
- Option B: In-function IP-based counter using Deno KV or a simple Map
- Option C: Add rate-limit headers (X-RateLimit-Remaining) so agents can self-throttle
- Option D: Document expected usage patterns in MCP docs ("one validation per session, not per request")

**Prototype.** Option D first (costs nothing, sets expectations), then Option A when traffic data justifies it.

**Test.** Fire 100 requests in 10 seconds from a single IP. Under Option A, requests 61-100 should return 429. Under the current state, all 100 succeed (which is the baseline to measure against).

### Feasibility Verdict

**Correctly deferred.** No code change needed at launch. Two proactive steps are worth considering:

1. Add a one-liner to MCP documentation: "The MCP server validates your key once per session. Do not re-validate on every request."
2. Monitor Edge Function invocation counts in the Supabase dashboard after launch. Set an alert threshold.

---

## Gap 4: CAPTCHA Provider Not Specified

### Agentic Era Lens

CAPTCHA is fundamentally an anti-agent technology applied to the human auth surface. The irony: Supericons is a product that embraces agents for icon access while using CAPTCHA to block agents from account creation. This is not contradictory. It is a precise boundary. The product model is "humans create accounts, agents consume services."

The choice of provider matters because modern AI agents can solve traditional CAPTCHAs. GPT-4V can solve visual challenges. Audio challenges are solvable by whisper models. The only CAPTCHAs that still work against AI are behavioral analysis (Turnstile, reCAPTCHA v3) that measure mouse movement, scroll patterns, and timing. These are invisible to the user and harder for agents to fake because they require a realistic browser interaction over time.

### Socratic Reasoning

1. **Design intent?** CAPTCHA exists to stop automated account creation spam. Not to stop sophisticated attackers. The bar is "make it expensive enough that spam bots go elsewhere."

2. **What assumption might be wrong?** That any CAPTCHA will stop a determined attacker. It will not. CAPTCHA is a speed bump, not a wall. But speed bumps work for launch-scale traffic.

3. **Who is harmed by the wrong choice?** The legitimate user. A visible hCaptcha challenge ("click all the motorcycles") during sign-up feels hostile for a design tool product. The user came here for beautiful icons, not puzzles.

4. **Simplest intervention?** Cloudflare Turnstile in managed mode. Invisible for most users, challenges only suspicious traffic. Supabase has native integration.

5. **What breaks if we choose wrong?** If Turnstile is too permissive, spam gets through (fixable by tightening settings). If hCaptcha is too aggressive, conversion drops (harder to fix, requires UX rework).

### IDEO Design Thinking

**Empathize.** The user signing up for Supericons Pro is a developer or designer. They are technically savvy, impatient, and expect a modern experience. A visible CAPTCHA challenge feels like a bank website from 2015.

**Define.** The problem is not "which CAPTCHA." It is "how do we verify humanity without degrading the signup experience."

**Ideate.**
- Option A: Cloudflare Turnstile (invisible, managed mode)
- Option B: hCaptcha (visible challenge)
- Option C: Turnstile with automatic escalation (invisible first, challenge if suspicious)
- Option D: No CAPTCHA, rely on Supabase rate limits only

**Prototype.** Option A (Turnstile managed mode). Requires:
1. Cloudflare Turnstile site key (free tier available)
2. Supabase dashboard: Auth > CAPTCHA > Cloudflare Turnstile
3. Frontend: add Turnstile script tag, render widget in auth modal (invisible, so no visible UI change), pass token to Supabase auth calls via `options.captchaToken`

**Test.** Sign up normally. Expected: no visible CAPTCHA, signup succeeds. Open devtools and verify the Turnstile token is included in the auth request.

### Feasibility Verdict

**Straightforward, half-day effort.** Turnstile is the recommendation. The main work is:
- Supabase dashboard configuration (5 minutes)
- Frontend script tag and token plumbing (1-2 hours)
- Testing across sign-up, sign-in, and forgot-password (1 hour)

---

## Gap 5: Custom SMTP Not Addressed

### Agentic Era Lens

Agents do not receive emails. But agents drive humans to sign up. If an AI coding agent recommends Supericons via MCP, the human goes to the site, signs up, and waits for a confirmation email. If that email never arrives because Supabase's built-in SMTP hit its daily limit, the agent's recommendation just resulted in a broken experience.

In the agentic era, the "last mile" of account creation is still email, and email is still the weakest link. The agent-to-human handoff depends on reliable email delivery.

### Socratic Reasoning

1. **Design intent?** Supabase's built-in SMTP exists for development and low-volume production. It is not designed for scale.

2. **What assumption might be wrong?** That launch traffic will be low enough for built-in SMTP. This is unknowable until launch. If Product Hunt, a popular tweet, or agent-driven virality hits, signup volume could spike 10-100x in hours.

3. **Who is harmed?** Every user who signs up during a spike and never gets their confirmation email. They cannot use the product. They leave and do not come back.

4. **Simplest intervention?** Configure Resend (or equivalent) as a custom SMTP provider in Supabase. Resend's free tier handles 100 emails/day, paid starts at $20/month for 50,000 emails. This is insurance, not premature optimization.

5. **What breaks if we are wrong?** If we set up custom SMTP and traffic is low, we wasted 30 minutes on configuration. If we skip it and traffic spikes, we lose users permanently. The asymmetry favors action.

### IDEO Design Thinking

**Empathize.** A developer discovers Supericons through their AI coding agent. The agent says "I can search 20,000 icons for you. Sign up for Pro to get premium animated icons too." The developer is excited. They sign up. They wait for the confirmation email. It never arrives. They try again. Still nothing. They close the tab and forget about Supericons.

This is the highest-stakes moment in the entire funnel. The user has already decided to act. The only thing standing between them and activation is an email that Supabase's built-in SMTP might not send.

**Define.** The problem is not "email provider configuration." It is "first-impression reliability." The confirmation email is the product's first promise to the user, and breaking it breaks trust permanently.

**Ideate.**
- Option A: Keep built-in SMTP, monitor manually, switch when it breaks
- Option B: Configure Resend (free tier) now, upgrade if needed
- Option C: Configure Resend + set up a custom sender domain for branded emails
- Option D: Skip email confirmation entirely (Supabase supports this)

**Prototype.** Option B for launch, evolve to Option C when branding matters. Option D is tempting but creates a different abuse vector (unverified email signups).

**Test.** Sign up with a real email. Confirm the email arrives within 60 seconds, comes from a recognizable sender, and the confirmation link works.

### Feasibility Verdict

**30 minutes of configuration, high insurance value.** This should be a Phase 0 item, done before any code changes. The risk asymmetry (30 minutes wasted vs. users permanently lost) makes this a clear "do it now" decision.

---

## Observation: Account Modal Password Reset Cooldown

### Agentic Era Lens

Not relevant. This requires an authenticated browser session. Agents do not interact with account settings modals.

### Socratic Reasoning

The user who clicks "reset password" from their account settings is a signed-in, paying customer. They are not attacking you. They are managing their account. The risk of annoying them with a cooldown is higher than the risk of them spamming the button.

### IDEO Design Thinking

**Empathize.** This is a power user managing their account security. Respect their intent.

**Prototype.** After a successful reset email send, swap the button text to "Reset email sent" and disable it for 60s. This is confirmation feedback, not a restriction.

### Feasibility Verdict

**Trivial, defer to post-launch.** Five minutes of work, zero urgency. The button already disables during the async call. The gap is "re-enabling after success," which is cosmetic.

---

## Consolidated Feasibility Matrix

| Gap | Agentic Relevance | Effort | Risk if Skipped | Recommendation |
|---|---|---|---|---|
| Forgot-password cooldown | Low (bots, not agents) | 30 min | Medium (SMTP budget burn) | **Do now (Phase 1)** |
| inFlight guard | None (agents bypass DOM) | 10 min | Very low | **Do if touching handlers** |
| MCP rate limiting | High (agent surface) | 0 now | Low at launch | **Defer, document, monitor** |
| CAPTCHA provider | Medium (anti-bot boundary) | Half day | High (spam accounts) | **Do now (Turnstile)** |
| Custom SMTP | Indirect (agent-to-human handoff) | 30 min config | High (lost signups) | **Do now (Phase 0)** |
| Account reset cooldown | None | 5 min | Negligible | **Post-launch** |

---

## Final Recommendation

The original plan is sound. These additions do not change the plan's structure. They sharpen it:

1. **Add Phase 0: Custom SMTP.** Do this first. It takes 30 minutes and protects the entire email-dependent flow.
2. **Expand Phase 1** to include forgot-password cooldown alongside the resend cooldown fix.
3. **Lock Phase 3** to Cloudflare Turnstile (managed/invisible mode). Do not leave the provider decision open for the implementer.
4. **Add a post-launch backlog item** for MCP endpoint monitoring and rate limiting.
5. **Skip the inFlight guard and account-reset cooldown** unless you are already editing those handlers.

The plan as amended covers the launch surface completely with under a day of total effort.
