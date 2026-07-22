# Search v2 incident closure fingerprint review

Date: 2026-07-23

## Scope

This review compares the repaired packaged search engine with the pre-repair baseline at commit `9163250634b6af0f06b1d84752ffe7f049d34150`.

The comparison uses the maintained 225-case semantic evaluation set. Each case records the ordered top eight icon references. A fingerprint change is accepted only after the individual case change is reviewed.

## Results

- Evaluation cases: 225
- Baseline fingerprint: `9627b1054af4feab30787d9341093b897fbd4352f4317a6e5dde977d5611f68c`
- Repaired fingerprint: `c97a3c393dde97441b207fd2d960006c92cb434ba3d1c8edf1988a7875df0e97`
- Repaired fingerprint without locale input: `4ee5e16c9fba0764a33e9f25b65b64c50386037c1226c509d803458e46f937ad`
- Changed cases: 22
- Unreviewed changed cases: 0

## Case-level review

### New relevant results from previously empty searches

| Case | Review |
|---|---|
| Spanish database search | Adds database search, database, and search icons. |
| Portuguese code editor | Adds code, terminal, braces, and code editor icons. |
| Software license document | Adds document and license icons. |
| Dinner plate | Adds dinner and meal icons. |
| Browser base | Returns browser and base-station concepts without returning the blocked Browserbase brand. |
| Open claw | Returns grab and hand-grab concepts without returning the blocked OpenClaw brand. |
| Spanish code editor | Adds code, terminal, braces, and code editor icons. |
| German code editor | Replaces an unrelated brand result with code, terminal, and braces icons. |
| Mixed German Cohere link symbol | Returns link and external-link icons for the requested symbol. |

### Negative-state cleanup

| Case | Review |
|---|---|
| Download file | Removes download-off and save-off icons while preserving download and export choices. |
| Chooser | Removes color-picker-off and keeps chooser and picker choices. |
| Alarm | Replaces alarm-clock-off with alarm-clock-plus. |
| Alert, two maintained cases | Removes an unrelated internal brand icon and adds the direct alert-triangle icon. |
| Phosphor bell strict | Removes slash and disabled bell variants from a positive bell query. |
| Components | Removes components-off while preserving component results. |
| Spanish upload file | Removes attach-file-off and adds upload-file. |
| German upload file | Removes attach-file-off and adds upload-file. |

### Identity and precision improvements

| Case | Review |
|---|---|
| Database search | Keeps the four exact database-search icons first and adds direct database and search alternatives. |
| Factory AI logo | Returns only the exact maintained brand logo instead of adding a generic robot arm. |
| Stagehand | Removes the disabled theater-mask variant while preserving the brand and stage concepts. |

## Production miss replay

The repaired packaged engine was also replayed against the private 94-case production zero-result ledger. Raw production queries remain in the private ledger and are not reproduced here.

- Recovered meaningful cases: 89 of 94
- Recovery rate: 94.68 percent
- All Portuguese, Korean, and Simplified Chinese cases recovered
- The five remaining cases are corrupted or unsupported input, a deliberate nonsense query, and unavailable exact brand identities

The remaining cases are honest no-results. Returning generic icons for them would weaken relevance and violate the no-fabrication contract.

## Decision

The fingerprint change is accepted. Every changed maintained case is a relevance, precision, or negative-state improvement. No changed case was accepted only because it returned more results.
