# Gaps and User requests v2 contract

## Gaps

Gaps answers one question: which failed or weak searches should the owner improve next?

## Data source

`GET /v2/search` provides Gaps from trusted final search outcomes. It uses the same period, channel, text, outcome, and test-traffic filters as Search History.

When `include_test=false`, controlled, preview, local, and internal test traffic stays out of Gaps.

Gaps is not shown as complete when the final-outcome detail limit is reached. The dashboard asks for a shorter period instead of presenting a partial worklist as complete.

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

## User requests

User requests is a separate table. It shows sentences entered after a Web search returned no icons.

The source is `public.icon_evidence`. A row qualifies only when:

- `signal_type = 'search_attempt'`
- `ui_surface = 'grid_empty_feedback'`
- `evidence_text` contains the person's request

The `ui_surface` check is required. Other evidence rows can contain machine-made text and must not appear here.

Each row shows:

- The person's sentence
- The failed query
- The selected library
- The date
- Review status
- Optional review note

When test traffic is excluded, only requests from a listed production Web host are shown.

Unreviewed requests appear before reviewed requests. The default display status is `new`.

`POST /v2/icon-requests/review` stores status and note in `public.admin_icon_request_reviews`. Valid statuses are:

- `new`
- `planned`
- `added`
- `declined`

The browser never writes to the review table directly. The admin API performs the write with its private service role.

Saving a review does not create or change icons, aliases, ranking rules, search behavior, or public product records.

## Migration and rollback

Migration `20260725130000_expand_query_review_actions.sql` expands the allowed review values without changing existing rows.

Rollback `20260725130000_expand_query_review_actions.down.sql` restores the old constraint only when no new action values are stored. It stops rather than discarding or mislabelling a human decision.
