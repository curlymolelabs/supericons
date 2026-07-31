# Agent harness behavior refinement log

Status: evidence collection in progress

Purpose: collect real agent and harness behavior before making one bounded batch of refinements. Findings in this document do not authorize individual search, telemetry, dashboard, or tool-contract changes.

## Why this work exists

Supericons can return technically correct search results while an agent still creates a poor user experience through:

- An unnecessary library restriction.
- An invalid tool sequence.
- Excessive retries.
- Weak interpretation of a small but exact result set.
- A final explanation that makes Supericons appear worse than the actual product outcome.

The evaluation target is therefore the complete agent task:

```text
User prompt
  -> tool selection
  -> tool arguments
  -> recovery behavior
  -> preview
  -> exact SVG retrieval
  -> final answer
```

Search-result quality remains important, but it is only one part of this flow.

## Evidence rules

Each case added to this log must distinguish:

- **Verified:** proven directly from production records, exact tool definitions, or the visible final response.
- **Inference:** a likely explanation that cannot be proven from available records.
- **Unverified:** a claim for which the required evidence is unavailable.

Do not treat an intermediate zero or low-result search as proof that the complete user task failed.

Do not claim that a tool query is the user's original chat prompt. Production telemetry stores the query submitted to Supericons, not the full preceding conversation.

## Test case 001: five brand logos in ChatGPT

### User prompt

```text
@Supericons Compare OpenAI, Anthropic, Vercel, Supabase, and Figma logos with preview_icons. Then give me the OpenAI SVG.
```

Surface: ChatGPT website with the hosted Supericons MCP app

Agent model: GPT-5.6 Sol

Effort: Light

Observed user-facing outcome:

- ChatGPT produced a five-icon comparison.
- Anthropic, Vercel, Supabase, and Figma used Simple Icons.
- OpenAI used `tabler:brand-openai`.
- ChatGPT disclosed that the OpenAI result was a Tabler outline recreation rather than presenting it as an official Simple Icons logo.
- ChatGPT returned the OpenAI SVG.

### Verified production trace

Production time is shown in Asia/Singapore.

| Time | Tool | Query or ref | Library | Requested | Returned | Outcome |
|---|---|---|---|---:|---:|---|
| 5:42:18 PM | `search_icons` | `openai` | `si` | 3 | 0 | Zero |
| 5:42:21 PM | `search_icons` | `vercel` | `si` | 3 | 0 | Zero |
| 5:42:23 PM | `search_icons` | `anthropic` | `si` | 3 | 0 | Zero |
| 5:42:25 PM | `search_icons` | `figma` | `si` | 3 | 0 | Zero |
| 5:42:28 PM | `search_icons` | `supabase` | `si` | 3 | 0 | Zero |
| 5:42:38 PM | `search_icons` | `openai` | `simpleicons` | 2 | 0 | Zero |
| 5:42:40 PM | `search_icons` | `supabase` | `simpleicons` | 2 | 1 | Result |
| 5:42:45 PM | `search_icons` | `anthropic` | `simpleicons` | 2 | 1 | Result |
| 5:42:49 PM | `search_icons` | `figma` | `simpleicons` | 2 | 1 | Result |
| 5:42:52 PM | `search_icons` | `vercel` | `simpleicons` | 2 | 1 | Result |
| 5:43:00 PM | `get_icon` | `simpleicons:openai` | `simpleicons` | 1 | 0 | Exact ref not found |
| 5:43:01 PM | `preview_icons` | Four known Simple Icons refs | All | Not applicable | 4 | Success |
| 5:43:12 PM | `search_icons` | `openai chatgpt knot logo` | All | 10 | 10 | Success |
| 5:43:22 PM | `preview_icons` | Tabler OpenAI plus four Simple Icons refs | All | Not applicable | 5 | Success |
| 5:43:25 PM | `get_icon` | `tabler:brand-openai` | `tabler` | 1 | 1 | Success |

Accepted tool calls recorded: 15.

The all-library OpenAI search returned these leading relevant candidates among its ten results:

- `si:openai-codex-app`
- `tabler:brand-openai`
- `simpleicons:openaigym`
- `mingcute:openai_line`

The selected exact SVG was `tabler:brand-openai`.

### What the trace proves

#### 1. ChatGPT supplied the `si` restriction

The production rows contain `library_filter = si`. The hosted telemetry writer records the accepted `args.library` value. The search service did not silently convert an all-library request into an `si` request.

Relevant source:

- `mcp/remote-server.js`, the usage event reads the library from `args.library`.
- `mcp/remote-server.js`, the `search_icons` library field is optional.

#### 2. The user did not request the `si` library

The prompt selected the Supericons app with `@Supericons`. It did not ask for the Supericons custom icon library.

Selecting the Supericons app and selecting the `si` library are different actions.

