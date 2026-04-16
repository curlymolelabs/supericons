# Troubleshooting Page - Copywriting Quality Audit (Refined)

Date: 2026-04-14
Status: Audit (Refined)
Scope: Comprehensive copywriting quality review of the docs-troubleshooting page against best practice standards

Source files reviewed:
- docs-pages.js lines 1854-1955
- docs/plans/troubleshooting-docs-copy-refinement-implementation-plan.md

Standards applied:
- Microsoft Writing Style Guide (action-first, second person, no jargon)
- Google Developer Documentation Style Guide (present tense, active voice)
- Nielsen Norman Group UX writing principles (scannability, symptom-led, progressive disclosure)
- Technical communication standards (parallelism, one idea per sentence, complete sentence pairs)

---

## Overall Assessment

This is a strong first pass. The four-section structure, config table, wording rules, and routing links are all correct. The page is real and useful.

Under best practice scrutiny, 10 issues surface. Three are high severity because they affect the user's ability to scan and act under frustration. The rest are medium or low and are sentence-level fixes.

---

## Findings

### F1. Summary field is descriptive, not action-oriented (Medium - Meta)

Line: 1858

```
summary: 'Common problems with MCP setup, access and API keys, Motion Lab, and Converter.'
```

Best practice for page summaries used in search and navigation is to lead with a verb so the user understands what the page helps them *do*, not just what it is *about*. The current summary reads as a noun list.

**Fix:**
```
summary: 'Fix common problems with MCP setup, API keys, Motion Lab, and Converter.'
```

---

### F2. Intro heading assumes confirmed failure rather than inviting a scan (High - Tone/Framing)

Line: 1861

```
Find the part that is failing
```

This heading presupposes the user already knows something is broken. A user who is uncertain ("is this a bug or am I doing something wrong?") may not recognize themselves in that framing. The plan says the intro should "define the scope of the page." A scope-defining heading invites navigation without assuming the user's emotional state.

Additionally the intro body says "where the workflow stopped" which is passive and oblique. It should address the user directly.

**Fix (heading):**
```
Find your symptom
```

**Fix (body):**
```
This page covers common problems with MCP setup, API keys, Motion Lab, and Converter.
Start with the section that matches where things stopped working, then follow the next step there.
```

The split into two sentences is deliberate: one defines scope, one gives the navigation instruction. The plan requires both.

---

### F3. "Server does not appear after adding" card omits Cursor (Accuracy - High)

Line: 1869

```
Type /mcp in Claude Code or the Codex TUI to list active servers.
```

The card references Claude Code and Codex but omits Cursor, which is the third supported client. Cursor does not have a `/mcp` command - its MCP server list appears in the MCP settings panel in the sidebar. A Cursor user reading this card gets no useful verification step.

**Fix:** Make the check client-aware:

```
In Claude Code or Codex, type /mcp in the chat interface to list active servers. In Cursor,
open MCP settings in the sidebar and confirm Supericons appears there. If it is not listed,
restart the client. Then confirm your config file is in the correct location for your client
and scope.
```

---

### F4. "Wrong config file location" heading is a diagnosis, not a symptom (Medium - Heading pattern)

Line: 1872

```
Wrong config file location
```

Every other heading on the page is written from the user's perspective - something they observe or experience. "Wrong config file location" is a conclusion the user may not have reached yet. It breaks the symptom-led pattern.

The symptom a user would actually see is: they added the server but it is not appearing. The card body then helps them discover the config file is in the wrong place. The heading should reflect the observed state.

**Fix:**
```
Config was added but the server still does not appear
```

Or if it must stay distinct from the first card:
```
Not sure which config file to edit
```

---

### F5. "Wrong config file location" body - "the client session that should read it" is awkward (Low - Clarity)

Line: 1873

```
restart the client session that should read it
```

"The client session that should read it" is unnecessarily indirect. The user knows which client they are working in.

**Fix:**
```
move it, save the file, and restart the client.
```

---

### F6. "Access features are not available" card is six ideas in one prose paragraph (High - Scannability)

Line: 1902

```
Confirm four things. You are using an API key from the correct Supericons account.
SUPERICONS_API_KEY is present in the server env block. The client was restarted after
editing the config. Your account access matches what you want to use. Bought packs unlock
the premium icons in those packs. Motion Lab and Converter are part of the Supericons Pro plan.
```

Three problems here:

**Problem A:** The paragraph says "Confirm four things" but then lists six sentences. The count is wrong.

**Problem B:** The four checks are buried in prose. Under frustration, a user cannot quickly confirm each item without re-reading. The plan explicitly calls for scannability.

**Problem C:** The last two sentences ("Bought packs unlock..." and "Motion Lab and Converter are part of...") are not checks. They are access model explanations that already live in the linking paragraph below and in the third card of this section (L1910). Their presence here creates redundancy with both.

