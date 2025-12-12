# ExpandHealth AI: Clinical Operating System

**Prepared by:** Emilian
**Date:** December 12, 2025
**Version:** 2.0 (Agent-Based Architecture)

---

## Executive Summary

ExpandHealth AI is an **agent-based clinical operating system** that automates blood test analysis and treatment plan generation using AI and evidence-based protocols. The system integrates clinic-specific treatment modalities (hyperbaric oxygen, IV therapy, ozone therapy, etc.) with personalized patient recommendations, saving doctors 30-45 minutes per patient while ensuring comprehensive, protocol-based care.

**🎙️ BREAKTHROUGH INNOVATION: Conversation-First Intelligence**

Unlike traditional systems that rely on intake forms, ExpandHealth AI processes **audio recordings of doctor-patient conversations** as the primary clinical data source. The AI transcribes, analyzes, and extracts comprehensive clinical context including:
- Symptoms, history, and medical concerns
- Lifestyle factors (diet, exercise, sleep, stress)
- Emotional state and psychosocial factors
- Patient goals, motivations, and barriers
- Treatment preferences and readiness
- Nuances that forms miss: tone, emphasis, concerns between the lines

This enables **truly personalized** treatment plans based on complete patient context, not checkbox data.

**Key Benefits:**
- ⏱️ **Time Savings:** Reduce analysis time from 45-60 min to 10-15 min per patient
- 🎙️ **Natural Intake:** Doctor focuses on conversation, not typing notes
- 📊 **Complete Data:** Captures everything said, nothing missed
- 🎯 **Clinic Integration:** Automatic inclusion of ExpandHealth treatment modalities
- 🧠 **True Personalization:** Plans reflect patient's actual life, concerns, readiness
- ✅ **Doctor Oversight:** Full review and approval before patient delivery
- 📈 **Scalability:** See more patients without compromising quality

---

## Core Design Principle: Agent-Based Clinical Operating System

ExpandHealth AI is designed as a **modular, agent-based clinical operating system**, not a single monolithic AI model.

Each AI agent is responsible for a clearly defined clinical or operational function, mirroring how real clinics operate and enabling continuous improvement, auditability, and safe scaling.

**Why this matters:**
- ✅ Enables faster iteration without breaking the full system
- ✅ Allows doctors to trust, inspect, and override specific components
- ✅ Aligns with real-world clinical workflows, not abstract AI outputs
- ✅ Prevents "black box" medical decision-making

**High-level Agent Architecture:**

1. **Intake & Context Agent** (conversation-first)
   - Audio transcription and speaker diarization
   - Clinical information extraction from conversations
   - Psychosocial factor identification

2. **Diagnostics Interpretation Agent**
   - Blood test parsing and normalization
   - Trend analysis across historical results
   - Red flag identification

3. **Clinical Reasoning Agent**
   - Pattern recognition across symptoms, labs, lifestyle
   - Risk stratification
   - Correlation discovery

4. **Protocol Matching Agent** (RAG over ExpandHealth protocols)
   - Evidence-based protocol retrieval
   - Clinic-specific treatment integration
   - Protocol customization based on patient context

5. **Safety & Contraindication Agent**
   - Drug interaction checking
   - Treatment contraindication screening
   - Risk mitigation recommendations

6. **Commercial & Operational Fit Agent**
   - Budget and readiness alignment
   - Clinic capacity and availability
   - Treatment sequencing and scheduling

7. **Doctor Review & Approval Agent** (human-in-the-loop)
   - Structured review interface
   - Edit and override capabilities
   - Approval workflow

8. **Patient Output & Education Agent**
   - Plain-language translation
   - Personalized education materials
   - Actionable plan formatting

Each agent can evolve independently while remaining coordinated through structured workflows orchestrated via n8n.

---

## The Problem We're Solving

### Current Doctor Workflow (Time-Intensive)

```
Patient Visit → Blood Draw → Wait for Results → Manual Analysis
     ↓
• Compare each marker to reference ranges (15 min)
• Identify patterns and correlations (10 min)
• Research relevant protocols (10 min)
• Draft personalized recommendations (15 min)
• Format into patient-friendly plan (10 min)
     ↓
Total: 60 minutes of focused work
```

**Challenges:**
- Time-consuming for busy doctors
- Risk of missing patterns when rushed
- Difficulty maintaining protocol consistency
- Hard to stay current with latest evidence
- Limited capacity to serve more patients

---

## The Solution: AI-Powered Clinical Operating System (Human-in-the-Loop)

### New Workflow (AI-Assisted)

```
Doctor Uploads → AI Analyzes → Draft Plan Generated → Doctor Reviews
     ↓
• Upload blood test PDF + patient notes (2 min)
• AI extracts data, queries protocol library (3 min)
• Review and edit AI-generated plan (10 min)
     ↓
Total: 15 minutes with better quality
```

**Benefits:**
- ✅ 75% time reduction per patient
- ✅ More comprehensive analysis
- ✅ Protocol consistency guaranteed
- ✅ Clinic treatments automatically considered
- ✅ Evidence citations included

---

## Platform Architecture

### Real-World Clinic Flows (Encoded from ExpandHealth Operations)

The platform explicitly supports multiple patient journeys based on real ExpandHealth clinic operations, rather than forcing all patients into a single medical pathway.

**Flow A: Full Medical Pathway (Doctor-Led)**
```
Doctor–Patient Conversation
→ Diagnostic Testing (Labs, Imaging, History)
→ AI Multi-Agent Analysis
→ Doctor Review & Clinical Judgment
→ Personalized Medical + Wellness Protocol
→ Treatment Scheduling (HBOT, IV, Peptides, etc.)
→ Follow-up, Retesting, and Iteration
```

**Typical patients:**
- Chronic fatigue, metabolic issues, inflammation
- Preventive cardiometabolic risk
- Performance and longevity optimization with medical oversight

**Flow B: Wellness-First / Light-Touch Pathway**
```
Conversation-First Intake
→ Limited Diagnostics (Optional)
→ AI-Assisted Wellness Plan
→ Coach or Doctor Review
→ Lifestyle + Recovery Protocol
→ Optional Upgrade to Medical Pathway
```

**Typical patients:**
- Biohackers
- High performers
- Prevention-focused clients not requiring full medical workup

**Why this dual-flow system matters:**
- ✅ Matches real patient demand
- ✅ Avoids unnecessary medicalization
- ✅ Increases conversion while preserving clinical rigor
- ✅ Enables both medical and wellness revenue streams

