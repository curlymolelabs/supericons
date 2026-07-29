# Search v2 assessment checklist recall repair

Date: 2026-07-30

## Scope

This repair addresses one confirmed search gap:

```text
assessment checklist quality assurance
library: lucide
library mode: strict
limit: 5
```

The source baseline was commit `186f27405aad3f574eece86ab67efa9eb81e3f90`.

No production service, package tag, database, or public site was changed while preparing this evidence.

## Verified cause

The Lucide catalog already contained strong matches:

- `lucide:list-check`
- `lucide:list-checks`
- `lucide:clipboard-check`
- `lucide:clipboard-list`
- `lucide:file-check`
- `lucide:file-check-2`
- `lucide:file-check-corner`
- `lucide:shield-check`
- `lucide:badge-check`

Before this repair, the target query and four related phrases did not activate a reviewed checklist intent. Strict Lucide returned zero results for:

- `assessment checklist quality assurance`
- `quality assurance checklist`
- `assessment checklist`
- `QA checklist`
- `audit checklist`

`inspection checklist` returned only `lucide:inspection-panel`.

This was an intent activation gap, not a missing-icon gap.

## Repair

The repair adds a narrow `quality_assurance_checklist` intent group for five reviewed phrases:

- `quality assurance checklist`
- `assessment checklist`
- `qa checklist`
- `inspection checklist`
- `audit checklist`

It also adds the same exact phrase family to the existing manual compound-intent seam used by the protected hosted engine. The hosted candidate plan now receives the reviewed retrieval variants:

- `list check`
- `list checks`
- `clipboard check`
- `clipboard list`
- `file check`

The repair does not add a standalone `checklist` trigger. Shopping checklist queries therefore keep their existing shopping intent.

The browser equivalence verifier was tightened so every assertion waits for the hosted response belonging to the same query. Its hosted-error fixture now covers both supported hosted endpoint configurations.

## Focused results

The exact strict Lucide query now returns:

1. `lucide:list-check`
2. `lucide:list-checks`
3. `lucide:clipboard-check`
4. `lucide:clipboard-list`
5. `lucide:file-check`

The same reviewed family is returned for all five related checklist phrases.

Negative controls remain distinct:

- `call quality` returns `lucide:phone-call`.
- `shopping checklist` keeps shopping and package results.
- `shopping list checklist` keeps shopping and list results.
- `florblequux checklistless` remains an honest zero.

## Verification

The following checks passed on the changed source:

| Check | Result |
|---|---|
| Focused checklist corpus | 12 of 12 passed |
| Search intent graph | 71 groups and 27 fixtures passed |
| Search intent dictionary | Passed |
| Search intent expansion | Passed |
| Surface decision corpus | 35 cases passed |
| Built browser decision corpus | 35 cases passed |
| Deterministic search suite | 225 of 225 passed |
| Deterministic fingerprint | `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`, unchanged from baseline |
| Hosted route repair | Passed |
| Hosted route integrity | Passed |
| Hosted HTTP response parity | 5 control, 5 treatment, and 5 batched cases passed |
| Grouped recommendation behavior | Passed |
| Local semantic latency | p95 420.7 ms, below the 500 ms gate |
| Browser hosted-error behavior | Hosted failure remained visible, with zero local results exposed |

The paired public and package copies are byte-identical:

- `lib/search-intent-core.js`
- `mcp/runtime/search-intent-core.js`

The paired generated graph copies are also byte-identical:

- `lib/generated-search-intent-graph.js`
- `mcp/runtime/generated-search-intent-graph.js`

## Inherited unrelated failure

`verify-semantic-search-v2.mjs` fails on `si:wok#negative#en: content should be meaningful`.

The exact baseline commit fails on the same assertion. The checklist repair does not change the Wok icon or the semantic-document generator. This inherited failure is not treated as evidence for or against the checklist repair.

## Release boundary

This source repair still requires:

1. Focused independent review of the changed intent seams and fixtures.
2. Integration into a clean release source.
3. Exact npm, website, Railway, and hosted search artifacts built from that source.
4. Verification of those exact artifacts before any publication or deployment.
