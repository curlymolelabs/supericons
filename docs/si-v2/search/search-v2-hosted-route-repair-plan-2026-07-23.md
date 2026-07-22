# Search v2 hosted route repair plan

Date: 2026-07-23

## Outcome

Repair the existing hosted MCP search route without changing the public MCP URL, the ChatGPT plugin configuration, or the npm package version. Hosted `search_icons` must recover normal multiword agent queries while preserving honest no-results and the current reviewed meaning and multilingual coverage.

This repair does not publish npm. The npm registry does not allow replacing the bytes of an existing version. Local npm repair is a separate follow-up if the hosted repair proves the design.

## Verified failure

The current Railway local-first route sends ordinary `search_icons` calls to the packaged local fallback ranker. That ranker is intentionally described in its source as a fallback, not the production ranking engine. It returns zero for ordinary multiword phrases that the established hosted variant engine can answer.

Verified live failures include:

- `hard hat construction worker` in Lucide
- `network proximity graph nodes` in Phosphor
- `tow truck` across all libraries
- `verification audit shield check` in Lucide

Verified exact subphrases and the older hosted route return relevant icons for these concepts. The web app masks the defect because it keeps local browser results when the Railway response is empty.

## Repair design

1. Separate `search_icons` routing from `recommend_icons` routing.
2. Use the established hosted variant search as the primary engine for `search_icons` and the public Railway `/search-icons` endpoint.
3. Use the packaged local engine only after the hosted engine returns a valid no-result. Hosted dependency errors remain visible and are not relabeled as search misses.
4. Keep the current local-first recommendation path unchanged.
5. Preserve strict, prefer, and all library behavior.
6. Preserve the honest no-result response for unsupported brands and nonsense.
7. Record `hosted` or `local_fallback` as the route that answered the request in existing runtime telemetry.

This is deliberately a small route repair. It restores the proven multiword retrieval path and avoids introducing a new ranking system during an incident.

## Product acceptance gate

The release is blocked unless all of these pass against the exact candidate:

### Required relevant results

- `hard hat construction worker`, Lucide: includes `lucide:hard-hat`
- `tow truck`, all libraries: includes a truck or towing icon
- `network proximity graph nodes`, Phosphor: includes graph or network icons
- `connection two people together care relationship`, Phosphor: includes connection, people, relationship, or care icons
- `verification audit shield check`, Lucide: includes `lucide:shield-check`
- `forklift warehouse logistics`, all libraries: includes a forklift icon
- `crane hook construction`, all libraries: includes a crane or construction icon
- `sports`, all libraries: includes sports icons
- `amazing`, all libraries: includes reviewed delight icons
- real Japanese `スポーツ` with locale `ja`: includes sports icons
- Spanish `deportes` with locale `es`: includes sports icons

### Forbidden irrelevant results

- People and relationship queries must not be led by Wi-Fi icons.
- Forklift queries must not be led by Git, cutlery, or unrelated developer icons.
- Fortress queries must not be led by minus, layout, or alignment controls.
- Crane construction queries must not be led by fish-hook icons.
- The prior construction-worker result set must not be led by palette, magic-wand, star, or calendar-star icons.

### Honest no-results

- A clearly missing brand in strict brand-library mode returns no result.
- `florblequux` returns no result.
- No-result responses contain no fabricated icon or image fields.

### Surface and release checks

- Hosted MCP and public Railway search return equivalent icon references for the same request.
- Real Unicode code points are asserted in fixtures, not console-rendered lookalikes.
- Existing 225-case parity, library-mode, multilingual, error, preview, and recommendation gates remain green.
- Candidate latency is recorded, but relevance and false-zero recovery cannot be waived for speed.
- Live post-deploy probes call both production surfaces. Any miss triggers rollback to the prior Railway revision.

## Iteration rule

Failed product fixtures are fixed in the search implementation or data, then the full product gate is rerun. Release-harness polish that does not change user-visible search correctness is not allowed to extend this incident repair.

## Rollout

1. Commit the failing regression fixture.
2. Implement the tool-scoped route repair.
3. Run focused, corpus, surface, package, and latency checks.
4. Build the exact Railway candidate and run the same gate against it locally.
5. Deploy the current hosted service in place.
6. Probe the live MCP and public HTTP route with the acceptance set.
7. Keep the deployment only if every live product check passes. Otherwise restore the prior Railway revision.

## After the incident

Measure hosted zero-result and poor-result rates using one consistent tool-call grain. Add new real production misses to the judged corpus. Resume the caller retry work only after internal search recovery is stable.
