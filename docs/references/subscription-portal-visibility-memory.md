# Subscription Portal Visibility Memory

Date: April 14, 2026

## Decision

`Manage Subscription` visibility after a cancellation is not a strict UX requirement.

Accepted product stance:

- it is okay if the link continues to show after cancellation or after the paid period ends, because users may still want access to historical billing records
- it is also okay if the link stops showing after the subscription is no longer active
- this should not be treated as a launch blocker unless it creates a broken or misleading flow

## Why

The user value of the link is broader than only "change my active plan." Even after cancellation, the Stripe portal can still be useful for:

- reviewing invoices
- checking historical billing records
- confirming the cancellation state

Because of that, hiding the link immediately after cancellation is not required.

## Implementation Guidance

If we revisit this later:

- prefer avoiding broken states over chasing a perfect hide/show rule
- treat portal visibility as a product choice, not a billing-integrity control
- the stronger requirement is that expired or invalid subscriptions must not get incorrect entitlement access

## Current Follow-up

The active follow-up is not portal-link visibility itself. The active follow-up is fixing `current_period_end` sync so expiration-aware flows have reliable data when they need it.
