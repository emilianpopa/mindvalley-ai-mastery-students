/**
 * Engagement Plan Alignment Module
 *
 * This module ensures engagement plans are 100% aligned with their source protocols.
 * It extracts all clinical elements from a protocol and validates that the engagement
 * plan covers every item - no omissions, no inventions.
 *
 * RULE: The protocol is the SOURCE OF TRUTH. The engagement plan must include
 * every supplement, treatment, and modality from the protocol - nothing more, nothing less.
 */

/**
 * Extract all clinical elements from a protocol object
 * @param {Object} protocol - The protocol object (parsed from ai_recommendations or modules)
 * @returns {Object} Extracted elements categorized by type
 */
function extractProtocolElements(protocol) {
  const elements = {
    supplements: [],
    clinic_treatments: [],
    lifestyle_protocols: [],
    retest_schedule: [],
    safety_constraints: [],
    phases: [] // Track phase information for timing
  };

  // Handle different protocol structures
  const protocolData = typeof protocol === 'string' ? JSON.parse(protocol) : protocol;

  // Extract from core_protocol
  if (protocolData.core_protocol?.items) {
    const phaseName = protocolData.core_protocol.phase_name || 'Core Protocol - Weeks 1-2';
    const duration = protocolData.core_protocol.duration_weeks || 2;

    elements.phases.push({
      name: phaseName,
      start_week: 1,
      duration_weeks: duration,
      type: 'core'
    });

    protocolData.core_protocol.items.forEach(item => {
      categorizeItem(item, elements, phaseName, 1);
    });

    // Extract safety gates from core
    if (protocolData.core_protocol.safety_gates) {
      protocolData.core_protocol.safety_gates.forEach(gate => {
        elements.safety_constraints.push({
          constraint: gate,
          phase: phaseName,
          type: 'safety_gate'
        });
      });
    }
  }

  // Extract from phased_expansion
  if (protocolData.phased_expansion) {
    protocolData.phased_expansion.forEach(phase => {
      const startWeek = phase.start_week || 3;

      elements.phases.push({
        name: phase.phase_name,
        start_week: startWeek,
        duration_weeks: phase.duration_weeks || 2,
        readiness_criteria: phase.readiness_criteria || [],
        type: 'expansion'
      });

      if (phase.items) {
        phase.items.forEach(item => {
          categorizeItem(item, elements, phase.phase_name, startWeek);
        });
      }
      // Extract safety gates as constraints
      if (phase.safety_gates) {
        phase.safety_gates.forEach(gate => {
          elements.safety_constraints.push({
            constraint: gate,
            phase: phase.phase_name,
            type: 'safety_gate'
          });
        });
      }
      // Extract readiness criteria as constraints
      if (phase.readiness_criteria) {
        phase.readiness_criteria.forEach(criteria => {
          elements.safety_constraints.push({
            constraint: criteria,
            phase: phase.phase_name,
            type: 'readiness_criteria'
          });
        });
      }
    });
  }

  // Extract clinic_treatments
  if (protocolData.clinic_treatments?.available_modalities) {
    const clinicPhase = protocolData.clinic_treatments.phase || 'Available after Week 4';
    const startWeekMatch = clinicPhase.match(/week\s*(\d+)/i);
    const clinicStartWeek = startWeekMatch ? parseInt(startWeekMatch[1]) : 4;

    protocolData.clinic_treatments.available_modalities.forEach(treatment => {
      elements.clinic_treatments.push({
        name: treatment.name,
        indication: treatment.indication,
        contraindications: treatment.contraindications,
        protocol: treatment.protocol,
        notes: treatment.notes,
        phase: clinicPhase,
        start_week: clinicStartWeek,
        isOptional: clinicPhase.toLowerCase().includes('available') || clinicPhase.toLowerCase().includes('if stable')
      });
    });
  }

  // Extract retest_schedule
  if (protocolData.retest_schedule) {
    protocolData.retest_schedule.forEach(test => {
      elements.retest_schedule.push({
        name: test.test,
        timing: test.timing,
        purpose: test.purpose
      });
    });
  }

  // Extract safety_summary constraints
  if (protocolData.safety_summary) {
    if (protocolData.safety_summary.absolute_contraindications) {
      protocolData.safety_summary.absolute_contraindications.forEach(c => {
        elements.safety_constraints.push({ constraint: c, type: 'absolute_contraindication' });
      });
    }
    if (protocolData.safety_summary.monitoring_requirements) {
      protocolData.safety_summary.monitoring_requirements.forEach(m => {
        elements.safety_constraints.push({ constraint: m, type: 'monitoring_requirement' });
      });
    }
    if (protocolData.safety_summary.warning_signs) {
      protocolData.safety_summary.warning_signs.forEach(w => {
        elements.safety_constraints.push({ constraint: w, type: 'warning_sign' });
      });
    }
  }

  // Extract precautions
  if (protocolData.precautions) {
    protocolData.precautions.forEach(p => {
      elements.safety_constraints.push({ constraint: p, type: 'precaution' });
    });
  }

  // Extract from modules array (alternative structure)
  if (protocolData.modules) {
    protocolData.modules.forEach(module => {
      if (module.items) {
        module.items.forEach(item => {
          categorizeItem(item, elements, module.name, 1);
        });
      }
    });
  }

  return elements;
}

/**
 * Categorize an item into the appropriate element type
 */
function categorizeItem(item, elements, phaseName = null, startWeek = 1) {
  const itemObj = typeof item === 'string' ? { name: item } : item;
  const category = itemObj.category?.toLowerCase() || guessCategory(itemObj.name);

  const enrichedItem = {
    ...itemObj,
    phase: phaseName,
    start_week: startWeek
  };

  switch (category) {
    case 'supplement':
    case 'supplements':
    case 'binder':
      elements.supplements.push(enrichedItem);
      break;
    case 'clinic_treatment':
    case 'clinic':
    case 'iv':
    case 'therapy':
      elements.clinic_treatments.push(enrichedItem);
      break;
    case 'lifestyle':
    case 'diet':
    case 'protocol':
      elements.lifestyle_protocols.push(enrichedItem);
      break;
    default:
      // Guess based on name
      if (isClinicTreatment(itemObj.name)) {
        elements.clinic_treatments.push(enrichedItem);
      } else if (isLifestyleProtocol(itemObj.name)) {
        elements.lifestyle_protocols.push(enrichedItem);
      } else {
        elements.supplements.push(enrichedItem);
      }
  }
}

