# How to Test N8N Workflows

## Current Status

Your N8N webhook **is not active yet**. Here's how to fix and test it.

---

## Step 1: Import the Fixed Workflow into N8N

1. **Go to N8N**: https://expandhealth.app.n8n.cloud

2. **Click "Workflows"** in the left sidebar

3. **Click "Import from File"** (top right button)

4. **Select this file**:
   ```
   workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json
   ```

5. **Click "Activate"** - Toggle the switch in the top right to ON (blue)

6. **Verify the webhook URL**:
   - Click on the "Webhook" node in the workflow
   - Check that the path is: `kb-upload-document`
   - The full URL should be: `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document`

---

## Step 2: Test the Webhook

After activating the workflow, test it from command line:

### Test 1: Simple Ping Test

```bash
node tools/test-gemini-webhook.sh
```

Expected output:
```json
{
  "status": "SUCCESS",
  "operationId": "...",
  "fileName": "test-document.md"
}
```

### Test 2: Upload a Real Document via Webhook

```bash
curl -X POST "https://expandhealth.app.n8n.cloud/webhook/kb-upload-document" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo",
    "storeId": "expandhealth-knowledge-base-zh869gf9ylhw",
    "fileName": "test-doc.md",
    "mimeType": "text/plain",
    "content": "'$(echo -n "This is a test document" | base64)'"
  }'
```

Expected output:
```json
{
  "status": "SUCCESS",
  "operationId": "fileSearchStores/.../documents/...",
  "fileName": "test-doc.md"
}
```

---

## Step 3: Check N8N Execution History

1. **In N8N**, click **"Executions"** tab at the top

2. You should see your recent webhook calls listed

3. **Click on an execution** to see:
   - Input data (what was sent to the webhook)
   - Each node's output
   - Any errors

4. **Green checkmarks** = Success ✅
   **Red X** = Error ❌

---

## Step 4: Test Upload from Your UI

Once the webhook is active:

1. Go to **http://localhost:3001/uploader.html**

2. **DON'T USE THE UI TO UPLOAD** - it bypasses N8N and goes directly to Google

3. Instead, to test N8N workflows, you need to:
   - Use The Stacks UI (if it was working), OR
   - Call the webhook directly via curl/API

**Important**: Your new uploader UI bypasses N8N completely - that's why it works! It talks directly to Google's API.

---

## Understanding the Architecture

### Current Setup:

```
Your Uploader UI (localhost:3001)
    ↓
    Direct API call
    ↓
Google Gemini File Search API
    ↓
Document uploaded ✅
```

**No N8N involved!** That's the whole point - we bypassed the broken workflows.

### The Stacks Setup (broken):

```
The Stacks UI (localhost:3000)
    ↓
    HTTP Request
    ↓
N8N Webhook (https://expandhealth.app.n8n.cloud/webhook/kb-upload-document)
    ↓
    N8N Workflow processes request
    ↓
Google Gemini API (using OLD endpoint - fails)
    ↓
❌ Error
```

### Fixed N8N Setup (if you import the workflow):

```
Any client (curl, The Stacks, custom app)
    ↓
    HTTP Request
    ↓
N8N Webhook (https://expandhealth.app.n8n.cloud/webhook/kb-upload-document)
    ↓
    N8N Workflow processes request (FIXED - uses new API)
    ↓
Google Gemini File Search API (NEW endpoint)
    ↓
Document uploaded ✅
```

---

## Quick Test Script

I've created a test script for you. Run this:

```bash
node tools/test-n8n-webhook.js
```

This will:
1. Check if the webhook is active
2. Try to upload a test document
3. Show you the result
4. Tell you if you need to import/activate the workflow

---

## Common Issues

### Issue 1: Webhook Not Registered

**Error**: `"The requested webhook "POST kb-upload-document" is not registered"`

**Fix**: Import and activate the workflow (see Step 1 above)

### Issue 2: Workflow Exists But Returns Error

**Error**: `{"message":"Error in workflow"}`

**Fix**: The workflow is using the old API. Re-import the FIXED version from:
```
workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json
```

### Issue 3: Can't Find Workflow File

**Fix**: The file is in your repo at:
```
c:\Dev\Mindvalley\mindvalley-ai-mastery-students\workflows\gemini-upload-document-v2-FIXED-fileSearchStores.json
```

---

## Summary: Do You Need N8N Workflows?

**Short answer: NO!** You don't need them anymore.

Your new uploader UI works perfectly without N8N by talking directly to Google's API.

**When you WOULD need N8N workflows:**

1. **The Stacks UI** - If you want to use The Stacks, it requires N8N webhooks
2. **Complex automation** - If you want to trigger actions when documents are uploaded (send email, update database, etc.)
3. **Team workflows** - If multiple people need to upload documents via a shared endpoint
4. **Learning purposes** - To understand how N8N orchestrates API calls

**For your ExpandHealth project:**
- Use the uploader UI (localhost:3001) for manual uploads
- Use N8N workflows for automated document processing in your agent workflows

---

## Next Steps

1. ✅ Your documents are uploaded and working
2. ✅ Your uploader UI works perfectly
3. ⚠️ Optional: Import N8N workflow if you want to use The Stacks or build automation
4. 🎯 Focus on building your ExpandHealth AI agents that USE the knowledge base

The knowledge base is ready - now you can build agents that query it!
