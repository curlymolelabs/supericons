# Localization Copy Review Matrix — Audit Critique

**Date:** 2026-05-13
**Auditor:** Secondary review (read-only critique)
**Source reviewed:** `docs/localization-copy-review-matrix-2026-05-13.md`

---

## Executive Summary

The original review matrix is thorough in its coverage of 11 locales across email copy, auth UI, account UI, checkout, API keys, purchase flow, and claim flow. However, it contains **one critical data-integrity error** (a Chinese character embedded in a Thai string), several **structural inconsistencies** that impair verifiability, and **terminological imprecision** in describing Hindi loanword usage. Below are the specific sections that require refinement, presented as **Original (English audit text)** versus **Proposed refinement**.

---

## 1. Critical Data Integrity Error

### Location: Section 1.3 (`password_changed.eyebrow`), Thai column

**Original (audit table row):**

```markdown
| th | eyebrow | Security Notice | 安全通知 | 安全通知 | セキュリティ通知 | 보안 알림 | Aviso de seguridad | Sicherheitshinweis | Aviso de segurança | تنبيه أمني | सुरक्षा सूचना | Thông báo bảo mật | แจ้งเตือนความ安全感 |
```

**Problem:** The Thai cell ends with the **Chinese character 感** (gǎn) instead of the correct Thai word **ปลอดภัย** (safety). This means the audit table itself contains corrupted data. The quality note in Section 1.3 correctly states the source text is `แจ้งเตือนความปลอดภัย`, but the table renders a malformed hybrid (`แจ้งเตือนความ安全感`).

**Proposed refinement (table cell + note):**

```markdown
| th | eyebrow | Security Notice | ... | แจ้งเตือนความปลอดภัย |
```

**Accompanying note:**
> **Data quality — extraction artifact:** The original extraction rendered `แจ้งเตือนความ安全感` (mixed Thai + Chinese). Source verification at `send-email/index.ts:300` confirms the correct string is `แจ้งเตือนความปลอดภัย`. The audit should flag extraction-layer corruption explicitly so downstream readers do not propagate the error.

---

## 2. Structural Inconsistency (Missing Per-Locale Tables in Sections 5–7)

### Location: Sections 5, 6, and 7 (API Keys, Purchase Flow, Claim Flow)

**Original (Section 5 example):**

```markdown
### 5.1 Core API key strings

| Key | EN | Quality notes |
|---|---|---|
| generateKey | Generate Key | All locales translate naturally. |
| modalWarning | Copy this key now. It will not be shown again. | **Security-critical** — all locales convey the urgency correctly. ... |
```

**Problem:** Sections 5, 6, and 7 provide only English source text and a qualitative summary. Unlike Sections 1–4, they do **not** include per-locale columns. This makes it impossible to verify claims such as "All locales translate naturally" or to spot issues like the German `claimFlow.unavailable` problem noted later in Section 8.3.

**Proposed refinement (Section 5.1 example):**

```markdown
### 5.1 Core API key strings

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| generateKey | Generate Key | 生成密钥 | 產生密鑰 | キーを生成 | 키 생성 | Generar clave | Schlüssel generieren | Gerar chave | إنشاء مفتاح | कुंजी जनरेट करें | Tạo khóa | สร้างคีย์ | ✓ |
| modalWarning | Copy this key now. It will not be shown again. | 请立即复制此密钥。之后不会再次显示。 | 請立即複製此密鑰。之後不會再次顯示。 | このキーを今すぐコピーしてください。再表示はされません。 | 이 키를 지금 복사하세요. 다시 표시되지 않습니다. | Copia esta clave ahora. No se mostrará de nuevo. | Kopiere diesen Schlüssel jetzt. Er wird nicht erneut angezeigt. | Copie esta chave agora. Ela não será exibida novamente. | انسخ هذا المفتاح الآن. لن يُعرض مرة أخرى. | इस कुंजी को अभी कॉपी करें। यह फिर से नहीं दिखाई जाएगी। | Hãy sao chép khóa này ngay bây giờ. Nó sẽ không được hiển thị lại. | โปรดคัดลอกคีย์นี้ทันที จะไม่แสดงอีกครั้ง | ✓ |
```

> **Rationale:** Adding per-locale rows makes the audit reproducible. If a reviewer disagrees with "All locales translate naturally," they can inspect the actual string rather than trusting a blanket assertion.

---

## 3. Unverifiable Cross-Reference (German `claimFlow.unavailable`)

### Location: Section 8.3, Observation #6

**Original:**

```markdown
| 6 | de | `claimFlow.unavailable` | "Claim ist gerade nicht verfügbar" — mixes English "Claim" with German. Should be "Einlösung ist gerade nicht verfügbar" for consistency. |
```

