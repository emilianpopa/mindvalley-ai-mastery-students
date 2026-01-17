# ExpandHealth AI Copilot

## Project Overview

ExpandHealth is a comprehensive healthcare practice management platform for wellness clinics. It provides client management, appointment scheduling, AI-powered chat assistance, forms, protocols, and integrations with external booking platforms.

**Production URL:** https://expandhealth-ai-copilot-staging.up.railway.app/

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (hosted on Railway)
- **Frontend:** Server-side rendered HTML with vanilla JavaScript
- **Templating:** Static HTML files in `/views`
- **Styling:** Custom CSS (no framework)
- **Deployment:** Railway (auto-deploys from GitHub `staging` branch)
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
│   ├── protocols.js       # Treatment protocols
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
│   └── migrations/        # Database migrations
├── views/                 # HTML templates (served statically)
├── public/                # Static assets (JS, CSS, images)
│   └── js/
│       └── admin.js       # Admin dashboard client-side JS
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
The Momence API returns customers in this format:
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

**Customer fields from Momence:**
- `memberId` - Unique customer ID
- `email`, `firstName`, `lastName`, `phoneNumber`
- `firstSeen`, `lastSeen` - Timestamps
- `activeSubscriptions` - Array of membership packages
- `customerFields` - Custom fields array
- `addresses` - Array of addresses

**Sync Flow:**
1. Admin clicks "Sync Clients" in Admin Settings > Integrations
2. Frontend calls `POST /api/integrations/:id/sync/clients`
3. Backend fetches customers from Momence with pagination
4. Maps Momence customer → ExpandHealth client format
5. Creates or updates clients in database
6. Creates mapping records in `integration_client_mappings`

**Troubleshooting Sync Issues:**
- Check Railway logs for `[Momence API]` log lines
- Verify Host ID and Token in integration settings
- The code handles multiple response formats (payload, data, customers, direct array)

## Database Schema (Key Tables)

### Core Tables
- `tenants` - Clinic/organization accounts
- `users` - User accounts with roles
- `clients` - Patient/client records
- `appointments` - Scheduled appointments
- `services` / `service_types` - Service offerings

### Integration Tables
- `integrations` - Platform connections (Momence, Practice Better, etc.)
- `integration_client_mappings` - Links external customers to local clients
- `integration_appointment_mappings` - Links external events to appointments
- `integration_sync_logs` - Audit trail of sync operations

### Forms System
- `forms` - Form definitions
- `form_fields` - Field configurations
- `form_submissions` - Completed form data

## API Conventions

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Response Format
```json
{
  "success": true,
  "data": {...}
}
```
Or on error:
```json
{
  "error": "Error message"
}
```

## Development

### Local Setup
```bash
npm install
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, etc.
node server.js
```

### Deployment
Push to GitHub `staging` branch triggers Railway auto-deploy:
```bash
git push expandhealthai main:staging
```

Or use the deploy script:
```bash
./deploy.bat "commit message"
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `CLAUDE_API_KEY` - Anthropic API key for AI chat
- `GEMINI_API_KEY` - Google Gemini API key
- `PORT` - Server port (default: 3001)

## Common Tasks

### Adding a New API Endpoint
1. Create/modify file in `/api/`
2. Mount route in `server.js`
3. Add authentication middleware if needed

### Modifying the Admin Dashboard
- Backend: `/api/admin.js`
- Frontend: `/views/admin.html` + `/public/js/admin.js`

### Debugging Integrations
1. Check Railway logs for API responses
2. Verify credentials in database (`integrations` table)
3. Check `integration_sync_logs` for error messages

## Momence CSV Import System

The platform includes a comprehensive CSV import system for migrating data from Momence.

### Import Page
**URL:** `/import`
**File:** `/views/import-momence.html`

### Features

#### Customer Import
- Supports both Momence appointment CSV exports and direct customer exports
- Auto-detects CSV format based on column headers
- Deduplicates customers by email
- Dry-run preview before actual import

#### Appointment Import
- Imports appointments with correct durations parsed from service names
- Duration parsing priority:
  1. Explicit duration in CSV column (if present)
  2. Duration in service name (e.g., "HBOT1 90 min" → 90 minutes)
  3. Service type defaults (HBOT=60min, Cold Plunge=30min, etc.)
- Payment status detection (Paid column: "Yes", "Paid", "true", "1")
- Time block support (gray blocks for staff scheduling)

#### Time Blocks
Time blocks are detected when:
- Type column contains "time block" or "timeblock"
- Customer field is empty
- Customer field contains "time block" or "blocked"

Time blocks are displayed in gray on the calendar (like Momence).

### Post-Import Utilities

#### Fix Durations Button
If appointments were imported with wrong durations, use the "Fix All Durations" button on the import page. It recalculates `end_time` for all appointments based on their title/service name.

**Endpoint:** `POST /api/appointments/fix-durations`

#### Sync Payment Status
If payment status is incorrect after import, upload the same CSV to sync payment status for existing appointments.

**Endpoint:** `POST /api/appointments/sync-payment-status`

### Service Duration Defaults
Located in `/api/appointments.js` - `SERVICE_DURATIONS_FALLBACK`:
```javascript
{
  'cold plunge': 30, 'red light': 20, 'hbot': 60, 'infrared sauna': 45,
  'pemf': 30, 'massage': 45, 'somadome': 30, 'hocatt': 45, 'tour': 30,
  'lymphatic': 30
}
```

## Appointments Calendar

### Calendar View
**URL:** `/appointments`
**File:** `/views/appointments.html`

### Color Coding (Momence-style)
- **Green** (`#4ade80`): Paid appointments
- **Red** (`#ef4444`): Unpaid appointments
- **Gray** (`#6b7280`): Time blocks

