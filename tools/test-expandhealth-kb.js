#!/usr/bin/env node

/**
 * Test ExpandHealth Knowledge Base
 *
 * This script tests querying the ExpandHealth KB store
 */

const GEMINI_API_KEY = 'AIzaSyCYUCzA4Vo038s1XbryUTrurrwpWjtEcgo';
const STORE_ID = 'corpora/expandhealth-knowledge-base-zh869gf9ylhw';

async function listDocuments() {
  console.log('📚 Listing documents in ExpandHealth KB...\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${STORE_ID}/documents?key=${GEMINI_API_KEY}`
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
    console.log(`   ID: ${doc.name}`);
    console.log(`   State: ${doc.state}`);
    console.log('');
  });

  return result.documents;
}

async function queryKnowledgeBase(query) {
  console.log(`🔍 Querying: "${query}"\n`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${STORE_ID}:query?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        resultsCount: 5
      })
    }
  );

  const result = await response.json();

  if (result.error) {
    console.error('❌ Query Error:', result.error.message);
    console.error('   Status:', result.error.status);
    return;
  }

  if (!result.relevantChunks || result.relevantChunks.length === 0) {
    console.log('⚠️  No results found');
    return;
  }

  console.log(`✅ Found ${result.relevantChunks.length} relevant chunks:\n`);
  result.relevantChunks.forEach((chunk, i) => {
    console.log(`Result ${i + 1}:`);
    console.log(`Score: ${chunk.chunkRelevanceScore}`);
    console.log(`Text: ${chunk.chunk.data.stringValue.substring(0, 200)}...`);
    console.log('');
  });
}

async function main() {
  console.log('🚀 ExpandHealth Knowledge Base Test\n');
  console.log(`Store ID: ${STORE_ID}\n`);
  console.log('─'.repeat(60));
  console.log('');

  try {
    // Step 1: List documents
    const docs = await listDocuments();

    if (!docs || docs.length === 0) {
      console.log('❌ No documents found. Store may still be processing uploads.');
      return;
    }

    console.log('─'.repeat(60));
    console.log('');

    // Step 2: Test queries
    await queryKnowledgeBase('What services does ExpandHealth offer?');

    console.log('─'.repeat(60));
    console.log('');

    await queryKnowledgeBase('What is the brand voice of ExpandHealth?');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
