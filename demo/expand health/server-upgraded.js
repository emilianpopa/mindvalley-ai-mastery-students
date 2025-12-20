/**
 * ExpandHealth AI Copilot - UPGRADED Server with Model Selection
 * Supports multiple AI models: Gemini 2.5 Flash, Claude 3 Haiku
 *
 * Environment Variables:
 *   AI_MODEL=gemini|claude-haiku  (default: gemini)
 *   MAX_OUTPUT_TOKENS=8192        (default: 8192)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { loadConfig } = require('./kb-manager.js');

const PORT = 3000;
const CLAUDE_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

// Model configuration (can be overridden by environment variables)
const AI_MODEL = process.env.AI_MODEL || 'gemini';  // 'gemini' or 'claude-haiku'
const MAX_OUTPUT_TOKENS = parseInt(process.env.MAX_OUTPUT_TOKENS || '8192');

// Model definitions
const MODELS = {
  'gemini': {
    name: 'Gemini 2.5 Flash',
    id: 'gemini-2.5-flash',
    maxTokens: 65536,
    cost: 'FREE',
    description: 'Fast, detailed, free (1,500 requests/day)'
  },
  'claude-haiku': {
    name: 'Claude 3 Haiku',
    id: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    cost: '$0.001/request',
    description: 'Fast, reliable, paid'
  }
};

// Serve static files
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Generate treatment plan with Gemini
async function generateWithGemini(prompt, maxTokens = MAX_OUTPUT_TOKENS) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: Math.min(maxTokens, MODELS.gemini.maxTokens)
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${MODELS.gemini.id}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData);
            const treatmentPlan = result.candidates[0].content.parts[0].text;

            console.log(`   ✅ Generated with ${MODELS.gemini.name} (${duration}ms, ${treatmentPlan.length} chars)`);

            resolve({
              treatmentPlan,
              model: MODELS.gemini.name,
              duration,
              usage: result.usageMetadata
            });
          } catch (error) {
            reject(new Error(`Gemini parse error: ${error.message}`));
          }
        } else {
          reject(new Error(`Gemini API error ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

// Generate treatment plan with Claude
async function generateWithClaude(prompt, maxTokens = MAX_OUTPUT_TOKENS) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: MODELS['claude-haiku'].id,
      max_tokens: Math.min(maxTokens, MODELS['claude-haiku'].maxTokens),
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

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData);
            const treatmentPlan = result.content[0].text;

            console.log(`   ✅ Generated with ${MODELS['claude-haiku'].name} (${duration}ms, ${treatmentPlan.length} chars)`);

            resolve({
              treatmentPlan,
              model: MODELS['claude-haiku'].name,
              duration,
              usage: result.usage
            });
          } catch (error) {
            reject(new Error(`Claude parse error: ${error.message}`));
          }
        } else {
          reject(new Error(`Claude API error ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

// Generate treatment plan with KB context
async function generateTreatmentPlanWithKB(patientInfo, model = AI_MODEL) {
  const kbConfig = loadConfig();

  if (!kbConfig.documents || kbConfig.documents.length === 0) {
    throw new Error('No documents in KB. Use fallback generation.');
  }

  // Build context from all documents
  const context = kbConfig.documents
    .map(doc => `=== ${doc.displayName} ===\n\n${doc.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are an ExpandHealth clinical AI assistant. Using the clinical protocols provided, generate a comprehensive treatment plan for this patient.

PATIENT INFORMATION:
${typeof patientInfo === 'string' ? patientInfo : JSON.stringify(patientInfo, null, 2)}

CLINICAL PROTOCOLS:
${context}

Based on the ExpandHealth clinical protocols above, create a detailed treatment plan following this EXACT structure:

# Patient Treatment Plan

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
[List 6-10 supplements with specific dosages and timing from the protocols]

**ExpandHealth Modalities**
- [Modality 1] - [Frequency per week] ([Duration])
- [Modality 2] - [Frequency per week] ([Duration])
[List HBOT, Red Light, NAD+ IV, Sauna, PEMF, etc. from protocols]

**Lifestyle**
- [Daily habit 1]
- [Daily habit 2]
- [Daily habit 3]

### MONTH 2: [Phase Name] - Weeks 5-8
[Brief phase description with adjustments]

**Supplements**
[Adjusted dosages or additions]

**ExpandHealth Modalities**
[Modified frequencies]

**Lifestyle**
[Progressive changes]

### MONTH 3: [Phase Name] - Weeks 9-12
[Brief phase description for optimization]

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

Use ExpandHealth brand voice: clear, warm, confident, empowering. Be HIGHLY specific with dosages, timing, and frequencies from the clinical protocols. Match the patient's symptoms to the appropriate protocol (metabolic syndrome, chronic fatigue, cardiovascular health, etc.).`;

  // Generate with selected model
  if (model === 'gemini') {
    return await generateWithGemini(prompt);
  } else if (model === 'claude-haiku') {
    return await generateWithClaude(prompt);
  } else {
    throw new Error(`Unknown model: ${model}`);
  }
}

// Handle treatment plan generation
async function handleGeneratePlan(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      console.log('\n📝 Generating treatment plan...');

      const data = JSON.parse(body);
      const { patientName, conversation, labs, model } = data;

      // Use model from request or default
      const selectedModel = model || AI_MODEL;
      console.log(`   🤖 Model: ${MODELS[selectedModel]?.name || selectedModel}`);

      const patientInfo = `PATIENT: ${patientName}

CONVERSATION:
${conversation}

LAB RESULTS:
${labs}`;

      let result;
      let usedKB = false;

      // Try KB-based generation first
      const kbConfig = loadConfig();
      if (kbConfig.documents && kbConfig.documents.length > 0) {
        console.log(`   📚 Using knowledge base (${kbConfig.documents.length} documents)`);
        try {
          result = await generateTreatmentPlanWithKB(patientInfo, selectedModel);
          usedKB = true;
        } catch (error) {
          console.error(`   ⚠️ KB generation failed: ${error.message}`);
          console.log(`   ⏭️  Falling back to direct generation`);
        }
      }

      // Fallback to direct generation without KB
      if (!result) {
        console.log(`   💭 Generating without KB`);

        const prompt = `Generate a comprehensive treatment plan for this patient:

${patientInfo}

Create a detailed treatment plan following this structure (use markdown formatting):

# ${patientName}'s ExpandHealth Protocol
A comprehensive 3-month recovery program integrating cutting-edge supplements with Expand Health clinical modalities.

## Top 3 Findings
[Analyze patient data and list 3 key findings]

## Top 3 Recommendations
[Based on findings, provide 3 strategic recommendations]

## Core Protocol Breakdown
Structure across 3 months with specific supplements, modalities, and lifestyle changes.

### MONTH 1: [Phase Name] - Weeks 1-4
**Supplements:** [List with dosages]
**ExpandHealth Modalities:** [HBOT, NAD+ IV, Red Light, Sauna, PEMF, etc.]
**Lifestyle:** [Daily habits]

### MONTH 2: [Phase Name] - Weeks 5-8
**Supplements:** [Adjusted dosages]
**ExpandHealth Modalities:** [Modified frequencies]
**Lifestyle:** [Progressive changes]

### MONTH 3: [Phase Name] - Weeks 9-12
**Supplements:** [Optimization phase]
**ExpandHealth Modalities:** [Maintenance]
**Lifestyle:** [Long-term habits]

## Weekly Modality Rhythm
[Day-by-day schedule showing which modalities on which days]

## Expected Outcomes
**Week 4 Targets:** [Measurable outcomes]
**Week 8 Targets:** [Measurable outcomes]
**Week 12 Targets:** [Measurable outcomes]

## Recommended Progress Testing
[Lab tests to track progress at weeks 10-12]

Use ExpandHealth brand voice: clear, warm, confident, empowering. Be specific with dosages, timing, and frequencies.`;

        if (selectedModel === 'gemini') {
          result = await generateWithGemini(prompt);
        } else if (selectedModel === 'claude-haiku') {
          result = await generateWithClaude(prompt);
        } else {
          throw new Error(`Unknown model: ${selectedModel}`);
        }
      }

      console.log('✅ Treatment plan generated');

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        treatmentPlan: result.treatmentPlan,
        model: result.model,
        duration: result.duration,
        usedKB: usedKB,
        sources: usedKB ? kbConfig.documents.map(d => d.displayName) : []
      }));

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

// Create server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Route handling
  if (req.url === '/' || req.url === '/dashboard.html') {
    serveFile(res, path.join(__dirname, 'dashboard.html'), 'text/html');
  } else if (req.url === '/api/generate-plan' && req.method === 'POST') {
    handleGeneratePlan(req, res);
  } else if (req.url === '/api/upload-pdfs' && req.method === 'POST') {
    handleUploadPDFs(req, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('\n🚀 ExpandHealth AI Copilot Server (UPGRADED)');
  console.log('═'.repeat(60));
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log('\n🤖 AI Model Configuration:');
  console.log(`   Primary model: ${MODELS[AI_MODEL]?.name || AI_MODEL}`);
  console.log(`   Model ID: ${MODELS[AI_MODEL]?.id || 'Unknown'}`);
  console.log(`   Max tokens: ${Math.min(MAX_OUTPUT_TOKENS, MODELS[AI_MODEL]?.maxTokens || 4096)}`);
  console.log(`   Cost: ${MODELS[AI_MODEL]?.cost || 'Unknown'}`);
  console.log(`   Description: ${MODELS[AI_MODEL]?.description || 'N/A'}`);
  console.log('\n📋 Available endpoints:');
  console.log('   - Dashboard: http://localhost:3000');
  console.log('   - Generate Plan: POST /api/generate-plan');
  console.log('   - Upload PDFs: POST /api/upload-pdfs');
  console.log('\n⚙️  Environment Variables:');
  console.log('   AI_MODEL=gemini|claude-haiku  (current: ' + AI_MODEL + ')');
  console.log('   MAX_OUTPUT_TOKENS=8192        (current: ' + MAX_OUTPUT_TOKENS + ')');
  console.log('\n💡 Open your browser and go to: http://localhost:3000');
  console.log('\n   Press Ctrl+C to stop the server');
  console.log('\n' + '═'.repeat(60) + '\n');
});
