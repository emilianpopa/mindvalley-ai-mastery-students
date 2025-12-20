/**
 * Test ExpandHealth Treatment Plan Generator Workflow
 *
 * This script sends the John Smith patient case to your N8N workflow
 * and receives a complete treatment plan back.
 *
 * Usage: node demo/expand\ health/test-workflow.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// CONFIGURATION - UPDATE THIS AFTER IMPORTING WORKFLOW TO N8N
const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE';
// Example: 'https://your-instance.app.n8n.cloud/webhook/expandhealth-generate-plan'

// Load John Smith patient case
const sampleCasePath = path.join(__dirname, 'sample-patient-case.md');
const sampleCase = fs.readFileSync(sampleCasePath, 'utf-8');

// Extract conversation transcript
const transcriptMatch = sampleCase.match(/## Doctor-Patient Conversation Transcript([\s\S]*?)---\n\n## Lab Results/);
const conversationTranscript = transcriptMatch ? transcriptMatch[1].trim() : '';

// Extract lab results
const labsMatch = sampleCase.match(/## Lab Results \(Received 1 Week Later\)([\s\S]*?)---\n\n## Clinical Assessment Summary/);
const labResults = labsMatch ? labsMatch[1].trim() : '';

// Prepare request payload
const payload = {
  patientName: 'John Smith',
  patientTranscript: conversationTranscript,
  labResults: labResults
};

console.log('🚀 Testing ExpandHealth Treatment Plan Generator\n');
console.log('📋 Patient: John Smith (45M, Metabolic Syndrome + Chronic Fatigue)\n');

// Check if webhook URL is configured
if (N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
  console.error('❌ Error: Please configure your N8N webhook URL first!\n');
  console.error('Steps:');
  console.error('1. Import the workflow to N8N');
  console.error('2. Activate the workflow');
  console.error('3. Copy the webhook URL from the "Webhook" node');
  console.error('4. Update N8N_WEBHOOK_URL in this file\n');
  console.error('Example URL: https://your-instance.app.n8n.cloud/webhook/expandhealth-generate-plan\n');
  process.exit(1);
}

// Parse webhook URL
const url = new URL(N8N_WEBHOOK_URL);

// Make HTTP request
console.log(`📡 Sending request to: ${url.hostname}${url.pathname}\n`);
console.log('⏳ Generating treatment plan... (this may take 15-30 seconds)\n');

const postData = JSON.stringify(payload);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
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
    console.log('✅ Response received!\n');
    console.log('═'.repeat(80));

    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const result = JSON.parse(data);

        if (result.status === 'success') {
          console.log('\n✨ TREATMENT PLAN GENERATED SUCCESSFULLY\n');
          console.log(`Patient: ${result.patientName}`);
          console.log(`Generated: ${result.generatedAt}\n`);
          console.log('═'.repeat(80));
          console.log(result.treatmentPlan);
          console.log('═'.repeat(80));

          // Save to file
          const outputPath = path.join(__dirname, `treatment-plan-${Date.now()}.md`);
          fs.writeFileSync(outputPath, result.treatmentPlan);
          console.log(`\n💾 Treatment plan saved to: ${outputPath}\n`);

          console.log('🎉 SUCCESS! Your AI copilot is working!\n');
          console.log('Next steps:');
          console.log('1. Review the treatment plan for clinical accuracy');
          console.log('2. Check if ExpandHealth therapies are appropriately recommended');
          console.log('3. Verify the plan uses patient quotes and personalization');
          console.log('4. Test with your own patient cases\n');

        } else {
          console.error('\n❌ Error:', result.message || 'Unknown error');
          console.error(result);
        }
      } catch (error) {
        console.error('\n❌ Failed to parse response:', error.message);
        console.error('Raw response:', data);
      }
    } else {
      console.error(`\n❌ HTTP Error ${res.statusCode}`);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check your N8N webhook URL is correct');
  console.error('2. Make sure the workflow is activated in N8N');
  console.error('3. Verify your internet connection');
  console.error('4. Check if N8N instance is running\n');
});

req.write(postData);
req.end();
