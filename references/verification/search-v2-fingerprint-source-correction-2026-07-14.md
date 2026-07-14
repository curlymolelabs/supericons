# Search v2 fingerprint source correction

Date: 2026-07-14
Scope: deterministic 225-case fingerprint source
External systems changed: none

## Outcome

The round-trip reduction did not change the committed deterministic search results. Clean worktrees for parent commit `aad99541b` and implementation commit `8ba345fa9` both produce:

`e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76`

The previously recorded fingerprints came from different combinations of uncommitted taxonomy and generated icon-index files. They are working-tree observations, not committed implementation baselines.

## Reproduced states

| source state | fingerprint | interpretation |
| --- | --- | --- |
| Committed taxonomy and committed icon index | `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76` | Clean committed baseline |
| Modified taxonomy and committed icon index | `564464d5da3416a956ff6d900ee1ccf09f3fa491b2b72e7bff3de75c273e08b2` | Earlier working-tree observation |
| Committed taxonomy and modified icon index | `67458d5a7765535c40cd8f58aeea1884c99c09b33d3c6e323ff4ccff8ddbb3fa` | Isolated generated-index effect |
| Modified taxonomy and modified icon index | `1f142d55c0a959c679c58e9c8af12af8c6e2a826eb6dcefcb974b484640ebc51` | Current working-tree observation during diagnosis |

## Result difference between the two recorded working-tree values

Only one of the 225 cases differs between `564464d5...` and `1f142d55...`:

- Case: `brand-gate-swift`
- Query: `swift`
- Before: `iconoir:dashboard-speed` held rank 4.
- After: the newly generated `si:person-launched` holds rank 4 and `iconoir:dashboard-speed` leaves the top eight.

This is an unrelated catalog addition. It is not caused by the batched candidate RPC or grouped recommendation path. Its search suitability should be reviewed with the catalog work that introduced it.

The modified taxonomy also changes the `si-brand-logo-factory-ai` case relative to the fully committed baseline by placing `si:robot-arm` at rank 2. That difference was already present in the earlier `564464d5...` working-tree observation.

## Root cause

The fingerprint command used files from the active working tree. The repository intentionally contains unrelated uncommitted catalog and taxonomy work, so the hash described that mixed state rather than the manifest-pinned implementation commit.

## Regression protection

- `verify-search-v2-phase1-parity.mjs` now reports its source revision and every dirty tracked search input.
- `verify-search-v2-roundtrip-latency-packet.mjs` creates temporary clean worktrees for the manifest-pinned implementation and its parent.
- The packet gate runs the 225-case verifier in both worktrees and requires both to equal `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76`.
- Temporary worktrees are removed after the check, including on failure.

The authorization manifest is unchanged because it already pins implementation commit `8ba345fa9`, and the allowed external actions are unchanged.
