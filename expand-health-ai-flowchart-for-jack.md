# ExpandHealth AI: System Flowchart

**For: Jack Microfonder**
**From: Emilian**
**Date: December 12, 2025**

---

## Simple End-to-End Flow

```mermaid
graph TB
    START([Doctor with Patient])

    START --> A[Doctor records consultation<br/>+ uploads blood tests]

    A --> B{AI Processing<br/>8 Specialized Agents}

    B --> C[Audio → Clinical Context<br/>Symptoms, lifestyle, goals]
    B --> D[PDF → Lab Analysis<br/>Values, trends, red flags]

    C --> E[AI correlates everything<br/>+ queries protocol library]
    D --> E

    E --> F[Draft Treatment Plan<br/>Personalized + ExpandHealth protocols]

    F --> G[Doctor reviews plan<br/>Edits + Approves]

    G --> H[Patient receives<br/>customized plan]

    H --> END([Follow-up & Outcomes])

    style START fill:#e1f5e1
    style B fill:#fff4e1
    style G fill:#ffe1e1
    style END fill:#e1e5ff
```

**Time saved per patient:** 45 minutes → 15 minutes

---

## 8 AI Agents Architecture

```mermaid
graph LR
    INPUT[Doctor Uploads]

    INPUT --> A1[Agent 1:<br/>Intake & Context]
    INPUT --> A2[Agent 2:<br/>Lab Analysis]

    A1 --> A3[Agent 3:<br/>Clinical Reasoning]
    A2 --> A3

    A3 --> A4[Agent 4:<br/>Protocol Matching]

    A4 --> A5[Agent 5:<br/>Safety Check]
    A4 --> A6[Agent 6:<br/>Ops Fit Check]

    A5 --> REVIEW[Agent 7:<br/>Doctor Review]
    A6 --> REVIEW

    REVIEW --> A8[Agent 8:<br/>Patient Document]

    A8 --> OUTPUT[Final Plan]

    KB[(Knowledge Base<br/>ExpandHealth Protocols)]

    KB -.Query.-> A4

    style INPUT fill:#e1f5e1
    style KB fill:#fff4e1
    style REVIEW fill:#ffe1e1
    style OUTPUT fill:#e1e5ff
```

**Each agent = Independent, modular, upgradeable**

---

## Technology Stack (MindValley AI Course Tools)

```mermaid
graph TB
    subgraph "Frontend: $0-20/mo"
        UI[Web Dashboard<br/>Vercel + Next.js]
    end

    subgraph "Backend: $20/mo"
        N8N[Workflow Engine<br/>n8n Cloud]
    end

    subgraph "AI Layer: ~$100/mo"
        CLAUDE[Claude API<br/>8 AI Agents]
        WHISPER[Whisper API<br/>Audio Transcription]
        GEMINI[Gemini KB<br/>Protocol Library]
    end

    subgraph "Data: $20/mo"
        DB[(Postgres<br/>Patient Sessions)]
        FILES[Blob Storage<br/>Temp Files]
    end

    UI --> N8N
    N8N --> CLAUDE
    N8N --> WHISPER
    N8N --> GEMINI
    N8N --> DB
    N8N --> FILES

    style UI fill:#e1f5e1
    style N8N fill:#fff4e1
    style CLAUDE fill:#ffe1e1
    style GEMINI fill:#e1e5ff
```

**Total monthly cost:** ~$170
**Cost per patient:** $1.70
**Built with MindValley course tools**

---

## Data Flow: Audio + Labs → Treatment Plan

```mermaid
flowchart LR
    A[🎙️ Audio Recording]
    B[📄 Blood Tests PDF]

    A --> C[Whisper API<br/>Speech → Text]
    B --> D[Gemini Vision<br/>PDF → Data]

    C --> E[Claude Agent 1<br/>Extract Context]
    D --> F[Claude Agent 2<br/>Analyze Labs]

    E --> G[Claude Agent 3<br/>Correlate Everything]
    F --> G

    KB[(Gemini KB<br/>ExpandHealth<br/>Protocols)]

    G --> H[Claude Agent 4<br/>RAG Query]
    KB --> H

    H --> I[Draft Plan]

    I --> J[Doctor Reviews<br/>& Edits]

    J --> K[📋 Patient PDF]

    style A fill:#e1f5e1
    style B fill:#e1f5e1
    style KB fill:#fff4e1
    style J fill:#ffe1e1
    style K fill:#e1e5ff
```

---

## Two Patient Flows (Bucharest + Cape Town Learning)

