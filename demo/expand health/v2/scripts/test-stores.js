/**
 * Test each File Search Store to find which one has content
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testStores() {
  console.log('🔍 Testing File Search Stores for content...\n');

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const storeNames = [
    'fileSearchStores/expand-health-kb-3408vfi3bb0o',
    'fileSearchStores/eh-knowledge-base-4bpyu8u2ur89',
    'fileSearchStores/expandhealthknowledgebase-3ke5n7lg98rg',
    'fileSearchStores/expandhealth-clinical-proto-yey8o6lpkka1'
  ];

  const testQuery = 'What are the recommended supplements for gut healing?';

  for (const storeName of storeNames) {
    console.log(`\n📦 Testing: ${storeName.split('/')[1]}`);
    console.log('─'.repeat(50));

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: testQuery,
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
        const hasContent = text.length > 100 && !text.includes('No information') && !text.includes('I don\'t have');

        if (hasContent) {
          console.log(`  ✅ HAS CONTENT`);
          console.log(`  Response preview: ${text.substring(0, 200)}...`);

          // Check for grounding metadata
          const grounding = response.candidates?.[0]?.groundingMetadata;
          if (grounding?.groundingChunks?.length > 0) {
            console.log(`  📚 ${grounding.groundingChunks.length} sources cited`);
          }
        } else {
          console.log(`  ⚠️ Empty or no relevant content`);
          console.log(`  Response: ${text.substring(0, 100)}...`);
        }
      } else {
        console.log(`  ❌ No response`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

testStores();
