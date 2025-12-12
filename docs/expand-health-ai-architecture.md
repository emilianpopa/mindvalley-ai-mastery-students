# ExpandHealth AI: System Architecture

**Version:** 2.0 (Agent-Based Architecture)
**Date:** December 12, 2025

---

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Doctor Interface"
        A[Doctor Dashboard<br/>Web UI]
        A1[Upload Audio Recording]
        A2[Upload Blood Tests PDF]
        A3[Patient Context Form]
        A --> A1
        A --> A2
        A --> A3
    end

    subgraph "Data Processing Layer"
        B[File Storage<br/>Temporary Secure Storage]
        C1[Audio Transcription<br/>Whisper API]
        C2[PDF OCR & Parsing<br/>Gemini Vision / OCR]

        A1 --> B
        A2 --> B
        B --> C1
        B --> C2
    end

    subgraph "AI Agent Orchestra - N8N Workflows"
        D[Workflow Orchestrator<br/>N8N Cloud]

        D --> E1[Agent 1: Intake & Context]
        D --> E2[Agent 2: Diagnostics Interpretation]
        D --> E3[Agent 3: Clinical Reasoning]
        D --> E4[Agent 4: Protocol Matching]
        D --> E5[Agent 5: Safety Check]
        D --> E6[Agent 6: Operational Fit]

        C1 --> D
        C2 --> D
        A3 --> D
    end

    subgraph "Agent 1: Intake & Context Agent"
        E1 --> F1[Audio Transcription<br/>Speaker Diarization]
        F1 --> F2[Extract Chief Complaints]
        F2 --> F3[Extract Lifestyle Factors]
        F3 --> F4[Extract Psychosocial Context]
        F4 --> F5[Structured Patient Context JSON]
    end

    subgraph "Agent 2: Diagnostics Interpretation"
        E2 --> G1[Parse Lab Values]
        G1 --> G2[Normalize Units]
        G2 --> G3[Compare to Reference Ranges]
        G3 --> G4[Identify Trends]
        G4 --> G5[Flag Critical Values]
        G5 --> G6[Structured Lab Analysis JSON]
    end

    subgraph "Agent 3: Clinical Reasoning"
        E3 --> H1[Correlate Symptoms + Labs]
        H1 --> H2[Risk Stratification]
        H2 --> H3[Pattern Recognition]
        H3 --> H4[Generate Hypotheses]
        H4 --> H5[Clinical Insights JSON]
    end

    subgraph "Knowledge Base - Gemini File Search"
        I[Protocol Library<br/>Gemini KB Store]
        I1[Metabolic Protocols]
        I2[Cardiovascular Protocols]
        I3[Hormone Protocols]
        I4[ExpandHealth Treatment Protocols<br/>HBOT, IV, Peptides, Ozone]
        I5[Drug Interaction Database]

        I --> I1
        I --> I2
        I --> I3
        I --> I4
        I --> I5
    end

    subgraph "Agent 4: Protocol Matching (RAG)"
        E4 --> J1[Query Protocol KB<br/>Gemini RAG]
        F5 --> J1
        G6 --> J1
        H5 --> J1
        I --> J1
        J1 --> J2[Retrieve Relevant Protocols]
        J2 --> J3[Rank by Relevance]
        J3 --> J4[Customize to Patient Context]
        J4 --> J5[Draft Treatment Plan]
    end

    subgraph "Agent 5: Safety & Contraindication"
        E5 --> K1[Check Drug Interactions]
        K1 --> K2[Verify Contraindications]
        K2 --> K3[Review Allergies]
        K3 --> K4[Risk Mitigation]
        K4 --> K5[Safety Approval JSON]
    end

    subgraph "Agent 6: Operational Fit"
        E6 --> L1[Check Clinic Capabilities<br/>HBOT, IV available?]
        L1 --> L2[Verify Patient Budget]
        L2 --> L3[Schedule Feasibility]
        L3 --> L4[Adjust Plan to Reality]
        L4 --> L5[Final Actionable Plan]
    end

    subgraph "Human-in-the-Loop"
        M[Doctor Review Dashboard<br/>Web UI]
        M1[View AI Analysis]
        M2[Edit Recommendations]
        M3[Add Clinical Judgment]
        M4[Approve or Reject]

        L5 --> M
        M --> M1
        M1 --> M2
        M2 --> M3
        M3 --> M4
    end

    subgraph "Agent 8: Patient Output"
        N[Patient Document Generator]
        N1[Plain Language Translation]
        N2[Add Education Materials]
        N3[Format PDF]
        N4[Personalize with Quotes]

        M4 --> N
        N --> N1
        N1 --> N2
        N2 --> N3
        N3 --> N4
    end

    subgraph "Delivery"
        O[Patient Receives Plan]
        O1[PDF Report]
        O2[Clinic Portal Access]
        O3[Follow-up Scheduling]

        N4 --> O
        O --> O1
        O --> O2
        O --> O3
    end

    subgraph "Analytics & Learning"
        P[Outcome Tracking]
        P1[Protocol Effectiveness]
        P2[Patient Compliance]
        P3[Continuous Improvement]

        O --> P
        P --> P1
        P1 --> P2
        P2 --> P3
        P3 -.Feedback Loop.-> I
    end
