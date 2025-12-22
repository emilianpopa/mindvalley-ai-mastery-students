/**
 * Seed Script for Clinical Protocol Templates
 *
 * Creates pre-built protocol templates following the Clinical Protocol Engine structure:
 * - Core Protocol (Weeks 1-2) with safety gates
 * - Phased Expansion with readiness criteria
 * - Clinic Treatments with contraindications
 *
 * Run: node database/seed-clinical-templates.js
 */

const db = require('./db');

// Clinical Protocol Templates following the new structure
const clinicalTemplates = [
  // 1. Heavy Metal Detox Protocol
  {
    name: 'Heavy Metal Detoxification Protocol',
    description: 'Conservative, phased approach to heavy metal detoxification with binder rotation and safety monitoring. Suitable for patients with elevated metals on testing.',
    category: 'Detox',
    duration_weeks: 12,
    modules: [
      {
        name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
        is_core_protocol: true,
        items: [
          {
            name: 'Activated Charcoal',
            category: 'binder',
            dosage: '500mg twice daily',
            timing: 'Away from meals and medications (2 hours before or after)',
            rationale: 'Initial gentle binder to establish tolerance before introducing specific metal binders',
            contraindications: 'Do not use if constipation exceeds 24 hours; hold if GI distress occurs'
          },
          {
            name: 'Magnesium Glycinate',
            category: 'supplement',
            dosage: '400mg at bedtime',
            timing: 'Evening before sleep',
            rationale: 'Supports bowel regularity essential for detox pathways; calms nervous system',
            contraindications: 'Reduce dose if loose stools develop'
          },
          {
            name: 'Hydration Protocol',
            category: 'lifestyle',
            dosage: 'Half body weight in ounces of filtered water daily',
            timing: 'Throughout the day, minimum 8oz upon waking',
            rationale: 'Adequate hydration required for elimination pathways',
            contraindications: 'Adjust for kidney disease or fluid restrictions'
          },
          {
            name: 'Fiber Support',
            category: 'diet',
            dosage: '25-30g daily from whole food sources',
            timing: 'With meals',
            rationale: 'Supports regular bowel movements for toxin elimination',
            contraindications: 'Increase gradually to avoid bloating; reduce if constipation worsens'
          }
        ],
        safety_gates: [
          'Do not escalate to Phase 1 if bowel movements are less than once daily',
          'Hold binders if fatigue, headache, or neurological symptoms worsen',
          'Pause if insomnia develops or worsens significantly',
          'Do not proceed if skin rash or unusual symptoms appear'
        ],
        what_not_to_do: [
          'No DMSA, DMPS, or IV chelation in this phase',
          'No cold exposure (ice baths, cold plunge, cryotherapy)',
          'No sauna until bowel regularity confirmed',
          'No stacking multiple binders',
          'No aggressive detox protocols'
        ]
      },
      {
        name: 'Phase 1: Elimination Support',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 4,
        readiness_criteria: [
          'Daily bowel movements established (1-2 per day)',
          'No adverse reactions to core protocol binder',
          'Energy levels stable or improving',
          'Sleep quality maintained'
        ],
        items: [
          {
            name: 'Modified Citrus Pectin',
            category: 'binder',
            dosage: '5g twice daily',
            timing: 'Morning and evening, away from meals',
            rationale: 'Gentle metal binder with good tolerability; binds lead and mercury',
            contraindications: 'Hold if GI distress develops; not for acute heavy metal poisoning',
            conditional_on: 'Successful tolerance of Phase 0 binder'
          },
          {
            name: 'Glutathione Support (NAC)',
            category: 'supplement',
            dosage: '600mg twice daily',
            timing: 'With meals',
            rationale: 'Supports liver detoxification pathways; precursor to glutathione',
            contraindications: 'Caution with active H. pylori; may cause GI upset',
            conditional_on: 'No active stomach ulcer or gastritis'
          },
          {
            name: 'Infrared Sauna',
            category: 'clinic_treatment',
            dosage: '20-30 minutes',
            timing: '2-3 times per week',
            rationale: 'Supports elimination through sweat; mobilizes toxins',
            contraindications: 'Not if dehydrated, constipated, or experiencing detox symptoms',
            conditional_on: 'Hydration and bowel function stable'
          }
        ],
        safety_gates: [
          'Reduce sauna frequency if fatigue increases',
          'Hold NAC if GI symptoms develop',
          'Do not add additional binders if current protocol causing symptoms'
        ],
        clinician_decision_points: [
          'Assess whether to continue MCP or switch to chlorella based on metal profile',
          'Evaluate need for additional liver support based on symptoms'
        ]
      },
      {
        name: 'Phase 2: Deep Detoxification',
        phase_number: 2,
        start_week: 7,
        duration_weeks: 6,
        readiness_criteria: [
          'Phase 1 completed without significant adverse reactions',
          'Continued daily bowel movements',
          'No active detox reactions (headache, fatigue, skin issues)',
          'Liver enzymes within normal limits (if tested)'
        ],
        items: [
          {
            name: 'Chlorella',
            category: 'binder',
            dosage: '3g daily, increase to 6g if tolerated',
            timing: 'With meals',
            rationale: 'Binds heavy metals in GI tract; nutritive support',
            contraindications: 'May cause GI upset initially; start low and increase gradually',
            conditional_on: 'Good tolerance of MCP in Phase 1'
          },
          {
            name: 'Milk Thistle',
            category: 'supplement',
            dosage: '150mg silymarin twice daily',
            timing: 'With meals',
            rationale: 'Hepatoprotective; supports liver during detox',
            contraindications: 'Caution with hormone-sensitive conditions',
            conditional_on: 'No allergies to Asteraceae family'
          }
        ],
        safety_gates: [
          'Retest heavy metals at week 12 to assess progress',
          'Do not continue aggressive detox if symptoms of redistribution appear',
          'Consult clinician if new neurological symptoms develop'
        ],
        clinician_decision_points: [
          'Decision on IV chelation therapy based on retest results',
          'Evaluate need for additional specialty testing'
        ]
      },
      {
        name: 'Clinic Treatments (Conditional)',
        is_clinic_treatment: true,
        readiness_criteria: [
          'Completed Core Protocol without adverse reactions',
          'Bowel function regular (daily, well-formed)',
          'Sleep quality stable',
          'No active detox reactions'
        ],
        items: [
          {
            name: 'Infrared Sauna',
            category: 'clinic_treatment',
            indication: 'Toxin elimination support',
            protocol: '30-45 minutes, 2-3x/week',
            contraindications: 'Active constipation, dehydration, heat intolerance, pregnancy',
            notes: 'Always hydrate before and after; shower immediately after'
          },
          {
            name: 'IV Glutathione',
            category: 'clinic_treatment',
            indication: 'Enhanced detox support after Phase 1',
            protocol: '600-1200mg IV push, weekly',
            contraindications: 'Sulfur sensitivity, active detox reactions',
            notes: 'Only after core protocol stability confirmed'
          }
        ]
      }
    ]
  },

  // 2. Gut Restoration Protocol
  {
    name: 'Gut Restoration Protocol',
    description: 'Comprehensive gut healing protocol following the 5R framework: Remove, Replace, Reinoculate, Repair, Rebalance. For patients with dysbiosis, leaky gut, or GI symptoms.',
    category: 'Gut Health',
    duration_weeks: 16,
    modules: [
      {
        name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
        is_core_protocol: true,
        items: [
          {
            name: 'Elimination Diet Basics',
            category: 'diet',
            dosage: 'Remove gluten, dairy, refined sugar, alcohol',
            timing: 'All meals for minimum 2 weeks',
            rationale: 'Reduces inflammatory triggers to allow gut healing',
            contraindications: 'Ensure adequate caloric intake; modify for eating disorder history'
          },
          {
            name: 'L-Glutamine',
            category: 'supplement',
            dosage: '5g twice daily',
            timing: 'Morning and evening, away from meals',
            rationale: 'Primary fuel source for enterocytes; supports gut barrier',
            contraindications: 'Caution in hepatic encephalopathy; reduce if neurological symptoms'
          },
          {
            name: 'Bone Broth or Collagen',
            category: 'diet',
            dosage: '1-2 cups daily or 10g collagen peptides',
            timing: 'Morning or between meals',
            rationale: 'Provides glycine and proline for gut lining repair',
            contraindications: 'Source quality matters; avoid if histamine intolerant'
          },
          {
            name: 'Stress Reduction Practice',
            category: 'lifestyle',
            dosage: '10-15 minutes daily',
            timing: 'Before meals or bedtime',
            rationale: 'Gut-brain axis regulation; parasympathetic support for digestion',
            contraindications: 'None; adapt practice to individual preference'
          }
        ],
        safety_gates: [
          'Do not proceed to antimicrobials without confirmed dysbiosis on testing',
          'Hold L-Glutamine if any neurological symptoms develop',
          'Ensure adequate nutrition; do not over-restrict diet',
          'Monitor for orthorexic tendencies with elimination diet'
        ],
        what_not_to_do: [
          'No antimicrobials or antifungals without confirmed pathogen on testing',
          'No aggressive probiotics in first 2 weeks',
          'No cold exposure during gut healing phase',
          'No high-dose vitamin C or magnesium (can cause diarrhea)'
        ]
      },
      {
        name: 'Phase 1: Remove & Replace',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 4,
        readiness_criteria: [
          'Elimination diet established without major challenges',
          'GI symptoms showing initial improvement',
          'Bowel movements becoming more regular',
          'Lab results available if dysbiosis testing was done'
        ],
        items: [
          {
            name: 'Digestive Enzymes',
            category: 'supplement',
            dosage: '1-2 capsules with protein-containing meals',
            timing: 'Beginning of meals',
            rationale: 'Supports breakdown of proteins to reduce gut irritation',
            contraindications: 'Not needed if no protein digestion issues; avoid with active ulcer',
            conditional_on: 'Symptoms of incomplete digestion (bloating, undigested food)'
          },
          {
            name: 'Betaine HCl',
            category: 'supplement',
            dosage: '325-650mg with protein meals',
            timing: 'Middle of protein-containing meal',
            rationale: 'Supports stomach acid production for protein digestion',
            contraindications: 'NEVER use with gastritis, ulcers, NSAID use, or burning sensation',
            conditional_on: 'Low stomach acid confirmed or suspected (burping, fullness after meals)'
          },
          {
            name: 'GI-MAP or SIBO Testing',
            category: 'testing',
            dosage: 'Per lab instructions',
            timing: 'If not already completed',
            rationale: 'Guides specific antimicrobial therapy if needed',
            contraindications: 'Delay if acute GI illness',
            conditional_on: 'Symptoms suggest dysbiosis or SIBO'
          }
        ],
        safety_gates: [
          'STOP Betaine HCl immediately if ANY burning sensation',
          'Do not start antimicrobials without test confirmation',
          'Monitor for signs of hypochlorhydria or achlorhydria'
        ],
        clinician_decision_points: [
          'Review test results to determine antimicrobial approach',
          'Decide between herbal vs pharmaceutical antimicrobials based on severity'
        ]
      },
      {
        name: 'Phase 2: Reinoculate & Repair',
        phase_number: 2,
        start_week: 7,
        duration_weeks: 6,
        readiness_criteria: [
          'Any antimicrobial phase completed (if applicable)',
          'GI symptoms significantly improved',
          'Tolerance to current supplements established',
          'Ready for probiotic introduction'
        ],
        items: [
          {
            name: 'Spore-Based Probiotic',
            category: 'supplement',
            dosage: 'Start with 1 capsule, increase to 2 over 2 weeks',
            timing: 'With meals',
            rationale: 'Bacillus strains survive stomach acid; rebalance microbiome',
            contraindications: 'Start slow if history of SIBO; may cause initial bloating',
            conditional_on: 'Antimicrobial phase complete or no dysbiosis present'
          },
          {
            name: 'GI Repair Formula',
            category: 'supplement',
            dosage: 'As directed (typically 1 scoop/serving)',
            timing: 'Between meals or before bed',
            rationale: 'Comprehensive gut lining support with DGL, aloe, zinc carnosine',
            contraindications: 'Check ingredients for individual sensitivities',
            conditional_on: 'Continued gut healing support needed'
          },
          {
            name: 'Diverse Fiber Introduction',
            category: 'diet',
            dosage: 'Gradually increase variety of fiber sources',
            timing: 'With meals',
            rationale: 'Prebiotic support for beneficial bacteria',
            contraindications: 'Go slow with FODMAP sensitivity; monitor for bloating',
            conditional_on: 'Tolerance established in earlier phases'
          }
        ],
        safety_gates: [
          'Reduce probiotic if significant bloating or die-off symptoms',
          'Do not rush fiber reintroduction',
          'Hold new introductions if symptoms flare'
        ],
        clinician_decision_points: [
          'Assess need for retest based on symptom resolution',
          'Determine maintenance protocol duration'
        ]
      },
      {
        name: 'Clinic Treatments (Conditional)',
        is_clinic_treatment: true,
        readiness_criteria: [
          'Core Protocol stability confirmed',
          'No active GI inflammation',
          'Regular bowel movements'
        ],
        items: [
          {
            name: 'Colon Hydrotherapy',
            category: 'clinic_treatment',
            indication: 'Reset elimination, remove biofilm (controversial - clinician discretion)',
            protocol: '1-3 sessions during antimicrobial phase',
            contraindications: 'Active colitis, recent GI surgery, severe hemorrhoids',
            notes: 'Must replenish probiotics after; not for everyone'
          },
          {
            name: 'IV Glutathione',
            category: 'clinic_treatment',
            indication: 'Liver support during gut healing',
            protocol: '600mg IV push weekly during Phase 2',
            contraindications: 'Sulfur sensitivity',
            notes: 'Supports overall detox capacity'
          }
        ]
      }
    ]
  },

  // 3. Hormone Optimization Protocol (Female)
  {
    name: 'Female Hormone Optimization Protocol',
    description: 'Evidence-based approach to female hormone balance focusing on foundational support, liver detox pathways, and targeted supplementation. Suitable for perimenopause, PMS, or hormonal imbalance.',
    category: 'Hormone Health',
    duration_weeks: 12,
    modules: [
      {
        name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
        is_core_protocol: true,
        items: [
          {
            name: 'Cruciferous Vegetables',
            category: 'diet',
            dosage: '2-3 servings daily (broccoli, cauliflower, Brussels sprouts)',
            timing: 'With meals',
            rationale: 'DIM precursors support estrogen metabolism via liver pathways',
            contraindications: 'Cook if thyroid concerns (reduces goitrogens)'
          },
          {
            name: 'Magnesium Glycinate',
            category: 'supplement',
            dosage: '300-400mg daily',
            timing: 'Evening/bedtime',
            rationale: 'Supports HPA axis, reduces cortisol, improves sleep',
            contraindications: 'Reduce if loose stools; caution with kidney disease'
          },
          {
            name: 'Blood Sugar Stabilization',
            category: 'diet',
            dosage: 'Protein with every meal, limit refined carbs',
            timing: 'All meals and snacks',
            rationale: 'Insulin regulation directly impacts hormone balance',
            contraindications: 'Adjust for diabetes medications'
          },
          {
            name: 'Sleep Optimization',
            category: 'lifestyle',
            dosage: '7-9 hours in dark, cool room',
            timing: 'Consistent sleep/wake times',
            rationale: 'Hormone production occurs during deep sleep',
            contraindications: 'Address sleep apnea if present'
          }
        ],
        safety_gates: [
          'Do not add hormone-modulating herbs until baseline symptoms documented',
          'Monitor menstrual cycle changes',
          'Hold if severe symptoms develop'
        ],
        what_not_to_do: [
          'No bioidentical hormones without proper testing',
          'No high-dose DIM or I3C without supervision',
          'No vitex (chasteberry) without understanding cycle pattern',
          'No over-supplementation of single nutrients'
        ]
      },
      {
        name: 'Phase 1: Liver & Detox Support',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 4,
        readiness_criteria: [
          'Core dietary changes implemented',
          'Sleep improving',
          'Ready for additional supplementation',
          'DUTCH test or hormone panel completed (ideal)'
        ],
        items: [
          {
            name: 'DIM (Diindolylmethane)',
            category: 'supplement',
            dosage: '100-200mg daily',
            timing: 'With meals',
            rationale: 'Supports healthy estrogen metabolism',
            contraindications: 'Start low; may shift estrogen metabolites initially',
            conditional_on: 'Evidence of estrogen dominance or poor estrogen clearance'
          },
          {
            name: 'B-Complex',
            category: 'supplement',
            dosage: 'Methylated B-complex daily',
            timing: 'Morning with food',
            rationale: 'Supports methylation and liver detox pathways',
            contraindications: 'Use methylated forms if MTHFR variant present',
            conditional_on: 'General support; adjust based on genetics'
          },
          {
            name: 'Liver Support Tea',
            category: 'diet',
            dosage: '1-2 cups daily (dandelion root, milk thistle tea)',
            timing: 'Between meals',
            rationale: 'Gentle liver support for estrogen clearance',
            contraindications: 'Avoid dandelion if bile duct obstruction',
            conditional_on: 'Good hydration established'
          }
        ],
        safety_gates: [
          'Monitor for changes in cycle length or flow',
          'Stop DIM if breast tenderness increases significantly',
          'Retest hormones at week 8-12 if baseline available'
        ],
        clinician_decision_points: [
          'Evaluate DUTCH test results for targeted support',
          'Decide on progesterone support based on cycle pattern'
        ]
      },
      {
        name: 'Phase 2: Targeted Hormone Support',
        phase_number: 2,
        start_week: 7,
        duration_weeks: 6,
        readiness_criteria: [
          'Phase 1 completed with improved symptoms',
          'Hormone testing results reviewed',
          'Cycle tracking data available',
          'Ready for targeted intervention'
        ],
        items: [
          {
            name: 'Vitex (Chasteberry)',
            category: 'supplement',
            dosage: '400-500mg daily',
            timing: 'Morning on empty stomach',
            rationale: 'Supports progesterone production; regulates cycles',
            contraindications: 'ONLY if low progesterone confirmed; not for everyone',
            conditional_on: 'Confirmed low progesterone or luteal phase defect'
          },
          {
            name: 'Maca',
            category: 'supplement',
            dosage: '1500-3000mg daily',
            timing: 'Morning with food',
            rationale: 'Adaptogenic support for HPO axis; may improve libido/energy',
            contraindications: 'Start low; may be too stimulating for some',
            conditional_on: 'General hormonal support desired; not specific to one hormone'
          }
        ],
        safety_gates: [
          'Stop Vitex if cycle becomes irregular',
          'Reassess at 12 weeks for continuation',
          'Do not combine multiple hormone-modulating herbs without supervision'
        ],
        clinician_decision_points: [
          'Evaluate need for bioidentical progesterone based on response',
          'Consider thyroid assessment if symptoms persist'
        ]
      }
    ]
  },

  // 4. Energy & Mitochondrial Support Protocol
  {
    name: 'Energy & Mitochondrial Support Protocol',
    description: 'Protocol for chronic fatigue and low energy focusing on mitochondrial function, adrenal support, and cellular energy production. Only after ruling out underlying pathology.',
    category: 'Energy & Vitality',
    duration_weeks: 12,
    modules: [
      {
        name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
        is_core_protocol: true,
        items: [
          {
            name: 'CoQ10 (Ubiquinol form)',
            category: 'supplement',
            dosage: '100-200mg daily',
            timing: 'With fat-containing meal',
            rationale: 'Essential for mitochondrial ATP production',
            contraindications: 'Use ubiquinol form if over 40 or absorption issues'
          },
          {
            name: 'B-Complex (Methylated)',
            category: 'supplement',
            dosage: 'As directed on label',
            timing: 'Morning with food',
            rationale: 'B vitamins essential for energy metabolism',
            contraindications: 'Start low if sensitive; some may feel overstimulated'
          },
          {
            name: 'Sleep Optimization',
            category: 'lifestyle',
            dosage: '7-9 hours minimum',
            timing: 'Consistent schedule; in bed by 10pm ideally',
            rationale: 'Cellular repair and energy restoration occurs during sleep',
            contraindications: 'Rule out sleep apnea if snoring present'
          },
          {
            name: 'Blood Sugar Balance',
            category: 'diet',
            dosage: 'Protein and fat at each meal; avoid sugar spikes',
            timing: 'All meals; no skipping meals',
            rationale: 'Stable glucose prevents energy crashes',
            contraindications: 'Adjust for diabetes medications'
          }
        ],
        safety_gates: [
          'Do not add stimulants (even adaptogens) until sleep is optimized',
          'Rule out anemia, thyroid, and other causes of fatigue first',
          'Hold if symptoms worsen'
        ],
        what_not_to_do: [
          'No caffeine increase to mask fatigue',
          'No high-intensity exercise if recovery is poor',
          'No NAD+ or peptides until foundations stable',
          'No cold exposure if adrenally fatigued'
        ]
      },
      {
        name: 'Phase 1: Mitochondrial Support',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 4,
        readiness_criteria: [
          'Sleep quality improved',
          'Blood sugar stable',
          'Tolerance to CoQ10 and B-vitamins established',
          'Baseline energy documented'
        ],
        items: [
          {
            name: 'Alpha Lipoic Acid',
            category: 'supplement',
            dosage: '300-600mg daily',
            timing: 'Away from meals',
            rationale: 'Antioxidant support for mitochondria; supports glucose metabolism',
            contraindications: 'May lower blood sugar; monitor if diabetic',
            conditional_on: 'No blood sugar medication interactions'
          },
          {
            name: 'PQQ',
            category: 'supplement',
            dosage: '10-20mg daily',
            timing: 'Morning',
            rationale: 'Supports mitochondrial biogenesis (new mitochondria formation)',
            contraindications: 'Generally well tolerated; expensive',
            conditional_on: 'Budget allows; want enhanced mitochondrial support'
          },
          {
            name: 'Adaptogenic Support',
            category: 'supplement',
            dosage: 'Ashwagandha 300-600mg or Rhodiola 200-400mg',
            timing: 'Morning (Rhodiola) or evening (Ashwagandha)',
            rationale: 'HPA axis support; stress resilience',
            contraindications: 'Avoid Ashwagandha with hyperthyroid; Rhodiola if bipolar',
            conditional_on: 'Sleep and blood sugar stabilized first'
          }
        ],
        safety_gates: [
          'Monitor energy levels; should see gradual improvement',
          'Stop adaptogens if sleep disrupted or anxiety increases',
          'Do not stack multiple adaptogens'
        ],
        clinician_decision_points: [
          'Consider organic acids testing if no improvement',
          'Evaluate for hidden infections or toxicity'
        ]
      },
      {
        name: 'Clinic Treatments (Conditional)',
        is_clinic_treatment: true,
        readiness_criteria: [
          'Completed 6+ weeks of foundational protocol',
          'Sleep optimized',
          'No active infections or acute illness',
          'Ready for optimization therapies'
        ],
        items: [
          {
            name: 'IV NAD+',
            category: 'clinic_treatment',
            indication: 'Enhanced cellular energy, anti-aging support',
            protocol: '250-500mg IV infusion, 1-2x/week for 4 weeks',
            contraindications: 'Not first-line therapy; only after foundations solid',
            notes: 'Can cause flushing, nausea; start low'
          },
          {
            name: 'Red Light Therapy',
            category: 'clinic_treatment',
            indication: 'Mitochondrial support, recovery',
            protocol: '10-20 minutes, 3-4x/week',
            contraindications: 'Generally safe; photosensitizing medications',
            notes: 'Can be done at home with quality device'
          },
          {
            name: 'HBOT',
            category: 'clinic_treatment',
            indication: 'Enhanced oxygen delivery, cellular repair',
            protocol: '60-90 minute sessions, 1-2x/week',
            contraindications: 'Claustrophobia, certain ear conditions, recent surgery',
            notes: 'Only after energy foundations established'
          }
        ]
      }
    ]
  },

  // 5. Mold & Biotoxin Illness Protocol
  {
    name: 'Mold & Biotoxin Illness Protocol (CIRS)',
    description: 'Conservative protocol for patients with confirmed mold exposure or CIRS. Focuses on source removal, binder therapy, and careful sequencing. Requires confirmed diagnosis.',
    category: 'Detox',
    duration_weeks: 24,
    modules: [
      {
        name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
        is_core_protocol: true,
        items: [
          {
            name: 'Source Removal Verification',
            category: 'lifestyle',
            dosage: 'N/A',
            timing: 'Must be completed before starting protocol',
            rationale: 'No amount of binders will help if ongoing exposure continues',
            contraindications: 'DO NOT proceed with supplements if still living/working in moldy environment'
          },
          {
            name: 'Cholestyramine OR Welchol',
            category: 'binder',
            dosage: 'Start with 1/4 dose, titrate up over 2 weeks',
            timing: '30 minutes before meals, 2+ hours away from other meds',
            rationale: 'Primary binder for mycotoxins; prescription required',
            contraindications: 'Constipation must be addressed first; can deplete fat-soluble vitamins'
          },
          {
            name: 'Bowel Regularity Protocol',
            category: 'supplement',
            dosage: 'Magnesium citrate 400-800mg as needed',
            timing: 'Bedtime or as needed for daily bowel movements',
            rationale: 'CRITICAL: Binders require elimination pathway open',
            contraindications: 'Reduce if diarrhea develops'
          },
          {
            name: 'Clean Air & Water',
            category: 'lifestyle',
            dosage: 'HEPA filter in bedroom, filtered water',
            timing: 'Continuous',
            rationale: 'Reduce overall toxic burden while healing',
            contraindications: 'None'
          }
        ],
        safety_gates: [
          'STOP binders immediately if constipation exceeds 48 hours',
          'Do not increase binder dose if experiencing herx/die-off symptoms',
          'Monitor for signs of fat-soluble vitamin depletion (dry skin, vision changes)',
          'Pause and reassess if fatigue significantly worsens'
        ],
        what_not_to_do: [
          'NO sauna during early binder phase (can redistribute toxins)',
          'No sweating protocols until binders established',
          'No cold exposure',
          'No aggressive antimicrobials',
          'Do not stack multiple binders in first month'
        ]
      },
      {
        name: 'Phase 1: Binder Optimization',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 8,
        readiness_criteria: [
          'Tolerating initial binder dose without severe herx',
          'Daily bowel movements maintained',
          'Source removal confirmed',
          'VCS test baseline documented'
        ],
        items: [
          {
            name: 'Full-Dose Cholestyramine',
            category: 'binder',
            dosage: '4g four times daily (or as tolerated)',
            timing: '30 minutes before meals and bedtime',
            rationale: 'Full protocol dose for mycotoxin binding',
            contraindications: 'Titrate based on tolerance; not everyone reaches full dose',
            conditional_on: 'Successful titration during core protocol'
          },
          {
            name: 'Fat-Soluble Vitamin Support',
            category: 'supplement',
            dosage: 'A, D, E, K - as directed, away from binders',
            timing: 'At least 2 hours after binders',
            rationale: 'Cholestyramine depletes fat-soluble vitamins',
            contraindications: 'Test vitamin D levels periodically',
            conditional_on: 'On cholestyramine therapy'
          },
          {
            name: 'Omega-3 Fatty Acids',
            category: 'supplement',
            dosage: '2-3g EPA/DHA daily',
            timing: 'At least 2 hours after binders, with food',
            rationale: 'Anti-inflammatory support; also depleted by binders',
            contraindications: 'Quality matters; avoid if on blood thinners',
            conditional_on: 'On binder therapy'
          }
        ],
        safety_gates: [
          'VCS retest at week 8 to assess progress',
          'If no improvement in VCS, reassess diagnosis or exposure',
          'Monitor inflammatory markers if available'
        ],
        clinician_decision_points: [
          'Evaluate VCS improvement - continue or modify approach',
          'Consider MARCoNS testing and treatment if indicated',
          'Assess need for additional binders (charcoal, clay)'
        ]
      },
      {
        name: 'Phase 2: Elimination Enhancement',
        phase_number: 2,
        start_week: 11,
        duration_weeks: 8,
        readiness_criteria: [
          'VCS showing improvement',
          'Stable on full binder protocol',
          'No active herx reactions',
          'Ready for sweat therapy'
        ],
        items: [
          {
            name: 'Infrared Sauna',
            category: 'clinic_treatment',
            dosage: 'Start with 15 minutes, build to 30-45 minutes',
            timing: '2-3x per week',
            rationale: 'Sweat elimination of toxins; only after binder saturation',
            contraindications: 'Must be on binders; must hydrate extensively; shower immediately after',
            conditional_on: 'Established binder protocol, no active herx'
          },
          {
            name: 'Glutathione Support',
            category: 'supplement',
            dosage: 'Liposomal glutathione 250-500mg or NAC 600mg',
            timing: 'Away from binders',
            rationale: 'Supports liver detox pathways',
            contraindications: 'Start low; can mobilize toxins',
            conditional_on: 'Phase 1 binder protocol established'
          }
        ],
        safety_gates: [
          'Stop sauna if symptoms worsen',
          'Reduce glutathione if detox symptoms increase',
          'Retest mycotoxins at week 16-20'
        ],
        clinician_decision_points: [
          'Assess need for specialty testing (cytokines, TGF-beta, MMP-9)',
          'Evaluate for need of VIP nasal spray (end-stage CIRS protocol)',
          'Determine maintenance protocol'
        ]
      }
    ]
  }
];