---

### 1. Doctor Dashboard (Web Interface)

Simple upload interface where doctor submits:

**Patient Data Inputs:**
- 🎙️ **Patient Conversation Recording (PRIMARY INPUT)**
  - Replaces traditional medical intake forms
  - Audio recording of full patient consultation
  - AI transcribes and extracts clinical information
  - Captures symptoms, history, lifestyle, goals, concerns
  - Natural conversation = better patient rapport + complete data

- 📄 **Blood Test Results**
  - PDF/scan from any lab (Quest, LabCorp, etc.)
  - Supports handwritten or typed results
  - Multi-test uploads (panels, historical results)

- 📊 **Previous Test Results** (optional)
  - Historical labs for trend analysis
  - Comparison over time

- 📋 **Additional Context** (optional)
  - Imaging reports
  - Specialist notes
  - Medication lists
  - Any relevant medical history

**Patient Information:**
- Basic demographics (name, age, gender)
- Current medications
- Known conditions
- Treatment preferences

**Action:** Click "Generate Analysis" button

---

### 2. Document Processing Engine

**Automated Data Extraction:**

**A. Patient Conversation Analysis (CORE INNOVATION)**

**Audio Transcription:**
- Automatic speech-to-text using Whisper AI or similar
- Speaker diarization (identifies doctor vs patient)
- Medical terminology recognition
- Timestamp indexing for key moments

**Clinical Information Extraction:**
The AI analyzes the conversation transcript to extract:

**Chief Complaints & Symptoms:**
- Primary symptoms: "I've been exhausted for 6 months"
- Secondary concerns: "Brain fog, can't focus at work"
- Severity and duration: "Getting worse, 7/10 intensity"
- Impact on daily life: "Can barely make it through the day"

**Medical History:**
- Past diagnoses: "Diagnosed with prediabetes 2 years ago"
- Previous treatments: "Tried metformin but stopped due to GI issues"
- Surgeries/hospitalizations: "Gallbladder removed 2015"
- Family history: "Dad has type 2 diabetes, mom has heart disease"

**Lifestyle Factors (CRITICAL for protocol selection):**
- **Diet patterns:** "I eat pretty healthy—salads for lunch, but I do snack a lot at night"
- **Exercise habits:** "Used to run, but knees hurt now. Mostly sedentary desk job"
- **Sleep quality:** "Wake up 2-3 times per night, always tired"
- **Stress levels:** "Work is super stressful, 60-hour weeks"
- **Social support:** "Wife is supportive, but I feel guilty about health"

**Current Medications & Supplements:**
- Prescriptions: "Lisinopril 10mg for blood pressure"
- OTC: "Multivitamin, occasional ibuprofen"
- Previous reactions: "Statins gave me muscle pain"

**Patient Goals & Motivations:**
- Primary goal: "I want to have energy to play with my kids"
- Secondary goals: "Lose 30 pounds, get off blood pressure meds"
- Concerns: "I'm worried about ending up like my dad—he's on 10 meds"
- Readiness: "I'm ready to do whatever it takes"

**Psychosocial Factors:**
- Emotional state: "Frustrated, feel like I've tried everything"
- Support system: "Wife is on board, but kids don't understand"
- Barriers: "Travel a lot for work, hard to eat right on the road"
- Beliefs: "I think my thyroid might be the problem"

**Treatment Preferences & Constraints:**
- Openness to therapies: "I'm interested in the hyperbaric chamber"
- Budget considerations: "I can invest in my health now"
- Time availability: "I can do morning appointments, work is flexible"
- Concerns about treatments: "Are IV treatments safe? How often?"

**Key Quotes Captured:**
The system flags emotionally significant statements:
- "I'm scared I'm heading toward diabetes like my dad"
- "I used to be an athlete, now I can barely walk upstairs"
- "My wife says I'm a different person when I'm this tired"

These quotes can be used in the plan to personalize recommendations.

---

**B. Blood Test Processing:**
- Parses structured lab reports (Quest, LabCorp, etc.)
- OCR capability for scanned/photographed tests
- Normalizes values to standard units
- Identifies test type and date
- Extracts reference ranges

**C. Clinical Context Integration:**
The AI correlates conversation insights with lab findings:
- Match symptoms to biomarkers (fatigue → low vitamin D, anemia)
- Identify lifestyle contributors (sleep issues → cortisol dysregulation)
- Note medication interactions (metformin intolerance → consider berberine)
- Flag concerning patterns (family history + prediabetes = high diabetes risk)

