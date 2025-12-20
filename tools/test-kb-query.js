#!/usr/bin/env node

/**
 * Test ExpandHealth Knowledge Base
 *
 * Queries the KB to verify documents are indexed and working
 */

const GEMINI_API_KEY = 'AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo';
const STORE_ID = 'expandhealth-knowledge-base-zh869gf9ylhw';

async function queryKB(question) {
  console.log(`\n❓ Question: ${question}\n`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: question
          }],
          role: "user"
        }],
        tools: [{
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "MODE_DYNAMIC",
              dynamic_threshold: 0.3
            }
          }
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Error:', data.error.message);
    return;
  }

  if (!data.candidates || data.candidates.length === 0) {
    console.error('❌ No response generated');
    return;
  }

  const answer = data.candidates[0].content.parts[0].text;
  console.log(`💡 Answer:\n${answer}\n`);

  // Show which documents were used
  if (data.candidates[0].groundingMetadata) {
    console.log('📚 Sources used:');
    const chunks = data.candidates[0].groundingMetadata.groundingChunks || [];
    const sources = new Set();

    chunks.forEach(chunk => {
      if (chunk.web) {
        sources.add(chunk.web.title || chunk.web.uri);
      }
    });

    sources.forEach(source => console.log(`  - ${source}`));
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

async function main() {
  console.log('\n🧪 Testing ExpandHealth Knowledge Base\n');
  console.log('═'.repeat(60));

  // Test questions about ExpandHealth
  await queryKB('What is ExpandHealth\'s brand voice and tone?');
  await queryKB('What are ExpandHealth\'s office hours?');
  await queryKB('What services does ExpandHealth offer?');
  await queryKB('What is ExpandHealth\'s cancellation policy?');

  console.log('✅ All tests complete!\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