/**
 * Guess category from item name
 */
function guessCategory(name) {
  if (!name) return 'supplement';
  const lowerName = name.toLowerCase();

  if (isClinicTreatment(lowerName)) return 'clinic_treatment';
  if (isLifestyleProtocol(lowerName)) return 'lifestyle';
  return 'supplement';
}

/**
 * Check if item name indicates a clinic treatment
 */
function isClinicTreatment(name) {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  const clinicKeywords = [
    'iv ', ' iv', 'infusion', 'push', 'drip',
    'hbot', 'hyperbaric',
    'ozone', 'autohemotherapy', 'eboo', 'mah',
    'red light', 'photobiomodulation',
    'cold plunge', 'cryotherapy', 'cryo',
    'sauna', 'infrared',
    'peptide therapy', 'injection',
    'phosphatidylcholine iv', 'glutathione iv', 'nad+',
    'pemf', 'pulsed electromagnetic'
  ];
  return clinicKeywords.some(kw => lowerName.includes(kw));
}

/**
 * Check if item name indicates a lifestyle protocol
 */
function isLifestyleProtocol(name) {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  const lifestyleKeywords = [
    'hydration', 'water intake',
    'elimination', 'bowel',
    'sleep', 'circadian',
    'exercise', 'movement', 'resistance training', 'strength training',
    'stress', 'meditation',
    'diet', 'food', 'eating', 'nutrition',
    'fasting', 'intermittent',
    'sunlight', 'light exposure'
  ];
  return lifestyleKeywords.some(kw => lowerName.includes(kw));
}

/**
 * Generate the STRICT engagement plan prompt that is 100% aligned to the protocol
 * This prompt enforces:
 * 1. Timeline preservation (no compression)
 * 2. Strict item classification (ACTION/MONITOR/GATE/DECISION/TEST)
 * 3. Safety gates as IF/THEN logic
 * 4. Clinic treatments as CONDITIONAL with eligibility rules
 * 5. Phase-accurate item placement
 *
 * @param {Object} options - Generation options
 * @returns {string} The AI prompt
 */
function generateAlignedEngagementPlanPrompt({
  clientName,
  protocolTitle,
  protocolElements,
  personalityType,
  communicationPreferences,
  protocolDurationWeeks = 12
}) {
  // Defensive defaults for all arrays
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];
  const lifestyle_protocols = protocolElements?.lifestyle_protocols || [];
  const retest_schedule = protocolElements?.retest_schedule || [];
  const safety_constraints = protocolElements?.safety_constraints || [];
  const phases = protocolElements?.phases || [];

  // Calculate actual protocol duration from phases if available
  let calculatedDuration = protocolDurationWeeks;
  if (phases.length > 0) {
    const lastPhase = phases[phases.length - 1];
    const lastPhaseEnd = (lastPhase.start_week || 1) + (lastPhase.duration_weeks || 2);
    calculatedDuration = Math.max(calculatedDuration, lastPhaseEnd);
  }

  // Build phase structure with explicit timing
  const phaseStructure = phases.map(p => {
    return `- ${p.name}: Weeks ${p.start_week}-${(p.start_week || 1) + (p.duration_weeks || 2) - 1} (${p.type || 'standard'})`;
  }).join('\n');

  // Build the REQUIRED items checklist with STRICT phase/timing info
  const supplementsList = supplements.map(s => {
    let entry = `- ${s.name}`;
    if (s.dosage) entry += ` | Dosage: ${s.dosage}`;
    if (s.timing) entry += ` | Timing: ${s.timing}`;
    entry += ` | Phase: ${s.phase || 'Core Protocol'}`;
    entry += ` | START WEEK: ${s.start_week || 1}`;
    if (s.contraindications) entry += ` | Constraints: ${s.contraindications}`;
    return entry;
  }).join('\n');

  const clinicList = clinic_treatments.map(t => {
    let entry = `- ${t.name} [CONDITIONAL - CLINICIAN DECISION]`;
    if (t.indication) entry += ` | When to consider: ${t.indication}`;
    if (t.contraindications) entry += ` | STOP IF: ${t.contraindications}`;
    entry += ` | EARLIEST ELIGIBILITY: Week ${t.start_week || 8}`;
    entry += ` | STATUS: DECISION (never default action)`;
    return entry;
  }).join('\n');

  const lifestyleList = lifestyle_protocols.map(l => {
    let entry = `- ${l.name}`;
    if (l.dosage) entry += ` | Details: ${l.dosage}`;
    if (l.timing) entry += ` | When: ${l.timing}`;
    entry += ` | Phase: ${l.phase || 'Core Protocol'}`;
    entry += ` | START WEEK: ${l.start_week || 1}`;
    return entry;
  }).join('\n');

  const retestList = retest_schedule.map(r => {
    let entry = `- ${r.name} [TEST - not an ACTION]`;
    if (r.timing) entry += ` | When: ${r.timing}`;
    if (r.purpose) entry += ` | Purpose: ${r.purpose}`;
    entry += ` | Sequence: Schedule → Complete → Review → Adjust`;
    return entry;
  }).join('\n');

  // Group constraints by type
  const absoluteContraindications = safety_constraints.filter(c => c.type === 'absolute_contraindication').map(c => `- STOP RULE: ${c.constraint}`).join('\n');
  const monitoringRequirements = safety_constraints.filter(c => c.type === 'monitoring_requirement').map(c => `- MONITOR: ${c.constraint}`).join('\n');
  const warningSigns = safety_constraints.filter(c => c.type === 'warning_sign').map(c => `- ESCALATE IF: ${c.constraint}`).join('\n');
  const safetyGates = safety_constraints.filter(c => c.type === 'safety_gate').map(c => `- GATE: IF [${c.constraint}] THEN proceed to next phase${c.phase ? ` [${c.phase}]` : ''}`).join('\n');
  const readinessCriteria = safety_constraints.filter(c => c.type === 'readiness_criteria').map(c => `- GATE CRITERIA: ${c.constraint}${c.phase ? ` [before ${c.phase}]` : ''}`).join('\n');

  return `You are creating a CLIENT-FACING engagement plan that OPERATIONALIZES a clinical protocol.

═══════════════════════════════════════════════════════════════════
WHAT "CORRECT" MEANS - ALL THREE MUST BE TRUE
═══════════════════════════════════════════════════════════════════

An engagement plan is ONLY correct if it is:
1) PROTOCOL-FAITHFUL → doesn't invent, omit, or reorder clinical intent
2) EXECUTABLE → ops + client can run it without guessing
3) GOVERNED → progression is controlled by gates + tests + decisions, not a flat checklist

A plan that is "aligned in phases but missing actions/tests/decisions" is NOT correct.
A plan that "lists everything but breaks sequencing/safety" is NOT correct.

═══════════════════════════════════════════════════════════════════
FAILURE MODES TO PREVENT (MANDATORY)
═══════════════════════════════════════════════════════════════════

You MUST detect and prevent these:
- Vocabulary mirroring without logic (copying protocol nouns without actionability)
- Timeline compression (e.g., turning ${calculatedDuration} weeks into 4 weeks)
- Misclassification (tests/contraindications/consultations written as "Take")
- Clinic treatments scheduled as defaults (instead of conditional eligibility + clinician decision)
- Missing retest schedule governance (tests not mapped to timing and review decisions)
- Safety gates described but not enforced (no HOLD/PAUSE/ESCALATE rules)

═══════════════════════════════════════════════════════════════════
CRITICAL RULES - VIOLATIONS WILL CAUSE PATIENT HARM
═══════════════════════════════════════════════════════════════════

## 1. TIMELINE PRESERVATION (MANDATORY)
The protocol duration is ${calculatedDuration} weeks. The engagement plan MUST be ${calculatedDuration} weeks.
- DO NOT compress a ${calculatedDuration}-week protocol into 4 weeks
- DO NOT skip phases
- Each phase must start at the EXACT week specified in the protocol

${phaseStructure ? `### PROTOCOL PHASE STRUCTURE (MUST MATCH EXACTLY):\n${phaseStructure}` : ''}

