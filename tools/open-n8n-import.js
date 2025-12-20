#!/usr/bin/env node

/**
 * Quick N8N Workflow Import Helper
 *
 * This script opens your N8N instance and provides copy-paste instructions
 * to import the fixed Gemini upload workflow.
 */

const path = require('path');
const { exec } = require('child_process');

const N8N_URL = 'https://expandhealth.app.n8n.cloud';
const WORKFLOW_FILE = path.join(__dirname, '../workflows/gemini-upload-document-v2-FIXED-fileSearchStores.json');

console.log('\n🔧 N8N Workflow Import Helper\n');
console.log('═'.repeat(60));
console.log('\n📋 QUICK IMPORT INSTRUCTIONS:\n');
console.log('1. Your N8N instance will open in your browser');
console.log('2. Click "Workflows" in the left sidebar');
console.log('3. Click "Import from File" button (top right)');
console.log('4. Select this file:\n');
console.log(`   ${WORKFLOW_FILE}\n`);
console.log('5. After import, toggle the workflow to ACTIVE');
console.log('6. Verify webhook URL is:\n');
console.log('   https://expandhealth.app.n8n.cloud/webhook/kb-upload-document\n');
console.log('═'.repeat(60));
console.log('\n🌐 Opening N8N in your browser...\n');

// Open N8N in default browser
const platform = process.platform;
let command;

if (platform === 'win32') {
  command = `start ${N8N_URL}`;
} else if (platform === 'darwin') {
  command = `open ${N8N_URL}`;
} else {
  command = `xdg-open ${N8N_URL}`;
}

exec(command, (error) => {
  if (error) {
    console.error('❌ Could not open browser automatically.');
    console.log(`\n💡 Please manually open: ${N8N_URL}\n`);
  } else {
    console.log('✅ Browser opened!\n');
  }

  console.log('📄 Workflow file location:');
  console.log(`   ${WORKFLOW_FILE}\n`);
  console.log('⏱️  Estimated time: 2 minutes\n');
});
