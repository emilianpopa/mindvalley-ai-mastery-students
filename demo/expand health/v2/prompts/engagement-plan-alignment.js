/**
 * Engagement Plan Alignment Module
 *
 * This module ensures engagement plans are fully aligned with their source protocols.
 * It extracts all clinical elements from a protocol and validates that the engagement
 * plan covers every item.
 *
 * RULE: The protocol is the source of truth. The engagement plan must include
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
    safety_constraints: []
  };

  // Handle different protocol structures
  const protocolData = typeof protocol === 'string' ? JSON.parse(protocol) : protocol;

  // Extract from core_protocol
  if (protocolData.core_protocol?.items) {
    protocolData.core_protocol.items.forEach(item => {
      categorizeItem(item, elements);
    });
  }

  // Extract from phased_expansion
  if (protocolData.phased_expansion) {
    protocolData.phased_expansion.forEach(phase => {
      if (phase.items) {
        phase.items.forEach(item => {
          categorizeItem(item, elements, phase.phase_name);
        });
      }
      // Extract safety gates as constraints
      if (phase.safety_gates) {
        phase.safety_gates.forEach(gate => {
          elements.safety_constraints.push({
            constraint: gate,
            phase: phase.phase_name
          });
        });
      }
    });
  }

  // Extract clinic_treatments
  if (protocolData.clinic_treatments?.available_modalities) {
    protocolData.clinic_treatments.available_modalities.forEach(treatment => {
      elements.clinic_treatments.push({
        name: treatment.name,
        indication: treatment.indication,
        contraindications: treatment.contraindications,
        protocol: treatment.protocol,
        notes: treatment.notes,
        phase: protocolData.clinic_treatments.phase
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
        elements.safety_constraints.push({ constraint: c, type: 'absolute' });
      });
    }
    if (protocolData.safety_summary.monitoring_requirements) {
      protocolData.safety_summary.monitoring_requirements.forEach(m => {
        elements.safety_constraints.push({ constraint: m, type: 'monitoring' });
      });
    }
    if (protocolData.safety_summary.warning_signs) {
      protocolData.safety_summary.warning_signs.forEach(w => {
        elements.safety_constraints.push({ constraint: w, type: 'warning' });
      });
    }
  }

  // Extract from modules array (alternative structure)
  if (protocolData.modules) {
    protocolData.modules.forEach(module => {
      if (module.items) {
        module.items.forEach(item => {
          categorizeItem(item, elements, module.name);
        });
      }
    });
  }

  return elements;
}

/**
 * Categorize an item into the appropriate element type
 */
function categorizeItem(item, elements, phaseName = null) {
  const itemObj = typeof item === 'string' ? { name: item } : item;
  const category = itemObj.category?.toLowerCase() || guessCategory(itemObj.name);

  const enrichedItem = {
    ...itemObj,
    phase: phaseName
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
    'phosphatidylcholine iv', 'glutathione iv', 'nad+'
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
    'exercise', 'movement',
    'stress', 'meditation',
    'diet', 'food', 'eating',
    'fasting', 'intermittent'
  ];
  return lifestyleKeywords.some(kw => lowerName.includes(kw));
}

/**
 * Generate the engagement plan prompt that is STRICTLY aligned to the protocol
 * @param {Object} options - Generation options
 * @returns {string} The AI prompt
 */