#### 3. The current tool description defines the keys correctly

The hosted tool definition says:

- `si` means the Supericons AI and developer-tool logo library.
- `simpleicons` means the Simple Icons brand-logo library.
- The library field is optional.

The tool description therefore does not define `si` as Simple Icons.

#### 4. The current server instructions lack an explicit default-library decision rule

The shared MCP instructions tell the agent to use `search_icons` first and `preview_icons` only for refinement or known refs. They do not explicitly say:

```text
If the user did not name a library, omit the library filter and search all libraries.
Do not infer the si library from the Supericons app name.
```

This is a tool-contract gap even though the existing library descriptions are factually correct.

#### 5. The dashboard showed individual attempts, not one task outcome

The dashboard correctly displayed the five strict `si` zeros, the Simple Icons results, and the later all-library success as separate searches.

It did not show one combined outcome for the user's complete task. The available telemetry gives every accepted tool call a separate episode. It does not provide a verified shared ChatGPT conversation or task identifier for this sequence.

#### 6. One exact brand result is not necessarily weak

Anthropic, Vercel, Supabase, and Figma each produced one exact Simple Icons match. The dashboard displayed these as Low because only one of two requested results was returned.

For an exact brand identity query, one correct result can be the ideal outcome. Raw result count alone does not measure suitability.

### Bounded inferences

The most likely explanation is that ChatGPT confused selecting the Supericons app with selecting the `si` library. This is plausible because the app and library share the Supericons name, but ChatGPT's private reasoning is not available and the explanation cannot be proven.

The ChatGPT interface says that shorthand references were not valid and that it needed to resolve exact refs. This suggests an earlier rejected `preview_icons` attempt using noncanonical names. No accepted production usage event exists before the first `search_icons` call, so the exact rejected request is unverified. It may have failed during tool-input validation before normal usage logging began.

## Assessment

### Product outcome

The complete task succeeded. The user received:

- A comparison of five logos.
- A visual preview.
- An OpenAI SVG.
- An honest disclosure about the Tabler OpenAI recreation.

### Experience quality

The route was inefficient and initially misleading:

- Five unnecessary strict `si` searches.
- Five more Simple Icons searches.
- One invalid exact OpenAI lookup.
- One later all-library recovery search.
- Fifteen accepted tool calls in total.
- Several intermediate dashboard zeros that can be mistaken for final product failure.

### Defect classification

Primary classification: agent orchestration weakness enabled by a tool-contract gap.

Not established as a Search v2 ranking regression.

Related observability gaps:

- No reliable shared task identity across the accepted ChatGPT tool calls.
- Rejected tool-input validation may not appear in normal usage telemetry.
- Result-count labels do not distinguish an exact single match from a weak semantic result.

## Candidate batch refinements

These are candidates for later review, not approved individual fixes.

### A. Default library rule

Add a direct instruction to the MCP server and `search_icons` tool:

```text
If the user does not explicitly name an icon library, omit the library filter and search all eligible libraries.
Do not infer the si library from the Supericons app or server name.
```

### B. Brand-search guidance

Add bounded guidance:

```text
For named brands, search all libraries first unless the user asked for one specific library.
Use Simple Icons when an official or maintained Simple Icons record is available.
If no official record is available, label any recreation or alternative accurately.
```

Do not automatically reinterpret `si` as `simpleicons`. Both are valid, different libraries.

### C. Preview sequencing

Reinforce the current rule:

```text
Use search_icons before preview_icons unless canonical library:id refs are already known.
Do not pass brand names as icon refs.
```

### D. Recovery efficiency

Evaluate whether the structured zero response should more strongly recommend removing an inferred library restriction before repeating the same query in another strict library.

Do not add unbounded retries.

### E. Library mode argument safety

The hosted handler correctly rejects `library_mode = prefer` when no actual preferred library is present. A model can still send `library = all` with `library_mode = prefer`, which normalizes to no preferred library and produces a predictable error.

The tool guidance should make this relationship explicit:

```text
Use library_mode = all when no library is specified.
Use library_mode = prefer only with a named library such as lucide or simpleicons.
Do not combine library = all with library_mode = prefer.
```

### F. `get_icon` error-schema parity

The `get_icon` output schema currently declares only `icon` and `error` at [mcp/remote-server.js](</C:/backup/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/remote-server.js:326>). Its not-found response also returns `code`, `hint`, `next_step`, and `retryable` at [mcp/remote-server.js](</C:/backup/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/remote-server.js:1989>). A strict MCP client can reject that response as additional properties.

This is a confirmed tool-contract defect, separate from search ranking. The batch should either declare those fields in the output schema or return only the fields currently declared. The choice should be made once, then verified on every supported client.

### G. Agent-task measurement

Investigate a privacy-safe way to distinguish:

