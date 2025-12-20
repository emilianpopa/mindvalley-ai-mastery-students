@echo off
echo ========================================
echo ExpandHealth AI Copilot - Railway Deploy
echo ========================================
echo.

echo Step 1: Installing Railway CLI...
call npm install -g @railway/cli
echo.

echo Step 2: Logging in to Railway...
echo (This will open your browser)
call railway login
echo.

echo Step 3: Initializing Railway project...
call railway init
echo.

echo Step 4: Setting environment variables...
call railway variables set CLAUDE_API_KEY="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"
call railway variables set GEMINI_API_KEY="AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM"
echo.

echo Step 5: Deploying your app...
call railway up
echo.

echo Step 6: Generating public domain...
call railway domain
echo.

echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app is now live!
echo Copy the URL shown above and paste it in your browser.
echo.
pause
