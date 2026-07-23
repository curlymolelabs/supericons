# Search v2 incident closure

Date: 2026-07-23
Status: closed; hosted MCP, public web search, and npm 0.4.22 are live

## What failed

Version 0.4.20 routed hosted `search_icons` through a packaged fallback ranker that was not designed to replace the established hosted variant engine. Normal agent-style phrases could return no icons even when an exact useful subphrase existed. The first emergency repair restored hosted retrieval, but deeper checks found hidden local fallback during hosted errors, incorrect route reporting, release checks mixed into normal telemetry, weak relevance cases, and incomplete multilingual phrase coverage.

The public website appeared healthier because it used its own query variants. A later browser check also found that its production build still called the retired Supabase search endpoint instead of the repaired Railway endpoint. The npm package was a separate immutable artifact, so the complete multilingual correction required version 0.4.22.

## What changed

- Hosted search now requires a successful hosted response. A hosted dependency failure stays visible.
- Local candidate retrieval may run concurrently, but it is accepted only after hosted success. Responses report `hosted`, `hosted_fused`, or `local_fallback` accurately.
- Candidate fusion uses bounded query variants and relevance rules instead of accepting any nonzero result.
- Locale normalization accepts maintained base and regional tags, including `pt-BR`, `zh-CN`, and `zh-TW`.
- Search uses real language word segmentation instead of assuming that every language separates words like English.
- Direct phrase coverage and verification now include all 11 maintained non-English locales: Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, Portuguese, German, Arabic, Hindi, Vietnamese, and Thai.
- Live release traffic uses a signed, time-bounded marker. Only a verified marker is stored as test traffic.
- The public website now calls `https://mcp.supericons.dev/search-icons`.
- Local npm search contains the same multilingual correction in version 0.4.22.

## Verified source and deployments

- Multilingual parity source commit: `b20bb8f3a`.
- Integrated incident branch head used for the final package checks: `1585bfa9f`.
- Active Railway deployment: `77976dd0-2147-4bb5-bc01-e0b9896cffb6`.
- Active Railway image digest: `sha256:d66f7aa1421c79ddae9294327b749536dfc7c08ddee8c3ad0d8891af47603b59`.
- Live health reports version 0.4.22, hosted-primary search, local-first recommendations, and closed search circuits with zero consecutive failures.
- Active Netlify deploy: `6a61dbbb3cfc0470a11de105`.
- The Netlify production environment sets `VITE_SUPERICONS_SEARCH_ENGINE_URL` to `https://mcp.supericons.dev/search-icons`.
- The public MCP address remains `https://mcp.supericons.dev/mcp`.

## Hosted MCP product verification

The signed live product gate passed 39 cases through public HTTP and hosted MCP. Both surfaces returned identical ordered icon references. The matrix includes:

- hard-hat and construction-worker phrases;
- network graphs, connected people, disconnected links, tow trucks, cranes, forklifts, and excavation vehicles;
- strict and preferred library behavior;
- honest no-results for unsupported and nonsense queries;
- direct phrases in all 11 maintained non-English locales.

Each maintained locale returned ten results for its reviewed direct search phrase, with `material:search` first. The hosted checks used the signed test marker so they do not enter organic traffic measurements.

Observed live latency varied by call, with some requests above three seconds. Correctness passed, but latency remains a monitoring target.

## Public website verification

A headed browser smoke test exercised all 11 maintained non-English locales on `https://supericons.dev`:

- Simplified Chinese: `搜索图标`
- Traditional Chinese: `搜尋圖示`
- Japanese: `検索アイコン`
- Korean: `검색 아이콘`
- Spanish: `icono de búsqueda`
- Portuguese: `ícone de busca`
- German: `Suchsymbol`
- Arabic: `رمز البحث`
- Hindi: `खोज आइकन`
- Vietnamese: `biểu tượng tìm kiếm`
- Thai: `ไอคอนค้นหา`

Every query returned results with search icons among the first five displayed results. Browser network inspection confirmed HTTP 200 responses from `https://mcp.supericons.dev/search-icons`. The browser reported zero console errors and zero console warnings.

## npm publication

- Package: `@supericons/mcp@0.4.22`
- Registry tag: `latest`
- Archive: `supericons-mcp-0.4.22.tgz`
- Size: 6,185,012 bytes
- Packed files: 68
- npm shasum: `7483202b5c63b03eedbe640c5df142d799bb155d`
- SHA-256: `00fcb48522951da59956456f65115059e2a0805cb5dad674ac9e2e40b0a3d6a9`
- Fixed 225-case fingerprint: `3ec9fae16fbd1c6900d1bdf4ed4f48270d7e4baec0e6d26783aa54821f6f7d24`
- Clean-installed stdio fingerprint: `5bc36ea9693c4461508a3a9ce9855e3bf46e7cdccc6e48fcdeca8146c9a5b711`

The registry now serves 0.4.22 as `latest`, while `beta` remains 0.4.19-beta.2. A fresh registry download is byte-identical to the approved archive. A clean installation from that downloaded registry archive passed all 225 maintained stdio cases with ordered result parity.

The maintained multilingual package matrix passed 71 of 75 cases, or 94.67 percent. The remaining four cases are honest mixed-brand no-results. They return no fabricated icons and remain visible for future demand-led coverage work.

## Channel compatibility

No hosted client configuration changed. ChatGPT, Codex, OpenCode, and other hosted MCP clients continue to use the same MCP address. The incident changes did not alter the registered tool names or tool schemas. Therefore, the hosted correction and website correction do not require another app submission or client reconfiguration.

Local npm users receive the fix when their package resolution reaches 0.4.22. Users pinned to an older exact version must update that pin.

## Residual observations

- Genuine post-repair traffic must be observed before claiming a new organic zero-result rate. Controlled release calls are excluded from that denominator.
- Live latency still varies and remains a monitoring target.
- Four maintained mixed-brand package cases remain honest no-results.
- The caller-guidance zero-result experiment remains a later maintenance item. It must not mask search regressions that deterministic retrieval can fix directly.

## Rollback

Hosted rollback remains an independent Railway redeploy of the previous known deployment. npm rollback remains an independent change of the `latest` tag because published package bytes are immutable. Netlify rollback remains an independent restoration of its previous production deploy.
