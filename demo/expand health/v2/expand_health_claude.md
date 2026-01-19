# ExpandHealth AI Copilot

## Project Overview

ExpandHealth is a comprehensive healthcare practice management platform for wellness clinics. It provides client management, appointment scheduling, AI-powered chat assistance, forms, protocols, and integrations with external booking platforms.

**Production URL:** https://app.expandhealth.ai/
**Staging URL:** https://expandhealth-ai-copilot-staging.up.railway.app/
**GitHub:** https://github.com/emilianpopa/expandhealthai (private)
**Owner:** Emilian Popa

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (hosted on Railway)
- **Frontend:** Server-side rendered HTML with vanilla JavaScript
- **Templating:** Static HTML files in `/views`
- **Styling:** Custom CSS (no framework)
- **Deployment:** Railway (auto-deploys from GitHub)
- **AI Integration:** Claude API and Gemini API

## Project Structure

```
/
├── server.js              # Main Express server with all route mounting
├── api/                   # API route handlers
│   ├── admin.js           # User/role/tenant management
│   ├── appointments.js    # Appointment CRUD
│   ├── auth.js            # Authentication (JWT)
│   ├── booking-*.js       # Public booking flow
│   ├── chat.js            # AI chat endpoints
│   ├── classes.js         # Class/session management
│   ├── clients.js         # Client CRUD
│   ├── forms.js           # Form builder and submissions
│   ├── integrations.js    # External platform integrations (Momence, etc.)
│   ├── labs.js            # Lab results management
│   ├── notes.js           # Clinical notes
│   ├── protocols.js       # Treatment protocols & engagement plans
│   └── services.js        # Service types
├── services/
│   ├── momence.js         # Momence API client
│   ├── auditLogger.js     # Audit trail logging
│   └── encryption.js      # Token encryption
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   ├── tenant.js          # Multi-tenant context middleware
│   └── errorHandler.js    # Global error handler
├── database/
│   ├── db.js              # PostgreSQL connection pool
│   ├── init.js            # Database initialization & migrations
│   └── migrations/        # Database migrations
├── prompts/               # AI prompt templates
│   ├── clinical-protocol-engine.js
│   └── engagement-plan-alignment.js
├── views/                 # HTML templates (served statically)
├── public/                # Static assets (JS, CSS, images)
│   ├── js/
│   │   ├── admin.js       # Admin dashboard client-side JS
│   │   └── client-dashboard.js  # Client dashboard client-side JS
│   └── css/
│       ├── client-dashboard.css
│       └── protocol-builder.css
└── data/                  # Static data files
```

## Key Features

### Multi-Tenant Architecture
- Platform supports multiple clinics (tenants)
- Each tenant has isolated data
- Platform admins can manage all tenants
- Clinic admins manage their own tenant

### Authentication
- JWT-based authentication
- Roles: `super_admin`, `clinic_admin`, `doctor`, `therapist`, `receptionist`
- Token stored in `localStorage` as `auth_token`

### External Integrations

#### Momence Integration
The platform integrates with Momence (fitness/wellness booking platform) via their Legacy API v1.

**API Details:**
- Base URL: `https://momence.com/_api/primary/api/v1`
- Auth: Query params `hostId` and `token`
- Endpoints used:
  - `GET /Customers?page=X&pageSize=Y` - Fetch customers
  - `GET /Events` - Fetch events

**Response Format:**
```json
{
  "payload": [...customers...],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalCount": 150
  }
}
```

---

## Database Schema (Key Tables)

### Core Tables
- `tenants` - Clinic/organization accounts
- `users` - User accounts with roles
- `clients` - Patient/client records
- `appointments` - Scheduled appointments
- `services` / `service_types` - Service offerings

### Protocol Tables
- `protocols` - Clinical protocol documents
  - `ai_recommendations` (JSONB) - May contain engagement plan data (can be overwritten)
  - `protocol_data` (JSONB) - **Source of truth** for clinical protocol data (never overwritten)
- `engagement_plans` - Client-facing delivery plans
  - `plan_data` (JSONB) - Engagement plan content
  - `validation_data` (JSONB) - Alignment validation results
  - `source_protocol_id` - Links to source protocol

