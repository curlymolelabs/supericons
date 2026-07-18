# Admin dashboard local runbook

## Recommended start

Use the managed local gateway from the dashboard worktree:

```powershell
npm run dev:admin
```

Open:

```text
http://127.0.0.1:4178/admin
```

The command reads `ADMIN_SECRET` from the process environment and keeps it on the local server. The browser does not receive or store the secret. If the variable is missing, the server stops and names the missing value.

## Direct development mode

`npm run dev` still serves the dashboard for frontend development. Open `/admin.html` and enter the current admin secret when prompted. Direct mode keeps the value in memory only, so a page reload asks again.

Use the managed command for normal dashboard work. It also avoids sending the admin secret through browser code.

## Data and cache boundary

- The browser may keep the aggregate Overview payload for up to 30 seconds so KPI cards appear quickly after a reload.
- Secrets, account directory rows, emails, query rows, request rows, and client rows are not stored in browser storage.
- Refresh clears the aggregate cache and loads current production data.

## Stop

Press `Ctrl+C` in the terminal that started the managed gateway.
