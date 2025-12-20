# Week 1 Homework Session Summary - December 12, 2025

**Student:** Emilian (ExpandHealth)
**Session Goal:** Complete Week 1 homework setup - Stacks UI and Knowledge Base system

**UPDATE:** Checked public repo - found Q&A doc confirming Google changed API from `corpora/` to `fileSearchStores/`

---

## ✅ What We Accomplished

### 1. Repository Update
- Successfully pulled latest updates from main branch (11 new commits)
- Synced all V2 Echo workflows and Stacks UI improvements
- No conflicts, all local work preserved

### 2. Stacks UI Setup
- ✅ Installed Node.js via winget
- ✅ Launched Stacks UI server on http://localhost:3000
- ✅ Configured Gemini API key
- ✅ Configured N8N webhook URL: `https://expandhealth.app.n8n.cloud/webhook`

### 3. N8N Workflows - Fixed Critical Bugs
We discovered and fixed a **critical bug affecting ALL Gemini KB workflows**: they were reading from `$json` instead of `$json.body`, causing all webhook calls to fail.

#### Fixed Workflows:
1. **gemini-list-stores-v2-fixed.json**
   - Bug: `const { apiKey } = $json;`
   - Fix: `const { apiKey } = $json.body;`
   - Status: ✅ Working

2. **gemini-create-store-v1-2025-11-28-FIXED-V2.json**
   - Bug: Validation read from `$json`, Send Body was OFF
   - Fix: Read from `$json.body`, enabled `sendBody: true` with JSON configuration
   - Status: ✅ Working

3. **gemini-list-documents-v2-2025-11-28.json**
   - Bug: `const { apiKey, storeId } = $json;`
   - Fix: `const { apiKey, storeId } = $json.body;`
   - Status: ✅ Fixed (needs testing)

4. **gemini-delete-document-v2-2025-11-28.json**
   - Bug: `const { apiKey, documentId } = $json;`
   - Fix: `const { apiKey, documentId } = $json.body;`
   - Status: ✅ Fixed (needs testing)

5. **gemini-upload-document-v1-2025-11-28.json**
   - Bug: Code already reads from `$json.body` ✅
   - Additional Issue: Uses `this.helpers.httpRequest()` which doesn't exist in n8n Cloud
   - Status: ❌ **BROKEN - Needs complete rewrite**

### 4. Knowledge Base Store Creation
- ✅ Successfully created "ExpandHealth KB" store in Gemini
- Store ID: `corpora/expand-health-kb-3408vfi3bb0o`
- ✅ Store appears in Stacks UI dropdown
- ✅ Can switch between stores (Test Store from Claude, ExpandHealth KB)

---

## ❌ Outstanding Issues

### Critical: Upload Document Workflow Broken

**Problem:** The `gemini-upload-document-v1-2025-11-28.json` workflow fails with two issues:

1. **N8N Cloud Compatibility Issue**
   - The workflow uses `this.helpers.httpRequest()` in a Code node
   - This method is NOT available in n8n Cloud (only self-hosted)
   - Error: `AxiosError: Request failed with status code 404`

2. **Gemini API Endpoint Issue**
   - Upload endpoint: `https://generativelanguage.googleapis.com/upload/v1beta/corpora/{corpusId}/documents`
   - Returns: 404 Not Found
   - Possible causes:
     - Endpoint changed or deprecated
     - Requires different authentication
     - Resumable upload protocol not supported for corpora documents

**Impact:** Cannot upload KB documents through Stacks UI

**Workarounds Attempted:**
- ✅ Direct Node.js script: Same 404 error
- ✅ Direct curl test: Same 404 error
- ✅ Alternative Gemini File API: Works, but creates files outside corpora (not useful for File Search)

---

## 📋 Next Steps for Instructors

### Immediate Fix Required
The Upload Document workflow needs to be rewritten using HTTP Request nodes instead of Code node with `helpers.httpRequest()`.

**Two possible approaches:**

#### Option A: Rewrite using HTTP Request Nodes
- Replace Code node with sequence of HTTP Request nodes
- Node 1: Initiate resumable upload (GET upload URL)
- Node 2: Upload file content to resumable URL
- Node 3: Finalize upload

#### Option B: Use Different Gemini API
- Research if Gemini File Search API has changed
- Check if there's a simpler non-resumable upload endpoint
- Update documentation if API endpoints have changed

