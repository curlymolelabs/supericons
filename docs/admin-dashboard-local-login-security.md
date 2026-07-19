# Admin dashboard local login security

Date: 2026-07-19

## Boundary

The dashboard is a single-operator local tool. The browser loads the page from `127.0.0.1`, and the local Node server is the only component that retains an accepted admin secret.

The browser handles the secret only while the operator types and submits it. The browser sends it to the loopback session endpoint over the same origin. The value is not written to browser storage, HTML, files, URLs, logs, or response bodies.

## Server enforcement

- The server binds to `127.0.0.1` by default.
- Cross-site requests are rejected.
- Protected proxy requests are rejected until a secret has been accepted.
- The session endpoint accepts JSON only and limits the request body size.
- The server validates a candidate against the protected Supabase admin API before retaining it.
- A rejected candidate does not create a session.
- A later 401 or 403 response from the protected API clears the retained secret.
- Closing the local server ends the session and removes the retained value from memory.

## Abuse cases

| Case | Control |
|---|---|
| Wrong or expired secret | Supabase rejects it and the dashboard remains locked |
| Secret rotated during a session | The next protected rejection clears the local session and reopens sign-in |
| Cross-site browser request to loopback | Origin mismatch returns 403 |
| Request sent before sign-in | Local proxy returns 401 without contacting the protected data route |
| Oversized sign-in request | Session endpoint returns 413 |
| Browser reload | The page can reuse the in-memory local server session, but no secret is recovered from browser storage |
| Server restart | The operator must enter the secret again |

## Remaining boundary

Any process already running as the same local user can inspect that user's process memory or control the browser. The dashboard does not try to defend against a fully compromised local account. The Supabase admin secret should remain temporary and should be rotated after suspected local compromise.