```

---

## Technology Stack

### Core Infrastructure

| Component | Technology | Cost | Purpose |
|-----------|-----------|------|---------|
| **Workflow Orchestration** | n8n Cloud (Starter) | $20/month | Coordinate all AI agents, workflows, webhooks |
| **AI Agent Engine** | Claude API (Sonnet 4.5) | Pay-per-use (~$50-150/month) | Power all 8 specialized agents |
| **Knowledge Base** | Google Gemini File Search | Free | Store and retrieve protocols via RAG |
| **Audio Transcription** | OpenAI Whisper API | Pay-per-use (~$0.006/min) | Convert doctor-patient audio to text |
| **OCR & Vision** | Gemini Vision API | Free tier / Pay-per-use | Parse blood test PDFs |
| **Web Dashboard** | Vercel + React/Next.js | Free tier | Doctor interface for upload + review |
| **File Storage** | Vercel Blob Storage | $0.15/GB | Temporary secure storage for uploads |
| **Database** | Vercel Postgres | $20/month | Store patient sessions, analytics |

**Total Monthly Cost (Phase 1):** ~$90-190/month

---

## Agent Communication Flow

```mermaid
sequenceDiagram
    participant Doctor
    participant Dashboard
    participant N8N
    participant Agent1 as Agent 1: Intake
    participant Agent2 as Agent 2: Diagnostics
    participant Agent3 as Agent 3: Reasoning
    participant Agent4 as Agent 4: Protocols
    participant Agent5 as Agent 5: Safety
    participant Agent6 as Agent 6: OpsFit
    participant GeminiKB as Gemini KB
    participant Review as Review Dashboard

    Doctor->>Dashboard: Upload Audio + Labs + Context
    Dashboard->>N8N: Trigger Workflow

    par Parallel Processing
        N8N->>Agent1: Process Audio
        N8N->>Agent2: Parse Labs
    end

    Agent1-->>N8N: Patient Context JSON
    Agent2-->>N8N: Lab Analysis JSON

    N8N->>Agent3: Correlate Context + Labs
    Agent3-->>N8N: Clinical Insights JSON

    N8N->>Agent4: Match Protocols
    Agent4->>GeminiKB: RAG Query
    GeminiKB-->>Agent4: Relevant Protocols
    Agent4-->>N8N: Draft Treatment Plan

    par Validation Layer
        N8N->>Agent5: Safety Check
        N8N->>Agent6: Operational Fit
    end

    Agent5-->>N8N: Safety Approval
    Agent6-->>N8N: Adjusted Plan

    N8N->>Review: Present to Doctor
    Review->>Doctor: Review UI
    Doctor->>Review: Approve with Edits
    Review->>N8N: Generate Patient Document
    N8N->>Doctor: Final PDF + Portal Link
