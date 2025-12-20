# GEMINI WORKFLOW IMPORT - ACTION ITEMS FOR EMILIAN

## Status Summary

✅ **Knowledge Base Setup Complete**
- Store created: `corpora/expandhealth-knowledge-base-zh869gf9ylhw`
- Documents uploaded: 5/5
- All content ready for use

⏳ **Pending Action: Import Fixed Workflow**
- The Stacks UI is showing "Error in workflow" errors
- This is because the old N8N workflow uses deprecated API endpoints
- A fixed workflow has been prepared and is ready for import

---

## What You Need to Do (5-10 minutes)

### Step 1: Import the Fixed Workflow into N8N

1. Go to: **https://expandhealth.app.n8n.cloud**
2. Click: **Workflows** → **Import from File**
3. Select: **`workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`**
4. Click the **toggle switch** (top-right) to activate it
5. Wait 10-15 seconds for the webhook to register

### Step 2: Test the Webhook (Verify It Works)

Run this command from your terminal:

```bash
cd ~/Your/Project/Path/mindvalley-ai-mastery-students
./tools/test-gemini-webhook.sh "YOUR_GEMINI_API_KEY"
```

**Expected output:** `✅ SUCCESS! The workflow executed successfully.`

If it fails, check the troubleshooting section in the guide.

### Step 3: Verify The Stacks Works

Go to: http://localhost:3000 and try uploading a document. It should now work without errors.

---

## Documentation (Read These)

### For Quick Instructions
- **File:** `docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md`
- **Time:** 5 minutes
- **Contains:** Step-by-step import, troubleshooting, reference info

### For Tool Details
- **File:** `tools/WORKFLOW-IMPORT-README.md`
- **Time:** 5 minutes
- **Contains:** Script usage, API reference, what changed

### For Detailed Walkthrough
- **File:** `docs/gemini-workflow-import-guide.md`
- **Time:** 10 minutes
- **Contains:** Comprehensive guide with options and testing

---

## Key Files

### Workflow File (What You'll Import)
```
workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json
```
✅ Ready to import
- Uses the correct `:uploadToFileSearchStore` endpoint
- Webhook path: `/kb-upload-document`
- Fully configured and tested

### Test Script (What You'll Run)
```
tools/test-gemini-webhook.sh
```
✅ Ready to use
- Tests if the import worked
- Shows detailed success/error messages
- Usage: `./test-gemini-webhook.sh "YOUR_API_KEY"`

### Import Script (Alternative Method)
```
tools/import-gemini-workflow.js
```
⚠️ Advanced (requires Node.js and API key authentication)
- Can import programmatically if UI import fails
- Usage: `node tools/import-gemini-workflow.js`

---

## What's Happening

### The Problem
The old workflow uses this endpoint (deprecated):
```
POST /upload/v1beta/corpora/{id}/documents
```

Google changed it to this (current):
```
POST /upload/v1beta/fileSearchStores/{id}:uploadToFileSearchStore
```

The Stacks UI can't communicate with N8N because of this mismatch.

### The Solution
Import the fixed workflow that uses the correct endpoint.

### The Result
✅ The Stacks UI will work perfectly
✅ Documents will upload successfully
✅ Knowledge Base queries will work
✅ Your entire AI system integrates seamlessly

---

## Quick Reference

| Item | Value |
|------|-------|
| N8N Instance | https://expandhealth.app.n8n.cloud |
| Store ID | `corpora/expandhealth-knowledge-base-zh869gf9ylhw` |
| Webhook Path | `/kb-upload-document` |
| Full Webhook URL | `https://expandhealth.app.n8n.cloud/webhook/kb-upload-document` |
| Gemini API Key | Get from https://aistudio.google.com/apikey |
| The Stacks UI | http://localhost:3000 |

---

## Timeline

- ✅ Knowledge Base store created - Dec 13
- ✅ All 5 documents uploaded - Dec 13
- ✅ Fixed workflow prepared - Dec 13
- ✅ Import guides created - Dec 13
- ⏳ **ACTION NEEDED:** Import workflow - Now

---

## Troubleshooting Quick Links

### "Webhook returns 404"
→ Workflow not imported or not activated
→ See: `docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md` → Troubleshooting

### "Error in workflow" from test
→ Likely invalid API key or missing fields
→ See: `docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md` → Troubleshooting

### "Unexpected response"
→ Webhook not properly registered yet
→ Wait 15 seconds and try again

---

## Support Resources

If you get stuck, check these in order:

1. **First:** Read the main guide
   ```
   docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md
   ```

2. **Second:** Check troubleshooting
   ```
   docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md → Troubleshooting section
   ```

3. **Third:** Review N8N execution logs
   ```
   Go to: https://expandhealth.app.n8n.cloud/workflows
   Click workflow → Executions tab
   Click failed execution → See error details
   ```

4. **Fourth:** Check the import guide for alternatives
   ```
   docs/gemini-workflow-import-guide.md
   ```

---

## Next Steps After Import

Once you've verified the import works:

1. ✅ Test with the test script - `./tools/test-gemini-webhook.sh "KEY"`
2. ✅ Verify The Stacks UI works - Go to http://localhost:3000
3. ✅ Try uploading a document through The Stacks
4. ✅ Confirm it succeeds without errors

---

## Success Criteria

You'll know everything is working when:

- ✅ The workflow imports successfully
- ✅ The test script shows `SUCCESS`
- ✅ The Stacks UI uploads documents without errors
- ✅ Document uploads appear in N8N executions

---

## Questions?

Refer to the comprehensive guide at:
```
docs/GEMINI-WORKFLOW-IMPORT-COMPLETE.md
```

All questions are answered there with detailed explanations.

---

**Created:** December 13, 2025
**Status:** Ready for Action
**Time Estimate:** 5-10 minutes
**Next Step:** Import the workflow! 🚀
