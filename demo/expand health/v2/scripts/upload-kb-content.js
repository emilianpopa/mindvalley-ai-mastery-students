/**
 * Upload KB content to File Search Store
 *
 * This script uploads all markdown files from the kb-content directory
 * to the Gemini File Search Store.
 *
 * Run with: node scripts/upload-kb-content.js
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Use the newly created store or specify an existing one
const FILE_SEARCH_STORE_ID = process.env.GEMINI_FILE_SEARCH_STORE_ID ||
                              'fileSearchStores/expandhealthkbstore-xlg7aqov18bp';

async function uploadKBContent() {
  console.log('🚀 Uploading KB content to File Search Store...\n');
  console.log(`Store ID: ${FILE_SEARCH_STORE_ID}\n`);

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY not set');
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Find KB content files
  const kbContentDir = path.join(__dirname, '..', '..', 'kb-content');

  if (!fs.existsSync(kbContentDir)) {
    console.error(`❌ KB content directory not found: ${kbContentDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(kbContentDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(kbContentDir, f));

  console.log(`📂 Found ${files.length} markdown files to upload:\n`);
  files.forEach(f => console.log(`  - ${path.basename(f)}`));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Uploading: ${fileName}`);

    try {
      // Upload the file to the File Search Store
      let operation = await genAI.fileSearchStores.uploadToFileSearchStore({
        file: filePath,
        fileSearchStoreName: FILE_SEARCH_STORE_ID,
        config: {
          displayName: fileName.replace('.md', ''),
          mimeType: 'text/markdown',
          chunkingConfig: {
            whiteSpaceConfig: {
              maxTokensPerChunk: 500,
              maxOverlapTokens: 50
            }
          }
        }
      });

      // Wait for the operation to complete
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!operation.done && attempts < maxAttempts) {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await genAI.operations.get({ operation });
        attempts++;
      }

      if (operation.done) {
        console.log(' ✅ Uploaded successfully');
        successCount++;
      } else {
        console.log(' ⏳ Upload still in progress (may complete in background)');
        successCount++;
      }

    } catch (error) {
      console.log(` ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Upload Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('═'.repeat(50));

  if (successCount > 0) {
    console.log('\n✅ Documents uploaded! The File Search Store is now populated.');
    console.log('\n📝 Make sure this environment variable is set in Railway:');
    console.log(`   GEMINI_FILE_SEARCH_STORE_ID=${FILE_SEARCH_STORE_ID}`);
  }
}

uploadKBContent();
