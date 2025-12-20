#!/usr/bin/env node

/**
 * Direct Gemini Knowledge Base Upload (Bypasses N8N + The Stacks)
 *
 * Uses the new fileSearchStores API endpoint directly
 */

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo';
const STORE_ID = 'expandhealth-knowledge-base-zh869gf9ylhw'; // Without prefix

async function uploadDocument(filePath) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const mimeType = 'text/plain';

  console.log(`📤 Uploading: ${fileName}`);

  // Convert to base64
  const base64Content = Buffer.from(fileContent, 'utf-8').toString('base64');
  const buffer = Buffer.from(base64Content, 'base64');
  const contentLength = buffer.length;

  try {
    // Step 1: Initiate resumable upload
    console.log('   → Initiating upload...');
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/fileSearchStores/${STORE_ID}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': contentLength.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: fileName,
          mimeType: mimeType
        })
      }
    );

    const uploadUrl = startResponse.headers.get('x-goog-upload-url');

    if (!uploadUrl) {
      const errorBody = await startResponse.text();
      console.error('   ❌ Upload initiation failed');
      console.error('   Response:', errorBody);
      return null;
    }

    // Step 2: Upload and finalize
    console.log('   → Uploading content...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': contentLength.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('   ❌ Upload failed');
      console.error('   Status:', uploadResponse.status);
      console.error('   Response:', errorBody);
      return null;
    }

    const result = await uploadResponse.json();
    console.log(`   ✅ Success! Operation: ${result.name}`);

    return result;

  } catch (error) {
    console.error(`   ❌ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function listDocuments() {
  console.log('\n📚 Listing current documents in store...\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/corpora/${STORE_ID}/documents?key=${GEMINI_API_KEY}`
  );

  const result = await response.json();

  if (result.error) {
    console.error('❌ Error:', result.error.message);
    return;
  }

  if (!result.documents || result.documents.length === 0) {
    console.log('⚠️  No documents found in store');
    return;
  }

  console.log(`✅ Found ${result.documents.length} documents:\n`);
  result.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.displayName || doc.name}`);
    console.log(`   State: ${doc.state}`);
  });
  console.log('');
}

async function main() {
  console.log('\n🚀 Direct Gemini KB Upload (Bypasses The Stacks)\n');
  console.log(`Store ID: ${STORE_ID}`);
  console.log('═'.repeat(60));

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n📋 Usage:\n');
    console.log('  Upload a single file:');
    console.log('    node upload-to-kb-direct.js <file-path>\n');
    console.log('  Upload all files in a directory:');
    console.log('    node upload-to-kb-direct.js <directory-path>\n');
    console.log('  List current documents:');
    console.log('    node upload-to-kb-direct.js --list\n');
    console.log('Example:');
    console.log('  node upload-to-kb-direct.js "demo/expand health/kb-content/expand brand-voice.md"');
    console.log('  node upload-to-kb-direct.js "demo/expand health/kb-content"\n');
    process.exit(0);
  }

  if (args[0] === '--list') {
    await listDocuments();
    return;
  }

  const targetPath = args[0];

  if (!fs.existsSync(targetPath)) {
    console.error(`\n❌ Path not found: ${targetPath}\n`);
    process.exit(1);
  }

  const stats = fs.statSync(targetPath);

  if (stats.isDirectory()) {
    // Upload all .md files in directory
    const files = fs.readdirSync(targetPath)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(targetPath, f));

    console.log(`\n📁 Found ${files.length} markdown files\n`);

    for (const file of files) {
      await uploadDocument(file);
    }

  } else {
    // Upload single file
    await uploadDocument(targetPath);
  }

  console.log('\n✨ Upload complete!\n');
  console.log('💡 To verify, run: node upload-to-kb-direct.js --list\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
