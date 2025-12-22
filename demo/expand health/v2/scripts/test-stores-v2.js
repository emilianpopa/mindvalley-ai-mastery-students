/**
 * Test each File Search Store with different queries
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testStores() {
  console.log('🔍 Testing File Search Stores with multiple queries...\n');

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const storeNames = [
    'fileSearchStores/expandhealth-clinical-proto-yey8o6lpkka1',
    'fileSearchStores/expandhealthknowledgebase-3ke5n7lg98rg'
  ];

  const testQueries = [
    'What is the PK Protocol?',
    'What are HBOT treatment protocols?',
    'Tell me about IV therapy protocols',
    'What modalities does ExpandHealth offer?'
  ];

  for (const storeName of storeNames) {
    console.log(`\n📦 Store: ${storeName.split('/')[1]}`);
    console.log('═'.repeat(60));

    for (const query of testQueries) {
      console.log(`\n  Query: "${query}"`);
      console.log('  ' + '─'.repeat(50));

      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: query,
          config: {
            tools: [{
              fileSearch: {
                fileSearchStoreNames: [storeName]
              }
            }]
          }
        });

        if (response && response.text) {
          const text = response.text;
          const noInfo = text.includes('could not find') ||
                        text.includes('I\'m sorry') ||
                        text.includes('unable to find') ||
                        text.includes('No information');

          if (!noInfo && text.length > 50) {
            console.log(`  ✅ Found: ${text.substring(0, 150).replace(/\n/g, ' ')}...`);
          } else {
            console.log(`  ⚠️ No content`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message.substring(0, 50)}`);
      }
    }
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('RECOMMENDATION:');
  console.log('If no stores have content, you need to upload documents to the new store.');
  console.log('Use: node scripts/upload-kb-content.js');
}

testStores();