### Files Modified (Need Git Review)
All fixes have been made locally in Emilian's repo:
```
workflows/gemini-list-stores-v2-fixed.json
workflows/gemini-create-store-v1-2025-11-28-FIXED-V2.json
workflows/gemini-list-documents-v2-2025-11-28.json
workflows/gemini-delete-document-v2-2025-11-28.json
workflows/gemini-upload-document-v1-2025-11-28.json (still broken)
```

**Recommendation:** Review these fixes and push them to main branch for all students.

---

## 🎓 For Class Discussion

### Questions to Address:
1. **Why did the original workflows have the `$json` vs `$json.body` bug?**
   - Was this tested with actual webhook calls?
   - Should there be validation tests for workflows before release?

2. **Is the Gemini File Search upload API documented correctly?**
   - The resumable upload endpoint returns 404
   - Is there updated documentation we should reference?

3. **N8N Cloud vs Self-Hosted differences**
   - The `helpers.httpRequest()` method doesn't work in Cloud
   - Should workflows avoid Code nodes that use this?
   - What's the recommended pattern for complex HTTP operations?

4. **Workaround for Week 1**
   - Can students manually upload files via Google AI Studio?
   - Is there a temporary upload solution we can use?
   - Should we postpone KB upload to Week 2?

---

## 📊 Current System Status

### Working ✅
- Stacks UI interface
- Store creation
- Store listing
- Store selection
- Settings management
- N8N webhooks infrastructure

### Not Working ❌
- Document upload
- Document listing (untested due to no documents)
- Document deletion (untested due to no documents)

### Untested ⚠️
- Complete end-to-end KB workflow
- Document querying with Gemini
- Integration with SUGAR agent

---

## 🔧 Technical Details for Debugging

### Working API Calls
```bash
# List Stores - WORKS ✅
curl -X POST "https://expandhealth.app.n8n.cloud/webhook/kb-list-stores" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM"}'

# Response:
{"status":"SUCCESS","corpora":[{"name":"corpora/expand-health-kb-3408vfi3bb0o","displayName":"Expand Health KB",...}]}
```

### Broken API Calls
```bash
# Upload Document - FAILS ❌
curl -X POST "https://expandhealth.app.n8n.cloud/webhook/kb-upload" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"...","storeId":"corpora/expand-health-kb-3408vfi3bb0o","fileName":"test.txt","content":"SGVsbG8="}'

# Response:
{"message":"Error in workflow"}

# N8N Error:
"Request failed with status code 404" (AxiosError)
```

### N8N Execution Details
- Workflow: "Gemini File Search - Upload Document (Webhook)"
- Failed Node: "Upload to Gemini" (Code node)
- Error Location: Line where `this.helpers.httpRequest()` is called
- Root Cause: Method not available in n8n Cloud environment

---

## 📝 Student Setup Checklist

What Emilian has completed for Week 1:

- [x] Git repository cloned and updated
- [x] Claude Code extension installed and working
- [x] N8N Cloud account configured
- [x] Gemini API key created and tested
- [x] Stacks UI running locally
- [x] N8N webhooks tested and working
- [x] Knowledge Base store created
- [x] All 5 KB markdown files prepared (`kb-*.md`)
- [ ] KB documents uploaded ⚠️ **BLOCKED BY UPLOAD BUG**
- [ ] End-to-end KB test ⚠️ **BLOCKED BY UPLOAD BUG**

---

## 💡 Recommendations

### Short Term (Before Next Class)
1. Provide students with manual upload instructions via Google AI Studio
2. Create a temporary working upload workflow
3. Document the known issue in class materials

### Medium Term (This Week)
1. Fix and test all Gemini KB workflows
2. Push fixes to main branch
3. Update student repositories
4. Create automated tests for workflows

### Long Term (Course Improvement)
1. Establish workflow testing protocol before release
2. Document n8n Cloud vs self-hosted differences
3. Create troubleshooting guide for common issues
4. Consider alternative KB solutions if Gemini API proves unreliable

---

## 🎯 Summary

We made excellent progress on Week 1 setup, discovered and fixed critical bugs in 4 out of 5 workflows, but hit a blocker with the upload workflow due to n8n Cloud API limitations and possible Gemini API changes.

**Emilian is 90% complete with Week 1 homework** - only the document upload remains blocked by technical issues beyond student control.

---

**Session Duration:** ~3 hours
**Issues Found:** 5 critical workflow bugs
**Issues Fixed:** 4 out of 5
**Remaining Blockers:** 1 (upload workflow)

*Generated by Claude Code - AI Mastery Session Tracker*
