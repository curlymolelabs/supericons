# Search v2 round-trip latency preparation

Date: 2026-07-14
State: prepared locally, awaiting owner approval
Manifest fingerprint: `d0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8`

## Prepared scope

- Implementation commit: `8ba345fa9`
- Additive migration: `20260714120000`
- Migration SHA-256: `f965c0b354a8d2e31be8791ac5b2041838be6bc8a2b40a97735f90d27f81cded`
- Measurement runner SHA-256: `bba4cf618fc5c6b01bd162492790bb67495e4a9942d37905b4a790d6fbbe3a11`
- Isolated endpoints: `mcp-search-v2-control` and `mcp-search-v2-treatment`
- Maximum isolated function deployments: 2
- Production function deployments: 0
- npm publications: 0
- Model-provider calls: 0

## Local proof

The controlling local proof is [`search-v2-roundtrip-reduction-local-2026-07-14.md`](search-v2-roundtrip-reduction-local-2026-07-14.md). It records disposable PostgreSQL parity and rollback, exact HTTP response parity, grouped recommendation result parity, synchronous audit behavior, rate-limit cost, safe timing fields, and the no-model-call gate.

Clean worktrees for parent commit `aad99541b` and implementation commit `8ba345fa9` both produce the 225-case fingerprint `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76`. The fingerprint source correction is recorded in [`search-v2-fingerprint-source-correction-2026-07-14.md`](search-v2-fingerprint-source-correction-2026-07-14.md). Formal packet verification now checks the two committed trees instead of using unrelated working-tree catalog changes.

The authorization packet adds no runtime behavior. It binds the exact implementation, migration, measurement runner, endpoints, request counts, standard audit rows, stop rules, publication limits, and rollback actions for owner review.

## Current external state

This preparation did not apply migration `20260714120000`, deploy either isolated endpoint, deploy a production function, publish npm, or call a model provider. A fresh read-only production baseline is required immediately before any approved execution.