function generateAlignedEngagementPlanPrompt({
  clientName,
  protocolTitle,
  protocolElements,
  personalityType,
  communicationPreferences,
  protocolDurationWeeks = 8
}) {
  const { supplements, clinic_treatments, lifestyle_protocols, retest_schedule, safety_constraints } = protocolElements;

  // Build the checklist that the AI must cover
  const supplementsList = supplements.map(s => `- ${s.name}${s.dosage ? ` (${s.dosage})` : ''}${s.timing ? ` - ${s.timing}` : ''}${s.phase ? ` [${s.phase}]` : ''}`).join('\n');
  const clinicList = clinic_treatments.map(t => `- ${t.name}${t.notes ? ` - ${t.notes}` : ''}${t.contraindications ? ` (Constraint: ${t.contraindications})` : ''}`).join('\n');
  const lifestyleList = lifestyle_protocols.map(l => `- ${l.name}${l.timing ? ` - ${l.timing}` : ''}`).join('\n');
  const retestList = retest_schedule.map(r => `- ${r.name}${r.timing ? ` (${r.timing})` : ''}`).join('\n');
  const constraintsList = safety_constraints.map(c => `- ${c.constraint}${c.type ? ` [${c.type}]` : ''}`).join('\n');

  return `You are a patient engagement specialist creating an engagement plan that MUST be 100% aligned with the source protocol.

## CRITICAL ALIGNMENT RULE
The protocol is the SOURCE OF TRUTH. Your engagement plan must:
1. Include EVERY supplement listed below - no omissions
2. Include EVERY clinic treatment listed below - no omissions
3. Include EVERY lifestyle protocol listed below - no omissions
4. Include ALL retest/lab scheduling from the protocol
5. Respect ALL safety constraints in scheduling
6. DO NOT add any treatments, supplements, or modalities NOT in this list
7. DO NOT invent new therapies (no HBOT, NAD+, red light, etc. unless explicitly listed below)

## PATIENT INFORMATION
- Name: ${clientName}
- Personality Type: ${personalityType || 'Not specified'}
- Communication Preferences: ${communicationPreferences || 'Standard'}

## PROTOCOL: ${protocolTitle}
Duration: ${protocolDurationWeeks} weeks

### SUPPLEMENTS TO INCLUDE (ALL REQUIRED)
${supplementsList || 'None specified'}

### CLINIC TREATMENTS TO INCLUDE (ALL REQUIRED)
${clinicList || 'None specified'}

### LIFESTYLE PROTOCOLS TO INCLUDE (ALL REQUIRED)
${lifestyleList || 'None specified'}

### RETEST SCHEDULE TO INCLUDE (ALL REQUIRED)
${retestList || 'None specified'}

### SAFETY CONSTRAINTS (MUST BE RESPECTED)
${constraintsList || 'None specified'}

## PHASE MAPPING
Map the protocol phases to engagement weeks:
- Foundation/Core Protocol → Weeks 1-2
- Phase 1 items → Week 3
- Phase 2 items → Weeks 4-5
- Phase 3 items → Week 6+
- Retesting → Schedule at appropriate milestones

## OUTPUT FORMAT
Return ONLY valid JSON with this structure:
{
  "title": "Engagement Plan for ${clientName}",
  "summary": "2-3 sentence overview aligned to protocol goals",
  "alignment_checklist": {
    "supplements_included": [list all supplement names],
    "clinic_treatments_included": [list all clinic treatment names],
    "lifestyle_protocols_included": [list all lifestyle protocol names],
    "retest_items_included": [list all retest items]
  },
  "total_weeks": 4,
  "phases": [
    {
      "phase_number": 1,
      "title": "Phase 1: Foundation (Weeks 1-2)",
      "subtitle": "Brief description",
      "supplements": ["List specific supplements for this phase"],
      "clinic_treatments": ["List specific clinic treatments for this phase, or 'None this phase'"],
      "lifestyle_actions": ["List lifestyle protocols for this phase"],
      "items": [
        "Concrete action item 1",
        "Concrete action item 2"
      ],
      "progress_goal": "Measurable adherence goal",
      "check_in_prompts": ["Question for patient"]
    }
  ],
  "retest_schedule": [
    {
      "test": "Test name from protocol",
      "timing": "When to schedule",
      "action": "Client action (e.g., 'Schedule appointment')"
    }
  ],
  "safety_notes": ["Safety constraints translated to client language"],
  "communication_schedule": {
    "check_in_frequency": "Every 3 days",
    "preferred_channel": "WhatsApp",
    "message_tone": "Encouraging and supportive"
  },
  "success_metrics": ["Metric 1", "Metric 2"]
}

## VALIDATION BEFORE RETURNING
Before returning, verify:
✓ Every supplement from the protocol appears in at least one phase
✓ Every clinic treatment from the protocol appears in at least one phase
✓ Every lifestyle protocol appears in at least one phase
✓ All retest items are scheduled
✓ No treatments were added that aren't in the protocol
✓ Safety constraints are reflected in scheduling (e.g., "on non-DMSA days")

Return ONLY valid JSON. No markdown, no code blocks.`;
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

  // Flatten all items mentioned in the engagement plan
  const planText = JSON.stringify(engagementPlan).toLowerCase();

  // Check supplements coverage
  protocolElements.supplements.forEach(supp => {
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
  protocolElements.clinic_treatments.forEach(treatment => {
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
  protocolElements.lifestyle_protocols.forEach(protocol => {
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
  protocolElements.retest_schedule.forEach(test => {
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
    supplements: protocolElements.supplements.length > 0
      ? Math.round((result.coverage.supplements / protocolElements.supplements.length) * 100)
      : 100,
    clinic_treatments: protocolElements.clinic_treatments.length > 0
      ? Math.round((result.coverage.clinic_treatments / protocolElements.clinic_treatments.length) * 100)
      : 100,
    lifestyle_protocols: protocolElements.lifestyle_protocols.length > 0
      ? Math.round((result.coverage.lifestyle_protocols / protocolElements.lifestyle_protocols.length) * 100)
      : 100,
    retest_schedule: protocolElements.retest_schedule.length > 0
      ? Math.round((result.coverage.retest_schedule / protocolElements.retest_schedule.length) * 100)
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
    'omega-3': ['omega 3', 'fish oil', 'epa/dha', 'epa dha'],
    'coenzyme q10': ['coq10', 'ubiquinol', 'ubiquinone'],
    'alpha-lipoic acid': ['ala', 'lipoic acid'],
    'iv glutathione': ['glutathione iv', 'glutathione push', 'iv glutathione push'],
    'phosphatidylcholine iv': ['pc iv', 'phosphatidylcholine'],
    'ozone therapy': ['ozone', 'autohemotherapy', 'mah', 'eboo'],
    'dmsa': ['2,3-dimercaptosuccinic acid', 'dimercaptosuccinic'],
    'hydration protocol': ['hydration', 'water intake'],
    'elimination support': ['elimination', 'bowel support', 'bowel movement']
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
 * @param {Object} engagementPlan - The engagement plan to fix
 * @param {Object} validationResult - The validation result with missing items
 * @param {Object} protocolElements - The original protocol elements
 * @returns {Object} Fixed engagement plan
 */
function autoFixEngagementPlan(engagementPlan, validationResult, protocolElements) {
  const fixed = JSON.parse(JSON.stringify(engagementPlan)); // Deep clone

  // Add missing supplements to appropriate phases
  if (validationResult.missingSupplements.length > 0) {
    validationResult.missingSupplements.forEach(suppName => {
      const supp = protocolElements.supplements.find(s => s.name === suppName);
      const phaseIndex = mapPhaseToWeek(supp?.phase);

      if (fixed.phases[phaseIndex]) {
        if (!fixed.phases[phaseIndex].supplements) {
          fixed.phases[phaseIndex].supplements = [];
        }
        fixed.phases[phaseIndex].supplements.push(suppName);
        fixed.phases[phaseIndex].items.push(`Take ${suppName} as prescribed (per protocol)`);
      }
    });
  }

  // Add missing clinic treatments
  if (validationResult.missingClinicTreatments.length > 0) {
    validationResult.missingClinicTreatments.forEach(treatmentName => {
      const treatment = protocolElements.clinic_treatments.find(t => t.name === treatmentName);
      // Add to Phase 3 or 4 (later phases for clinic treatments)
      const phaseIndex = Math.min(2, fixed.phases.length - 1);

      if (fixed.phases[phaseIndex]) {
        if (!fixed.phases[phaseIndex].clinic_treatments) {
          fixed.phases[phaseIndex].clinic_treatments = [];
        }
        fixed.phases[phaseIndex].clinic_treatments.push(treatmentName);

        let actionItem = `Schedule ${treatmentName} at clinic`;
        if (treatment?.contraindications) {
          actionItem += ` (${treatment.contraindications})`;
        }
        fixed.phases[phaseIndex].items.push(actionItem);
      }
    });
  }

  // Add missing retest items
  if (validationResult.missingRetests.length > 0) {
    if (!fixed.retest_schedule) {
      fixed.retest_schedule = [];
    }
    validationResult.missingRetests.forEach(testName => {
      const test = protocolElements.retest_schedule.find(t => t.name === testName);
      fixed.retest_schedule.push({
        test: testName,
        timing: test?.timing || 'As directed by clinician',
        action: `Schedule ${testName} appointment`
      });
    });
  }

  // Add alignment note
  fixed._alignment_note = `Auto-fixed to include ${validationResult.missingSupplements.length} supplements, ${validationResult.missingClinicTreatments.length} clinic treatments, and ${validationResult.missingRetests.length} retest items that were missing from original generation.`;

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

module.exports = {
  extractProtocolElements,
  generateAlignedEngagementPlanPrompt,
  validateEngagementPlanAlignment,
  autoFixEngagementPlan,
  getNameVariants
};
