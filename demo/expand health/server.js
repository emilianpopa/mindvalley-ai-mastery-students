/**
 * ExpandHealth AI Copilot - Backend Server
 * Handles Claude API calls, multiple PDF uploads, and Gemini Vision OCR
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const PORT = 3000;
const CLAUDE_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

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

// Handle Claude API request
function handleGeneratePlan(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { patientName, conversation, labs } = data;

      console.log(`\n📋 Generating plan for: ${patientName}`);

      const prompt = `Generate a comprehensive treatment plan for this patient.

## PATIENT CONVERSATION:
${conversation}

## LAB RESULTS:
${labs}

## PROTOCOLS TO REFERENCE:

### Metabolic Syndrome Protocol
Key interventions: Mediterranean diet, berberine 500mg 2x/day, omega-3 2-4g/day, CoQ10 200mg/day, magnesium 400-600mg/day, vitamin D 4000 IU/day.

HBOT: 20 sessions over 6-10 weeks (2-3x/week) at 1.5-2.0 ATA for 60-90 min. Improves insulin sensitivity, reduces inflammation, enhances mitochondrial function.

NAD+ IV: Weekly for 4 weeks (250-500mg), then maintenance every 2-4 weeks. Supports cellular energy, DNA repair, metabolic optimization.

### Chronic Fatigue Protocol
Core supplements: CoQ10 200-400mg/day, L-Carnitine 1500-3000mg/day, PQQ 20mg/day, Rhodiola 300-600mg/day, vitamin D 4000-10,000 IU/day, magnesium 400-600mg/day.

NAD+ IV (PRIMARY): Weekly for 4-6 weeks, then every 2-4 weeks. Rapidly improves ATP production, cellular energy.

HBOT: 10-20 sessions over 4-8 weeks. Enhances mitochondrial ATP, reduces neuroinflammation, improves cognitive function.

Red Light Therapy: Daily 15-20 min (660nm + 850nm). Increases mitochondrial ATP, reduces oxidative stress, improves mood.

Sauna: 3-5x/week, 20-30 min. Cardiovascular conditioning, detox support, stress reduction.

### Cardiovascular Health Protocol
Mediterranean diet, omega-3 2-4g/day, CoQ10 100-300mg/day, magnesium 400-600mg/day, vitamin K2 100-200mcg/day.

Sauna (HIGHLY RECOMMENDED): 4-7x/week, 20-30 min. Finnish studies show 4-7 sessions/week reduce CVD mortality by 50%.

HBOT: 20-40 sessions for cardiovascular optimization. Improves endothelial function, reduces inflammation.

Exercise: 150-300 min/week moderate or 75-150 min vigorous.

---

Generate using this structure:

# PATIENT ANALYSIS: ${patientName}

## CLINICAL SUMMARY
[Chief complaints, key lab findings, diagnoses, patient goals]

## KEY CORRELATIONS & INSIGHTS
[Synthesize conversation + labs]

## TREATMENT PLAN

### PHASE 1: FOUNDATION (Weeks 0-4)
#### Nutrition Protocol
#### Core Supplement Stack
#### Exercise Protocol
#### Lifestyle Optimization

### PHASE 2: ADVANCED THERAPIES (Weeks 4-12)
[HBOT, NAD+ IV, Red Light, Sauna - with rationale and personalization]

### PHASE 3: OPTIMIZATION & MAINTENANCE (Weeks 12+)

## EXPECTED OUTCOMES
[4-week, 12-week, 24-week targets]

## PATIENT EDUCATION & NEXT STEPS

## CLINICAL NOTES (Doctor's Private Section)

Use ExpandHealth brand voice: clear, warm, empowering. Include patient quotes.`;

      const requestData = JSON.stringify({
        model: 'claude-3-5-sonnet-20250514',
        max_tokens: 8000,
        system: 'You are SUGAR, the clinical intelligence agent for ExpandHealth longevity clinics. Generate comprehensive, evidence-based treatment plans that integrate ExpandHealth therapies (HBOT, IV nutrients, NAD+, red light, sauna, peptides). Use the ExpandHealth brand voice: clear, warm, confident, and empowering.',
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
            console.error('❌ Claude API error:', apiRes.statusCode);
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
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
  const form = formidable({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB max per file
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

      // Handle both single and multiple files
      let pdfFiles = [];
      if (files.pdfs) {
        pdfFiles = Array.isArray(files.pdfs) ? files.pdfs : [files.pdfs];
      }

      if (pdfFiles.length === 0) {
        throw new Error('No PDF files provided');
      }

      console.log(`   📚 Total files: ${pdfFiles.length}`);

      // Process all PDFs
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

      // Combine all extracted text
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
  console.log('\n🚀 ExpandHealth AI Copilot Server');
  console.log('═'.repeat(50));
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   - Dashboard: http://localhost:${PORT}`);
  console.log(`   - Generate Plan: POST /api/generate-plan`);
  console.log(`   - Upload PDFs: POST /api/upload-pdfs`);
  console.log(`\n💡 Open your browser and go to: http://localhost:${PORT}`);
  console.log('\n   Press Ctrl+C to stop the server\n');
  console.log('═'.repeat(50));
});
