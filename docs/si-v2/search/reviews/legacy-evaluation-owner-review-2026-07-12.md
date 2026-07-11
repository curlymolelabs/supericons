# Search v2 legacy evaluation owner review

Date: 2026-07-12

Status: awaiting owner decision

Authority: review packet only. The approved results must be recorded in `data/semantic-search-v2/evaluation-set.json` before they count toward a release gate.

## Decision requested

Review the 28 inherited cases below. The quickest response is:

> Approve all recommendations except Lxx: [change]

`Approve` means the useful families, avoid families, exact result, and gap classification are suitable regression expectations. `Adjust` means keep the case but change its expectation. `Replace` means the current query is not a valid fixture.

## Recommended approval set

These 19 cases are clear enough to approve as written.

| ID | group | search or recommendation slot | expected useful result | avoid or exact rule | recommendation |
| --- | --- | --- | --- | --- | --- |
| L01 | Exact brand | `xai` | xAI, x.ai, Grok | Exact `si:x-ai` rank 1 | Approve |
| L02 | Exact brand | `x.ai logo` | xAI, x.ai, Grok | Exact `si:x-ai` rank 1 | Approve |
| L03 | Exact brand | `grok ai logo` | xAI, x.ai, Grok | Exact `si:x-ai` rank 1 | Approve |
| L04 | Exact brand | `openai codex` | Codex, OpenAI Codex, coding agent | Exact `si:openai-codex-app` rank 1 | Approve |
| L05 | Exact brand | `lovable` | Lovable, AI app builder | Exact `si:lovable` rank 1 | Approve |
| L06 | Exact brand | `base44` | Base44, AI app builder | Exact `si:base44` rank 1 | Approve |
| L07 | Exact brand | `kickbacks ai` | Kickbacks, affiliate, creator monetization | Exact `si:kickbacks-ai` rank 1 | Approve |
| L14 | Common UI | `settings` | settings, cog, sliders | None | Approve |
| L15 | Common UI | `user profile` | user, profile, person, account | None | Approve |
| L16 | Common UI | `download file` | download, file, arrow down | None | Approve |
| L17 | Common UI | `database search` | database, search, data | None | Approve |
| L18 | Common UI | `warning alert` | warning, alert, triangle | None | Approve |
| L21 | Spanish | `buscar icono de base de datos` | database, data, search | Real Spanish query | Approve |
| L23 | Meaning separation | `software license document` | license, document, certificate, file | Avoid license plate, car scan, traffic camera | Approve |
| L24 | Meaning separation | `dinner plate` | plate, food, restaurant, dish | Avoid license plate, vehicle scan, OCR | Approve |
| L25 | Meaning separation | `legal permit` | document, license, certificate, file | Avoid car, vehicle, traffic camera | Approve |
| L26 | Recommendation | Task: AI app builder landing page. Slot: AI app builder logo | Base44, Bolt, Lovable, app builder | Use task context | Approve |
| L27 | Recommendation | Task: vehicle security dashboard. Slot: license plate recognition | scan, camera, vehicle, OCR | Use task context | Approve |
| L28 | Recommendation | Task: health intake form. Slot: neck pain | person, body, pain, accessibility | Use task context | Approve |

## Recommended adjustments

These six cases are useful, but their expectations should be sharpened before approval.

| ID | query | current proposal | recommended adjustment | recommendation |
| --- | --- | --- | --- | --- |
| L08 | `license plate` | scan, camera, vehicle, car, OCR; new-icon gap | Add `license plate` as the preferred direct family. Keep the broader families as related fallbacks and keep legal-license, document, dinner-plate, and food exclusions. Keep `new_icon_gap` only when no direct license-plate icon exists. | Adjust |
| L09 | `license plate recognition camera scan car` | scan, camera, vehicle, car, OCR, traffic camera; new-icon gap | Prefer license-plate scan, traffic camera, OCR, camera, and vehicle. Treat a generic car alone as related, not sufficient. | Adjust |
| L10 | `cursor ai code editor logo` | code editor, terminal, Codex, Trae, OpenCode; library gap | Add Cursor identity as the preferred family. Use code editor as fallback and keep barcode excluded. Do not treat another product logo as an exact substitute. | Adjust |
| L11 | `vercel v0 ai app builder logo` | v0, Vercel, app builder, Base44, Bolt, Lovable; library gap | Prefer v0 and Vercel identity. Treat other app builders as related alternatives, not identity matches. | Adjust |
| L12 | `neck pain person` | person, body, pain, accessibility, activity; new-icon gap | Prefer neck, body pain, and person-in-pain families. Generic activity or person alone is only a related fallback. | Adjust |
| L13 | `dream interpretation moon star eye mystical` | moon, star, eye, sparkles, mystical; new-icon gap | Keep the families, but require at least one dream or mystical signal in the top results so unrelated moon or star icons do not pass by themselves. | Adjust |

## Recommended replacements

These three entries describe a translation in English rather than containing the native query a user would type. They should not become approved multilingual fixtures in their present form.

| ID | current query | locale | replacement rule | recommendation |
| --- | --- | --- | --- | --- |
| L19 | `Chinese query meaning license plate recognition` | `zh-Hans` | Replace with an owner-approved Simplified Chinese query drawn from the public dictionary ground truth. Preserve scan, camera, vehicle, and OCR as proposed useful families. | Replace |
| L20 | `Japanese query meaning scan camera` | `ja` | Replace with an owner-approved Japanese query drawn from the public dictionary ground truth. Preserve scan and camera as proposed useful families. | Replace |
| L22 | `Portuguese query meaning code editor icon` | `pt` | Replace with an owner-approved Portuguese query and record whether it is Brazilian Portuguese or another locale. Preserve code, editor, and terminal as proposed useful families. | Replace |

## Effect of approval

If all recommendations are approved:

- 19 cases can be marked owner-reviewed without content changes;
- 6 cases need adjusted expectations before being marked owner-reviewed;
- 3 placeholder queries need native-language replacements; and
- the fixed suite remains 72 cases until replacements or additional cases are added.

Approval does not deploy search, select an embedding model, or change ranking by itself.
