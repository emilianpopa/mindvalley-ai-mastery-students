/**
 * Check what Gemini models are available
 */

const https = require('https');

const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

console.log('🔍 Checking available Gemini models...\n');

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${GEMINI_API_KEY}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', chunk => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const result = JSON.parse(responseData);
        console.log('✅ Available models:\n');

        result.models.forEach(model => {
          if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
            console.log(`📌 ${model.name}`);
            console.log(`   Display name: ${model.displayName}`);
            console.log(`   Description: ${model.description}`);
            console.log(`   Max input tokens: ${model.inputTokenLimit || 'N/A'}`);
            console.log(`   Max output tokens: ${model.outputTokenLimit || 'N/A'}`);
            console.log('');
          }
        });
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log(responseData);
      }
    } else {
      console.error(`❌ Error (${res.statusCode}):`, responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();
