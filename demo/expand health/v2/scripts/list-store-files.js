/**
 * List files in each File Search Store to find the one with content
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function listStoreFiles() {
  console.log('📋 Checking File Search Stores for content...\n');

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const storeNames = [
    'fileSearchStores/expand-health-kb-3408vfi3bb0o',
    'fileSearchStores/eh-knowledge-base-4bpyu8u2ur89',
    'fileSearchStores/expandhealthknowledgebase-3ke5n7lg98rg',
    'fileSearchStores/expandhealth-clinical-proto-yey8o6lpkka1'
  ];

  for (const storeName of storeNames) {
    console.log(`\n📦 Store: ${storeName}`);
    console.log('─'.repeat(60));

    try {
      // Try to get store details
      const store = await genAI.fileSearchStores.get({ name: storeName });
      console.log(`  Display Name: ${store.displayName || 'N/A'}`);
      console.log(`  State: ${store.state || 'N/A'}`);

      // Try to list files in the store
      try {
        const files = await genAI.fileSearchStores.listFiles({ name: storeName });
        let count = 0;
        for await (const file of files) {
          count++;
          console.log(`  📄 File ${count}: ${file.displayName || file.name}`);
          if (count >= 5) {
            console.log('  ... (more files)');
            break;
          }
        }
        if (count === 0) {
          console.log('  (No files in store)');
        }
      } catch (fileError) {
        console.log(`  Files: Unable to list (${fileError.message})`);
      }

    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}

listStoreFiles();
