# Search v2 web preview persistence release

Date: 2026-07-18
Status: published and verified
Environment: production web grid at `https://supericons.dev`

## Outcome

MCP preview links now remain in preview mode after delayed popularity data, locale changes, and authentication updates. The page keeps `view=icons` in the URL while preview mode is active. Users can leave the preview deliberately with the Browse all icons action.

The release changed only the production web grid. It did not publish an npm package, change an npm tag, deploy Railway or Supabase, mutate the database, send invitations, or call a model provider.

## Release identity

| item | verified value |
| --- | --- |
| Manifest SHA-256 | `e6ced9b6a6bb27b49cf22a6521adfb58d5a13a804e74ca9bf20daa078d911d42` |
| Packet commit | `e52f222a00fc2fce27fb52f90814300596bc2779` |
| Source commit | `6200fd495a63a58af6613d53bacda2374da32e51` |
| Artifact files | 188 |
| Artifact size | 40,904,711 bytes |
| Artifact tree SHA-256 | `8a65c6719102494e67eb83cd2f3ab28e2b522f787cfb585f536a1d9874be3359` |
| Netlify site ID | `dcccabac-ae47-4c69-80c4-aefc8c15e2e5` |
| Previous deploy | `6a4c656b9a68bd1909b8ba2c` |
| New deploy | `6a5a62e4382d02608226d0f7` |
| Published at | `2026-07-17T17:14:25.906Z` |
| Release receipt | `published_and_verified` |

## Live behavior verification

The release runner verified the deployed production site before marking the receipt complete:

- explicit icon-list previews survived delayed popularity, locale, and authentication updates;
- query previews survived the same updates;
- unknown icon references returned zero results instead of the full grid;
- a late hosted response could not restore preview mode after the user exited;
- `view=icons` remained in the route until the user exited preview mode;
- the public license and third-party provenance pages were reachable; and
- all three privately bound canaries were present without exposing their identities in source or public verification code.

A fresh read-only Netlify lookup after completion confirmed that the production site was ready on deploy `6a5a62e4382d02608226d0f7`.

## Rollback evidence

No rollback was needed.

Before release, behavioral tests proved that any failure after a deployment attempt calls at most one restore for the exact previous deploy. The tests include a failed production-site read, delayed visibility of the new deploy, live verification failure, restore failure, replay rejection, and a changed-production preflight. Restore or restore-verification failure becomes terminal and cannot be replayed.

The mutation client was bound before the one-use receipt:

- Netlify CLI version `23.15.1`;
- entrypoint SHA-256 `a77868a44c345ca3323c5367aeb508c6170d45f10e3234c58b194c8dac0e624f`; and
- package record SHA-256 `b67a3f109e1f33e70aad16a9427efc2c05c804bbd5680559d56ac0d932928cdf`.

## Remaining work

The opt-in beta invitation may now use the fixed preview links. The web release does not make the website use the local-first MCP search engine. Website search continues to use its existing browser and hosted search path.
