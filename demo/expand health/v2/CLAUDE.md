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

## Notes

- The frontend uses vanilla JavaScript (no React/Vue)
- HTML files in `/views` are served statically
- Client-side JS files in `/public/js/` handle interactivity
- The platform is multi-tenant; always check `tenant_id` in queries
