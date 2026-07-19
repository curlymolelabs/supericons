# The one-call contract: idiot-proof icon search for every model

Date: 2026-07-19

Status: design proposal for owner review; nothing here is implemented until scoped into a release.

## Principle

Design every MCP interaction as if the calling model can do exactly two things: make one obvious tool call, and paste what comes back. If the outcome is excellent under that assumption, weak and strong models converge on the same result. Strong models add orchestration on top; weak models are carried by the server. Observed motivation: in identical natural prompts, one model called the preview tool and rendered icons in chat while another never called it and produced text only. The differentiator must not depend on model initiative.

## The contract, per response

Every `search_icons` response is a complete answer kit:

1. Results, always. A query never returns empty-handed: exact matches when they exist, otherwise engine-generated alternates ("no exact match for ship it; closest concepts: rocket, deploy, package") produced by server-side decomposition and concept fallback, clearly labeled as alternates.
2. A visual, always. `image_url` (hosted PNG contact sheet) and a ready-made `markdown_image` snippet ship in the search response itself, so showing icons in chat requires pasting one line, not making a second tool call.
3. A paste-ready answer. A `suggested_response_markdown` field containing a compact, correct final answer (icon names, refs, the preview image, the browser link). Weak models paste it verbatim; strong models rewrite it. Same outcome either way.
4. A next step, always. Every response and every error names the follow-up in plain words ("include markdown_image in your reply to show the icons", "showing 12 of 40; call again with the rest"). No response is a dead end.

## Server-side intelligence replaces model-side intelligence

The quality gaps the founder passes found are exactly the places where strong models currently self-heal and weak models fail. Move each recovery into the engine so nobody has to be smart:

| observed model behavior | engine replacement |
| --- | --- |
| Decomposes failed phrases into single tokens ("deploy to production" to "deploy") | Intent decomposition inside the engine: on phrase miss, search meaningful tokens and merge, labeled |
| Substitutes concepts on zero results ("ship it" to rocket) | Concept-neighbor fallback from maintained expressive synonym data |
| Retries misspellings | Edit-distance recovery on the local index |
| Recovers from parameter rejections by guessing | Forgiving inputs: coerce string-vs-array, truncate long lists with a note, ignore unknown filters with a warning field; never a bare protocol error |
| Chooses the right tool among several | One obvious front door: `search_icons` descriptions establish it as the entry point; other tools are refinements. Server `instructions` at initialize state the display rule once |

## Enforcement: the dummy-agent gate

A behavioral test impersonates the weakest possible agent: it makes exactly one `search_icons` call per scenario and renders only what the response hands it. The gate asserts, for a fixed scenario suite: results or labeled alternates present, `markdown_image` present and resolvable, `suggested_response_markdown` present and accurate, and no scenario ends in an error or empty answer. This turns "idiot proof" from an aspiration into a regression-checked property, alongside the existing 225-case fingerprint suite.

## Layer mapping

| change | layer | candidate release |
| --- | --- | --- |
| `image_url` + `markdown_image` + `suggested_response_markdown` in search responses; description steering; server instructions; preview truncation; forgiving inputs | npm package and Railway server (same code) | beta.2 or beta.3, owner's call |
| Phrase decomposition, concept-neighbor fallback, expressive synonyms, edit-distance recovery, confidence floor over substring filler | shared engine and maintained data, benefits web equally | quality program fix batches per `CP-01` |
| Dummy-agent gate | verification suite | with whichever release ships the contract |
| Per client and model preview-form rows | compatibility matrix per `CP-06` | ongoing |

## What this does not change

Local-first routing, the allowance policy, telemetry honesty, and the release discipline are untouched. The contract adds fields and server-side recovery; it removes nothing and breaks no existing caller.
