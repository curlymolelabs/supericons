# Admin dashboard local runbook

## One working dashboard

Run the dashboard from the main Supericons repository folder. The working page is `admin.html`, and its browser code is `public/admin-app.js`. The file under `mockups/` is a design reference with example data. It is not a second working dashboard.

## Recommended start

Set `ADMIN_SECRET` in your Windows user environment, then double-click:

```text
start-admin-dashboard.cmd
```

The launcher starts the managed local server and opens:

```text
http://127.0.0.1:4178/admin
```

For a temporary PowerShell session, run:

```powershell
$env:ADMIN_SECRET = "YOUR_ADMIN_API_SECRET"
.\start-admin-dashboard.cmd
```

## Manual start

From the main repository folder:

```powershell
$env:ADMIN_SECRET = "YOUR_ADMIN_API_SECRET"
npm run dev:admin
```

The server reads `ADMIN_SECRET` from the process environment and keeps it on the local server. The browser does not receive or store the secret. If the variable is missing, the server stops and names the missing value.

## Data and cache boundary

- The browser may keep the aggregate Overview payload for up to 30 seconds so KPI cards appear quickly after a reload.
- Secrets, account directory rows, emails, query rows, request rows, and client rows are not stored in browser storage.
- Refresh clears the aggregate cache and loads current production data.

## Stop

Close the "Supericons admin server" window, or press `Ctrl+C` in the terminal that started the server.
