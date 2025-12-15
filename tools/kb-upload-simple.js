#!/usr/bin/env node

/**
 * Simple KB Upload Tool (Bypasses The Stacks + N8N)
 *
 * Uploads documents directly to Gemini File Search using the new API
 */

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo';
const STORE_ID = 'expandhealth-knowledge-base-zh869gf9ylhw';

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath);

  console.log(`\n📤 Uploading: ${fileName}`);
  console.log(`   Size: ${(content.length / 1024).toFixed(2)} KB`);

  try {
    // Step 1: Start resumable upload
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/${STORE_ID}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': content.length.toString(),
          'X-Goog-Upload-Header-Content-Type': 'text/plain',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: fileName,
          mimeType: 'text/plain'
        })
      }
    );

    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Failed to get upload URL');
    }

    // Step 2: Upload content
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': content.length.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      body: content
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await uploadRes.json();
    console.log(`   ✅ Uploaded! ID: ${result.name.split('/').pop()}`);

    return result;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function listDocs() {
  console.log('\n📚 Documents in ExpandHealth KB:\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/${STORE_ID}/documents?key=${GEMINI_API_KEY}`
  );

  const data = await res.json();

  if (data.documents) {
    data.documents.forEach((doc, i) => {
      const sizeKB = (parseInt(doc.sizeBytes) / 1024).toFixed(2);
      console.log(`${i + 1}. ${doc.displayName} (${sizeKB} KB) - ${doc.state}`);
    });
    console.log(`\nTotal: ${data.documents.length} documents\n`);
  } else {
    console.log('No documents found\n');
  }
}

async function main() {
  const args = process.argv.slice(2);

  console.log('\n🚀 ExpandHealth KB Direct Upload');
  console.log('═'.repeat(60));
  console.log(`Store: ${STORE_ID}\n`);

  if (args.length === 0 || args[0] === '--list') {
    await listDocs();
    return;
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ File not found: ${filePath}\n`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);

  if (stats.isDirectory()) {
    // Upload all .md files
    const files = fs.readdirSync(filePath)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(filePath, f));

    console.log(`Found ${files.length} markdown files\n`);

    for (const file of files) {
      await uploadFile(file);
    }
  } else {
    await uploadFile(filePath);
  }

  console.log('\n✨ Done!\n');
  console.log('To verify: node kb-upload-simple.js --list\n');
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