### Database Schema Addition
The `appointments` table has an `is_time_block` boolean column (added via `database/init.js` on startup).

## Notes

- The frontend uses vanilla JavaScript (no React/Vue)
- HTML files in `/views` are served statically
- Client-side JS files in `/public/js/` handle interactivity
- The platform is multi-tenant; always check `tenant_id` in queries
- Railway deployment uses root directory `demo/expand health/v2`
- Health check endpoint: `/api/health` with 300s timeout

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

**Output Structure:**
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

**Engagement Plan Output Structure:**
```json
{
  "title": "Engagement Plan for [Client]",
  "protocol_coverage_checklist": {
    "supplements": [{ "name", "status", "weeks" }],
    "clinic_treatments": [{ "name", "status", "available_from", "condition" }],
    "lifestyle_protocols": [{ "name", "status", "weeks" }],
    "retests": [{ "name", "timing", "action" }]
  },
  "weekly_plan": [
    {
      "week": 1,
      "phase": "Core Protocol",
      "supplements_this_week": [{ "name", "timing", "notes" }],
      "clinic_treatments_this_week": [],
      "lifestyle_actions": [],
      "monitoring_checklist": [],
      "safety_reminders": [],
      "progress_goal": ""
    }
  ],
  "testing_schedule": [{ "test", "week", "action_sequence" }],
  "safety_rules": { "absolute_avoid", "conditional_rules", "monitoring_requirements", "warning_signs" },
  "alignment_self_check": { "all_supplements_included": true, ... }
}
```

**Generation Flow (in `/api/protocols.js`):**
1. Extract protocol elements from source
2. Generate engagement plan using aligned prompt
3. Validate alignment (check all items covered)
4. If validation fails: Regeneration loop (up to 2 attempts)
5. If still not aligned: Auto-fix fallback
6. Save to `engagement_plans` table

### Database Tables

**engagement_plans:**
```sql
- id, client_id, source_protocol_id
- title, plan_data (JSONB), validation_data (JSONB)
- created_by, created_at, updated_at
```

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

### API Endpoints
- `POST /api/integrations/:id/sync/appointments` - Sync appointments from Momence
- `POST /api/appointments/:id/sync-payment` - Sync payment status for single appointment
- `PUT /api/appointments/:id/note` - Save appointment note

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

**Save Dropdown Pattern:**
Used for both Protocols and Engagement Plans:
```html
<div class="save-dropdown">
  <button class="card-menu-item save-dropdown-trigger">Save</button>
  <div class="save-dropdown-menu">
    <button onclick="saveAsPdf(id)">Save as PDF</button>
    <button onclick="saveAsDoc(id)">Save as Word</button>
  </div>
</div>
```

---

## Deployment

### Git Branches
- `main` - Development branch
- `staging` - Production deployment (Railway watches this)

### Deploy to Production
```bash
git push origin main:staging
```

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

---

## Recent Changes Log

### January 2026
- **Engagement Plan Alignment System** - Strict protocol alignment with regeneration loop and auto-fix
- **Engagement Plan Compare Alignment Endpoint** - `/api/protocols/engagement-plans/:id/compare-alignment`
- **Appointment Panel Enhancement** - Client email, payment tags, timing/note tabs
- **Save Dropdown for Engagement Plans** - Matches protocol save dropdown pattern
- **Health Check Timeout** - Increased to 300 seconds for Railway deployments
