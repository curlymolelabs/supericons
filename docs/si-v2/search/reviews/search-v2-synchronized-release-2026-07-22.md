# Search v2 synchronized release

Date: 2026-07-22
Status: Railway and web released; npm waiting for registry login

## Release identity

- Source revision: `5a701234a9dfac2ea1145d4b3221c03ed1bbf43e`
- Stable version: `0.4.19`
- Railway deployment: `94e801e0-abeb-4738-9897-00da2471e245`
- Railway rollback source: `49581b67612ccc797123425125ab42bd8c5832fb`
- Railway prior deployment: `ff667522-5e54-426d-b737-04a415e0b59e`
- Netlify deployment: `6a5fa79b7d04082d57641c1f`
- Netlify rollback deployment: `6a5d3d4c1967b6dadfb1104d`
- Protected web tree SHA-256: `3819ab7b3d82293b06acc8eb61919f8303172794de2582a39550ad10823616bb`
- Protected npm archive SHA-256: `4f885b38ad5742f7f6234a9cfcd27beab4b33cf6cd9e60cc766aabed688352e9`
- npm shasum: `3ad1938a46ef124e7caaa4081924e40bd2071db6`

## Verified release behavior

The fixed 225-case package suite passed from a clean install of the exact protected archive. The approved ranking fingerprint remains `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`, and the all-locale MCP route fingerprint is `533a3ec66a9c81523c7e572ac21c45ca07d086d55f53938ac08b9ca84032c2e9`.

Railway health reports version 0.4.19 with local-first search and recommendations. Live public English and Japanese search returned the approved top results. Hosted MCP search returned `material:dropdown` in 287.6 ms. The maintained 20-slot online-store recommendation resolved all slots in 700.8 ms with local-first execution and zero hosted search calls.

The public website calls the Railway `/search-icons` endpoint for English and Japanese input and renders the returned icon IDs from its existing public bundle. The live browser produced no console errors. Remote keyless copy, MCP client tabs, license, provenance, and private release-marker checks passed.

VC-3 and VC-4 checks passed on the exact protected npm and web artifacts. Hosted daily allowance enforcement remains off under `D-030`.

## npm remaining step

Publication did not occur. `npm whoami` returned 401 before the publish request, and npm rejected the upload without creating version 0.4.19 or changing a tag. The registry remains `latest` 0.4.17 and `beta` 0.4.19-beta.2.

After a successful `npm login`, publish only the prepared `supericons-mcp-0.4.19.tgz` archive with `latest`. Then verify version, shasum, integrity, tag identity, and a clean registry install. If the public package fails its gate, restore `latest` to 0.4.17.

## Residual observation

The remote preview persistence browser verifier did not finish within its bounded run. The same unchanged preview path passed against the exact local web artifact, and the release did not modify preview-state code. This is recorded as a browser-verifier operability issue rather than a Search v2 product failure.
