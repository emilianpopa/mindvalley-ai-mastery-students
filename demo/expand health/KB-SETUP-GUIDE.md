# ExpandHealth Knowledge Base Setup Guide

This guide explains how to set up and manage the ExpandHealth proprietary knowledge base for AI-powered treatment plan generation.

## Overview

The knowledge base system stores your proprietary clinical protocols, treatment guidelines, and brand information. When generating treatment plans, the system uses this content to provide evidence-based recommendations specific to ExpandHealth's methodologies.

**What's included:**
- Clinical protocols (metabolic syndrome, chronic fatigue, cardiovascular health)
- Brand voice guidelines
- FAQ content
- Location and service information
- Policies and procedures

## Architecture

The KB uses a simple but effective approach:
1. **Storage**: All documents are stored locally in `kb-config.json`
2. **Retrieval**: When generating a treatment plan, all relevant documents are provided as context to Gemini AI
3. **Integration**: The server automatically uses the KB when available, falling back to Claude API if needed

## Quick Start

### 1. Verify KB is Set Up

```bash
node kb-manager.js info
```

You should see:
```
📊 Knowledge Base Info:
Documents: 8
Total size: 71.4 KB

Documents:
  - expand brand-voice.md (2.4 KB)
  - expand faq.md (4.3 KB)
  - expand locations.md (1.5 KB)
  - expand menu.md (4.5 KB)
  - expand policies.md (4.1 KB)
  - protocol-cardiovascular-health.md (19.9 KB)
  - protocol-chronic-fatigue.md (18.2 KB)
  - protocol-metabolic-syndrome.md (16.5 KB)
```

### 2. Test the KB

```bash
node kb-manager.js query "What supplements are recommended for metabolic syndrome?"
```

This will query the knowledge base and return an AI-generated answer based on your protocols.

### 3. Start the Server

```bash
node server-simple.js
```

The server now automatically uses the KB for treatment plan generation!

---

## Managing Your Knowledge Base

### Add a New Document

To add a new protocol or document:

```bash
node kb-manager.js add <path-to-file.md>
```

**Example:**
```bash
node kb-manager.js add kb-content/protocol-hormone-optimization.md
```

### Add Multiple Documents

To add all markdown files from a directory:

```bash
node kb-manager.js add-dir <directory-path>
```

**Example:**
```bash
node kb-manager.js add-dir kb-content
```

### List All Documents

```bash
node kb-manager.js list
```

### Delete a Document

```bash
node kb-manager.js delete <filename>
```

**Example:**
```bash
node kb-manager.js delete protocol-old-version.md
```

---

## What Types of Content to Add

### Clinical Protocols

These are your most valuable KB assets. Include:

- **Condition-specific protocols** (e.g., metabolic syndrome, chronic fatigue, cardiovascular health)
- **Supplement recommendations** with dosages, timing, and evidence
- **Modality protocols** (HBOT, IV therapy, red light, sauna, etc.)
- **Expected outcomes** and timeline
- **Lab testing recommendations**
- **Safety considerations** and contraindications

**Format example:**
```markdown
# [Condition Name] Protocol

## Overview
[Brief description of condition and goals]

## Diagnostic Workup
[What labs/tests to order]

## Phase 1: Foundation (Weeks 0-4)
### Supplements
- **Supplement Name**: Dosage - Purpose
- **Another Supplement**: Dosage - Purpose

### Modalities
- **HBOT**: Protocol details
- **IV Therapy**: Specific formulation

### Expected Outcomes
[What to expect by week 4]

## Phase 2: Advanced Therapies (Weeks 4-12)
[Continued protocol...]
```

### Brand Voice & Guidelines

Include documents that define:
- Tone of voice
- How you speak to patients
- Words/phrases to use and avoid
- Your unique approach/philosophy

### Operational Information

- **FAQ**: Common patient questions and answers
- **Locations**: Clinic addresses, hours, parking
- **Menu**: Services, packages, pricing structure
- **Policies**: Cancellation, payment, safety policies

---

## Best Practices

### 1. Keep Documents Updated

When you modify a protocol in your files:
```bash
node kb-manager.js add kb-content/protocol-metabolic-syndrome.md
```

The tool will automatically update the existing document in the KB.

### 2. Use Clear Filenames

- `protocol-[condition-name].md` for clinical protocols
- `faq-[topic].md` for FAQ content
- `brand-voice.md` for voice/tone guidelines
- `menu-[location].md` for service menus

### 3. Structure Content Consistently

Use clear markdown headers:
- `#` for main sections
- `##` for subsections
- `###` for details
- `**Bold**` for emphasis
- `-` for lists

### 4. Include Evidence

When citing research or evidence:
```markdown
**Supplement Name**: Dosage
- Evidence: Study showing X% improvement (Journal Year)
- Mechanism: How it works
```

### 5. Be Specific

The AI generates better recommendations when you're specific:
- ✅ "Berberine 500mg twice daily with meals"
- ❌ "Berberine supplement"

- ✅ "HBOT 20 sessions over 6-10 weeks at 1.5-2.0 ATA"
- ❌ "Some HBOT sessions"

---

## How the KB is Used in Treatment Plans

When a patient case is submitted:

1. **Context Building**: All KB documents are loaded and provided as context
2. **AI Generation**: Gemini AI generates a treatment plan based on:
   - Patient symptoms, labs, and conversation
   - Your clinical protocols
   - Your brand voice
   - Your available modalities and services
3. **Source Citation**: The response includes which documents were referenced
4. **Fallback**: If KB is unavailable, the system falls back to Claude API

### Example Treatment Plan Output

