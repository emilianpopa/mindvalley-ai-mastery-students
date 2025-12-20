#!/usr/bin/env node

/**
 * Create ExpandHealth Gemini File Search Store and Upload Documents
 *
 * This script:
 * 1. Creates a new Gemini File Search store named "ExpandHealth Knowledge Base"
 * 2. Uploads all 5 ExpandHealth docs from demo/expand health/kb-content
 */

const fs = require('fs');
const path = require('path');

// Configuration - UPDATE THESE VALUES
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_URL || 'YOUR_N8N_WEBHOOK_URL_HERE';

// Webhook endpoints
const CREATE_STORE_WEBHOOK = `${N8N_WEBHOOK_BASE}/webhook/kb-create-store`;
const UPLOAD_DOC_WEBHOOK = `${N8N_WEBHOOK_BASE}/webhook/kb-upload-document`;

// Documents to upload
const KB_CONTENT_DIR = path.join(__dirname, '../demo/expand health/kb-content');

async function createStore() {
  console.log('📦 Creating Gemini File Search store...');

  const response = await fetch(CREATE_STORE_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: GEMINI_API_KEY,
      storeName: 'ExpandHealth Knowledge Base'
    })
  });

  const result = await response.json();

  if (result.status === 'ERROR') {
    throw new Error(`Failed to create store: ${result.error}`);
  }

  console.log('✅ Store created successfully!');
  console.log(`   Store ID: ${result.storeId}`);
  console.log(`   Store Name: ${result.storeName}`);

  return result.storeId;
}

async function uploadDocument(storeId, filePath) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  console.log(`📄 Uploading: ${fileName}...`);

  const response = await fetch(UPLOAD_DOC_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: GEMINI_API_KEY,
      storeId: storeId,
      fileName: fileName,
      fileContent: fileContent
    })
  });

  const result = await response.json();

  if (result.status === 'ERROR') {
    throw new Error(`Failed to upload ${fileName}: ${result.error}`);
  }

  console.log(`   ✅ ${fileName} uploaded (ID: ${result.documentId})`);

  return result.documentId;
}

async function main() {
  console.log('🚀 ExpandHealth Knowledge Base Setup\n');

  // Validate configuration
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('❌ Error: Please set your Gemini API key');
    console.error('   Set environment variable: GEMINI_API_KEY=your_key_here');
    process.exit(1);
  }

  if (N8N_WEBHOOK_BASE === 'YOUR_N8N_WEBHOOK_URL_HERE') {
    console.error('❌ Error: Please set your N8N webhook URL');
    console.error('   Set environment variable: N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud');
    process.exit(1);
  }

  try {
    // Step 1: Create store
    const storeId = await createStore();
    console.log('');

    // Step 2: Get all markdown files
    const files = fs.readdirSync(KB_CONTENT_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(KB_CONTENT_DIR, f));

    console.log(`📚 Found ${files.length} documents to upload\n`);

    // Step 3: Upload each document
    const documentIds = [];
    for (const filePath of files) {
      const docId = await uploadDocument(storeId, filePath);
      documentIds.push({ file: path.basename(filePath), id: docId });
    }

    // Success summary
    console.log('\n✨ All done!\n');
    console.log('📦 Store Information:');
    console.log(`   Store ID: ${storeId}`);
    console.log(`   Documents uploaded: ${documentIds.length}`);
    console.log('');
    console.log('📄 Uploaded Documents:');
    documentIds.forEach(doc => {
      console.log(`   - ${doc.file}`);
    });
    console.log('');
    console.log('💡 Next steps:');
    console.log(`   1. Save this Store ID: ${storeId}`);
    console.log('   2. Use it in your Echo workflow configuration');
    console.log('   3. Test with a sample query in The Stacks UI');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
