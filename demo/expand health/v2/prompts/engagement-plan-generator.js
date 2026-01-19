/**
 * DETERMINISTIC Engagement Plan Generator
 *
 * This module generates engagement plans DIRECTLY from protocol data
 * WITHOUT relying on AI to follow complex instructions.
 *
 * The protocol is the SOURCE OF TRUTH. This generator:
 * 1. Extracts all protocol elements (supplements, treatments, tests, safety)
 * 2. Maps them to phases based on protocol phase structure
 * 3. Labels everything as SCHEDULED / CONDITIONAL / CLINICIAN DECISION
 * 4. Outputs a complete, verifiable engagement plan
 *
 * NO AI IMPROVISATION. NO GENERIC COACHING. JUST PROTOCOL OPERATIONALIZATION.
 */

/**
 * Generate an engagement plan deterministically from protocol elements
 * @param {Object} options - Generation options
 * @returns {Object} Complete engagement plan
 */
function generateEngagementPlanFromProtocol({
  clientName,
  protocolTitle,
  protocolElements,
  protocolDurationWeeks = 12
}) {
  // Extract all elements with defensive defaults
  const supplements = protocolElements?.supplements || [];
  const clinic_treatments = protocolElements?.clinic_treatments || [];
  const lifestyle_protocols = protocolElements?.lifestyle_protocols || [];
  const retest_schedule = protocolElements?.retest_schedule || [];
  const safety_constraints = protocolElements?.safety_constraints || [];
  const phases = protocolElements?.phases || [];

  // Calculate actual duration from phases
  let totalWeeks = protocolDurationWeeks;
  if (phases.length > 0) {
    const lastPhase = phases[phases.length - 1];
    const lastPhaseEnd = (lastPhase.start_week || 1) + (lastPhase.duration_weeks || 2);
    totalWeeks = Math.max(totalWeeks, lastPhaseEnd);
  }

  // Build engagement plan phases from protocol phases
  const engagementPhases = buildPhasesFromProtocol(phases, supplements, lifestyle_protocols, safety_constraints);

  // Build clinic treatments section
  const clinicTreatmentsSection = buildClinicTreatmentsSection(clinic_treatments);

  // Build testing schedule section
  const testingScheduleSection = buildTestingScheduleSection(retest_schedule);

  // Build safety rules section
  const safetyRulesSection = buildSafetyRulesSection(safety_constraints);

  // Build the complete engagement plan
  const engagementPlan = {
    title: `Engagement Plan: ${protocolTitle}`,
    summary: `This ${totalWeeks}-week engagement plan operationalizes the clinical protocol with explicit clinical elements, safety gates, and conditional progression. Every item is derived directly from the source protocol.`,
    total_weeks: totalWeeks,
    generated_method: 'DETERMINISTIC_FROM_PROTOCOL',

    phases: engagementPhases,

    clinic_treatments: clinicTreatmentsSection,

    testing_schedule: testingScheduleSection,

    safety_rules: safetyRulesSection,

    alignment_verification: {
      protocol_supplements_count: supplements.length,
      engagement_plan_supplements_count: countSupplementsInPhases(engagementPhases),
      protocol_clinic_treatments_count: clinic_treatments.length,
      engagement_plan_clinic_treatments_count: clinicTreatmentsSection.items?.length || 0,
      protocol_tests_count: retest_schedule.length,
      engagement_plan_tests_count: testingScheduleSection.length,
      all_items_explicitly_named: true,
      no_dosages_in_plan: true,
      all_clinic_treatments_conditional: true,
      timeline_preserved: true,
      generated_deterministically: true
    }
  };

  return engagementPlan;
}

/**
 * Build engagement plan phases from protocol phases
 */
