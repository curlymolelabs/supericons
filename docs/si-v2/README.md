# SI v2 documentation

Everything for the SI v2 program (the stepping stones toward the Living Map) lives in this folder. Nothing here touches the production site; integration happens ring by ring with explicit approval.

## Read in this order

1. [PRD-si-v2-blueprint.md](PRD-si-v2-blueprint.md) · the blueprint: rings, deliverables, acceptance criteria, concern register, metrics, gates
2. [v2-living-map-vision.md](v2-living-map-vision.md) · the north-star vision (living programmatic icons: face, soul, hands, pulse, wallet)
3. [supericon-schema-v1.md](supericon-schema-v1.md) · the universal record structure, field by field, with public/gated/internal tiers
4. [design-record-schema-v1-proposal.md](design-record-schema-v1-proposal.md) · lessons from the pilot and the rationale behind the schema

5. [search/search-engine-v2.md](search/search-engine-v2.md) - the current v2 search requirements and acceptance gates
6. [search/decisions.md](search/decisions.md) - the append-only record of settled search choices
7. [search/implementation-status.md](search/implementation-status.md) - phase status, artifacts, verification, deployment, and live-observation evidence

For consolidation review only: [search/consolidation-traceability.md](search/consolidation-traceability.md) maps every named requirement, phase, and open question from the four superseded search plans. [PRD-si-v2-search-engine.md](PRD-si-v2-search-engine.md) is retained as historical input and is no longer authoritative.

## Related artifacts elsewhere in the repo

Working code and data (Ring 0, live):
- `lib/si-registry/design-record-shape.js` · design-record validator v0
- `data/si-registry/source/design/agent-pulse-pilot.json` · the 4 pilot records
- `scripts/verify-design-records.mjs` · validation runner

Mockups (design sources of truth, in `/mockups`):
- `si-pack-2-shape-study.html` · record-driven icon workflow (shape gates in action)
- `si-pack-2-agent-pulse.html` · pack 2 asset directions
- `si-schema-orb-listening.html` · the SI record surface: edit tools, tier split, community
- `v2-d-living-map.html` · living map canvas concept
- `zorb-blast-icons.html` · first external commission template
