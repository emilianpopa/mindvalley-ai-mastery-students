/**
 * Test different AI models to see which ones work
 */

const https = require('https');

const CLAUDE_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

// Test message
const TEST_PROMPT = "Generate a brief test response (max 100 words) about creating a health treatment plan.";

// Test Claude API
function testClaudeModel(modelId) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing Claude model: ${modelId}`);

    const requestData = JSON.stringify({
      model: modelId,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: TEST_PROMPT
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
            const responseText = result.content[0].text;

            console.log(`   ✅ SUCCESS (${duration}ms)`);
            console.log(`   Response length: ${responseText.length} chars`);
            console.log(`   First 100 chars: ${responseText.substring(0, 100)}...`);

            resolve({
              model: modelId,
              success: true,
              duration,
              responseLength: responseText.length,
              response: responseText,
              usage: result.usage
            });
          } catch (error) {
            console.log(`   ❌ FAILED to parse response`);
            reject(new Error(`Parse error: ${error.message}`));
          }
        } else {
          console.log(`   ❌ FAILED (${res.statusCode})`);
          console.log(`   Error: ${responseData.substring(0, 200)}`);
          resolve({
            model: modelId,
            success: false,
            statusCode: res.statusCode,
            error: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ REQUEST ERROR: ${error.message}`);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// Test Gemini API
function testGeminiModel(modelId) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing Gemini model: ${modelId}`);

    const requestData = JSON.stringify({
      contents: [{
        parts: [{ text: TEST_PROMPT }]
      }],
      generationConfig: {
        maxOutputTokens: 200
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
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
            const responseText = result.candidates[0].content.parts[0].text;

            console.log(`   ✅ SUCCESS (${duration}ms)`);
            console.log(`   Response length: ${responseText.length} chars`);
            console.log(`   First 100 chars: ${responseText.substring(0, 100)}...`);

            resolve({
              model: modelId,
              success: true,
              duration,
              responseLength: responseText.length,
              response: responseText,
              usage: result.usageMetadata
            });
          } catch (error) {
            console.log(`   ❌ FAILED to parse response`);
            reject(new Error(`Parse error: ${error.message}`));
          }
        } else {
          console.log(`   ❌ FAILED (${res.statusCode})`);
          console.log(`   Error: ${responseData.substring(0, 200)}`);
          resolve({
            model: modelId,
            success: false,
            statusCode: res.statusCode,
            error: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ REQUEST ERROR: ${error.message}`);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('═'.repeat(60));
  console.log('AI MODEL COMPATIBILITY TEST');
  console.log('═'.repeat(60));

  const results = [];

  // Test Claude models
  const claudeModels = [
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620'
  ];

  console.log('\n📘 TESTING CLAUDE MODELS');
  console.log('─'.repeat(60));

  for (const model of claudeModels) {
    try {
      const result = await testClaudeModel(model);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    } catch (error) {
      console.error(`   Error testing ${model}:`, error.message);
    }
  }

  // Test Gemini models
  const geminiModels = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  console.log('\n📗 TESTING GEMINI MODELS');
  console.log('─'.repeat(60));

  for (const model of geminiModels) {
    try {
      const result = await testGeminiModel(model);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    } catch (error) {
      console.error(`   Error testing ${model}:`, error.message);
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  const successfulModels = results.filter(r => r.success);
  const failedModels = results.filter(r => !r.success);

  console.log(`\n✅ Successful models: ${successfulModels.length}`);
  successfulModels.forEach(r => {
    console.log(`   - ${r.model} (${r.duration}ms)`);
  });

  console.log(`\n❌ Failed models: ${failedModels.length}`);
  failedModels.forEach(r => {
    console.log(`   - ${r.model} (${r.statusCode})`);
  });

  // Performance comparison
  if (successfulModels.length > 0) {
    console.log('\n📊 PERFORMANCE COMPARISON');
    console.log('─'.repeat(60));

    successfulModels.sort((a, b) => a.duration - b.duration);
    successfulModels.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.model}`);
      console.log(`   Speed: ${r.duration}ms`);
      console.log(`   Length: ${r.responseLength} chars`);
      if (r.usage) {
        console.log(`   Tokens: ${JSON.stringify(r.usage)}`);
      }
    });
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    './test-models-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );

  console.log('\n📄 Full results saved to: test-models-results.json');
  console.log('\n' + '═'.repeat(60));
}

// Run tests
runTests().catch(console.error);
