# 📋 Railway Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment Setup ✅

- [x] package.json created
- [x] railway.json created
- [x] .env.example created
- [x] .gitignore created
- [x] Server updated to use environment variables
- [x] All features tested locally

**Status**: ✅ Ready to deploy!

---

## Railway Deployment Steps

### Step 1: Login to Railway
- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign in with GitHub (or existing account)
- [ ] Verify you're logged in

### Step 2: Create New Project
- [ ] Click "New Project" button
- [ ] Select deployment method:
  - [ ] **Option A**: "Deploy from GitHub repo" (recommended)
  - [ ] **Option B**: "Empty Project" (manual upload)

### Step 3: Connect Repository (if using GitHub)
- [ ] Authorize Railway to access your GitHub
- [ ] Select the repository containing your code
- [ ] Confirm the correct branch (main/master)

### Step 4: Configure Environment Variables
Add these variables in Railway's "Variables" tab:

- [ ] `CLAUDE_API_KEY` = `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`
- [ ] `GEMINI_API_KEY` = `AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM`
- [ ] `PORT` = `3000` (optional - Railway sets this automatically)

### Step 5: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (watch logs)
- [ ] Verify deployment status shows "Success"

### Step 6: Generate Public Domain
- [ ] Go to "Settings" tab
- [ ] Scroll to "Networking" section
- [ ] Click "Generate Domain"
- [ ] Copy your public URL (e.g., `https://expandhealth-production.up.railway.app`)

### Step 7: Test Your Deployment
Visit these URLs and verify they work:

- [ ] **Dashboard**: `https://your-url.up.railway.app/`
  - [ ] Can load page
  - [ ] Can generate treatment plan
  - [ ] Can upload PDFs (if not over Gemini quota)

- [ ] **Patients Database**: `https://your-url.up.railway.app/patients`
  - [ ] Can view patient list
  - [ ] Can search patients
  - [ ] Can view patient details

- [ ] **Knowledge Base Admin**: `https://your-url.up.railway.app/kb-admin`
  - [ ] Can view documents
  - [ ] Can upload new documents
  - [ ] Can delete documents

---

## Post-Deployment Tasks

### Immediate (Within 24 Hours)
- [ ] Share URL with 1-2 colleagues for feedback
- [ ] Test with a real patient case (anonymized)
- [ ] Upload additional knowledge base documents
- [ ] Bookmark the Railway dashboard for monitoring

### Short-Term (This Week)
- [ ] Decide: Keep JSON storage OR upgrade to PostgreSQL?
- [ ] Add simple authentication (password-protect admin pages)
- [ ] Set up custom domain (optional)
- [ ] Create backup of current patients.json and kb-config.json

### Long-Term (This Month)
- [ ] PostgreSQL migration (for persistent storage)
- [ ] Automated backups
- [ ] Email notifications for new patients
- [ ] Analytics/usage tracking
- [ ] Multi-user support with roles

---

## Common Issues & Solutions

### Build Failed
**Problem**: Railway shows build error
**Solution**:
- Check the logs in "Deployments" tab
- Verify package.json is correct
- Ensure formidable dependency is listed

### Can't Access URL
**Problem**: Domain not working
**Solution**:
- Wait 2-3 minutes after deployment
- Verify domain was generated in Settings → Networking
- Check deployment status is "Success"

### API Errors
**Problem**: Treatment plans not generating
**Solution**:
- Verify environment variables are set correctly
- Check Railway logs for error messages
- Confirm API keys are valid

### Data Lost After Restart
**Problem**: Patients/KB documents disappeared
**Solution**:
- This is expected with file storage
- Upgrade to PostgreSQL for persistence
- Or export data regularly as backup

---

## Railway Dashboard Quick Reference

### View Logs
1. Click your service card
2. Go to "Deployments" tab
3. Click latest deployment
4. View real-time logs

### Update Environment Variables
1. Click your service card
2. Go to "Variables" tab
3. Click "+ New Variable"
4. Add key and value
5. Service auto-restarts

### Restart Service
1. Click your service card
2. Go to "Settings" tab
3. Click "Restart"

### View Metrics
1. Click your service card
2. Go to "Metrics" tab
3. View CPU, memory, network usage

---

## Cost Tracking

### Free Tier
- **First $5/month**: FREE
- **Included**: 500 hours execution time
- **After free tier**: ~$5-10/month

### Monitor Usage
1. Go to Railway dashboard
2. Click "Usage" in sidebar
3. View current month's usage

---

## Next Actions After Deployment

**Once your app is live:**

1. **Test Everything**
   - Generate a treatment plan
   - Upload a patient
   - Upload a KB document
   - Verify all features work

2. **Share with Stakeholders**
   - Send URL to colleagues
   - Get feedback on UI/UX
   - Test with real use cases

3. **Plan Production Upgrades**
   - Authentication (protect admin pages)
   - PostgreSQL (persistent storage)
   - Custom domain (professional look)
   - Backups (data safety)

---

## Support & Help

**Need help?**
- 📖 Full guide: [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md)
- 🚀 Quick start: [DEPLOYMENT-READY.md](DEPLOYMENT-READY.md)
- 💬 Ask me anything!

**Railway Support:**
- Discord: [railway.app/discord](https://railway.app/discord)
- Docs: [docs.railway.app](https://docs.railway.app)

---

## 🎉 Deployment Complete!

Once all checkboxes above are checked, your ExpandHealth AI Copilot is **LIVE** and ready to use!

**Your live URL**: ___________________________________

**Date deployed**: ___________________________________

**Next milestone**: ___________________________________

---

**Congratulations! You've deployed a production AI application! 🚀**