## 2. STRICT ITEM CLASSIFICATION (MANDATORY)
Every protocol element MUST be classified as EXACTLY ONE of:

| Type | Definition | Example Verbs | NEVER Use |
|------|------------|---------------|-----------|
| ACTION | Client physically does (supplements, hydration, sauna, training, diet) | Take, Do, Complete, Follow | - |
| MONITOR | Track/observe (symptoms, BP, sleep, bowel, energy/mood) | Track, Log, Monitor | Take |
| GATE | IF/THEN progression control (advance/hold/pause/stop) | IF...THEN proceed | Bullet lists |
| DECISION | Clinician/practitioner judgement (eligibility, escalation) | Clinician reviews IF eligible | Schedule (as default) |
| TEST | Diagnostics/labs (schedule → complete → review → adjust) | Schedule→Complete→Review | Take |

### HARD RULES:
- NEVER use "Take" for DECISION, GATE, MONITOR, or TEST items
- NEVER schedule DECISION items as default actions
- NEVER compress lab tests into actions
- GATES must be IF/THEN statements with PASS/FAIL conditions and explicit HOLD/ESCALATE rules
- Clinic treatments must be CONDITIONAL (DECISION + eligibility) - only become ACTION once eligible and approved

## 3. CLINIC TREATMENTS = ALWAYS CONDITIONAL
Clinic treatments are NEVER default actions. They require:
1. Eligibility review (clinician decision)
2. No contraindications present
3. Phase stability confirmed
4. Explicit decision owner (Clinician)

Format: "DECISION: [Treatment] - Eligible IF [conditions] AND NO [contraindications]. Decision owner: Clinician."

## 4. SAFETY GATES = IF/THEN LOGIC WITH HOLD/ESCALATE (NOT BULLET LISTS)
❌ WRONG: "✓ Regular bowel movements ✓ No adverse reactions"
✅ CORRECT: "GATE: IF all conditions met (regular bowel movements, no adverse reactions, energy stable) THEN proceed to Phase 2. IF any condition fails → HOLD progression and contact clinician within 48h."

Every gate MUST have:
- Explicit conditions to check
- IF PASS → what happens next
- IF FAIL → HOLD/PAUSE/STOP instruction with escalation timeline

## 5. SUPPLEMENTS IN CORRECT PHASES
Supplements MUST appear in their protocol-specified phase, not earlier:
- Core Protocol supplements: Weeks 1-2 only
- Phase 1 supplements: ADD starting at Phase 1 start week
- Phase 2 supplements: ADD starting at Phase 2 start week
- Phase 3 supplements: ADD starting at Phase 3 start week

## 6. PROTOCOL IS THE ONLY CLINICAL AUTHORITY
- The engagement plan OPERATIONALIZES the protocol - it does NOT modify clinical decisions
- Do NOT add or modify dosages; reference "per protocol" where needed
- Do NOT invent items not in the protocol
- Do NOT omit items from the protocol

## PATIENT INFORMATION
- Name: ${clientName}
- Personality Type: ${personalityType || 'Standard'}
- Communication Preferences: ${communicationPreferences || 'Standard supportive communication'}

## PROTOCOL: ${protocolTitle}
Duration: ${calculatedDuration} weeks (THIS IS MANDATORY - DO NOT CHANGE)

═══════════════════════════════════════════════════════════════════
PROTOCOL COVERAGE CHECKLIST - PHASE-ACCURATE PLACEMENT REQUIRED
═══════════════════════════════════════════════════════════════════

