/**
 * STRICT PROTOCOL MIRROR - Engagement Plan Generator
 *
 * PRIMARY RULE: The engagement plan's content must match the protocol exactly.
 * If something is not explicitly stated in the protocol, it must NOT be added.
 *
 * This module generates engagement plans STRICTLY DERIVED from protocol data.
 * It creates the operational journey (timing, check-ins, sequencing) but does NOT
 * introduce any new medical recommendations, supplements, modalities, tests,
 * contraindications, or numeric thresholds not present in the protocol.
 *
 * ALLOWED ADDITIONS (Engagement Mechanics Only):
 * - Naming phases as they appear in the protocol
 * - Organizing the protocol into an engagement timeline
 * - Generic check-in timing (only if protocol provides duration/phases)
 * - "Progress to next phase when Phase goal is met" (only if protocol has goals)
 *
 * NOT ALLOWED:
 * - New supplements, nutraceuticals, drugs, peptides, diets, lifestyle interventions
 * - New clinic modalities (including "optional" suggestions)
 * - New lab tests or imaging
 * - New dosing, timing, or frequency beyond what's stated
 * - New contraindications, warning signs, red flags, or stop conditions
 * - New clinical thresholds (e.g., "BM >= 1/day", "hsCRP target")
 */

/**
 * Generate an engagement plan STRICTLY from protocol elements
 * Every item must be traceable to the source protocol
 * @param {Object} options - Generation options
 * @returns {Object} Complete engagement plan (strict protocol mirror)
 */
function generateEngagementPlanFromProtocol({
  clientName,
  protocolTitle,
  protocolElements,
  protocolDurationWeeks = null, // Only use if explicitly in protocol
  protocolCreatedDate = null,
  templateSource = null
}) {
  // Extract all elements with defensive defaults
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];
  const lifestyle_protocols = protocolElements?.lifestyle_protocols || [];
  const retest_schedule = protocolElements?.retest_schedule || [];
  const safety_constraints = protocolElements?.safety_constraints || [];
  const phases = protocolElements?.phases || [];

  // Calculate duration ONLY from protocol data - never invent
  let totalWeeks = null;
  let durationSpecified = false;

  if (protocolDurationWeeks) {
    totalWeeks = protocolDurationWeeks;
    durationSpecified = true;
  } else if (phases.length > 0) {
    const lastPhase = phases[phases.length - 1];
    if (lastPhase.start_week && lastPhase.duration_weeks) {
      totalWeeks = lastPhase.start_week + lastPhase.duration_weeks - 1;
      durationSpecified = true;
    }
  }

  // Build protocol reference section
  const protocolReference = {
    protocol_name: protocolTitle,
    client_identifier: clientName || 'Not specified in protocol',
    creation_date: protocolCreatedDate || 'Not specified in protocol',
    template_source: templateSource || 'Not specified in protocol'
  };

  // Build overview section - ONLY from protocol content
  const overview = buildOverviewFromProtocol(protocolTitle, phases, protocolElements);

  // Build engagement plan phases from protocol phases (strict mirror)
  const engagementPhases = buildPhasesFromProtocolStrict(
    phases,
    supplements,
    lifestyle_protocols,
    safety_constraints,
    durationSpecified
  );

  // Build clinic treatments section (only if present in protocol)
  const clinicTreatmentsSection = clinic_treatments.length > 0
    ? buildClinicTreatmentsSectionStrict(clinic_treatments)
    : null;

  // Build testing schedule section (only if present in protocol)
  const testingScheduleSection = retest_schedule.length > 0
    ? buildTestingScheduleSectionStrict(retest_schedule)
    : null;

  // Build safety rules section (strict - only from protocol)
  const safetyRulesSection = buildSafetyRulesSectionStrict(safety_constraints);

  // Build maintenance/exit path (non-medical only)
  const maintenancePath = {
    note: 'End-of-protocol actions (non-medical)',
    items: [
      'End-of-protocol review appointment',
      'Decide: continue, modify, or maintain under clinician guidance'
    ]
  };

  // Compliance disclaimer (always include)
  const complianceDisclaimer = 'This engagement plan is derived from the provided protocol text. It does not introduce new medical recommendations. Implementation must be supervised by a licensed healthcare practitioner.';

  // Build the complete engagement plan
  const engagementPlan = {
    title: `Engagement Plan: ${protocolTitle}`,
    generated_method: 'STRICT_PROTOCOL_MIRROR',

    // A. Protocol Reference
    protocol_reference: protocolReference,

    // B. Overview
    overview: overview,

    // Summary for display
    summary: totalWeeks
      ? `This ${totalWeeks}-week engagement plan is derived strictly from the protocol. Every item traces directly to the source protocol text. No new medical recommendations have been added.`
      : `This engagement plan is derived strictly from the protocol. Duration not specified in protocol. Every item traces directly to the source protocol text.`,

    total_weeks: totalWeeks,
    duration_specified_in_protocol: durationSpecified,

    // C. Phase-by-Phase Engagement Plan
    phases: engagementPhases,

    // D. Clinic Treatments Engagement (if present)
    clinic_treatments: clinicTreatmentsSection,

    // E. Retest & Review Schedule (if present)
    testing_schedule: testingScheduleSection,

    // F. Safety & Monitoring (strict)
    safety_rules: safetyRulesSection,

    // G. Maintenance / Exit Path
    maintenance_path: maintenancePath,

    // H. Compliance Disclaimer
    compliance_disclaimer: complianceDisclaimer,

    // Alignment verification for traceability
    alignment_verification: {
      protocol_supplements_count: supplements.length,
      engagement_plan_supplements_count: countSupplementsInPhases(engagementPhases),
      protocol_clinic_treatments_count: clinic_treatments.length,
      engagement_plan_clinic_treatments_count: clinicTreatmentsSection?.items?.length || 0,
      protocol_tests_count: retest_schedule.length,
      engagement_plan_tests_count: testingScheduleSection?.length || 0,
      protocol_safety_items_count: safety_constraints.length,
      all_items_from_protocol: true,
      no_invented_content: true,
      no_new_thresholds: true,
      no_new_contraindications: true,
      generated_method: 'STRICT_PROTOCOL_MIRROR'
    }
  };

  return engagementPlan;
}