**Structured Output:**
```json
{
  "patient": {
    "name": "John Doe",
    "age": 45,
    "gender": "M",
    "occupation": "corporate executive",
    "demographics": {
      "marital_status": "married",
      "children": 2,
      "support_system": "strong (wife supportive)"
    }
  },
  "conversation_insights": {
    "chief_complaints": [
      {
        "symptom": "chronic fatigue",
        "duration": "6 months",
        "severity": "7/10",
        "impact": "Can barely make it through workday",
        "quote": "I used to be an athlete, now I can barely walk upstairs"
      },
      {
        "symptom": "brain fog",
        "duration": "3-4 months",
        "severity": "moderate",
        "impact": "Difficulty focusing at work"
      }
    ],
    "medical_history": {
      "diagnoses": ["prediabetes (2 years ago)", "hypertension"],
      "previous_treatments": ["metformin (discontinued - GI intolerance)"],
      "surgeries": ["cholecystectomy (2015)"],
      "family_history": ["father: type 2 diabetes", "mother: cardiovascular disease"],
      "medication_reactions": ["statins: muscle pain"]
    },
    "lifestyle": {
      "diet": {
        "pattern": "attempts healthy eating",
        "challenges": "night snacking, travel for work",
        "details": "salads for lunch, but high-carb snacks at night",
        "quote": "I eat pretty healthy but I do snack a lot at night"
      },
      "exercise": {
        "current": "sedentary desk job",
        "history": "former runner",
        "barriers": "knee pain, 60-hour work weeks",
        "quote": "Used to run, but knees hurt now"
      },
      "sleep": {
        "quality": "poor",
        "pattern": "wakes 2-3 times per night",
        "duration": "5-6 hours",
        "impact": "always tired"
      },
      "stress": {
        "level": "high",
        "sources": "work pressure, 60-hour weeks",
        "coping": "limited stress management"
      }
    },
    "medications_current": [
      {"name": "lisinopril", "dose": "10mg", "indication": "hypertension"},
      {"name": "multivitamin", "type": "OTC"},
      {"name": "ibuprofen", "frequency": "occasional", "reason": "knee pain"}
    ],
    "patient_goals": {
      "primary": "Have energy to play with kids",
      "secondary": ["Lose 30 pounds", "Get off blood pressure medication"],
      "motivations": ["Fear of diabetes progression", "Return to athletic ability"],
      "readiness": "high",
      "quote": "I'm ready to do whatever it takes"
    },
    "psychosocial": {
      "emotional_state": "frustrated, anxious about future health",
      "concerns": "Becoming dependent on medications like father",
      "barriers": "Travel schedule, time constraints",
      "beliefs": "Suspects thyroid issues",
      "openness": "Very interested in advanced therapies (HBOT)"
    },
    "treatment_preferences": {
      "interested_in": ["hyperbaric oxygen therapy", "alternative to metformin"],
      "budget": "Can invest in health",
      "time_availability": "Morning appointments preferred, flexible schedule",
      "concerns": ["Safety of IV therapies", "Treatment frequency requirements"]
    },
    "key_quotes": [
      "I'm scared I'm heading toward diabetes like my dad",
      "I used to be an athlete, now I can barely walk upstairs",
      "My wife says I'm a different person when I'm this tired",
      "I'm ready to do whatever it takes"
    ]
  },
  "labs": {
    "metabolic": {
      "cholesterol_total": 240,
      "ldl": 160,
      "hdl": 35,
      "triglycerides": 225,
      "hba1c": 6.2,
      "fasting_glucose": 105
    },
    "vitamins": {
      "vitamin_d": 22
    },
    "inflammatory": {
      "hscrp": 4.2
    },
    "trends": {
      "hba1c_6_months_ago": 5.9,
      "trend": "worsening"
    }
  },
  "ai_correlations": {
    "symptoms_to_labs": [
      "Chronic fatigue correlates with low vitamin D (22 ng/mL)",
      "Brain fog may relate to insulin resistance (HbA1c 6.2%)",
      "Poor sleep likely exacerbating metabolic issues"
    ],
    "lifestyle_to_labs": [
      "Night snacking pattern contributing to elevated glucose",
      "Sedentary lifestyle + dyslipidemia = cardiovascular risk",
      "Chronic stress may be elevating cortisol and inflammation (hsCRP 4.2)"
    ],
    "risk_factors": [
      "Strong family history + prediabetes = very high diabetes risk",
      "Metabolic syndrome present (4/5 criteria)",
      "10-year cardiovascular risk: 12%"
    ],
    "treatment_opportunities": [
      "Good candidate for HBOT (interested + budget available)",
      "Berberine instead of metformin (previous GI intolerance)",
      "Knee issues require low-impact exercise (swimming, cycling)",
      "Morning appointments align with schedule constraints"
    ]
  }
}
```

---

### 3. Protocol Knowledge Base (The Stacks)

**System Protocols (Pre-loaded):**
- Cardiovascular Health Optimization
- Metabolic Syndrome Management
- Hormone Balance and Optimization
- Inflammation and Pain Management
- Gut Health Restoration
- Detoxification Pathways
- Mitochondrial Function Enhancement
- Cognitive Performance Optimization
- Immune System Support
- Athletic Performance Protocols

**ExpandHealth Clinic Treatment Library:**

**Advanced Therapies:**
- 🫧 **Hyperbaric Oxygen Therapy (HBOT)**
  - Indications, protocols, contraindications
  - Session frequency and duration
  - Expected outcomes and timelines
  - Patient preparation requirements

- 💉 **IV Nutrient Therapy**
  - Myers Cocktail protocols
  - High-dose Vitamin C
  - NAD+ therapy
  - Custom formulations
  - Frequency and monitoring

- 🌈 **Red Light Therapy (Photobiomodulation)**
  - Wavelength specifications
  - Treatment durations
  - Specific conditions addressed
  - Combination protocols

- 💊 **Peptide Therapy**
  - BPC-157 (gut healing, injury recovery)
  - Thymosin Alpha-1 (immune support)
  - CJC-1295/Ipamorelin (growth hormone)
  - Dosing protocols and monitoring
  - Patient selection criteria

- 🩸 **Ozone Therapy**
  - Major autohemotherapy (MAH)
  - Ozone insufflation
  - Prolozone injections
  - Safety protocols
  - Treatment frequencies

- 🔄 **Blood Ozonation and Filtration**
  - Ultraviolet Blood Irradiation (UBI)
  - Ozone high dose therapy
  - Apheresis protocols
  - Patient selection and monitoring

- 🧬 **Advanced Diagnostics**
  - Comprehensive metabolic panels
  - Hormone testing
  - Micronutrient analysis
  - Genetic testing interpretation
  - Organic acid testing

**Evidence Base:**
- Research papers supporting each therapy
- Clinical outcome studies
- Safety data and contraindications
- Synergistic treatment combinations

**Doctor's Custom Protocols:**
- Personal treatment approaches refined over years
- Successful case study protocols
- Patient education materials
- Treatment decision trees

**Reference Materials:**
- Lab reference ranges (age/gender/ethnicity specific)
- Drug-nutrient interactions
- Supplement interaction databases
- Clinical decision support tools
- Insurance coding guidelines

---

### 4. AI Analysis Engine (SUGAR Agent)

**Multi-Step Analysis Process:**

#### Step 1: Lab Value Analysis
```
• Compare each biomarker to reference ranges
• Identify patterns across related markers
• Calculate clinical risk scores:
  - Cardiovascular risk (Framingham, Reynolds)
  - Metabolic syndrome indicators
  - Inflammation markers
  - Hormone balance assessment
• Flag critical values requiring immediate attention
• Identify trends from previous tests
```

#### Step 2: Clinical Context Integration
```
• Match symptoms to lab findings
• Consider lifestyle factors in recommendations
• Account for patient goals and preferences
• Review medication interactions
• Assess contraindications for treatments
• Evaluate readiness for advanced therapies
```

#### Step 3: Protocol Library Query (RAG)
```
Example Query:
"Patient presents with dyslipidemia (high LDL, low HDL,
elevated triglycerides), prediabetes (HbA1c 6.2%), chronic
fatigue, vitamin D deficiency. Sedentary lifestyle, high stress,
poor sleep. Goals: prevent diabetes, increase energy, lose weight."

AI Retrieves:
• Metabolic Syndrome Reversal Protocol
• Cardiovascular Risk Reduction Guidelines
• Mitochondrial Function Enhancement Protocol
• HBOT protocol for metabolic optimization
• IV NAD+ therapy for energy restoration
• Red light therapy for mitochondrial support
• Peptide therapy considerations
```