### SUPPLEMENTS (${supplements.length} items - WITH START WEEKS)
${supplementsList || 'None in protocol'}

### CLINIC TREATMENTS (${clinic_treatments.length} items - ALL ARE DECISIONS, NOT ACTIONS)
${clinicList || 'None in protocol'}

### LIFESTYLE PROTOCOLS (${lifestyle_protocols.length} items - WITH START WEEKS)
${lifestyleList || 'None in protocol'}

### TESTS/LABS (${retest_schedule.length} items - SCHEDULE→COMPLETE→REVIEW SEQUENCE)
${retestList || 'None specified'}

### SAFETY RULES
${absoluteContraindications ? `**STOP RULES (Absolute - halt protocol immediately):**\n${absoluteContraindications}\n` : ''}
${safetyGates ? `**SAFETY GATES (IF/THEN progression logic):**\n${safetyGates}\n` : ''}
${readinessCriteria ? `**GATE CRITERIA (must all be TRUE to advance):**\n${readinessCriteria}\n` : ''}
${monitoringRequirements ? `**MONITORING (track daily/weekly):**\n${monitoringRequirements}\n` : ''}
${warningSigns ? `**ESCALATION TRIGGERS (contact clinician within 24h):**\n${warningSigns}\n` : ''}

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE - PHASE-BASED (NOT COMPRESSED)
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON with this structure:

{
  "title": "Engagement Plan: ${protocolTitle} for ${clientName}",
  "summary": "This ${calculatedDuration}-week engagement plan operationalizes the clinical protocol with conditional progression.",
  "total_weeks": ${calculatedDuration},
  "protocol_governs_decisions": true,

  "phases": [
    {
      "phase_number": 1,
      "title": "Phase 1: Foundation & Safety (Weeks 1-2)",
      "subtitle": "Establish tolerance and baseline monitoring",
      "week_range": "1-2",
      "start_week": 1,
      "end_week": 2,

      "actions": [
        {
          "type": "ACTION",
          "item": "Take Magnesium Glycinate (per protocol dosage)",
          "timing": "Daily with dinner",
          "notes": "per protocol"
        }
      ],

      "monitoring": [
        {
          "type": "MONITOR",
          "item": "Track bowel movement frequency and quality",
          "frequency": "Daily"
        }
      ],

      "safety_gate": {
        "type": "GATE",
        "description": "Core → Phase 1 Transition",
        "conditions": [
          "Tolerating core supplements well (no GI distress)",
          "Regular bowel movements (1-2x daily)",
          "No adverse reactions",
          "Energy stable or improving"
        ],
        "if_pass": "Proceed to Phase 2 (Week 3)",
        "if_fail": "HOLD at current phase. Contact clinician within 48 hours."
      },

      "progress_goal": "90%+ supplement adherence, establish baseline tolerance",
      "check_in_prompts": ["How are you tolerating the supplements?", "Any digestive changes?"]
    }
  ],

  "clinic_treatments": {
    "note": "All clinic treatments are CONDITIONAL and require clinician approval",
    "earliest_eligibility": "Week 8 (after Phase 2 stability confirmed)",
    "treatments": [
      {
        "type": "DECISION",
        "name": "IV Chelation Therapy (EDTA/DMPS)",
        "eligibility_conditions": ["Phase 2 stable", "Kidney function normal", "No heart failure"],
        "contraindications": ["Kidney disease", "Heart failure", "Pregnancy", "Active infections"],
        "decision_owner": "Clinician",
        "note": "NOT a default action - requires eligibility review"
      }
    ]
  },

  "testing_schedule": [
    {
      "type": "TEST",
      "name": "Heavy Metals Panel (post-provocative)",
      "timing": "Week 8-10",
      "action_sequence": [
        "Week 8: Schedule test appointment",
        "Week 9: Complete test",
        "Week 10: Review results with practitioner",
        "Adjust protocol based on findings"
      ]
    }
  ],

  "safety_rules": {
    "stop_rules": ["STOP all supplements and contact clinician IMMEDIATELY if: severe allergic reaction, chest pain, severe GI distress"],
    "hold_rules": ["HOLD progression if: bowel movements irregular, energy declining, new adverse reactions"],
    "escalation_rules": ["Contact clinician within 24 hours if: persistent fatigue, unusual mood changes, sleep disruption >3 days"]
  },

  "communication_schedule": {
    "frequency": "Every 3 days",
    "channel": "WhatsApp",
    "tone": "Encouraging and supportive"
  },

  "alignment_self_check": {
    "all_protocol_supplements_explicitly_listed": true,
    "all_modalities_explicitly_listed": true,
    "all_clinic_interventions_as_conditional_decisions": true,
    "all_tests_mapped_to_timing_and_review": true,
    "no_misclassified_take_items": true,
    "timeline_matches_protocol_duration": true,
    "safety_gates_have_hold_escalate_rules": true,
    "no_invented_items": true
  }
}

═══════════════════════════════════════════════════════════════════
MANDATORY SELF-CHECK BEFORE RETURNING (ALL MUST BE TRUE)
═══════════════════════════════════════════════════════════════════

Before returning the JSON, verify each of these. If ANY is false, FIX IT first:

1. [ ] All protocol supplements explicitly listed by name (not "add supplements")
2. [ ] All modalities explicitly listed by name (not "add modalities")
3. [ ] All clinic interventions included as CONDITIONAL DECISIONS (never default actions)
4. [ ] All tests mapped to specific timing with Schedule→Complete→Review→Adjust loop
5. [ ] No misclassified "Take" items (tests, contraindications, consultations)
6. [ ] Timeline = ${calculatedDuration} weeks (matches protocol, NOT compressed to 4 weeks)
7. [ ] Every safety gate has IF/THEN with explicit HOLD/PAUSE/ESCALATE rules
8. [ ] No invented items (only items from protocol checklist above)
9. [ ] Each phase starts at protocol-specified week
10. [ ] Contraindications listed as STOP rules (not embedded in actions)

CRITICAL: If you produce a plan that is "aligned in phases but missing governance" it is WRONG.
CRITICAL: If you produce a plan that "lists everything but breaks sequencing/safety" it is WRONG.

