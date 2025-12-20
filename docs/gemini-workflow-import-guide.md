# Import Gemini File Search Upload Workflow to N8N

## Quick Summary

The Gemini File Search upload workflow needs to be imported into N8N Cloud. This guide provides step-by-step instructions to import the fixed workflow that uses the correct `:uploadToFileSearchStore` endpoint.

**Status:** The fixed workflow file is ready at `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`

---

## Option 1: Manual Import via N8N UI (Recommended for First-Time)

This is the most straightforward approach.

### Steps:

1. **Open N8N** in your browser:
   ```
   https://expandhealth.app.n8n.cloud
   ```

2. **Navigate to Workflows**:
   - Click on **Workflows** in the left sidebar
   - Look for the button labeled **"Import"** or **"Import from File"**

3. **Import the Workflow File**:
   - Click the **Import** button
   - Select **"Import from File"** option
   - Browse to and select: `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`
   - Click **Open** or **Import**

4. **Verify the Import**:
   - The workflow should appear in your workflows list
   - Name: "Gemini File Search - Upload Document v2 (FIXED - fileSearchStores)"

5. **Activate the Workflow**:
   - Click to open the newly imported workflow
   - Look for the **toggle switch** in the **top-right corner** of the canvas
   - Click it to turn the workflow **ON** (it should become green/highlighted)
   - You'll see a notification like "Workflow activated"

6. **Verify Webhook Registration**:
   - The webhook path is: `/kb-upload-document`
   - Your webhook URL will be: `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document`
   - You should see a notification confirming the webhook is active

### That's it! The workflow is now ready to use.

---

## Option 2: Command-Line Import (Advanced)

If you prefer using the command line, here's a script that uses curl to test the workflow.

### Prerequisites:
- `curl` command-line tool installed
- The workflow file at `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`

### Step-by-Step:

1. **Create a temporary Node.js script** to import the workflow:

```javascript
// save as: import-workflow.js
const fs = require('fs');
const https = require('https');

const workflowJson = fs.readFileSync('./workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json', 'utf8');
const workflow = JSON.parse(workflowJson);

const postData = JSON.stringify({
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections
});

const options = {
  hostname: 'expandhealth.app.n8n.cloud',
  port: 443,
  path: '/api/v1/workflows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'X-N8N-API-KEY': 'YOUR_N8N_API_KEY_HERE'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
  });
});

req.write(postData);
req.end();
```

2. **Run the script**:
```bash
node import-workflow.js
```

**Note:** This requires your N8N API key, which is stored securely in your `.env` file.

---

## Testing the Imported Workflow

Once the workflow is imported and activated, test it with:

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

**Expected Response** (on success):
```json
{
  "status": "SUCCESS",
  "operationId": "fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/...",
  "fileName": "test-document.md"
}
```

---

## Troubleshooting

### Issue: "Workflow not found" or 404 errors

**Solution:**
1. Verify the workflow was imported successfully (check Workflows list)
2. Ensure the workflow is **activated** (toggle switch ON)
3. Wait 10-15 seconds for the webhook to register

### Issue: "Error in workflow" from Stacks UI

**Possible Causes:**
1. The old workflow is still imported and active (conflicting webhooks)
2. The N8N instance is running but the workflow isn't active

**Solution:**
1. Check if there's an old "Gemini Upload" workflow
2. Delete the old workflow if found
3. Import the FIXED version
4. Activate it and wait for webhook registration

### Issue: Upload still fails with API errors

**Check:**
1. Is your Gemini API key valid? (Check: https://aistudio.google.com/apikey)
2. Does the API key have File Search API enabled?
3. Is the store ID correct? (Should be `corpora/expandhealth-knowledge-base-zh869gf9ylhw`)

---

## What This Workflow Does

The imported workflow:

1. **Listens** for POST requests at `/kb-upload-document`
2. **Receives** document data (apiKey, storeId, fileName, content in base64)
3. **Validates** all required fields are present
4. **Calls** the Gemini File Search API endpoint: `uploadToFileSearchStore`
5. **Returns** the operation ID and upload status

### Key Fix:
- **Old (broken) endpoint:** `POST /upload/v1beta/corpora/{id}/documents`
- **New (fixed) endpoint:** `POST /upload/v1beta/fileSearchStores/{id}:uploadToFileSearchStore`

The fix uses the latest Gemini API syntax introduced in November 2025.

---

## Next Steps

After importing:

1. Test the webhook with the curl command above
2. Verify Stacks UI can now communicate with N8N
3. Monitor the workflow execution tab to see document uploads completing successfully
4. Keep this webhook URL handy: `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document`

---

## Quick Reference

| Item | Value |
|------|-------|
| Workflow File | `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json` |
| Webhook Path | `/kb-upload-document` |
| Full Webhook URL | `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document` |
| Store ID | `corpora/expandhealth-knowledge-base-zh869gf9ylhw` |
| API Endpoint | `uploadToFileSearchStore` |

---

**Last Updated:** 2025-12-13
**Status:** Ready for Import
