# Gemini Workflow Import - Complete Setup Guide

## What You Need to Do

The Gemini File Search upload workflow needs to be imported into N8N. The documents are already uploaded, but the old workflow uses a deprecated API endpoint. This guide provides everything you need.

---

## Quick Start (5 minutes)

### Step 1: Import the Workflow into N8N

1. **Open your N8N instance:**
   ```
   https://expandhealth.app.n8n.cloud
   ```

2. **Click on "Workflows"** in the left sidebar

3. **Look for an import button** (usually labeled "Import" or a "+" button) and click **"Import from File"**

4. **Select this file:**
   ```
   workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json
   ```

5. **Click to open the imported workflow**, then **click the toggle switch in the top-right corner** to activate it

6. **Wait 10-15 seconds** for N8N to register the webhook

7. **Done!** Your webhook is now active at:
   ```
   https://expandhealth.app.n8n.cloud/webhook/kb-upload-document
   ```

---

## Testing the Import

Once imported, test that it works with:

### Option A: Using Bash Script (Easiest)

```bash
./test-gemini-webhook.sh "YOUR_GEMINI_API_KEY"
```

This will:
- Send a test document to the workflow
- Show you the response
- Confirm if it worked

### Option B: Using curl Directly

```bash
curl -X POST https://expandhealth.app.n8n.cloud/webhook/kb-upload-document \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_GEMINI_API_KEY",
    "storeId": "corpora/expandhealth-knowledge-base-zh869gf9ylhw",
    "fileName": "test-document.md",
    "mimeType": "text/plain",
    "content": "VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQ="
  }'
```

**Expected Response (Success):**
```json
{
  "status": "SUCCESS",
  "operationId": "fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/...",
  "fileName": "test-document.md"
}
```

---

## Files in This Directory

### Workflow Files (in `../workflows/`)

| File | Purpose | Status |
|------|---------|--------|
| `gemini-upload-document-v2-FIXED-fileSearchStores.json` | The fixed workflow file that uses the correct API endpoint | ✅ Ready to import |
| `gemini-create-store-v1-WORKING.json` | Workflow for creating Knowledge Base stores | ✅ Already imported |

### Scripts in This Directory (`./tools/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `import-gemini-workflow.js` | Node.js script to import workflow (requires API key) | `node import-gemini-workflow.js` |
| `test-gemini-webhook.sh` | Bash script to test the webhook after import | `./test-gemini-webhook.sh "API_KEY"` |

### Documentation

| Document | Where | Purpose |
|----------|-------|---------|
| `gemini-workflow-import-guide.md` | `../docs/` | Detailed import instructions |
| This file | `./tools/` | Quick reference guide |

---

## What Changed in the Fixed Workflow

### The Problem
The old workflow used the deprecated endpoint:
```
POST /upload/v1beta/corpora/{id}/documents
```

This endpoint no longer works and returns `404 Method not found` errors.

### The Solution
The fixed workflow uses the correct endpoint from the November 2025 Gemini API update:
```
POST /upload/v1beta/fileSearchStores/{id}:uploadToFileSearchStore
```

### What's the Same
- Webhook path: `/kb-upload-document` (unchanged)
- Expected inputs: `apiKey`, `storeId`, `fileName`, `mimeType`, `content`
- Store ID: `corpora/expandhealth-knowledge-base-zh869gf9ylhw` (unchanged)

---

## Integration with The Stacks

Once imported and tested, The Stacks UI at `localhost:3000` will be able to:

1. **Call the webhook** to upload documents:
   ```
   POST https://expandhealth.app.n8n.cloud/webhook/kb-upload-document
   ```

2. **Receive successful responses** with operation IDs

3. **Continue with the knowledge base workflow** seamlessly

---

## Troubleshooting

### "Webhook returns 404 not found"

**Cause:** The workflow isn't imported or activated

