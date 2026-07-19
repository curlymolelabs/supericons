# Hosted and web zero-cluster mining, 30 days

Date: 2026-07-20

Method: read-only aggregation of `search_request_audit` (sources `web`, `local_web`, `mcp`; 25,732 rows, 7,456 distinct normalized queries, trailing 30 days). Zero clusters require at least 2 zero attempts and an over-80% zero rate; weak clusters are repeated queries returning 1 to 3 results. Local beta traffic logs elsewhere and does not pollute this set. These queries ran against the current production engine, but demand is version-agnostic: every cluster is a claim about what users want the engine to answer.

## Headline

Real users fail on ordinary interface vocabulary, not exotic queries. The founder passes emphasized the expressive tier; production demand says the biggest losses are common words the corpus can serve today but does not map. "dropdown" alone failed 175 times for 37 distinct clients.

## Top zero clusters (attempts x distinct clients)

| cluster | attempts | clients | corpus neighbors that should answer it |
| --- | --- | --- | --- |
| dropdown | 175 | 37 | chevron-down, select, list, menu |
| combobox | 166 | 36 | select, input plus chevron, list-search |
| respond | 156 | 22 | reply, message, corner-up-left |
| chooser / choose | 110 | 30 | select, hand-pointer, list-check |
| orchestrator | 74 | 20 | workflow, network, git-merge, robot |
| slides / keynote / deck (weak) | 97+ | 14+ | presentation, projector, gallery |
| repair | 39 | 11 | wrench, tool, hammer |
| firewall | 37 | 7 | shield, brick-wall, security |
| category | 32 | 18 | tags, folder-tree, grid |
| pagination | 28 | 8 | chevrons, dots, list-numbers |
| certificate / ssl cert / tls / signed | 79 | 9 | certificate exists in mingcute and tabler; ssl and tls need aliases |
| flight / aviation / airline / travel | 61 | 16 | plane, luggage, map |
| attachment | 18 | 10 | paperclip |
| mention / notify | 34 | 22 | at-sign, bell |
| customers | 16 | 12 | users, user-group (also a plural-stemming case) |
| pricing | 14 | 6 | tag, currency, receipt |
| health / doctor | 26 | 14 | heart-pulse, stethoscope |
| plugin | 12 | 7 | puzzle |
| community | 12 | 4 | users, heart-handshake |

## Weak clusters (repeated, 1 to 3 results)

delivery (56 x 20), shipping (55 x 18), wireless (49 x 14), warehouse (34 x 9), cpu (33 x 9), fix (31 x 11), trash (27 x 14), processor (27 x 4), ai slop (25 x 7), compute (21 x 4), hardware (21 x 4), template (20 x 11), dispatch (19 x 2), info (17 x 13). Several of these certainly have rich corpus coverage (trash, info), meaning ranking or tag reach, not content, is the limiter.

## Query classes the engine does not yet handle

1. Constraint phrases used as queries: "visually distinct 18px", "18px", "silhouettes cartoon styling", "choose coherent original". Agents pass rendering constraints as search terms; the engine should strip or interpret constraint tokens rather than zero out.
2. Non-English long-tail (Slovenian, Danish observed, single clients each): the localized gap is real but small in current volume.
3. Plurals: customers, screenshots, slides fail where singulars succeed, consistent with the founder-pass "databases" finding.

## Merged fix order (this mining plus the founder passes)

1. Vocabulary synonym batch for the top real-demand clusters above: pure maintained-data additions, highest measured demand, every entry has existing corpus neighbors.
2. Wire the recommendation variant generator into direct search on weak phrase scores (engine-generated variants measured at 4% zero versus 29% for agent phrasing).
3. Plural and inflection stemming in query normalization.
4. Confidence floor over substring filler (founder finding; also explains weak clusters like info and trash).
5. Aliases: k8s, ssl, tls, cert.
6. Constraint-token stripping.
7. Expressive tier data (ship it, burnout, doomscrolling, ai slop): lower raw demand than the vocabulary batch but brand-differentiating.

Each batch lands per `CP-01`: maintained data first, stable regression cases from these exact clusters, 225-case fingerprint review per batch.
