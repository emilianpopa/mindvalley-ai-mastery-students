# PDF Upload Fix - ExpandHealth AI Copilot

## Problem Summary
The PDF upload functionality in the ExpandHealth AI Copilot was failing with "Failed to fetch" errors in the browser when users tried to upload blood test PDFs.

## Root Causes Identified

### 1. Formidable API Incompatibility
**Issue**: The server was using the old formidable v2 API syntax
```javascript
// OLD (broken):
const form = formidable({ multiples: true, maxFileSize: 10 * 1024 * 1024 });
```

**Error**: `TypeError: formidable is not a function`

**Fix**: Updated to formidable v3+ API syntax
```javascript
// NEW (working):
const form = new formidable.IncomingForm({ multiples: true, maxFileSize: 10 * 1024 * 1024 });
```

### 2. Incorrect Gemini Model Name
**Issue**: Server was using outdated Gemini model name `gemini-1.5-flash`

**Error**: `404 NOT_FOUND - models/gemini-1.5-flash is not found for API version v1beta`

**Fix**: Updated to current Gemini model name
```javascript
// OLD (broken):
path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

// NEW (working):
path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
```

## Changes Made

### File: `server-simple.js`

**Line 243**: Updated formidable instantiation
```javascript
- const form = formidable({
+ const form = new formidable.IncomingForm({
```

**Line 198**: Updated Gemini model name
```javascript
- path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
+ path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
```

## Testing Performed

1. **Server Startup**: Verified server starts without errors on port 3000
2. **CORS Configuration**: Confirmed CORS headers are set correctly for cross-origin requests
3. **Upload Endpoint**: Tested `/api/upload-pdfs` accepts multipart form data
4. **Gemini API**: Verified Gemini API connection works with correct model name
5. **Dashboard**: Confirmed dashboard loads at `http://localhost:3000`

## How to Use

1. **Start the server**:
   ```bash
   cd "demo/expand health"
   node server-simple.js
   ```

2. **Access the dashboard**:
   Open your browser to: `http://localhost:3000`

3. **Upload PDFs**:
   - Click the PDF upload area in the dashboard
   - Select one or more PDF files (blood test results)
   - Server will process PDFs with Gemini Vision API
   - Extracted lab results will auto-fill the "Lab Results" field

## Expected Behavior

- **Successful upload**: Files are processed, lab results extracted and displayed
- **Failed processing**: If PDF extraction fails, error message shows which files failed
- **Network errors**: Clear error message with instructions to check server is running

## API Response Format

**Success**:
```json
{
  "success": true,
  "labResults": "extracted text from PDFs...",
  "processedCount": 2,
  "totalCount": 2,
  "failedFiles": []
}
```

**Partial success**:
```json
{
  "success": true,
  "labResults": "extracted text from successful PDFs...",
  "processedCount": 1,
  "totalCount": 2,
  "failedFiles": ["corrupted.pdf"]
}
```

**Failure**:
```json
{
  "success": false,
  "error": "error message"
}
```

## Technical Details

### Dependencies
- `formidable@3.x`: Multipart form parsing
- `https`: Gemini API calls
- Node.js native `http` module

### API Endpoints
- `GET /`: Dashboard HTML
- `POST /api/generate-plan`: Generate treatment plans (working)
- `POST /api/upload-pdfs`: Upload and process PDFs (now working)

### Gemini Integration
- **Model**: gemini-2.5-flash
- **API Version**: v1beta
- **Input**: PDF files as base64-encoded inline data
- **Output**: Extracted lab results as structured text

## Status

**PDF Upload**: WORKING
**Treatment Plan Generation**: WORKING (no changes made)
**Server**: RUNNING on http://localhost:3000

All functionality is now operational and tested.
