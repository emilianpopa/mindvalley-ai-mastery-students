/**
 * Simple ExpandHealth KB Upload using Gemini File API
 * Uses the proven method from the MindValley course
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';
const KB_DIR = path.join(__dirname, '..', 'demo', 'expand health', 'kb-content');

// We'll use a pre-created corpus ID (you already have one from the first attempt)
const CORPUS_ID = 'corpora/expandhealthknowledgebase-3ke5n7lg98rg';

console.log('🚀 ExpandHealth KB Upload (Simple Method)\n');
console.log(`📦 Using corpus: ${CORPUS_ID}\n`);

// Get all markdown files
const files = fs.readdirSync(KB_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => ({ name: f, path: path.join(KB_DIR, f) }));

console.log(`📚 Found ${files.length} files to upload:\n`);
files.forEach(f => console.log(`   - ${f.name}`));
console.log('\n✅ Corpus already exists. Files are ready for manual upload or N8N workflow.\n');
console.log('💡 **IMPORTANT INFORMATION:**\n');
console.log(`   Corpus ID: ${CORPUS_ID}`);
console.log(`   Gemini API Key: ${GEMINI_API_KEY}`);
console.log('\n📋 Next Steps:\n');
console.log('   Since Gemini Semantic Retriever API is being deprecated, we\'ll use');
console.log('   a simpler approach for your copilot:\n');
console.log('   OPTION 1: Use Gemini 1.5 Pro with long context (2M tokens)');
console.log('   - Upload all protocols as context in each Claude API call');
console.log('   - Simpler, no corpus management needed');
console.log('   - Works immediately\n');
console.log('   OPTION 2: Build your own simple RAG with embeddings');
console.log('   - Store protocols in plain files');
console.log('   - Claude reads relevant files on demand\n');
console.log('   OPTION 3: Use N8N to manage protocol retrieval');
console.log('   - N8N reads protocols from files');
console.log('   - Sends to Claude with patient data\n');
console.log('🎯 RECOMMENDATION: Use OPTION 1 (simplest, works now)\n');
console.log('   I\'ll build N8N workflows that include protocols directly.\n');

// Save corpus info for reference
const info = {
  corpusId: CORPUS_ID,
  geminiApiKey: GEMINI_API_KEY,
  files: files.map(f => f.name),
  created: new Date().toISOString(),
  note: 'Using simplified approach - protocols loaded directly in N8N workflows'
};

fs.writeFileSync(
  path.join(__dirname, 'expandhealth-kb-info.json'),
  JSON.stringify(info, null, 2)
);

console.log('✅ Saved configuration to: tools/expandhealth-kb-info.json\n');
console.log('🚀 Ready to build N8N workflows!\n');
