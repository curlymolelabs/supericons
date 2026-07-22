# Admin dashboard local runbook

## One working dashboard

Run the dashboard from the main Supericons repository folder. The working page is `admin.html`, and its browser code is `public/admin-app.js`. The file under `mockups/` is a design reference with example data. It is not a second working dashboard.

## Recommended start

Double-click:

```text
start-admin-dashboard.cmd
```

The launcher starts the managed local server and opens:

```text
http://127.0.0.1:4178/admin
```

The page asks for the current temporary admin secret. Enter the same value that is configured as `ADMIN_SECRET` for the Supabase `admin-api` function.

## Manual start

From the main repository folder:

```powershell
npm run dev:admin
```

Then open `http://127.0.0.1:4178/admin` and enter the secret in the sign-in window.

## Temporary secret behavior

- The browser sends the entered secret only to the dashboard server on `127.0.0.1`.
- The local server checks the secret with the protected Supabase admin API.
- A rejected secret leaves the dashboard locked and shows an error.
- An accepted secret stays only in the local Node process. It is not stored in local storage, session storage, a cookie, a file, or the page source.
- The browser receives a separate random session cookie. The cookie cannot be read by page scripts, contains no secret, and is forgotten when the browser or local server closes.
- Closing the server forgets the secret.
- If the Supabase secret expires or is rotated while the dashboard is open, the next rejected request clears the local copy and opens the sign-in window again.

An older `setx ADMIN_SECRET ...` value is no longer used by the normal dashboard start command. To remove that stored Windows user variable, open PowerShell and run:

```powershell
[Environment]::SetEnvironmentVariable("ADMIN_SECRET", $null, "User")
```

Close any older command windows after removing it.

## Data and cache boundary

- The browser may keep the aggregate Overview payload for up to 30 seconds so KPI cards appear quickly after a reload.
- Secrets, account directory rows, emails, query rows, request rows, and client rows are not stored in browser storage.
- Refresh clears the aggregate cache and loads current production data.

## Stop

Close the "Supericons admin server" window, or press `Ctrl+C` in the terminal that started the server.