- Individual search attempts.
- A recovered multi-call agent task.
- The final user-facing task result.

Do not group records by query text and time alone. Any grouping needs a trustworthy shared identity.

### H. Dashboard interpretation

Consider displaying:

- `1 exact match` separately from `Low`.
- `Recovered in later attempt` when a verified recovery chain exists.
- Search-attempt quality separately from complete agent-task quality.

Do not hide real zero attempts. Improve their interpretation.

### I. Rejected-call observability

Determine whether MCP schema-validation failures can be recorded safely without storing private prompts or invalid payload content.

The goal is to distinguish:

- A client-side rejected tool call.
- A search result of zero.
- A service or transport error.

### J. Cross-client preview delivery

Treat preview generation and preview display as separate acceptance layers.

The hosted tool already returns MCP image content, `image_url`, `markdown_image`, and `preview_url`. A supported client can still fail to display the inline PNG. The agent-facing contract should require the final answer to include the browser `preview_url` whenever visual comparison matters, even when an inline image was requested.

Candidate rule:

```text
When preview_icons succeeds, include preview_url as a visible fallback link.
Do not claim that the preview is visible merely because the tool returned image content.
If the client cannot display the contact sheet, provide the exact refs and the fallback link.
```

Do not change search ranking or icon selection to address a client image-rendering defect.

## Test case 002: GPT-5.6 Luna High

### User prompt

```text
@Supericons Compare OpenAI, Anthropic, Vercel, Supabase, and Figma logos with preview_icons. Then give me the OpenAI SVG.
```

Surface: ChatGPT website with the hosted Supericons MCP app

Agent model: GPT-5.6 Luna

Effort: High

### Verified trace cluster

The strongest matching production cluster ran from 12:35:27 AM through 12:36:44 AM Singapore time. The database reports `client_family = unknown`, so the model attribution comes from the supplied screenshot and time correlation, not from the telemetry itself. The same anonymous client hash was also reused by nearby traffic, so the cluster must not be treated as a guaranteed conversation boundary.

Observed search behavior:

1. Five searches for `openai logo`, `anthropic logo`, `vercel logo`, `supabase logo`, and `figma logo` were sent with no usable preferred library and failed with `preferred_library_required`.
2. Five strict `si` searches followed. OpenAI and Vercel returned one result each. Anthropic, Supabase, and Figma returned zero.
3. Five strict `simpleicons` searches followed. Anthropic, Vercel, Supabase, and Figma returned one result each. OpenAI returned zero.
4. Four all-library searches followed: `openai`, `open ai`, `openai brand`, and `openai logo`.
5. `preview_icons` returned five refs.
6. `get_icon` successfully returned `tabler:brand-openai`.

The final response identified Tabler for OpenAI and Simple Icons for the other four brands. The OpenAI SVG rendered successfully in the screenshot.

### Assessment

The final user outcome succeeded, but the route was highly inefficient. The first five errors were caused by an invalid combination of library mode and library value. The later `si` selection repeated the library confusion found in Test case 001.

This case adds a new confirmed refinement target: the model needs an explicit rule for `prefer` versus `all`, not only a rule about which library key to choose.

## Test case 003: DeepSeek V4 Flash

### User prompt

```text
Use supericons. Compare OpenAI, Anthropic, Vercel, Supabase, and Figma logos with preview_icons. Then give me the OpenAI SVG.
```

Surface: Hosted Supericons MCP through the DeepSeek V4 Flash harness

Agent model: DeepSeek V4 Flash Free

Effort: Max

### Verified trace cluster

The strongest matching production cluster ran from 12:36:20 AM through 12:36:58 AM Singapore time. The database reports `client_family = unknown`, so the model attribution comes from the supplied screenshot and time correlation.

Observed behavior:

1. An initial `preview_icons` request used noncanonical brand names as refs and returned `invalid_icon_ref`.
2. The harness then searched all libraries for `open ai`, previewed four Simple Icons refs, and searched additional all-library variants.
3. It tried `get_icon` with `simpleicons:openai` and later with an `si` OpenAI lookup. Both server-side lookups were not found.
4. It searched `openai logo` in Simple Icons and found only `simpleicons:openaigym`.
5. It searched `openai brand logo openai` across all libraries, then searched `openai` in `si`.
6. A final `preview_icons` call returned seven refs.

The screenshot shows two `get_icon` calls rejected by the MCP client with an output-schema error stating that the response contained additional properties. The production usage rows record the underlying server responses as `icon_not_found`. These are consistent: the server returned an error payload, then the strict client rejected its extra fields because the declared `get_icon` schema did not include them.

The final answer used the SVG returned inline from `search_icons` rather than a successful `get_icon` call. The screenshot states that the inline image could not be rendered in that model, while the live preview link was provided.