### Integration Tables
- `integrations` - Platform connections (Momence, Practice Better, etc.)
- `integration_client_mappings` - Links external customers to local clients
- `integration_appointment_mappings` - Links external events to appointments
- `integration_sync_logs` - Audit trail of sync operations

### Forms System
- `forms` - Form definitions
- `form_fields` - Field configurations
- `form_submissions` - Completed form data

---

## Protocol & Engagement Plan System

### Clinical Protocol Engine
Located in `/prompts/clinical-protocol-engine.js`

Generates AI-powered clinical protocols with:
- Core protocol (Weeks 1-2 foundation)
- Phased expansion (progressive interventions)
- Clinic treatments/modalities
- Safety constraints and contraindications
- Retest schedules

**Protocol Output Structure:**
```json
{
  "title": "Protocol title",
  "summary": "Clinical summary",
  "core_protocol": {
    "phase_name": "Core Protocol - Weeks 1-2",
    "items": [{ "name", "category", "dosage", "timing", "rationale", "contraindications" }],
    "safety_gates": []
  },
  "phased_expansion": [
    { "phase_name", "start_week", "items", "safety_gates", "readiness_criteria" }
  ],
  "clinic_treatments": {
    "phase": "Available after Week 4",
    "available_modalities": [{ "name", "indication", "contraindications", "protocol" }]
  },
  "retest_schedule": [{ "test", "timing", "purpose" }],
  "safety_summary": { "absolute_contraindications", "monitoring_requirements", "warning_signs" }
}
```

### Engagement Plan Alignment System
Located in `/prompts/engagement-plan-alignment.js`

**Purpose:** Ensures engagement plans are 100% aligned with source protocols.

**Key Rule:** The protocol is the SOURCE OF TRUTH. Engagement plans must include every supplement, treatment, and modality from the protocol - nothing more, nothing less.

**Functions:**
- `extractProtocolElements(protocol)` - Extracts supplements, clinic treatments, lifestyle protocols, retest schedule, safety constraints
- `generateAlignedEngagementPlanPrompt(options)` - Creates AI prompt with strict alignment rules
- `validateEngagementPlanAlignment(plan, elements)` - Validates coverage percentages
- `autoFixEngagementPlan(plan, validation, elements)` - Programmatically adds missing items
- `generateRegenerationPrompt(plan, validation, elements)` - Creates fix prompt for AI retry

**Generation Flow (in `/api/protocols.js`):**
1. Extract protocol elements from source
2. Generate engagement plan using aligned prompt
3. Validate alignment (check all items covered)
4. If validation fails: Regeneration loop (up to 2 attempts)
5. If still not aligned: Auto-fix fallback
6. Save to `engagement_plans` table

### API Endpoints

**Protocols:**
- `POST /api/protocols/:id/generate-engagement-plan` - Generate aligned engagement plan
- `GET /api/protocols/:id/compare-alignment` - Check protocol vs engagement plan alignment
- `GET /api/protocols/engagement-plans/:id/compare-alignment` - Check alignment for standalone engagement plan
- `POST /api/protocols/edit-engagement-phase` - AI-powered phase editing

**Engagement Plans:**
- `GET /api/protocols/engagement-plans/client/:clientId` - List client's engagement plans
- `GET /api/protocols/engagement-plans/:id` - Get single engagement plan
- `PUT /api/protocols/engagement-plans/:id` - Update engagement plan
- `DELETE /api/protocols/engagement-plans/:id` - Delete engagement plan

---

## Protocol-to-Engagement-Plan Alignment Guide

### The Core Problem

When generating engagement plans from protocols, several common issues occur:

1. **Wrong action verbs**: Using "Take X" for non-supplements (contraindications, lab tests, monitoring requirements)
2. **Timeline compression**: Compressing 12-week protocols into 4 weeks
3. **Phase misalignment**: Items appear in wrong weeks (e.g., DMSA in Week 1 instead of Week 7)
4. **Safety gates as checklists**: Safety gates listed but not enforced as IF/THEN rules
5. **Clinic treatments as defaults**: Conditional treatments shown as always-available tasks

### Content Type Classification

**CRITICAL**: Not everything is a "Take" action. Classify items correctly:

