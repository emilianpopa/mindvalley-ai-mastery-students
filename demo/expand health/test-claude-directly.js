/**
 * Direct Test of ExpandHealth AI (No N8N Needed)
 *
 * This script calls Claude API directly to generate a treatment plan
 * Use this to verify your Claude API key works and see the AI in action!
 *
 * Usage: node "demo/expand health/test-claude-directly.js"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CLAUDE_API_KEY = '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';

// Load John Smith case
const sampleCasePath = path.join(__dirname, 'sample-patient-case.md');
const sampleCase = fs.readFileSync(sampleCasePath, 'utf-8');

// Extract conversation
const transcriptMatch = sampleCase.match(/## Doctor-Patient Conversation Transcript([\s\S]*?)---\n\n## Lab Results/);
const conversation = transcriptMatch ? transcriptMatch[1].trim() : '';

// Extract labs
const labsMatch = sampleCase.match(/## Lab Results \(Received 1 Week Later\)([\s\S]*?)---\n\n## Clinical Assessment Summary/);
const labs = labsMatch ? labsMatch[1].trim() : '';

console.log('\n🚀 ExpandHealth AI - Direct Test\n');
console.log('📋 Patient: John Smith (45M)\n');
console.log('⏳ Generating treatment plan... (15-30 seconds)\n');

// Prepare Claude API request
const requestData = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  system: 'You are SUGAR, the clinical intelligence agent for ExpandHealth longevity clinics. Generate comprehensive, evidence-based treatment plans that integrate ExpandHealth therapies (HBOT, IV nutrients, NAD+, red light, sauna, peptides). Use the ExpandHealth brand voice: clear, warm, confident, and empowering. Always explain the "why" behind recommendations.',
  messages: [
    {
      role: 'user',
      content: `Generate a comprehensive treatment plan for this patient.

## PATIENT CONVERSATION:
${conversation}

## LAB RESULTS:
${labs}

## PROTOCOLS TO REFERENCE:

### Metabolic Syndrome Protocol
Key interventions: Mediterranean diet, berberine 500mg 2x/day, omega-3 2-4g/day, CoQ10 200mg/day, magnesium 400-600mg/day, vitamin D 4000 IU/day.

HBOT: 20 sessions over 6-10 weeks (2-3x/week) at 1.5-2.0 ATA for 60-90 min. Improves insulin sensitivity, reduces inflammation, enhances mitochondrial function.

NAD+ IV: Weekly for 4 weeks (250-500mg), then maintenance every 2-4 weeks. Supports cellular energy, DNA repair, metabolic optimization.

Expected outcomes: 4-week targets - energy +30-50%, weight loss 2-4kg, glucose reduction 10-20 mg/dL. 12-week targets - HbA1c <6.0%, LDL reduction 20-30%, reversal of metabolic syndrome.

### Chronic Fatigue Protocol
Core supplements: CoQ10 200-400mg/day, L-Carnitine 1500-3000mg/day, PQQ 20mg/day, Rhodiola 300-600mg/day, vitamin D 4000-10,000 IU/day, magnesium 400-600mg/day.

NAD+ IV (PRIMARY): Weekly for 4-6 weeks, then every 2-4 weeks. Rapidly improves ATP production, cellular energy.

HBOT: 10-20 sessions over 4-8 weeks. Enhances mitochondrial ATP, reduces neuroinflammation, improves cognitive function.

Red Light Therapy: Daily 15-20 min (660nm + 850nm). Increases mitochondrial ATP, reduces oxidative stress, improves mood.

Sauna: 3-5x/week, 20-30 min. Cardiovascular conditioning, detox support, stress reduction.

Expected outcomes: Week 2-4 energy +10-20%, Week 6-8 energy +30-50%, Week 12 energy 60-80% of normal.

### Cardiovascular Health Protocol
Mediterranean diet, omega-3 2-4g/day, CoQ10 100-300mg/day, magnesium 400-600mg/day, vitamin K2 100-200mcg/day.

Sauna (HIGHLY RECOMMENDED): 4-7x/week, 20-30 min. Finnish studies show 4-7 sessions/week reduce CVD mortality by 50% vs <1 session/week.

HBOT: 20-40 sessions for cardiovascular optimization. Improves endothelial function, reduces inflammation.

Exercise: 150-300 min/week moderate or 75-150 min vigorous. Zone 2 training + 1-2x/week HIIT.

---

Generate the treatment plan using this structure:

# PATIENT ANALYSIS: John Smith (45M)

## CLINICAL SUMMARY
[Chief complaints, key lab findings, diagnoses, patient goals]

## KEY CORRELATIONS & INSIGHTS
[Synthesize conversation + labs, identify patterns]

## TREATMENT PLAN

### PHASE 1: FOUNDATION (Weeks 0-4)
#### Nutrition Protocol
#### Core Supplement Stack
#### Exercise Protocol
#### Lifestyle Optimization

### PHASE 2: ADVANCED THERAPIES (Weeks 4-12)
[For each ExpandHealth therapy: HBOT, NAD+ IV, Red Light, Sauna]
- Recommendation
- Rationale
- Expected Outcomes
- Why This is Right for You (personalize with patient quotes)

### PHASE 3: OPTIMIZATION & MAINTENANCE (Weeks 12+)

## EXPECTED OUTCOMES
[4-week, 12-week, 24-week targets]

## PATIENT EDUCATION & NEXT STEPS

## CLINICAL NOTES (Doctor's Private Section)

Use ExpandHealth brand voice. Include patient quotes for personalization.`
    }
  ]
};

const postData = JSON.stringify(requestData);

const options = {
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01',
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
        const treatmentPlan = result.content[0].text;

        console.log('\n✨ TREATMENT PLAN GENERATED!\n');
        console.log('═'.repeat(80));
        console.log(treatmentPlan);
        console.log('═'.repeat(80));

        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(__dirname, `treatment-plan-${timestamp}.md`);
        fs.writeFileSync(outputPath, treatmentPlan);

        console.log(`\n💾 Saved to: ${outputPath}\n`);
        console.log('🎉 SUCCESS! Your ExpandHealth AI works!\n');
        console.log('Next steps:');
        console.log('1. Review the treatment plan for clinical accuracy');
        console.log('2. Check if ExpandHealth therapies are recommended appropriately');
        console.log('3. Look for personalization (patient quotes, context)');
        console.log('4. Verify it uses ExpandHealth brand voice\n');
        console.log('💡 This proves your AI copilot works!');
        console.log('   Now you can import the N8N workflow for easier use.\n');

      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.error('Raw response:', data);
      }
    } else {
      console.error(`❌ HTTP Error ${res.statusCode}`);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check your internet connection');
  console.error('2. Verify Claude API key is correct');
  console.error('3. Make sure you have API credits\n');
});

req.write(postData);
req.end();
