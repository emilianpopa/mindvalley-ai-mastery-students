/**
 * ExpandHealth AI Copilot - Simplified Server
 * No PDF upload - just treatment plan generation
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { generateTreatmentPlan, loadConfig } = require('./kb-manager.js');

// Configuration - use environment variables in production, fallback to defaults for local dev
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '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';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

// Serve static files
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}

// Handle treatment plan generation with KB
async function handleGeneratePlan(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      console.log('\n📝 Generating treatment plan with knowledge base...');

      const data = JSON.parse(body);
      const { patientName, conversation, labs } = data;

      // Check if KB is available
      const kbConfig = loadConfig();
      if (kbConfig.documents && kbConfig.documents.length > 0) {
        console.log(`   📚 Using knowledge base (${kbConfig.documents.length} documents)`);

        // Use Gemini with KB for treatment plan generation
        const patientInfo = `PATIENT: ${patientName}

CONVERSATION:
${conversation}

LAB RESULTS:
${labs}`;

        try {
          const result = await generateTreatmentPlan(patientInfo);

          console.log('✅ Treatment plan generated with KB');

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            success: true,
            treatmentPlan: result.plan,
            sources: result.sources,
            usedKB: true
          }));
          return;

        } catch (error) {
          console.error('⚠️ KB generation failed, falling back to Claude:', error.message);
          // Fall through to Claude API below
        }
      } else {
        console.log('   ⚠️ Knowledge base empty, using Claude API');
      }

      // Fallback to Claude API
      const prompt = `Generate a comprehensive treatment plan for this patient:

PATIENT: ${patientName}

CONVERSATION:
${conversation}

LAB RESULTS:
${labs}

Create a detailed treatment plan following this EXACT structure (use markdown formatting):

# ${patientName}'s ExpandHealth Protocol
A comprehensive 3-month recovery program integrating cutting-edge supplements with Expand Health clinical modalities.

## Top 3 Findings
Comprehensive analysis reveals key factors affecting health and recovery pathways

1. [Finding 1 with brief explanation]
2. [Finding 2 with brief explanation]
3. [Finding 3 with brief explanation]

## Top 3 Recommendations
Strategic interventions for optimal recovery and long-term health

1. [Recommendation 1 - specific action]
2. [Recommendation 2 - specific action]
3. [Recommendation 3 - structured approach]

## Core Protocol Breakdown
Supplements + Modalities structured across three progressive phases

### MONTH 1: [Phase Name] - Weeks 1-4
[Brief phase description]

**Supplements**
- [Supplement 1] - [Dosage] - [Purpose]
- [Supplement 2] - [Dosage] - [Purpose]
- [Supplement 3] - [Dosage] - [Purpose]
[List 6-10 supplements with specific dosages and timing]

**ExpandHealth Modalities**
- [Modality 1] - [Frequency per week] ([Duration])
- [Modality 2] - [Frequency per week] ([Duration])
[List HBOT, Red Light, NAD+ IV, Sauna, PEMF, etc.]

**Lifestyle**
- [Daily habit 1]
- [Daily habit 2]
- [Daily habit 3]

### MONTH 2: [Phase Name] - Weeks 5-8
[Brief phase description]

**Supplements**
[Adjusted dosages or additions]

**ExpandHealth Modalities**
[Modified frequencies]

**Lifestyle**
[Progressive changes]

### MONTH 3: [Phase Name] - Weeks 9-12
[Brief phase description]

**Supplements**
[Optimization phase]

**ExpandHealth Modalities**
[Maintenance frequencies]

**Lifestyle**
[Long-term habits]

## Weekly Modality Rhythm
Optimized therapy schedule for ExpandHealth Clinics

**MONDAY**
[Specific modalities + timing], [Supplement focus]

**TUESDAY**
[Specific modalities + timing], [Supplement focus]

**WEDNESDAY**
[Specific modalities + timing], [Supplement focus]

**THURSDAY**
[Specific modalities + timing], [Activities]

**FRIDAY**
[Specific modalities + timing], [Recovery focus]

**WEEKEND**
[Activities, rest, recovery protocols]

## Expected Outcomes

**Week 4 Targets:**
- [Specific measurable outcome 1]
- [Specific measurable outcome 2]

**Week 8 Targets:**
- [Specific measurable outcome 1]
- [Specific measurable outcome 2]

**Week 12 Targets:**
- [Specific measurable outcome 1]
- [Specific measurable outcome 2]

## Recommended Progress Testing
Optional re-tests at Week 10-12 to track progress and optimize outcomes

- [Test 1] - [What it measures]
- [Test 2] - [What it measures]
- [Test 3] - [What it measures]

Use ExpandHealth brand voice: clear, warm, confident, empowering. Be specific with dosages, timing, and frequencies.`;

      const requestData = JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let responseData = '';

        apiRes.on('data', chunk => {
          responseData += chunk;
        });

        apiRes.on('end', () => {
          console.log('✅ Treatment plan generated');

          if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
            const result = JSON.parse(responseData);
            const treatmentPlan = result.content[0].text;

            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              success: true,
              treatmentPlan: treatmentPlan
            }));
          } else {
            console.error('❌ Claude API error:', apiRes.statusCode, responseData);
            res.writeHead(apiRes.statusCode, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              success: false,
              error: responseData
            }));
          }
        });
      });

      apiReq.on('error', (error) => {
        console.error('❌ Request error:', error);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });

      apiReq.write(requestData);
      apiReq.end();

    } catch (error) {
      console.error('❌ Error:', error);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
}

// Process PDF with Gemini Vision
async function processPDFWithGemini(fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    console.log(`   📄 Processing: ${fileName}`);

    const base64Data = fileBuffer.toString('base64');

    const geminiPrompt = `Extract ALL lab results from this blood test report. Format as:

Test Name: Value (Reference Range) - Status

Include all metabolic markers, lipids, vitamins, hormones, inflammatory markers, and any other tests present.`;

    const geminiData = JSON.stringify({
      contents: [{
        parts: [
          { text: geminiPrompt },
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Data
            }
          }
        ]
      }]
    });

    const geminiOptions = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(geminiData)
      }
    };

    const geminiReq = https.request(geminiOptions, (geminiRes) => {
      let responseData = '';

      geminiRes.on('data', chunk => {
        responseData += chunk;
      });

      geminiRes.on('end', () => {
        if (geminiRes.statusCode >= 200 && geminiRes.statusCode < 300) {
          try {
            const result = JSON.parse(responseData);
            const extractedText = result.candidates[0].content.parts[0].text;
            console.log(`   ✅ Extracted from: ${fileName}`);
            resolve(extractedText);
          } catch (error) {
            console.error(`   ❌ Failed to parse response for: ${fileName}`);
            reject(new Error(`Failed to parse Gemini response: ${error.message}`));
          }
        } else {
          console.error(`   ❌ Gemini API error for: ${fileName} (${geminiRes.statusCode})`);
          reject(new Error(`Gemini API error: ${responseData}`));
        }
      });
    });

    geminiReq.on('error', (error) => {
      console.error(`   ❌ Request error for: ${fileName}`);
      reject(error);
    });

    geminiReq.write(geminiData);
    geminiReq.end();
  });
}

// Handle multiple PDF uploads
function handleUploadPDFs(req, res) {
  const form = new formidable.IncomingForm({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Form parse error:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to parse upload: ' + err.message
      }));
      return;
    }

    try {
      console.log('\n📤 Processing PDF uploads...');

      let pdfFiles = [];
      if (files.pdfs) {
        pdfFiles = Array.isArray(files.pdfs) ? files.pdfs : [files.pdfs];
      }

      if (pdfFiles.length === 0) {
        throw new Error('No PDF files provided');
      }

      console.log(`   📚 Total files: ${pdfFiles.length}`);

      const results = [];
      for (const file of pdfFiles) {
        try {
          const fileBuffer = fs.readFileSync(file.filepath);
          const extractedText = await processPDFWithGemini(fileBuffer, file.originalFilename || file.newFilename);
          results.push({
            filename: file.originalFilename || file.newFilename,
            text: extractedText
          });
        } catch (error) {
          console.error(`   ⚠️  Failed to process ${file.originalFilename}:`, error.message);
          results.push({
            filename: file.originalFilename || file.newFilename,
            error: error.message
          });
        }
      }

      const combinedText = results
        .filter(r => r.text)
        .map(r => `\n=== ${r.filename} ===\n${r.text}`)
        .join('\n');

      const failedFiles = results.filter(r => r.error);

      console.log(`✅ Processed ${results.length - failedFiles.length}/${results.length} files successfully\n`);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        labResults: combinedText,
        processedCount: results.length - failedFiles.length,
        totalCount: results.length,
        failedFiles: failedFiles.map(f => f.filename)
      }));

    } catch (error) {
      console.error('❌ Upload error:', error);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
}

// KB Management API endpoints
const { saveConfig, deleteDocument } = require('./kb-manager.js');

// Patient Database Functions
const PATIENTS_FILE = path.join(__dirname, 'patients.json');

function loadPatients() {
  try {
    if (fs.existsSync(PATIENTS_FILE)) {
      const data = fs.readFileSync(PATIENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading patients:', error);
  }
  return { patients: [] };
}

function savePatients(data) {
  fs.writeFileSync(PATIENTS_FILE, JSON.stringify(data, null, 2));
}

function handleKBUpload(req, res) {
  const form = new formidable.IncomingForm({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }

    try {
      let docFiles = [];
      if (files.documents) {
        docFiles = Array.isArray(files.documents) ? files.documents : [files.documents];
      }

      const config = loadConfig();
      let uploaded = 0;

      for (const file of docFiles) {
        const content = fs.readFileSync(file.filepath, 'utf8');
        // Debug: log all file properties to see what's available
        console.log('File properties:', Object.keys(file));
        console.log('originalFilename:', file.originalFilename);
        console.log('newFilename:', file.newFilename);
        console.log('mimetype:', file.mimetype);
        const title = file.originalFilename || file.newFilename || 'untitled';

        config.documents.push({
          title,
          content,
          size: content.length,
          addedAt: new Date().toISOString()
        });
        uploaded++;
      }

      saveConfig(config);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, uploaded }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

function handleKBInfo(req, res) {
  try {
    const config = loadConfig();
    const totalSize = config.documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
    const lastUpdated = config.documents.length > 0
      ? config.documents[config.documents.length - 1].addedAt
      : null;

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      success: true,
      documentCount: config.documents.length,
      totalSize,
      lastUpdated
    }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleKBList(req, res) {
  try {
    const config = loadConfig();
    const documents = config.documents.map(doc => ({
      title: doc.title,
      size: doc.size || doc.content.length,
      addedAt: doc.addedAt || new Date().toISOString()
    }));

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, documents }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleKBView(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const title = url.searchParams.get('title');

    const config = loadConfig();
    const doc = config.documents.find(d => d.title === title);

    if (!doc) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: 'Document not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, content: doc.content }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleKBDelete(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const { title } = JSON.parse(body);
      const config = loadConfig();
      const index = config.documents.findIndex(d => d.title === title);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: 'Document not found' }));
        return;
      }

      config.documents.splice(index, 1);
      saveConfig(config);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

// Patient Management API endpoints
function handlePatientSave(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      console.log('\n💾 Saving patient record...');
      const patientData = JSON.parse(body);
      console.log(`   Patient: ${patientData.patientName}`);
      const db = loadPatients();

      // Generate unique ID if not exists
      if (!patientData.id) {
        patientData.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      }

      patientData.updatedAt = new Date().toISOString();

      // Check if patient exists (update) or new (create)
      const existingIndex = db.patients.findIndex(p => p.id === patientData.id);
      if (existingIndex >= 0) {
        db.patients[existingIndex] = patientData;
      } else {
        patientData.createdAt = patientData.updatedAt;
        db.patients.push(patientData);
      }

      savePatients(db);

      console.log(`✅ Patient saved with ID: ${patientData.id}`);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, patient: patientData }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

function handlePatientsList(req, res) {
  try {
    const db = loadPatients();

    // Sort by most recent first
    const patients = db.patients.sort((a, b) =>
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, patients }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handlePatientView(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get('id');

    const db = loadPatients();
    const patient = db.patients.find(p => p.id === id);

    if (!patient) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: 'Patient not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, patient }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handlePatientDelete(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const { id } = JSON.parse(body);
      const db = loadPatients();
      const index = db.patients.findIndex(p => p.id === id);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: 'Patient not found' }));
        return;
      }

      db.patients.splice(index, 1);
      savePatients(db);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}

// Create server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Route handling
  if (req.url === '/' || req.url === '/dashboard.html') {
    serveFile(res, path.join(__dirname, 'dashboard.html'), 'text/html');
  } else if (req.url === '/kb-admin' || req.url === '/kb-admin.html') {
    serveFile(res, path.join(__dirname, 'kb-admin.html'), 'text/html');
  } else if (req.url === '/api/generate-plan' && req.method === 'POST') {
    handleGeneratePlan(req, res);
  } else if (req.url === '/api/upload-pdfs' && req.method === 'POST') {
    handleUploadPDFs(req, res);
  } else if (req.url === '/api/kb/upload' && req.method === 'POST') {
    handleKBUpload(req, res);
  } else if (req.url === '/api/kb/info' && req.method === 'GET') {
    handleKBInfo(req, res);
  } else if (req.url === '/api/kb/list' && req.method === 'GET') {
    handleKBList(req, res);
  } else if (req.url.startsWith('/api/kb/view') && req.method === 'GET') {
    handleKBView(req, res);
  } else if (req.url === '/api/kb/delete' && req.method === 'DELETE') {
    handleKBDelete(req, res);
  } else if (req.url === '/patients' || req.url === '/patients.html') {
    serveFile(res, path.join(__dirname, 'patients.html'), 'text/html');
  } else if (req.url === '/api/patients/save' && req.method === 'POST') {
    handlePatientSave(req, res);
  } else if (req.url === '/api/patients/list' && req.method === 'GET') {
    handlePatientsList(req, res);
  } else if (req.url.startsWith('/api/patients/view') && req.method === 'GET') {
    handlePatientView(req, res);
  } else if (req.url === '/api/patients/delete' && req.method === 'DELETE') {
    handlePatientDelete(req, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ExpandHealth AI Copilot Server (SIMPLIFIED)');
  console.log('═'.repeat(50));
  console.log(`\n✅ Server running on port: ${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log('   - Dashboard: /');
  console.log('   - Patients: /patients');
  console.log('   - KB Admin: /kb-admin');
  console.log('   - Generate Plan: POST /api/generate-plan');
  console.log('   - Upload PDFs: POST /api/upload-pdfs');
  console.log('\n' + '═'.repeat(50) + '\n');
});