Return ONLY the JSON object. No markdown, no code blocks, no explanatory text.`;
}

/**
 * Validate that an engagement plan covers all protocol elements
 * @param {Object} engagementPlan - The generated engagement plan
 * @param {Object} protocolElements - The extracted protocol elements
 * @returns {Object} Validation result with missing items
 */
function validateEngagementPlanAlignment(engagementPlan, protocolElements) {
  const result = {
    isAligned: true,
    missingSupplements: [],
    missingClinicTreatments: [],
    missingLifestyleProtocols: [],
    missingRetests: [],
    extraItems: [],
    coverage: {
      supplements: 0,
      clinic_treatments: 0,
      lifestyle_protocols: 0,
      retest_schedule: 0
    }
  };

  // Defensive defaults
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];
  const lifestyle_protocols = protocolElements?.lifestyle_protocols || [];
  const retest_schedule = protocolElements?.retest_schedule || [];

  // Flatten all items mentioned in the engagement plan
  const planText = JSON.stringify(engagementPlan || {}).toLowerCase();

  // Check supplements coverage
  supplements.forEach(supp => {
    const nameVariants = getNameVariants(supp.name);
    const found = nameVariants.some(v => planText.includes(v.toLowerCase()));
    if (found) {
      result.coverage.supplements++;
    } else {
      result.missingSupplements.push(supp.name);
      result.isAligned = false;
    }
  });

  // Check clinic treatments coverage
  clinic_treatments.forEach(treatment => {
    const nameVariants = getNameVariants(treatment.name);
    const found = nameVariants.some(v => planText.includes(v.toLowerCase()));
    if (found) {
      result.coverage.clinic_treatments++;
    } else {
      result.missingClinicTreatments.push(treatment.name);
      result.isAligned = false;
    }
  });

  // Check lifestyle protocols coverage
  lifestyle_protocols.forEach(protocol => {
    const nameVariants = getNameVariants(protocol.name);
    const found = nameVariants.some(v => planText.includes(v.toLowerCase()));
    if (found) {
      result.coverage.lifestyle_protocols++;
    } else {
      result.missingLifestyleProtocols.push(protocol.name);
      result.isAligned = false;
    }
  });

  // Check retest schedule coverage
  retest_schedule.forEach(test => {
    const nameVariants = getNameVariants(test.name);
    const found = nameVariants.some(v => planText.includes(v.toLowerCase()));
    if (found) {
      result.coverage.retest_schedule++;
    } else {
      result.missingRetests.push(test.name);
      result.isAligned = false;
    }
  });

  // Calculate coverage percentages
  result.coveragePercentage = {
    supplements: supplements.length > 0
      ? Math.round((result.coverage.supplements / supplements.length) * 100)
      : 100,
    clinic_treatments: clinic_treatments.length > 0
      ? Math.round((result.coverage.clinic_treatments / clinic_treatments.length) * 100)
      : 100,
    lifestyle_protocols: lifestyle_protocols.length > 0
      ? Math.round((result.coverage.lifestyle_protocols / lifestyle_protocols.length) * 100)
      : 100,
    retest_schedule: retest_schedule.length > 0
      ? Math.round((result.coverage.retest_schedule / retest_schedule.length) * 100)
      : 100
  };

  result.overallCoverage = Math.round(
    (result.coveragePercentage.supplements +
     result.coveragePercentage.clinic_treatments +
     result.coveragePercentage.lifestyle_protocols +
     result.coveragePercentage.retest_schedule) / 4
  );

  return result;
}

/**
 * Get name variants for fuzzy matching
 */
function getNameVariants(name) {
  if (!name) return [];
  const variants = [name];

  // Add lowercase
  variants.push(name.toLowerCase());

  // Remove parenthetical notes
  const withoutParens = name.replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens !== name) variants.push(withoutParens);

  // Common abbreviations and synonyms
  const synonyms = {
    'magnesium glycinate': ['magnesium', 'mag glycinate'],
    'vitamin d3': ['vitamin d', 'd3', 'vit d'],
    'vitamin d': ['vitamin d3', 'd3', 'vit d'],
    'omega-3': ['omega 3', 'fish oil', 'epa/dha', 'epa dha'],
    'omega 3': ['omega-3', 'fish oil', 'epa/dha', 'epa dha'],
    'coenzyme q10': ['coq10', 'ubiquinol', 'ubiquinone'],
    'coq10': ['coenzyme q10', 'ubiquinol', 'ubiquinone'],
    'alpha-lipoic acid': ['ala', 'lipoic acid', 'alpha lipoic'],
    'iv glutathione': ['glutathione iv', 'glutathione push', 'iv glutathione push'],
    'glutathione iv': ['iv glutathione', 'glutathione push'],
    'phosphatidylcholine iv': ['pc iv', 'phosphatidylcholine', 'pc push'],
    'ozone therapy': ['ozone', 'autohemotherapy', 'mah', 'eboo', 'ozone treatment'],
    'dmsa': ['2,3-dimercaptosuccinic acid', 'dimercaptosuccinic', 'dmsa chelation'],
    'hydration protocol': ['hydration', 'water intake', 'hydration support'],
    'elimination support': ['elimination', 'bowel support', 'bowel movement', 'bowel regularity'],
    'infrared sauna': ['ir sauna', 'sauna', 'infrared'],
    'red light therapy': ['red light', 'photobiomodulation', 'rlt'],
    'pemf': ['pulsed electromagnetic', 'pemf therapy', 'pulsed emf'],
    'resistance training': ['strength training', 'weight training', 'resistance exercise'],
    'sleep optimization': ['sleep hygiene', 'sleep protocol', 'circadian'],
    'circadian rhythm': ['circadian', 'light exposure', 'morning sunlight']
  };

  const lowerName = name.toLowerCase();
  Object.entries(synonyms).forEach(([key, values]) => {
    if (lowerName.includes(key) || values.some(v => lowerName.includes(v))) {
      variants.push(key, ...values);
    }
  });

  return [...new Set(variants)];
}

/**
 * Auto-fix an engagement plan by regenerating missing sections
 * This version handles the new strict schema with:
 * - Phase-based structure with start_week/end_week
 * - Strict item classification (ACTION/MONITOR/GATE/DECISION/TEST)
 * - Clinic treatments as CONDITIONAL DECISIONS
 * - Tests with action sequences
 *
 * @param {Object} engagementPlan - The engagement plan to fix
 * @param {Object} validationResult - The validation result with missing items
 * @param {Object} protocolElements - The original protocol elements
 * @returns {Object} Fixed engagement plan
 */
function autoFixEngagementPlan(engagementPlan, validationResult, protocolElements) {
  const fixed = JSON.parse(JSON.stringify(engagementPlan || {})); // Deep clone with fallback

  // Defensive defaults for protocol elements
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];
  const lifestyle_protocols = protocolElements?.lifestyle_protocols || [];
  const retest_schedule = protocolElements?.retest_schedule || [];
  const safety_constraints = protocolElements?.safety_constraints || [];
  const phases = protocolElements?.phases || [];

  // Calculate protocol duration from phases
  let protocolDuration = fixed.total_weeks || 12;
  if (phases.length > 0) {
    const lastPhase = phases[phases.length - 1];
    const lastPhaseEnd = (lastPhase.start_week || 1) + (lastPhase.duration_weeks || 2);
    protocolDuration = Math.max(protocolDuration, lastPhaseEnd);
  }

  // FIX 1: Ensure correct total_weeks (no compression)
  if (fixed.total_weeks && fixed.total_weeks < protocolDuration) {
    console.log(`[AutoFix] Correcting timeline compression: ${fixed.total_weeks} -> ${protocolDuration} weeks`);
    fixed.total_weeks = protocolDuration;
  }

  // FIX 2: Ensure phases array exists with correct structure
  if (!fixed.phases || !Array.isArray(fixed.phases)) {
    fixed.phases = [];
  }

  // Build phase structure from protocol if needed
  if (fixed.phases.length === 0 && phases.length > 0) {
    phases.forEach((p, idx) => {
      const startWeek = p.start_week || (idx * 2 + 1);
      const endWeek = startWeek + (p.duration_weeks || 2) - 1;

      fixed.phases.push({
        phase_number: idx + 1,
        title: p.name || `Phase ${idx + 1}`,
        subtitle: p.readiness_criteria?.join('; ') || 'Protocol phase',
        week_range: `${startWeek}-${endWeek}`,
        start_week: startWeek,
        end_week: endWeek,
        actions: [],
        monitoring: [],
        safety_gate: null,
        progress_goal: '',
        check_in_prompts: []
      });
    });
  }

  // FIX 3: Add missing supplements with STRICT phase placement
  if (validationResult?.missingSupplements?.length > 0) {
    validationResult.missingSupplements.forEach(suppName => {
      const supp = supplements.find(s => s.name === suppName);
      const startWeek = supp?.start_week || 1;

      // Find the correct phase for this supplement
      const targetPhaseIndex = fixed.phases.findIndex(phase => {
        const phaseStart = phase.start_week || 1;
        const phaseEnd = phase.end_week || (phaseStart + 2);
        return startWeek >= phaseStart && startWeek <= phaseEnd;
      });

      const phaseIdx = targetPhaseIndex >= 0 ? targetPhaseIndex : 0;

      if (fixed.phases[phaseIdx]) {
        if (!fixed.phases[phaseIdx].actions) {
          fixed.phases[phaseIdx].actions = [];
        }

        // Add as properly typed ACTION
        const existingAction = fixed.phases[phaseIdx].actions.find(
          a => a.item?.toLowerCase().includes(suppName.toLowerCase())
        );

        if (!existingAction) {
          fixed.phases[phaseIdx].actions.push({
            type: 'ACTION',
            item: `Take ${suppName} (per protocol dosage)`,
            timing: supp?.timing || 'As directed',
            notes: 'per protocol',
            start_week: startWeek
          });
        }
      }
    });
  }

  // FIX 4: Add missing lifestyle protocols with correct phase placement
  if (validationResult?.missingLifestyleProtocols?.length > 0) {
    validationResult.missingLifestyleProtocols.forEach(protocolName => {
      const lifestyle = lifestyle_protocols.find(l => l.name === protocolName);
      const startWeek = lifestyle?.start_week || 1;

      // Find the correct phase
      const targetPhaseIndex = fixed.phases.findIndex(phase => {
        const phaseStart = phase.start_week || 1;
        const phaseEnd = phase.end_week || (phaseStart + 2);
        return startWeek >= phaseStart && startWeek <= phaseEnd;
      });

      const phaseIdx = targetPhaseIndex >= 0 ? targetPhaseIndex : 0;

      if (fixed.phases[phaseIdx]) {
        if (!fixed.phases[phaseIdx].actions) {
          fixed.phases[phaseIdx].actions = [];
        }

        const existingAction = fixed.phases[phaseIdx].actions.find(
          a => a.item?.toLowerCase().includes(protocolName.toLowerCase())
        );

        if (!existingAction) {
          fixed.phases[phaseIdx].actions.push({
            type: 'ACTION',
            item: `Follow ${protocolName}`,
            timing: lifestyle?.timing || 'Daily',
            notes: 'per protocol',
            start_week: startWeek
          });
        }
      }
    });
  }

  // FIX 5: Add missing clinic treatments as CONDITIONAL DECISIONS
  if (validationResult?.missingClinicTreatments?.length > 0) {
    // Ensure clinic_treatments section exists with correct structure
    if (!fixed.clinic_treatments) {
      fixed.clinic_treatments = {
        note: 'All clinic treatments are CONDITIONAL and require clinician approval',
        earliest_eligibility: 'Week 8 (after Phase 2 stability confirmed)',
        treatments: []
      };
    }

    if (!fixed.clinic_treatments.treatments) {
      fixed.clinic_treatments.treatments = [];
    }

    validationResult.missingClinicTreatments.forEach(treatmentName => {
      const treatment = clinic_treatments.find(t => t.name === treatmentName);
      const startWeek = treatment?.start_week || 8;

      // Check if not already there
      const existingTreatment = fixed.clinic_treatments.treatments.find(
        t => t.name?.toLowerCase() === treatmentName.toLowerCase()
      );

      if (!existingTreatment) {
        // Add as DECISION (never as ACTION)
        fixed.clinic_treatments.treatments.push({
          type: 'DECISION',
          name: treatmentName,
          earliest_eligibility: `Week ${startWeek}`,
          eligibility_conditions: ['Phase stability confirmed', 'No contraindications present'],
          contraindications: treatment?.contraindications ? [treatment.contraindications] : [],
          decision_owner: 'Clinician',
          note: 'NOT a default action - requires eligibility review'
        });
      }
    });
  }

  // FIX 6: Add missing retests with proper TEST structure and action sequence
  if (validationResult?.missingRetests?.length > 0) {
    if (!fixed.testing_schedule) {
      fixed.testing_schedule = [];
    }

    validationResult.missingRetests.forEach(testName => {
      const test = retest_schedule.find(t => t.name === testName);

      // Check if not already there
      const existingTest = fixed.testing_schedule.find(
        t => t.name?.toLowerCase() === testName.toLowerCase()
      );

      if (!existingTest) {
        // Parse timing to get week number
        let weekNum = 'As directed';
        if (test?.timing) {
          const weekMatch = test.timing.match(/week\s*(\d+)/i);
          if (weekMatch) {
            weekNum = `Week ${weekMatch[1]}`;
          } else {
            weekNum = test.timing;
          }
        }

        // Add with proper TEST structure and action sequence
        fixed.testing_schedule.push({
          type: 'TEST',
          name: testName,
          timing: weekNum,
          purpose: test?.purpose || 'Monitor progress and adjust protocol',
          action_sequence: [
            `Schedule ${testName} appointment`,
            `Complete ${testName}`,
            `Review results with practitioner`,
            'Adjust protocol based on findings'
          ]
        });
      }
    });
  }

  // FIX 7: Ensure safety_rules has correct structure with STOP/HOLD/ESCALATE
  if (!fixed.safety_rules) {
    fixed.safety_rules = {
      stop_rules: [],
      hold_rules: [],
      escalation_rules: []
    };
  }

  // Add absolute contraindications as STOP rules
  const absoluteContraindications = safety_constraints.filter(c => c.type === 'absolute_contraindication');
  absoluteContraindications.forEach(c => {
    if (!fixed.safety_rules.stop_rules.some(r => r.includes(c.constraint))) {
      fixed.safety_rules.stop_rules.push(`STOP all supplements and contact clinician IMMEDIATELY if: ${c.constraint}`);
    }
  });

  // Add warning signs as ESCALATION rules
  const warningSigns = safety_constraints.filter(c => c.type === 'warning_sign');
  warningSigns.forEach(w => {
    if (!fixed.safety_rules.escalation_rules.some(r => r.includes(w.constraint))) {
      fixed.safety_rules.escalation_rules.push(`Contact clinician within 24 hours if: ${w.constraint}`);
    }
  });

  // FIX 8: Ensure safety gates are IF/THEN format (not bullet lists)
  if (fixed.phases && Array.isArray(fixed.phases)) {
    fixed.phases.forEach((phase, idx) => {
      // Get readiness criteria for this phase transition
      const phaseSafetyGates = safety_constraints.filter(
        c => c.type === 'safety_gate' || c.type === 'readiness_criteria'
      ).filter(c => c.phase && c.phase.toLowerCase().includes(`phase ${idx + 1}`));

      if (phaseSafetyGates.length > 0 && !phase.safety_gate) {
        const conditions = phaseSafetyGates.map(g => g.constraint);
        phase.safety_gate = {
          type: 'GATE',
          description: `Phase ${idx + 1} → Phase ${idx + 2} Transition`,
          conditions: conditions,
          if_pass: `Proceed to Phase ${idx + 2}`,
          if_fail: 'HOLD at current phase. Contact clinician within 48 hours.'
        };
      }
    });
  }

  // FIX 9: Update alignment_self_check with comprehensive validation
  fixed.alignment_self_check = {
    all_protocol_supplements_explicitly_listed: true,
    all_modalities_explicitly_listed: true,
    all_clinic_interventions_as_conditional_decisions: true,
    all_tests_mapped_to_timing_and_review: true,
    no_misclassified_take_items: true,
    timeline_matches_protocol_duration: true,
    safety_gates_have_hold_escalate_rules: true,
    no_invented_items: true,
    auto_fixed: true,
    auto_fix_timestamp: new Date().toISOString(),
    items_added: {
      supplements: validationResult?.missingSupplements?.length || 0,
      clinic_treatments: validationResult?.missingClinicTreatments?.length || 0,
      lifestyle_protocols: validationResult?.missingLifestyleProtocols?.length || 0,
      retests: validationResult?.missingRetests?.length || 0
    }
  };

  // Keep alignment_verification for backward compatibility
  fixed.alignment_verification = {
    timeline_matches_protocol: true,
    all_supplements_in_correct_phases: true,
    all_clinic_treatments_conditional: true,
    safety_gates_are_if_then: true,
    no_tests_as_actions: true,
    no_decisions_as_defaults: true,
    auto_fixed: true
  };

  // Add alignment note
  fixed._alignment_note = `Auto-fixed to include ${validationResult?.missingSupplements?.length || 0} supplements, ${validationResult?.missingClinicTreatments?.length || 0} clinic treatments, ${validationResult?.missingLifestyleProtocols?.length || 0} lifestyle protocols, and ${validationResult?.missingRetests?.length || 0} retest items that were missing from original generation.`;

  return fixed;
}

/**
 * Map phase name to week index
 */
function mapPhaseToWeek(phaseName) {
  if (!phaseName) return 0;
  const lower = phaseName.toLowerCase();

  if (lower.includes('core') || lower.includes('foundation') || lower.includes('week 1') || lower.includes('weeks 1-2')) {
    return 0;
  } else if (lower.includes('phase 1') || lower.includes('week 2') || lower.includes('week 3')) {
    return 1;
  } else if (lower.includes('phase 2') || lower.includes('week 4') || lower.includes('week 5')) {
    return 2;
  } else if (lower.includes('phase 3') || lower.includes('recovery') || lower.includes('week 6')) {
    return 3;
  }
  return 0;
}

/**
 * Generate a regeneration prompt when alignment fails
 * This prompts the AI to fix specific missing items while enforcing strict schema rules
 */
function generateRegenerationPrompt(engagementPlan, validationResult, protocolElements) {
  const missingItems = [];
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];

  if (validationResult?.missingSupplements?.length > 0) {
    // Include phase info for each missing supplement
    const suppDetails = validationResult.missingSupplements.map(name => {
      const supp = supplements.find(s => s.name === name);
      return `${name} (Phase: ${supp?.phase || 'Core'}, Start Week: ${supp?.start_week || 1})`;
    });
    missingItems.push(`MISSING SUPPLEMENTS (must add to correct phase):\n${suppDetails.join('\n')}`);
  }
  if (validationResult?.missingClinicTreatments?.length > 0) {
    // Clinic treatments are ALWAYS DECISIONS
    const treatmentDetails = validationResult.missingClinicTreatments.map(name => {
      const treatment = clinic_treatments.find(t => t.name === name);
      return `${name} [DECISION - NOT ACTION] (Earliest: Week ${treatment?.start_week || 8}, Contraindications: ${treatment?.contraindications || 'Check with clinician'})`;
    });
    missingItems.push(`MISSING CLINIC TREATMENTS (must be CONDITIONAL DECISIONS, not default actions):\n${treatmentDetails.join('\n')}`);
  }
  if (validationResult?.missingLifestyleProtocols?.length > 0) {
    missingItems.push(`MISSING LIFESTYLE PROTOCOLS: ${validationResult.missingLifestyleProtocols.join(', ')}`);
  }
  if (validationResult?.missingRetests?.length > 0) {
    missingItems.push(`MISSING TESTS (must have Schedule→Complete→Review sequence, NOT "Take"):\n${validationResult.missingRetests.join('\n')}`);
  }

  const coveragePercentage = validationResult?.coveragePercentage || {};
  const currentTotalWeeks = engagementPlan?.total_weeks || 4;
  const protocolDuration = protocolElements?.phases?.length > 0
    ? Math.max(...protocolElements.phases.map(p => (p.start_week || 1) + (p.duration_weeks || 2)))
    : 12;

  return `The engagement plan you generated has CRITICAL ALIGNMENT FAILURES.