```

---

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph Input
        A[Audio Recording<br/>MP3/WAV]
        B[Blood Tests<br/>PDF]
        C[Patient Context<br/>Form Data]
    end

    subgraph Processing
        D[Whisper API<br/>Audio → Text]
        E[Gemini Vision<br/>PDF → Structured Data]
        F[Claude API<br/>Text → Insights]
    end

    subgraph Storage
        G[(Gemini KB<br/>Protocols)]
        H[(Vercel Postgres<br/>Sessions)]
        I[Vercel Blob<br/>Temp Files]
    end

    subgraph Output
        J[Structured JSON<br/>Analysis]
        K[Treatment Plan<br/>Markdown]
        L[Patient PDF<br/>Formatted Report]
    end

    A --> I
    B --> I
    C --> H

    I --> D
    I --> E

    D --> F
    E --> F
    C --> F

    G -.RAG Query.-> F

    F --> J
    J --> K
    K --> L

    L --> H
```

---

## Security & Compliance Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        A[Data Encryption at Rest<br/>AES-256]
        B[Data Encryption in Transit<br/>TLS 1.3]
        C[Access Control<br/>Doctor Authentication]
        D[Audit Logs<br/>All Actions Tracked]
        E[PHI Anonymization<br/>Before Analytics]
        F[Automatic File Deletion<br/>After 30 Days]
        G[HIPAA Compliance<br/>BAA with Vendors]
    end

    subgraph "Compliance Controls"
        H[Doctor Review Mandatory<br/>No Auto-Send to Patients]
        I[Informed Consent<br/>AI-Assisted Care]
        J[Right to Human Override<br/>Doctor Final Authority]
        K[Transparency Logs<br/>Which Agents Made Decisions]
    end

    A --> H
    B --> H
    C --> H
    D --> K
    E --> K
    F --> G
    G --> I
    I --> J
```

---

## N8N Workflow Structure

```mermaid
graph LR
    subgraph "N8N Workflows"
        W1[1. Upload Handler Workflow]
        W2[2. Audio Processing Workflow]
        W3[3. Lab Analysis Workflow]
        W4[4. Clinical Reasoning Workflow]
        W5[5. Protocol Matching Workflow]
        W6[6. Safety Validation Workflow]
        W7[7. Review Dashboard API]
        W8[8. Patient Document Generator]
    end

    subgraph "Webhooks & Triggers"
        T1[/api/upload]
        T2[/api/process-audio]
        T3[/api/analyze-labs]
        T4[/api/clinical-reasoning]
        T5[/api/match-protocols]
        T6[/api/validate-safety]
        T7[/api/review]
        T8[/api/generate-pdf]
    end

    T1 --> W1
    T2 --> W2
    T3 --> W3
    T4 --> W4
    T5 --> W5
    T6 --> W6
    T7 --> W7
    T8 --> W8

    W1 -.triggers.-> W2
    W1 -.triggers.-> W3
    W2 -.sends data.-> W4
    W3 -.sends data.-> W4
    W4 -.sends data.-> W5
    W5 -.sends data.-> W6
    W6 -.sends data.-> W7
    W7 -.triggers.-> W8
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Frontend - Vercel"
        A[Doctor Dashboard<br/>Next.js App]
        A1[Upload UI]
        A2[Review UI]
        A3[Analytics Dashboard]
    end

    subgraph "Backend - N8N Cloud"
        B[Workflow Engine<br/>n8n Cloud Instance]
        B1[8 Agent Workflows]
        B2[Webhook Endpoints]
        B3[Cron Jobs]
    end

    subgraph "AI Services - APIs"
        C1[Claude API<br/>Anthropic]
        C2[Whisper API<br/>OpenAI]
        C3[Gemini KB<br/>Google]
    end

    subgraph "Data Layer"
        D1[(Vercel Postgres<br/>Patient Sessions)]
        D2[Vercel Blob<br/>File Storage]
        D3[Gemini File Search<br/>Protocol KB]
    end

    A --> B
    B --> C1
    B --> C2
    B --> C3
    B --> D1
    B --> D2
    B --> D3
