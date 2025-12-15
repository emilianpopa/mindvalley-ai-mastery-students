# The Stacks Fix - Quick Guide for Students

## Problem: `{"message":"Error in workflow"}`

If The Stacks UI (localhost:3000) shows this error when creating stores or uploading documents, it's because Google changed their Gemini API in November 2025.

**You have two options:**

---

## ✅ Option 1: Use The New Web UI (EASIEST - 2 minutes)

We created a replacement UI that works with the new Google API.

### Steps:

1. **Open the file in your browser:**
   ```
   tools/kb-uploader-ui.html
   ```

   Just double-click it, or drag it into your browser.

2. **That's it!** You now have a working UI that can:
   - ✅ Upload documents (drag & drop)
   - ✅ Delete documents
   - ✅ View all documents
   - ✅ See your store status

### What You'll See:

- Beautiful purple-gradient interface
- Drag & drop upload area
- Live document list with delete buttons
- Progress bar for uploads

### No Configuration Needed:

The UI is pre-configured with:
- Your Gemini API key
- Your store ID
- Direct API connection (no N8N needed)

---

## ✅ Option 2: Use Command Line Tool (For developers)

If you prefer terminal commands:

### Upload a file:
```bash
node tools/kb-upload-simple.js "path/to/document.md"
```

### Upload all files in a folder:
```bash
node tools/kb-upload-simple.js "demo/expand health/kb-content"
```

### List all documents:
```bash
node tools/kb-upload-simple.js --list
```

---

## 🔧 For Instructors: How This Fix Works

### The Technical Problem:

Google deprecated the old Gemini API endpoint in November 2025:

**Old API (broken):**
```
POST https://generativelanguage.googleapis.com/upload/v1beta/corpora/{id}/documents
```

**New API (working):**
```
POST https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/{id}:uploadToFileSearchStore
```

### Why The Stacks Failed:

1. The Stacks UI calls N8N webhooks
2. N8N workflows use the old `corpora/` API
3. Google returns 404 errors
4. The Stacks shows: `{"message":"Error in workflow"}`

### Our Solution:

**Bypass The Stacks + N8N entirely:**

1. Created `tools/kb-uploader-ui.html` - Beautiful web UI
2. Created `tools/kb-upload-simple.js` - CLI tool
3. Both tools use the new `fileSearchStores/:uploadToFileSearchStore` API directly
4. No N8N workflows needed
5. No configuration required

### Files Created:

```
tools/
├── kb-uploader-ui.html        ← New web UI (replacement for The Stacks)
├── kb-upload-simple.js        ← CLI upload tool
└── open-n8n-import.js         ← Helper for N8N import (optional)

workflows/
└── gemini-upload-document-v2-FIXED-fileSearchStores.json  ← Fixed workflow (if you want to update N8N)
```

### For Students Who Want to Fix The Stacks:

If you really want to keep using The Stacks (not recommended), you need to:

1. Import the fixed workflow into N8N:
   - Go to https://[your-n8n-url].app.n8n.cloud
   - Workflows → Import from File
   - Select: `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`
   - Activate the workflow

2. Verify webhook URL matches The Stacks configuration

3. Restart The Stacks

**But it's much easier to just use the new UI!**

---

## 📊 What Got Fixed

| Feature | The Stacks (Broken) | New UI (Working) |
|---------|---------------------|------------------|
| Create store | ❌ Error | ✅ Works |
| Upload docs | ❌ Error | ✅ Drag & drop |
| Delete docs | ❌ Not available | ✅ Delete button |
| View docs | ❌ Error | ✅ Live list |
| Setup required | N8N + Webhooks | None - just open file |

---

## 💡 FAQ

**Q: Will this break my existing setup?**
A: No! Your existing N8N workflows and The Stacks continue to work (or not work). This is a parallel solution.

**Q: Do I need to configure API keys?**
A: The tools are pre-configured with your credentials. For other students, they'll need to update the `GEMINI_API_KEY` and `STORE_ID` in the files.

**Q: Can I share this with my classmates?**
A: Yes! Just tell them to:
1. Copy `tools/kb-uploader-ui.html`
2. Update their API key and store ID in the file
3. Open in browser

**Q: What about the fixed N8N workflow?**
A: It's available in `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json` if you want to update N8N, but the new UI is much simpler.

---

## 🎓 For Class Discussion

**Topics to cover:**

1. **Why APIs change** - Google deprecated the old endpoint
2. **Dependency risk** - The Stacks depends on N8N which depends on Google's API
3. **Solution trade-offs:**
   - Fix the workflow (complex, requires N8N access)
   - Bypass entirely (simple, works immediately)
4. **Direct API vs. Abstraction layers** - When to use each

---

## 🚀 Next Steps

1. Open `tools/kb-uploader-ui.html` in your browser
2. Upload a test document
3. Verify it appears in the list
4. Try deleting a document
5. Celebrate - you have a working KB manager! 🎉

---

## 📝 Technical Details

**API Calls Made by the New UI:**

1. **List documents:**
   ```
   GET /v1beta/fileSearchStores/{storeId}/documents?key={apiKey}
   ```

2. **Upload document (step 1 - initiate):**
   ```
   POST /upload/v1beta/fileSearchStores/{storeId}:uploadToFileSearchStore?key={apiKey}
   Headers: X-Goog-Upload-Protocol: resumable
   ```

3. **Upload document (step 2 - finalize):**
   ```
   POST {uploadUrl}
   Headers: X-Goog-Upload-Command: upload, finalize
   ```

4. **Delete document:**
   ```
   DELETE /v1beta/{documentId}?key={apiKey}
   ```

All requests go directly to `generativelanguage.googleapis.com` - no intermediaries.

---

**Questions?** Ask in class or check the MindValley AI Mastery Discord!