#### Step 4: Treatment Plan Generation

**AI generates structured output:**

```markdown
# PATIENT ANALYSIS: JOHN DOE (45M)

## KEY FINDINGS

1. ⚠️ METABOLIC SYNDROME PATTERN IDENTIFIED
   - Atherogenic dyslipidemia (High LDL, Low HDL, High TG)
   - Insulin resistance indicators (HbA1c 6.2%)
   - Central obesity and sedentary lifestyle
   - 10-year CVD risk: 12% (requires intervention)

2. 🔴 CARDIOVASCULAR RISK FACTORS
   - LDL 160 mg/dL (target <100 for risk reduction)
   - Low HDL 35 mg/dL (protective factor compromised)
   - Triglycerides 225 mg/dL (inflammation marker)
   - BP elevated (per visit notes)

3. ⚡ ENERGY/FATIGUE COMPLEX
   - Likely mitochondrial dysfunction
   - Vitamin D deficiency (22 ng/mL - target >50)
   - Poor sleep quality contributing
   - Insulin resistance reducing cellular energy

4. 🎯 MODIFIABLE RISK FACTORS
   - Diet: High glycemic, processed foods
   - Exercise: Sedentary (<30 min/week)
   - Sleep: Insufficient (5-6 hrs vs target 7-8)
   - Stress: Chronic work-related stress

## KEY RECOMMENDATIONS

### IMMEDIATE ACTIONS (Next 7 Days)

□ **Follow-up Testing**
  - Fasting insulin (assess insulin resistance)
  - Lipid particle size (advanced cardiovascular risk)
  - hsCRP (inflammation marker)
  - Comprehensive thyroid panel (rule out contribution)

□ **Patient Education**
  - Metabolic syndrome explanation
  - Diabetes prevention strategies
  - Treatment options overview

□ **Lifestyle Foundation**
  - Begin food journal (focusing on carb quality/quantity)
  - Track sleep and energy patterns
  - Measure waist circumference weekly

### DIETARY PROTOCOL (4-Week Initial Phase)

□ **Mediterranean-Style Low-Glycemic Eating**
  - Eliminate: Refined carbs, added sugars, trans fats
  - Increase: Leafy greens, omega-3 fish (3x/week), nuts/seeds
  - Focus: Whole foods, high fiber (target 30g+/day)
  - Timing: Time-restricted eating (14-16 hour overnight fast)

□ **Specific Guidelines**
  - Protein: 0.8g per lb bodyweight
  - Healthy fats: Olive oil, avocado, nuts
  - Complex carbs: Limited to post-workout
  - Hydration: Half bodyweight in oz water daily

### SUPPLEMENT STACK (Evidence-Based)

□ **Glucose Control & Insulin Sensitivity**
  - Berberine 500mg 2x/day with meals
    [Research: Meta-analysis showing HbA1c reduction of 0.7%]
  - Chromium picolinate 200mcg daily
  - Alpha-lipoic acid 600mg daily

□ **Cardiovascular Support**
  - Omega-3 (EPA/DHA) 2000mg/day
    [Research: Triglyceride reduction 20-30%]
  - CoQ10 100mg 2x/day (energy + future statin prep)
  - Vitamin D3 5000 IU daily (correct deficiency)

□ **Mitochondrial Support**
  - L-carnitine 2000mg daily
  - PQQ 20mg daily
  - Magnesium glycinate 400mg before bed

### EXPANDHEALTH ADVANCED THERAPIES

□ **HYPERBARIC OXYGEN THERAPY (HBOT)**
  **Recommendation:** 10-session initial protocol

  **Rationale:**
  - Enhance mitochondrial function and ATP production
  - Improve insulin sensitivity
  - Reduce systemic inflammation
  - Support cardiovascular health

  **Protocol:**
  - Frequency: 2x per week for 5 weeks
  - Session: 60 minutes at 1.5 ATA
  - Timing: Morning sessions (fasted state optimal)

  **Expected Outcomes:**
  - Energy improvement within 3-4 sessions
  - Better glucose regulation
  - Enhanced cognitive function

  **Patient Prep:**
  - No caffeine 2 hours before
  - Light meal 2-3 hours prior
  - Comfortable clothing

□ **IV NUTRIENT THERAPY**
  **Recommendation:** Weekly for 4 weeks, then maintenance

  **Custom IV Protocol:**
  1. **Week 1-2: Myers Cocktail Plus**
     - B-complex, Vitamin C, Magnesium, Calcium
     - Add: Glutathione 1200mg (antioxidant support)
     - Purpose: Nutrient repletion, energy boost

  2. **Week 3-4: NAD+ Protocol**
     - NAD+ 250mg (titrate to 500mg if tolerated)
     - Purpose: Cellular energy, DNA repair, longevity
     - Expect: Significant energy improvement, mental clarity

  3. **Maintenance: Every 2-4 weeks**
     - Alternate Myers and NAD+ based on response

  **Monitoring:**
  - Pre/post energy levels (1-10 scale)
  - Any adverse reactions
  - Symptom improvement tracking

□ **RED LIGHT THERAPY (Photobiomodulation)**
  **Recommendation:** Daily sessions during HBOT protocol

  **Protocol:**
  - Wavelength: 660nm (red) + 850nm (near-infrared)
  - Duration: 20 minutes daily
  - Timing: Morning or post-exercise
  - Target areas: Full body panel

  **Benefits for This Case:**
  - Mitochondrial ATP production
  - Insulin sensitivity improvement
  - Inflammation reduction
  - Recovery enhancement

  **Can be done at home:**
  - Recommend specific device specs
  - Provide usage guidelines

□ **PEPTIDE THERAPY CONSIDERATION**
  **Recommended After 4-Week Foundation:**

  **CJC-1295/Ipamorelin Combination**
  - Purpose: Growth hormone optimization
  - Benefits: Fat loss, muscle gain, energy, recovery
  - Protocol: 5 days on, 2 days off
  - Dosing: Start conservative, titrate based on IGF-1 levels
  - Monitoring: IGF-1 testing at week 0, 4, 12

  **Patient Selection Criteria:**
  - Must demonstrate dietary compliance first
  - No contraindications (cancer history, active disease)
  - Realistic expectations discussed

  **Timeline:** Reassess after initial 4-week protocol

□ **OZONE THERAPY (Optional Add-On)**
  **Consider if insufficient response to initial protocol**

  **Major Autohemotherapy (MAH)**
  - Frequency: 1x per week for 6-10 weeks
  - Purpose: Immune support, circulation, oxygenation
  - Synergy with HBOT for enhanced results

  **Patient Education Required:**
  - Mechanism of action
  - Safety profile
  - Expected sensations
  - Commitment to protocol

### LIFESTYLE MODIFICATIONS

□ **Exercise Protocol (Graduated Approach)**

  **Weeks 1-2: Foundation**
  - Daily: 20-minute walk after dinner
  - Goal: Establish habit, improve glucose disposal
  - Intensity: Conversational pace

  **Weeks 3-4: Build Capacity**
  - Increase to 30 minutes daily
  - Add: 2x per week resistance training (20 min)
  - Focus: Major muscle groups, bodyweight ok to start

  **Weeks 5-8: Optimization**
  - 150 minutes moderate exercise per week
  - 2-3x resistance training (full body)
  - 1x per week higher intensity (interval training)

  **Integration with Clinic Therapies:**
  - HBOT sessions count as recovery days
  - Red light post-workout for recovery
  - IV nutrients on heavy training days

□ **Sleep Optimization**
  - Target: 7-8 hours nightly
  - Sleep hygiene protocol:
    * Consistent bed/wake time (even weekends)
    * Dark, cool room (65-68°F)
    * No screens 1 hour before bed
    * Magnesium glycinate before bed
    * Consider sleep study if no improvement

□ **Stress Management**
  - Daily breathwork: 10 minutes (box breathing or 4-7-8)
  - Weekly: Sauna or massage (vasodilation, relaxation)
  - Consider: HeartMath training or meditation app
  - HBOT sessions provide meditative benefit

### MONITORING & FOLLOW-UP

□ **Lab Retest Schedule**
  - Week 6: Fasting glucose + insulin (assess intervention effect)
  - Week 12: Full lipid panel, HbA1c, inflammatory markers
  - Week 24: Comprehensive metabolic reassessment

□ **Clinical Markers**
  - Weekly: Weight, waist circumference, blood pressure
  - Daily: Fasting glucose (if glucometer provided)
  - Track: Energy levels (1-10), sleep quality, exercise compliance

□ **Treatment Adjustments**
  - Review progress at week 4, 8, 12
  - Titrate supplements based on response
  - Advance exercise protocol as tolerated
  - Consider peptide therapy addition at week 4 if appropriate

### EXPECTED OUTCOMES

**4-Week Targets:**
- Energy improvement: 30-50% increase in subjective scale
- Weight loss: 5-8 lbs (primarily visceral fat)
- Fasting glucose: Decrease 10-20 mg/dL
- Waist circumference: -2 to -3 inches
- Sleep quality: Noticeable improvement

**12-Week Targets:**
- HbA1c: Decrease to <6.0% (prediabetes reversal)
- LDL: Decrease 20-30% (target <130)
- HDL: Increase 10-15% (target >40)
- Triglycerides: Decrease 30-40% (target <150)
- Weight: 10-15 lbs loss, mostly fat mass
- Energy: Sustained improvement, no afternoon crashes

**24-Week Targets:**
- Full reversal of metabolic syndrome
- Cardiovascular risk reduction to <10%
- Sustained lifestyle changes
- Maintained improvements without intensive interventions

### PATIENT EDUCATION & RESOURCES

□ **Understanding Your Condition**
  - Metabolic syndrome explained (video link)
  - Why insulin resistance matters
  - Cardiovascular risk factors

□ **Treatment Rationale**
  - How each therapy works
  - Why combination approach
  - Evidence supporting recommendations

□ **Empowerment Tools**
  - Food tracking app recommendation
  - Exercise demonstration videos
  - Progress tracking templates
  - Support group/community access

## CLINICAL NOTES (Doctor's Private Section)

**Risk Stratification:**
- Moderate-high cardiovascular risk
- Early intervention critical window
- Good candidate for reversal with compliance

**Differential Considerations:**
- Rule out sleep apnea (OSA can worsen metabolic issues)
- Consider thyroid contribution to fatigue
- Monitor for depression (can impact compliance)

**Treatment Philosophy:**
- Start conservative, build foundation
- Add advanced therapies strategically
- Patient education paramount for long-term success
- Regular check-ins for accountability

**Follow-up Priorities:**
1. Ensure dietary compliance (make or break factor)
2. Monitor HBOT response (energy marker)
3. Track lab improvements at 6 weeks
4. Assess peptide therapy candidacy at week 4
5. Long-term: transition to maintenance protocol

**Billing/Insurance:**
- HBOT: Document medical necessity
- IV therapy: Cash pay or HSA/FSA
- Peptides: Compounding pharmacy prescription
- Labs: Standard insurance coverage

**Red Flags to Monitor:**
- Chest pain (refer to cardiology)
- Persistent fatigue despite interventions (deeper workup)
- Blood sugar not improving by week 6 (consider metformin)
- Non-compliance with foundation (address barriers)
```

