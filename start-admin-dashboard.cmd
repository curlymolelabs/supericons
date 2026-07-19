@echo off
rem Supericons admin dashboard launcher. Double-click to start and open.
cd /d "%~dp0"
if "%ADMIN_SECRET%"=="" (
  echo ADMIN_SECRET is not set for this session. If you stored it with setx,
  echo close this window and double-click again from a fresh Explorer session.
  pause
  exit /b 1
)
start "Supericons admin server" cmd /k npm run dev:admin
timeout /t 2 >nul
start "" http://127.0.0.1:4178/admin
