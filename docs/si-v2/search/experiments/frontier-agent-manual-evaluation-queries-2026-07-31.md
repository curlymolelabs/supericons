# Supericons frontier-agent manual evaluation set

Date extracted: 2026-07-31

## What this set contains

These are 10 exact, top-level queries submitted to the production Hosted MCP `search_icons` tool. The wording has not been corrected, shortened, or expanded.

The production database records the query sent by the agent to Supericons. It does not record the user's full preceding chat prompt. Therefore, these are original MCP search queries, not necessarily the user's complete natural-language request.

All 10 records:

- Were completed production Hosted MCP calls.
- Were marked `query_origin = agent_query`.
- Were classified `unclassified_live`, not `controlled_test`.
- Appeared once in the trusted outcome data.
- Had no named verifier, fixture, audit, benchmark, or test client label.
- Contained no user identifier, IP address, country, timestamp, or request ID in this file.

Important limitation: `unclassified_live` means the request had no verified controlled-test marker. It does not prove that a human, rather than unsignaled automation, originated the request.

## Standard manual test instruction

Start a fresh session for each query. Use the same instruction with every model and harness:

> Use Supericons MCP for this task. Preserve the user's exact wording on your first search. Decide whether the results satisfy the request. Recommend up to three icons and briefly explain your judgment.

Then paste one test case below. If the case specifies a library, preserve that strict library constraint.

Do not show the model the historical production outcome until after it finishes.

## The 10 test cases

### 1. Mascot and concept search

Exact query:

```text
cartoon mascot smart brain play fun logo
```

Library constraint: All libraries

Review focus: Does the agent find a visually coherent mascot or logo concept, or does it return disconnected literal symbols?

### 2. Access-control concept

Exact query:

```text
key round access control
```

Library constraint: Lucide only

Review focus: Does the result set stay within Lucide and express access control rather than generic settings or navigation?

### 3. Consistent brand set

Exact query:

```text
github linkedin whatsapp email brand icons consistent monochrome
```

Library constraint: All libraries

Review focus: Can the agent select a consistent set while handling three brands and one generic email concept?

### 4. Learning journey

Exact query:

```text
route milestone path learning trail
```

Library constraint: Lucide only

Review focus: Does the agent interpret the phrase as progress through a learning journey rather than only transport or map navigation?

### 5. Low-result concrete object

Exact query:

```text
flower bouquet
```

Library constraint: All libraries

Review focus: Does the agent recognize whether a single close match is sufficient, instead of treating a small result count as automatic failure?

### 6. Long visual-art-direction query

Exact query:

```text
crumpled lined paper note with pencil writing app icon sticky notes clipart smooth rounded apple style
```

Library constraint: All libraries

Review focus: Does the agent separate essential meaning from visual styling that an icon library may not encode?

### 7. Multi-feature medical request

Exact query:

```text
medical feature icons: lockable valve, blood backflow control, one-hand push pull operation, prevent blood leakage, 60 cm tube length, compatible medical tools
```

Library constraint: Tabler only

Review focus: Does the agent treat this as a request for a coherent multi-icon set, rather than expecting one icon to express every feature?

### 8. Possibly missing brand

Exact query:

```text
ec innovations logo brand
```

Library constraint: All libraries

Review focus: Does the agent report an honest missing-brand result and offer a sensible generic alternative without pretending it found the official logo?

### 9. Identity-provider concept

Exact query:

```text
external sso identity provider authentication exchange
```

Library constraint: Tabler only

Review focus: Does the agent prioritize identity exchange and authentication concepts rather than generic user or lock icons?

### 10. Decorative list marker

Exact query:

```text
small sparkle flower badge decorative list marker elegant handmade
```

Library constraint: Lucide only

Review focus: Does the agent balance the decorative brief with the strict Lucide constraint?

## Evaluation sheet

Use one row per model and query.

| Query | Model and harness | First tool query preserved | Reformulated queries | Returned references | Preview used | Agent verdict | Human verdict | Notes |
|---|---|---:|---|---|---:|---|---|---|
| 1 |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |  |

## Historical production outcomes

Keep this section hidden from the model during the manual test. These counts describe the final production outcome recorded for the original call. They do not establish relevance or user satisfaction.

| Query | Original library | Recorded result |
|---|---|---:|
| `cartoon mascot smart brain play fun logo` | All | 6 icons |
| `key round access control` | Lucide | 5 icons |
| `github linkedin whatsapp email brand icons consistent monochrome` | All | 12 icons |
| `route milestone path learning trail` | Lucide | 12 icons |
| `flower bouquet` | All | 1 icon |
| `crumpled lined paper note with pencil writing app icon sticky notes clipart smooth rounded apple style` | All | 12 icons |
| `medical feature icons: lockable valve, blood backflow control, one-hand push pull operation, prevent blood leakage, 60 cm tube length, compatible medical tools` | Tabler | 20 icons |
| `ec innovations logo brand` | All | 0 icons |
| `external sso identity provider authentication exchange` | Tabler | 8 icons |
| `small sparkle flower badge decorative list marker elegant handmade` | Lucide | 12 icons |

## Extraction evidence

Source: `public.search_final_outcomes` in the production Supabase project.

Selection window: trusted final-outcome coverage beginning 2026-07-15.

Required fields and filters:

```text
environment in production or legacy production
channel = hosted_mcp
tool_name = search_icons
metadata.query_origin = agent_query
settlement_state = completed
traffic_class = unclassified_live
query is present
```

The final verification matched every selected query to exactly one row. It also confirmed zero `controlled_test` matches and zero client-family labels matching verifier, fixture, audit, capture, benchmark, or test.

Known repeating monitoring probes, release fixtures, URLs, email addresses, secrets, and queries containing personal identifiers were excluded from selection.
