#!/usr/bin/env node

/**
 * Test N8N Webhook
 *
 * Checks if the N8N webhook is active and working
 */

const WEBHOOK_URL = 'https://expandhealth.app.n8n.cloud/webhook/kb-upload-document';
const GEMINI_API_KEY = 'AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo';
const STORE_ID = 'expandhealth-knowledge-base-zh869gf9ylhw';

async function testWebhook() {
  console.log('\n🧪 Testing N8N Webhook\n');
  console.log('═'.repeat(60));
  console.log(`\nWebhook URL: ${WEBHOOK_URL}\n`);

  // Create a test document
  const testContent = `# Test Document

This is a test document created at ${new Date().toISOString()}

If you see this in your knowledge base, the N8N webhook is working!
`;

  const base64Content = Buffer.from(testContent, 'utf-8').toString('base64');

  const payload = {
    apiKey: GEMINI_API_KEY,
    storeId: STORE_ID,
    fileName: `test-webhook-${Date.now()}.md`,
    mimeType: 'text/plain',
    content: base64Content
  };

  console.log('📤 Sending test upload request...\n');
  console.log(`File: ${payload.fileName}`);
  console.log(`Size: ${(base64Content.length / 1024).toFixed(2)} KB\n`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.status === 404) {
      console.log('❌ WEBHOOK NOT ACTIVE\n');
      console.log('The N8N workflow is not imported or not activated.\n');
      console.log('📋 To fix this:\n');
      console.log('1. Go to: https://expandhealth.app.n8n.cloud');
      console.log('2. Click "Workflows" → "Import from File"');
      console.log('3. Select: workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json');
      console.log('4. Click "Activate" (toggle in top right)\n');
      console.log('💡 Note: Your uploader UI at http://localhost:3001/uploader.html');
      console.log('   works WITHOUT N8N, so you can use that instead!\n');
      return;
    }

    if (response.ok) {
      console.log('✅ WEBHOOK IS WORKING!\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n🎉 The N8N workflow is active and processing uploads!\n');
      console.log('💡 Check your N8N executions to see the workflow run:');
      console.log('   https://expandhealth.app.n8n.cloud/workflows\n');
    } else {
      console.log('⚠️  WEBHOOK RETURNED ERROR\n');
      console.log('Response:');
      console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      console.log('\n💡 The workflow exists but encountered an error.');
      console.log('   Check the workflow in N8N to debug.\n');
    }

  } catch (error) {
    console.error('❌ REQUEST FAILED\n');
    console.error(`Error: ${error.message}\n`);
    console.log('💡 Possible reasons:');
    console.log('   - Network issue');
    console.log('   - N8N instance is down');
    console.log('   - Invalid webhook URL\n');
  }

  console.log('═'.repeat(60));
  console.log('\n📚 For more info, see: docs/test-n8n-workflows.md\n');
}

testWebhook();
