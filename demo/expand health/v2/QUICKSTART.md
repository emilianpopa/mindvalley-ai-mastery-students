# ExpandHealth V2 - Quick Start Guide

**Time to get running:** 10 minutes

---

## ✅ What's Already Done

- ✅ Express server configured
- ✅ PostgreSQL schema designed
- ✅ Authentication system built
- ✅ Beautiful login page created
- ✅ Dashboard UI ready
- ✅ All dependencies installed

---

## 🚀 3 Steps to Launch

### Step 1: Add PostgreSQL to Railway (3 minutes)

**Option A: Via Railway Dashboard**
1. Go to https://railway.app
2. Open project: `expandhealth-ai-copilot`
3. Look for "+ New" or "Create" button (usually top-right or in project view)
4. Select "Database" → "Add PostgreSQL"
5. Wait 30 seconds for provisioning

**Option B: Via Railway CLI** (if you can't find the button)
```bash
cd "demo/expand health/v2"
railway add --database postgres
```

### Step 2: Configure Database (2 minutes)

1. **Get DATABASE_URL:**
   - In Railway dashboard, click PostgreSQL service
   - Click "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Update .env file:**
   - Open `demo/expand health/v2/.env`
   - Replace the DATABASE_URL line with your actual URL:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST:PORT/railway
   ```

3. **Run schema:**
   ```bash
   cd "demo/expand health/v2"
   psql $DATABASE_URL < database/schema.sql
   ```

   You should see messages about tables being created.

### Step 3: Start the Server (1 minute)

```bash
cd "demo/expand health/v2"
npm start
```

You should see:
```
🚀 ExpandHealth V2 Server
═══════════════════════════════════════════════════
✅ Server running on port: 3001
✅ Connected to PostgreSQL database
```

---

## 🎉 Test Your System!

### 1. Open Login Page
```
http://localhost:3001/login
```

### 2. Login with Default Admin
**Email:** `admin@expandhealth.io`
**Password:** `admin123`

### 3. You should see the Dashboard!
If successful, you'll be redirected to a beautiful dashboard showing:
- Welcome message
- Statistics cards
- Quick actions
- Development status

---

## ❓ Troubleshooting

### Can't find "+ New" button in Railway?
Try:
- Scroll down in the project view
- Look for "Add Service" or "Create" button
- Or use CLI: `railway add --database postgres`

### "Connection refused" error?
- Check DATABASE_URL in `.env` is correct
- Verify PostgreSQL service is running in Railway dashboard

### "relation does not exist" error?
- Schema hasn't been run yet
- Run: `psql $DATABASE_URL < database/schema.sql`

### Login fails with "Invalid credentials"?
- Make sure schema was run (creates admin user)
- Check browser console for errors (F12)
- Verify server is running

### Port 3001 already in use?
- Change PORT in `.env` to 3002 or another number
- Restart server

---

## 📊 System Status

**V1 (Old System):**
- URL: http://localhost:3000
- Status: Still running (untouched)
- Data: patients.json, kb-config.json

**V2 (New System):**
- URL: http://localhost:3001
- Status: Ready to use
- Data: PostgreSQL database

Both can run at the same time with no conflicts!

---

## 🔑 Important Notes

1. **Default admin password:** Change `admin123` after first login!
   (We'll add password change feature in Week 2)

2. **Data is separate:** V2 starts with a fresh database. Your V1 data is safe.

3. **Development mode:** The login page shows default credentials in the browser console when running on localhost.

---

## 🎯 Next Steps

After login works:

**Week 2 (This week):**
- ✅ Build Clients module (create, view, search)
- ✅ Add client profile pages
- ✅ Implement client CRUD operations

**Week 3:**
- Labs & Tests with PDF viewer
- AI summaries

**Weeks 4-5:**
- Protocol Builder with modular editor
- Chat-style editing

---

## 💡 Pro Tips

### Keep Both Systems Running
```bash
# Terminal 1 (V1 - old system)
cd "demo/expand health"
node server-simple.js    # Runs on port 3000

# Terminal 2 (V2 - new system)
cd "demo/expand health/v2"
npm start                 # Runs on port 3001
```

### Test V2 While V1 Serves Users
- Users keep using V1 at port 3000
- You test V2 at port 3001
- Switch when V2 is ready!

### Quick Database Reset
If you want to start fresh:
```bash
# Drop all tables and recreate
psql $DATABASE_URL < database/schema.sql
```

---

## 🆘 Still Stuck?

Share a screenshot or error message and I'll help you fix it!

Common things to check:
1. ✅ PostgreSQL service running in Railway?
2. ✅ DATABASE_URL copied correctly?
3. ✅ Schema script ran successfully?
4. ✅ Server started without errors?
5. ✅ Browser console shows any errors? (F12)

---

**Ready to continue building? Let me know once you're logged in!** 🎉