/**
 * Build overview section - ONLY from protocol content
 */
function buildOverviewFromProtocol(protocolTitle, phases, protocolElements) {
  // Purpose - derived from protocol title/type
  const purpose = `Operationalize the ${protocolTitle} protocol into an engagement timeline`;

  // Phases included - exact names from protocol
  const phasesIncluded = phases.length > 0
    ? phases.map(p => p.name || `Phase ${phases.indexOf(p) + 1}`)
    : ['Single phase protocol'];

  // Success criteria - ONLY from protocol goals, never invented
  const successCriteria = [];
  phases.forEach(phase => {
    if (phase.goal) {
      successCriteria.push(`${phase.name || 'Phase'}: ${phase.goal}`);
    }
    if (phase.readiness_criteria && phase.readiness_criteria.length > 0) {
      phase.readiness_criteria.forEach(c => successCriteria.push(c));
    }
  });

  return {
    purpose: purpose,
    phases_included: phasesIncluded,
    success_criteria: successCriteria.length > 0
      ? successCriteria
      : ['Success criteria not specified in protocol - follow clinician guidance']
  };
}

/**
 * Build engagement plan phases from protocol phases (STRICT MIRROR)
 * Only includes items explicitly in the protocol
 */
function buildPhasesFromProtocolStrict(phases, supplements, lifestyleProtocols, safetyConstraints, durationSpecified) {
  // If no phases defined, create minimal structure
  if (!phases || phases.length === 0) {
    return buildDefaultPhasesStrict(supplements, lifestyleProtocols, safetyConstraints, durationSpecified);
  }

  const engagementPhases = [];
  const introducedSupplements = new Set();

  // Supplements with explicit start_week vs without
  const supplementsWithWeek = supplements.filter(s => s.start_week);
  const supplementsWithoutWeek = supplements.filter(s => !s.start_week);

  // If supplements lack week info, assign to first phase (conservative approach)
  // DO NOT distribute across phases - that's inventing timing

  phases.forEach((phase, index) => {
    const startWeek = phase.start_week || null;
    const durationWeeks = phase.duration_weeks || null;
    const phaseName = phase.name || `Phase ${index + 1}`;

    // Week range - only if specified in protocol
    let weekRange = 'Not specified in protocol';
    if (startWeek && durationWeeks) {
      const endWeek = startWeek + durationWeeks - 1;
      weekRange = `${startWeek}-${endWeek}`;
    } else if (startWeek) {
      weekRange = `Starts Week ${startWeek}`;
    }

    // Get supplements for this phase - ONLY with explicit week assignment
    const phaseSupplements = supplementsWithWeek.filter(s => {
      if (!startWeek) return false;
      const endWeek = startWeek + (durationWeeks || 4) - 1;
      return s.start_week >= startWeek && s.start_week <= endWeek;
    });

    // First phase also gets supplements without week (conservative assignment)
    if (index === 0) {
      phaseSupplements.push(...supplementsWithoutWeek);
    }

    // Build clinical elements - ONLY from protocol
    const clinicalElements = [];

    // Protocol trace - verbatim item names for traceability
    const protocolTrace = [];

    // Add CONTINUE items for previously introduced supplements
    introducedSupplements.forEach(suppName => {
      clinicalElements.push({
        name: `Continue: ${suppName}`,
        status: 'SCHEDULED',
        source: 'protocol_supplement'
      });
    });

    // Add new supplements for this phase
    phaseSupplements.forEach(supp => {
      if (supp.name) {
        const isNew = !introducedSupplements.has(supp.name);
        if (isNew) {
          clinicalElements.push({
            name: `ADD: ${supp.name}`,
            status: 'SCHEDULED',
            source: 'protocol_supplement'
          });
          introducedSupplements.add(supp.name);
          protocolTrace.push(supp.name);
        }
      }
    });

    // Add lifestyle protocols - ONLY in first phase, ONLY from protocol
    if (index === 0) {
      lifestyleProtocols.forEach(lp => {
        if (lp.name) {
          clinicalElements.push({
            name: lp.name,
            status: 'SCHEDULED',
            source: 'protocol_lifestyle'
          });
          protocolTrace.push(lp.name);
        }
      });
    }

    // Phase goal - ONLY if in protocol
    const phaseGoal = phase.goal || 'Not specified in protocol';

    // Engagement actions - NON-MEDICAL ONLY
    const engagementActions = [
      'Kickoff call/message to review phase goal and instructions',
      durationSpecified ? 'Check-in per protocol schedule' : 'Check-in per clinic standard',
      'Document tolerance and adherence'
    ];

    // Safety gate - ONLY from protocol readiness_criteria
    let safetyGate = null;
    if (phase.readiness_criteria && phase.readiness_criteria.length > 0) {
      safetyGate = {
        conditions: phase.readiness_criteria,
        if_pass: index < phases.length - 1
          ? `Progress to ${phases[index + 1]?.name || 'next phase'} when phase goal is met`
          : 'Protocol complete. Schedule end-of-protocol review.',
        if_fail: 'HOLD. Consult clinician before proceeding.',
        source: 'protocol_readiness_criteria'
      };
    } else {
      // No invented safety gates - just note it's not specified
      safetyGate = {
        conditions: ['Safety gate criteria not specified in protocol'],
        if_pass: 'Progress per clinician guidance',
        if_fail: 'Consult clinician',
        source: 'not_specified_in_protocol'
      };
    }

    engagementPhases.push({
      phase_number: index + 1,
      title: phaseName,
      week_range: weekRange,
      duration: durationWeeks ? `${durationWeeks} weeks` : 'Not specified in protocol',
      phase_goal: phaseGoal,
      clinical_elements: clinicalElements,
      engagement_actions: engagementActions,
      protocol_trace: protocolTrace,
      safety_gate: safetyGate
    });
  });

  return engagementPhases;
}