---

### Separation of Clinical Logic and Operational Reality

ExpandHealth AI operates on a **two-layer recommendation framework:**

**1. Clinical Recommendation Layer**

What is medically optimal based on:
- Diagnostics
- Evidence-based protocols
- Clinical reasoning
- Independent of cost, availability, or logistics

**2. Operational & Commercial Fit Layer**

Adjusts recommendations based on:
- Modalities available in the specific clinic
- Patient budget, time, and readiness (from conversation)
- Regulatory and staffing constraints
- ExpandHealth service offerings

**Result:**
Every recommendation is both **clinically sound** and **operationally executable**, increasing compliance and real-world outcomes.

**Example:**

| Clinical Layer | Operational Layer | Final Recommendation |
|----------------|-------------------|---------------------|
| Hyperbaric oxygen optimal for metabolic syndrome | Patient interested + budget available + HBOT chamber in clinic | ✅ Recommend HBOT protocol (20 sessions) |
| IV NAD+ for energy restoration | Clinic offers NAD+ + patient can afford | ✅ Recommend NAD+ IV series |
| Specialized peptide therapy | Peptide not available in this location | ⚠️ Substitute with available protocol or refer out |
| Daily 60-min exercise | Patient travels frequently for work | ⚠️ Adjust to 3x/week with travel-friendly alternatives |

