/**
 * ExpandHealth Knowledge Base Upload Script
 *
 * This script uploads all ExpandHealth protocol documents to Google Gemini File Search
 * so the AI agent can retrieve them using RAG (Retrieval Augmented Generation)
 *
 * Usage: node tools/upload-expandhealth-kb.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM'; // Your Gemini API key
const KB_CONTENT_DIR = path.join(__dirname, '..', 'demo', 'expand health', 'kb-content');

// Gemini API endpoints
const GEMINI_BASE_URL = 'generativelanguage.googleapis.com';
const STORE_NAME = 'expandhealth-knowledge-base';

// Track upload progress
let uploadedFiles = [];
let failedFiles = [];

/**
 * Step 1: Create a new corpus (knowledge base store)
 */
async function createCorpus() {
  console.log('\n📦 Creating ExpandHealth Knowledge Base corpus...\n');

  const corpusData = {
    displayName: STORE_NAME
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(corpusData);

    const options = {
      hostname: GEMINI_BASE_URL,
      path: `/v1beta/corpora?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const corpus = JSON.parse(data);
          console.log(`✅ Corpus created: ${corpus.name}`);
          console.log(`   Display name: ${corpus.displayName}`);
          resolve(corpus);
        } else {
          console.error(`❌ Failed to create corpus: ${res.statusCode}`);
          console.error(data);
          reject(new Error(`Failed to create corpus: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error creating corpus: ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Step 2: Upload a document to the corpus
 */
async function uploadDocument(corpusName, filePath, fileName) {
  console.log(`\n📄 Uploading: ${fileName}...`);

  const fileContent = fs.readFileSync(filePath, 'utf8');

  const documentData = {
    displayName: fileName,
    document: {
      name: fileName,
      inlineData: {
        mimeType: 'text/plain',
        data: Buffer.from(fileContent).toString('base64')
      }
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(documentData);

    const options = {
      hostname: GEMINI_BASE_URL,
      path: `/v1beta/${corpusName}/documents?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const document = JSON.parse(data);
          console.log(`   ✅ Uploaded successfully: ${document.name}`);
          uploadedFiles.push(fileName);
          resolve(document);
        } else {
          console.error(`   ❌ Failed to upload: ${res.statusCode}`);
          console.error(`   ${data}`);
          failedFiles.push({ fileName, error: data });
          reject(new Error(`Failed to upload: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error uploading: ${error.message}`);
      failedFiles.push({ fileName, error: error.message });
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Step 3: Get all markdown files from kb-content directory
 */
function getKBFiles() {
  const files = fs.readdirSync(KB_CONTENT_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      name: file,
      path: path.join(KB_CONTENT_DIR, file)
    }));

  return files;
}

/**
 * Step 4: Test retrieval from the corpus
 */
async function testRetrieval(corpusName, query) {
  console.log(`\n🔍 Testing retrieval with query: "${query}"...\n`);

  const queryData = {
    query: query,
    resultsCount: 3
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(queryData);

    const options = {
      hostname: GEMINI_BASE_URL,
      path: `/v1beta/${corpusName}:query?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const results = JSON.parse(data);
          console.log('📊 Retrieval Results:');

          if (results.relevantChunks && results.relevantChunks.length > 0) {
            results.relevantChunks.forEach((chunk, index) => {
              console.log(`\n   ${index + 1}. Relevance Score: ${chunk.chunkRelevanceScore}`);
              console.log(`      Source: ${chunk.chunk.name}`);
              console.log(`      Content Preview: ${chunk.chunk.data.substring(0, 200)}...`);
            });
            console.log('\n✅ Knowledge base is working! AI can retrieve protocols.');
          } else {
            console.log('   ⚠️  No results found. This might be okay if the query is very specific.');
          }

          resolve(results);
        } else {
          console.error(`❌ Failed to query: ${res.statusCode}`);
          console.error(data);
          reject(new Error(`Failed to query: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error querying: ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 ExpandHealth Knowledge Base Setup\n');
  console.log('================================================\n');

  try {
    // Step 1: Create corpus
    const corpus = await createCorpus();
    const corpusName = corpus.name;

    // Small delay to ensure corpus is ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Get all KB files
    const kbFiles = getKBFiles();
    console.log(`\n📚 Found ${kbFiles.length} protocol documents to upload:\n`);
    kbFiles.forEach(file => console.log(`   - ${file.name}`));

    // Step 3: Upload each file
    console.log('\n📤 Starting uploads...\n');
    for (const file of kbFiles) {
      try {
        await uploadDocument(corpusName, file.path, file.name);
        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ⚠️  Continuing to next file...`);
      }
    }

    // Step 4: Test retrieval
    await testRetrieval(corpusName, 'What is the protocol for treating metabolic syndrome with HBOT?');

    // Summary
    console.log('\n================================================\n');
    console.log('📊 Upload Summary:\n');
    console.log(`   ✅ Successfully uploaded: ${uploadedFiles.length} files`);
    if (failedFiles.length > 0) {
      console.log(`   ❌ Failed uploads: ${failedFiles.length} files`);
      failedFiles.forEach(fail => console.log(`      - ${fail.fileName}`));
    }

    console.log('\n✅ Knowledge Base Setup Complete!\n');
    console.log(`📝 Corpus Name: ${corpusName}`);
    console.log('   Save this corpus name - you\'ll need it for N8N workflows.\n');
    console.log('💡 Next: Build N8N Agent 4 workflow to query this knowledge base.\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Your Gemini API key is correct');
    console.error('2. You have internet connection');
    console.error('3. The kb-content directory exists and has .md files\n');
    process.exit(1);
  }
}

// Run the script
main();