**Fix:** Convert to a numbered checklist. Remove the access model explanation. Let the linking paragraph below carry it.

```html
<h3>Access features are not available</h3>
<p>Confirm all four:</p>
<ol>
  <li>You are using an API key from the correct Supericons account.</li>
  <li><code>SUPERICONS_API_KEY</code> is present in the server <code>env</code> block.</li>
  <li>You restarted the client after editing the config.</li>
  <li>Your account has the access you are trying to use.</li>
</ol>
```

Using a numbered list (not bulleted) signals that each item is a sequential check, which matches how a user would work through a failure diagnosis.

---

### F7. "API key is invalid or revoked" body has an unnecessary preamble sentence (Medium - Action-first)

Line: 1906

```
An invalid or revoked key returns authentication errors from any feature that needs account access.
Generate a new key under API Keys, update your config, and restart the client session.
```

The first sentence explains what an invalid key does. The user already knows something is wrong - that is why they are here. The best practice for recovery steps is to lead with the action, not the diagnosis. The diagnostic information ("returns authentication errors") adds no recovery value.

"restart the client session" also uses "session" unnecessarily. "Restart the client" is tighter.

**Fix:**
```
Generate a new key under API Keys, update your config, and restart the client.
```

---

### F8. "Premium icons appear but a tool is still locked" opens with "That usually means" (Medium - Voice)

Line: 1910

```
That usually means your account has icon access but not the Supericons Pro plan.
```

"That usually means" is hedged and conversational. For a troubleshooting page, users need certainty about the diagnosis. "Usually" implies exceptions but gives no guidance on what the exceptions are. The page should either state the cause confidently or name the exception.

The second and third sentences in this card also partially repeat the linking paragraph below (L1913).

**Fix:**
```
Your account has icon access from a purchased pack, but does not have the Supericons Pro plan.
Motion Lab and Converter are separate features in the plan. See Pricing to add it.
```

---

### F9. Motion Lab access error card has the steps in the wrong order (Medium - Logic sequence)

Line: 1920

```
Motion Lab is part of the Supericons Pro plan. Confirm your API key is present in your config,
restart the client after changes, and make sure the same account has the plan.
```

The steps mix two distinct checks: the API key config check and the account plan check. They are listed together without sequencing, and the account check is buried at the end as "make sure the same account has the plan." This ordering hides the more likely fix (wrong or missing key) behind the access explanation.

Best practice: resolve the most common cause first, least common last. Missing API key is more likely than missing plan (if the user is already using Motion Lab partially). "Make sure the same account has the plan" also uses "make sure" which is vaguer than "confirm."

**Fix:**
```
Motion Lab is part of the Supericons Pro plan. Confirm two things: your API key is present in
the server env block, and the Supericons account that key belongs to has the plan. Restart the
client after any config change.
```

---

### F10. Routing paragraph for Motion Lab uses "Exports" as a standalone link label (Low - Link text)

Line: 1931

```
See Motion Lab and Exports.
```

"Exports" as a standalone link label is ambiguous. A user scanning the page cannot tell from the link text whether "Exports" refers to the Motion Lab export guide, the Converter exports, or something else. Link text should be self-describing even when read out of context (WCAG 2.4.4, also a Nielsen Norman best practice).

**Fix:**
```
See Motion Lab and Motion Lab Exports.
```

---

### F11. "SVG-to-PNG output is wrong size" card covers only the undersize case (Medium - Completeness)

Lines: 1945-1946

The heading says "wrong size" which implies both too small and too large. The body only addresses the too-small case:

```
If the PNG is smaller than expected, increase targetWidth.
```

A user with an oversized output gets no guidance. The heading promises "wrong size" but the recovery only covers one direction.

**Fix option A:** Narrow the heading to match the body:
```
SVG-to-PNG output is smaller than expected
```

**Fix option B:** Add the oversized case to the body:
```
The targetWidth parameter sets the output pixel width. Height scales proportionally from the
SVG viewBox. If the PNG is too small, increase targetWidth. If it is larger than you need,
reduce it. Larger files are not automatically better quality.
```

Option B is preferred because it gives the user complete guidance for the stated symptom.

---

### F12. "Which traceClass should I use?" heading breaks the symptom pattern (Low - Heading consistency)

Line: 1941

```
Which traceClass should I use?
```

Every other heading is a symptom statement in third person or second person. This one uses first person ("I") as a question. The inconsistency breaks the scan pattern and could cause the user to miss it during a fast scan.

**Fix:**
```
Not sure which traceClass to use
```

---

### F13. Routing paragraphs use inconsistent link verb ("Use" vs "See") across sections (Low - Parallelism)

Lines: 1895, 1913, 1931, 1949

Each section ends with a routing paragraph. Three of them say "See [link]" or open with "Need the client-specific...? Use..." but Section 4 (Converter, L1949) says "Use Converter for workflow help" where the other sections say "See [link] for...".

