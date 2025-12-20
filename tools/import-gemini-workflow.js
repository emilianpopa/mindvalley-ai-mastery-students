#!/usr/bin/env node

/**
 * Import Gemini File Search Upload Workflow into N8N
 *
 * This script programmatically imports the fixed Gemini upload workflow
 * into Emilian's N8N instance at https://expandhealth.app.n8n.cloud
 *
 * Usage: node import-gemini-workflow.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.warn('Warning: .env file not found at ' + envPath);
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return env;
}

const envVars = loadEnv();
const API_URL = process.env.N8N_API_URL || envVars.N8N_API_URL || 'https://expandhealth.app.n8n.cloud';
const API_KEY = process.env.N8N_API_KEY || envVars.N8N_API_KEY;
const WORKFLOW_FILE = path.join(__dirname, '../workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json');

if (!API_KEY) {
  console.error('ERROR: N8N_API_KEY not found in .env file');
  process.exit(1);
}

if (!fs.existsSync(WORKFLOW_FILE)) {
  console.error(`ERROR: Workflow file not found: ${WORKFLOW_FILE}`);
  process.exit(1);
}

async function importWorkflow() {
  try {
    console.log('Reading workflow file...');
    const workflowContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const workflowData = JSON.parse(workflowContent);

    console.log(`Importing workflow: "${workflowData.name}"`);
    console.log(`Target N8N instance: ${API_URL}`);

    // Prepare the workflow import payload
    const importPayload = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {},
      tags: workflowData.tags || []
    };

    // Make API request to create workflow
    const response = await makeRequest('POST', '/api/v1/workflows', importPayload);

    if (response.id) {
      console.log('\n✅ Workflow imported successfully!');
      console.log(`\nWorkflow Details:`);
      console.log(`  ID: ${response.id}`);
      console.log(`  Name: ${response.name}`);
      console.log(`  Status: ${response.active ? 'ACTIVE' : 'INACTIVE'}`);

      // If not active, recommend activating
      if (!response.active) {
        console.log(`\n⚠️  Workflow is currently INACTIVE`);
        console.log(`To activate it:`);
        console.log(`  1. Go to: ${API_URL}`);
        console.log(`  2. Open the "${workflowData.name}" workflow`);
        console.log(`  3. Click the toggle switch in the top-right to activate`);
      }

      // Get the webhook URL
      const webhookNode = workflowData.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhookNode && webhookNode.parameters.path) {
        console.log(`\nWebhook URL:`);
        console.log(`  POST ${API_URL}/webhook/${webhookNode.parameters.path}`);
        console.log(`\nTest Command:`);
        console.log(`curl -X POST ${API_URL}/webhook/${webhookNode.parameters.path} \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{`);
        console.log(`    "apiKey": "YOUR_GEMINI_API_KEY",`);
        console.log(`    "storeId": "corpora/expandhealth-knowledge-base-zh869gf9ylhw",`);
        console.log(`    "fileName": "test-document.md",`);
        console.log(`    "mimeType": "text/plain",`);
        console.log(`    "content": "VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQ="`);
        console.log(`  }'`);
      }

      return {
        success: true,
        workflowId: response.id,
        workflowName: response.name,
        webhookPath: webhookNode?.parameters.path
      };
    } else {
      throw new Error('Failed to import workflow - no ID returned');
    }
  } catch (error) {
    console.error('\n❌ Error importing workflow:');
    console.error(`   ${error.message}`);

    if (error.response) {
      console.error(`\nAPI Response:`);
      console.error(JSON.stringify(error.response, null, 2));
    }

    process.exit(1);
  }
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = data ? JSON.parse(data) : {};

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            error.response = response;
            reject(error);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Run the import
importWorkflow().then((result) => {
  console.log('\n' + '='.repeat(60));
  console.log('WORKFLOW IMPORT COMPLETE');
  console.log('='.repeat(60));
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