```

---

## Development Phases (12 Weeks)

```mermaid
gantt
    title ExpandHealth AI Development Timeline
    dateFormat YYYY-MM-DD
    section Phase 1: Foundation
    Setup Infrastructure         :p1, 2025-12-16, 7d
    Deploy N8N Workflows        :p2, after p1, 7d

    section Phase 2: Intelligence
    Build Agent 1-3             :p3, after p2, 7d
    Build Agent 4-6             :p4, after p3, 7d

    section Phase 3: Interface
    Doctor Dashboard            :p5, after p4, 7d
    Review Interface            :p6, after p5, 7d

    section Phase 4: Pilot
    Test with 10-20 Patients    :p7, after p6, 14d

    section Phase 5: Scale
    Optimization & Launch       :p8, after p7, 14d
```

---

## Agent Architecture Deep Dive

### Agent 1: Intake & Context Agent

**Input:**
- Audio file (MP3/WAV)
- Patient demographics

**Processing:**
1. Call Whisper API for transcription
2. Call Claude API with specialized prompt:
   - Extract chief complaints
   - Extract lifestyle factors
   - Extract psychosocial context
   - Extract patient goals
   - Flag key quotes

**Output:**
```json
{
  "conversation_insights": {
    "chief_complaints": [...],
    "lifestyle": {...},
    "psychosocial": {...},
    "patient_goals": {...},
    "key_quotes": [...]
  }
}
```

**N8N Workflow:**
- Webhook trigger
- HTTP Request to Whisper API
- HTTP Request to Claude API
- JSON transformation
- Store in database

---

### Agent 4: Protocol Matching Agent (RAG)

**Input:**
- Patient context JSON (from Agent 1)
- Lab analysis JSON (from Agent 2)
- Clinical insights JSON (from Agent 3)

**Processing:**
1. Build RAG query from combined data
2. Query Gemini File Search KB
3. Retrieve top 5 relevant protocols
4. Call Claude API to synthesize:
   - Combine protocol recommendations
   - Customize to patient context
   - Add ExpandHealth clinic treatments
   - Format as treatment plan

**Output:**
```markdown
# Treatment Plan for John Doe

## Key Findings
- Metabolic syndrome pattern
- Cardiovascular risk factors
...

## Recommended Protocol
### Phase 1: Foundation (Weeks 1-4)
...
### Phase 2: Advanced Therapies (Weeks 5-8)
- HBOT: 20 sessions...
- IV NAD+: Weekly...
...
```

**N8N Workflow:**
- Webhook trigger with combined JSON
- HTTP Request to Gemini KB (RAG query)
- HTTP Request to Claude API (synthesis)
- Markdown formatting
- Store draft in database

---

## Cost Breakdown (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| N8N Cloud Starter | 1 instance | $20 |
| Claude API (Sonnet 4.5) | ~100 patients/mo @ ~$1 each | $100 |
| Whisper API | ~100 conversations @ 15 min avg | $9 |
| Gemini KB | Free tier (1M tokens/month) | $0 |
| Vercel Hosting | Pro plan | $20 |
| Vercel Postgres | 1GB | $20 |
| Vercel Blob Storage | 10GB | $1.50 |
| **Total** | | **~$170/month** |

**Cost per patient:** $1.70
**Revenue per patient (avg):** $500-2000
**Margin:** 99%+

---

## Scalability Plan

```mermaid
graph LR
    subgraph "Month 1-3: Bucharest Only"
        A[1 Doctor<br/>~50 patients/mo]
    end

    subgraph "Month 4-6: Bucharest + Cape Town"
        B[3 Doctors<br/>~150 patients/mo]
    end

    subgraph "Month 7-12: Multi-Clinic"
        C[10 Doctors<br/>~500 patients/mo]
    end

    subgraph "Year 2: Licensing"
        D[50+ Doctors<br/>2000+ patients/mo]
    end

    A --> B
    B --> C
    C --> D

    style A fill:#e1f5e1
    style B fill:#fff4e1
    style C fill:#ffe1e1
    style D fill:#e1e5ff
```

---

**This architecture is:**
- ✅ Low-cost ($170/month)
- ✅ Modular (8 independent agents)
- ✅ Scalable (cloud-native)
- ✅ Founder-built (MindValley AI course tools)
- ✅ Production-ready (proven tech stack)

**Built with MindValley AI Mastery course tools:**
- n8n workflows (Session 1-3)
- Claude API agents (Session 2-4)
- Gemini File Search KB (Session 1)
- Human-in-the-loop patterns (Session 3)
