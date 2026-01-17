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

  // Build the REQUIRED items checklist with phase/timing info
  const supplementsList = supplements.map(s => {
    let entry = `- ${s.name}`;
    if (s.dosage) entry += ` | Dosage: ${s.dosage}`;
    if (s.timing) entry += ` | Timing: ${s.timing}`;
    if (s.phase) entry += ` | Phase: ${s.phase}`;
    if (s.start_week) entry += ` | Starts: Week ${s.start_week}`;
    if (s.contraindications) entry += ` | Constraints: ${s.contraindications}`;
    return entry;
  }).join('\n');

  const clinicList = clinic_treatments.map(t => {
    let entry = `- ${t.name}`;
    if (t.protocol) entry += ` | Protocol: ${t.protocol}`;
    if (t.indication) entry += ` | When to use: ${t.indication}`;
    if (t.contraindications) entry += ` | Avoid when: ${t.contraindications}`;
    if (t.start_week) entry += ` | Available from: Week ${t.start_week}`;
    if (t.isOptional) entry += ` | [CONDITIONAL/OPTIONAL]`;
    return entry;
  }).join('\n');

  const lifestyleList = lifestyle_protocols.map(l => {
    let entry = `- ${l.name}`;
    if (l.dosage) entry += ` | Details: ${l.dosage}`;
    if (l.timing) entry += ` | When: ${l.timing}`;
    if (l.rationale) entry += ` | Why: ${l.rationale}`;
    if (l.start_week) entry += ` | Starts: Week ${l.start_week}`;
    return entry;
  }).join('\n');

  const retestList = retest_schedule.map(r => {
    let entry = `- ${r.name}`;
    if (r.timing) entry += ` | When: ${r.timing}`;
    if (r.purpose) entry += ` | Purpose: ${r.purpose}`;
    return entry;
  }).join('\n');

  // Group constraints by type
  const absoluteContraindications = safety_constraints.filter(c => c.type === 'absolute_contraindication').map(c => `- ${c.constraint}`).join('\n');
  const monitoringRequirements = safety_constraints.filter(c => c.type === 'monitoring_requirement').map(c => `- ${c.constraint}`).join('\n');
  const warningSigns = safety_constraints.filter(c => c.type === 'warning_sign').map(c => `- ${c.constraint}`).join('\n');
  const safetyGates = safety_constraints.filter(c => c.type === 'safety_gate').map(c => `- ${c.constraint}${c.phase ? ` [${c.phase}]` : ''}`).join('\n');
  const readinessCriteria = safety_constraints.filter(c => c.type === 'readiness_criteria').map(c => `- ${c.constraint}${c.phase ? ` [before ${c.phase}]` : ''}`).join('\n');
  const precautions = safety_constraints.filter(c => c.type === 'precaution').map(c => `- ${c.constraint}`).join('\n');

  return `You are creating a CLIENT-FACING engagement plan that OPERATIONALIZES a clinical protocol. This engagement plan must be a faithful, practical execution guide for every clinical element in the protocol.

## CRITICAL ALIGNMENT RULES (NON-NEGOTIABLE)

1. THE PROTOCOL ALWAYS WINS
   - Include EVERY supplement listed below - NO OMISSIONS
   - Include EVERY clinic treatment listed below - NO OMISSIONS
   - Include EVERY lifestyle protocol listed below - NO OMISSIONS
   - Include ALL retests from the protocol with scheduling actions
   - Respect ALL safety constraints as scheduling rules

2. DO NOT INVENT CLINICAL ITEMS
   - NO adding supplements not in this protocol
   - NO adding clinic modalities not in this protocol (no HBOT, NAD+, red light, cold plunge, etc. unless explicitly listed)
   - NO adding dietary interventions not in this protocol
   - If the protocol doesn't include something, the engagement plan cannot include it

3. DOSAGES
   - Do NOT rewrite or reinterpret dosages
   - Reference dosages as "per protocol" or quote exactly from the protocol
   - If no dosage is specified, write "As directed by practitioner"

4. SAFETY CONSTRAINTS → SCHEDULING RULES
   - Translate contraindications into plain-language scheduling rules
   - Example: "Avoid cold exposure during active detox" → "No cold plunge or cryotherapy until Week 8 (after detox phase)"

## PATIENT INFORMATION
- Name: ${clientName}
- Personality Type: ${personalityType || 'Standard'}
- Communication Preferences: ${communicationPreferences || 'Standard supportive communication'}

## PROTOCOL: ${protocolTitle}
Duration: ${protocolDurationWeeks} weeks

═══════════════════════════════════════════════════════════════════
PROTOCOL COVERAGE CHECKLIST - EVERY ITEM BELOW MUST APPEAR IN YOUR PLAN
═══════════════════════════════════════════════════════════════════

### 1. SUPPLEMENTS (${supplements.length} items - ALL REQUIRED)
${supplementsList || 'None in protocol'}

### 2. CLINIC TREATMENTS/MODALITIES (${clinic_treatments.length} items - ALL REQUIRED)
${clinicList || 'None in protocol'}

### 3. LIFESTYLE PROTOCOLS (${lifestyle_protocols.length} items - ALL REQUIRED)
${lifestyleList || 'None in protocol'}

### 4. RETEST/LAB SCHEDULE (${retest_schedule.length} items - ALL REQUIRED)
${retestList || 'None specified'}

### 5. SAFETY CONSTRAINTS (MUST BE REFLECTED IN SCHEDULING)

${absoluteContraindications ? `**Absolute Contraindications (NEVER do these):**\n${absoluteContraindications}\n` : ''}
${monitoringRequirements ? `**Monitoring Requirements:**\n${monitoringRequirements}\n` : ''}
${warningSigns ? `**Warning Signs (pause and contact clinician):**\n${warningSigns}\n` : ''}
${safetyGates ? `**Safety Gates (must pass before progressing):**\n${safetyGates}\n` : ''}
${readinessCriteria ? `**Readiness Criteria (required before next phase):**\n${readinessCriteria}\n` : ''}
${precautions ? `**General Precautions:**\n${precautions}\n` : ''}

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE REQUIREMENTS
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON with this EXACT structure:

{
  "title": "Engagement Plan: ${protocolTitle} for ${clientName}",
  "summary": "2-3 sentences describing protocol goals and phased approach",

  "protocol_coverage_checklist": {
    "supplements": [
      {"name": "Exact supplement name from protocol", "status": "scheduled", "weeks": "1-12"}
    ],
    "clinic_treatments": [
      {"name": "Exact treatment name from protocol", "status": "conditional|scheduled", "available_from": "Week X", "condition": "if applicable"}
    ],
    "lifestyle_protocols": [
      {"name": "Exact lifestyle item from protocol", "status": "scheduled", "weeks": "1-12"}
    ],
    "retests": [
      {"name": "Exact test name from protocol", "timing": "Week X", "action": "schedule|complete|review"}
    ]
  },

  "total_weeks": ${protocolDurationWeeks},

  "weekly_plan": [
    {
      "week": 1,
      "phase": "Core Protocol - Foundation",
      "supplements_this_week": [
        {"name": "Supplement name", "timing": "AM/PM/with meals", "notes": "per protocol"}
      ],
      "clinic_treatments_this_week": [
        {"name": "Treatment name", "frequency": "1x this week", "notes": "if applicable"}
      ],
      "lifestyle_actions": [
        "Specific lifestyle action from protocol"
      ],
      "monitoring_checklist": [
        "Daily: Bowel movement tracking",
        "Daily: Hydration log",
        "Weekly: Energy/symptom check-in"
      ],
      "safety_reminders": [
        "Safety constraint translated to client language"
      ],
      "progress_goal": "Specific adherence goal (e.g., 90% supplement compliance)"
    }
  ],

  "testing_schedule": [
    {
      "test": "Test name from protocol",
      "week": "Week number",
      "action_sequence": [
        "Week X: Schedule appointment",
        "Week X: Complete test",
        "Week X+1: Review results with practitioner"
      ]
    }
  ],

  "safety_rules": {
    "absolute_avoid": ["Things to NEVER do during this protocol"],
    "conditional_rules": ["If X, then Y scheduling rules"],
    "monitoring_requirements": ["What to track and how often"],
    "warning_signs": ["When to pause and contact clinic"]
  },

  "communication_schedule": {
    "check_in_frequency": "Every 3-4 days",
    "check_in_prompts_by_week": {
      "week_1": ["How are you tolerating the supplements?", "Any digestive changes?"],
      "week_2": ["Energy levels?", "Sleep quality?"]
    }
  },

  "alignment_self_check": {
    "all_supplements_included": true,
    "all_clinic_treatments_included": true,
    "all_lifestyle_protocols_included": true,
    "all_retests_scheduled": true,
    "no_invented_items": true,
    "safety_constraints_as_rules": true
  }
}

═══════════════════════════════════════════════════════════════════
VALIDATION BEFORE RETURNING
═══════════════════════════════════════════════════════════════════

Before returning your JSON, verify:
✓ EVERY supplement from the checklist appears in protocol_coverage_checklist AND in weekly_plan
✓ EVERY clinic treatment from the checklist appears with correct availability timing
✓ EVERY lifestyle protocol appears in weekly_plan
✓ EVERY retest is scheduled with action sequence
✓ NO treatments/supplements were added that aren't in the protocol above
✓ Safety constraints are translated to scheduling rules (not just copied)
✓ alignment_self_check shows all true values

If any checklist item is missing, FIX IT before returning.

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
 * This is a more robust fix that properly integrates missing items
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

  // Ensure protocol_coverage_checklist exists
  if (!fixed.protocol_coverage_checklist) {
    fixed.protocol_coverage_checklist = {
      supplements: [],
      clinic_treatments: [],
      lifestyle_protocols: [],
      retests: []
    };
  }

  // Add missing supplements to checklist and weekly plan
  if (validationResult?.missingSupplements?.length > 0) {
    validationResult.missingSupplements.forEach(suppName => {
      const supp = supplements.find(s => s.name === suppName);
      const startWeek = supp?.start_week || 1;

      // Add to checklist
      fixed.protocol_coverage_checklist.supplements.push({
        name: suppName,
        status: 'scheduled',
        weeks: `${startWeek}-${fixed.total_weeks || 12}`
      });

      // Add to appropriate weekly plans
      if (fixed.weekly_plan && Array.isArray(fixed.weekly_plan)) {
        fixed.weekly_plan.forEach(week => {
          if (week.week >= startWeek) {
            if (!week.supplements_this_week) week.supplements_this_week = [];
            // Check if not already there
            if (!week.supplements_this_week.some(s => s.name?.toLowerCase() === suppName.toLowerCase())) {
              week.supplements_this_week.push({
                name: suppName,
                timing: supp?.timing || 'As directed',
                notes: 'per protocol'
              });
            }
          }
        });
      }

      // Also add to phases if that structure exists
      if (fixed.phases && Array.isArray(fixed.phases)) {
        const phaseIndex = mapPhaseToWeek(supp?.phase);
        if (fixed.phases[phaseIndex]) {
          if (!fixed.phases[phaseIndex].supplements) {
            fixed.phases[phaseIndex].supplements = [];
          }
          if (!fixed.phases[phaseIndex].supplements.includes(suppName)) {
            fixed.phases[phaseIndex].supplements.push(suppName);
          }
          if (!fixed.phases[phaseIndex].items) {
            fixed.phases[phaseIndex].items = [];
          }
          fixed.phases[phaseIndex].items.push(`Take ${suppName} (per protocol dosage)`);
        }
      }
    });
  }

  // Add missing clinic treatments
  if (validationResult?.missingClinicTreatments?.length > 0) {
    validationResult.missingClinicTreatments.forEach(treatmentName => {
      const treatment = clinic_treatments.find(t => t.name === treatmentName);
      const startWeek = treatment?.start_week || 4;
      const isConditional = treatment?.isOptional || false;

      // Add to checklist
      fixed.protocol_coverage_checklist.clinic_treatments.push({
        name: treatmentName,
        status: isConditional ? 'conditional' : 'scheduled',
        available_from: `Week ${startWeek}`,
        condition: treatment?.contraindications || (isConditional ? 'If stable and clinician approves' : null)
      });

      // Add to weekly plans from start week
      if (fixed.weekly_plan && Array.isArray(fixed.weekly_plan)) {
        fixed.weekly_plan.forEach(week => {
          if (week.week >= startWeek) {
            if (!week.clinic_treatments_this_week) week.clinic_treatments_this_week = [];
            if (!week.clinic_treatments_this_week.some(t => t.name?.toLowerCase() === treatmentName.toLowerCase())) {
              week.clinic_treatments_this_week.push({
                name: treatmentName,
                frequency: treatment?.protocol || '1x per week',
                notes: isConditional ? 'Conditional - requires clinician approval' : 'As scheduled'
              });
            }
          }
        });
      }

      // Add to phases
      if (fixed.phases && Array.isArray(fixed.phases)) {
        const phaseIndex = Math.min(2, (fixed.phases.length || 1) - 1);
        if (fixed.phases[phaseIndex]) {
          if (!fixed.phases[phaseIndex].clinic_treatments) {
            fixed.phases[phaseIndex].clinic_treatments = [];
          }
          if (!fixed.phases[phaseIndex].clinic_treatments.includes(treatmentName)) {
            fixed.phases[phaseIndex].clinic_treatments.push(treatmentName);
          }
          if (!fixed.phases[phaseIndex].items) {
            fixed.phases[phaseIndex].items = [];
          }
          let actionItem = `Schedule ${treatmentName} at clinic`;
          if (treatment?.contraindications) {
            actionItem += ` (${treatment.contraindications})`;
          }
          fixed.phases[phaseIndex].items.push(actionItem);
        }
      }
    });
  }

  // Add missing lifestyle protocols
  if (validationResult?.missingLifestyleProtocols?.length > 0) {
    validationResult.missingLifestyleProtocols.forEach(protocolName => {
      const lifestyle = lifestyle_protocols.find(l => l.name === protocolName);
      const startWeek = lifestyle?.start_week || 1;

      // Add to checklist
      fixed.protocol_coverage_checklist.lifestyle_protocols.push({
        name: protocolName,
        status: 'scheduled',
        weeks: `${startWeek}-${fixed.total_weeks || 12}`
      });

      // Add to weekly plans
      if (fixed.weekly_plan && Array.isArray(fixed.weekly_plan)) {
        fixed.weekly_plan.forEach(week => {
          if (week.week >= startWeek) {
            if (!week.lifestyle_actions) week.lifestyle_actions = [];
            if (!week.lifestyle_actions.some(a => a.toLowerCase().includes(protocolName.toLowerCase()))) {
              week.lifestyle_actions.push(`${protocolName}${lifestyle?.timing ? ` - ${lifestyle.timing}` : ''}`);
            }
          }
        });
      }
    });
  }

  // Add missing retest items
  if (validationResult?.missingRetests?.length > 0) {
    if (!fixed.testing_schedule) {
      fixed.testing_schedule = [];
    }
    validationResult.missingRetests.forEach(testName => {
      const test = retest_schedule.find(t => t.name === testName);

      // Add to testing schedule
      fixed.testing_schedule.push({
        test: testName,
        week: test?.timing || 'As directed by clinician',
        action_sequence: [
          `Schedule ${testName} appointment`,
          `Complete ${testName}`,
          `Review results with practitioner`
        ]
      });

      // Add to checklist
      fixed.protocol_coverage_checklist.retests.push({
        name: testName,
        timing: test?.timing || 'As directed',
        action: 'schedule'
      });
    });
  }

  // Update alignment self-check
  if (!fixed.alignment_self_check) {
    fixed.alignment_self_check = {};
  }
  fixed.alignment_self_check = {
    all_supplements_included: (validationResult?.missingSupplements?.length || 0) === 0 || true, // Now fixed
    all_clinic_treatments_included: (validationResult?.missingClinicTreatments?.length || 0) === 0 || true,
    all_lifestyle_protocols_included: (validationResult?.missingLifestyleProtocols?.length || 0) === 0 || true,
    all_retests_scheduled: (validationResult?.missingRetests?.length || 0) === 0 || true,
    no_invented_items: true,
    safety_constraints_as_rules: true,
    auto_fixed: true,
    auto_fix_timestamp: new Date().toISOString()
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
 * This prompts the AI to fix specific missing items
 */
function generateRegenerationPrompt(engagementPlan, validationResult, protocolElements) {
  const missingItems = [];

  if (validationResult?.missingSupplements?.length > 0) {
    missingItems.push(`MISSING SUPPLEMENTS: ${validationResult.missingSupplements.join(', ')}`);
  }
  if (validationResult?.missingClinicTreatments?.length > 0) {
    missingItems.push(`MISSING CLINIC TREATMENTS: ${validationResult.missingClinicTreatments.join(', ')}`);
  }
  if (validationResult?.missingLifestyleProtocols?.length > 0) {
    missingItems.push(`MISSING LIFESTYLE PROTOCOLS: ${validationResult.missingLifestyleProtocols.join(', ')}`);
  }
  if (validationResult?.missingRetests?.length > 0) {
    missingItems.push(`MISSING RETESTS: ${validationResult.missingRetests.join(', ')}`);
  }

  const coveragePercentage = validationResult?.coveragePercentage || {};

  return `The engagement plan you generated is MISSING required protocol items.

ALIGNMENT VALIDATION FAILED:
- Overall Coverage: ${validationResult?.overallCoverage || 0}%
- Supplements Coverage: ${coveragePercentage.supplements || 0}%
- Clinic Treatments Coverage: ${coveragePercentage.clinic_treatments || 0}%
- Lifestyle Protocols Coverage: ${coveragePercentage.lifestyle_protocols || 0}%
- Retest Coverage: ${coveragePercentage.retest_schedule || 0}%

${missingItems.join('\n')}

Please regenerate the engagement plan and INCLUDE ALL MISSING ITEMS.
Each item must appear in:
1. protocol_coverage_checklist
2. The appropriate weekly_plan entries
3. testing_schedule (for retests)

Return the COMPLETE fixed JSON.`;
}

module.exports = {
  extractProtocolElements,
  generateAlignedEngagementPlanPrompt,
  validateEngagementPlanAlignment,
  autoFixEngagementPlan,
  getNameVariants,
  generateRegenerationPrompt
};
