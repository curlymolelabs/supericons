# Material emergency mcp-search rollback

Date: 2026-07-15

Status: Owner authorized. Preflight complete. Deployment pending.

## Incident

Production `mcp-search` version 37 returns HTTP 500 `search_service_unavailable` for normal Lucide strict, all-library, Material outline, and Material solid requests. Packet 5S is blocked.

## Authorized rollback

Redeploy only `mcp-search` from the verified pre-Material source checkpoint `02b2c22ea8a76decee92d83c853ca6cf33899e6c`, keep `verify_jwt=false`, then run Lucide strict, all-mode, and legacy Material probes. No database, migration, storage, Railway, npm, beta, or other function change is authorized.

## Pinned state

- Authorized active version: 37
- Authorized active bundle SHA-256: `3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01`
- Target source revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Recorded version 36 bundle SHA-256: `3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5`
- Target surface: 13 files from the retained successful version 36 deployment transcript
- Target surface aggregate SHA-256: `1ed6085d7610a89231e02751d3545b0552bc578cf7d5144733d5240863f444e6`
- Deno check: passed from the isolated target worktree
- Rollback fingerprint: `351707fca47f090f601e1d9864b5a51b4663f908c051a9d126c01ae8a3b831d9`

## Target surface hashes

| File | Normalized SHA-256 |
| --- | --- |
| `supabase/functions/mcp-search/index.ts` | `1431d9ee81e6475e98306b31f516b986162fc8149c52d55036f94022986667bd` |
| `supabase/functions/_shared/search-engine/handle-search-request.ts` | `e074a122b5d0de9973ea0209106da48f07bf74f6633a75968740544a301c1622` |
| `lib/search-query-frame.js` | `7278bed98ba2b4baae2c06b28f55320eb7a3dc8140d389aa4832734523a3c249` |
| `lib/generated-search-intent-graph.js` | `de417e0722021fce6a1a8bc12ceb62c4903473cd581478957a0413b6a7674c90` |
| `lib/search-intent-core.js` | `9e90b860024214bfc5adc1c5e0b36a0cf1bb223ff093083a9eb5df7034011c5c` |
| `lib/generated-search-intent-rules.js` | `876c6f2ed69580e32e5059d422961761d8d31cd9dc05bc99d9a048e6131e39ef` |
| `supabase/functions/_shared/search-engine/types.ts` | `5035ce460228219bec7796ebd46266b7fa4137a0d3bcfcd12fc2b3b4c13e3f41` |
| `supabase/functions/_shared/search-engine/rate-limit.ts` | `9f9707af508d2f3a1456a8d4cc2b097f5d629fd5fe7b127403681cd5009851e3` |
| `supabase/functions/_shared/search-engine/rank.ts` | `51e340739693219255e1fc0918cc5affcf470a41c90930be474d8d0b31eb253d` |
| `lib/hosted-search-core.js` | `f6b6230d837940fea95dd9a5bb25ba772e365f26059a11ef46443baeb9b23225` |
| `lib/cjk-search-core.js` | `9b2d0935e2f5f060aabb215a261e33f695e886f3e9e03eb67faae7d538fb1a3e` |
| `supabase/functions/_shared/search-engine/normalize.ts` | `27e5601d37195fe14c5a1da6e58e85e28480e80afe1e94ba42b551a0f96e491d` |
| `supabase/functions/_shared/search-engine/catalog.ts` | `265eeea824895ac4bb81b8b0d607dbef43db9e3c2578972e01b40e97458faabc` |

## Fingerprinted text

The fingerprint is SHA-256 over this exact UTF-8 text with LF line endings and one trailing LF:

```text
packet=material_emergency_mcp_search_rollback
authorized_active_version=37
authorized_active_bundle_sha256=3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01
target_source_revision=02b2c22ea8a76decee92d83c853ca6cf33899e6c
target_recorded_v36_bundle_sha256=3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5
target_surface_module_count=13
target_surface_aggregate_sha256=1ed6085d7610a89231e02751d3545b0552bc578cf7d5144733d5240863f444e6
project_ref=kcjmkakdhsqplvasgkjv
function_name=mcp-search
verify_jwt=false
deployments_authorized=1
postdeploy_probes=lucide_strict,all_mode,legacy_material
migration_change_authorized=false
database_change_authorized=false
storage_change_authorized=false
railway_deploy_authorized=false
npm_publication_authorized=false
beta_change_authorized=false
other_function_change_authorized=false
```

## Stop conditions

Stop before deployment if the active version, active bundle hash, target revision, target surface hash, clean-worktree state, Deno check, or JWT setting differs. After deployment, stop if Lucide strict or all-mode does not return HTTP 200 with results, or if legacy Material behavior differs from the pre-Material state.
