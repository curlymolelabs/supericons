# Search v2 beta.1 publication boundary

Date: 2026-07-17

Manifest SHA-256: `79b497cadca0df5bdfb428aef9fa320b6f04322d58b99dc6f7b12a8adfe827d4`

Package: `@supericons/mcp@0.4.19-beta.1`

Tag: `beta`

## What this release changes

- Adds clear package terms and third-party icon notices.
- Adds private-record-bound copying-detection markers to the staged npm engine data.
- Minifies three generated engine modules in the staged package while keeping maintained source readable.
- Enforces VC-3 and VC-4 checks for staged npm and web artifacts.
- Keeps the same approved local-first result order across all 150 eligible cases.
- Starts a new beta evidence window for these promotable bytes.

## Public actions

This is an npm-only prerelease boundary. No Railway, Supabase, database, or web deployment is authorized.

The bounded flow may:

1. Upload the exact package archive once as a private npm staged package.
2. Ask the owner to approve that exact stage with the npm browser security key.
3. Publish `@supericons/mcp@0.4.19-beta.1` once under the `beta` tag.
4. Verify the public archive, integrity, tags, complete upstream license texts, exact source provenance, canaries, Material styles, and all 150 local-first cases.
5. Deprecate only `0.4.19-beta.1` if post-publication verification fails.

The flow must keep npm `latest` at `0.4.17`.

## Actions outside this boundary

This release does not authorize:

- a hosted MCP or Supabase function deployment
- a database change
- a web deployment
- a stable hosted comparison
- an npm `latest` change
- a production load test
- a monitoring activation
- an automated public message
- a scheduled warm ping
- a model-provider call

## Evidence window

The beta.1 window starts with its first verified eligible organic request. Organic owner, executor, auditor, and external beta-user activity counts when cohort-labeled. Scripted suites do not count.

Closeout requires at least 200 organic attempts and three complete green days. Session count is reported but is not a gate. A later package release starts a new evidence window, and a fixed issue does not erase the failed interval that preceded it.

## Rollback

Before publication, any failed check stops without a public registry mutation. After publication, a failed integrity, tag, license, canary, or installed-package check deprecates only `0.4.19-beta.1` and confirms that npm `latest` stayed unchanged. If packet verification or npm authentication fails after browser approval, the exact manifest-bound release may use only the deprecation recovery path. That recovery cannot publish or change npm `latest`.

The staging and finalization records are single-use and stored under the current Windows account. Do not delete or bypass them.