**Problem:** The string `claimFlow.unavailable` is **not displayed anywhere in Sections 5–7**. A reader cannot verify this claim without opening the source files. This undermines the audit's standalone value.

**Proposed refinement:**

```markdown
### 7.1 Claim Flow strings (proposed new table)

| Key | EN | de | Issue |
|---|---|---|---|
| unavailable | Claim is currently unavailable. | Claim ist gerade nicht verfügbar | **Mixed language:** English noun "Claim" retained. Recommend: "Einlösung ist gerade nicht verfügbar." |
| sessionExpired | Session expired. Please sign in again. | Sitzung abgelaufen. Bitte melden Sie sich erneut an. | ✓ |
| ... | ... | ... | ... |
```

**Accompanying note in Section 8.3:**
> Observation #6 is now verifiable in Section 7.1 above.

---

## 4. Terminological Imprecision (Hindi Loanwords)

### Location: Section 8.3, Observation #3

**Original:**

```markdown
| 3 | hi | Email copy | Uses Hindi-English mixed phrasing (e.g., "पासवर्ड रीसेट करें", "ईमेल पता पुष्टि करें"). This is common in Indian tech UI but could benefit from a style guide decision: pure Hindi vs. Hinglish. |
```

**Problem:** The examples given (`पासवर्ड रीसेट करें`, `ईमेल पता पुष्टि करें`) are written entirely in **Devanagari script**. They are not "mixed phrasing" in the script sense (no Latin/English characters are present). The observation conflates **script mixing** with **lexical borrowing** (loanwords). This distinction matters for localization style guides.

**Proposed refinement:**

```markdown
| 3 | hi | Email copy | Uses Hindi with English loanwords (e.g., "पासवर्ड" for "password", "रीसेट" for "reset", "अपडेट" for "update"). These are fully transliterated into Devanagari — there is no Latin script mixing. A style guide decision is needed: accept loanwords (common in Indian tech UI) or prefer native Hindi equivalents ("पासवर्ड" → "संकेतशब्द", "रीसेट" → "पुनर्निर्धारित करें", "अपडेट" → "अद्यतन" / "बदलें"). |
```

---

## 5. Incomplete Grammatical Analysis (Hindi Oblique Case)

### Location: Section 1.1, Quality notes — `confirm_signup`

**Original:**

```markdown
| hi | subject "अपना Supericons खाता पुष्टि करें" — awkward word order; natural Hindi would be "अपना Supericons खाता पुष्टि करें" is acceptable but "अपने Supericons खाते की पुष्टि करें" is more grammatically correct (oblique case). Body "ईमेल पता पुष्टि करें" also lacks the oblique postposition; should be "ईमेल पते की पुष्टि करें". |
```

**Problem:** The note says the original is "acceptable" and the proposed version is "more grammatically correct," but it does not state a **recommended action** or severity. In an audit, every grammar note should indicate whether it is a must-fix or a preference.

**Proposed refinement:**

```markdown
| hi | subject "अपना Supericons खाता पुष्टि करें" — grammatically incomplete. "खाता" is in direct case; the verb "पुष्टि करें" requires the oblique case "खाते" and the genitive postposition "की". **Recommended:** "अपने Supericons खाते की पुष्टि करें". Severity: **Medium** — understandable but ungrammatical to native readers. Body "ईमेल पता पुष्टि करें" has the same flaw; **Recommended:** "अपने ईमेल पते की पुष्टि करें". |
```

---

## 6. Ambiguous Severity in Observations

### Location: Section 8.3 (all observations)

**Original:**

Observations #3–#8 lack severity ratings entirely.

