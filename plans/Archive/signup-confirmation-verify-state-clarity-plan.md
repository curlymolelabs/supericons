# Signup Confirmation Verify-State Clarity Plan

## Goal

Make the initial `Check your email` state clear on first render so users understand:

- a confirmation email was already sent
- another resend is not immediately available
- the countdown is expected behavior, not an error

## Problem

The cooldown logic now starts correctly after signup, but the static verify copy still suggests the user can resend right away.

That creates a mismatch between:

- what the screen says before the first click
- what the button and backend actually allow

## Fix

Update the `SIGNUP_PENDING` copy in `auth.js` so it:

- tells the user to open the confirmation email that was just sent
- explains that another request is available in about a minute
- does not promise immediate resend access

Keep the already-approved rate-limit wording unchanged:

- `We sent a confirmation email to ... You can request another in about a minute.`
- `A confirmation email was just sent. Please wait about a minute before requesting another.`

## Acceptance Criteria

- the first `Check your email` screen no longer implies immediate resend access
- the initial copy matches the 60-second cooldown behavior
- the approved resend status and rate-limit messages remain unchanged
- `npm run build` passes