This dual-layer approach ensures recommendations are **realistic, actionable, and tailored** to both clinical needs and practical constraints.

---

### 5. Doctor Review Dashboard (Human-in-the-Loop)

**Review Interface Features:**

**Section-by-Section Editing:**
- ✏️ Edit any finding, recommendation, or protocol detail
- 🗑️ Remove irrelevant suggestions
- ➕ Add custom notes or considerations
- 🔄 Request alternative protocol suggestions

**Clinical Judgment Integration:**
- Add contraindications AI may have missed
- Adjust dosing based on patient-specific factors
- Include clinical intuition and experience
- Document decision rationale

**Patient-Specific Customization:**
- Modify exercise recommendations (injuries, preferences)
- Adjust dietary approach (cultural, allergies)
- Select preferred clinic therapies
- Set realistic timelines based on patient motivation

**Private Notes Section:**
- Clinical observations
- Differential diagnoses to monitor
- Follow-up reminders
- Insurance/billing notes

**Action Options:**
- ✅ **Approve & Finalize:** Accept plan as-is or with edits
- ❌ **Reject & Regenerate:** Send back with specific instructions
- 💾 **Save Draft:** Return to later
- 🔄 **Request Alternative:** Ask for different protocol approach

---

### 6. Output Delivery

**Patient-Facing Document (Auto-Generated PDF):**
- Simplified language (removes medical jargon)
- Visual aids (charts, graphs for trends)
- Action checklists
- Resource links

**Doctor's Clinical Summary:**
- Complete analysis with evidence citations
- Billing codes and insurance documentation
- Follow-up schedule
- Private clinical notes

**Integration Options:**
- Export to EHR system
- Email to patient portal
- Print for in-office review
- Save to patient file with audit trail

---

## Technical Implementation

### Platform Stack

**Infrastructure:**
- N8N Cloud: Workflow orchestration and automation
- Gemini File Search: Protocol knowledge base (fast retrieval)
- Claude Sonnet 4.5: AI analysis engine (medical reasoning)
- Web Application: Doctor dashboard (React/Vue)

**Security & Compliance:**
- HIPAA-compliant data handling
- Encrypted data transmission and storage
- Audit logging for all analyses
- Role-based access control

**Integration Capabilities:**
- EHR system APIs (Epic, Cerner, etc.)
- Lab interface engines (HL7)
- Patient portal systems
- Billing/insurance platforms

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Build protocol library and core infrastructure

**Tasks:**
- ✅ Set up N8N automation workflows
- ✅ Configure Gemini File Search knowledge base
- ✅ Upload ExpandHealth clinic protocols
- ✅ Test data extraction from lab reports
- ✅ Build basic doctor dashboard

**Deliverables:**
- Working protocol knowledge base
- Lab report parsing capability
- Simple upload interface

---

### Phase 2: Intelligence Layer (Weeks 3-4)
**Goal:** Build AI analysis engine

**Tasks:**
- Build SUGAR agent for blood test analysis
- Train agent on ExpandHealth clinical voice
- Implement RAG (Retrieval Augmented Generation)
- Test with sample patient cases
- Refine output format based on doctor feedback

**Deliverables:**
- AI agent that generates complete analysis plans
- Structured output format
- Evidence citation system

**✅ Phase 2 Validation Gates (Kill / Iterate Criteria):**
- Does the system save ≥30 minutes per patient case?
- Are doctors comfortable reviewing AI outputs?
- Is the analysis quality equal to or better than manual work?
- Are protocol recommendations clinically appropriate?

**Decision Point:** If criteria not met, refine intelligence layer before proceeding to Phase 3.

---

### Phase 3: Review Interface (Weeks 5-6)
**Goal:** Build doctor review and approval system

**Tasks:**
- Create review dashboard
- Implement edit/approve workflow
- Add private notes capability
- Build PDF generation for patient delivery
- Integrate with clinic systems

**Deliverables:**
- Full human-in-the-loop workflow
- Patient-facing document generation
- Integration with existing systems

---

### Phase 4: Pilot Testing (Weeks 7-8)
**Goal:** Real-world validation with actual patients

**Tasks:**
- Select 10-20 pilot patients (with consent)
- Process real blood tests through system
- Doctor reviews and provides feedback
- Iterate based on findings
- Measure time savings and quality

**Deliverables:**
- Validated system with real patient data
- Documented time savings
- Quality metrics
- Refined protocols

**✅ Phase 4 Validation Gates (Kill / Iterate Criteria):**
- Would doctors refuse to go back to the old workflow?
- Is protocol quality equal or better than manual work?
- Do patients receive equal or better quality of care?
- Are time savings realized in real-world conditions?
- Is the system ready for full clinic deployment?

**Decision Point:** If criteria not met, system is refined or paused before further investment. This ensures we don't scale a suboptimal system.

---

### Phase 5: Optimization & Scale (Weeks 9-12)
**Goal:** Prepare for full clinic deployment

**Tasks:**
- Add advanced therapies decision logic
- Build progress tracking dashboard
- Implement outcome analytics
- Staff training and onboarding
- Marketing materials for patients

**Deliverables:**
- Production-ready platform
- Trained staff
- Patient marketing materials
- Full clinic rollout

---

## Business Case

### Time & Cost Analysis

**Current State (Per Patient):**
- Doctor analysis time: 45-60 minutes
- Average cost per hour: $200-300
- Cost per patient analysis: $150-300
- Patients per day: Limited by time constraints

**With ExpandHealth AI (Per Patient):**
- Doctor review time: 10-15 minutes
- Time savings: 30-45 minutes (75% reduction)
- Cost per patient analysis: $33-75 (AI platform cost minimal)
- Patients per day: 4-5x increase possible

**ROI Calculation:**

**Assumptions:**
- Clinic sees 20 patients/week for comprehensive analysis
- Current: 20 patients × 1 hour = 20 hours doctor time
- With AI: 20 patients × 0.25 hours = 5 hours doctor time
- **Time saved: 15 hours per week**

**Value of Saved Time:**
- Option A: See 60 more patients/week (3x capacity)
- Option B: Spend more quality time with existing patients
- Option C: Develop new services or programs
- Option D: Better work-life balance for doctors

**Additional Revenue Opportunities:**
- More comprehensive care = higher patient retention
- Advanced therapy adoption increases (HBOT, IV, peptides)
- Attract patients seeking cutting-edge care
- Marketing differentiator: "AI-enhanced personalized medicine"