**Fix:**
1. Go to https://expandhealth.app.n8n.cloud/workflows
2. Find "Gemini File Search - Upload Document v2 (FIXED...)"
3. Click the toggle switch to turn it ON (should be green)
4. Wait 10-15 seconds and try the test again

### "Webhook returns error in workflow"

**Cause:** The old workflow is still active and conflicting

**Fix:**
1. Search for any workflow with "Gemini" + "Upload" in the name
2. Delete all old versions
3. Import the FIXED version fresh
4. Activate only the new one

### "Test returns ERROR status"

**Cause:** Invalid API key or missing fields

**Check:**
1. Is your Gemini API key valid? (Visit https://aistudio.google.com/apikey)
2. Does the API key have "Generative Language API" enabled?
3. Is the store ID exactly: `corpora/expandhealth-knowledge-base-zh869gf9ylhw`?

### "UNEXPECTED RESPONSE" from test script

**Cause:** Webhook isn't properly registered

**Fix:**
1. Verify workflow is imported: Go to https://expandhealth.app.n8n.cloud/workflows
2. Click on the workflow to view it
3. Check the toggle is ON (green)
4. Wait 10-15 seconds
5. Try the test again

---

## Step-by-Step Import Instructions (with Screenshots)

### Step 1: Open N8N
Go to: https://expandhealth.app.n8n.cloud

You should see the N8N dashboard with workflows listed on the left.

### Step 2: Access Import
In the top-left, you'll see **"Workflows"** or similar menu. Click it.

Look for a **"+"** button or **"Import"** button. Click it.

### Step 3: Import from File
Select the option **"Import from File"**

### Step 4: Choose Workflow File
Click "Browse" or "Choose File" and navigate to:
```
workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json
```

Click **Open** or **Import**

### Step 5: Verify Import
You should see a new workflow in the list:
```
"Gemini File Search - Upload Document v2 (FIXED - fileSearchStores)"
```

### Step 6: Activate Workflow
1. Click on the workflow to open it
2. In the **top-right corner**, you'll see a **toggle switch**
3. Click it to turn the workflow **ON** (it should turn green/blue)
4. You'll see a notification: "Workflow activated"

### Step 7: Wait for Webhook Registration
N8N needs 10-15 seconds to register the webhook endpoint.

### Step 8: Test (Optional but Recommended)
Run the test script to confirm it works:
```bash
./test-gemini-webhook.sh "YOUR_GEMINI_API_KEY"
```

---

## API Reference

### Webhook Endpoint

**POST** `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document`

### Request Body

```json
{
  "apiKey": "string (required) - Your Gemini API key",
  "storeId": "string (required) - Knowledge base store ID",
  "fileName": "string (required) - Name of document being uploaded",
  "mimeType": "string (optional) - MIME type, defaults to 'text/plain'",
  "content": "string (required) - Document content as base64-encoded string"
}
```

### Response (Success)

```json
{
  "status": "SUCCESS",
  "operationId": "fileSearchStores/..../upload/operations/...",
  "fileName": "test-document.md",
  "operation": {
    "name": "fileSearchStores/...",
    ...
  }
}
```

### Response (Error)

```json
{
  "status": "ERROR",
  "error": "Description of what went wrong"
}
```

---

## What Happens Next

After successful import:

1. **The Stacks UI** can now upload documents via the webhook
2. **Documents get added** to the Knowledge Base store
3. **Queries automatically** search the newly added documents
4. **Everything integrates** seamlessly with your AI system

---

## Need Help?

Refer to these files for more details:

- **Full import guide:** `../docs/gemini-workflow-import-guide.md`
- **Setup status:** `../docs/expandhealth-kb-setup-complete.md`
- **N8N documentation:** https://docs.n8n.io/workflows/
- **Gemini API reference:** https://ai.google.dev/api/file-search

---

**Last Updated:** December 13, 2025
**Status:** Ready for Import
**Store ID:** `corpora/expandhealth-knowledge-base-zh869gf9ylhw`
**Documents Uploaded:** 5/5 ✅
