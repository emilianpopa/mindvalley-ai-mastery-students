/**
 * Setup File Search Store for ExpandHealth Knowledge Base
 *
 * This script creates a new File Search Store in Gemini API
 * and outputs the store ID to be used in environment variables.
 *
 * Run with: node scripts/setup-file-search-store.js
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function setupFileSearchStore() {
  console.log('🚀 Setting up File Search Store for ExpandHealth...\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY not set in environment variables');
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    // Create a new File Search Store
    console.log('📦 Creating File Search Store...');

    const createStoreResult = await genAI.fileSearchStores.create({
      config: {
        displayName: 'expandhealth-kb-store'
      }
    });

    const storeName = createStoreResult.name;

    console.log('\n✅ File Search Store created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Store Name: ${storeName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📝 Add this to your .env file or Railway environment variables:');
    console.log(`\nGEMINI_FILE_SEARCH_STORE_ID=${storeName}\n`);

    // List existing stores to confirm
    console.log('📋 Listing all File Search Stores...');
    const stores = await genAI.fileSearchStores.list();

    if (stores) {
      console.log('\nExisting stores:');
      for await (const store of stores) {
        console.log(`  - ${store.name} (${store.displayName || 'No display name'})`);
      }
    }

    return storeName;

  } catch (error) {
    console.error('❌ Error creating File Search Store:', error.message);

    if (error.message.includes('quota')) {
      console.log('\n💡 Tip: You may have reached the File Search Store limit.');
      console.log('Try listing existing stores and reusing one:');

      try {
        const stores = await genAI.fileSearchStores.list();
        console.log('\nExisting stores:');
        for await (const store of stores) {
          console.log(`  - ${store.name}`);
        }
      } catch (listError) {
        console.error('Could not list stores:', listError.message);
      }
    }

    process.exit(1);
  }
}

// Run the setup
setupFileSearchStore();
