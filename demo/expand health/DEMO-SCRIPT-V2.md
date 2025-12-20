# ExpandHealth V2 Demo Script
## 10-12 Minute Screen Recording Demo

**Duration:** 10-12 minutes
**URL:** https://app.expandhealth.ai
**Login:** admin@expandhealth.io / admin123

---

## RECORDING RECOMMENDATIONS

### Option 1: AI Voice (Recommended for Polish)
- **ElevenLabs** - Record script sections, then sync with screen recording
- **Workflow:**
  1. Screen record without audio (use Loom, OBS, or Camtasia)
  2. Generate voiceover in ElevenLabs using this script
  3. Sync audio to video in editing software (CapCut, DaVinci Resolve, or Premiere)
- **Voice Settings:** Professional, warm, confident tone
- **Tip:** Break script into paragraph chunks for easier ElevenLabs generation

### Option 2: Loom with Teleprompter
- Use a teleprompter app (PromptSmart, BigVu) with this script
- Record directly in Loom for quick turnaround

### Option 3: Pre-recorded Sections
- Record each section separately
- Edit together with transitions
- Add lower-thirds and callouts in post

---

## DEMO STRUCTURE

| Section | Time | Focus |
|---------|------|-------|
| 1. Opening & What's New | 0:00 - 1:00 | V2 highlights |
| 2. Multi-Tenancy & Admin | 1:00 - 2:30 | Platform architecture |
| 3. Client Management | 2:30 - 4:00 | Enhanced client view |
| 4. AI-Powered Forms | 4:00 - 5:30 | PDF parsing, dynamic forms |
| 5. Labs & AI Summaries | 5:30 - 7:00 | Gemini integration |
| 6. Protocol Builder | 7:00 - 9:00 | AI-assisted protocols |
| 7. AI Assistant Deep Dive | 9:00 - 10:30 | Context-aware chat |
| 8. Close & Next Steps | 10:30 - 11:00 | Vision |

---

## SCRIPT

### SECTION 1: OPENING & WHAT'S NEW
**[0:00 - 1:00]**

*[Show login screen, then dashboard after login]*

Hey everyone. I want to walk you through ExpandHealth Version 2 - a significant upgrade to our AI-powered clinical platform for functional medicine practitioners.

If you saw our original MVP, you'll notice this is a completely different experience. We've rebuilt the system from the ground up based on practitioner feedback, and added three major capabilities:

First - **deep AI integration**. Every page now has intelligent AI assistance. Not just a chatbot, but context-aware AI that understands your patients, their lab results, and your clinical notes.

Second - **multi-tenancy architecture**. The platform now supports multiple independent clinics on a single deployment, with role-based access control and complete data isolation.

And third - **streamlined workflows**. We've removed friction from every interaction - from form building to protocol generation.

Let me show you how it all works.

---

### SECTION 2: MULTI-TENANCY & ADMIN
**[1:00 - 2:30]**

*[Navigate to Admin section]*

Let's start with the admin module - this is completely new in V2.

*[Click Admin in sidebar]*

The platform now operates as a multi-tenant system. What that means is a single ExpandHealth deployment can serve multiple clinics, each with completely isolated data.

*[Show Tenants tab]*

Here you can see our tenant management. Each clinic has its own:
- Users and staff accounts
- Client database
- Forms and protocols
- Knowledge base documents
- Audit history

*[Show Roles tab]*

We've implemented granular role-based access control. You can create custom roles with specific permissions - controlling exactly what each staff member can view and edit.

*[Show Audit Log tab]*

Every administrative action is logged. This is critical for compliance - you have a complete audit trail of who did what, and when.

*[Show Users tab]*

User management is straightforward. Add new staff, assign roles, and they automatically inherit the correct permissions for your clinic.

This architecture means ExpandHealth can scale from a solo practitioner to a multi-location practice group - all on the same platform.

---

### SECTION 3: CLIENT MANAGEMENT
**[2:30 - 4:00]**

*[Navigate to Clients page]*

Let's look at how we manage clients.

*[Show client list with search and filtering]*

The client list now includes proper search, filtering, and pagination. You can quickly find any patient and see their status at a glance.

*[Click into a client profile - Client Dashboard]*

Here's where things get interesting. The client dashboard gives you a comprehensive view of each patient.