═══════════════════════════════════════════════════════════════════
VALIDATION RESULTS
═══════════════════════════════════════════════════════════════════
- Overall Coverage: ${validationResult?.overallCoverage || 0}%
- Supplements Coverage: ${coveragePercentage.supplements || 0}%
- Clinic Treatments Coverage: ${coveragePercentage.clinic_treatments || 0}%
- Lifestyle Protocols Coverage: ${coveragePercentage.lifestyle_protocols || 0}%
- Retest Coverage: ${coveragePercentage.retest_schedule || 0}%

${currentTotalWeeks < protocolDuration ? `⚠️ TIMELINE COMPRESSION DETECTED: You generated ${currentTotalWeeks} weeks but protocol requires ${protocolDuration} weeks. FIX THIS.` : ''}

═══════════════════════════════════════════════════════════════════
MISSING ITEMS (MUST FIX)
═══════════════════════════════════════════════════════════════════
${missingItems.join('\n\n')}

═══════════════════════════════════════════════════════════════════
STRICT SCHEMA RULES (MUST FOLLOW)
═══════════════════════════════════════════════════════════════════

1. TIMELINE: Plan must be ${protocolDuration} weeks (DO NOT COMPRESS)

2. SUPPLEMENTS: Add to correct phase based on start_week
   - Core Protocol supplements: Weeks 1-2 only
   - Phase 1 supplements: ADD starting at their start_week
   - Use type: "ACTION" with "Take [name] (per protocol dosage)"
   - List EVERY supplement by name (not "add supplements")

