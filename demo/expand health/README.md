# ExpandHealth AI Copilot - Implementation Guide

**Version:** 1.0 (Foundation Phase)
**Status:** Ready for Setup
**Timeline:** 2 weeks to working prototype

---

## 🎯 What You're Building

An AI-powered clinical copilot that:
- Analyzes patient conversations + lab results
- Generates personalized treatment plans in your clinical voice
- Recommends ExpandHealth therapies (HBOT, IV, peptides, etc.)
- Saves doctors 30-45 minutes per patient
- Maintains human-in-the-loop (doctor reviews everything)

**Cost:** ~$170/month to run (scales to hundreds of patients)

**Tech Stack:** All from MindValley AI Mastery course
- N8N (workflow orchestration)
- Claude API (AI reasoning)
- Gemini File Search (protocol knowledge base)
- Whisper API (audio transcription)
- Vercel (web dashboard - Phase 2)

---

## 📁 What's in This Folder

```
demo/expand health/
├── README.md (you are here)
├── sample-patient-case.md (realistic test case: John Smith)
├── kb-content/ (knowledge base documents)
│   ├── expand brand-voice.md
│   ├── expand menu.md
│   ├── expand locations.md
│   ├── expand faq.md
│   ├── expand policies.md
│   ├── protocol-metabolic-syndrome.md
│   ├── protocol-chronic-fatigue.md
│   └── protocol-cardiovascular-health.md
```

**Also Created:**
- [prompts/agents/sugar-agent-expandhealth.md](../../prompts/agents/sugar-agent-expandhealth.md) — The SUGAR agent prompt

---

## ✅ Prerequisites Checklist

Before we start building, you need API access to these services:

### Required Accounts & API Keys