| Category | Action Verb | Example |
|----------|-------------|---------|
| Supplements | "Take" | "Take Magnesium (per protocol)" |
| Modalities | "Complete" / "Do" | "Complete infrared sauna session" |
| Clinic Treatments | "Schedule" (conditional) | "IF eligible, schedule NAD+ IV" |
| Labs/Retesting | "Schedule" / "Complete" / "Review" | "Schedule CMP panel" |
| Safety Gates | "Verify" / "Confirm" | "Verify kidney function before DMSA" |
| Contraindications | "STOP if" / "Do NOT" | "STOP protocol if rash develops" |
| Warning Signs | "Contact clinician if" | "Contact clinician if severe fatigue" |

### Strict Schema for Engagement Plans

Every item must be classified as exactly one of:

- **ACTION**: Client does something (supplement intake, sauna session, training session, hydration, sleep actions)
- **MONITOR**: Track/observe (symptoms, BP, HRV, digestion)
- **GATE**: Condition controlling progression (IF/THEN; hold/advance)
- **DECISION**: Clinician judgement point (TRT evaluation, escalation to IV chelation, etc.)
- **TEST**: Schedule/complete/review lab panels

**Rules:**
- NEVER label DECISION, GATE, MONITOR, or TEST as "Take"
- Clinic treatments must be under DECISION (eligibility) + ACTION (once decided/scheduled), not default
- The engagement plan timeline MUST match protocol weeks and phase start weeks exactly
- Include every protocol item. No invention. No deletion.
- Do not restate or modify dosages; reference "per protocol" where needed

### Validation Checklist

Before finalizing any engagement plan, verify:

1. **Timeline Match**: Protocol weeks match engagement plan weeks exactly
2. **Phase Start Weeks**: Items appear in correct phases (check `start_week` in protocol)
3. **All Items Covered**: Every supplement, modality, and treatment from protocol appears
4. **Correct Action Verbs**: Supplements use "Take", labs use "Schedule/Complete/Review"
5. **Safety Gates Enforced**: IF/THEN rules, not just listed items
6. **Clinic Treatments Conditional**: Shown with eligibility requirements
7. **Retests Scheduled**: All protocol retests have clear action sequences

### Database Schema Note

**IMPORTANT**: The `protocols` table has two JSONB columns:
- `ai_recommendations` - May contain engagement plan data (gets overwritten)
- `protocol_data` - Contains clinical protocol (source of truth, never overwritten)

When checking alignment, always use `protocol_data` first:
```javascript
const protocolData = protocol.protocol_data || protocol.ai_recommendations;
```

---

## Appointment System

### Momence Integration
Syncs appointments from Momence booking platform.

**Sync Features:**
- Pull appointments with client and service mapping
- Payment status sync (paid/unpaid tags)
- Automatic client matching by email

**Appointment Detail Panel** (`/views/appointments.html`):
- Client info with email display
- Payment status tags (Paid/Unpaid)
- Timing tab (date, time, duration, timezone)
- Note tab with save functionality
- Integration with Momence event data

### Calendar Color Coding (Momence-style)
- **Green** (`#4ade80`): Paid appointments
- **Red** (`#ef4444`): Unpaid appointments
- **Gray** (`#6b7280`): Time blocks

### API Endpoints
- `POST /api/integrations/:id/sync/appointments` - Sync appointments from Momence
- `POST /api/appointments/:id/sync-payment` - Sync payment status for single appointment
- `PUT /api/appointments/:id/note` - Save appointment note
- `POST /api/appointments/fix-durations` - Fix all appointment durations

---

## Client Dashboard

Located in `/public/js/client-dashboard.js`

### Tabs
- Overview (AI chat, client summary)
- Labs (lab results management)
- Protocols (clinical protocols)
- Engagement Plans (client-facing delivery plans)
- Notes (clinical notes)
- Forms (intake forms, questionnaires)
- Settings

### Key Features

**Protocol Cards:**
- Generate Protocol (AI-powered)
- Generate Engagement Plan
- View/Edit/Delete
- Print/Export PDF
- Check Alignment

**Engagement Plan Cards:**
- View/Edit/Delete
- Save as PDF (with dropdown for format options)
- Check Alignment (validates against source protocol)
- Print