### Wrong tool versus wrong use

DeepSeek did not choose completely unrelated tools. It used the right tool family with the wrong sequence and identifiers:

| Call | Tool choice | Actual problem |
|---|---|---|
| First `preview_icons` | Correct eventual tool | Called too early and supplied brand names instead of canonical `library:id` refs. |
| `get_icon` for `simpleicons:openai` | Correct exact-lookup tool | Guessed an ID that does not exist. The Simple Icons search exposed only `simpleicons:openaigym`, not an OpenAI brand ref. |
| `get_icon` for `si:openai` | Correct exact-lookup tool | Guessed another ID that does not exist. |
| Later `search_icons` calls | Correct recovery tool | Resolved real OpenAI alternatives across libraries. |
| Final `preview_icons` | Correct tool and arguments | Completed successfully with seven canonical refs. |

The correct sequence should have been:

```text
search_icons across all libraries
  -> choose exact returned library:id refs
  -> preview_icons with those refs
  -> get_icon with the selected exact ref
```

For this case, the exact OpenAI fetch should have used a returned ref such as `tabler:brand-openai`, not a guessed `openai` ID.

### Why the visible `-32602` error occurred

The `-32602` message says the structured response contained additional properties. This is response validation, not evidence that DeepSeek sent malformed input.

The combined failure path was:

1. DeepSeek requested a nonexistent exact ref.
2. Supericons correctly produced an icon-not-found result.
3. The response included `error`, `code`, `hint`, `next_step`, and `retryable`.
4. The declared `get_icon` output schema permits only `icon` and `error`.
5. The strict MCP client rejected the additional response fields.

DeepSeek's final statement that `get_icon` was generally erroring server-side was too broad. Valid exact lookups still work. In Test case 002, `get_icon` successfully returned `tabler:brand-openai`. The confirmed defect affects the not-found response contract, not every `get_icon` call.

### Assessment

This harness eventually produced a useful comparison and a truthful OpenAI alternative, but it exposed two separate problems: weak agent sequencing with guessed refs, and a real `get_icon` not-found schema defect. It also demonstrates that a client can complete the task through search output even when exact lookup recovery fails.

## Test case 004: Codex desktop preview rendering matrix

Surface: Codex desktop with the hosted Supericons MCP app

Task ID: `019fb907-9a0c-7d23-94b6-805d1caeff63`

Agent model: GPT-5.6 Luna

Effort: High

### Evidence reviewed

- The exact Codex task transcript, including accepted MCP tool names, arguments, completion status, call duration, and final response text.
- Eight supplied Codex desktop screenshots from the same task.
- The current `preview_icons` response construction in `mcp/remote-server.js` and `mcp/preview-icons.js`.
- Direct HTTP retrieval of five PNG URLs used by the task.

The model and effort are visible in the supplied Codex screenshots. They are not fields proven by hosted usage telemetry.

### Prompt and outcome matrix

| User task | Tool path | Selection outcome | Visual outcome in Codex |
|---|---|---|---|
| Preview four Simple Icons brand refs plus `tabler:brand-openai`, then return the OpenAI SVG | `preview_icons`, then `get_icon` | Exact requested refs were used | Group PNG showed a broken placeholder. The returned OpenAI SVG rendered correctly. |
| Find the official EC Innovations logo or give honest alternatives | Seven bounded searches, then `preview_icons` | Correctly reported that the official logo was unavailable and labeled three generic alternatives honestly | Group PNG showed a broken placeholder. A browser preview link was present. |
| Find an icon for handing work to another teammate | Nine bounded searches, then `preview_icons` | Returned five interpretations and recommended `lucide:user-plus` | Group PNG was emitted as Markdown. The screenshot sequence shows the same preview-placeholder behavior in this task. |
| Recommend a calm icon for securely sharing medical records | Four searches, then `preview_icons` | Returned five relevant candidates and recommended `iconoir:privacy-policy` | Group PNG showed a broken placeholder. Text refs and rationale remained usable. |
| Find five strict Tabler outline icons for external SSO and return the best SVG | Three strict searches, `preview_icons`, then `get_icon` | Stayed within Tabler and recommended `tabler:login` | Group PNG showed a broken placeholder. The exact Tabler SVG rendered correctly. |
| Choose Upload, Processing, and Complete icons, preview the set, and return SVGs | `recommend_icons`, four strict searches, `preview_icons`, then three `get_icon` calls | Returned a consistent Lucide set | Group PNG showed a broken placeholder. All three exact SVG code blocks rendered correctly. |
| Find a refined floral marker | Four searches, then `preview_icons` | Returned five floral candidates and recommended `iconoir:flower` | Group PNG showed a broken placeholder. Text refs and ranking remained usable. |
| Find a quantum-powered telepathic pineapple database icon or report an honest no-result | Four searches, then `preview_icons` | Correctly rejected the full concept, reported no pineapple result, and suggested four composable building blocks | Group PNG showed a broken placeholder. The honest no-result and simpler concepts remained usable. |

