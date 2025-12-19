# Set Up PostgreSQL Database on Railway

Follow these steps to add PostgreSQL to your existing Railway project.

## Step 1: Add PostgreSQL to Railway

1. **Go to Railway dashboard**: https://railway.app
2. **Open your project**: `expandhealth-ai-copilot`
3. **Click "+ New"** button
4. **Select "Database" → "PostgreSQL"**
5. Railway will create a new PostgreSQL database service

## Step 2: Get Database Connection String

1. **Click on the PostgreSQL service** card
2. **Go to "Variables" tab**
3. **Copy the `DATABASE_URL`** value
   - It looks like: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

## Step 3: Update V2 .env File

1. **Open** `demo/expand health/v2/.env`
2. **Replace** the `DATABASE_URL` line with your actual connection string:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST:PORT/railway
   ```
3. **Save** the file

## Step 4: Run Database Schema

There are two ways to set up the database schema:

### Option A: Using psql Command Line (Recommended)

```bash
cd "demo/expand health/v2"

# Run schema file
psql $DATABASE_URL < database/schema.sql
```

### Option B: Using Railway Dashboard

1. **In Railway**, click your PostgreSQL service
2. **Go to "Data" tab**
3. **Click "Query"**
4. **Copy and paste** the contents of `database/schema.sql`
5. **Click "Execute"**

## Step 5: Verify Database Setup

Run this query to check if tables were created:

```bash
psql $DATABASE_URL -c "\dt"
```

You should see:
- users
- roles
- clients
- labs
- protocols
- kb_documents
- notes
- chat_messages
- And more...

## Step 6: Test Default Admin Login

The schema creates a default admin user:

- **Email**: `admin@expandhealth.io`
- **Password**: `admin123`

**IMPORTANT**: Change this password after first login!

## Step 7: Start V2 Server

```bash
cd "demo/expand health/v2"
npm start
```

You should see:
```
🚀 ExpandHealth V2 Server
✅ Server running on port: 3001
✅ Connected to PostgreSQL database
```

## Step 8: Test Authentication

Open your browser and go to:
```
http://localhost:3001/login
```

(Login page will be created next)

---

## Troubleshooting

### Error: "Connection refused"
- Check that DATABASE_URL is correct in `.env`
- Verify PostgreSQL service is running in Railway

### Error: "relation does not exist"
- Schema hasn't been run yet
- Run: `psql $DATABASE_URL < database/schema.sql`

### Error: "password authentication failed"
- Double-check DATABASE_URL has correct password
- Copy it again from Railway dashboard

---

## Next Steps

After database is set up:
1. ✅ Create login page UI
2. ✅ Test login with default admin
3. ✅ Create dashboard UI
4. ✅ Start building Clients module

---

**Need help?** Share any error messages and I'll help you fix them!
