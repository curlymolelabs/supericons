# Website Popularity Public RPC Contract

Date: 2026-08-05
Function: `public.si_get_website_popular_icons(p_style text)`

## Request

`p_style` is required and accepts only `outline` or `solid`. Any other value raises PostgreSQL input error `22023`.

## Success response

```json
{
  "status": "fresh",
  "calculated_at": "2026-08-05T00:20:00Z",
  "stale_after": "2026-08-07T00:20:00Z",
  "icon_refs": ["lucide:search"]
}
```

`icon_refs` contains no more than 50 lowercase `library:id` references. The order is the website display order.

## Safe fallback responses

`status` can be `stale`, `failed`, or `insufficient_evidence`. These responses return an empty `icon_refs` array. Timestamps can be null when no successful snapshot exists.

## Public boundary

The response contains exactly four fields:

- `status`
- `calculated_at`
- `stale_after`
- `icon_refs`

It never returns score values, action counts, source counts, identities, hashes, raw events, queries, or unshown references.

Anonymous, authenticated, and service roles can execute the function. Anonymous and authenticated roles cannot read any underlying table.

## Client behavior

The website treats malformed responses, HTTP errors, invalid timestamps, fewer than 6 resolved references, and non-fresh statuses as a safe fallback. It preserves the usual grid order and keeps browsing available.
