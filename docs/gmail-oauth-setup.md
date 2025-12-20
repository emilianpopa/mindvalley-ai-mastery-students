# Gmail OAuth2 Setup for N8N

This guide walks you through setting up Gmail OAuth2 credentials for N8N so your workflows can send emails.

---

## Overview

Gmail OAuth2 requires:
1. Google Cloud Project
2. OAuth consent screen configured
3. OAuth credentials created
4. Credentials added to N8N

**Time required**: 15-20 minutes
**Cost**: Free (Google Cloud free tier)

---

## Part 1: Create Google Cloud Project

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with your Gmail account (emilian@expand.health)

### Step 2: Create New Project

1. Click the **project dropdown** (top left, next to "Google Cloud")
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `N8N Email Integration` (or similar)
   - **Organization**: Leave as "No organization" (unless you have one)
4. Click **Create**
5. Wait 10-20 seconds for project creation
6. **Select your new project** from the dropdown

---

## Part 2: Enable Gmail API

### Step 3: Enable the Gmail API

1. In the Google Cloud Console, go to: **APIs & Services > Library**
   - Or direct link: https://console.cloud.google.com/apis/library
2. Search for: `Gmail API`
3. Click **Gmail API** (by Google)
4. Click **Enable**
5. Wait for it to enable (5-10 seconds)

---

## Part 3: Configure OAuth Consent Screen

This is what users see when granting permission to your N8N workflows.

### Step 4: Set Up OAuth Consent Screen

1. Go to: **APIs & Services > OAuth consent screen**
   - Or: https://console.cloud.google.com/apis/credentials/consent
2. Choose **User Type**:
   - Select **External** (unless you have Google Workspace)
   - Click **Create**

### Step 5: Fill OAuth Consent Screen Form

**App Information:**
- **App name**: `N8N Expand Health` (or `N8N Workflows`)
- **User support email**: Your email (emilian@expand.health)
- **App logo**: (Optional - skip for now)

**App domain (Optional):**
- Skip for now (not required for testing)

**Developer contact information:**
- **Email addresses**: emilian@expand.health

Click **Save and Continue**

### Step 6: Scopes

1. Click **Add or Remove Scopes**
2. Filter for `Gmail API`
3. Select these scopes:
   - `https://www.googleapis.com/auth/gmail.send` (Send emails)
   - `https://www.googleapis.com/auth/gmail.readonly` (Read emails - optional but recommended)
   - `https://www.googleapis.com/auth/gmail.modify` (Modify emails - optional)

4. Click **Update**
5. Click **Save and Continue**

### Step 7: Test Users

Since this is "External" app in testing mode, you need to add yourself:

1. Click **Add Users**
2. Enter: `emilian@expand.health` (and any other emails you want to test with)
3. Click **Add**
4. Click **Save and Continue**

### Step 8: Summary

Review and click **Back to Dashboard**

---

## Part 4: Create OAuth Credentials

### Step 9: Create OAuth Client ID

1. Go to: **APIs & Services > Credentials**
   - Or: https://console.cloud.google.com/apis/credentials
2. Click **+ Create Credentials** (top)
3. Select **OAuth client ID**

### Step 10: Configure OAuth Client

**Application type:**
- Select: **Web application**

**Name:**
- Enter: `N8N Gmail Integration`

**Authorized JavaScript origins:**
- Leave empty (not needed)

**Authorized redirect URIs:**
- Click **+ Add URI**
- Enter your N8N OAuth callback URL:
  ```
  https://[your-n8n-instance].app.n8n.cloud/rest/oauth2-credential/callback
  ```

  **Example**:
  ```
  https://expandhealth.app.n8n.cloud/rest/oauth2-credential/callback
  ```

  **How to find your N8N instance URL:**
  - Open your N8N dashboard
  - Look at the URL bar: `https://expandhealth.app.n8n.cloud/workflows/...`
  - Your instance is: `expandhealth`
  - Full redirect URI: `https://expandhealth.app.n8n.cloud/rest/oauth2-credential/callback`

### Step 11: Save and Get Credentials

1. Click **Create**
2. You'll see a popup with:
   - **Client ID**: Something like `123456789-abc123.apps.googleusercontent.com`
   - **Client Secret**: Something like `GOCSPX-abc123xyz789`