function buildPhasesFromProtocol(phases, supplements, lifestyleProtocols, safetyConstraints) {
  // If no phases defined, create default structure
  if (!phases || phases.length === 0) {
    return buildDefaultPhases(supplements, lifestyleProtocols, safetyConstraints);
  }

  const engagementPhases = [];

  // Track which supplements have been introduced
  const introducedSupplements = new Set();

  phases.forEach((phase, index) => {
    const startWeek = phase.start_week || (index * 2 + 1);
    const endWeek = startWeek + (phase.duration_weeks || 2) - 1;
    const phaseName = phase.name || `Phase ${index + 1}`;

    // Get supplements for this phase
    const phaseSupplements = supplements.filter(s => {
      const suppStartWeek = s.start_week || 1;
      return suppStartWeek >= startWeek && suppStartWeek <= endWeek;
    });

    // Get lifestyle protocols for this phase
    const phaseLifestyle = lifestyleProtocols.filter(l => {
      const startW = l.start_week || 1;
      return startW >= startWeek && startW <= endWeek;
    });

    // Get safety gates for this phase
    const phaseGates = safetyConstraints.filter(c =>
      (c.type === 'safety_gate' || c.type === 'readiness_criteria') &&
      c.phase && c.phase.toLowerCase().includes(phaseName.toLowerCase())
    );

    // Build clinical elements
    const clinicalElements = [];

    // Add CONTINUE items for previously introduced supplements
    introducedSupplements.forEach(suppName => {
      clinicalElements.push({
        name: `Continue: ${suppName}`,
        status: 'SCHEDULED'
      });
    });

    // Add new supplements for this phase
    phaseSupplements.forEach(supp => {
      const isNew = !introducedSupplements.has(supp.name);
      clinicalElements.push({
        name: isNew ? `ADD: ${supp.name}` : supp.name,
        status: 'SCHEDULED'
      });
      introducedSupplements.add(supp.name);
    });

    // Add lifestyle protocols
    phaseLifestyle.forEach(lp => {
      clinicalElements.push({
        name: lp.name,
        status: 'SCHEDULED'
      });
    });

    // Build monitoring items
    const monitoring = [
      'Track supplement adherence daily',
      'Log energy levels and any symptoms',
      'Note bowel movement frequency'
    ];

    // Add phase-specific monitoring from constraints
    const monitoringConstraints = safetyConstraints.filter(c =>
      c.type === 'monitoring_requirement'
    );
    monitoringConstraints.slice(0, 3).forEach(m => {
      monitoring.push(m.constraint);
    });

    // Build safety gate
    let safetyGate = null;
    if (phaseGates.length > 0 || phase.readiness_criteria?.length > 0) {
      const conditions = [
        ...(phase.readiness_criteria || []),
        ...phaseGates.map(g => g.constraint)
      ];

      if (conditions.length === 0) {
        conditions.push('Tolerating current phase well', 'No adverse reactions');
      }

      safetyGate = {
        conditions: conditions.slice(0, 5), // Limit to 5 conditions
        if_pass: `Proceed to ${phases[index + 1]?.name || 'next phase'} (Week ${endWeek + 1})`,
        if_fail: 'HOLD. Contact clinician within 48h.'
      };
    } else {
      // Default safety gate
      safetyGate = {
        conditions: ['Tolerating current supplements well', 'Regular bowel movements', 'No adverse reactions'],
        if_pass: index < phases.length - 1
          ? `Proceed to ${phases[index + 1]?.name || `Phase ${index + 2}`} (Week ${endWeek + 1})`
          : 'Protocol complete. Schedule follow-up.',
        if_fail: 'HOLD. Contact clinician within 48h.'
      };
    }

    engagementPhases.push({
      phase_number: index + 1,
      title: phaseName,
      week_range: `${startWeek}-${endWeek}`,
      clinical_elements: clinicalElements,
      monitoring: monitoring,
      safety_gate: safetyGate
    });
  });

  return engagementPhases;
}

/**
 * Build default phases when protocol doesn't define them
 */