### What the transcript proves

#### 1. Luna called the correct preview tool

Every reviewed visual comparison used `preview_icons` with canonical `library:id` refs and `include_image = true`. Every `preview_icons` call completed successfully. Recorded durations ranged from 562 ms to 1,195 ms.

This is not the wrong-tool or invalid-ref problem seen in the first DeepSeek attempt.

#### 2. Luna placed valid PNG URLs in the final answers

The exact final messages contain Markdown images such as:

```text
![Supericons preview](https://mcp.supericons.dev/preview-icons.png?...)
```

The URLs contain the same canonical refs sent to `preview_icons`.

#### 3. The hosted PNG route was healthy when checked

The five directly checked URLs returned HTTP 200 with `Content-Type: image/png`.

Observed response sizes were:

- Brand comparison: 30,223 bytes.
- Tabler SSO set: 27,521 bytes.
- Healthcare set: 28,657 bytes.
- Floral set: 39,089 bytes.
- Quantum and database building blocks: 25,234 bytes.

The brand comparison response SHA-256 was `6FB226D2212CEDC422FC24EFF27222A84055D93F74EABDF00CA3BA6EC5D71F7F` during verification.

This proves that the referenced endpoint could generate and serve the PNG. It does not prove why Codex failed to display it at the earlier screenshot time.

#### 4. Codex rendered exact SVG blocks but not the contact-sheet PNGs

The screenshots show large rendered SVGs for:

- `tabler:brand-openai`
- `tabler:login`
- `lucide:upload`
- `lucide:loader-circle`
- `lucide:file-check`

In the same task, group preview images appear as small broken-image placeholders.

The verified failure boundary is therefore presentation of the remote PNG inside Codex, after successful tool completion and after Luna emitted a valid Markdown image reference. It is not a general inability to render icons and it is not evidence of a Search v2 failure.

#### 5. One follow-up exposed an agent fallback weakness

When the user said `show me the icons in the chat ui`, Luna called `preview_icons` successfully but its final answer contained only the six labels. It did not include the returned Markdown image or browser preview link.

That response is an agent presentation failure. It is separate from the Codex broken-placeholder behavior in the other turns.

### Root cause boundary

Verified:

- Supericons search, recommendation, preview, and exact SVG tools completed successfully in the reviewed task.
- The final responses used valid Markdown image URLs.
- The PNG endpoints were directly reachable and returned real PNG bytes when audited.
- Codex displayed broken placeholders for the group PNGs while rendering exact inline SVG blocks.

Unverified:

- Whether Codex blocked the remote host, failed through an image proxy, rejected a media policy, used a stale cache, or had another renderer defect.
- Whether the PNG endpoint was temporarily unavailable at the precise earlier rendering moment.
- Whether every Codex installation and version reproduces the problem.

Classification: client or harness presentation defect, plus one confirmed agent fallback omission. Not a search-quality defect. Not a `preview_icons` tool-selection defect.

### Comparison with the DeepSeek OpenCode specimen

The earlier DeepSeek OpenCode screenshots show a rendered multi-icon contact sheet. The Codex screenshots show broken contact-sheet placeholders for valid preview URLs. This proves that the user-visible result varies by harness.

It does not prove that Luna is intrinsically unable to show images. The model selected the correct tool and wrote the image reference. The client controls whether that reference is rendered.

### Bounded follow-up

Before changing Supericons output, reproduce the same exact `preview_icons` call in:

1. Codex desktop.
2. ChatGPT with the Supericons app.
3. OpenCode with hosted Supericons MCP.
4. One additional MCP client that supports image content.

Record separately for each client:

- Whether MCP image content is visible.
- Whether the Markdown `image_url` is visible.
- Whether `preview_url` opens.
- Whether exact SVG output is visible.

If only Codex fails, report the renderer issue to the Codex client and keep the Supericons change limited to a prominent browser-preview fallback. If several clients fail on the same payload, inspect the response transport and image contract before deciding on a server change.

## Cross-case findings

### 1. Library choice varies by model

GPT-5.6 Luna High selected `si` first after an invalid preferred-library attempt. DeepSeek selected `simpleicons` first, then all libraries, and used `si` only later. The common problem is not that every model chooses the same wrong library. The common problem is that the tool contract does not give a strong enough default decision rule.

### 2. `library_mode` is an independent failure axis

The Luna trace contains five `preferred_library_required` errors with raw `library_filter = null` and `library_mode = prefer`. A dashboard view may display the missing filter as All, but the production row does not contain an actual preferred library. This means the model can misuse the mode independently of library selection. The batch evaluation must test both fields together.

