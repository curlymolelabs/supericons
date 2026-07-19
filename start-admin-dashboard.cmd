@echo off
rem Supericons admin dashboard launcher. Double-click to start and open.
cd /d "%~dp0"
start "Supericons admin server" cmd /k npm run dev:admin
timeout /t 2 >nul
start "" http://127.0.0.1:4178/admin