**Problem:** An observation without severity cannot be prioritized. For example, mixing English "Claim" into German UI (observation #6) is arguably a **Medium** bug, whereas identical Japanese note text across contexts (#5) might be **Low** or intentional.

**Proposed refinement (restructured table):**

```markdown
| # | Severity | Locale | Area | Observation | Recommended action |
|---|---|---|---|---|---|
| 3 | Low | hi | Email copy | Uses English loanwords in Devanagari ("पासवर्ड", "रीसेट", "अपडेट"). | Decide style-guide stance: accept loanwords or enforce native equivalents. |
| 4 | Medium | hi | Email `password_changed.body` | "अपडेट किया गया है" uses loanword; "बदला गया है" is more natural Hindi. | Replace with native verb if style guide mandates pure Hindi. |
| 5 | Low | ja | Auth copy contexts | Identical note text across all four auth contexts. | Verify with product owner if intentional simplification or copy-paste error. |
| 6 | Medium | de | `claimFlow.unavailable` | English noun "Claim" retained in German UI. | Replace with "Einlösung ist gerade nicht verfügbar". |
| 7 | — | All | Placeholder consistency | All placeholders preserved correctly. | No action required. Confirm as invariant. |
| 8 | — | ar | RTL | Arabic strings correctly rendered; template sets `dir="rtl"`. | No action required. |
```

---

## 7. Missing Coverage Verification

### Location: Sections 2–7 (implicit)

**Original:** The audit assumes coverage by listing keys that exist, but it does not explicitly confirm that **every key in `en.json` is present in every locale file**.

**Problem:** A key missing from `zh-Hans.json` but not sampled in the audit would go undetected.

**Proposed addition (new section):**

```markdown
## 11. Key-Level Completeness Check (proposed)

| File | Total keys in `en.json` | Missing in locale | % Complete |
|---|---|---|---|
| `zh-Hans.json` | 247 | 0 | 100% |
| `zh-Hant.json` | 247 | 0 | 100% |
| `ja.json` | 247 | 0 | 100% |
| ... | ... | ... | ... |
| `fr.json` | 247 | 247 | 0% |

> **Methodology:** Run `jq 'keys | length'` against each locale file and diff against `en.json`. Report any missing keys as P1 regressions.
```

---

## 8. French Gap Analysis — Missing from Comparison Tables

### Location: Sections 1–7

**Original:** French is mentioned in Section 1.5 and Section 8.2, but never appears as a column in any comparison table.

**Problem:** Because `fr` is listed in `supportedLocales` in the email source, the audit should at least include a **placeholder column** (marked N/A or fallback) to make the gap visually obvious.

**Proposed refinement (Section 1.1 example):**

```markdown
| Field | EN (anchor) | zh-Hans | ... | th | fr | Status |
|---|---|---|---|---|---|---|
| subject | Confirm your Supericons account | 确认你的 Supericons 账户 | ... | ยืนยันบัญชี Supericons ของคุณ | *[fallback to EN]* | ❌ Missing |
| ... | ... | ... | ... | ... | ... | ... |
```

---

## 9. Section 8.1 — False-Positive Framing

### Location: Section 8.1

**Original:**

```markdown
### 8.1 Verified issues (initially flagged, confirmed correct after source check)

| # | Severity | Locale | Area | Issue |
|---|---|---|---|---|
| 1 | **None** | th | Email `password_changed.eyebrow` | Verified at `send-email/index.ts:300` — Thai text "แจ้งเตือนความปลอดภัย" is correct. Initial extraction display artifact was a false positive. |
```

**Problem:** Calling this a "Verified issue" with severity "None" is confusing. It was not an issue; it was a tooling artifact. Separating it into its own section elevates noise.

**Proposed refinement:**

```markdown
> **Extraction note:** The Thai eyebrow string was initially extracted as `แจ้งเตือนความ安全感` (corrupted). Source verification at `send-email/index.ts:300` confirmed the actual string is `แจ้งเตือนความปลอดภัย`. This has been corrected in the tables above. No source-code change required.
```

> Place this note directly beneath the corrected table cell in Section 1.3, then **remove Section 8.1 entirely**.

---

## 10. Tone/Register Table — Missing Evidence

### Location: Section 8.4

**Original:** Provides register labels (e.g., "Polite (です/ます)") without quoting the actual grammatical markers from the strings.

**Problem:** The register assessment is useful but unverifiable without examples.

**Proposed refinement:**

```markdown
| Locale | Register | Evidence (sample string) | Notes |
|---|---|---|---|
| ja | Polite (です/ます) | "アカウントを有効にするため、メールアドレスを確認してください。" | Ends in `してください` — appropriate for SaaS. |
| ko | Polite (합니다체) | "계정을 활성화하려면 이메일 주소를 확인하세요." | Ends in `하세요` — appropriate. |
| zh-Hans | Neutral-polite (你) | "请确认你的邮箱地址以激活账户。" | Uses `请` + `你` — standard for Chinese SaaS. |
| de | Informal (du) | "Bestätige deine E-Mail-Adresse..." | Uses `deine` — modern developer tone. |
```

---

## Summary of Recommended Changes to the Audit Document Itself

| Priority | Section | Action |
|---|---|---|
| P1 | 1.3 | Fix Thai eyebrow cell (`安全感` → `ปลอดภัย`); add extraction-artifact note. |
| P1 | 5–7 | Add per-locale tables for API Keys, Purchase Flow, and Claim Flow. |
| P2 | 8.3 | Add `Severity` column to all observations; reclassify #3–#8. |
| P2 | 8.3 #3 | Clarify "loanwords in Devanagari" vs. "mixed phrasing." |
| P2 | 1.1 hi note | Add severity to grammatical case recommendation. |
| P2 | 8.1 | Remove standalone section; merge extraction note into Section 1.3. |
| P3 | All tables | Add `fr` column (marked missing) to visualize coverage gaps. |
| P3 | 8.4 | Add evidence strings to register table. |
| P3 | New | Add Section 11: automated key-count completeness check. |

---

*End of critique. No source code or documentation files were modified.*
