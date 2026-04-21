# Registry Provider Branding Policy

## Purpose

Keep the public SI Registry portable, source-faithful, and easy for agents to consume without turning every icon record into a branding surface.

## Policy

### 1. Provider identity lives at the registry root

Provider identity for the SI Registry belongs in root-level summary and documentation surfaces, not inside every icon record.

Approved root-level fields:

- `provider.name`
- `provider.namespace`
- `provider.homepage`

These fields may appear in:

- generated registry summaries
- public registry summaries
- MCP public registry summaries
- documentation pages that describe the registry

### 2. Third-party icon records stay source-focused

Records for upstream libraries such as `heroicons`, `lucide`, `material`, `mingcute`, `phosphor`, `simpleicons`, and `tabler` should describe:

- the icon
- the source library
- the semantic meaning
- safe usage guidance

They should not carry repeated Supericons branding fields such as:

- `provider`
- `providerName`
- `providerNamespace`
- `providerHomepage`
- `registryNamespace`

### 3. Native SI records may use the `si:` namespace

When a record is truly native to Supericons, it may use:

- `source_library: "si"`
- `icon_id` values beginning with `si:`

That is provenance, not marketing. The namespace is allowed for actual SI-owned records and should not be copied into third-party records.

### 4. Third-party records must not borrow the SI namespace

If a record comes from a third-party source library, it must not:

- use `source_library: "si"`
- use an `icon_id` that starts with `si:`

This preserves clean provenance and avoids namespace drift.

## Why This Policy Exists

- It keeps public records smaller and easier for agents to parse.
- It avoids mixing distribution branding with upstream icon provenance.
- It matches common registry patterns where provider identity lives at the package or registry root, not inside every item.
- It keeps future SI-native icons possible without polluting third-party records.

## Enforcement

The registry projection verifier must check that:

- public summaries include the provider metadata
- public records do not include repeated provider branding fields
- third-party public records do not use the `si:` namespace
- site and MCP public registry summaries stay aligned