async function seedClinicalTemplates() {
  console.log('Starting clinical protocol template seeding...');

  try {
    // Check if templates already exist
    const existingResult = await db.query('SELECT COUNT(*) FROM protocol_templates');
    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(`Found ${existingCount} existing templates`);

    let inserted = 0;
    let skipped = 0;

    for (const template of clinicalTemplates) {
      // Check if template with this name exists
      const checkResult = await db.query(
        'SELECT id FROM protocol_templates WHERE name = $1',
        [template.name]
      );

      if (checkResult.rows.length > 0) {
        console.log(`Skipping existing template: ${template.name}`);
        skipped++;
        continue;
      }

      // Insert new template
      await db.query(
        `INSERT INTO protocol_templates (name, description, category, duration_weeks, modules)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          template.name,
          template.description,
          template.category,
          template.duration_weeks,
          JSON.stringify(template.modules)
        ]
      );

      console.log(`Inserted template: ${template.name}`);
      inserted++;
    }

    console.log('\n--- Seeding Complete ---');
    console.log(`Templates inserted: ${inserted}`);
    console.log(`Templates skipped (already exist): ${skipped}`);
    console.log(`Total templates now: ${existingCount + inserted}`);

  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedClinicalTemplates()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { clinicalTemplates, seedClinicalTemplates };
