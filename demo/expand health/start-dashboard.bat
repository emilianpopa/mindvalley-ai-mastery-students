@echo off
echo.
echo ================================================
echo   ExpandHealth AI Copilot Dashboard
echo ================================================
echo.
echo Starting local server...
echo.
echo Dashboard will open at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ================================================
echo.

cd /d "%~dp0"
npx serve . -l 3000 --single

pause