### 3. `get_icon` has a real strict-client compatibility defect

The not-found response contains more properties than the declared output schema. This is not an agent interpretation issue and not a search-quality issue. It is a server contract mismatch that should be fixed in the same bounded batch as other agent-facing tool contract refinements.

### 4. Telemetry does not reliably identify model or conversation

Both new traces report `client_family = unknown`. Anonymous client identity can group nearby calls, but it is not a trustworthy conversation boundary. The report must keep model and effort from the screenshots as supplied test metadata, not as database-proven fields.

### 5. Preview service success and client rendering are separate

The reviewed traces include successful server-side previews. The Codex Luna task repeatedly shows broken contact-sheet placeholders but working exact SVGs. Direct checks returned real PNG bytes from the referenced URLs. The DeepSeek OpenCode specimen displayed a contact sheet. The evidence therefore points to a harness-specific presentation difference, not a Search v2 failure. The exact internal Codex renderer cause remains unverified.

## Proposed acceptance case for the batch

Run the exact prompt in supported frontier harnesses:

```text
@Supericons Compare OpenAI, Anthropic, Vercel, Supabase, and Figma logos with preview_icons. Then give me the OpenAI SVG.
```

Candidate acceptance checks:

1. The first accepted search does not use `si` unless the user explicitly requested it.
2. All-library search is used when no library was specified.
3. `preview_icons` receives canonical `library:id` refs.
4. The final preview contains five resolved icons.
5. `get_icon` receives the exact selected OpenAI ref.
6. The final answer distinguishes official brand records from recreations or alternatives.
7. The agent does not describe one exact match as poor solely because the requested limit was higher.
8. The final user outcome is successful even if an intermediate library lacks one brand.
9. Retries are bounded.
10. `library_mode = prefer` is sent only with a named preferred library.
11. A not-found `get_icon` response validates on strict MCP clients.
12. Search ranking fingerprints remain unchanged unless a later evidence-backed search defect is separately approved.
13. The final answer includes a visible `preview_url` fallback whenever visual comparison matters.
14. The agent does not claim that an inline preview is visible merely because `preview_icons` succeeded.
15. Each supported client is scored separately for MCP image content, Markdown image rendering, browser-preview fallback, and exact SVG rendering.

The final batch should define a realistic tool-call budget only after this case is run across multiple models and harnesses.

## Further test log

Add each new specimen below before proposing implementation.

| Case | Harness | Agent model | Effort | User task | Main issue | Complete task outcome | Evidence status |
|---|---|---|---|---|---|---|---|
| 001 | ChatGPT website | GPT-5.6 Sol | Light | Compare five brand logos, preview them, return OpenAI SVG | Inferred `si` restriction, excessive recovery calls, attempt-level dashboard interpretation | Successful | Production trace verified |
| 002 | ChatGPT website | GPT-5.6 Luna | High | Compare five brand logos, preview them, return OpenAI SVG | Invalid `prefer` mode, inferred `si` restriction, excessive recovery calls | Successful | Screenshot and time-correlated production trace |
| 003 | DeepSeek V4 Flash harness | DeepSeek V4 Flash Free | Max | Compare five brand logos, preview them, return OpenAI SVG | Invalid preview refs, `get_icon` output-schema rejection, repeated recovery searches | Useful comparison and SVG from search output | Screenshot and time-correlated production trace |
| 004 | Codex desktop | GPT-5.6 Luna | High | Eight exact, semantic, strict-library, workflow, decorative, and honest-zero tasks | Contact-sheet PNGs displayed as broken placeholders, one fallback answer omitted all preview links | Search and selection outcomes succeeded, exact SVGs rendered | Exact task transcript, screenshots, source inspection, and live PNG retrieval verified |

## Consolidated agent UX gap map

This section converts the collected cases into one proposed batch. It does not authorize implementation or release.

