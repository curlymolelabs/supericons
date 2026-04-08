# Auth UX QA Matrix

Use this checklist before the next Netlify redeploy. Record the observed UI copy, the final outcome, and any mismatch from expected behavior.

## Evidence Format

- `Status`: pass / fail / blocked
- `Environment`: localhost / Netlify preview
- `Account type`: new email / existing email / unconfirmed email / Google-first
- `Observed copy`: short note or screenshot path
- `End state`: what happened after the flow completed
- `Notes`: anything surprising

## Scenario Checklist

### 1. New email signup

- Expected:
  - signup succeeds without a misleading certainty claim
  - verify stage appears
  - resend confirmation is available
  - no raw backend error appears
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 2. Duplicate signup with existing email/password account

- Expected:
  - no wording implies a new account was definitely created
  - user is guided back to sign in
  - verify-stage wording remains privacy-safe
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 3. Duplicate signup with Google-first account

- Expected:
  - no wording implies a new account was definitely created
  - verify stage offers a clear Google path
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 4. Sign in with wrong password

- Expected:
  - clear normalized error
  - no account enumeration
  - recovery path remains visible
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 5. Sign in with unconfirmed email

- Expected:
  - unconfirmed-account verify state appears
  - resend confirmation is available
  - resend uses cooldown correctly
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 6. Forgot password with existing email

- Expected:
  - neutral privacy-safe success copy
  - reset email arrives
  - no definitive “account exists” claim
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 7. Forgot password with unknown email

- Expected:
  - same neutral success copy as existing email flow
  - no enumeration hint
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 8. Valid recovery link

- Expected:
  - reset stage opens
  - password update succeeds
  - user remains signed in after update
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 9. Expired or invalid recovery link

- Expected:
  - explicit invalid or expired state
  - clear retry action
  - no silent failure
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 10. Email confirmation link

- Expected:
  - user lands in a clear signed-in or next-step state
  - no stale “come back and sign in” wording if the callback already signed the user in
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 11. Google sign-in with existing account

- Expected:
  - sign-in succeeds
  - original auth intent resumes
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 12. Google sign-in for first-time account

- Expected:
  - account is created
  - user returns signed in
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 13. Account modal display-name update

- Expected:
  - save succeeds
  - dropdown/header reflect new display name
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 14. Account modal password path for email user

- Expected:
  - user can request password reset
  - neutral privacy-safe success copy appears
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 15. Account modal password path for OAuth-first user

- Expected:
  - wording says `Add password sign-in`
  - button says `Set password`
  - flow does not imply a previous password existed
  - Google sign-in remains usable afterward
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 16. Purchase-gated auth resume

- Expected:
  - after auth completes, purchase context resumes correctly
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:

### 17. Pro-gated auth resume

- Expected:
  - after auth completes, Pro context resumes correctly
- Evidence:
  - Status:
  - Environment:
  - Account type:
  - Observed copy:
  - End state:
  - Notes:
