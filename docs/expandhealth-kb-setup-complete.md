# ExpandHealth Knowledge Base - Setup Complete

## Summary

Successfully created the ExpandHealth Knowledge Base store and uploaded all 5 knowledge base documents using the correct Gemini File Search API endpoints.

## Store Details

**Store Name:** ExpandHealth Knowledge Base
**Store ID:** `corpora/expandhealth-knowledge-base-zh869gf9ylhw`
**Created:** 2025-12-13

## Uploaded Documents

All 5 documents were successfully uploaded:

| Document | File Name | Operation ID |
|----------|-----------|--------------|
| Brand Voice | expand-brand-voice.md | `fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/expandbrandvoicemd-j2whgile14f9` |
| FAQ | expand-faq.md | `fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/expandfaqmd-yypp0ns4ykc7` |
| Locations | expand-locations.md | `fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/expandlocationsmd-3yf99v19bd26` |
| Menu | expand-menu.md | `fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/expandmenumd-lect15qjtein` |
| Policies | expand-policies.md | `fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/expandpoliciesmd-cov9tvp9qqk6` |

## Fixed Workflow Files

Two workflow files have been created/updated in `workflows/`:

### 1. Create Store Workflow (Already Working)
**File:** `workflows/gemini-create-store-v1-WORKING.json`

- **Webhook Path:** `/kb-create-store`
- **Status:** ✅ WORKING - Already imported and active in N8N
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/fileSearchStores`
- **Usage:** This workflow was used to create the ExpandHealth Knowledge Base store

### 2. Upload Document Workflow (FIXED)
**File:** `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`

- **Webhook Path:** `/kb-upload-document`
- **Status:** ⚠️ NEEDS IMPORT - New fixed version
- **Endpoint:** `POST https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/{storeId}:uploadToFileSearchStore`
- **Fix:** Changed from old `/corpora/{id}/documents` to new `:uploadToFileSearchStore` endpoint

## What Was Fixed

### The Problem
The original upload workflow used the old API endpoint:
```
/upload/v1beta/corpora/{corpusId}/documents
```

This endpoint returned `404 Method not found` errors.

### The Solution
Updated to the correct uploadToFileSearchStore endpoint:
```
/upload/v1beta/fileSearchStores/{storeId}:uploadToFileSearchStore
```

This is the proper way to upload documents to File Search stores introduced in the November 2025 Gemini API updates.

## How to Use the Fixed Workflow

### Option 1: Import into N8N (Recommended)

1. Open your N8N instance: https://expandhealth.app.n8n.cloud
2. Click **Workflows** > **Import from File**
3. Select: `workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json`
4. Click **Import**
5. **Activate** the workflow using the toggle in the top-right
6. The webhook will be available at:
   ```
   POST https://expandhealth.app.n8n.cloud/webhook/kb-upload-document
   ```

### Option 2: Update Existing Workflow

If you already have an upload workflow imported:

1. Open the workflow in N8N
2. Click on the "Upload to Gemini" Code node
3. Find the line:
   ```javascript
   url: `https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/${extractedStoreId}/documents?key=${apiKey}`
   ```
4. Change it to:
   ```javascript
   url: `https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/${extractedStoreId}:uploadToFileSearchStore?key=${apiKey}`
   ```
5. Also update the body to include `mimeType`:
   ```javascript
   body: { displayName: fileName, mimeType: mimeType || 'text/plain' }
   ```
6. Save and test

## Testing the Workflow

Once imported and activated, test with:

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

**Expected Response:**
```json
{
  "status": "SUCCESS",
  "operationId": "fileSearchStores/expandhealth-knowledge-base-zh869gf9ylhw/upload/operations/...",
  "fileName": "test-document.md",
  "operation": { ... }
}
```

## Next Steps

1. **Import the fixed upload workflow** into N8N
2. **Test the upload** with a sample document
3. **Update The Stacks configuration** to use the store ID: `corpora/expandhealth-knowledge-base-zh869gf9ylhw`
4. **Verify The Stacks UI** can now upload documents without errors

## API Reference

The workflows use the Gemini File Search API documented at:
- File Search Stores: https://ai.google.dev/api/file-search/file-search-stores
- Upload endpoint: `uploadToFileSearchStore` method

## Troubleshooting

### If uploads still fail:

1. **Check the workflow is active** - The toggle in top-right should be ON
2. **Verify the webhook path** - Should be exactly `/kb-upload-document`
3. **Check API key** - Make sure it has File Search API access enabled
4. **Check store ID format** - Can be either `corpora/ID` or just the `ID` portion

### Common Errors:

- `404 Method not found` → Using old `/documents` endpoint instead of `:uploadToFileSearchStore`
- `404 webhook not registered` → Workflow not active or wrong webhook path
- `400 Bad Request` → Missing required fields (apiKey, storeId, fileName, content)

## Store Management

To list documents in the store:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/corpora/expandhealth-knowledge-base-zh869gf9ylhw/documents?key=YOUR_API_KEY"
```

To delete the store (if needed):
```bash
curl -X DELETE "https://generativelanguage.googleapis.com/v1beta/corpora/expandhealth-knowledge-base-zh869gf9ylhw?key=YOUR_API_KEY"
```

---

**Setup completed:** 2025-12-13
**Documents uploaded:** 5/5
**Status:** ✅ Ready for use
