/**
 * AI Prompt Template for Engagement Plan Generation
 *
 * This module provides the system prompt and user prompt templates
 * for generating engagement plans via Claude API calls.
 *
 * STRICT PROTOCOL MIRROR MODE: The AI must NOT introduce any new
 * medical content - only engagement mechanics derived from the protocol.
 */

/**
 * System prompt for strict protocol mirror engagement plan generation
 */
const ENGAGEMENT_PLAN_SYSTEM_PROMPT = `SYSTEM PROMPT — ENGAGEMENT PLAN GENERATOR (STRICT PROTOCOL MIRROR MODE)

You are Claude operating as a clinical documentation generator.

Your task: Given protocol data (extracted elements), generate an ENGAGEMENT PLAN that is STRICTLY DERIVED FROM the protocol content. The engagement plan is the operational journey (timing, check-ins, sequencing, retesting cadence) but MUST NOT introduce any new medical recommendations, new supplements, new modalities, new tests, new contraindications, or any numeric thresholds that are not explicitly present in the protocol.

PRIMARY RULE: The engagement plan's recommendations must match the protocol exactly. If something is not explicitly stated in the protocol, you must not add it.

--------------------------------------------
1) INPUTS YOU WILL RECEIVE
--------------------------------------------
- Protocol elements in JSON format (phases, supplements, clinic treatments, retest schedule, safety constraints, lifestyle protocols)
- Client name and protocol title
- Any duration/timing information from the protocol

--------------------------------------------
2) OUTPUT REQUIRED
--------------------------------------------
Produce a JSON object with these sections:

A. protocol_reference - Protocol name, client, date, source
B. overview - Purpose, phases included, success criteria (ONLY from protocol)
C. phases - Phase-by-phase engagement plan with protocol_trace for each
D. clinic_treatments - Only if present in protocol input
E. testing_schedule - Only if present in protocol input
F. safety_rules - STRICT - only from protocol, mark as "not_specified" if absent
G. maintenance_path - Non-medical exit path only
H. compliance_disclaimer - Always include

--------------------------------------------
3) STRICT CONTENT RULES (NON-NEGOTIABLE)
--------------------------------------------
3.1 Do NOT add medical content
You must not add:
- New supplements, nutraceuticals, drugs, peptides, diets, lifestyle interventions
- New clinic modalities (including "optional" suggestions)
- New lab tests or imaging
- New dosing, timing, or frequency beyond what's stated
- New contraindications, warning signs, red flags, or stop conditions
- New clinical thresholds (e.g., "BM >= 1/day", "hsCRP target", "liver enzyme cutoffs")

--------------------------------------------
3.1.1 CRITICAL MEDICAL BOUNDARY RULE (NON-NEGOTIABLE)
--------------------------------------------
You are NOT allowed to introduce:
- STOP, HOLD, PAUSE, ESCALATE, or DECISION logic
- Conditional IF/THEN statements related to symptoms, labs, tolerance, or safety
- Reinterpretation of contraindications, safety gates, or monitoring requirements

If the protocol lists:
- Contraindications → list them only as "Contraindications (as per protocol)"
- Safety gates → repeat the text verbatim, without operationalization
- Monitoring requirements → list only, do not infer actions

If the protocol does not explicitly state what action to take, you must write:
"Action not specified in protocol. Managed per supervising clinician."

Any transformation that implies a clinical decision is PROHIBITED.

--------------------------------------------
3.1.2 CONTROL LOGIC RULE (NON-NEGOTIABLE)
--------------------------------------------
For every phase, you MUST separate conditions into three exclusive blocks:

1) OK TO PROCEED IF (ALL must be true)
   - Use positive/absence statements only (e.g. "No worsening fatigue")

2) HOLD & CONTACT CLINICIAN IF (ANY true)
   - Use deterioration, intolerance, or uncertainty signals only

3) STOP IMMEDIATELY IF (ANY true)
   - Use severe, dangerous, or contraindicated signals only

NEVER place "absence of symptoms" or "stable/improving status" under HOLD or STOP.
If this rule is violated, the engagement plan is invalid and must be corrected.

3.2 You may add ONLY engagement mechanics
Allowed additions are strictly "engagement mechanics" that do not change medical content:
- Naming phases as they appear in the protocol
- Organizing the protocol into an engagement timeline
- Stating check-in timing in generic terms (e.g., "Check-in once per week") BUT only if the protocol provides an overall duration; otherwise state "Check-ins scheduled per clinic standard."
- Stating "Progress to next phase when Phase goal is met" ONLY if the protocol contains phase goals; quote/reflect those goals without inventing extra criteria.

3.3 If information is missing in protocol, handle explicitly
- If Safety details are not included: write "Not specified in protocol - follow clinic standard"
- If duration/timing is absent: write "Not specified in protocol"
- If Retest Schedule is absent: omit or set to null
- If Clinic Treatments are absent: omit or set to null

3.4 Traceability requirement
Every item must be traceable to the protocol input.
- Include a "protocol_trace" array under each phase with verbatim item names from the protocol
- Include a "source" field on each item indicating where it came from

--------------------------------------------
4) QUALITY CHECKS BEFORE OUTPUT
--------------------------------------------
Run these checks before responding:

Check 1: Did you add any supplement/modality/test not in protocol input? If yes, remove.
Check 2: Did you add any numeric targets/thresholds not in protocol? If yes, remove.
Check 3: Did you invent contraindications or warning signs? If yes, remove.
Check 4: Does every phase include "protocol_trace" with exact item names? If no, add.
Check 5: If protocol lacks durations, safety details, or timing, did you label as "Not specified in protocol"? If no, fix.
Check 6: CRITICAL - Did you introduce any STOP/HOLD/PAUSE/ESCALATE decision logic or IF/THEN conditionals for symptoms/labs/safety? If yes, REMOVE and replace with verbatim protocol text or "Action not specified in protocol. Managed per supervising clinician."

--------------------------------------------
5) OUTPUT FORMAT
--------------------------------------------
Return ONLY valid JSON matching this structure:
{
  "title": "Engagement Plan: [Protocol Title]",
  "generated_method": "AI_STRICT_PROTOCOL_MIRROR",
  "protocol_reference": { ... },
  "overview": { ... },
  "summary": "...",
  "total_weeks": number or null,
  "duration_specified_in_protocol": boolean,
  "phases": [ ... ],
  "clinic_treatments": { ... } or null,
  "testing_schedule": [ ... ] or null,
  "safety_rules": { ... },
  "maintenance_path": { ... },
  "compliance_disclaimer": "This engagement plan is derived from the provided protocol text. It does not introduce new medical recommendations. Implementation must be supervised by a licensed healthcare practitioner.",
  "alignment_verification": { ... }
}

Do not include markdown formatting, code blocks, or explanatory text outside the JSON.`;

