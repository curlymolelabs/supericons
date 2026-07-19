# Decision brief: Should free MCP search require signup and an API key?

Date: 2026-07-18  
Status: feedback requested, no product decision or implementation authorized  
Scope: free MCP icon search, hosted MCP, local npm MCP, account signup, API keys, usage measurement, and service cost

## Decision to make

Should a free user be required to create a Supericons account and add a `SUPERICONS_API_KEY` before using free MCP icon search?

This decision should be made separately for:

1. Hosted MCP, which uses Supericons infrastructure.
2. Local npm MCP, where eligible Search v2 requests are answered from the installed package.

## Why this question is open

Supericons currently offers free MCP search without an account or API key. That makes setup easy, but hosted requests consume Supericons compute and anonymous traffic is harder to understand and control.

The owner is considering a free-account requirement because:

- MCP users already accept a technical setup process.
- Adding one environment value to an existing MCP configuration is a small extra technical step.
- A key creates a stable account identity for limits, abuse control, and product measurement.
- Knowing how people use MCP can help Supericons improve search and prioritize libraries and tools.
- Unlimited anonymous hosted use may not remain financially sustainable.
- A free account can become the path to purchased collections, Pro tools, and higher limits.

## Current verified product state

### Free MCP

The current product and setup guides support free icon search without an account or API key.

The local MCP package has an anonymous access tier for free icons. Account-bound tools check access separately.

The hosted MCP also accepts keyless requests and records privacy-safe identifiers and service measurements.

### Paid and account-bound access

An API key identifies a Supericons account. The account's purchases or subscription decide which paid features are available.

Current account-bound examples include:

- purchased premium collections
- Pro Motion Lab workflows
- Pro Converter workflows
- purchase history, downloads, and updates connected to an account

### Free account value today

Free browsing and search do not require an account. Favorites and recent icon activity are currently stored in the browser through local storage, not synced through an account.

This means the strongest current reasons to sign up relate to purchases, Pro tools, premium MCP access, and account management. A free-only user receives limited immediate account value.

### Existing signup signal

The owner reports 23 registered users.

Their reasons for signing up are unknown. The current API-key documentation incorrectly says that MCP requires a key, so some registrations may have been caused by that incorrect instruction. Other users may have been exploring Pro, expecting account sync, preparing to buy, or assuming signup unlocked more features.

The number 23 proves that some users will register. It does not yet show what proportion of MCP users will register when the requirement is stated accurately.

## The actual setup burden

For an MCP user, adding this environment value is technically small:

```json
{
  "env": {
    "SUPERICONS_API_KEY": "your-key-here"
  }
}
```

The additional effort is mostly outside the config file:

1. Open Supericons.
2. Create an account.
3. Verify the account if required.
4. Generate a key.
5. Return to the MCP client.
6. Add and protect the key.
7. Repeat or transfer the setup on another machine.

This audience is more technical and motivated than an average website visitor, so the added effort may be acceptable. Correct client-specific setup instructions can reduce it further.

## Important distinction: hosted versus local

| Route | Who pays for each search | What an API key provides |
| --- | --- | --- |
| Hosted MCP | Supericons pays for Railway, database, network, and related service use | Identity, limits, abuse control, measurement, and account access |
| Local npm MCP, local-first search | The search runs from the installed package | Mainly account connection and product measurement, not meaningful per-search cost protection |
| Account-bound or paid tools | Supericons provides hosted account and workflow services | Entitlement checks, limits, purchase access, and support |

Requiring a key for hosted MCP has a direct economic and operational purpose. Requiring a key for local-first free search mainly serves identity and measurement. It does not remove meaningful Supericons compute because ordinary eligible search is local.

## Example options already identified

The following options are included to document ideas already discussed. They are not an exhaustive list, a ranking, or a request to choose only among them. Reviewers should propose a different approach if these options overlook a better product, business, privacy, or technical model.

### Option A: Keep all free MCP search keyless

Benefits:

- Lowest setup friction.
- Easiest agent and client compatibility.
- Strong discovery and adoption.
- No account needed for open-source icon use.

Costs and risks:

- Hosted usage remains easier to abuse.
- Per-user limits are less reliable.
- User-level learning and retention measurement remain limited.
- Supericons carries hosted cost without a direct user relationship.

