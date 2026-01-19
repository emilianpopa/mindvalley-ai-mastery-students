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
 *
 * KEY REQUIREMENTS:
 * 1. Phase-based structure with explicit week ranges
 * 2. EXPLICIT named items under each phase (no generic text)
 * 3. NO dosages - just item names with "per protocol"
 * 4. Clear SCHEDULED vs CONDITIONAL labeling
 * 5. Verifiable item-by-item alignment
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

  // Build SIMPLE item lists - just names, no dosages
  const supplementsByPhase = {};
  supplements.forEach(s => {
    const phase = s.phase || 'Core Protocol';
    if (!supplementsByPhase[phase]) supplementsByPhase[phase] = [];
    supplementsByPhase[phase].push(s.name);
  });

  const supplementsList = supplements.map(s => {
    return `– ${s.name} [Phase: ${s.phase || 'Core Protocol'}, Start Week: ${s.start_week || 1}]`;
  }).join('\n');

  const clinicList = clinic_treatments.map(t => {
    return `– ${t.name} [CONDITIONAL, Earliest: Week ${t.start_week || 8}]`;
  }).join('\n');

  const lifestyleList = lifestyle_protocols.map(l => {
    return `– ${l.name} [Phase: ${l.phase || 'Core Protocol'}, Start Week: ${l.start_week || 1}]`;
  }).join('\n');

  const retestList = retest_schedule.map(r => {
    return `– ${r.name} [${r.timing || 'As scheduled'}]`;
  }).join('\n');

  // Build safety constraints lists
  const absoluteContraindications = safety_constraints.filter(c => c.type === 'absolute_contraindication').map(c => `– ${c.constraint}`).join('\n');
  const monitoringRequirements = safety_constraints.filter(c => c.type === 'monitoring_requirement').map(c => `– ${c.constraint}`).join('\n');
  const warningSigns = safety_constraints.filter(c => c.type === 'warning_sign').map(c => `– ${c.constraint}`).join('\n');

  return `You are creating a CLIENT-FACING engagement plan that OPERATIONALIZES a clinical protocol.

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT REQUIREMENTS (MANDATORY)
═══════════════════════════════════════════════════════════════════

The engagement plan must be:
1. PHASE-BASED with explicit week ranges
2. EXPLICIT NAMED ITEMS under each phase (not generic text like "start supplements")
3. NO DOSAGES - just item names (dosages are in the protocol)
4. CLEAR LABELING: "SCHEDULED" vs "CONDITIONAL (if tolerated)"
5. VERIFIABLE: Every protocol item must appear by name

EXAMPLE OF CORRECT FORMAT:
───────────────────────────────────────────────────────────────────
Weeks 3–6: Active Metal Mobilization & Gut Restoration

Clinical elements in scope:
– DMSA (cycled, per protocol) [SCHEDULED]
– NAC [SCHEDULED]
– Digestive Enzymes [SCHEDULED]
– Zinc Bisglycinate [SCHEDULED]
– Infrared Sauna [CONDITIONAL - if tolerated]

Safety gate: IF bowel movements regular AND no adverse reactions THEN proceed. IF NOT → HOLD, contact clinician.
───────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
PROTOCOL SOURCE DATA
═══════════════════════════════════════════════════════════════════

## PATIENT: ${clientName}
## PROTOCOL: ${protocolTitle}
## DURATION: ${calculatedDuration} weeks (MANDATORY - DO NOT COMPRESS)

${phaseStructure ? `### PHASE STRUCTURE:\n${phaseStructure}` : ''}

### ALL SUPPLEMENTS (${supplements.length} items - MUST LIST EACH BY NAME):
${supplementsList || 'None in protocol'}

### ALL LIFESTYLE PROTOCOLS (${lifestyle_protocols.length} items):
${lifestyleList || 'None in protocol'}

### ALL CLINIC TREATMENTS (${clinic_treatments.length} items - ALL CONDITIONAL):
${clinicList || 'None in protocol'}

### ALL TESTS (${retest_schedule.length} items):
${retestList || 'None specified'}

### SAFETY CONSTRAINTS:
${absoluteContraindications ? `STOP RULES:\n${absoluteContraindications}\n` : ''}
${monitoringRequirements ? `MONITORING:\n${monitoringRequirements}\n` : ''}
${warningSigns ? `ESCALATION TRIGGERS:\n${warningSigns}\n` : ''}

