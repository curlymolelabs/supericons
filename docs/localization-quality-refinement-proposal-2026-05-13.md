# Localization Quality Refinement Proposal

**Date:** 2026-05-13
**Scope:** Auth emails plus UI messages in `data/i18n/messages/*.json`.
**English anchor:** `data/i18n/messages/en.json` and English auth email copy in `supabase/functions/send-email/index.ts`.
**Reference matrix:** `docs/localization-copy-review-matrix-2026-05-13.md`.

## Audit Method

- Checked key completeness against English: 647 UI message keys in each non-English locale file.
- Checked placeholder preservation for UI and email strings.
- Scanned for mojibake, damaged placeholders, and suspicious untranslated English.
- Reviewed high-risk copy areas: auth, account, API keys, purchase, claim, pricing, legal/privacy, docs chrome, and auth emails.
- Treated product names and technical identifiers as intentionally untranslated when appropriate: Supericons, MCP, API, Pro, Motion Lab, Converter, SVG, PNG, CSS, Google, Stripe, Claude Code, Codex, Cursor, and URLs.

## Summary

No structural localization break was found in the current message catalogs. The main issue is quality polish, not coverage. The safest refinements are concentrated in:

- Hindi auth emails: grammar and oblique-case alignment.
- German claim-flow UI: mixed English `Claim` terminology.
- German API key helper copy: `Free MCP` reads like leftover English.
- Chinese auth confirmation email: make the email-specific CTA more precise.
- Portuguese auth email copy: add missing `do Supericons` relationship in account references.
- Spanish password-changed email: make `{email}` placement clearer.

Legal, privacy, and pricing copy should not be heavily rewritten in this pass because legal meaning matters more than style. No legal-policy source change is recommended here.

## Proposed Source Refinements

### Auth Email Copy

Source file: `supabase/functions/send-email/index.ts`

| Priority | Locale | Intent | Field | Current | Refined | Rationale |
|---|---|---|---|---|---|---|
| P2 | zh-Hans | confirm_signup | title | 确认你的邮箱 | 确认你的邮箱地址 | More precise for an email verification action. |
| P2 | zh-Hans | confirm_signup | body | 欢迎使用 Supericons。请确认你的邮箱地址以激活账户。 | 欢迎使用 Supericons。请确认你的邮箱地址来激活账户。 | Slightly more natural Simplified Chinese. |
| P2 | zh-Hans | confirm_signup | cta | 确认账户 | 确认邮箱 | CTA matches actual action: email confirmation, not broad account management. |
| P2 | zh-Hans | confirm_signup | fallback | 如果按钮无法打开，请复制此链接并粘贴到浏览器中： | 如果按钮无法使用，请复制此链接并粘贴到浏览器中： | More natural for an email button that may not work. |
| P2 | zh-Hant | confirm_signup | title | 確認你的電子郵件 | 確認你的電子郵件地址 | More precise for email verification. |
| P2 | zh-Hant | confirm_signup | body | 歡迎使用 Supericons。請確認你的電子郵件地址以啟用帳戶。 | 歡迎使用 Supericons。請確認你的電子郵件地址來啟用帳戶。 | Slightly more natural Traditional Chinese. |
| P2 | zh-Hant | confirm_signup | cta | 確認帳戶 | 確認電子郵件 | CTA matches actual action. |
| P2 | zh-Hant | confirm_signup | fallback | 如果按鈕無法開啟，請複製此連結並貼到瀏覽器中： | 如果按鈕無法使用，請複製此連結並貼到瀏覽器中： | More natural for email-button fallback. |
| P1 | hi | confirm_signup | subject | अपना Supericons खाता पुष्टि करें | अपने Supericons खाते की पुष्टि करें | Fixes Hindi oblique case and genitive postposition. |
| P1 | hi | confirm_signup | title | अपना ईमेल पुष्टि करें | अपने ईमेल पते की पुष्टि करें | Fixes grammar and makes the object explicit. |
| P1 | hi | confirm_signup | body | Supericons में आपका स्वागत है। अपना खाता सक्रिय करने के लिए ईमेल पता पुष्टि करें। | Supericons में आपका स्वागत है। अपना खाता सक्रिय करने के लिए अपने ईमेल पते की पुष्टि करें। | Fixes oblique case and reads naturally. |
| P1 | hi | confirm_signup | cta | खाता पुष्टि करें | खाते की पुष्टि करें | Fixes object/postposition grammar. |
| P2 | hi | reset_password | eyebrow | पासवर्ड रिकवरी | पासवर्ड पुनर्प्राप्ति | Reduces unnecessary English loanword while keeping common `पासवर्ड`. |
| P1 | hi | password_changed | body | यह पुष्टि है कि आपके Supericons खाते {email} का पासवर्ड अभी अपडेट किया गया है। | यह पुष्टि करता है कि आपके Supericons खाते {email} का पासवर्ड अभी बदला गया है। | More natural Hindi for a password-change notice. |
| P2 | es | password_changed | body | Esto confirma que la contraseña de tu cuenta de Supericons {email} acaba de actualizarse. | Esto confirma que la contraseña de tu cuenta de Supericons ({email}) se actualizó recientemente. | Places the email address clearly and avoids awkward account/email attachment. |
| P2 | pt | confirm_signup | subject | Confirme sua conta Supericons | Confirme sua conta do Supericons | More natural Brazilian Portuguese account phrasing. |
| P2 | pt | reset_password | body | Recebemos uma solicitação para redefinir a senha da sua conta Supericons. Use o link seguro abaixo para escolher uma nova senha. | Recebemos uma solicitação para redefinir a senha da sua conta do Supericons. Use o link seguro abaixo para escolher uma nova senha. | Matches natural Portuguese `conta do Supericons`. |
| P2 | pt | password_changed | body | Esta mensagem confirma que a senha da sua conta Supericons {email} acabou de ser atualizada. | Esta mensagem confirma que a senha da sua conta do Supericons ({email}) acabou de ser alterada. | Clearer email placement and more natural password-change verb. |