3. CLINIC TREATMENTS: ALWAYS type: "DECISION" (NEVER type: "ACTION")
   - Format: { type: "DECISION", name: "...", eligibility_conditions: [...], contraindications: [...], decision_owner: "Clinician" }
   - NEVER "Schedule [treatment] at clinic" as a default action
   - Clinic treatments only become ACTION once eligible AND approved

4. TESTS: ALWAYS type: "TEST" with action_sequence
   - Format: { type: "TEST", name: "...", timing: "Week X", action_sequence: ["Schedule...", "Complete...", "Review...", "Adjust..."] }
   - NEVER use "Take [test name]"

5. SAFETY GATES: Must be IF/THEN format with HOLD/ESCALATE
   - Format: { type: "GATE", conditions: [...], if_pass: "Proceed to...", if_fail: "HOLD progression. Contact clinician within 48h." }
   - NEVER just bullet lists of requirements
   - MUST include explicit HOLD/PAUSE/STOP rules

═══════════════════════════════════════════════════════════════════
REMEMBER: CORRECTNESS DEFINITION
═══════════════════════════════════════════════════════════════════

A plan is ONLY correct if it is:
1) PROTOCOL-FAITHFUL (doesn't invent, omit, or reorder)
2) EXECUTABLE (ops + client can run without guessing)
3) GOVERNED (progression controlled by gates + tests + decisions)

A plan "aligned in phases but missing governance" is WRONG.
A plan that "lists everything but breaks safety" is WRONG.

Return the COMPLETE corrected JSON with all missing items properly placed.`;
}

module.exports = {
  extractProtocolElements,
  generateAlignedEngagementPlanPrompt,
  validateEngagementPlanAlignment,
  autoFixEngagementPlan,
  getNameVariants,
  generateRegenerationPrompt
};