- [ ] **N8N Cloud** — [https://n8n.io](https://n8n.io)
  - Sign up for Starter plan ($20/month)
  - Get your N8N instance URL

- [ ] **Claude API** — [https://console.anthropic.com](https://console.anthropic.com)
  - Create account
  - Add payment method
  - Generate API key
  - Cost: ~$1-2 per patient analysis

- [ ] **Google Gemini API** — [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  - Sign in with Google account
  - Create API key
  - Free tier: 1M tokens/month (plenty for knowledge base)

- [ ] **OpenAI API (for Whisper)** — [https://platform.openai.com](https://platform.openai.com)
  - Create account
  - Add payment method
  - Generate API key
  - Cost: ~$0.006/minute of audio (~$0.10 per 15-min conversation)

### Tools You Already Have
- ✅ VS Code with Claude Code extension (you're using it now!)
- ✅ This repository cloned locally

---

## 🚀 Implementation Roadmap (2 Weeks)

### Week 1: Knowledge Base + Core Agents

**Day 1-2: Setup Gemini Knowledge Base**
- Upload all protocol documents to Gemini File Search
- Test retrieval with sample queries
- Verify it finds the right protocols

**Day 3-4: Build Agent 1 (Audio → Patient Context)**
- N8N workflow: Audio file → Whisper API → Claude extraction
- Output: Structured JSON with patient insights
- Test with sample conversation

**Day 5-7: Build Agent 2-3 (Lab Analysis + Clinical Reasoning)**
- Agent 2: Parse lab PDFs → Extract values
- Agent 3: Correlate symptoms + labs → Clinical insights
- Test with sample patient case

### Week 2: Protocol Matching + Integration

**Day 8-10: Build Agent 4 (Protocol Matching with RAG)**
- N8N workflow: Query Gemini KB → Retrieve protocols
- Claude synthesizes → Generate treatment plan
- Test end-to-end with John Smith case

**Day 11-12: Simple Upload Interface (Optional)**
- Basic HTML form for uploading audio + labs
- OR use N8N webhook + Postman for testing

**Day 13-14: Testing & Refinement**
- Run through multiple patient scenarios
- Refine SUGAR agent prompt
- Validate clinical accuracy
- Measure time savings

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Set Up Gemini Knowledge Base

I'll help you upload the protocol documents to Gemini File Search so the AI can retrieve them.

**What you need:**
- Gemini API key
- Protocol files (already created in `kb-content/`)

**What I'll build for you:**
- Script to upload all protocols to Gemini
- Test script to verify retrieval works

**Your action:**
- Share your Gemini API key when ready (or we can test with mine first)

---

### Step 2: Build N8N Workflow for Agent 1 (Audio Transcription)

**Workflow:** Audio File → Whisper → Claude → Patient Context JSON

**N8N Nodes:**
1. **Webhook Trigger** (receives audio file URL or file upload)
2. **HTTP Request to Whisper API** (transcription)
3. **HTTP Request to Claude API** (extract clinical insights)
4. **Set Node** (format output JSON)
5. **Respond to Webhook** (return results)

**What I'll build for you:**
- Complete N8N workflow JSON (you import into your N8N instance)
- Step-by-step guide for setting it up
- Test case to verify it works

**Your action:**
- Import workflow into N8N
- Add your API keys to N8N credentials
- Test with sample audio file

---

### Step 3: Build N8N Workflow for Agent 2 (Lab Analysis)

**Workflow:** Blood Test PDF → Gemini Vision → Structured Lab Data

**N8N Nodes:**
1. **Webhook Trigger** (receives PDF file)
2. **HTTP Request to Gemini Vision API** (OCR + extraction)
3. **Code Node** (parse and normalize values)
4. **Set Node** (format lab results JSON)
5. **Respond to Webhook** (return structured data)

**What I'll build for you:**
- Complete N8N workflow JSON
- Sample blood test PDF for testing
- Guide for setting up Gemini Vision API

**Your action:**
- Import workflow
- Add API keys
- Test with sample blood test

---

### Step 4: Build N8N Workflow for Agent 3-4 (Clinical Reasoning + Protocol Matching)

**Workflow:** Patient Context + Labs → Claude + Gemini KB → Treatment Plan

**N8N Nodes:**
1. **Webhook Trigger** (receives patient context JSON + lab JSON)
2. **HTTP Request to Gemini File Search** (RAG query for protocols)
3. **HTTP Request to Claude API** (with SUGAR agent prompt + retrieved protocols)
4. **Set Node** (format final treatment plan)
5. **Respond to Webhook** (return markdown treatment plan)

**What I'll build for you:**
- Complete N8N workflow JSON
- Integration of SUGAR agent prompt
- Test with John Smith case

**Your action:**
- Import workflow
- Run end-to-end test
- Review generated treatment plan for clinical accuracy

---

### Step 5: Connect Everything (Master Orchestration Workflow)

**Workflow:** Upload Audio + PDF → All Agents → Final Treatment Plan

**N8N Nodes:**
1. **Webhook Trigger** (single upload endpoint)
2. **Call Agent 1** (audio → patient context)
3. **Call Agent 2** (PDF → lab results)
4. **Call Agent 3-4** (generate treatment plan)
5. **Respond with complete analysis**

**What I'll build for you:**
- Master orchestration workflow
- Simple web form for uploading files (HTML + JavaScript)
- Testing guide

**Your action:**
- Import workflow
- Test with John Smith case
- Time yourself vs manual analysis

---

## 🧪 Testing with Sample Patient Case

Once workflows are built, we'll test with **John Smith** (sample-patient-case.md):

**Test Inputs:**
1. Audio transcript of doctor-patient conversation (I'll create sample audio OR we can use text transcript)
2. Sample blood test PDF (I'll create mock lab report)

**Expected Output:**
- Complete treatment plan for John Smith
- Should include:
  - Metabolic syndrome diagnosis
  - Prediabetes management
  - Chronic fatigue protocol
  - HBOT + NAD+ IV recommendations
  - Personalized with his quotes
  - ExpandHealth clinic integration

**Success Criteria:**
- ✅ Plan is clinically accurate
- ✅ Includes relevant protocols from knowledge base
- ✅ Feels personalized (uses quotes, addresses his specific concerns)
- ✅ Recommends appropriate ExpandHealth therapies
- ✅ Total generation time: <5 minutes
- ✅ Doctor review time: <15 minutes (vs 45-60 min manual)

---

## 💰 Cost Breakdown (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| N8N Cloud Starter | $20/month | Workflow orchestration |
| Claude API (Sonnet 4.5) | ~$50-150/month | ~$1-2 per patient |
| Gemini File Search | $0 | Free tier (1M tokens/month) |
| Whisper API | ~$10/month | ~$0.10 per 15-min conversation |
| Vercel Hosting (later) | $0-20/month | Free tier or Pro |
| **Total** | **~$80-200/month** | Scales to hundreds of patients |

**Cost per patient:** $1-2
**Revenue per patient:** $500-2000 (typical ExpandHealth protocol)
**Margin:** 99%+

---

## 📈 What Success Looks Like (2 Weeks from Now)

### You'll Have:
- ✅ Working knowledge base with ExpandHealth protocols
- ✅ 4 AI agents running in N8N
- ✅ End-to-end workflow: Audio + Labs → Treatment Plan
- ✅ Tested with realistic patient cases
- ✅ Validated time savings (30-45 min per patient)

### You Can:
- Upload a patient conversation recording
- Upload blood test PDF
- Get a comprehensive treatment plan in 5 minutes
- Review and edit the plan in 10-15 minutes
- Deliver personalized care at scale

### Next Steps (Weeks 3-4):
- Build simple web dashboard for doctors
- Add more protocols to knowledge base
- Test with 5-10 real patient cases (anonymized)
- Refine based on feedback
- Prepare for pilot launch

---

## 🤝 How We'll Work Together

**My Role (Claude Code):**
- Build all N8N workflows
- Create knowledge base upload scripts
- Generate test data and cases
- Debug technical issues
- Provide implementation guidance

**Your Role:**
- Provide API keys when ready
- Test workflows as I build them
- Validate clinical accuracy of outputs
- Give feedback on generated plans
- Suggest protocol improvements

**Communication Flow:**
1. I build a component (e.g., Agent 1 workflow)
2. I give you the workflow JSON to import
3. You test it and report back
4. I refine based on your feedback
5. We move to the next component

---

## 🚦 Ready to Start?

### Immediate Next Steps:

1. **Gather Your API Keys:**
   - N8N Cloud instance URL
   - Claude API key
   - Gemini API key
   - OpenAI API key

2. **Share With Me:**
   - Let me know when you have the keys ready
   - Tell me if you want to start with a specific agent first
   - Any questions or concerns before we begin?

3. **I'll Build:**
   - Gemini knowledge base setup script (first)
   - Agent 1 N8N workflow (second)
   - We'll test each one before moving forward

---

## 📞 Questions?

**Common Questions:**

**Q: Do I need to know how to code?**
A: No! I'll build everything for you. You'll just import workflows into N8N and test them.

**Q: What if I don't have all the API keys yet?**
A: That's fine! I can build the workflows first, and you can add keys later. Or I can help you set up accounts step-by-step.

**Q: Can we test this without real patient data?**
A: Yes! I've created sample patient cases (like John Smith) for testing. We'll only use real data when you're ready.

**Q: What if the AI gets something clinically wrong?**
A: That's why human-in-the-loop is mandatory. You review and approve everything before patients see it. The AI is a draft generator, not a decision-maker.

**Q: How long until this is production-ready?**
A: 2 weeks for working prototype. 4-6 weeks for pilot with real patients. 8-12 weeks for full clinic deployment.

---

## 🎉 Let's Build This!

This is the future of longevity medicine—AI-augmented care that scales your expertise without compromising quality.

**Reply with:**
- ✅ "I have my API keys ready" — and share them (or tell me which ones you need help with)
- ❓ "I have questions about..." — and I'll answer
- 🚀 "Let's start with..." — if you want to begin with a specific component

I'm ready to build this for you step-by-step!

---

**Next File to Read:** [sample-patient-case.md](sample-patient-case.md) — Meet John Smith, your first test patient.
