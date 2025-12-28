@echo off
REM ExpandHealth V2 Deployment Script for Windows
REM This script commits, pushes to GitHub, and deploys to Railway

echo ========================================
echo   ExpandHealth V2 Deployment Script
echo ========================================

REM Check if we're in the right directory
if not exist "server.js" (
    echo Error: Must run from demo\expand health\v2 directory
    exit /b 1
)

REM Step 1: Check git status
echo.
echo Step 1: Checking git status...
git status --short

REM Step 2: Add and commit
echo.
echo Step 2: Committing changes...
git add -A

if "%~1"=="" (
    set COMMIT_MSG=Update ExpandHealth V2 - %date% %time:~0,5%
) else (
    set COMMIT_MSG=%~1
)

git commit -m "%COMMIT_MSG%" || echo No changes to commit

REM Step 3: Push to GitHub
echo.
echo Step 3: Pushing to GitHub (expandhealthai/staging)...
git push expandhealthai staging

REM Step 4: Deploy to Railway
echo.
echo Step 4: Deploying to Railway...
railway up --service expandhealth-ai-copilot --detach

echo.
echo ========================================
echo   Deployment initiated!
echo ========================================
echo GitHub: https://github.com/emilianpopa/expandhealthai/tree/staging
echo Railway: https://expandhealth-ai-copilot-staging.up.railway.app
echo.
echo Note: Railway deployment takes ~1-2 minutes to complete.