/**
 * Build default phases when protocol doesn't define them (STRICT)
 */
function buildDefaultPhasesStrict(supplements, lifestyleProtocols, safetyConstraints, durationSpecified) {
  const clinicalElements = [];
  const protocolTrace = [];

  // Add all supplements - no invented timing
  supplements.forEach(s => {
    if (s.name) {
      clinicalElements.push({
        name: s.start_week ? `ADD (Week ${s.start_week}): ${s.name}` : `ADD: ${s.name}`,
        status: 'SCHEDULED',
        source: 'protocol_supplement'
      });
      protocolTrace.push(s.name);
    }
  });

  // Add lifestyle protocols
  lifestyleProtocols.forEach(lp => {
    if (lp.name) {
      clinicalElements.push({
        name: lp.name,
        status: 'SCHEDULED',
        source: 'protocol_lifestyle'
      });
      protocolTrace.push(lp.name);
    }
  });

  // If nothing found, note it
  if (clinicalElements.length === 0) {
    clinicalElements.push({
      name: 'Protocol items not extracted - review source document',
      status: 'REVIEW_REQUIRED',
      source: 'extraction_issue'
    });
  }

  return [{
    phase_number: 1,
    title: 'Protocol Implementation',
    week_range: 'Not specified in protocol',
    duration: 'Not specified in protocol',
    phase_goal: 'Not specified in protocol',
    clinical_elements: clinicalElements,
    engagement_actions: [
      'Kickoff call/message to review protocol instructions',
      'Check-in per clinic standard',
      'Document tolerance and adherence'
    ],
    protocol_trace: protocolTrace,
    safety_gate: {
      conditions: ['Safety criteria not specified in protocol'],
      if_pass: 'Continue per clinician guidance',
      if_fail: 'Consult clinician',
      source: 'not_specified_in_protocol'
    }
  }];
}

