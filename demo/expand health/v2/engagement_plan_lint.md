# Engagement Plan Lint Checklist

Use this checklist to validate any engagement plan against its source protocol before finalizing.

---

## Timeline & Structure Checks

- [ ] **Timeline matches protocol duration** - Engagement plan weeks match protocol total duration (not compressed)
- [ ] **Phase start weeks match protocol** - Each phase begins at the week specified in the protocol
- [ ] **Core/Foundation phase has minimum 2 weeks** - Never compress foundation to 1 week
- [ ] **All protocol phases are represented** - No phases skipped or merged

---

## Supplement Checks

- [ ] **All protocol supplements included** - Every supplement from every phase appears in the engagement plan
- [ ] **Supplements appear in correct phases** - Phase 2 supplements don't appear in Week 1
- [ ] **Supplements use "Take" or "Continue" verbs** - Not "Schedule" or "Complete"
- [ ] **No invented supplements** - Only protocol-specified supplements appear
- [ ] **Dosages reference "per protocol"** - Not restated or modified

---

## Modality Checks

- [ ] **All protocol modalities included** - Sleep, elimination, sauna, fasting, etc.
- [ ] **Modalities appear in correct phases** - Sauna not in Core Protocol if protocol says Phase 2
- [ ] **Modalities use action verbs** - "Complete", "Follow", "Do" - not "Take"

---

## Clinic Treatment Checks

- [ ] **Clinic treatments are CONDITIONAL** - Never "Schedule X at clinic" as default action
- [ ] **Eligibility criteria specified** - "Eligible IF Phase 2 stable AND no contraindications"
- [ ] **Contraindications listed as STOP rules** - Not embedded in action items
- [ ] **Decision process documented** - Clinician reviews → IF eligible → Schedule
- [ ] **Earliest eligibility week matches protocol** - Usually not before Phase 2

---

## Safety Gate Checks

- [ ] **Safety gates are IF/THEN statements** - Not just bullet lists of requirements
- [ ] **Each phase transition has a gate** - Core→Phase 1, Phase 1→Phase 2, etc.
- [ ] **FAIL conditions documented** - What happens if gate not passed (HOLD, extend, contact clinician)
- [ ] **Gates reference measurable criteria** - "Regular bowel movements", "No adverse reactions"

---

## Testing & Labs Checks

- [ ] **All protocol tests included** - Heavy metals, hormones, CMP, cardiovascular markers, etc.
- [ ] **Tests mapped to specific weeks** - Not generic "schedule labs if applicable"
- [ ] **Tests use action sequence** - Schedule → Complete → Review → Adjust
- [ ] **Tests are NOT "Take" actions** - Never "Take Heavy Metals Panel"
- [ ] **Follow-up retests scheduled** - Usually Week 12-16 for comparison

---

## Safety & Escalation Checks

- [ ] **Absolute contraindications are STOP rules** - Not embedded in actions
- [ ] **Warning signs are CONTACT CLINICIAN rules** - With timeframe (within 24 hours)
- [ ] **Monitoring requirements documented** - Daily tracking items specified
- [ ] **Escalation path clear** - WhatsApp for routine, call clinic for urgent

---

## Classification Checks (CRITICAL)

- [ ] **No labs in ACTIONS** - Labs are TESTS, not actions
- [ ] **No contraindications as "Take"** - Contraindications are STOP rules
- [ ] **No safety gates as checklists** - Gates are IF/THEN logic
- [ ] **No clinic treatments as defaults** - Treatments are DECISIONS
- [ ] **No warning signs as actions** - Warning signs are ESCALATION triggers
- [ ] **No consultations as "Take"** - Consultations are DECISIONS

---

## Alignment Self-Check (Must All Be YES)

| Check | Status |
|-------|--------|
| All protocol supplements included | YES / NO |
| All protocol modalities included | YES / NO |
| All clinic treatments conditional | YES / NO |
| Retest schedule mapped correctly | YES / NO |
| Safety gates as IF/THEN rules | YES / NO |
| Contraindications as STOP rules | YES / NO |
| Warning signs as CONTACT rules | YES / NO |
| Timeline matches protocol | YES / NO |
| Phase weeks match protocol | YES / NO |
| No "Take" for non-supplements | YES / NO |

**If ANY check is NO, fix before finalizing the engagement plan.**

---

## Common Failure Patterns to Avoid

### 1. Timeline Compression
❌ BAD: "This 4-week plan..." when protocol is 12 weeks
✅ GOOD: "This 12-week plan..." matching protocol duration

### 2. Clinic Treatments as Defaults
❌ BAD: "Schedule IV Glutathione at clinic"
✅ GOOD: "Clinic Treatment Eligibility: IV Glutathione available IF Phase 2 stable AND no G6PD deficiency"

### 3. Labs as Take Actions
❌ BAD: "Take Heavy Metals Panel (provoked)"
✅ GOOD: "TEST: Heavy Metals Panel (provoked) - Week 8-10 - Schedule → Complete → Review"

### 4. Safety Gates as Bullet Lists
❌ BAD: "✓ Regular elimination ✓ No reactions ✓ Energy stable"
✅ GOOD: "IF all TRUE: regular elimination, no reactions, energy stable → THEN proceed to Phase 2"

### 5. Missing Modalities
❌ BAD: Only supplements listed, no sleep/elimination/sauna protocols
✅ GOOD: All protocol modalities included with correct phase placement

### 6. Contraindications in Actions
❌ BAD: "Schedule HBOT (untreated pneumothorax, severe COPD)"
✅ GOOD: "STOP RULE: Do NOT proceed with HBOT if untreated pneumothorax or severe COPD"

### 7. Phase Misalignment
❌ BAD: "Week 2: Take ALA" when protocol says ALA is Phase 2 (Week 5+)
✅ GOOD: "Week 5: ADD ALA (Alpha Lipoic Acid)" matching protocol phase

---

## Validation Command (For AI Systems)

Before finalizing any engagement plan, run this self-check:

```
VALIDATE ENGAGEMENT PLAN:
1. Count protocol supplements: [X] → Count engagement plan supplements: [Y] → Match?
2. Count protocol modalities: [X] → Count engagement plan modalities: [Y] → Match?
3. Count protocol clinic treatments: [X] → All conditional in plan?
4. Protocol duration: [X weeks] → Engagement plan duration: [Y weeks] → Match?
5. Protocol Phase 1 start: [Week X] → Engagement plan Phase 1 start: [Week Y] → Match?
6. Any "Take [lab test]" in plan? → Should be NO
7. Any "Schedule [treatment] at clinic" as default action? → Should be NO
8. Safety gates as IF/THEN? → Should be YES
9. All contraindications as STOP rules? → Should be YES

IF ALL PASS → Plan is valid
IF ANY FAIL → Fix before finalizing
```

---

*Last updated: January 2026*
*For use with ExpandHealth AI Protocol-to-Engagement-Plan system*
