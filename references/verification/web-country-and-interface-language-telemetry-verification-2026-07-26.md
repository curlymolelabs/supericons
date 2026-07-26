# Web Country and Interface Language Telemetry Verification

Status: passed after repair

Date: 2026-07-26

## Result

Web country data is now copied from the existing Railway search record using the exact search episode and environment. The admin dashboard, Search Summary, Request Log, and Audit Bundle expose the linked data.

The website now also sends its effective interface language as a separate fact from query language. No raw IP is stored or exported by this change.

## Production changes

- Database migration `20260726170000_link_web_final_country` applied and recorded.
- Database migration `20260726171000_web_interface_locale` applied and recorded.
- Web telemetry function moved from version 4 to version 5.
- Admin API moved from version 108 to version 111.
- Website production deploy moved from `6a625b770560ef7a286fb015` to `6a65db00a694382e5a15e59c`.
- Railway, MCP, search ranking, search results, recommendations, allowances, and product channels were not changed.

## Country linkage

The read-only preflight found:

- 87 Web final outcomes before rollout.
- 81 outcomes with one exact, agreeing country link.
- 0 outcomes with conflicting linked countries.
- 6 outcomes without an exact country link.

The migration copied all 81 exact links. It did not use query text, timestamps, searcher identity, or proximity.

At the final production check:

| Environment | Web finals | Country recorded | Interface language recorded |
|---|---:|---:|---:|
| Production | 79 | 77 | 0 |
| Preview | 1 | 1 | 1 |
| Test | 11 | 7 | 0 |

The two production rows without country evidence remain unknown. No country was inferred for them.

## Browser and dashboard proof

A real search ran through the deployed Netlify preview, Railway gateway, Web telemetry function, and database:

- Hosted search HTTP status: 200.
- Telemetry HTTP status: 202.
- Final outcome: success.
- Final outcome result count: 271.
- Rendered icon cells at capture: 200.
- Interface language: `es`.
- Country: `SG`.
- Country source: `railway_geoip`.
- Linked audit rows: 1.
- Browser console errors: 0.
- Safe episode hash: `85fbfa0b5354e2be`.

The authenticated dashboard Web filter displayed 12 grouped rows. All 12 visible Country cells were populated. The displayed country values were ES, IT, MX, and SG.

The broader authenticated dashboard walkthrough also passed:

- 19 live API requests completed.
- Overview and Search totals both reported 1,845 attempts.
- Overview and Audience both reported estimated reach of 673.
- Three navigation sections rendered.
- Three inline charts rendered.
- Warm cached render completed in 44 ms.
- No horizontal overflow was found.

## Download proof

Six 24-hour downloads were completed through the real dashboard:

- Search Summary, normal traffic
- Request Log, normal traffic
- Audit Bundle, normal traffic
- Search Summary, test traffic included
- Request Log, test traffic included
- Audit Bundle, test traffic included

Normal traffic:

- 75 Search Summary rows
- 77 product requests
- 13 Web rows
- 13 of 13 Web rows with country
- Audit integrity: passed
- Source reconciliation: passed

Test traffic included:

- 76 Search Summary rows
- 78 product requests
- 14 Web rows
- 14 of 14 Web rows with country
- 1 Web row with interface language
- Audit integrity: passed
- Source reconciliation: passed

Export contract:

- Schema version: 4.1
- Search Summary: 20 columns
- Request Log: 33 columns
- Search Summary includes `country_codes` and `interface_locales`.
- Request Log includes `country_code`, `geo_source`, and `interface_locale`.
- The normal traffic downloads excluded the preview verification event.

The all-history browser download was not certified in this run because it did not complete within the 180-second verification wait. This does not affect the verified country linkage or the passing 24-hour downloads.

## Product safety proof

The fixed Search v2 suite passed all 225 cases.

Deterministic ordered-result fingerprint:

`3ec9fae16fbd1c6900d1bdf4ed4f48270d7e4baec0e6d26783aa54821f6f7d24`

Fingerprint inputs were clean, and no ordered icon reference changed.

Other passing checks:

- Web episode settlement tests
- Web telemetry contract tests
- Country and interface-language migration tests
- Admin final-outcome tests
- Admin helper and API tests
- Search export contract tests
- Admin browser tests
- Deno checks for both deployed functions
- Production website bundle check
- Sensitive-data scan
- Changed-text dash scan

## Rollback

- Restore Web telemetry function version 4 to remove the new write behavior.
- Restore Admin API version 108 to return to the pre-release admin behavior.
- Restore Netlify deploy `6a625b770560ef7a286fb015` to remove the website payload field.
- Use `20260726171000_web_interface_locale.down.sql` to remove the interface-language column if required.
- Keep copied country values during rollback because they are exact existing evidence.