### UI Message Copy

Source file: `data/i18n/messages/de.json`

| Priority | Key | Current | Refined | Rationale |
|---|---|---|---|---|
| P2 | `apiKeys.setup.free` | Free MCP funktioniert ohne Schlüssel. | Der kostenlose MCP-Zugang funktioniert ohne Schlüssel. | Removes leftover English adjective and clarifies the feature. |
| P2 | `purchaseFlow.proMonthlyDescription` | Dein erster Pro-Claim ist bereit. Wähle unten eine Premium-Sammlung und löse sie jetzt ein. | Deine erste Pro-Einlösung ist bereit. Wähle unten eine Premium-Sammlung und löse sie jetzt ein. | Aligns with existing `Einlösen` terminology. |
| P2 | `claimFlow.proClaim` | Dies verwendet deinen aktiven Pro-Claim. | Dies verwendet deine aktive Pro-Einlösung. | Removes English noun `Claim`. |
| P2 | `claimFlow.checking` | Claim-Zugriff wird geprüft... | Einlösezugriff wird geprüft... | Aligns with redemption wording. |
| P2 | `claimFlow.unavailable` | Claim ist gerade nicht verfügbar. | Einlösung ist gerade nicht verfügbar. | Removes English noun `Claim`. |
| P2 | `claimFlow.nextAvailable` | Nächster Claim verfügbar am {date}. | Nächste Einlösung verfügbar am {date}. | Preserves `{date}` and aligns terminology. |

## Deferred Items

| Area | Reason deferred |
|---|---|
| Japanese repeated auth notes | The repeated note text is understandable and may be intentional product simplification. Changing it could alter UX intent without a strong quality gain. |
| Legal/privacy HTML | No verified mistranslation was found. Legal copy should only be changed with legal/product approval. |
| Arabic RTL copy | Source structure already sets RTL direction for Arabic email rendering; no safe wording change was identified. |
| Product/tool names in docs | Names such as Motion Lab, Converter, Claude Code, Codex, Cursor, SVG, PNG, MCP, and API should remain stable for documentation and code examples. |

## Verification Plan

After applying the accepted refinements:

1. Run `npm run verify:i18n-catalogs`.
2. Run `npm run verify:auth-email-localization-contract`.
3. Run `npm run verify:send-email-render-output`.
4. Run `npm run verify:auth-error-localization`.
5. Run `npm run verify:commercial-localization`.
6. Run `npm run verify:packs-localization`.
7. Run `npm run build`.

## Expected Safety Constraints

- Preserve every placeholder exactly: `{email}`, `{date}`, and other braces must remain intact.
- Do not change JSON keys or object structure.
- Do not change Supabase function behavior, secrets, auth flow, redirects, or email delivery logic.
- Do not translate brand names, tool IDs, code identifiers, URLs, or environment variable names.
- Only source strings listed above should be changed in this pass.
