/**
 * Seed Demo Lab Results for ExpandHealth V2
 * Creates realistic lab data for each demo client
 * Run: node seed-demo-labs.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Lab data for each client
const labData = {
  // Sarah Chen (38F) - Hashimoto's, PCOS, hormone imbalance, insulin resistance
  'sarah.chen@example.com': [
    {
      title: 'Comprehensive Thyroid Panel',
      lab_type: 'Thyroid',
      test_date: '2025-12-10',
      extracted_data: {
        markers: [
          { name: 'TSH', value: 4.2, unit: 'µIU/mL', range: '0.45-4.5', status: 'high-normal', flag: 'warning' },
          { name: 'Free T4', value: 1.0, unit: 'ng/dL', range: '0.8-1.8', status: 'normal' },
          { name: 'Free T3', value: 2.1, unit: 'pg/mL', range: '2.3-4.2', status: 'low', flag: 'abnormal' },
          { name: 'Reverse T3', value: 22, unit: 'ng/dL', range: '9.2-24.1', status: 'high-normal', flag: 'warning' },
          { name: 'Anti-TPO', value: 245, unit: 'IU/mL', range: '<35', status: 'high', flag: 'abnormal' },
          { name: 'Anti-TG', value: 89, unit: 'IU/mL', range: '<20', status: 'high', flag: 'abnormal' }
        ],
        interpretation: 'Hashimoto\'s thyroiditis confirmed with elevated antibodies. Poor T4 to T3 conversion suggested by low Free T3 and elevated Reverse T3.'
      },
      ai_summary: `**Thyroid Panel Analysis - Sarah Chen**

**Key Findings:**
- ⚠️ **Hashimoto's Thyroiditis Confirmed**: Significantly elevated Anti-TPO (245 IU/mL, 7x normal) and Anti-TG (89 IU/mL, 4x normal)
- ⚠️ **Poor T4→T3 Conversion**: Low Free T3 (2.1 pg/mL) despite normal Free T4, elevated Reverse T3
- TSH at upper limit (4.2 µIU/mL) suggests subclinical hypothyroidism despite levothyroxine

**Clinical Implications:**
The current levothyroxine 75 mcg may be inadequate. The low Free T3 with high Reverse T3 pattern suggests T4 is being shunted to inactive rT3 rather than active T3. This is common with chronic stress, inflammation, or selenium deficiency.

**Recommendations:**
1. Consider adding T3 (liothyronine) or switching to NDT
2. Check selenium and zinc levels
3. Address underlying inflammation (see inflammatory markers)
4. Retest in 6-8 weeks after any medication changes`
    },
    {
      title: 'Female Hormone Panel',
      lab_type: 'Hormones',
      test_date: '2025-12-10',
      extracted_data: {
        markers: [
          { name: 'Estradiol', value: 185, unit: 'pg/mL', range: '15-150 (follicular)', status: 'high', flag: 'abnormal', note: 'Day 21' },
          { name: 'Progesterone', value: 3.2, unit: 'ng/mL', range: '5-20 (luteal)', status: 'low', flag: 'abnormal', note: 'Day 21' },
          { name: 'Total Testosterone', value: 18, unit: 'ng/dL', range: '8-60', status: 'normal' },
          { name: 'Free Testosterone', value: 0.8, unit: 'pg/mL', range: '1.0-8.5', status: 'low', flag: 'warning' },
          { name: 'DHEA-S', value: 95, unit: 'µg/dL', range: '65-380', status: 'low-normal', flag: 'warning' },
          { name: 'Cortisol (AM)', value: 8.2, unit: 'µg/dL', range: '10-20', status: 'low', flag: 'abnormal' },
          { name: 'Cortisol (PM)', value: 2.1, unit: 'µg/dL', range: '3-10', status: 'low-normal' },
          { name: 'Prolactin', value: 18, unit: 'ng/mL', range: '3-27', status: 'normal' }
        ],
        interpretation: 'Estrogen dominance pattern with low progesterone. HPA axis dysfunction with low morning cortisol. Adrenal reserve depletion indicated by low DHEA-S.'
      },
      ai_summary: `**Female Hormone Panel Analysis - Sarah Chen**

**Key Findings:**
- 🔴 **Estrogen Dominance**: Estradiol elevated (185 pg/mL) with severely low progesterone (3.2 ng/mL) on Day 21
- 🔴 **HPA Axis Dysfunction**: Low morning cortisol (8.2 µg/dL) indicates adrenal fatigue
- ⚠️ **Adrenal Reserve Depleted**: Low DHEA-S (95 µg/dL) suggests chronic stress burden

**Estrogen:Progesterone Ratio:**
Current ratio ~58:1 (optimal is 100-500:1 in luteal phase based on pg/mL:ng/mL)
The progesterone is critically low for Day 21, suggesting anovulatory cycle or luteal phase defect (consistent with PCOS history).

**Clinical Pattern:**
This hormone profile explains many symptoms: weight gain, fatigue, mood swings, irregular cycles. The combination of:
- High estrogen → weight retention, mood issues
- Low progesterone → anxiety, poor sleep, irregular cycles
- Low cortisol → morning fatigue, "need coffee to function"

**Recommendations:**
1. Consider bioidentical progesterone support (cyclical)
2. Adrenal support: Adaptogenic herbs (Ashwagandha, Rhodiola)
3. Support estrogen metabolism: DIM, calcium-d-glucarate
4. Address PCOS with inositol, berberine`
    },
    {
      title: 'Metabolic & Inflammatory Panel',
      lab_type: 'Metabolic',
      test_date: '2025-12-10',
      extracted_data: {
        markers: [
          { name: 'Fasting Glucose', value: 98, unit: 'mg/dL', range: '70-99', status: 'high-normal', flag: 'warning' },
          { name: 'Fasting Insulin', value: 14.2, unit: 'µIU/mL', range: '2-10', status: 'high', flag: 'abnormal' },
          { name: 'HbA1c', value: 5.6, unit: '%', range: '4.8-5.6', status: 'high-normal', flag: 'warning' },
          { name: 'HOMA-IR', value: 3.4, unit: '', range: '<2.0', status: 'high', flag: 'abnormal' },
          { name: 'Total Cholesterol', value: 218, unit: 'mg/dL', range: '<200', status: 'high', flag: 'warning' },
          { name: 'LDL-C', value: 142, unit: 'mg/dL', range: '<100', status: 'high', flag: 'abnormal' },
          { name: 'HDL-C', value: 52, unit: 'mg/dL', range: '>60', status: 'low', flag: 'warning' },
          { name: 'Triglycerides', value: 118, unit: 'mg/dL', range: '<150', status: 'normal' },
          { name: 'hs-CRP', value: 2.8, unit: 'mg/L', range: '<1.0', status: 'high', flag: 'abnormal' },
          { name: 'Homocysteine', value: 12.4, unit: 'µmol/L', range: '<10', status: 'high', flag: 'warning' },
          { name: 'Vitamin D (25-OH)', value: 28, unit: 'ng/mL', range: '40-80', status: 'low', flag: 'abnormal' },
          { name: 'Vitamin B12', value: 385, unit: 'pg/mL', range: '400-1000', status: 'low', flag: 'warning' },
          { name: 'Ferritin', value: 32, unit: 'ng/mL', range: '50-150', status: 'low', flag: 'warning' }
        ],
        interpretation: 'Insulin resistance confirmed (HOMA-IR 3.4). Elevated inflammation. Multiple nutrient deficiencies contributing to fatigue and poor thyroid conversion.'
      },
      ai_summary: `**Metabolic & Inflammatory Panel - Sarah Chen**

**Key Findings:**
- 🔴 **Insulin Resistance Confirmed**: HOMA-IR 3.4 (normal <2.0), fasting insulin elevated at 14.2
- 🔴 **Systemic Inflammation**: hs-CRP 2.8 mg/L (high cardiovascular risk category)
- ⚠️ **Nutrient Deficiencies**: Vitamin D insufficient, B12 borderline, ferritin low

**Metabolic Syndrome Risk:**
Patient meets criteria for metabolic syndrome precursor state:
✓ Insulin resistance (HOMA-IR 3.4)
✓ Low HDL (52 mg/dL)
✓ Elevated LDL (142 mg/dL)
✓ Systemic inflammation (hs-CRP 2.8)

**Why This Matters for Thyroid:**
- Low ferritin (32) impairs thyroid peroxidase enzyme
- Low vitamin D (28) associated with Hashimoto's progression
- Insulin resistance worsens PCOS and estrogen dominance
- Inflammation drives T4→rT3 conversion (explaining her poor T3)

**Recommendations:**
1. **Insulin Sensitizers**: Berberine 500mg BID, Inositol 2g BID
2. **Vitamin D**: Increase to 5000 IU daily with K2, target 60-80 ng/mL
3. **B12**: Methylcobalamin 1000mcg sublingual
4. **Iron**: Ferrous bisglycinate 25mg with vitamin C (retest ferritin in 3 months)
5. **Anti-inflammatory**: Omega-3s 2-3g EPA+DHA daily`
    }
  ],

  // Michael Rodriguez (52M) - Post-MI, diabetic, high Lp(a), cardiac rehab
  'michael.rodriguez@example.com': [
    {
      title: 'Advanced Cardiovascular Panel',
      lab_type: 'Cardiovascular',
      test_date: '2025-12-12',
      extracted_data: {
        markers: [
          { name: 'Lp(a)', value: 85, unit: 'nmol/L', range: '<75', status: 'high', flag: 'abnormal' },
          { name: 'ApoB', value: 78, unit: 'mg/dL', range: '<90', status: 'normal', note: 'On statin' },
          { name: 'oxLDL', value: 52, unit: 'U/L', range: '<60', status: 'high-normal', flag: 'warning' },
          { name: 'MPO', value: 498, unit: 'pmol/L', range: '<600', status: 'normal' },
          { name: 'NT-proBNP', value: 125, unit: 'pg/mL', range: '<125', status: 'high-normal', flag: 'warning', note: 'Post-MI expected' },
          { name: 'Lp-PLA2', value: 198, unit: 'nmol/min/mL', range: '<200', status: 'borderline', flag: 'warning' },
          { name: 'Total Cholesterol', value: 158, unit: 'mg/dL', range: '<200', status: 'normal' },
          { name: 'LDL-C', value: 72, unit: 'mg/dL', range: '<70', status: 'borderline', flag: 'warning' },
          { name: 'HDL-C', value: 48, unit: 'mg/dL', range: '>40', status: 'low-normal', flag: 'warning' },
          { name: 'Triglycerides', value: 142, unit: 'mg/dL', range: '<150', status: 'normal' }
        ],
        interpretation: 'Elevated Lp(a) represents significant residual genetic cardiovascular risk. LDL near goal on statin therapy. HDL suboptimal.'
      },
      ai_summary: `**Advanced Cardiovascular Panel - Michael Rodriguez**

**Critical Finding:**
🔴 **Elevated Lp(a): 85 nmol/L** - This is the most actionable finding. Lp(a) is 90% genetically determined and represents significant residual risk NOT addressed by statin therapy.

**Current Statin Response (Atorvastatin 40mg):**
- LDL-C: 72 mg/dL (near goal of <70 for post-MI)
- ApoB: 78 mg/dL (good response)
- HDL-C: 48 mg/dL (suboptimal, target >50 for men)

**Residual Risk Assessment:**
Despite good LDL control, residual risk remains elevated due to:
1. High Lp(a) - strongest genetic risk factor
2. Borderline Lp-PLA2 (198) - arterial inflammation
3. Suboptimal HDL (48 mg/dL)
4. NT-proBNP at upper limit (cardiac strain)

**Evidence-Based Recommendations:**
1. **For Lp(a)**:
   - Niacin 1-2g/day (can reduce Lp(a) 20-30%)
   - Consider PCSK9 inhibitor discussion with cardiologist
   - High-dose EPA (Vascepa) 4g/day
2. **For HDL**:
   - Increase aerobic exercise (already doing cardiac rehab)
   - Omega-3s, moderate alcohol if appropriate
3. **Monitoring**:
   - Repeat advanced lipids in 3 months
   - Annual coronary calcium score progression`
    },
    {
      title: 'Diabetic Panel & Kidney Function',
      lab_type: 'Metabolic',
      test_date: '2025-12-12',
      extracted_data: {
        markers: [
          { name: 'Fasting Glucose', value: 118, unit: 'mg/dL', range: '70-99', status: 'high', flag: 'abnormal' },
          { name: 'HbA1c', value: 6.8, unit: '%', range: '<7.0', status: 'borderline', flag: 'warning' },
          { name: 'Fasting Insulin', value: 18.5, unit: 'µIU/mL', range: '2-10', status: 'high', flag: 'abnormal' },
          { name: 'HOMA-IR', value: 5.4, unit: '', range: '<2.0', status: 'high', flag: 'abnormal' },
          { name: 'C-Peptide', value: 3.8, unit: 'ng/mL', range: '0.8-3.5', status: 'high', flag: 'warning' },
          { name: 'eGFR', value: 72, unit: 'mL/min', range: '>90', status: 'reduced', flag: 'warning', note: 'Stage 2 CKD' },
          { name: 'Creatinine', value: 1.2, unit: 'mg/dL', range: '0.7-1.2', status: 'high-normal' },
          { name: 'Albumin/Creatinine Ratio', value: 45, unit: 'mg/g', range: '<30', status: 'high', flag: 'abnormal', note: 'Microalbuminuria' },
          { name: 'BUN', value: 22, unit: 'mg/dL', range: '7-20', status: 'high-normal' }
        ],
        interpretation: 'Diabetes not optimally controlled despite metformin. Early diabetic nephropathy detected (microalbuminuria). Significant insulin resistance persists.'
      },
      ai_summary: `**Diabetic & Kidney Panel - Michael Rodriguez**

**Critical Findings:**
🔴 **Suboptimal Glycemic Control**: HbA1c 6.8% despite metformin 2000mg/day
🔴 **Early Diabetic Nephropathy**: Microalbuminuria (ACR 45 mg/g) with Stage 2 CKD (eGFR 72)
🔴 **Severe Insulin Resistance**: HOMA-IR 5.4, hyperinsulinemia (18.5 µIU/mL)

**Why This Matters Post-MI:**
Diabetes is the #1 driver of recurrent cardiovascular events. The combination of:
- Uncontrolled diabetes + insulin resistance
- Early kidney disease
- Residual inflammation
creates a "perfect storm" for accelerated atherosclerosis.

**Kidney Protection is Critical:**
The microalbuminuria indicates endothelial damage and predicts both:
- Progressive kidney disease
- Increased cardiovascular mortality

**Evidence-Based Recommendations:**
1. **Add SGLT2 Inhibitor** (empagliflozin/dapagliflozin):
   - Proven cardioprotection post-MI
   - Proven nephroprotection
   - Additional HbA1c reduction
   - This is ESSENTIAL given kidney findings

2. **Consider GLP-1 Agonist** (semaglutide):
   - Cardiovascular mortality benefit
   - Weight loss (aids insulin sensitivity)
   - Synergistic with SGLT2i

3. **Optimize ACE Inhibitor**:
   - Already on Lisinopril 20mg (good)
   - Ensure maximal tolerated dose for kidney protection

4. **Targets**:
   - HbA1c <6.5% (aggressive for CV protection)
   - ACR <30 mg/g
   - BP <130/80`
    },
    {
      title: 'Inflammatory & Hormone Panel',
      lab_type: 'Hormones',
      test_date: '2025-12-12',
      extracted_data: {
        markers: [
          { name: 'hs-CRP', value: 2.4, unit: 'mg/L', range: '<1.0', status: 'high', flag: 'abnormal' },
          { name: 'ESR', value: 18, unit: 'mm/hr', range: '0-15', status: 'high-normal' },
          { name: 'Homocysteine', value: 14.2, unit: 'µmol/L', range: '<10', status: 'high', flag: 'abnormal' },
          { name: 'Fibrinogen', value: 385, unit: 'mg/dL', range: '200-400', status: 'high-normal' },
          { name: 'Total Testosterone', value: 285, unit: 'ng/dL', range: '300-1000', status: 'low', flag: 'warning' },
          { name: 'Free Testosterone', value: 5.2, unit: 'ng/dL', range: '5-21', status: 'low', flag: 'warning' },
          { name: 'SHBG', value: 42, unit: 'nmol/L', range: '10-57', status: 'normal' },
          { name: 'DHEA-S', value: 145, unit: 'µg/dL', range: '80-560', status: 'low-normal' },
          { name: 'Vitamin D (25-OH)', value: 31, unit: 'ng/mL', range: '40-80', status: 'low', flag: 'warning' }
        ],
        interpretation: 'Residual inflammation despite statin. Elevated homocysteine is independent CV risk factor. Low testosterone common post-MI and with metabolic syndrome.'
      },
      ai_summary: `**Inflammatory & Hormone Panel - Michael Rodriguez**

**Residual Inflammatory Risk:**
🔴 **hs-CRP 2.4 mg/L** - Despite atorvastatin, inflammation remains elevated
🔴 **Homocysteine 14.2 µmol/L** - Independent cardiovascular risk factor

**Hormone Status:**
⚠️ **Low Testosterone**: 285 ng/dL (below reference range)
- Common after MI and with metabolic syndrome
- Low T is associated with increased CV mortality
- Also contributes to fatigue, reduced exercise capacity, insulin resistance

**The Inflammation-Hormone Connection:**
Post-MI patients often develop a cycle of:
Low testosterone → increased inflammation → worsened insulin resistance → more inflammation

**Recommendations:**

1. **For Elevated Homocysteine:**
   - Methylfolate 1mg + B12 1000mcg + B6 50mg daily
   - Retest in 3 months (target <10 µmol/L)

2. **For Residual Inflammation:**
   - Already on statin (has anti-inflammatory effect)
   - Add high-dose omega-3s (4g EPA+DHA)
   - Consider colchicine 0.5mg daily (COLCOT trial showed benefit post-MI)
   - Address insulin resistance (biggest inflammatory driver)

3. **For Low Testosterone:**
   - First optimize: sleep, weight, insulin resistance
   - Retest in 3 months after metabolic improvements
   - If persistently low, discuss TRT with cardiology (safe post-MI per recent data)

4. **Vitamin D:**
   - Increase to 5000 IU daily
   - Target 50-70 ng/mL for cardiovascular benefit`
    }
  ],

  // Jennifer Walsh (55F) - Postmenopausal, hormone deficiency, osteopenia, accelerated aging
  'jennifer.walsh@example.com': [
    {
      title: 'Comprehensive Hormone Panel',
      lab_type: 'Hormones',
      test_date: '2025-12-14',
      extracted_data: {
        markers: [
          { name: 'Estradiol', value: 12, unit: 'pg/mL', range: '<30 postmenopausal', status: 'low', flag: 'warning' },
          { name: 'Progesterone', value: 0.2, unit: 'ng/mL', range: '<1 postmenopausal', status: 'low' },
          { name: 'Total Testosterone', value: 14, unit: 'ng/dL', range: '10-40', status: 'low', flag: 'warning' },
          { name: 'Free Testosterone', value: 0.4, unit: 'pg/mL', range: '0.3-1.9', status: 'low', flag: 'warning' },
          { name: 'DHEA-S', value: 68, unit: 'µg/dL', range: '35-430', status: 'low', flag: 'warning' },
          { name: 'SHBG', value: 78, unit: 'nmol/L', range: '20-130', status: 'high-normal', flag: 'warning' },
          { name: 'FSH', value: 72, unit: 'mIU/mL', range: '>25 postmenopausal', status: 'high', note: 'Confirms postmenopausal' },
          { name: 'LH', value: 38, unit: 'mIU/mL', range: '>15 postmenopausal', status: 'elevated' },
          { name: 'Prolactin', value: 8, unit: 'ng/mL', range: '3-27', status: 'normal' },
          { name: 'Cortisol (AM)', value: 14, unit: 'µg/dL', range: '10-20', status: 'normal' }
        ],
        interpretation: 'Severe postmenopausal hormone deficiency across all lines. Elevated SHBG reduces bioavailable hormones further. Strong candidate for comprehensive HRT.'
      },
      ai_summary: `**Comprehensive Hormone Panel - Jennifer Walsh**

**Hormone Status Summary:**
🔴 **Severe Deficiency Across All Hormone Lines:**

| Hormone | Level | Status |
|---------|-------|--------|
| Estradiol | 12 pg/mL | Very low |
| Progesterone | 0.2 ng/mL | Depleted |
| Testosterone | 14 ng/dL | Low |
| Free Testosterone | 0.4 pg/mL | Bottom of range |
| DHEA-S | 68 µg/dL | Low for age |

**Clinical Correlation:**
This explains the patient's symptoms:
- Skin changes, vaginal dryness → Estrogen deficiency
- Decreased libido → Testosterone + estrogen deficiency
- Cognitive changes, word-finding difficulty → Estrogen affects brain function
- Joint stiffness → Loss of estrogen's anti-inflammatory effects
- Accelerated aging appearance → All hormones protective

**SHBG Consideration:**
Elevated SHBG (78 nmol/L) binds testosterone, making even more of it unavailable. This is common in thin postmenopausal women.

**HRT Candidacy Assessment:**
✅ Strong candidate for bioidentical HRT:
- 4 years postmenopausal (within 10-year window)
- No contraindications (BRCA negative, no personal breast cancer history)
- Significant quality of life impact
- Osteopenia (estrogen protective for bone)

**Recommended HRT Protocol:**
1. **Estradiol**: Transdermal patch 0.05-0.1mg (safer than oral for clot risk)
2. **Progesterone**: Oral micronized 100-200mg at bedtime (protects uterus, aids sleep)
3. **Testosterone**: Compounded cream 0.5-1mg daily or pellet
4. **DHEA**: 10-25mg daily oral`
    },
    {
      title: 'Bone Health & Metabolic Panel',
      lab_type: 'Metabolic',
      test_date: '2025-12-14',
      extracted_data: {
        markers: [
          { name: 'Vitamin D (25-OH)', value: 38, unit: 'ng/mL', range: '40-80', status: 'low', flag: 'warning' },
          { name: 'Calcium', value: 9.4, unit: 'mg/dL', range: '8.5-10.5', status: 'normal' },
          { name: 'PTH', value: 52, unit: 'pg/mL', range: '15-65', status: 'normal' },
          { name: 'Osteocalcin', value: 12, unit: 'ng/mL', range: '11-50', status: 'low-normal', flag: 'warning', note: 'Bone formation marker' },
          { name: 'CTX', value: 0.45, unit: 'ng/mL', range: '<0.35', status: 'high', flag: 'abnormal', note: 'Bone resorption marker' },
          { name: 'Fasting Glucose', value: 94, unit: 'mg/dL', range: '70-99', status: 'normal' },
          { name: 'Fasting Insulin', value: 8.2, unit: 'µIU/mL', range: '2-10', status: 'normal' },
          { name: 'HbA1c', value: 5.4, unit: '%', range: '<5.7', status: 'normal' },
          { name: 'Total Cholesterol', value: 238, unit: 'mg/dL', range: '<200', status: 'high', flag: 'warning' },
          { name: 'LDL-C', value: 152, unit: 'mg/dL', range: '<100', status: 'high', flag: 'abnormal' },
          { name: 'HDL-C', value: 68, unit: 'mg/dL', range: '>60', status: 'good' },
          { name: 'Triglycerides', value: 88, unit: 'mg/dL', range: '<150', status: 'optimal' }
        ],
        interpretation: 'Active bone loss with elevated resorption marker (CTX). Postmenopausal dyslipidemia pattern. Vitamin D insufficient for bone protection.'
      },
      ai_summary: `**Bone Health & Metabolic Panel - Jennifer Walsh**

**Critical Bone Health Finding:**
🔴 **Active Bone Loss in Progress**
- CTX (resorption marker): 0.45 ng/mL (elevated - bone breaking down faster than building)
- Osteocalcin (formation marker): 12 ng/mL (low-normal - not keeping up)
- Net result: Bone loss, explaining osteopenia diagnosis

**Why This Happens:**
Estrogen normally inhibits osteoclasts (bone-resorbing cells). Without estrogen, osteoclast activity increases unchecked.

**Vitamin D Status:**
⚠️ 38 ng/mL is insufficient for bone protection
- Target for osteopenia: 50-70 ng/mL
- Current supplementation (2000 IU) is inadequate

**Postmenopausal Lipid Pattern:**
The cholesterol changes are classic for menopause:
- Total cholesterol ↑ (238 mg/dL)
- LDL ↑ (152 mg/dL)
- These typically improve with estrogen replacement

**Metabolic Health:**
✅ Excellent insulin sensitivity (HOMA-IR ~1.9)
✅ Normal glucose metabolism
This is actually protective and suggests good response to hormone therapy.

**Bone Protection Strategy:**
1. **Estrogen replacement** - Most effective intervention for bone
2. **Vitamin D**: Increase to 5000 IU daily with K2 (200mcg MK-7)
3. **Strength training**: Weight-bearing exercise stimulates osteoblasts
4. **Consider**: Retest CTX in 6 months on HRT to confirm reduction
5. **DEXA scan**: Repeat in 1-2 years to document improvement`
    },
    {
      title: 'Oxidative Stress & Aging Panel',
      lab_type: 'Longevity',
      test_date: '2025-12-14',
      extracted_data: {
        markers: [
          { name: '8-OHdG', value: 18.5, unit: 'ng/mg creatinine', range: '<10', status: 'high', flag: 'abnormal', note: 'DNA oxidative damage' },
          { name: 'F2-isoprostanes', value: 0.42, unit: 'ng/mL', range: '<0.30', status: 'high', flag: 'abnormal', note: 'Lipid peroxidation' },
          { name: 'Omega-3 Index', value: 4.8, unit: '%', range: '>8%', status: 'low', flag: 'warning' },
          { name: 'hs-CRP', value: 1.2, unit: 'mg/L', range: '<1.0', status: 'elevated', flag: 'warning' },
          { name: 'Homocysteine', value: 9.8, unit: 'µmol/L', range: '<10', status: 'normal' },
          { name: 'Vitamin B12', value: 520, unit: 'pg/mL', range: '400-1000', status: 'adequate' },
          { name: 'Folate', value: 12, unit: 'ng/mL', range: '>5', status: 'normal' },
          { name: 'Ferritin', value: 85, unit: 'ng/mL', range: '20-200', status: 'good' },
          { name: 'CoQ10', value: 0.58, unit: 'µg/mL', range: '0.5-1.5', status: 'low-normal', flag: 'warning' }
        ],
        interpretation: 'Elevated oxidative stress markers consistent with accelerated biological aging. DNA damage and lipid peroxidation both elevated. Low omega-3 index contributing.'
      },
      ai_summary: `**Oxidative Stress & Aging Panel - Jennifer Walsh**

**Accelerated Aging Confirmed:**
🔴 **Elevated Oxidative Stress Markers:**
- 8-OHdG: 18.5 ng/mg (85% above optimal) - DNA is being damaged
- F2-isoprostanes: 0.42 ng/mL (40% above optimal) - Cell membranes being oxidized

**What This Means:**
These markers reflect the rate of cellular aging. Elevated levels indicate:
- Faster telomere shortening
- Increased cellular senescence
- Higher biological age vs chronological age

**Root Causes in This Patient:**
1. **Hormone deficiency** - Estrogen and testosterone are powerful antioxidants
2. **Low omega-3 index** (4.8%) - Cell membranes more susceptible to oxidation
3. **Subclinical inflammation** (hs-CRP 1.2)
4. **Suboptimal CoQ10** - Critical for mitochondrial function

**NAD+ & Longevity Interventions:**
Patient expressed interest in NAD+ therapy - this is appropriate given:
- Elevated oxidative stress markers
- Signs of accelerated aging
- Mitochondrial function needs support

**Comprehensive Anti-Aging Protocol:**

1. **Hormone Optimization** (see hormone panel)
   - Estrogen is neuroprotective and antioxidant
   - Testosterone supports mitochondrial function

2. **NAD+ Support:**
   - NMN 500-1000mg daily OR
   - NAD+ IV therapy 250-500mg weekly for 4 weeks, then monthly

3. **Antioxidant Support:**
   - Omega-3s: 2-3g EPA+DHA daily (target index >8%)
   - CoQ10: 200-400mg ubiquinol form
   - Glutathione support: NAC 600-1200mg or liposomal glutathione

4. **Mitochondrial Support:**
   - PQQ 20mg daily
   - Alpha-lipoic acid 300-600mg daily

5. **Senolytic Consideration:**
   - Discuss fisetin or quercetin protocols for senescent cell clearance`
    }
  ],

  // David Kim (47M) - Competitive cyclist, overtraining syndrome
  'david.kim@example.com': [
    {
      title: 'Athletic Hormone & Recovery Panel',
      lab_type: 'Hormones',
      test_date: '2025-12-16',
      extracted_data: {
        markers: [
          { name: 'Total Testosterone', value: 385, unit: 'ng/dL', range: '300-1000', status: 'low-normal', flag: 'warning' },
          { name: 'Free Testosterone', value: 7.8, unit: 'ng/dL', range: '5-21', status: 'low-normal', flag: 'warning' },
          { name: 'SHBG', value: 52, unit: 'nmol/L', range: '10-57', status: 'high-normal', flag: 'warning', note: 'Elevated from endurance training' },
          { name: 'Cortisol (AM)', value: 22.4, unit: 'µg/dL', range: '10-20', status: 'high', flag: 'abnormal' },
          { name: 'Cortisol (PM)', value: 12.8, unit: 'µg/dL', range: '3-10', status: 'high', flag: 'abnormal' },
          { name: 'DHEA-S', value: 185, unit: 'µg/dL', range: '80-560', status: 'mid-range' },
          { name: 'IGF-1', value: 142, unit: 'ng/mL', range: '100-300', status: 'low-normal', flag: 'warning' },
          { name: 'TSH', value: 2.1, unit: 'µIU/mL', range: '0.45-4.5', status: 'normal' },
          { name: 'Free T3', value: 2.8, unit: 'pg/mL', range: '2.3-4.2', status: 'low-normal', flag: 'warning' }
        ],
        interpretation: 'Classic overtraining hormone pattern: suppressed testosterone, elevated cortisol with poor diurnal rhythm, elevated SHBG from endurance exercise.'
      },
      ai_summary: `**Athletic Hormone & Recovery Panel - David Kim**

**Overtraining Syndrome Confirmed:**
🔴 **Testosterone:Cortisol Ratio Severely Impaired**
- AM Cortisol: 22.4 µg/dL (elevated - stress response)
- PM Cortisol: 12.8 µg/dL (should be <10 - poor recovery)
- Total Testosterone: 385 ng/dL (low for athletic male)

**The Overtraining Hormone Pattern:**
| Finding | Status | Implication |
|---------|--------|-------------|
| T:C ratio | Low | Catabolic > Anabolic |
| Lost diurnal rhythm | Yes | HPA axis dysfunction |
| Elevated SHBG | 52 | Less free testosterone |
| Low IGF-1 | 142 | Impaired recovery/adaptation |
| Low Free T3 | 2.8 | Metabolic conservation |

**This Explains:**
- Extended recovery times (48-72h vs 24-36h)
- Elevated resting HR (+5-8 bpm)
- Declining HRV trend
- Performance plateau (FTP stagnant)
- Mood changes, reduced motivation

**Recovery Protocol:**

1. **Immediate Training Modification:**
   - Reduce volume by 40-50% for 2-3 weeks
   - Eliminate high-intensity work temporarily
   - Focus on Zone 1-2 only
   - Prioritize sleep (8-9 hours)

2. **HPA Axis Reset:**
   - Ashwagandha 600mg daily (lowers cortisol)
   - Phosphatidylserine 300-600mg (blunts cortisol response)
   - Magnesium glycinate 400-600mg at bedtime

3. **Support Testosterone Recovery:**
   - Zinc 30-50mg daily
   - Vitamin D optimization (target 60-80 ng/mL)
   - Ensure adequate fat intake (hormone precursor)
   - Consider Tongkat Ali 200-400mg

4. **Retest in 6-8 Weeks:**
   - Expect cortisol normalization first
   - Testosterone recovery follows
   - HRV and resting HR are early recovery indicators`
    },
    {
      title: 'Athletic Micronutrient & Iron Panel',
      lab_type: 'Nutrients',
      test_date: '2025-12-16',
      extracted_data: {
        markers: [
          { name: 'Ferritin', value: 48, unit: 'ng/mL', range: '50-300', status: 'low', flag: 'warning' },
          { name: 'Iron', value: 72, unit: 'µg/dL', range: '60-170', status: 'low-normal' },
          { name: 'Transferrin Saturation', value: 22, unit: '%', range: '20-50%', status: 'borderline' },
          { name: 'Vitamin D (25-OH)', value: 42, unit: 'ng/mL', range: '50-80 athletes', status: 'suboptimal', flag: 'warning' },
          { name: 'Magnesium (RBC)', value: 4.2, unit: 'mg/dL', range: '4.2-6.8', status: 'low', flag: 'warning' },
          { name: 'Zinc', value: 68, unit: 'µg/dL', range: '60-120', status: 'low-normal', flag: 'warning' },
          { name: 'Vitamin B12', value: 445, unit: 'pg/mL', range: '400-1000', status: 'adequate' },
          { name: 'Folate', value: 11, unit: 'ng/mL', range: '>5', status: 'adequate' },
          { name: 'Omega-3 Index', value: 5.1, unit: '%', range: '>8%', status: 'low', flag: 'warning' },
          { name: 'CoQ10', value: 0.65, unit: 'µg/mL', range: '0.8-1.5 athletes', status: 'low', flag: 'warning' }
        ],
        interpretation: 'Multiple micronutrient insufficiencies common in high-volume endurance athletes. Low ferritin will impair oxygen delivery and recovery.'
      },
      ai_summary: `**Athletic Micronutrient & Iron Panel - David Kim**

**Critical Finding for Performance:**
🔴 **Low Ferritin: 48 ng/mL** (target for athletes: 100-150 ng/mL)

**Why Ferritin Matters for Cyclists:**
- Ferritin = iron storage
- Iron → hemoglobin → oxygen carrying capacity
- At 48 ng/mL, you're losing significant performance
- Studies show athletes with ferritin <50 have impaired adaptation to training

**Other Athletic Deficiencies:**

| Nutrient | Level | Target | Impact |
|----------|-------|--------|--------|
| Ferritin | 48 | 100-150 | O2 delivery, recovery |
| Vitamin D | 42 | 60-80 | Muscle function, immune |
| Magnesium (RBC) | 4.2 | 5.0-6.5 | Energy production, cramping |
| Zinc | 68 | 90-120 | Testosterone, immune |
| Omega-3 Index | 5.1% | >8% | Inflammation, heart |
| CoQ10 | 0.65 | 1.0-1.5 | Mitochondrial function |

**Performance Optimization Protocol:**

1. **Iron Repletion (Priority):**
   - Ferrous bisglycinate 25-50mg daily
   - Take with vitamin C, away from coffee/tea/dairy
   - Retest ferritin in 8-12 weeks
   - Target: 100-150 ng/mL

2. **Vitamin D Optimization:**
   - Increase to 5000-6000 IU daily
   - Take with fat-containing meal
   - Retest in 8 weeks, target 60-80 ng/mL

3. **Magnesium Loading:**
   - Magnesium glycinate 400mg AM + 400mg PM
   - Critical for ATP production and muscle function

4. **Anti-inflammatory Support:**
   - Omega-3: 3-4g EPA+DHA daily
   - Will improve omega-3 index and reduce training inflammation

5. **Mitochondrial Function:**
   - CoQ10 200-300mg ubiquinol form
   - Supports energy production during high-intensity efforts

6. **Zinc:**
   - Zinc picolinate 30mg daily
   - Supports testosterone recovery and immune function`
    },
    {
      title: 'Inflammatory & Cardiac Markers',
      lab_type: 'Performance',
      test_date: '2025-12-16',
      extracted_data: {
        markers: [
          { name: 'hs-CRP', value: 1.8, unit: 'mg/L', range: '<0.5 athletes', status: 'elevated', flag: 'warning' },
          { name: 'ESR', value: 8, unit: 'mm/hr', range: '0-15', status: 'normal' },
          { name: 'Creatine Kinase (CK)', value: 890, unit: 'U/L', range: '30-200', status: 'high', flag: 'warning', note: '48h post-training' },
          { name: 'LDH', value: 245, unit: 'U/L', range: '120-246', status: 'high-normal' },
          { name: '8-OHdG', value: 22.8, unit: 'ng/mg creatinine', range: '<15 athletes', status: 'high', flag: 'abnormal', note: 'DNA oxidative damage' },
          { name: 'NT-proBNP', value: 45, unit: 'pg/mL', range: '<125', status: 'normal' },
          { name: 'Troponin I', value: '<0.01', unit: 'ng/mL', range: '<0.04', status: 'normal' },
          { name: 'Lactate (resting)', value: 1.2, unit: 'mmol/L', range: '0.5-2.0', status: 'normal' }
        ],
        interpretation: 'Elevated inflammatory and oxidative stress markers from training. CK elevated indicating ongoing muscle damage without adequate recovery. Cardiac markers reassuring.'
      },
      ai_summary: `**Inflammatory & Cardiac Markers - David Kim**

**Good News First:**
✅ **Cardiac markers normal** - No evidence of training-induced cardiac damage
- NT-proBNP: 45 pg/mL (no myocardial stress)
- Troponin I: <0.01 ng/mL (no cardiac injury)

**The Recovery Problem:**
🔴 **Systemic inflammation elevated for an athlete:**
- hs-CRP: 1.8 mg/L (should be <0.5 in well-recovered athlete)
- CK: 890 U/L (>4x normal - ongoing muscle breakdown)
- 8-OHdG: 22.8 ng/mg (DNA oxidative damage)

**What CK of 890 Tells Us:**
Even 48 hours post-training, muscle damage markers remain very high. In a well-recovered athlete, CK should return to <300 within 48-72 hours. This confirms:
- Inadequate recovery between sessions
- Muscle repair not keeping up with breakdown
- Catabolic state (matches hormone panel findings)

**Oxidative Stress Issue:**
8-OHdG at 22.8 is concerning - this is DNA damage from free radicals. High training volume + inadequate antioxidant status = cellular damage accumulating faster than repair.

**Recovery & Anti-Inflammatory Protocol:**

1. **Immediate Actions:**
   - Reduce training load (see hormone panel recommendations)
   - Increase sleep to 8-9 hours
   - Add rest days between any intensity

2. **Anti-Inflammatory Support:**
   - Tart cherry juice concentrate (equivalent to 60-90 cherries) - proven to reduce CK
   - Omega-3s 3-4g daily
   - Curcumin 1000mg (with piperine) daily

3. **Antioxidant Protection:**
   - Vitamin C 1000mg daily
   - NAC 600mg twice daily (glutathione support)
   - Astaxanthin 8-12mg daily (powerful antioxidant for athletes)

4. **Recovery Modalities:**
   - Cold water immersion post-training
   - Sleep optimization (most important!)
   - Consider infrared sauna 2-3x/week

5. **Monitoring:**
   - Track resting HR and HRV daily
   - Retest CK after 3 weeks of reduced load
   - Target: CK <300 at baseline`
    }
  ]
};

async function seedLabs() {
  console.log('🧪 Seeding demo lab results...\n');

  // Get client IDs by email
  const clientResult = await pool.query(
    'SELECT id, email, first_name, last_name FROM clients WHERE email = ANY($1)',
    [Object.keys(labData)]
  );

  const clientMap = {};
  for (const client of clientResult.rows) {
    clientMap[client.email] = client;
  }

  for (const [email, labs] of Object.entries(labData)) {
    const client = clientMap[email];
    if (!client) {
      console.log(`⚠️  Client not found: ${email}`);
      continue;
    }

    console.log(`\n👤 ${client.first_name} ${client.last_name}:`);

    for (const lab of labs) {
      try {
        // Check if lab already exists
        const existing = await pool.query(
          'SELECT id FROM labs WHERE client_id = $1 AND title = $2',
          [client.id, lab.title]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  "${lab.title}" already exists`);
          continue;
        }

        // Create a placeholder file URL (in production, would be actual PDF)
        const fileUrl = `/uploads/labs/demo-${client.id}-${lab.lab_type.toLowerCase().replace(/\s+/g, '-')}.pdf`;

        const result = await pool.query(
          `INSERT INTO labs (
            client_id, title, lab_type, file_url, file_size,
            test_date, ai_summary, extracted_data, uploaded_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, title`,
          [
            client.id,
            lab.title,
            lab.lab_type,
            fileUrl,
            Math.floor(Math.random() * 500000) + 100000, // Random file size 100KB-600KB
            lab.test_date,
            lab.ai_summary,
            JSON.stringify(lab.extracted_data),
            1 // admin user
          ]
        );

        console.log(`   ✅ Created: "${result.rows[0].title}"`);
      } catch (error) {
        console.error(`   ❌ Error creating "${lab.title}":`, error.message);
      }
    }
  }

  console.log('\n🎉 Done seeding lab results!');
  await pool.end();
}

seedLabs().catch(console.error);
