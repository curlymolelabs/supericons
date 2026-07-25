# Demand Inbox v2 contract

## Decision supported

The Demand Inbox answers one question: which failed or weak searches should the owner improve next?

## Data source

`GET /v2/search` provides the inbox from trusted final search outcomes. It uses the same period, channel, text, outcome, and test-traffic filters as Search History.

When `include_test=false`, controlled, preview, local, and internal test traffic stays out of the inbox.

The inbox is not shown as complete when the final-outcome detail limit is reached. The dashboard asks for a shorter period instead of presenting a partial worklist as complete.

## Row content

Each row groups one normalized query context and shows:

- Query
- Issue
- Channel
- Language
- Country
- Typical result count
- Search count
- Human-selected action

Missing language, country, or result details are labelled as not recorded. They are not guessed.

## Human actions

`POST /v2/search/review` stores one of:

- `add_icon`
- `add_alias`
- `improve_ranking`
- `improve_docs`
- `watch`
- `ignore`
- `resolved`

Older `needs_icon` and `needs_alias` values remain readable and appear as Add icon and Add alias.

## Write boundary

The review endpoint writes only to `icon_query_reviews`.

It does not create or change icons, aliases, ranking rules, search behavior, documentation, or public product records. Promotion into those systems remains a separate human action.

## Migration and rollback

Migration `20260725130000_expand_query_review_actions.sql` expands the allowed review values without changing existing rows.

Rollback `20260725130000_expand_query_review_actions.down.sql` restores the old constraint only when no new action values are stored. It stops rather than discarding or mislabelling a human decision.