/**
 * Build user prompt with protocol data for AI generation
 * @param {Object} options - Protocol data and metadata
 * @returns {string} User prompt for Claude API
 */
function buildEngagementPlanUserPrompt({
  clientName,
  protocolTitle,
  protocolElements,
  protocolDurationWeeks = null,
  protocolCreatedDate = null,
  templateSource = null
}) {
  const prompt = `Generate an engagement plan for the following protocol data.

PROTOCOL METADATA:
- Protocol Title: ${protocolTitle}
- Client Name: ${clientName || 'Not specified'}
- Duration (if specified): ${protocolDurationWeeks ? `${protocolDurationWeeks} weeks` : 'Not specified in protocol'}
- Created Date: ${protocolCreatedDate || 'Not specified'}
- Template Source: ${templateSource || 'Not specified'}

PROTOCOL ELEMENTS (JSON):
${JSON.stringify(protocolElements, null, 2)}

INSTRUCTIONS:
1. Generate an engagement plan STRICTLY from the above protocol elements
2. Do NOT add any supplements, treatments, tests, or safety rules not present in the input
3. Include protocol_trace arrays showing which items came from the protocol
4. Mark anything not specified as "Not specified in protocol"
5. Return ONLY valid JSON - no markdown, no explanations

Generate the engagement plan now:`;

  return prompt;
}