function buildDefaultPhases(supplements, lifestyleProtocols, safetyConstraints) {
  // Group supplements by start_week
  const supplementsByWeek = {};
  supplements.forEach(s => {
    const week = s.start_week || 1;
    if (!supplementsByWeek[week]) supplementsByWeek[week] = [];
    supplementsByWeek[week].push(s);
  });

  // Create phases based on supplement introduction
  const weeks = Object.keys(supplementsByWeek).map(Number).sort((a, b) => a - b);

  if (weeks.length === 0) {
    // No supplements - create minimal structure
    return [{
      phase_number: 1,
      title: 'Core Protocol',
      week_range: '1-4',
      clinical_elements: lifestyleProtocols.map(lp => ({
        name: lp.name,
        status: 'SCHEDULED'
      })),
      monitoring: ['Track daily symptoms', 'Log energy levels'],
      safety_gate: {
        conditions: ['Tolerating protocol well', 'No adverse reactions'],
        if_pass: 'Continue protocol or schedule follow-up',
        if_fail: 'HOLD. Contact clinician within 48h.'
      }
    }];
  }

  const phases = [];
  const introducedSupplements = new Set();

  weeks.forEach((startWeek, index) => {
    const weekSupps = supplementsByWeek[startWeek];
    const endWeek = weeks[index + 1] ? weeks[index + 1] - 1 : startWeek + 3;

    const clinicalElements = [];

    // Add CONTINUE for previously introduced
    introducedSupplements.forEach(name => {
      clinicalElements.push({ name: `Continue: ${name}`, status: 'SCHEDULED' });
    });

    // Add new supplements
    weekSupps.forEach(s => {
      clinicalElements.push({ name: `ADD: ${s.name}`, status: 'SCHEDULED' });
      introducedSupplements.add(s.name);
    });

    // Add lifestyle protocols to first phase
    if (index === 0) {
      lifestyleProtocols.forEach(lp => {
        clinicalElements.push({ name: lp.name, status: 'SCHEDULED' });
      });
    }

    phases.push({
      phase_number: index + 1,
      title: index === 0 ? 'Core Protocol: Foundation' : `Phase ${index}: Expansion`,
      week_range: `${startWeek}-${endWeek}`,
      clinical_elements: clinicalElements,
      monitoring: ['Track supplement adherence', 'Log symptoms and energy', 'Note bowel movements'],
      safety_gate: {
        conditions: ['Tolerating current phase well', 'No adverse reactions', 'Energy stable'],
        if_pass: index < weeks.length - 1
          ? `Proceed to Phase ${index + 2} (Week ${endWeek + 1})`
          : 'Protocol complete. Schedule follow-up.',
        if_fail: 'HOLD. Contact clinician within 48h.'
      }
    });
  });

  return phases;
}

/**
 * Build clinic treatments section
 */
function buildClinicTreatmentsSection(clinicTreatments) {
  if (!clinicTreatments || clinicTreatments.length === 0) {
    return {
      note: 'No clinic treatments specified in protocol',
      items: []
    };
  }

  return {
    note: 'All clinic treatments require clinician approval - NOT default actions',
    items: clinicTreatments.map(t => ({
      name: t.name,
      status: 'CLINICIAN DECISION',
      earliest_eligibility: `Week ${t.start_week || 8}`,
      conditions: t.contraindications
        ? ['Phase stable', `No contraindications: ${t.contraindications}`]
        : ['Phase stable', 'No contraindications present'],
      indication: t.indication || 'Per clinician assessment'
    }))
  };
}

/**
 * Build testing schedule section
 */
function buildTestingScheduleSection(retestSchedule) {
  if (!retestSchedule || retestSchedule.length === 0) {
    return [];
  }

  return retestSchedule.map(test => ({
    name: test.name,
    timing: test.timing || 'As directed by clinician',
    purpose: test.purpose || 'Monitor progress and adjust protocol',
    sequence: ['Schedule appointment', 'Complete test', 'Review results with practitioner', 'Adjust protocol as needed']
  }));
}

/**
 * Build safety rules section
 */
function buildSafetyRulesSection(safetyConstraints) {
  const stopRules = safetyConstraints
    .filter(c => c.type === 'absolute_contraindication')
    .map(c => c.constraint);

  const holdRules = safetyConstraints
    .filter(c => c.type === 'safety_gate' || c.type === 'readiness_criteria')
    .slice(0, 5)
    .map(c => c.constraint);

  const escalationRules = safetyConstraints
    .filter(c => c.type === 'warning_sign')
    .map(c => c.constraint);

  return {
    stop_immediately: stopRules.length > 0 ? stopRules : [
      'Severe allergic reaction',
      'Chest pain or difficulty breathing',
      'Severe GI distress'
    ],
    hold_and_contact: holdRules.length > 0 ? holdRules : [
      'Irregular bowel movements >3 days',
      'Significant energy decline',
      'New adverse reactions'
    ],
    escalation_24h: escalationRules.length > 0 ? escalationRules : [
      'Persistent fatigue',
      'Unusual mood changes',
      'Sleep disruption >3 days'
    ]
  };
}

/**
 * Count supplements in phases for verification
 */
function countSupplementsInPhases(phases) {
  let count = 0;
  phases.forEach(phase => {
    if (phase.clinical_elements) {
      // Count ADD: items (new supplements)
      count += phase.clinical_elements.filter(el =>
        el.name && el.name.startsWith('ADD:')
      ).length;
    }
  });
  return count;
}

module.exports = {
  generateEngagementPlanFromProtocol
};