*[Point out the tabs: Dashboard, Forms, Labs, Protocols]*

We've organized everything into logical tabs. Dashboard for the overview, Forms for their intake responses, Labs for test results, and Protocols for their treatment plans.

*[Show the AI Personality Insights section]*

Notice this Personality Insights panel. The AI analyzes how your client communicates, their decision-making style, and what motivates them. This helps you tailor your recommendations and communication style for better compliance.

*[Show Quick Notes on the right]*

And you'll see Quick Notes here. At any point during a consultation, you can jot down observations. These notes become part of the AI's context - so when you ask questions or generate protocols later, the AI knows what you've noted.

*[Click Ask AI button in sidebar]*

The Ask AI button is available on every page. Let me show you how it works in context.

---

### SECTION 4: AI-POWERED FORMS
**[4:00 - 5:30]**

*[Navigate to Forms page]*

Forms remain one of our most valuable features, and we've made them significantly smarter.

*[Show form list]*

You can create multiple form types - intake forms, symptom questionnaires, follow-up assessments. Each can be shared via URL for patients to complete before appointments.

*[Click to Form Builder]*

Here's the form builder. You can add different field types, set validation rules, and organize sections.

*[Show or mention PDF parsing feature]*

But here's the game-changer: you can upload an existing PDF form, and our AI will automatically extract the structure. If you have paper forms you've been using for years, upload the PDF and the system converts it into a digital, interactive form. No manual recreation needed.

*[Show a completed form response]*

When patients submit forms, you get organized responses with all their answers. From the client dashboard, you can review these responses alongside their other data.

*[Show public form URL concept]*

Each form has a shareable URL. Send it in your intake email, embed it on your website, or use it in marketing campaigns. When someone fills it out, their responses are captured and ready for you to review.

---

### SECTION 5: LABS & AI SUMMARIES
**[5:30 - 7:00]**

*[Navigate to Labs page]*

Let's talk about labs and tests.

*[Show labs list]*

You can upload lab results as PDFs directly into the system. Blood panels, hormone tests, stool analyses - any PDF document.

*[Open a lab result in the viewer]*

Here's the lab viewer. On the left, you have the actual PDF rendered in high quality. You can zoom, scroll, review the raw data.

*[Point to AI Summary section]*

On the right, the AI has automatically generated a summary. This is powered by Gemini - it reads the PDF and extracts the key findings, flags abnormal values, and provides clinical context.

*[Show notes panel]*

You can add your own notes alongside the lab. These notes are saved to the client's record and become part of the AI's context for future conversations.

This means when you ask the AI a question about this patient, it already knows their lab results, your notes, and can provide informed responses.

The health professionals we've talked to love reviewing the actual PDF - they don't want us to reformat the data. But having an AI summary alongside it saves significant prep time before consultations.

---

### SECTION 6: PROTOCOL BUILDER
**[7:00 - 9:00]**

*[Navigate to Protocol Templates]*

Now for the protocol system - this is where we've invested the most development time.

*[Show protocol templates list]*

First, you have protocol templates. These are reusable frameworks you create once and apply to multiple patients. Gut healing protocols, hormone balancing, detox programs - whatever you use repeatedly.

*[Open a template or the protocol builder]*

The protocol builder uses a modular approach. Each section of the protocol is a module - supplements, lifestyle changes, dietary guidelines, testing recommendations.

*[Show the modular interface]*

You can drag and drop modules, edit their content, add new sections. The AI assists at every step.

*[Demonstrate adding a module or editing]*

When you add a new module, you can give the AI a prompt like "add a sleep optimization section for someone with high cortisol" and it generates the content based on your clinical context.

If you need to modify something, select it and use the prompt bar. "Remove ashwagandha and suggest an alternative for someone sensitive to nightshades" - the AI makes the change intelligently.

*[Show how protocols connect to templates]*

When building a protocol for a specific client, you start by selecting relevant templates. Remember, most protocols are 75% the same and 25% personalized. The AI takes your templates, combines them with the patient's data and your consultation notes, and generates a draft tailored to that individual.

*[Mention engagement plan concept]*

We're also building out engagement plans - phased approaches that consider the patient's personality type and lifestyle. How you introduce changes to a busy executive is different from someone with more flexibility. The AI helps structure the rollout for better adherence.

---