/**
 * Parse and validate AI-generated engagement plan
 * @param {string} aiResponse - Raw response from Claude API
 * @param {Object} protocolElements - Original protocol elements for validation
 * @returns {Object} Parsed engagement plan with validation results
 */
function parseAndValidateAIEngagementPlan(aiResponse, protocolElements) {
  let engagementPlan;

  // Try to parse JSON from response
  try {
    // Remove any markdown code blocks if present
    let cleanResponse = aiResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7);
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3);
    }
    cleanResponse = cleanResponse.trim();

    engagementPlan = JSON.parse(cleanResponse);
  } catch (parseError) {
    return {
      success: false,
      error: 'Failed to parse AI response as JSON',
      parseError: parseError.message,
      rawResponse: aiResponse.substring(0, 500)
    };
  }

  // Validate the plan follows strict protocol mirror rules
  const validation = validateAIGeneratedPlan(engagementPlan, protocolElements);

  return {
    success: validation.is_valid,
    engagement_plan: engagementPlan,
    validation: validation
  };
}

/**
 * Validate AI-generated plan against strict protocol mirror rules
 * @param {Object} plan - Generated engagement plan
 * @param {Object} protocolElements - Original protocol elements
 * @returns {Object} Validation results
 */
function validateAIGeneratedPlan(plan, protocolElements) {
  const issues = [];
  const warnings = [];

  // Build sets of valid items from protocol
  const validSupplements = new Set(
    (protocolElements?.supplements || []).map(s => s.name?.toLowerCase()).filter(Boolean)
  );
  const validTreatments = new Set(
    (protocolElements?.clinic_treatments || []).map(t => t.name?.toLowerCase()).filter(Boolean)
  );
  const validTests = new Set(
    (protocolElements?.retest_schedule || []).map(t => t.name?.toLowerCase()).filter(Boolean)
  );
  const validLifestyle = new Set(
    (protocolElements?.lifestyle_protocols || []).map(l => l.name?.toLowerCase()).filter(Boolean)
  );

  // Check 1: Validate supplements in phases
  plan.phases?.forEach((phase, idx) => {
    phase.clinical_elements?.forEach(el => {
      const name = el.name?.replace(/^(ADD:|Continue:)\s*/i, '').toLowerCase().trim();
      if (el.source === 'protocol_supplement' && !validSupplements.has(name)) {
        issues.push(`Phase ${idx + 1}: Supplement "${el.name}" not in protocol input`);
      }
      if (el.source === 'protocol_lifestyle' && !validLifestyle.has(name)) {
        issues.push(`Phase ${idx + 1}: Lifestyle item "${el.name}" not in protocol input`);
      }
    });

    // Check protocol trace exists
    if (!phase.protocol_trace || phase.protocol_trace.length === 0) {
      if (phase.clinical_elements?.length > 0) {
        warnings.push(`Phase ${idx + 1}: Missing protocol_trace`);
      }
    }
  });

  // Check 2: Validate clinic treatments
  plan.clinic_treatments?.items?.forEach(t => {
    if (!validTreatments.has(t.name?.toLowerCase())) {
      issues.push(`Clinic treatment "${t.name}" not in protocol input`);
    }
  });

  // Check 3: Validate testing schedule
  plan.testing_schedule?.forEach(t => {
    if (!validTests.has(t.name?.toLowerCase())) {
      issues.push(`Test "${t.name}" not in protocol input`);
    }
  });

  // Check 4: Scan for invented thresholds
  const planString = JSON.stringify(plan);
  const inventedPatterns = [
    { pattern: /\d+\s*(mg|mcg|IU|g|ml)/gi, type: 'dosage' },
    { pattern: /[<>=]\s*\d+/g, type: 'threshold' },
    { pattern: /\d+\s*times?\s*(per|a)\s*(day|week)/gi, type: 'frequency' }
  ];

  inventedPatterns.forEach(({ pattern, type }) => {
    const matches = planString.match(pattern);
    if (matches) {
      // Check if these are from protocol input
      const inputString = JSON.stringify(protocolElements);
      matches.forEach(match => {
        if (!inputString.includes(match)) {
          warnings.push(`Potential invented ${type}: ${match}`);
        }
      });
    }
  });

  // Check 5: Ensure required fields exist
  const requiredFields = ['title', 'phases', 'safety_rules', 'compliance_disclaimer'];
  requiredFields.forEach(field => {
    if (!plan[field]) {
      issues.push(`Missing required field: ${field}`);
    }
  });

  // Check 6: Ensure generated_method indicates AI generation
  if (plan.generated_method && !plan.generated_method.includes('AI')) {
    warnings.push('Generated method should indicate AI generation');
  }

  // Check 7: CRITICAL - Scan for prohibited decision logic patterns
  const prohibitedPatterns = [
    { pattern: /\bSTOP\s+(if|when|immediately)/gi, type: 'STOP decision logic' },
    { pattern: /\bHOLD\s+(if|when|and\s+contact)/gi, type: 'HOLD decision logic' },
    { pattern: /\bPAUSE\s+(if|when)/gi, type: 'PAUSE decision logic' },
    { pattern: /\bESCALATE\s+(if|when|within)/gi, type: 'ESCALATE decision logic' },
    { pattern: /\bif\s+.*(symptom|lab|tolerance|safety|adverse)/gi, type: 'IF/THEN conditional' }
  ];

  prohibitedPatterns.forEach(({ pattern, type }) => {
    const matches = planString.match(pattern);
    if (matches) {
      // Check if these patterns exist in the original protocol (verbatim allowed)
      const inputString = JSON.stringify(protocolElements);
      matches.forEach(match => {
        if (!inputString.toLowerCase().includes(match.toLowerCase())) {
          issues.push(`CRITICAL: Prohibited ${type} detected: "${match}" - must use verbatim protocol text or "Action not specified in protocol"`);
        }
      });
    }
  });

  return {
    is_valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    checks_passed: {
      no_invented_supplements: issues.filter(i => i.includes('Supplement')).length === 0,
      no_invented_treatments: issues.filter(i => i.includes('treatment')).length === 0,
      no_invented_tests: issues.filter(i => i.includes('Test')).length === 0,
      has_required_fields: issues.filter(i => i.includes('Missing required')).length === 0,
      protocol_traceability: warnings.filter(w => w.includes('protocol_trace')).length === 0,
      no_prohibited_decision_logic: issues.filter(i => i.includes('CRITICAL: Prohibited')).length === 0
    }
  };
}

/**
 * Get the full prompt configuration for Claude API call
 * @param {Object} options - Protocol data and metadata
 * @returns {Object} Configuration for Claude API call
 */
function getClaudeAPIConfig({
  clientName,
  protocolTitle,
  protocolElements,
  protocolDurationWeeks = null,
  protocolCreatedDate = null,
  templateSource = null
}) {
  return {
    system: ENGAGEMENT_PLAN_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildEngagementPlanUserPrompt({
          clientName,
          protocolTitle,
          protocolElements,
          protocolDurationWeeks,
          protocolCreatedDate,
          templateSource
        })
      }
    ],
    // Recommended model settings for deterministic output
    temperature: 0.1,  // Low temperature for consistent output
    max_tokens: 8000   // Enough for detailed engagement plans
  };
}

module.exports = {
  ENGAGEMENT_PLAN_SYSTEM_PROMPT,
  buildEngagementPlanUserPrompt,
  parseAndValidateAIEngagementPlan,
  validateAIGeneratedPlan,
  getClaudeAPIConfig
};
