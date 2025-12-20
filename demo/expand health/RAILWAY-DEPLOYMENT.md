# ExpandHealth AI Copilot - Railway Deployment Guide

## Prerequisites Completed ✅

I've prepared your app for Railway deployment by creating:

1. **package.json** - Node.js configuration with start script
2. **railway.json** - Railway-specific configuration
3. **.env.example** - Template for environment variables
4. **.gitignore** - Prevents sensitive files from being committed
5. **server-simple.js** - Updated to use environment variables

---

## Step-by-Step Deployment (15 minutes)

### Step 1: Login to Railway

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login"** (top right)
3. Sign in with GitHub (or your existing account)

### Step 2: Create New Project

1. Click **"New Project"** (dashboard)
2. Select **"Deploy from GitHub repo"**
3. If this is your first time:
   - Click **"Configure GitHub App"**
   - Grant Railway access to your repositories
   - Select the repo or allow all repos

4. **OR** if you don't want to use GitHub:
   - Select **"Empty Project"**
   - We'll upload files manually (instructions below)

### Step 3: Upload Your Code

**Option A: Via GitHub (Recommended)**
- Select your GitHub repository
- Railway will auto-detect it's a Node.js app
- Click **"Deploy Now"**

**Option B: Manual Upload (No GitHub)**
1. In your Railway project, click **"+ New"**
2. Select **"Empty Service"**
3. Click the service card → **"Settings"**
4. Scroll to **"Source"** → Click **"Connect Repo"**
5. Upload via Railway CLI (install with: `npm install -g @railway/cli`)

### Step 4: Add Environment Variables

This is **CRITICAL** - your API keys must be added as environment variables:

1. In your Railway project, click your service card
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these three variables:

```
CLAUDE_API_KEY = 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

GEMINI_API_KEY = AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM

PORT = 3000
```

**IMPORTANT:** Railway automatically provides a `PORT` variable, but we're setting it to 3000 for consistency.

5. Click **"Deploy"** (Railway will restart with new variables)

### Step 5: Wait for Deployment

1. Watch the **"Deployments"** tab
2. You'll see build logs (installing dependencies, starting server)
3. Wait for **"Success"** status (usually 1-2 minutes)

### Step 6: Get Your Public URL

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. You'll get a URL like: **`expandhealth.up.railway.app`**

5. Click the URL to open your app!

### Step 7: Test Your Deployment

Visit these URLs to verify everything works:

- **Main Dashboard**: `https://your-app.up.railway.app/`
- **Patient Database**: `https://your-app.up.railway.app/patients`
- **Knowledge Base Admin**: `https://your-app.up.railway.app/kb-admin`

---

## Alternative: Railway CLI Deployment (Advanced)

If you prefer command-line deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (in your expand health folder)
cd "demo/expand health"
railway init

# Add environment variables
railway variables set CLAUDE_API_KEY="your-key-here"
railway variables set GEMINI_API_KEY="your-key-here"

# Deploy!
railway up

# Get your URL
railway domain
```

---

## Important Notes

### Data Persistence

**CRITICAL**: Railway's filesystem is **ephemeral** - your `patients.json` and `kb-config.json` files will be **deleted** when the app restarts.

**Solutions:**

1. **Short-term** (for testing): Your data will persist as long as the app doesn't restart
2. **Long-term** (production): Upgrade to PostgreSQL database (I can help with this)

To add persistent database storage:
1. In Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway provides free PostgreSQL database
4. I'll need to update the code to use PostgreSQL instead of JSON files

### Costs

- **First $5 free** every month
- After that: **~$5-10/month** for basic usage
- No credit card required for trial

### Custom Domain

To use your own domain (like `app.expandhealth.com`):

1. Go to **"Settings"** → **"Networking"**
2. Click **"Custom Domain"**
3. Enter your domain
4. Add the CNAME record to your DNS provider:
   - **Name**: `app` (or `@` for root domain)
   - **Value**: Your Railway domain

---

## Next Steps

**After deployment, you should:**

1. ✅ **Test all features** (patient upload, treatment plans, KB admin)
2. ✅ **Add authentication** (password-protect admin pages)
3. ✅ **Upgrade to PostgreSQL** (for persistent data storage)
4. ✅ **Set up backups** (export patient data regularly)
5. ✅ **Add custom domain** (optional, for professional look)

**Need help with any of these?** Just ask!

---

## Troubleshooting

### Build Failed
- Check the **"Deployments"** tab logs
- Most common issue: Missing dependencies in package.json

### App Not Loading
- Check if environment variables are set correctly
- Verify the PORT variable is set

### API Errors
- Verify CLAUDE_API_KEY and GEMINI_API_KEY are correct
- Check Railway logs for error messages

### Data Lost After Restart
- This is expected with JSON file storage
- Upgrade to PostgreSQL for persistent storage

---

## Quick Command Reference

```bash
# View logs
railway logs

# Restart service
railway restart

# Open app in browser
railway open

# Check deployment status
railway status
```

---

**Ready to deploy?** Follow the steps above, and your ExpandHealth AI Copilot will be live in ~15 minutes!