---

## Competitive Advantages

### What Makes ExpandHealth AI Unique

1. **🎙️ Conversation-First Clinical Intelligence (BREAKTHROUGH INNOVATION)**
   - **Replaces traditional intake forms** with natural doctor-patient conversation
   - AI extracts comprehensive clinical context from audio recording
   - Captures nuances that forms miss: emotional state, readiness, concerns, motivations
   - **Better patient experience:** Natural conversation vs paperwork
   - **More accurate data:** Patients reveal more in conversation
   - **Hidden patterns discovered:** AI correlates symptoms, lifestyle, labs automatically
   - **Personalization at scale:** Quotes and context woven into recommendations

   **Why This Matters:**
   - Traditional EMR systems rely on checkbox forms (incomplete data)
   - Doctors type during visits (breaks rapport, misses information)
   - ExpandHealth AI captures EVERYTHING while doctor focuses on patient
   - Results in truly personalized plans, not generic protocols

2. **Clinic-Specific Integration**
   - Protocols include YOUR treatments (HBOT, ozone, peptides)
   - Not generic recommendations
   - Automatically considers clinic capabilities
   - Treatment suggestions matched to patient readiness and budget (from conversation)

3. **Evidence-Based + Experience**
   - Scientific literature backing
   - PLUS your clinical experience encoded
   - Best of both worlds
   - Protocol library includes YOUR successful case histories

4. **Doctor-Centric Design**
   - Built for doctor efficiency
   - Maintains doctor expertise as central
   - AI assists, doesn't replace
   - Doctor reviews before patient sees anything (human-in-the-loop)

5. **Advanced Therapy Focus**
   - Goes beyond basic lifestyle + supplements
   - Sophisticated intervention protocols (HBOT, IV, peptides, ozone)
   - Positions clinic as cutting-edge
   - Patient education about advanced therapies built-in

6. **Psychosocial Intelligence**
   - Understands patient barriers: "Travel a lot for work"
   - Accounts for support system: "Wife is on board"
   - Respects concerns: "Worried about becoming dependent on meds"
   - Adjusts recommendations to lifestyle realities
   - **Result:** Higher compliance because plans are actually doable

7. **Continuous Learning**
   - Update protocols instantly affects all future analyses
   - Track outcomes to refine recommendations
   - System gets smarter over time
   - Learn which treatments work best for which patient profiles

---

## What This Platform Is — and Is Not

### What it IS:

✅ **A doctor amplification system**
   - Enhances doctor capabilities and efficiency
   - Maintains doctor as the central decision-maker
   - Scales clinical expertise without compromising quality

✅ **A clinical consistency and quality engine**
   - Ensures protocol adherence across all patients
   - Reduces variability in care delivery
   - Catches patterns that manual review might miss

✅ **A protocol intelligence layer built from real clinic experience**
   - Encodes two years of ExpandHealth operational learning
   - Combines evidence-based medicine with practical clinic workflows
   - Adapts to real patient constraints and preferences

### What it is NOT:

❌ **An autonomous diagnostic system**
   - Does not diagnose independently
   - Does not make treatment decisions without doctor review
   - Does not replace clinical judgment

❌ **A replacement for doctors or clinical judgment**
   - Assists, does not replace
   - Doctor expertise remains central
   - Clinical intuition and experience are preserved

❌ **A patient-facing AI without human approval**
   - No direct patient communication
   - All outputs reviewed by doctor before delivery
   - Human-in-the-loop is mandatory, not optional

❌ **A generic EMR or form-based intake tool**
   - Conversation-first, not checkbox-based
   - Clinic-specific protocols, not generic recommendations
   - Personalized intelligence, not template filling

**Bottom Line:**
ExpandHealth AI is designed to **support, not bypass**, medical responsibility. It amplifies doctor capabilities while preserving the human core of medicine.

---

## Risk Mitigation

### Safety Considerations

**Human Oversight (Mandatory):**
- Doctor ALWAYS reviews before patient sees recommendations
- AI cannot send anything directly to patients
- Doctor has final decision authority
- Audit trail documents all decisions

**Liability Protection:**
- Evidence-based recommendations documented
- Clinical reasoning transparent
- Doctor approval documented
- Follows standard of care

**Quality Assurance:**
- Regular protocol review and updates
- Outcome tracking and analysis
- Continuous improvement based on results
- Peer review of protocols

**Technical Safeguards:**
- Data encryption and HIPAA compliance
- Regular system audits
- Backup and disaster recovery
- Access controls and logging

---

## Patient Experience

### What Patients Receive

**Comprehensive Health Plan:**
- Clear explanation of findings (no medical jargon)
- Step-by-step action plan
- Treatment rationale explained
- Expected timeline and outcomes
- Resources and support materials

**Clinic Integration:**
- Seamless booking for HBOT, IV therapy, etc.
- Coordinated treatment schedule
- Progress tracking and accountability
- Regular check-ins and adjustments

**Empowerment:**
- Understanding WHY recommendations matter
- Tools to track progress
- Educational resources
- Community support options

---

## Success Metrics

### How We Measure Success

**Efficiency Metrics:**
- ⏱️ Time per patient analysis (target: <15 min)
- 📊 Patients analyzed per week (target: 3x increase)
- 💰 Revenue per doctor hour (target: 200% increase)

**Quality Metrics:**
- ✅ Protocol adherence rate
- 📈 Patient outcome improvements
- 🎯 Goal achievement percentage
- 😊 Patient satisfaction scores

**Business Metrics:**
- 💵 Revenue from advanced therapies
- 🔄 Patient retention rate
- ⭐ New patient acquisition
- 📣 Referral rate increase

**Clinical Metrics:**
- 🩺 Lab marker improvement rates
- ⚖️ Weight loss success
- ⚡ Energy level improvements
- 🎯 Diabetes prevention rate

---

## Next Steps

### Immediate Actions (Week 1)

1. **Review & Approve Concept**
   - Jack reviews this proposal
   - Discuss any modifications needed
   - Approve to proceed with development

2. **Gather Protocol Library**
   - Compile existing clinic protocols
   - Document HBOT, IV, peptide protocols
   - Collect reference materials
   - Organize evidence base

3. **Set Up Infrastructure**
   - Create accounts (N8N, Gemini, Claude)
   - Configure basic workflows
   - Test data extraction capabilities

### Short-Term (Weeks 2-4)

