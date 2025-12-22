/**
 * Verify KB content is queryable
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const FILE_SEARCH_STORE_ID = 'fileSearchStores/expandhealthkbstore-xlg7aqov18bp';

async function verifyKB() {
  console.log('🔍 Verifying File Search Store content...\n');

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const queries = [
    'What modalities does ExpandHealth offer?',
    'What is HBOT therapy used for?',
    'What are the ExpandHealth clinic locations?',
    'What is the metabolic syndrome protocol?'
  ];

  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('─'.repeat(60));

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [FILE_SEARCH_STORE_ID]
            }
          }]
        }
      });

      if (response && response.text) {
        const text = response.text;
        const isRelevant = !text.includes('could not find') &&
                          !text.includes("I'm sorry") &&
                          !text.includes('unable to find');

        if (isRelevant) {
          console.log(`✅ ${text.substring(0, 300).replace(/\n/g, ' ')}...`);
        } else {
          console.log(`⚠️ ${text.substring(0, 150)}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('✅ Verification complete!');
  console.log(`\nFile Search Store ID: ${FILE_SEARCH_STORE_ID}`);
  console.log('\nSet this in Railway environment variables:');
  console.log(`GEMINI_FILE_SEARCH_STORE_ID=${FILE_SEARCH_STORE_ID}`);
}

verifyKB();