| Gap | Verified evidence | User impact | Product boundary |
|---|---|---|---|
| Unspecified-library behavior is not explicit enough | Two GPT cases inferred `si` even though the user named no library | Unnecessary zeros, retries, and an impression that the catalog is weak | MCP instructions and safe argument normalization |
| `library_mode` is too easy to misuse | Luna sent `prefer` without a real preferred library five times | Rejected calls before useful search begins | Tool schema, examples, and safe normalization |
| Models guess refs before searching | DeepSeek previewed names as refs and guessed nonexistent OpenAI IDs | Validation errors and failed exact lookup | Tool sequence guidance and structured recovery |
| One exact result is labeled like a weak result | Exact brand searches returned one correct result but appeared Low in the dashboard | Agents and owners can misread precision as poor recall | Response semantics and dashboard interpretation |
| Search results do not summarize suitability strongly enough | The compact suggested answer lists name and ref, but not a clear overall exact, strong, partial, or no-match judgment | Models must infer quality and may describe useful results as poor | Search response presentation |
| Error types are not always cleanly separated | Search zero, strict-library zero, invalid arguments, exact-ref absence, transport failure, and client rendering failure appeared in the same user journey | Models can blame Supericons for a client or orchestration problem | Structured status and agent wording rules |
| `get_icon` not-found output violates its schema | The current schema permits `icon` and `error`, while the not-found payload also returns `code`, `hint`, `next_step`, and `retryable` | Strict clients reject a useful recovery response with `-32602` | MCP response contract |
| Preview generation and preview display are conflated | Codex received successful preview responses and valid PNG URLs but showed broken placeholders | The user cannot compare icons visually and may think preview failed | Client renderer plus a Supericons fallback |
| Visual fallback is inconsistent | One Luna reply omitted both image Markdown and the browser link after a successful preview | The user receives labels instead of the requested visual comparison | Server instructions and final-answer guidance |
| Multi-slot tasks still fan out into redundant searches | The workflow task used `recommend_icons`, then four searches, then preview and three exact fetches | Slow answers and more opportunities for errors | Tool-choice guidance and call budget |
| Brand authority is inferred by the model | Models had to determine whether OpenAI was official, recreated, or an alternative | Risk of presenting a recreation as official branding | Result metadata and suggested wording |
| Agent and harness identity is weak | Production traces often report `client_family = unknown` | Failures cannot be reliably compared across Codex, ChatGPT, OpenCode, and other clients | Privacy-safe client information |
| Attempt quality and task quality are different | A successful brand task generated multiple visible zero and low attempts | Search telemetry can make a recovered task look like product failure | Analytics, not search ranking |
| Guidance assumes a capable planner | Lower-quality and frontier models both made basic sequencing or argument mistakes | Good search can still create a poor final answer | Simplified golden path and forgiving server behavior |

## Recommended agent UX contract

The contract should be short enough for weaker models and strict enough to prevent common mistakes.

```text
1. For one icon concept, call search_icons first.
2. If the user did not name a library, search all libraries. Never infer si from the Supericons name.
3. Use strict only when the user explicitly requires one library.
4. Use prefer only with a real named library.
5. Use recommend_icons for two or more named UI slots.
6. Send preview_icons only canonical library:id refs returned by a tool.
7. Send get_icon only an exact returned ref. Do not guess IDs.
8. Stop after a strong result. Use at most one bounded recovery unless the user asks for broader exploration.
9. Distinguish exact match, strong semantic match, partial building block, honest no-match, tool error, and client display failure.
10. When visual comparison matters, show the image and a visible preview_url fallback.
```

This should replace scattered inference with one obvious operating path.

## Recommended response quality contract

The service should give agents enough evidence to describe results accurately. A successful search response should expose or clearly summarize:

- `outcome_quality`: `exact`, `strong`, `partial`, or `no_match`.
- `match_scope`: all libraries, preferred library, or strict library.
- `recommended_ref`: the best verified ref when one exists.
- `why_it_fits`: one short user-facing reason.
- `important_caveat`: for example, unofficial recreation, generic alternative, or style mismatch.
- `result_interpretation`: for example, `One exact match is a complete success for this named brand query.`
- `preview_url`: always available when results exist.
- `next_step`: one action, not several competing actions.

The existing result objects and semantic records already contain useful material, but the compact suggested response currently emphasizes names and counts. The batch should make suitability, authority, and limitations explicit in the top-level presentation.

## How agents should describe Supericons

Do not instruct agents to praise the service regardless of outcome. That would weaken trust. Make the response precise enough that a fair positive assessment becomes natural.

Preferred wording patterns:

| Situation | Accurate agent wording |
|---|---|
| One exact brand match | `Supericons found one exact maintained brand icon.` |
| Several strong semantic options | `Supericons found five relevant options. The strongest is ... because ...` |
| Strict library has no match | `The requested library has no suitable match. An all-library search can provide alternatives.` |
| No exact company logo | `Supericons does not contain an official logo for this company. These are generic alternatives, not company branding.` |
| Composite concept | `No single icon represents the full concept. These verified building blocks can be combined.` |
| Client cannot show the image | `The preview was generated, but this client did not display it. Open the visual preview here.` |
| Service or transport failure | `The search service could not complete this request. This is an error, not a no-result.` |

The model should attribute the limitation to the correct layer. It should not say the search is bad when the actual problem is a strict filter, guessed ID, client renderer, or transport error.

## How to provide OpenCode-like visuals in Codex

### What is possible now

- Exact SVG code blocks render visually in Codex.
- The hosted browser `preview_url` can show the whole comparison.
- OpenCode can display the PNG contact sheet in the tested harness.