### SECTION 7: AI ASSISTANT DEEP DIVE
**[9:00 - 10:30]**

*[Click Ask AI from any page with a client context]*

Let me show you the depth of our AI integration.

*[Open the chat widget]*

The AI assistant isn't just a generic chatbot. When you're viewing a client, it has full context:

- Their medical history and current medications
- All consultation notes you've written
- Lab results with summaries
- Active protocols
- And your clinic's knowledge base

*[Type a contextual question]*

So I can ask: "What supplements is this patient currently taking and are there any interactions I should consider with their thyroid medication?"

*[Show the response]*

The AI pulls from their protocol, cross-references with their medical history, and gives you a clinically relevant answer.

*[Ask another question]*

Or: "Summarize this patient's progress over the last three months."

*[Show response]*

It synthesizes information from notes, form responses, and labs to give you a coherent narrative.

*[Mention the Knowledge Base]*

Your clinic's knowledge base is also integrated. Upload your clinical guidelines, research papers, or reference materials to the KB. When you ask questions, the AI searches your knowledge base first, then supplements with its training.

This creates an AI assistant that thinks like your practice - not generic advice, but recommendations aligned with how you work.

---

### SECTION 8: CLOSING & NEXT STEPS
**[10:30 - 11:00]**

*[Return to dashboard]*

So that's ExpandHealth Version 2.

To recap what's new from the MVP:

- Full multi-tenancy with role-based access control
- AI assistance on every page - context-aware and clinically relevant
- PDF form parsing - convert your existing forms automatically
- AI-generated lab summaries
- Modular protocol builder with AI generation
- Personality insights for better patient communication
- Complete audit logging for compliance

The goal is simple: give practitioners an AI copilot that genuinely understands their patients and their practice.

We're continuing to add features - WhatsApp integration for patient engagement, EMR integrations, and expanded AI capabilities.

If you have questions or want to discuss how this could work for your practice, let's connect.

Thanks for watching.

---

## POST-PRODUCTION NOTES

### Suggested On-Screen Callouts
- When showing multi-tenancy: "NEW: Multi-Clinic Support"
- When showing AI features: "Powered by Claude & Gemini AI"
- When showing PDF parsing: "NEW: AI Form Extraction"
- When showing personality insights: "NEW: Patient Personality Analysis"

### Transitions
- Use subtle fade transitions between sections
- Consider picture-in-picture for complex workflows
- Add progress indicator showing demo section

### Music
- Light, professional background music (low volume)
- Consider using Epidemic Sound or Artlist for royalty-free tracks

### Thumbnail
- Show the dashboard with "V2" badge
- Text: "ExpandHealth V2 Demo - AI-Powered Practice Management"

---

## QUICK REFERENCE: KEY UPGRADES V1 → V2

| Feature | V1 (MVP) | V2 |
|---------|----------|-----|
| **Architecture** | Single-tenant | Multi-tenant with RBAC |
| **AI Chat** | Basic chatbot | Context-aware with full patient data |
| **Forms** | Manual creation | AI PDF parsing + dynamic forms |
| **Labs** | PDF upload only | PDF + AI summaries |
| **Protocols** | Template selection | AI generation + modular builder |
| **Notes** | Basic notes | Quick Notes on all pages, AI context |
| **Insights** | None | Personality analysis |
| **Admin** | Minimal | Full admin panel with audit logging |
| **Knowledge Base** | Basic upload | Gemini-powered search + chat integration |

---

## ELEVENLABS TIPS

1. **Voice Selection:** Use "Adam" or "Antoni" for professional male voice, "Rachel" for female
2. **Stability:** Set to 0.5-0.7 for natural variation
3. **Clarity:** Set to 0.75+ for clear pronunciation
4. **Break Script:** Generate in paragraph chunks (faster processing, easier editing)
5. **Export:** Download as MP3, import into video editor

### Suggested Breaks for Generation:
- Section 1: 2 paragraphs
- Section 2: 4 paragraphs
- Section 3: 4 paragraphs
- Section 4: 4 paragraphs
- Section 5: 4 paragraphs
- Section 6: 5 paragraphs
- Section 7: 5 paragraphs
- Section 8: 4 paragraphs

Total: ~25 audio chunks to generate and sequence

---

*Script written for ExpandHealth V2 - December 2024*