### Option B: Require a free account and key for all MCP search

Benefits:

- One access rule across hosted and local MCP.
- Every participating user has an account.
- Better rate limits, abuse response, usage history, and communication.
- Clear path from free use to paid access.

Costs and risks:

- More signup and secret-management steps.
- Some users may abandon setup.
- More support for missing, invalid, exposed, or revoked keys.
- A local package gate offers limited cost protection and may be bypassed if the searchable data is already public in the installed package.
- Mandatory tracking may feel unnecessary for a local search that does not use Supericons compute.

### Option C: Require a key for hosted MCP, keep local free search keyless

Benefits:

- Protects the route that creates ongoing Supericons cost.
- Gives hosted users account-based limits and measurement.
- Preserves private, low-cost local use.
- Makes the reason for authentication easy to explain.

Costs and risks:

- Two access rules must be documented clearly.
- Users may choose local MCP to avoid signup.
- Cross-route measurement remains incomplete.
- Hosted client authentication must work consistently across supported clients.

### Option D: Allow a small hosted trial, then require a free key

Benefits:

- Users can verify that Supericons works before registering.
- Continued hosted use becomes identifiable and rate-limited.
- Supericons can measure trial-to-signup conversion.
- The transition is less abrupt than a hard wall.

Costs and risks:

- More quota and abuse-control complexity.
- Anonymous trial limits can be bypassed.
- Users may be confused when access changes after the trial.
- The product must explain the limit before it is reached.

### Option E: Reviewer-proposed alternative

Reviewers may propose any materially different policy. An alternative may combine parts of the options above or use a different access model entirely.

Option E is intentionally undefined so the listed choices do not limit independent proposals.

## Neutral review position

No option is recommended by this brief. The purpose is to expose the current facts, uncertainties, and tradeoffs so each reviewer can form an independent view.

## What Supericons should promise in exchange for signup

If hosted MCP requires registration, the user should receive clear value:

- a sustainable free hosted allowance
- stable per-account limits rather than unreliable IP-only limits
- access to usage and key management
- an easy path to purchased collections and Pro tools
- account recovery and revocable credentials
- clear privacy information

Potential future free-account value:

- favorites synced across devices
- saved icon collections or project boards
- recent icon and search history sync
- usage history and reusable agent preferences

These future benefits are not part of the current product and should not be advertised until implemented.

## Measurement and privacy

The purpose of a key should be explained plainly:

> Your free key helps us keep hosted MCP reliable, prevent abuse, and improve the icon results people need.

A key should not become permission to collect everything. The product should define and disclose the smallest useful dataset, such as:

- tool name
- library and search mode
- result, clarification, zero-result, or error outcome
- broad locale
- latency
- account plan and allowance use

Raw query retention, personal profiling, and marketing use require separate review and clear disclosure.

## Evidence needed before a final decision

1. Hosted MCP cost per active user and per 1,000 requests.
2. Current anonymous abuse, burst, and heavy-user distribution.
3. Signup source for the existing 23 accounts, where available.
4. Setup completion rate for users shown an accurate optional-key flow.
5. Supported authentication method for each advertised MCP client.
6. Support burden for key creation, storage, rotation, and recovery.
7. A proposed free allowance and its expected monthly cost.
8. Whether a small anonymous trial materially improves activation.
9. Privacy and terms changes needed for account-linked MCP measurement.

## Unresolved decision inputs

- which routes should require identity
- the cost reduction a key requirement would produce
- the effect on setup completion and continued use
- the right free hosted allowance, if any
- the account value offered in return for registration
- the minimum useful usage data
- client support for passing and protecting keys
- expired and revoked key behavior
- the relationship between authentication and the open-source icon libraries
- the conditions for reversing or changing the policy

## Decision criteria

A final policy should:

- keep hosted cost bounded
- reduce abuse
- remain simple enough for MCP users to complete
- work across the supported clients
- make the user benefit clear
- preserve a reasonable free offering
- collect only defensible product data
- support a future paid path
- have a measurable rollback or adjustment rule

## Explicit non-decisions

This brief does not:

- change the current keyless behavior
- correct the public documentation
- introduce quotas
- alter the Search v2 beta
- deploy any hosted or web change
- authorize additional tracking

Those changes require a separate implementation and release plan after the access policy is decided.