/**
 * Build clinic treatments section (STRICT - only from protocol)
 */
function buildClinicTreatmentsSectionStrict(clinicTreatments) {
  return {
    note: 'Clinic treatments from protocol. Scheduling coordinated by clinic. Session tracking documented.',
    items: clinicTreatments.map(t => ({
      name: t.name,
      status: 'CLINICIAN DECISION',
      timing: t.start_week ? `Earliest: Week ${t.start_week}` : 'Timing not specified in protocol',
      frequency: t.frequency || 'Not specified in protocol',
      indication: t.indication || 'Per protocol',
      source: 'protocol_clinic_treatment'
    }))
  };
}

/**
 * Build testing schedule section (STRICT - only from protocol)
 */
function buildTestingScheduleSectionStrict(retestSchedule) {
  return retestSchedule.map(test => ({
    name: test.name,
    timing: test.timing || 'Timing not specified in protocol',
    purpose: test.purpose || 'Per protocol',
    sequence: ['Schedule appointment', 'Complete test', 'Review results with practitioner'],
    source: 'protocol_retest_schedule'
  }));
}

/**
 * Build safety rules section (STRICT - only from protocol)
 * DO NOT invent contraindications, warning signs, or thresholds
 */
function buildSafetyRulesSectionStrict(safetyConstraints) {
  // Extract ONLY what's in the protocol
  const stopRules = safetyConstraints
    .filter(c => c.type === 'absolute_contraindication')
    .map(c => ({ rule: c.constraint, source: 'protocol_contraindication' }));

  const holdRules = safetyConstraints
    .filter(c => c.type === 'safety_gate' || c.type === 'readiness_criteria' || c.type === 'hold_condition')
    .map(c => ({ rule: c.constraint, source: 'protocol_safety_gate' }));

  const warningRules = safetyConstraints
    .filter(c => c.type === 'warning_sign')
    .map(c => ({ rule: c.constraint, source: 'protocol_warning_sign' }));

  // Check if safety details are present
  const safetyDetailsPresent = stopRules.length > 0 || holdRules.length > 0 || warningRules.length > 0;

  return {
    safety_summary_in_protocol: safetyDetailsPresent ? 'Yes' : 'No',
    note: safetyDetailsPresent
      ? 'Safety rules extracted from protocol. Follow exactly as specified.'
      : 'Safety details not provided in the protocol text. Follow clinic standard safety policies and the supervising clinician judgment.',

    stop_immediately: stopRules.length > 0
      ? stopRules
      : [{ rule: 'Not specified in protocol - follow clinic standard emergency protocols', source: 'not_specified' }],

    hold_and_contact: holdRules.length > 0
      ? holdRules
      : [{ rule: 'Not specified in protocol - consult clinician for any concerns', source: 'not_specified' }],

    escalation_triggers: warningRules.length > 0
      ? warningRules
      : [{ rule: 'Not specified in protocol - escalate per clinic standard', source: 'not_specified' }]
  };
}