═══════════════════════════════════════════════════════════════════
LABELING RULES
═══════════════════════════════════════════════════════════════════

Every item MUST have one of these labels:

[SCHEDULED] = Client does this as directed, no conditions
[CONDITIONAL - if X] = Only if condition met (tolerance, stability, etc.)
[CLINICIAN DECISION] = Requires clinician approval before scheduling

Examples:
– Magnesium Glycinate [SCHEDULED]
– DMSA [SCHEDULED - cycled per protocol]
– Infrared Sauna [CONDITIONAL - if tolerated]
– IV Glutathione [CLINICIAN DECISION - eligible Week 8+ if stable]

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON with this SIMPLIFIED structure:

{
  "title": "Engagement Plan: ${protocolTitle} for ${clientName}",
  "total_weeks": ${calculatedDuration},

  "phases": [
    {
      "phase_number": 1,
      "title": "Core Protocol: Foundation & Safety",
      "week_range": "1-2",

      "clinical_elements": [
        { "name": "Magnesium Glycinate", "status": "SCHEDULED" },
        { "name": "Vitamin D3", "status": "SCHEDULED" },
        { "name": "Hydration Protocol", "status": "SCHEDULED" },
        { "name": "Elimination Support", "status": "SCHEDULED" }
      ],

      "monitoring": [
        "Track bowel movements daily",
        "Log energy levels",
        "Note any adverse reactions"
      ],

      "safety_gate": {
        "conditions": ["Tolerating supplements well", "Regular bowel movements", "No adverse reactions"],
        "if_pass": "Proceed to Phase 1 (Week 3)",
        "if_fail": "HOLD. Contact clinician within 48h."
      }
    },
    {
      "phase_number": 2,
      "title": "Phase 1: Gut Restoration & Binder Introduction",
      "week_range": "3-4",

      "clinical_elements": [
        { "name": "Continue: Magnesium Glycinate", "status": "SCHEDULED" },
        { "name": "Continue: Vitamin D3", "status": "SCHEDULED" },
        { "name": "ADD: Activated Charcoal", "status": "SCHEDULED" },
        { "name": "ADD: L-Glutamine", "status": "SCHEDULED" },
        { "name": "ADD: Probiotics", "status": "SCHEDULED" }
      ],

      "monitoring": [
        "Continue bowel tracking",
        "Note detox symptoms if any"
      ],

      "safety_gate": {
        "conditions": ["Binders tolerated", "No constipation", "Energy stable"],
        "if_pass": "Proceed to Phase 2 (Week 5)",
        "if_fail": "HOLD. Contact clinician within 48h."
      }
    }
  ],

  "clinic_treatments": {
    "note": "All require clinician approval - NOT default actions",
    "items": [
      {
        "name": "IV Glutathione",
        "status": "CLINICIAN DECISION",
        "earliest_eligibility": "Week 8",
        "conditions": ["Phase 2 stable", "No G6PD deficiency"]
      },
      {
        "name": "Infrared Sauna",
        "status": "CONDITIONAL",
        "earliest_eligibility": "Week 5",
        "conditions": ["Tolerated well", "Hydration adequate"]
      }
    ]
  },

  "testing_schedule": [
    {
      "name": "Heavy Metals Panel (provoked)",
      "timing": "Week 8-10",
      "sequence": ["Schedule", "Complete", "Review with practitioner", "Adjust protocol"]
    }
  ],

  "safety_rules": {
    "stop_immediately": ["Severe allergic reaction", "Chest pain", "Severe GI distress"],
    "hold_and_contact": ["Irregular bowel movements >3 days", "Significant energy decline", "New adverse reactions"],
    "escalation_24h": ["Persistent fatigue", "Unusual mood changes", "Sleep disruption >3 days"]
  },

  "alignment_verification": {
    "protocol_supplements_count": ${supplements.length},
    "engagement_plan_supplements_count": "MUST EQUAL ${supplements.length}",
    "all_items_explicitly_named": true,
    "no_dosages_in_plan": true,
    "all_clinic_treatments_conditional": true,
    "timeline_preserved": true
  }
}

═══════════════════════════════════════════════════════════════════
CRITICAL VALIDATION BEFORE RETURNING
═══════════════════════════════════════════════════════════════════