```mermaid
graph TB
    PATIENT[Patient Arrives]

    PATIENT --> FLOW_A{Choose Flow}

    FLOW_A -->|Medical Track| A1[Doctor Consultation<br/>Audio Recording]
    FLOW_A -->|Wellness Track| B1[Coach Consultation<br/>Optional Light Labs]

    A1 --> A2[Full Lab Testing]
    B1 --> B2[Lifestyle Assessment]

    A2 --> A3[AI Analysis<br/>Medical + Wellness Plan]
    B2 --> B3[AI Analysis<br/>Wellness Plan]

    A3 --> A4[Doctor Reviews & Approves]
    B3 --> B4[Coach/Doctor Reviews]

    A4 --> A5[Advanced Therapies<br/>HBOT, IV, Peptides, Ozone]
    B4 --> B5[Lifestyle Protocol<br/>Optional Upgrade]

    A5 --> END[Follow-up & Retest]
    B5 --> END

    style PATIENT fill:#e1f5e1
    style FLOW_A fill:#fff4e1
    style A4 fill:#ffe1e1
    style B4 fill:#ffe1e1
    style END fill:#e1e5ff
```

**Flow A:** Chronic disease, metabolic, longevity (60% of patients)
**Flow B:** Biohackers, prevention, wellness (40% of patients)

---

## Security & Compliance Layer

```mermaid
graph TB
    DATA[Patient Data]

    DATA --> ENC1[Encryption at Rest<br/>AES-256]
    DATA --> ENC2[Encryption in Transit<br/>TLS 1.3]

    ENC1 --> AUTH[Doctor Authentication<br/>Access Control]
    ENC2 --> AUTH

    AUTH --> HITL[Human-in-the-Loop<br/>Mandatory Doctor Review]

    HITL --> AUDIT[Audit Logs<br/>All Actions Tracked]

    AUDIT --> ANON[PHI Anonymization<br/>Before Analytics]

    ANON --> DELETE[Auto-Delete Files<br/>After 30 Days]

    DELETE --> HIPAA[HIPAA Compliant<br/>BAA with Vendors]

    style DATA fill:#e1f5e1
    style HITL fill:#ffe1e1
    style HIPAA fill:#e1e5ff
```

**Doctor has final authority on every plan**

---

## 12-Week Build Timeline

```mermaid
gantt
    title ExpandHealth AI: 12-Week Development Plan
    dateFormat YYYY-MM-DD

    section Phase 1
    Setup n8n & Infrastructure    :p1, 2025-12-16, 14d

    section Phase 2
    Build 8 AI Agents             :p2, after p1, 14d

    section Phase 3
    Doctor Dashboard + Review UI  :p3, after p2, 14d

    section Phase 4
    Pilot: 10-20 Real Patients    :p4, after p3, 14d

    section Phase 5
    Optimize & Launch             :p5, after p4, 14d
```

**Week 1-2:** Foundation (n8n, Claude API, Gemini KB setup)
**Week 3-4:** Intelligence Layer (8 agents)
**Week 5-6:** Interface (Doctor dashboard + review)
**Week 7-8:** Pilot (Real patients in Bucharest)
**Week 9-12:** Scale (Cape Town + optimization)

---

## Cost Breakdown

| Component | Monthly Cost | Purpose |
|-----------|--------------|---------|
| n8n Cloud | $20 | Workflow orchestration |
| Claude API | $100 | 8 AI agents (~100 patients) |
| Whisper API | $9 | Audio transcription |
| Gemini KB | $0 | Free tier (protocol library) |
| Vercel Hosting | $20 | Web dashboard |
| Database | $20 | Patient sessions |
| File Storage | $1.50 | Temporary uploads |
| **TOTAL** | **$170** | **~100 patients/month** |

**Per-patient cost:** $1.70
**Revenue per patient:** $500-2000
**Margin:** 99%+

---

## Scalability Roadmap

```mermaid
graph LR
    M1[Month 1-3<br/>Bucharest<br/>1 doctor<br/>50 patients]

    M4[Month 4-6<br/>+ Cape Town<br/>3 doctors<br/>150 patients]

    M12[Month 7-12<br/>Multi-clinic<br/>10 doctors<br/>500 patients]

    Y2[Year 2<br/>Licensing<br/>50+ doctors<br/>2000+ patients]

    M1 --> M4
    M4 --> M12
    M12 --> Y2

    style M1 fill:#e1f5e1
    style M4 fill:#fff4e1
    style M12 fill:#ffe1e1
    style Y2 fill:#e1e5ff
```

**Revenue trajectory:**
- Month 3: $25K MRR (50 patients × $500)
- Month 6: $75K MRR (150 patients × $500)
- Year 1: $250K MRR (500 patients × $500)
- Year 2: $1M+ MRR (licensing to other clinics)

---

## Why This Approach Works

✅ **Low-cost:** $170/month (not $50K+ for dev team)
✅ **Modular:** Each agent evolves independently
✅ **Founder-built:** I can build/maintain it myself
✅ **Validated tools:** MindValley AI course tech stack
✅ **Real clinic learning:** Built from our 2-year experience
✅ **Fast to market:** 12 weeks to pilot-ready
✅ **Clear validation gates:** Kill/iterate criteria at each phase

---

**Built with MindValley AI Mastery course tools:**
- n8n workflows
- Claude API agents
- Gemini File Search (knowledge base)
- Human-in-the-loop patterns

**This is not theory—it's the formalization of what we already do manually in Bucharest and Cape Town.**