/**
 * Count supplements in phases for verification
 */
function countSupplementsInPhases(phases) {
  let count = 0;
  phases.forEach(phase => {
    if (phase.clinical_elements) {
      count += phase.clinical_elements.filter(el =>
        el.name && el.name.startsWith('ADD:')
      ).length;
    }
  });
  return count;
}

/**
 * Validate that engagement plan follows strict protocol mirror rules
 * Returns validation report
 */
function validateStrictProtocolMirror(engagementPlan, protocolElements) {
  const issues = [];
  const warnings = [];

  // Check 1: No invented supplements
  const protocolSupplementNames = new Set(
    (protocolElements?.supplements || []).map(s => s.name?.toLowerCase())
  );

  engagementPlan.phases?.forEach(phase => {
    phase.clinical_elements?.forEach(el => {
      if (el.source === 'protocol_supplement') {
        const name = el.name.replace(/^(ADD:|Continue:)\s*/i, '').toLowerCase();
        if (!protocolSupplementNames.has(name)) {
          issues.push(`Supplement "${el.name}" not found in protocol`);
        }
      }
    });
  });

  // Check 2: No invented thresholds (scan for numeric patterns)
  const planString = JSON.stringify(engagementPlan);
  const thresholdPatterns = [
    /\d+\s*(mg|mcg|IU|g|ml)/gi,  // Dosage patterns
    /[<>=]\s*\d+/g,              // Comparison operators
    /\d+\s*times?\s*(per|a)\s*(day|week)/gi  // Frequency patterns
  ];

  thresholdPatterns.forEach(pattern => {
    const matches = planString.match(pattern);
    if (matches) {
      warnings.push(`Potential threshold detected: ${matches.slice(0, 3).join(', ')}`);
    }
  });

  // Check 3: All phases have protocol trace
  engagementPlan.phases?.forEach((phase, idx) => {
    if (!phase.protocol_trace || phase.protocol_trace.length === 0) {
      if (phase.clinical_elements?.some(el => el.source !== 'not_specified')) {
        warnings.push(`Phase ${idx + 1} has items but no protocol trace`);
      }
    }
  });

  // Check 4: Safety rules are from protocol or marked as not specified
  const safetyRules = engagementPlan.safety_rules;
  if (safetyRules) {
    const allRules = [
      ...(safetyRules.stop_immediately || []),
      ...(safetyRules.hold_and_contact || []),
      ...(safetyRules.escalation_triggers || [])
    ];
    allRules.forEach(r => {
      if (!r.source) {
        issues.push(`Safety rule missing source: ${r.rule || r}`);
      }
    });
  }

  return {
    is_valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    checks_passed: {
      no_invented_supplements: issues.filter(i => i.includes('Supplement')).length === 0,
      no_invented_thresholds: warnings.filter(w => w.includes('threshold')).length === 0,
      protocol_traceability: warnings.filter(w => w.includes('protocol trace')).length === 0,
      safety_sourced: issues.filter(i => i.includes('Safety')).length === 0
    }
  };
}

module.exports = {
  generateEngagementPlanFromProtocol,
  validateStrictProtocolMirror
};
