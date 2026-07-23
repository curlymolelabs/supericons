# Search v2 incident closure

Date: 2026-07-23
Status: closed; hosted repair live and npm 0.4.21 published as `latest`

## What failed

Version 0.4.20 routed hosted `search_icons` through a packaged fallback ranker that was not designed to replace the established hosted variant engine. Normal agent-style phrases could therefore return no icons even when an exact useful subphrase existed. The first emergency repair restored hosted retrieval, but a deeper check found hidden local fallback during hosted errors, incorrect route reporting, release checks mixed into normal telemetry, and several weak relevance and localized cases.

## What changed

- Hosted search now requires a successful hosted response. A hosted dependency failure stays visible.
- Local candidate retrieval may run concurrently, but it is accepted only after hosted success. Responses report `hosted`, `hosted_fused`, or `local_fallback` accurately.
- Candidate fusion uses bounded query variants and relevance rules instead of accepting any nonzero result.
- Confirmed English, Spanish, Japanese, and Portuguese gaps received reviewed deterministic coverage.
- Live release traffic uses a signed, time-bounded marker. Only a verified marker is stored as test traffic.
- Local npm search receives the same repair in immutable successor version 0.4.21.

## Verified source and deployment

- Source commits: `9a7deb141a2479d8c92d0ef08c7b82aab2724103` and `b49039f97606e5a1e130c6a15bc7e6c6d6c1ea77`.
- Active Railway deployment: `02d329dc-66dd-4c20-9fa2-937246e24b9d`.
- Active image digest: `sha256:211e4fdc1d32dff5b094b334da340b1c5a394afd96509fceb924c64946ee0384`.
- Live health reports version 0.4.21, hosted-primary search, local-first recommendations, and a closed hosted-search circuit with zero consecutive failures.
- Railway logs contained no application errors after deployment.

## Product verification

The final live matrix passed 28 cases through public HTTP and hosted MCP with identical ordered icon references. Reviewed examples included:

- hard-hat and construction-worker phrases;
- network graphs, connected people, and disconnected links;
- tow trucks, construction cranes, forklifts, and excavation vehicles;
- Spanish construction helmets and node graphs;
- Japanese connected people and sports;
- Portuguese checklists and contacts;
- honest no-results for unsupported brands and nonsense text.

The final post-publication run measured 2,146.2 ms median, 3,686.6 ms p95, and 3,862.9 ms maximum across the 28-case matrix. Six calls exceeded three seconds, and no call exceeded four seconds. The latency remains an observation target, but it did not compromise the verified result contract.

One signed live marker was found in telemetry with environment `test`, version 0.4.21, and the expected controlled-run label. This proves the deployed process verifies the release marker instead of trusting ordinary client text.

The actual configured hosted MCP tool was also exercised after publication. A strict Lucide search for `hard hat construction worker` returned `lucide:hard-hat` first, a strict Phosphor search for Japanese `つながった人々` returned `phosphor:users` first, and `florblequux` returned the structured `no_icons_found` response without image fields.

The live website was exercised in a headed browser against `https://supericons.dev`. It rendered 62 results for `hard hat construction worker`, 8 results for Spanish `casco de construcción`, and 46 results for Japanese `つながった人々`. The Japanese result order began with users, users three, share network, link, and plugs connected. `florblequux` rendered the honest `No icons found` state. The browser made successful calls to `https://mcp.supericons.dev/search-icons` and reported zero console errors and zero console warnings.

## npm publication

- Package: `@supericons/mcp@0.4.21`.
- Archive: `supericons-mcp-0.4.21.tgz`.
- SHA-256: `e63248c2a0b55a08ce1c94bdc54f6d4181e61809dec8b568198fdae2ebc6e4d8`.
- Size: 6,183,637 bytes.
- Packed files: 68.
- Fixed 225-case fingerprint: `4ee5e16c9fba0764a33e9f25b65b64c50386037c1226c509d803458e46f937ad`.
- Clean-installed stdio fingerprint: `c97a3c393dde97441b207fd2d960006c92cb434ba3d1c8edf1988a7875df0e97`.

The owner approved the staged package. The npm registry now serves 0.4.21 as `latest`, while `beta` remains 0.4.19-beta.2. The registry shasum is `75e4092cb930ac13e23056a135a069bb5e5272ec`, and the downloaded registry archive is byte-identical to the approved archive with the same SHA-256 and size.

A fresh registry download and clean install passed package inspection, public-safety and licensing checks, all 225 fixed cases, ordered stdio route parity, MCP error behavior, preview behavior, clarification, and rate-limit propagation. The verified archive contains 68 files and unpacks to 25,832,843 bytes.

## Residual observations

- The npm dependency audit reports two moderate upstream alerts in a Windows static-file path used by a transitive dependency. Supericons does not use that path, and the hosted service runs on Linux. No compatible dependency-only update is currently available, so this is tracked as upstream maintenance rather than an incident blocker.
- Genuine post-repair traffic must be observed before claiming a new organic zero-result rate. Controlled release calls are excluded from that denominator.
- Six of the final 28 HTTP probes exceeded three seconds. Latency remains a monitoring target even though every probe completed in under four seconds.
- The caller-guidance zero-result experiment remains a later maintenance item. It should not mask search regressions that deterministic retrieval can fix directly.

## Rollback and compatibility

Hosted rollback remains an independent Railway redeploy of the previous known deployment. npm rollback remains an independent change of the `latest` tag because published package bytes are immutable. No Netlify deployment or ChatGPT app resubmission was required: both already use the unchanged hosted MCP address, and the browser search data path was not the source of this incident. The submitted ChatGPT app remains under external review, so its directory listing was not directly exercised. Its configured hosted MCP endpoint passed the public HTTP and MCP checks above.
