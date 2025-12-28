# ExpandHealth V2 Deployment Guide

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. LOCAL (Your Computer)                                           │
│     └── Files edited in: demo/expand health/v2/                     │
│         └── Claude Code makes changes here                          │
│                    │                                                 │
│                    ▼                                                 │
│  2. GIT COMMIT                                                      │
│     └── Changes staged and committed locally                        │
│                    │                                                 │
│                    ▼                                                 │
│  3. GITHUB                                                          │
│     └── Pushed to: github.com/emilianpopa/expandhealthai            │
│     └── Branch: staging                                             │
│                    │                                                 │
│                    ▼                                                 │
│  4. RAILWAY (Hosting)                                               │
│     └── Auto-deploys when staging branch updates (after setup)      │
│     └── URL: https://expandhealth-ai-copilot-staging.up.railway.app │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Deploy (Manual)

From the `demo/expand health/v2` directory:

**Windows:**
```cmd
deploy.bat "Your commit message"
```

**Mac/Linux:**
```bash
./deploy.sh "Your commit message"
```

Or just run without a message for auto-generated timestamp:
```cmd
deploy.bat
```

## Setting Up GitHub Auto-Deploy in Railway

To make Railway automatically deploy when you push to GitHub:

### Step 1: Open Railway Dashboard
Go to: https://railway.app/project/5d2b70a6-b4d5-4c5d-8f89-064ad32d4adb

### Step 2: Select the Service
Click on **expandhealth-ai-copilot** service

### Step 3: Go to Settings
Click the **Settings** tab at the top

### Step 4: Configure Source
1. Scroll to **Source** section
2. Click **Connect Repo**
3. Select **GitHub**
4. Authorize Railway to access your GitHub account (if not already done)
5. Select repository: `emilianpopa/expandhealthai`
6. Set **Branch**: `staging`
7. Set **Root Directory**: `demo/expand health/v2`

### Step 5: Save and Verify
1. Click **Save**
2. Make a small change and push to GitHub
3. Watch Railway dashboard for automatic deployment

## After Auto-Deploy is Set Up

Once configured, the flow becomes:

```
You give Claude Code an instruction
        │
        ▼
Claude Code edits files locally
        │
        ▼
Claude Code commits and pushes to GitHub
        │
        ▼
Railway automatically detects the push
        │
        ▼
Railway builds and deploys (~1-2 min)
        │
        ▼
Changes are live at staging URL!
```

## Environment Variables

Railway environment variables are already configured:
- `DATABASE_URL` - PostgreSQL connection
- `ANTHROPIC_API_KEY` - AI API key
- `APP_URL` - https://app.expandhealth.io

## Useful Commands

**Check Railway status:**
```bash
railway status
```

**View logs:**
```bash
railway logs --service expandhealth-ai-copilot
```

**Manual deploy (bypasses GitHub):**
```bash
railway up --service expandhealth-ai-copilot --detach
```

## Troubleshooting

### Deployment not triggering?
1. Check Railway dashboard for errors
2. Verify the correct branch is set (staging)
3. Check root directory is set correctly

### Changes not appearing?
1. Wait 1-2 minutes for deployment to complete
2. Hard refresh the browser (Ctrl+Shift+R)
3. Check Railway logs for errors

### Build failing?
1. Check Railway logs for error messages
2. Verify package.json dependencies
3. Test locally with `npm start`
