#!/usr/bin/env node

/**
 * Quick script to upload Hattie B demo files to Gemini File Search
 * Usage: node upload-demo-files.js <API_KEY> <STORE_ID>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.argv[2];
const STORE_ID = process.argv[3];

if (!API_KEY || !STORE_ID) {
  console.error('Usage: node upload-demo-files.js <API_KEY> <STORE_ID>');
  console.error('Example: node upload-demo-files.js AIza... corpora/abc123');
  process.exit(1);
}

const DEMO_FILES_DIR = path.join(__dirname, '../../demo/hattieb/kb-content');
const MIME_TYPES = {
  'md': 'text/markdown',
  'txt': 'text/plain',
  'pdf': 'application/pdf'
};

async function uploadFile(filePath, displayName) {
  const ext = path.extname(filePath).slice(1);
  const mimeType = MIME_TYPES[ext] || 'text/plain';
  const fileContent = fs.readFileSync(filePath);
  const contentLength = fileContent.length;

  console.log(`\nUploading: ${displayName} (${contentLength} bytes)`);

  // Step 1: Start resumable upload
  const corpusName = STORE_ID.startsWith('corpora/') ? STORE_ID : `corpora/${STORE_ID}`;
  const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/${corpusName}/documents?key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    const startReq = https.request(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': contentLength.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`  ❌ Failed to start upload: ${res.statusCode}`);
          console.error(`  Response: ${data}`);
          return reject(new Error(`Start failed: ${res.statusCode}`));
        }

        const uploadUrl = res.headers['x-goog-upload-url'];
        if (!uploadUrl) {
          console.error('  ❌ No upload URL received');
          return reject(new Error('No upload URL'));
        }

        // Step 2: Upload the file content
        const uploadReq = https.request(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': contentLength.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
          }
        }, (uploadRes) => {
          let uploadData = '';
          uploadRes.on('data', chunk => uploadData += chunk);
          uploadRes.on('end', () => {
            if (uploadRes.statusCode >= 400) {
              console.error(`  ❌ Upload failed: ${uploadRes.statusCode}`);
              console.error(`  Response: ${uploadData}`);
              return reject(new Error(`Upload failed: ${uploadRes.statusCode}`));
            }
            console.log(`  ✅ Uploaded successfully`);
            resolve(JSON.parse(uploadData));
          });
        });

        uploadReq.on('error', reject);
        uploadReq.write(fileContent);
        uploadReq.end();
      });
    });

    startReq.on('error', reject);
    startReq.write(JSON.stringify({ displayName }));
    startReq.end();
  });
}

async function main() {
  console.log('📚 Uploading Hattie B Demo Files to Gemini File Search');
  console.log(`Store: ${STORE_ID}`);

  const files = [
    'brand-voice.md',
    'faq.md',
    'locations.md',
    'menu.md',
    'policies.md'
  ];

  for (const file of files) {
    const filePath = path.join(DEMO_FILES_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Skipping ${file} (not found)`);
      continue;
    }
    try {
      await uploadFile(filePath, file);
    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error.message);
    }
  }

  console.log('\n✅ Done! Check your Stacks UI to see the uploaded files.');
}

main().catch(console.error);
