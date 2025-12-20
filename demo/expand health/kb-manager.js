/**
 * ExpandHealth Knowledge Base Manager
 * Manages proprietary clinical content for Gemini AI queries
 * Uses direct text embedding approach (no File API needed)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';
const CONFIG_FILE = path.join(__dirname, 'kb-config.json');

// Load or initialize config
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { documents: [] };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Make API request to Gemini
function geminiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1/${path}?key=${GEMINI_API_KEY}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Add a document to the KB
function addDocument(filePath, displayName = null) {
  const fileName = path.basename(filePath);
  const docDisplayName = displayName || fileName;

  console.log(`📤 Adding to KB: ${fileName}`);

  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Save to config
    const config = loadConfig();
    config.documents = config.documents || [];

    // Check if already exists
    const existingIndex = config.documents.findIndex(d => d.fileName === fileName);
    if (existingIndex >= 0) {
      console.log(`   ⚠️  Document already exists, updating...`);
      config.documents[existingIndex] = {
        displayName: docDisplayName,
        fileName: fileName,
        content: content,
        updatedAt: new Date().toISOString()
      };
    } else {
      config.documents.push({
        displayName: docDisplayName,
        fileName: fileName,
        content: content,
        addedAt: new Date().toISOString()
      });
    }

    saveConfig(config);

    console.log(`✅ Added: ${docDisplayName}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to add ${fileName}:`, error.message);
    throw error;
  }
}

// Add all documents from a directory
function addDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  console.log(`\n📁 Found ${mdFiles.length} markdown files in ${dirPath}\n`);

  let successCount = 0;
  for (const file of mdFiles) {
    const filePath = path.join(dirPath, file);
    try {
      addDocument(filePath);
      successCount++;
    } catch (error) {
      console.error(`⚠️  Skipping ${file} due to error`);
    }
  }

  console.log(`\n✅ Successfully added ${successCount}/${mdFiles.length} files to KB`);
}

// List all documents in KB
function listDocuments() {
  const config = loadConfig();

  if (!config.documents || config.documents.length === 0) {
    console.log('No documents in knowledge base');
    return [];
  }

  console.log('\n📄 Documents in knowledge base:');
  config.documents.forEach((doc, idx) => {
    console.log(`  ${idx + 1}. ${doc.displayName}`);
    console.log(`     File: ${doc.fileName}`);
    console.log(`     Size: ${(doc.content.length / 1024).toFixed(1)} KB`);
    console.log(`     Added: ${doc.addedAt || doc.updatedAt || 'Unknown'}`);
  });

  return config.documents;
}

// Delete a document from KB
function deleteDocument(fileName) {
  console.log(`🗑️  Deleting document: ${fileName}`);

  const config = loadConfig();
  const initialLength = config.documents.length;
  config.documents = config.documents.filter(d => d.fileName !== fileName && d.displayName !== fileName);

  if (config.documents.length < initialLength) {
    saveConfig(config);
    console.log('✅ Document deleted');
    return true;
  } else {
    console.log('⚠️  Document not found');
    return false;
  }
}

// Query the KB using Gemini
async function queryKB(question) {
  const config = loadConfig();

  if (!config.documents || config.documents.length === 0) {
    throw new Error('No documents in KB. Add documents first.');
  }

  console.log(`\n🔍 Query: "${question}"\n`);

  try {
    // Build context from all documents
    const context = config.documents
      .map(doc => `=== ${doc.displayName} ===\n\n${doc.content}`)
      .join('\n\n---\n\n');

    const prompt = `Based on the following ExpandHealth clinical protocol documents, answer this question:

Question: ${question}

Clinical Protocol Context:
${context}

Provide a clear, professional answer based on the protocol information above. Include specific recommendations, dosages, or protocols mentioned in the context. Cite which documents you're referencing.`;

    const data = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const result = await geminiRequest(
      'POST',
      'models/gemini-2.5-flash:generateContent',
      data
    );

    const answer = result.candidates[0].content.parts[0].text;

    console.log('📋 Answer:\n');
    console.log(answer);
    console.log('\n📚 Sources used:');
    config.documents.forEach(doc => {
      console.log(`  - ${doc.displayName}`);
    });

    return {
      answer: answer,
      sources: config.documents.map(d => d.displayName)
    };

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    throw error;
  }
}

// Generate treatment plan using KB
async function generateTreatmentPlan(patientInfo) {
  const config = loadConfig();

  if (!config.documents || config.documents.length === 0) {
    throw new Error('No documents in KB. Add documents first.');
  }

  try {
    // Build context from all documents
    const context = config.documents
      .map(doc => `=== ${doc.displayName} ===\n\n${doc.content}`)
      .join('\n\n---\n\n');

    const prompt = `You are an ExpandHealth clinical AI assistant. Using the clinical protocols provided, generate a comprehensive treatment plan for this patient.

PATIENT INFORMATION:
${typeof patientInfo === 'string' ? patientInfo : JSON.stringify(patientInfo, null, 2)}

CLINICAL PROTOCOLS:
${context}

Based on the ExpandHealth clinical protocols above, create a detailed treatment plan that includes:

1. **Top 3 Findings** - Key health concerns identified from patient information
2. **Top 3 Recommendations** - Priority interventions based on protocols
3. **Core Protocol Breakdown** - Phased approach over 12 weeks:
   - **Supplements** (specific products, dosages, timing from protocols)
   - **ExpandHealth Modalities** (HBOT, IV therapy, NAD+, red light, sauna, PEMF - as appropriate)
   - **Lifestyle modifications** (diet, exercise, sleep, stress management)
4. **Weekly Modality Rhythm** - Specific schedule showing which days for which therapies
5. **Expected Outcomes** - Specific targets at weeks 4, 8, and 12
6. **Recommended Progress Testing** - Lab tests and biomarkers to track

Use the evidence-based protocols from the documents. Match the patient's symptoms to the appropriate protocol (metabolic syndrome, chronic fatigue, cardiovascular health, etc.). Be highly specific with all recommendations - exact supplement names, dosages, frequencies, and modality session details.

Format in clear markdown with headers and bullet points.`;

    const data = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const result = await geminiRequest(
      'POST',
      'models/gemini-2.5-flash:generateContent',
      data
    );

    const plan = result.candidates[0].content.parts[0].text;
    return {
      plan: plan,
      sources: config.documents.map(d => d.displayName)
    };

  } catch (error) {
    console.error('❌ Treatment plan generation failed:', error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'add':
        if (!args[1]) {
          console.error('Usage: node kb-manager.js add <file-path>');
          process.exit(1);
        }
        addDocument(args[1]);
        break;

      case 'add-dir':
        if (!args[1]) {
          console.error('Usage: node kb-manager.js add-dir <directory-path>');
          process.exit(1);
        }
        addDirectory(args[1]);
        break;

      case 'list':
        listDocuments();
        break;

      case 'delete':
        if (!args[1]) {
          console.error('Usage: node kb-manager.js delete <file-name>');
          process.exit(1);
        }
        deleteDocument(args[1]);
        break;

      case 'query':
      case 'ask':
        if (!args[1]) {
          console.error('Usage: node kb-manager.js query "<your question>"');
          process.exit(1);
        }
        await queryKB(args.slice(1).join(' '));
        break;

      case 'info':
        const config = loadConfig();
        console.log('\n📊 Knowledge Base Info:');
        console.log(`Documents: ${config.documents ? config.documents.length : 0}`);
        if (config.documents && config.documents.length > 0) {
          const totalSize = config.documents.reduce((sum, d) => sum + d.content.length, 0);
          console.log(`Total size: ${(totalSize / 1024).toFixed(1)} KB`);
          console.log('\nDocuments:');
          config.documents.forEach(doc => {
            console.log(`  - ${doc.displayName} (${(doc.content.length / 1024).toFixed(1)} KB)`);
          });
        }
        break;

      default:
        console.log(`
ExpandHealth Knowledge Base Manager

Usage:
  node kb-manager.js add <file-path>                 Add a document to KB
  node kb-manager.js add-dir <directory>             Add all .md files from directory
  node kb-manager.js list                            List all documents in KB
  node kb-manager.js delete <file-name>              Delete a document from KB
  node kb-manager.js query "<question>"              Query KB and get AI answer
  node kb-manager.js info                            Show KB info

Examples:
  node kb-manager.js add-dir "./kb-content"
  node kb-manager.js query "What are the key supplements for chronic fatigue?"
  node kb-manager.js list
        `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  addDocument,
  addDirectory,
  listDocuments,
  deleteDocument,
  queryKB,
  generateTreatmentPlan,
  loadConfig,
  saveConfig
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