**Inline Editing:**
All engagement plan items support inline editing with `contenteditable`:
- Phase titles
- Phase subtitles
- Phase items (supplements, modalities, etc.)
- Progress goals
- Check-in prompts

---

## Deployment

### Git Remotes
- `origin` - Main development repo
- `expandhealthai` - Production deployment repo

### Deploy to Production
```bash
git push expandhealthai main
```

Railway watches the main branch and auto-deploys.

### Railway Configuration (`railway.toml`)
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `CLAUDE_API_KEY` - Anthropic API key for AI chat
- `GEMINI_API_KEY` - Google Gemini API key
- `PORT` - Server port (default: 3001)

---

## Common Tasks

### Adding a New API Endpoint
1. Create/modify file in `/api/`
2. Mount route in `server.js`
3. Add authentication middleware if needed

### Modifying the Admin Dashboard
- Backend: `/api/admin.js`
- Frontend: `/views/admin.html` + `/public/js/admin.js`

### Modifying the Client Dashboard
- Backend: `/api/clients.js`, `/api/protocols.js`
- Frontend: `/views/client-dashboard.html` + `/public/js/client-dashboard.js`
- CSS: `/public/css/client-dashboard.css`

### Debugging Integrations
1. Check Railway logs for API responses
2. Verify credentials in database (`integrations` table)
3. Check `integration_sync_logs` for error messages

---

## Troubleshooting

### "Alignment shows 0 protocol items"

**Root Cause:** Protocol data was destroyed when engagement plan was generated (before the `protocol_data` fix).

**Solution:**
1. The `protocol_data` column now preserves original protocol data
2. Migration in `init.js` attempts to recover data from `ai_recommendations` if it has `core_protocol` key
3. For protocols with lost data, regenerate the clinical protocol

**Check for lost data:**
```sql
SELECT p.id, p.title, p.client_id
FROM protocols p
JOIN engagement_plans ep ON ep.source_protocol_id = p.id
WHERE p.protocol_data IS NULL
  AND (p.ai_recommendations IS NULL
       OR NOT (p.ai_recommendations::jsonb ? 'core_protocol'))
```

### "Engagement plan items not editable"

**Solution:** Ensure all rendered items have `contenteditable="true"` attribute. Check:
- KB-generated plan renderer (line ~5494 in client-dashboard.js)
- Fallback plan renderer (line ~5562 in client-dashboard.js)
- CSS supports editable styling for `.engagement-phase` elements

### "Clinic treatments scheduled as defaults"

**Problem:** Engagement plan shows "Schedule IV Glutathione at clinic" as a task.

**Solution:** Clinic treatments should be:
1. Listed under DECISIONS (eligibility review)
2. Only scheduled IF eligible AND no contraindications
3. Never appear as default tasks

---

## Recent Changes Log

### January 2026
- **Engagement Plan Inline Editing** - All items now editable with contenteditable
- **Engagement Plan Alignment System** - Strict protocol alignment with regeneration loop and auto-fix
- **Engagement Plan Compare Alignment Endpoint** - `/api/protocols/engagement-plans/:id/compare-alignment`
- **Appointment Panel Enhancement** - Client email, payment tags, timing/note tabs
- **Save Dropdown for Engagement Plans** - Matches protocol save dropdown pattern
- **Health Check Timeout** - Increased to 300 seconds for Railway deployments
- **Protocol Data Preservation Fix** - Added `protocol_data` column to prevent clinical protocol data from being overwritten when generating engagement plans

---

## Reference Files

### Engagement Plan Templates
- **Corrected Template:** `engagement_plan_corrected.md` - Gold standard example
- **Lint Checklist:** `engagement_plan_lint.md` - Validation checklist for QA

### Key Source Files
| File | Purpose |
|------|---------|
| `/api/protocols.js` | Protocol & engagement plan API |
| `/prompts/engagement-plan-alignment.js` | Alignment validation logic |
| `/prompts/clinical-protocol-engine.js` | Protocol generation prompts |
| `/public/js/client-dashboard.js` | Client dashboard frontend |
| `/public/css/client-dashboard.css` | Dashboard styling |
| `/database/init.js` | Database migrations including `protocol_data` column |

---

*Last updated: January 2026*