The word "Use" implies the user is being told to operate the tool, not navigate to a docs page. "See" or "Open" is the correct verb for a link to documentation.

**Fix (L1949):**
```
For the full converter guidance, see Converter for workflow help and Converter Settings
for parameter detail.
```

Also apply consistent "For [need], see [link]" framing across all four routing paragraphs to remove the question opener pattern ("Need the...?") which is rhetorical rather than direct.

---

### F14. Fallback callout body is redundant with its own heading (Low - Redundancy)

Lines: 1952-1953

Heading: `Your problem is still not listed`
Body: `If the issue does not match anything on this page, visit supericons.dev or email hello@supericons.dev.`

The body restates the heading's meaning before giving the action. A user who read the heading already knows their problem is not listed. The body should skip straight to the action.

**Fix:**
```
Visit supericons.dev or email hello@supericons.dev.
```

---

## Verification Checklist (Against Plan)

| Criterion from plan | Status |
|---|---|
| 1. `docs-troubleshooting` is no longer a placeholder | PASS |
| 2. Intro explains what the page covers and how to get more help | PARTIAL FAIL - F2: body addresses "where the workflow stopped" not "where things stopped working for you"; contact path is in the fallback, not the intro |
| 3. Page organized into MCP setup, Access and API keys, Motion Lab, Converter | PASS |
| 4. Each issue phrased as a user-visible symptom | PARTIAL FAIL - F4: "Wrong config file location" is a diagnosis; F12: "Which traceClass should I use?" is a question |
| 5. Each issue gives a concrete recovery step | PARTIAL FAIL - F6: four checks embedded in prose hard to scan; F11: "wrong size" card covers only undersize |
| 6. Config path table matches client setup pages | PASS |
| 7. Access wording matches API Keys and Pro and Collections pages | PASS |
| 8. Page links to the correct deeper docs and product pages | PARTIAL FAIL - F10: "Exports" link label is ambiguous |
| 9. `npm run build` passes | PASS |

---

## Wording Rule Compliance Check

| Rule | Status |
|---|---|
| No `entitlement` | PASS |
| No `premium tools` | PASS |
| No bare `Pro` | PASS |
| No `paid plan` | PASS |
| No `linked to` | PASS |
| `Supericons Pro plan` uses `appLink` on requirement mentions | PASS |
| Account is source of truth, key identifies account | PASS |
| Bought packs unlock icon access, not tools | PASS |

---

## Summary

| # | Finding | Severity | Line(s) |
|---|---|---|---|
| F1 | Summary field is descriptive, not action-oriented | Medium | 1858 |
| F2 | Intro heading assumes confirmed failure; body is not in second person | High | 1861-1862 |
| F3 | Server check card omits Cursor verification step | High | 1869 |
| F4 | "Wrong config file location" heading is a diagnosis, not a symptom | Medium | 1872 |
| F5 | "The client session that should read it" is awkward and indirect | Low | 1873 |
| F6 | Access card has six ideas in prose with a wrong count and embedded redundancy | High | 1902 |
| F7 | API key card leads with diagnosis before action | Medium | 1906 |
| F8 | "That usually means" weakens the diagnosis with unwarranted hedging | Medium | 1910 |
| F9 | Motion Lab access card mixes and misordering two distinct checks | Medium | 1920 |
| F10 | "Exports" link label is ambiguous out of context | Low | 1931 |
| F11 | "Wrong size" card covers only undersize case; oversized case unaddressed | Medium | 1945-1946 |
| F12 | "Which traceClass should I use?" breaks the symptom-statement heading pattern | Low | 1941 |
| F13 | "Use" vs "See" inconsistency across routing paragraphs | Low | 1895, 1913, 1931, 1949 |
| F14 | Fallback callout body restates the heading before giving the action | Low | 1952-1953 |

---

## Recommended Fix Priority

### Batch 1 - Fix before next review (High severity)
- F2: Reframe intro heading and body
- F3: Add Cursor verification to server check card
- F6: Convert access card to numbered checklist, remove the wrong count, remove embedded redundancy

### Batch 2 - Polish pass (Medium severity, sentence-level)
- F7: Lead the API key card with the action
- F8: Replace "That usually means" with a direct statement
- F9: Reorder Motion Lab access error checks
- F11: Cover both size directions or narrow the heading
- F4: Reframe config file location heading as a symptom
- F1: Add a verb to the summary field

### Batch 3 - Style consistency (Low severity)
- F5: "the client session that should read it" -> "the client"
- F10: "Exports" -> "Motion Lab Exports"
- F12: "Which traceClass should I use?" -> "Not sure which traceClass to use"
- F13: Normalize routing paragraph verb from "Use" to "See"
- F14: Remove the redundant preamble from the fallback callout body