3. **Copy both** (you'll need them for N8N)
4. Click **OK**

**IMPORTANT**: Save these somewhere secure (password manager) - you'll need them in the next step.

---

## Part 5: Add Credentials to N8N

### Step 12: Create Gmail OAuth2 Credential in N8N

1. Open your N8N instance: https://expandhealth.app.n8n.cloud
2. Click your **profile icon** (bottom left)
3. Select **Credentials**
4. Click **Add Credential** (top right)
5. Search for: `Gmail OAuth2 API`
6. Select **Gmail OAuth2 API**

### Step 13: Fill in OAuth Details

**Client ID:**
- Paste the Client ID from Google Cloud Console (Step 11)

**Client Secret:**
- Paste the Client Secret from Google Cloud Console (Step 11)

**Credential Name:**
- Enter: `Gmail - Emilian Expand Health` (or similar)

### Step 14: Connect Account

1. Click **Connect my account**
2. You'll be redirected to Google sign-in
3. Sign in with: `emilian@expand.health`
4. You'll see a warning: **"Google hasn't verified this app"**
   - This is normal for apps in testing mode
   - Click **Advanced**
   - Click **Go to N8N Expand Health (unsafe)**
5. Review permissions and click **Allow**
6. You'll be redirected back to N8N
7. You should see: **"Successfully connected"** ✓

### Step 15: Save Credential

1. Click **Save** in N8N
2. Your Gmail OAuth2 credential is now ready to use!

---

## Part 6: Use in Your Workflows

### Step 16: Configure Send Email Node

In your Echo Processor workflow (or any workflow that sends emails):

1. Open the **"Send Results Email"** node
2. Under **Credential to connect with**:
   - Select: `Gmail - Emilian Expand Health` (the credential you just created)
3. Fill in other email fields:
   - **From**: emilian@expand.health
   - **To**: `{{ $json.email }}` (or specific recipient)
   - **Subject**: Your subject line
   - **Email Type**: HTML (if sending formatted emails)
   - **Message**: Your email body
4. **Save** the workflow

### Step 17: Test Email Sending

1. Click **Execute Workflow** (or trigger it)
2. Check if email was sent successfully
3. Check the recipient's inbox (and spam folder)

---

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Cause**: Redirect URI doesn't match exactly

**Fix**:
1. Go back to Google Cloud Console > Credentials
2. Click your OAuth Client ID
3. Check **Authorized redirect URIs** matches exactly:
   ```
   https://[your-instance].app.n8n.cloud/rest/oauth2-credential/callback
   ```
4. Save and try reconnecting in N8N

### "This app is blocked"

**Cause**: Gmail API not enabled

**Fix**:
1. Go to Google Cloud Console > APIs & Services > Library
2. Search `Gmail API`
3. Click **Enable**

### "Invalid grant" or "Token expired"

**Cause**: OAuth token expired or revoked

**Fix**:
1. In N8N, go to Credentials
2. Edit your Gmail OAuth2 credential
3. Click **Reconnect** or **Connect my account** again
4. Re-authorize with Google

### Email not sending (no error shown)

**Cause**: Workflow execution successful but email node not triggered

**Fix**:
1. Check workflow execution in N8N
2. Click the execution
3. Click the "Send Email" node
4. Check if it shows green checkmark
5. If skipped, check workflow logic/conditions

### "App in testing mode - only test users allowed"

**Cause**: You're trying to send from/to an email not listed in Test Users

**Fix**:
1. Go to Google Cloud Console > OAuth consent screen
2. Scroll to **Test users**
3. Click **Add Users**
4. Add the email address
5. Try reconnecting in N8N

---

## Security Notes

### Should I publish my OAuth app?

**For personal use**: No - keep it in "Testing" mode
- Only you and added test users can use it
- Safer for personal workflows
- No Google verification needed

**For team use**: Consider publishing
- Allows anyone to authenticate
- Requires Google verification (can take days/weeks)
- Only needed if >100 users or production app

### Revoking Access

If you need to revoke N8N's access to Gmail:

1. Go to: https://myaccount.google.com/permissions
2. Find **N8N Expand Health** (or your app name)
3. Click **Remove access**

To reconnect: Go back to N8N and re-authenticate

---

## Cost Summary

- **Google Cloud Project**: Free
- **Gmail API calls**: Free (generous quotas)
- **OAuth2**: Free
- **N8N Cloud**: Paid (Starter tier $20/month - you already have this)

---

## Quick Reference

### URLs You'll Need

| Resource | URL |
|----------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| APIs & Services | https://console.cloud.google.com/apis |
| OAuth Consent Screen | https://console.cloud.google.com/apis/credentials/consent |
| Credentials | https://console.cloud.google.com/apis/credentials |
| N8N Redirect URI Format | `https://[instance].app.n8n.cloud/rest/oauth2-credential/callback` |

### Your Specific Details

- **N8N Instance**: `expandhealth.app.n8n.cloud`
- **Redirect URI**: `https://expandhealth.app.n8n.cloud/rest/oauth2-credential/callback`
- **Email**: `emilian@expand.health`
- **Project Name**: `N8N Email Integration` (or whatever you chose)

---

## Next Steps

After setup:
1. ✅ Echo workflow can now send brand voice analysis via email
2. ✅ Future email workflows (YGM pipeline) can send customer responses
3. ✅ You can also receive emails (if you enabled gmail.readonly scope)

---

*Last updated: December 2025*
*For AI Mastery Build Lab students*