```markdown
# Patient's ExpandHealth Protocol

## Top 3 Findings
1. Metabolic syndrome (meets 4/5 criteria)
2. Chronic inflammation (hsCRP 3.2 mg/L)
3. Mitochondrial dysfunction indicators

## Top 3 Recommendations
1. Mediterranean-style nutrition with time-restricted eating
2. Berberine 500mg twice daily for insulin sensitivity
3. HBOT protocol (20 sessions) for metabolic optimization

## Core Protocol Breakdown

### MONTH 1: Foundation - Weeks 1-4
**Supplements**
- Berberine: 500mg twice daily with meals
- Omega-3: 2000-3000mg daily (EPA/DHA)
- Vitamin D3: 5000 IU daily
- Magnesium Glycinate: 400-600mg before bed
... [continues with detailed protocol based on KB]

📚 Sources: protocol-metabolic-syndrome.md, expand menu.md, expand brand-voice.md
```

---

## Troubleshooting

### "No documents in KB" error

**Solution**: Add documents first
```bash
node kb-manager.js add-dir kb-content
```

### "API quota exceeded" error

**Cause**: Free-tier Gemini API has daily limits

**Solutions**:
1. Wait for quota to reset (usually 24 hours)
2. Server will automatically fall back to Claude API
3. Consider upgrading to paid Gemini API for production use

### KB not being used by server

**Check**:
1. Run `node kb-manager.js info` - should show documents
2. Check `kb-config.json` exists
3. Restart the server after adding documents

### Treatment plans don't match protocols

**Solutions**:
1. Review your protocol documents - be more specific
2. Add more detail about dosages, frequencies, timing
3. Include "MUST" or "REQUIRED" for non-negotiable recommendations

---

## Adding New Protocol Types

To add a new protocol category:

1. **Create the markdown file** in `kb-content/`:
```bash
# protocol-[new-condition].md
```

2. **Follow the standard structure**:
   - Overview & Goals
   - Diagnostic Workup
   - Phase 1: Foundation
   - Phase 2: Advanced Therapies
   - Expected Outcomes
   - Evidence Base

3. **Add to KB**:
```bash
node kb-manager.js add kb-content/protocol-[new-condition].md
```

4. **Test it**:
```bash
node kb-manager.js query "What's the protocol for [new condition]?"
```

---

## Example: Adding a New Hormone Optimization Protocol

### Step 1: Create the file

Create `kb-content/protocol-hormone-optimization.md`:

```markdown
# Hormone Optimization Protocol

**Version:** 1.0
**Expand Health Cape Town**
**Updated:** [Date]

## Overview

[Description of hormone optimization approach]

## Diagnostic Workup

### Essential Labs
- Testosterone (total and free)
- Estradiol
- Progesterone
- DHEA-S
- Thyroid panel (TSH, Free T3, Free T4)
- IGF-1

## Phase 1: Foundation (Weeks 0-4)

### Lifestyle Optimization
- Sleep: 7-9 hours nightly
- Stress management
- Resistance training 3x per week

### Supplements
- Vitamin D3: 5000 IU daily
- Zinc: 25-50mg daily
- Magnesium: 400-600mg before bed

## Phase 2: Advanced Therapies (Weeks 4-12)

### Bioidentical Hormone Replacement (if indicated)
[Details about BHRT protocols]

### ExpandHealth Modalities
- **NAD+ IV**: Weekly for 4-6 weeks
- **Red Light Therapy**: Daily 15-20 minutes
- **Sauna**: 3-5x per week

## Expected Outcomes
[Timeline and targets]
```

### Step 2: Add to KB

```bash
node kb-manager.js add kb-content/protocol-hormone-optimization.md
```

### Step 3: Verify

```bash
node kb-manager.js info
```

Should show 9 documents now.

### Step 4: Test

```bash
node kb-manager.js query "What's the hormone optimization protocol?"
```

---

## Security & Privacy

### API Keys

- Gemini API key is stored in `kb-manager.js` (line 11)
- **For production**: Move to environment variable:
  ```javascript
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  ```

### Patient Data

- **KB does NOT store patient data**
- Only proprietary protocols and guidelines
- Patient info is only used temporarily during treatment plan generation
- No patient data is saved to `kb-config.json`

### Document Content

- KB documents are stored in plain text locally
- Not uploaded to external services
- Only sent to Gemini AI during query/generation (ephemeral)

---

## Maintenance Schedule

### Weekly
- Review generated treatment plans for quality
- Note any missing information or gaps

### Monthly
- Update protocols based on new evidence
- Add new condition protocols as needed
- Review brand voice for consistency

### Quarterly
- Comprehensive protocol review
- Update supplement recommendations
- Add new modalities or services

---

## Advanced: Custom Queries

You can query the KB directly for specific information:

```bash
# Get supplement recommendations
node kb-manager.js query "What supplements are recommended for chronic fatigue?"

# Get modality protocols
node kb-manager.js query "What's the HBOT protocol for metabolic syndrome?"

# Check brand voice
node kb-manager.js query "How should we speak to patients about pricing?"

# Service information
node kb-manager.js query "What packages do we offer?"
```

This is useful for:
- Training new staff
- Answering patient questions
- Verifying protocol details
- Checking consistency

---

## Future Enhancements

Possible additions:
1. **Search by category** (protocols vs. brand vs. operational)
2. **Version control** for protocol changes
3. **Multi-language support** for international clinics
4. **Integration with CRM** for patient-specific recommendations
5. **Analytics** on which protocols are most commonly referenced

---

## Support

For questions or issues:
1. Check this guide first
2. Review the protocol files in `kb-content/` for format examples
3. Run `node kb-manager.js` (no args) to see all commands
4. Test queries to verify KB content is correct

---

**Last Updated**: December 2025
**Version**: 1.0
**Maintained by**: ExpandHealth Technical Team