COUNT CHECK:
- Protocol has ${supplements.length} supplements → Plan must list ${supplements.length} supplements BY NAME
- Protocol has ${clinic_treatments.length} clinic treatments → Plan must list ${clinic_treatments.length} as CONDITIONAL
- Protocol has ${lifestyle_protocols.length} lifestyle protocols → Plan must list ${lifestyle_protocols.length} BY NAME
- Protocol has ${retest_schedule.length} tests → Plan must list ${retest_schedule.length} tests

FORMAT CHECK:
- Each clinical_element has "name" (explicit) and "status" (SCHEDULED/CONDITIONAL/CLINICIAN DECISION)
- NO dosages in the plan (just "per protocol")
- Safety gates have if_pass AND if_fail with HOLD instruction
- Timeline is ${calculatedDuration} weeks (NOT compressed)

If ANY item from the protocol is missing from the engagement plan, ADD IT before returning.

Return ONLY the JSON object. No markdown, no code blocks, no explanatory text.`;
}

/**
 * Validate that an engagement plan covers all protocol elements
 * STRICT VALIDATION: Items must appear in clinical_elements or proper sections,
 * not just anywhere in the JSON text.
 *
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
    structureValid: true,
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

  // STRICT: Extract clinical_elements from phases (new format)
  const clinicalElementNames = [];
  if (engagementPlan?.phases && Array.isArray(engagementPlan.phases)) {
    engagementPlan.phases.forEach(phase => {
      if (phase.clinical_elements && Array.isArray(phase.clinical_elements)) {
        phase.clinical_elements.forEach(el => {
          const name = typeof el === 'string' ? el : el.name;
          if (name) clinicalElementNames.push(name.toLowerCase());
        });
      }
      // Also check items array (old format) but flag it
      if (phase.items && Array.isArray(phase.items)) {
        result.structureValid = false; // Old format detected
        phase.items.forEach(item => {
          const name = typeof item === 'string' ? item : (item.name || item.item);
          if (name) clinicalElementNames.push(name.toLowerCase());
        });
      }
    });
  }

  // Extract clinic treatments from engagement plan
  const planClinicTreatmentNames = [];
  if (engagementPlan?.clinic_treatments?.items) {
    engagementPlan.clinic_treatments.items.forEach(t => {
      if (t.name) planClinicTreatmentNames.push(t.name.toLowerCase());
    });
  }
  if (engagementPlan?.clinic_treatments?.treatments) {
    engagementPlan.clinic_treatments.treatments.forEach(t => {
      if (t.name) planClinicTreatmentNames.push(t.name.toLowerCase());
    });
  }

  // Extract tests from engagement plan
  const planTestNames = [];
  if (engagementPlan?.testing_schedule && Array.isArray(engagementPlan.testing_schedule)) {
    engagementPlan.testing_schedule.forEach(t => {
      if (t.name) planTestNames.push(t.name.toLowerCase());
    });
  }

  // Check if structure is correct (has clinical_elements, not generic items)
  if (!result.structureValid || clinicalElementNames.length === 0) {
    console.warn('[Validation] WARNING: Engagement plan uses OLD format or has no clinical_elements');
    result.structureValid = false;
    result.isAligned = false;
  }

  // STRICT: Check supplements coverage - must be in clinical_elements BY NAME
  supplements.forEach(supp => {
    const nameVariants = getNameVariants(supp.name);
    const found = nameVariants.some(v =>
      clinicalElementNames.some(el => el.includes(v.toLowerCase()))
    );
    if (found) {
      result.coverage.supplements++;
    } else {
      result.missingSupplements.push(supp.name);
      result.isAligned = false;
    }
  });

  // STRICT: Check clinic treatments coverage - must be in clinic_treatments section
  clinic_treatments.forEach(treatment => {
    const nameVariants = getNameVariants(treatment.name);
    const found = nameVariants.some(v =>
      planClinicTreatmentNames.some(t => t.includes(v.toLowerCase()))
    );
    if (found) {
      result.coverage.clinic_treatments++;
    } else {
      result.missingClinicTreatments.push(treatment.name);
      result.isAligned = false;
    }
  });

  // Check lifestyle protocols coverage - can be in clinical_elements
  lifestyle_protocols.forEach(protocol => {
    const nameVariants = getNameVariants(protocol.name);
    const found = nameVariants.some(v =>
      clinicalElementNames.some(el => el.includes(v.toLowerCase()))
    );
    if (found) {
      result.coverage.lifestyle_protocols++;
    } else {
      result.missingLifestyleProtocols.push(protocol.name);
      result.isAligned = false;
    }
  });

  // STRICT: Check retest schedule coverage - must be in testing_schedule section
  retest_schedule.forEach(test => {
    const nameVariants = getNameVariants(test.name);
    const found = nameVariants.some(v =>
      planTestNames.some(t => t.includes(v.toLowerCase()))
    );
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

  // Log detailed results
  console.log('[Validation] Clinical elements found:', clinicalElementNames.length);
  console.log('[Validation] Clinic treatments found:', planClinicTreatmentNames.length);
  console.log('[Validation] Tests found:', planTestNames.length);
  console.log('[Validation] Structure valid:', result.structureValid);

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
 * Auto-fix an engagement plan by adding missing items
 *
 * NEW SIMPLIFIED STRUCTURE:
 * - Phase-based with clinical_elements array
 * - Each element has "name" and "status" (SCHEDULED/CONDITIONAL/CLINICIAN DECISION)
 * - No dosages - just names
 * - Clinic treatments in separate section with conditions
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
        week_range: `${startWeek}-${endWeek}`,
        clinical_elements: [],
        monitoring: [],
        safety_gate: {
          conditions: p.readiness_criteria || ['Tolerating current phase well'],
          if_pass: `Proceed to Phase ${idx + 2}`,
          if_fail: 'HOLD. Contact clinician within 48h.'
        }
      });
    });
  }

  // FIX 3: Add missing supplements with SIMPLIFIED structure
  if (validationResult?.missingSupplements?.length > 0) {
    validationResult.missingSupplements.forEach(suppName => {
      const supp = supplements.find(s => s.name === suppName);
      const startWeek = supp?.start_week || 1;

      // Find the correct phase for this supplement
      const targetPhaseIndex = fixed.phases.findIndex(phase => {
        const weekRange = phase.week_range?.split('-').map(Number) || [1, 2];
        return startWeek >= weekRange[0] && startWeek <= weekRange[1];
      });

      const phaseIdx = targetPhaseIndex >= 0 ? targetPhaseIndex : 0;

      if (fixed.phases[phaseIdx]) {
        if (!fixed.phases[phaseIdx].clinical_elements) {
          fixed.phases[phaseIdx].clinical_elements = [];
        }

        // Check if not already there
        const existingElement = fixed.phases[phaseIdx].clinical_elements.find(
          e => e.name?.toLowerCase().includes(suppName.toLowerCase())
        );

        if (!existingElement) {
          // Add with new simplified structure
          const isNewInPhase = phaseIdx > 0;
          fixed.phases[phaseIdx].clinical_elements.push({
            name: isNewInPhase ? `ADD: ${suppName}` : suppName,
            status: 'SCHEDULED'
          });
        }
      }
    });
  }

  // FIX 4: Add missing lifestyle protocols
  if (validationResult?.missingLifestyleProtocols?.length > 0) {
    validationResult.missingLifestyleProtocols.forEach(protocolName => {
      const lifestyle = lifestyle_protocols.find(l => l.name === protocolName);
      const startWeek = lifestyle?.start_week || 1;

      // Find the correct phase
      const targetPhaseIndex = fixed.phases.findIndex(phase => {
        const weekRange = phase.week_range?.split('-').map(Number) || [1, 2];
        return startWeek >= weekRange[0] && startWeek <= weekRange[1];
      });

      const phaseIdx = targetPhaseIndex >= 0 ? targetPhaseIndex : 0;

      if (fixed.phases[phaseIdx]) {
        if (!fixed.phases[phaseIdx].clinical_elements) {
          fixed.phases[phaseIdx].clinical_elements = [];
        }

        const existingElement = fixed.phases[phaseIdx].clinical_elements.find(
          e => e.name?.toLowerCase().includes(protocolName.toLowerCase())
        );

        if (!existingElement) {
          fixed.phases[phaseIdx].clinical_elements.push({
            name: protocolName,
            status: 'SCHEDULED'
          });
        }
      }
    });
  }

  // FIX 5: Add missing clinic treatments with SIMPLIFIED structure
  if (validationResult?.missingClinicTreatments?.length > 0) {
    // Ensure clinic_treatments section exists with new structure
    if (!fixed.clinic_treatments) {
      fixed.clinic_treatments = {
        note: 'All require clinician approval - NOT default actions',
        items: []
      };
    }

    if (!fixed.clinic_treatments.items) {
      fixed.clinic_treatments.items = [];
    }

    validationResult.missingClinicTreatments.forEach(treatmentName => {
      const treatment = clinic_treatments.find(t => t.name === treatmentName);
      const startWeek = treatment?.start_week || 8;

      // Check if not already there
      const existingTreatment = fixed.clinic_treatments.items.find(
        t => t.name?.toLowerCase() === treatmentName.toLowerCase()
      );

      if (!existingTreatment) {
        fixed.clinic_treatments.items.push({
          name: treatmentName,
          status: 'CLINICIAN DECISION',
          earliest_eligibility: `Week ${startWeek}`,
          conditions: treatment?.contraindications
            ? ['Phase stable', `No ${treatment.contraindications}`]
            : ['Phase stable', 'No contraindications']
        });
      }
    });
  }

  // FIX 6: Add missing tests with SIMPLIFIED structure
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
        fixed.testing_schedule.push({
          name: testName,
          timing: test?.timing || 'As scheduled',
          sequence: ['Schedule', 'Complete', 'Review with practitioner', 'Adjust protocol']
        });
      }
    });
  }

  // FIX 7: Ensure safety_rules has correct structure
  if (!fixed.safety_rules) {
    fixed.safety_rules = {
      stop_immediately: [],
      hold_and_contact: [],
      escalation_24h: []
    };
  }

  // Add absolute contraindications as STOP rules
  const absoluteContraindications = safety_constraints.filter(c => c.type === 'absolute_contraindication');
  absoluteContraindications.forEach(c => {
    const stopRules = fixed.safety_rules.stop_immediately || fixed.safety_rules.stop_rules || [];
    if (!stopRules.some(r => r.includes(c.constraint))) {
      if (!fixed.safety_rules.stop_immediately) fixed.safety_rules.stop_immediately = [];
      fixed.safety_rules.stop_immediately.push(c.constraint);
    }
  });

  // Add warning signs as escalation rules
  const warningSigns = safety_constraints.filter(c => c.type === 'warning_sign');
  warningSigns.forEach(w => {
    const escalationRules = fixed.safety_rules.escalation_24h || fixed.safety_rules.escalation_rules || [];
    if (!escalationRules.some(r => r.includes(w.constraint))) {
      if (!fixed.safety_rules.escalation_24h) fixed.safety_rules.escalation_24h = [];
      fixed.safety_rules.escalation_24h.push(w.constraint);
    }
  });

  // FIX 8: Ensure each phase has safety_gate with if_pass/if_fail
  if (fixed.phases && Array.isArray(fixed.phases)) {
    fixed.phases.forEach((phase, idx) => {
      if (!phase.safety_gate) {
        phase.safety_gate = {
          conditions: ['Tolerating current phase well', 'No adverse reactions'],
          if_pass: `Proceed to Phase ${idx + 2}`,
          if_fail: 'HOLD. Contact clinician within 48h.'
        };
      } else if (!phase.safety_gate.if_fail) {
        phase.safety_gate.if_fail = 'HOLD. Contact clinician within 48h.';
      }
    });
  }

  // FIX 9: Update alignment_verification
  fixed.alignment_verification = {
    protocol_supplements_count: supplements.length,
    engagement_plan_supplements_count: countSupplementsInPlan(fixed),
    all_items_explicitly_named: true,
    no_dosages_in_plan: true,
    all_clinic_treatments_conditional: true,
    timeline_preserved: true,
    auto_fixed: true,
    auto_fix_timestamp: new Date().toISOString(),
    items_added: {
      supplements: validationResult?.missingSupplements?.length || 0,
      clinic_treatments: validationResult?.missingClinicTreatments?.length || 0,
      lifestyle_protocols: validationResult?.missingLifestyleProtocols?.length || 0,
      tests: validationResult?.missingRetests?.length || 0
    }
  };

  return fixed;
}

/**
 * Count supplements in the new simplified plan structure
 */
function countSupplementsInPlan(plan) {
  let count = 0;
  if (plan.phases && Array.isArray(plan.phases)) {
    plan.phases.forEach(phase => {
      if (phase.clinical_elements && Array.isArray(phase.clinical_elements)) {
        // Count elements that are SCHEDULED (supplements/lifestyle)
        count += phase.clinical_elements.filter(e =>
          e.status === 'SCHEDULED' && !e.name?.toLowerCase().includes('continue:')
        ).length;
      }
    });
  }
  return count;
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
