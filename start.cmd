@echo off
rem starts the calendar's little web server (tools\serve.js) and opens the 3D viewer in the browser.
rem double-click it, or run it from a command prompt. needs Node.js: https://nodejs.org
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is needed to run the viewer on this computer.
    echo Install it from https://nodejs.org, then run this again.
    pause
    exit /b 1
)
node tools\serve.js --open
rem (only reached if the server stops, e.g. with an error: keeps the window open to read it)
pause
