# Supericons Privacy Policy Page Plan

## Goal

Add a launch-ready in-app `Privacy Policy` page so:

- Google OAuth consent screen can point to a real privacy-policy URL
- footer/legal trust links are complete
- the page matches the existing site shell instead of opening as a disconnected microsite

Target public URL:

- `https://supericons.dev/?view=privacy`

## Why This Is Needed

Current state:

- the site has an in-app Terms page
- the site does **not** have a corresponding Privacy Policy page
- Google OAuth setup needs a privacy-policy link

Without this page, we either leave the field blank or point Google at the wrong document, which is not ideal for launch trust or compliance.

## Scope

Launch-safe scope only:

- add a dedicated in-app Privacy Policy view
- keep it in the same shell/style family as Terms
- suppress the customize panel by default, same as Terms/MCP/Pricing
- add footer navigation for Privacy
- make the page readable, left-aligned, and calm in tone

Out of scope for this pass:

- cookie banner
- preference center
- region-specific compliance branching
- data export / delete self-service tools

## Content Structure

The first version should be practical and honest, not over-lawyered. Suggested sections:

1. Overview
   - what Supericons is
   - what this policy covers

2. Data We Collect
   - account data from Supabase Auth
   - billing/subscription metadata from Stripe
   - product access / purchase records
   - basic analytics if enabled

3. How We Use Data
   - account access
   - purchases and entitlements
   - customer support
   - security and abuse prevention
   - service improvement

4. Payments
   - payments handled by Stripe
   - card details are not stored by Supericons

5. Authentication
   - email/password and Google sign-in
   - password reset and auth email delivery

6. MCP / API Access
   - MCP access keys or account-linked access
   - request handling needed to validate entitlement

7. Third-Party Services
   - Supabase
   - Stripe
   - Resend
   - Google OAuth
   - optional analytics provider

8. Data Retention
   - keep account/purchase records as needed for access, billing, and support

9. Your Choices
   - contact for account/privacy questions
   - how to request deletion or correction manually for launch

10. Contact
   - `hello@supericons.dev`

## Implementation Plan

### Phase 1. Add The In-App Privacy View

- add `privacy` to the allowed full-page views in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- render a new `privacyView` similarly to the existing Terms page
- ensure switching to `privacy` removes other full-page views cleanly
- reset shell scroll to top when opening it

### Phase 2. Match The Existing Legal Page Styling

- reuse the calm legal typography/layout already used by Terms in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- keep:
  - left-aligned content
  - restrained title color
  - readable paragraph width
  - subdued link styles

Prefer shared `.terms-*` style primitives where reasonable, or rename them into neutral legal-page classes if needed.

### Phase 3. Suppress The Customize Panel

- include `privacy` in the same panel-suppressed logic used for:
  - Pricing
  - Terms
  - MCP
  - Motion Lab
  - Converter

This keeps legal pages consistent with the non-icon full-page views.

### Phase 4. Wire Navigation

- add `Privacy` to the footer links
- ensure the footer item routes to `/?view=privacy`
- verify the page opens at the top, not at a preserved mid-scroll position

### Phase 5. Finalize Google OAuth Links

After the page exists, use these values in Google OAuth branding:

- Application home page: `https://supericons.dev`
- Privacy policy: `https://supericons.dev/?view=privacy`
- Terms of service: `https://supericons.dev/?view=terms`

## Acceptance Criteria

- `/?view=privacy` renders inside the main site shell
- the customize panel is hidden on the Privacy page
- the page title and section headers visually match the Terms page treatment
- content is left-aligned and readable on desktop
- footer `Privacy` link opens the page and scrolls to the top
- the page is suitable to use in Google OAuth consent-screen settings

## Verification

- run `npm run build`
- verify in browser:
  - `/?view=privacy`
  - footer `Privacy` link
  - `Terms`, `Privacy`, `MCP`, and `Pricing` all open at top-of-page
  - panel is hidden for Privacy
- verify no console errors on the Privacy route

## Recommended Next Step

Implement the Privacy page before continuing the Google OAuth consent-screen setup.