### What Supericons cannot guarantee alone

Supericons cannot force Codex to render remote Markdown images or MCP image content. The collected Codex task proves that the tool succeeded and the PNG URLs were valid, but the Codex UI displayed placeholders.

### Proposed layered solution

1. File a Codex client reproduction using one frozen `preview_icons` payload and its working PNG URL.
2. Keep MCP image content, `image_url`, `markdown_image`, and `preview_url` in the response.
3. Require agents to show the browser preview link whenever visual comparison matters.
4. Add a compact SVG contact-sheet fallback only if cross-client testing proves it renders reliably where PNG does not.
5. Do not return several full SVGs by default. Use that only when the user asks for implementation assets, because it increases response size sharply.

The desired experience is:

```text
Inline contact sheet when the client supports it
  -> otherwise one clear browser preview link
  -> exact SVG only for the selected icon or requested implementation set
```

## Proposed batch implementation order

### Phase 1: contract correctness

1. Fix `get_icon` not-found schema parity.
2. Add the ten-rule agent UX contract to hosted and local MCP instructions.
3. Make no-library behavior explicitly all-library.
4. Safely normalize unambiguous invalid combinations, such as `prefer` without a library, to all-library with a warning instead of spending a full failed turn.
5. Keep strict behavior when the user explicitly named a library.

### Phase 2: result interpretation

1. Add top-level outcome quality and scope.
2. Distinguish one exact result from low semantic recall.
3. Surface official, maintained, recreation, and generic-alternative status when the records support it.
4. Improve `suggested_response_markdown` so the answer leads with the best result, why it fits, and the important caveat.
5. Keep honest no-results. Do not manufacture alternatives inside a strict request.

### Phase 3: visual delivery

1. Run the same frozen preview payload through Codex, ChatGPT, OpenCode, and one other MCP client.
2. Record MCP image, Markdown PNG, browser link, and exact SVG rendering separately.
3. Escalate a reproducible Codex renderer defect to the Codex client team.
4. Add only the smallest server fallback supported by the matrix.

### Phase 4: orchestration efficiency

1. Make `recommend_icons` the clear default for multiple UI slots.
2. Define a bounded call budget by task type.
3. Stop repeated calls with the same query and filter after a deterministic failure.
4. Require one filter relaxation before query proliferation when the user did not request the filter.

### Phase 5: verification and measurement

Run a controlled matrix across:

- A lower-cost model.
- A strong frontier model.
- Codex desktop.
- ChatGPT.
- OpenCode.
- Another common MCP client.

Task families:

- Exact named brand.
- Semantic single icon.
- Strict-library request.
- Multi-slot coherent set.
- Workflow states with implementation SVGs.
- Decorative and tone-sensitive choice.
- Multilingual query.
- Ambiguous query requiring clarification.
- Honest no-result.
- Composite concept requiring building blocks.
- Preview of known refs.
- Recovery from an unavailable exact ref.

Score the complete task, not only each tool call:

- User request completed.
- Best icon is suitable.
- Library and authority are represented honestly.
- Visual comparison is actually visible or has a working fallback.
- Exact SVG succeeds when requested.
- Errors are attributed to the correct layer.
- Tool calls stay within the bounded budget.
- Final wording is accurate and useful.

## Recommended decision

Do not add another broad search rewrite now. The highest-value batch is:

1. Correct the tool contract.
2. Make result quality self-explanatory.
3. Guarantee a usable visual fallback.
4. Test the complete user journey across clients and model levels.

Only change ranking when this matrix identifies a repeatable relevance defect after orchestration and rendering failures are removed.

## Source evidence

Code reviewed:

- `mcp/remote-server.js`
- `mcp/preview-icons.js`
- `mcp/public-icon-preview.js`
- `mcp/search-tool-shell.js`

Codex task inspected read-only:

- `019fb907-9a0c-7d23-94b6-805d1caeff63`

Production tables queried read-only:

- `public.mcp_usage_events`
- `public.search_final_outcomes`

Production trace window:

```text
2026-07-31 09:42:18 UTC through 2026-07-31 09:43:25 UTC
2026-07-31 17:42:18 through 2026-07-31 17:43:25 Asia/Singapore

2026-07-31 16:35:27 UTC through 2026-07-31 16:38:52 UTC
2026-08-01 00:35:27 through 2026-08-01 00:38:52 Asia/Singapore
```

The second reconciliation used `mcp_usage_events`, grouped by redacted identity fields only for trace clustering. That grouping is evidence of temporal similarity, not proof of a shared conversation. A separate read-only query confirmed that the five Luna error rows have raw `library_filter = null`, `library_mode = prefer`, and `error_code = preferred_library_required`.

No database writes, deployments, search changes, dashboard changes, or telemetry changes were made for this investigation.