1. **Build Knowledge Base**
   - Upload all protocols to system
   - Organize and tag appropriately
   - Test retrieval functionality
   - Refine as needed

2. **Develop AI Agent**
   - Train on ExpandHealth clinical voice
   - Test with historical patient cases
   - Iterate based on results
   - Validate output quality

3. **Create Review Interface**
   - Build doctor dashboard
   - Test edit/approve workflow
   - Generate sample patient documents
   - Gather feedback

### Medium-Term (Weeks 5-8)

1. **Pilot Program**
   - Select 10-20 pilot patients
   - Process through full system
   - Measure time savings
   - Document outcomes

2. **Refinement**
   - Adjust based on pilot learnings
   - Optimize workflows
   - Improve UI/UX
   - Add requested features

3. **Staff Training**
   - Train doctors on system use
   - Train support staff
   - Create training materials
   - Establish best practices

### Long-Term (Weeks 9-12+)

1. **Full Deployment**
   - Roll out to all clinic doctors
   - Process all comprehensive patients
   - Track metrics continuously
   - Celebrate wins!

2. **Expansion Opportunities**
   - Add other analysis types (hormone panels, etc.)
   - Build patient portal integration
   - Develop mobile app
   - Explore additional clinic locations

---

## Investment Required

### Development Costs

**Technology Infrastructure:**
- N8N Cloud: $20/month (Starter tier)
- Gemini API: Free tier sufficient initially (~$50/month at scale)
- Claude API: ~$100-300/month (based on usage)
- Web Hosting: ~$50/month
- **Total Monthly: ~$220-420**

**Development Time:**
- Week 1-4: Emilian building foundation (already underway)
- Week 5-8: Testing and refinement
- Week 9-12: Pilot and deployment
- **Total: 12 weeks to full deployment**

**Training & Onboarding:**
- Doctor training: 2-3 hours per doctor
- Staff orientation: 1 hour
- Ongoing support: Included in development

**Total First-Year Investment:**
- Technology: ~$5,000
- Development time: In-house (Emilian)
- Training: Minimal (2-3 hours per doctor)
- **Estimated Total: $5,000-10,000**

### Expected ROI

**Conservative Estimate:**
- Each doctor saves 15 hours/week
- Can see 30-60 more patients/week clinic-wide
- Average patient lifetime value: $5,000-10,000
- Advanced therapy adoption increases 20-30%

**First Year Revenue Impact:**
- New patient capacity: $150,000-300,000
- Increased therapy adoption: $50,000-100,000
- Improved retention: $25,000-50,000
- **Potential Total: $225,000-450,000**

**ROI: 2,250% - 4,500% (conservative)**

---

## Conclusion

ExpandHealth AI represents a strategic investment in clinic efficiency, patient outcomes, and competitive positioning. By combining cutting-edge AI technology with ExpandHealth's advanced treatment modalities, we create a platform that:

✅ **Saves doctors 30-45 minutes per patient**
✅ **Ensures every patient receives comprehensive, protocol-based care**
✅ **Automatically integrates clinic treatments (HBOT, IV, peptides, ozone)**
✅ **Maintains doctor expertise as central to decision-making**
✅ **Scales the clinic's capacity without compromising quality**
✅ **Positions ExpandHealth as a leader in AI-enhanced medicine**

**ExpandHealth AI is not an experiment—it is the formalization of two years of clinical learning across real longevity clinics.** By encoding workflows, protocols, and judgment patterns into an agent-based system, we create durable leverage: better care, higher consistency, and scalable expertise without losing the human core of medicine.

**Recommendation:** Proceed with Phase 1 immediately, with clear validation gates at each stage. This approach minimizes risk, maximizes learning, and positions ExpandHealth at the forefront of AI-enabled longevity medicine.

---

## Appendix A: Sample Protocol Structure

### Example: Metabolic Syndrome Management Protocol

```markdown
# Metabolic Syndrome Management Protocol v2.1

## Definition & Diagnosis
Presence of 3+ of the following:
- Waist circumference: >40" (men), >35" (women)
- Triglycerides: ≥150 mg/dL
- HDL: <40 mg/dL (men), <50 mg/dL (women)
- Blood pressure: ≥130/85 mmHg
- Fasting glucose: ≥100 mg/dL

## Pathophysiology
[Explanation of insulin resistance, inflammation, etc.]

## Evidence-Based Interventions

### Dietary Approach
- Mediterranean or low-glycemic diet
- Time-restricted eating (14-16 hour fast)
- Reduce processed carbs, increase fiber
- [Evidence citations]

### Supplement Protocol
1. Berberine 500mg 2x/day
   - Mechanism: AMPK activation, glucose uptake
   - Evidence: [Research citations]
   - Contraindications: [List]

2. Omega-3 2000mg/day
   - [Details...]

### ExpandHealth Clinic Therapies

#### HBOT Protocol for Metabolic Syndrome
- Frequency: 2x/week for 5-10 weeks
- Rationale: Improves insulin sensitivity, reduces inflammation
- Evidence: [Research studies]
- Expected outcomes: Energy ↑, glucose control ↑, inflammation ↓
- Patient selection: [Criteria]

#### IV NAD+ Therapy
- Protocol: Weekly × 4, then maintenance
- Rationale: Cellular energy, DNA repair, longevity pathways
- Dosing: 250-500mg (titrate based on tolerance)
- Expected outcomes: [List]

#### Peptide Considerations
- CJC-1295/Ipamorelin for GH optimization
- Timeline: After 4-week dietary foundation
- Monitoring: IGF-1 levels
- [Full protocol details]

### Exercise Protocol
[Detailed progression]

### Monitoring
- Labs: Week 0, 6, 12
- Markers: [Specific measures]
- Adjustments: [Decision tree]

### Expected Outcomes
- 4 weeks: [Targets]
- 12 weeks: [Targets]
- 24 weeks: [Long-term goals]

## References
[List of evidence-based research]
```

---

## Appendix B: Technology Stack Details

### Core Components

**N8N (Workflow Orchestration):**
- Connects all systems
- Automates data flow
- Triggers AI analysis
- Manages approvals

**Gemini File Search (Knowledge Base):**
- Stores all protocols
- Fast semantic search
- Retrieves relevant sections
- Updates in real-time

**Claude Sonnet 4.5 (AI Brain):**
- Analyzes blood tests
- Generates recommendations
- Queries knowledge base
- Produces structured output

**Web Dashboard:**
- Doctor interface
- Upload functionality
- Review and edit tools
- Patient document generation

---

