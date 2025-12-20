/**
 * Test the best available AI models for treatment plan generation
 */

const https = require('https');

const CLAUDE_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyBzKRDUkk-xmwAEh1UHN6e__buHsjbZroM';

// Realistic treatment plan test prompt
const TEST_PROMPT = `Generate a comprehensive treatment plan for this patient:

PATIENT: Sarah Johnson, 42-year-old female

CONVERSATION:
Patient reports chronic fatigue for 6 months, difficulty sleeping, brain fog, and low energy throughout the day. Has tried caffeine but it makes symptoms worse. No major medical conditions but feels "not herself."

LAB RESULTS:
Vitamin D: 18 ng/mL (Low - Reference: 30-100)
B12: 280 pg/mL (Low-normal - Reference: 200-900)
Ferritin: 15 ng/mL (Low - Reference: 15-150)
TSH: 3.2 mIU/L (Normal - Reference: 0.4-4.0)
Fasting Glucose: 95 mg/dL (Normal - Reference: 70-100)

Create a detailed treatment plan that includes supplements, modalities, and lifestyle recommendations. Focus on addressing the fatigue and nutrient deficiencies. Be specific with dosages and protocols.`;

// Test Claude API
function testClaudeModel(modelId, maxTokens) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${modelId}`);
    console.log(`   Max output tokens: ${maxTokens}`);

    const requestData = JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
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
            console.log(`   Output length: ${responseText.length} chars`);
            console.log(`   Tokens used: Input=${result.usage.input_tokens}, Output=${result.usage.output_tokens}`);
            console.log(`   First 200 chars: ${responseText.substring(0, 200)}...`);

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
function testGeminiModel(modelId, maxTokens) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${modelId}`);
    console.log(`   Max output tokens: ${maxTokens}`);

    const requestData = JSON.stringify({
      contents: [{
        parts: [{ text: TEST_PROMPT }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens
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
            console.log(`   Output length: ${responseText.length} chars`);
            console.log(`   Tokens used: ${JSON.stringify(result.usageMetadata)}`);
            console.log(`   First 200 chars: ${responseText.substring(0, 200)}...`);

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
  console.log('═'.repeat(70));
  console.log('TREATMENT PLAN GENERATION MODEL TEST');
  console.log('Testing with realistic patient case');
  console.log('═'.repeat(70));

  const results = [];

  // Test Claude Haiku (current model)
  console.log('\n📘 CLAUDE MODELS');
  console.log('─'.repeat(70));

  try {
    const haikuResult = await testClaudeModel('claude-3-haiku-20240307', 4096);
    results.push(haikuResult);
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('   Error testing Claude Haiku:', error.message);
  }

  // Test best Gemini models (based on output token limits)
  console.log('\n📗 GEMINI MODELS');
  console.log('─'.repeat(70));

  const geminiModels = [
    { id: 'gemini-2.5-flash', maxTokens: 8192, name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', maxTokens: 8192, name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash-001', maxTokens: 8192, name: 'Gemini 2.0 Flash Stable' }
  ];

  for (const model of geminiModels) {
    try {
      const result = await testGeminiModel(model.id, model.maxTokens);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   Error testing ${model.name}:`, error.message);
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('RESULTS SUMMARY');
  console.log('═'.repeat(70));

  const successfulModels = results.filter(r => r.success);
  const failedModels = results.filter(r => !r.success);

  console.log(`\n✅ Successful models: ${successfulModels.length}`);
  successfulModels.forEach(r => {
    console.log(`   - ${r.model}`);
    console.log(`     Speed: ${r.duration}ms`);
    console.log(`     Output: ${r.responseLength} chars`);
  });

  console.log(`\n❌ Failed models: ${failedModels.length}`);
  failedModels.forEach(r => {
    console.log(`   - ${r.model} (${r.statusCode})`);
  });

  // Detailed comparison
  if (successfulModels.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('DETAILED COMPARISON');
    console.log('═'.repeat(70));

    successfulModels.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.model.toUpperCase()}`);
      console.log('─'.repeat(70));
      console.log(`Speed: ${r.duration}ms`);
      console.log(`Output length: ${r.responseLength} chars`);
      console.log(`Tokens: ${JSON.stringify(r.usage)}`);
      console.log(`\nSample output (first 500 chars):`);
      console.log(r.response.substring(0, 500));
      console.log('...\n');
    });

    // Recommendations
    console.log('═'.repeat(70));
    console.log('RECOMMENDATIONS');
    console.log('═'.repeat(70));

    const fastestModel = successfulModels.sort((a, b) => a.duration - b.duration)[0];
    const longestOutput = successfulModels.sort((a, b) => b.responseLength - a.responseLength)[0];

    console.log(`\n⚡ Fastest: ${fastestModel.model} (${fastestModel.duration}ms)`);
    console.log(`📝 Longest output: ${longestOutput.model} (${longestOutput.responseLength} chars)`);

    // Cost analysis
    console.log('\n💰 ESTIMATED COSTS PER REQUEST:');
    console.log('─'.repeat(70));

    successfulModels.forEach(r => {
      let costEstimate = 'Unknown';
      if (r.model.includes('haiku')) {
        // Claude Haiku: $0.25 per 1M input tokens, $1.25 per 1M output tokens
        const inputCost = (r.usage.input_tokens / 1000000) * 0.25;
        const outputCost = (r.usage.output_tokens / 1000000) * 1.25;
        costEstimate = `$${(inputCost + outputCost).toFixed(4)}`;
      } else if (r.model.includes('gemini')) {
        // Gemini Flash: Free tier (60 RPM, 1500 RPD)
        // After free tier: $0.075 per 1M input tokens, $0.30 per 1M output tokens
        costEstimate = 'FREE (within quota)';
      }
      console.log(`${r.model}: ${costEstimate}`);
    });
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    './model-comparison-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      testPrompt: TEST_PROMPT,
      results
    }, null, 2)
  );

  console.log('\n📄 Full results saved to: model-comparison-results.json');
  console.log('═'.repeat(70));
}

// Run tests
runTests().catch(console.error);
