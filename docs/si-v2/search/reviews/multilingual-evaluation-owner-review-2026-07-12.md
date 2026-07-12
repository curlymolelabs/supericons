# Multilingual evaluation meaning review

Date: 2026-07-12

Status: awaiting owner meaning approval

Scope: 71 multilingual candidate cases in `data/semantic-search-v2/evaluation-set.json`.

## What the owner is approving

This review asks the owner to approve intended icon meanings and unacceptable results. It does not ask the owner to claim fluency in every language.

Language assurance is recorded separately:

- meaning approval: awaiting owner review;
- language assurance: automated high confidence, not native reviewed; and
- native-language review: not completed.

## Coverage

| locale | cases | assurance note |
| --- | ---: | --- |
| `zh-Hans` | 7 | Includes `OpenAI 标志` and one other mixed-script case. |
| `zh-Hant` | 5 | Includes `資料庫` and one mixed-script case. |
| `ja` | 5 | Includes one mixed-script brand case. |
| `ko` | 5 | Includes one mixed-script brand case. |
| `es` | 7 | Includes one brand-plus-concept case. |
| `pt-BR` | 7 | Brazilian Portuguese only in this suite. |
| `de` | 7 | Includes compounds and one brand-plus-concept case. |
| `ar` | 7 | Native script plus one mixed-script brand case. |
| `hi` | 7 | Native script plus one mixed-script brand case. |
| `th` | 7 | Native script plus one mixed-script brand case. |
| `vi` | 7 | Accented Latin script plus one brand-plus-concept case. |

Total: 71 cases.

## Repeated meaning rules

Sixty cases use these shared meaning rules across the locale groups.

| concept | expected useful families | unacceptable result rule |
| --- | --- | --- |
| Search icon | search, magnifying glass | A video-call or unrelated brand logo cannot be the only top interpretation. |
| Settings gear | settings, gear, cog | Incognito, disguise, or unrelated hardware cannot rank first. |
| Database | database, data storage | A random shape, unrelated brand, or general file icon cannot be the only top interpretation. |
| Upload file | upload, file, upward transfer | Download-only or delete-only icons cannot rank first. |
| Notification bell | bell, notification, alert | Barbells and unrelated alarm meanings cannot rank first. |
| Code editor | code, editor, terminal | An unrelated product logo cannot replace the requested general concept. |
| OpenAI logo | OpenAI identity, brand logo | OpenAI Codex or another AI product identity cannot replace the general OpenAI identity. |

## Mixed brand and concept cases

| case | query | expected useful families | unacceptable result rule |
| --- | --- | --- | --- |
| `multi-mixed-zh-hans-lovable-heart` | `Lovable 爱心图标` | Lovable identity, heart, love | An unrelated glove or another brand cannot lead. |
| `multi-mixed-ja-bolt-lightning` | `Bolt 稲妻アイコン` | Bolt identity, lightning, power | The brand cannot erase the lightning meaning. |
| `multi-mixed-ko-runway-plane` | `Runway 비행기 아이콘` | Runway identity, plane, airport | Fashion-only results cannot erase the plane meaning. |
| `multi-mixed-es-pinecone-tree` | `logo de Pinecone y árbol` | Pinecone identity, tree, nature | Vector-database-only results cannot erase the tree meaning. |
| `multi-mixed-pt-br-opencode-code` | `ícone de código OpenCode` | OpenCode identity, code, source code | Another coding product logo cannot substitute for OpenCode. |
| `multi-mixed-de-cohere-link` | `Cohere Link-Symbol` | Cohere identity, link, connection | Another AI platform cannot replace Cohere. |
| `multi-mixed-ar-grok-understand` | `شعار Grok وفكرة الفهم` | Grok identity, understanding, insight | A generic chat icon alone is insufficient. |
| `multi-mixed-hi-codex-book` | `Codex किताब आइकन` | Codex identity, book, manuscript | Code-only results cannot erase the book meaning. |
| `multi-mixed-th-goose-bird` | `โลโก้ Goose และไอคอนนก` | Goose identity, bird, animal | Another animal or agent brand cannot substitute for Goose. |
| `multi-mixed-vi-temporal-time` | `Temporal biểu tượng thời gian` | Temporal identity, time, clock | Workflow-only results cannot erase the time meaning. |
| `multi-mixed-zh-hant-supericons-search` | `Supericons 搜尋圖示` | Supericons identity, search, icons | Another icon library cannot substitute for Supericons. |

## Evaluation gates after approval

- Exact identity, blocked-alias, and safety cases allow zero failures.
- Each reviewed locale has at least five cases and may fail at most one semantic case.
- At least 90 percent of reviewed multilingual cases must pass overall.
- Native-language review remains visibly incomplete until it happens.

## Decision requested

Reply with:

> Approve multilingual meaning mappings and unacceptable-result rules as recorded. Language assurance remains automated high confidence, not native reviewed.

List any case-specific correction after that sentence.
