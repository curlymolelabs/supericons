# Supericons MCP

Requires Node.js 20 or newer.

Supericons MCP gives coding agents multilingual icon search, recommendations,
previews, and export tools.

## Run

```bash
npx -y @supericons/mcp
```

## What the package records

The package records pseudonymous usage so Supericons can improve icon search.
Each search event can include:

- the normalized search term and number of results
- the tool, icon library filter, package version, and search timing
- the MCP client name and version
- the operating system platform
- a pseudonymous installation identifier
- a country code derived from the network connection, when available

Supericons telemetry records do not store raw IP addresses, raw installation
identifiers, your name, files, project, repository, or code. Supabase
infrastructure processes network information and may retain request metadata
according to its platform logging policy.

The installation identifier is a random value created by the package. It is
not derived from the computer, account, or network. Supericons converts it to
a server-keyed hash before storage. The hash is retained for up to 90 days.

The local identifier is stored at:

- Windows: `%APPDATA%\Supericons\install.json`
- macOS: `~/Library/Application Support/Supericons/install.json`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/supericons/install.json`

`SUPERICONS_CONFIG_DIR` can set a different configuration directory. Deleting
`install.json` changes the identifier used for future events. Earlier
pseudonymous records remain until their retention period ends.

Telemetry is best-effort and does not block or change icon search. To turn it
off, set any one of:

```text
SUPERICONS_DISABLE_TELEMETRY=1
SUPERICONS_TELEMETRY=off
SUPERICONS_MCP_TELEMETRY_ENABLED=off
DO_NOT_TRACK=1
```

Icon search keeps working when telemetry is disabled.
