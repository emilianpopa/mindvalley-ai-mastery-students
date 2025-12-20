# 🚀 Deploy to Railway NOW (5 Minutes)

Your ExpandHealth AI Copilot is ready to deploy! Everything is configured. Just follow these steps:

---

## ✅ What's Already Done

I've prepared everything for you:
- ✅ package.json configured
- ✅ railway.json configured
- ✅ Environment variables template created
- ✅ Server updated for production
- ✅ Railway CLI installed

---

## 🎯 Deploy in 5 Minutes

### Step 1: Open Command Prompt (Windows)
- Press `Windows + R`
- Type `cmd`
- Press Enter

### Step 2: Navigate to Your Project
```cmd
cd "c:\Dev\Mindvalley\mindvalley-ai-mastery-students\demo\expand health"
```

### Step 3: Login to Railway
```cmd
railway login
```
This will open your browser. Log in with your Railway account.

### Step 4: Create New Railway Project
```cmd
railway init
```
When prompted:
- Project name: `expandhealth-ai-copilot` (or any name you prefer)
- Press Enter to confirm

### Step 5: Set Environment Variables
```cmd
railway variables set CLAUDE_API_KEY="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"

railway variables set GEMINI_API_KEY="AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM"
```

### Step 6: Deploy Your App
```cmd
railway up
```
Wait 1-2 minutes while Railway builds and deploys your app.

### Step 7: Get Your Public URL
```cmd
railway domain
```
This will generate a URL like: `https://expandhealth-production.up.railway.app`

---

## 🎉 That's It!

Your app is now live! Open the URL in your browser.

**Test these pages:**
- Dashboard: `https://your-url.up.railway.app/`
- Patients: `https://your-url.up.railway.app/patients`
- KB Admin: `https://your-url.up.railway.app/kb-admin`

---

## 🌐 Custom Domain: app.expand.health

Once deployed, set up your custom domain:

### In Railway Dashboard:
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click your service card
4. Go to **Settings** tab
5. Scroll to **Networking**
6. Click **Custom Domain**
7. Enter: `app.expand.health`
8. Copy the CNAME value Railway shows you

### In Your DNS Provider (where you manage expand.health):
1. Log in to your domain provider
2. Go to DNS settings
3. Add a new **CNAME record**:
   - **Name**: `app`
   - **Value**: The CNAME Railway gave you (like `expandhealth-production.up.railway.app`)
   - **TTL**: 3600 (or default)
4. Save changes

**Wait 5-15 minutes** for DNS propagation, then visit: `https://app.expand.health`

---

## 💡 Quick Troubleshooting

**If deployment fails:**
- Check Railway logs: `railway logs`
- Verify environment variables: `railway variables`

**If app doesn't load:**
- Wait 2-3 minutes after deployment
- Check if domain was generated: `railway domain`

**If features don't work:**
- Verify API keys are set: `railway variables`
- Check Railway dashboard logs

---

## 📊 Cost

- **First $5/month**: FREE
- **After that**: ~$5-10/month
- **Custom domain**: FREE

---

## ⚠️ Important: Data Persistence

Your app currently uses JSON files for storage. On Railway, these files are **ephemeral** (deleted on restart).

**For production use**, upgrade to PostgreSQL:
1. In Railway dashboard, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Let me know when you're ready, and I'll migrate the code

---

## 🆘 Need Help?

If anything goes wrong:
1. Share the error message
2. Run `railway logs` and share the output
3. I'll help you fix it!

---

**Ready? Start with Step 1! 🚀**
