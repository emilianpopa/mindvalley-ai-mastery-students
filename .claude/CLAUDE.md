# Expand Health AI Platform

**Owner:** Emilian Popa
**GitHub:** https://github.com/emilianpopa/expandhealthai
**Deployment:** Railway - https://railway.com/project/5d2b70a6-b4d5-4c5d-8f89-064ad32d4adb

## Overview

Expand Health AI is a comprehensive healthcare practice management platform with AI-powered features. It helps health practitioners manage clients, analyze labs, generate treatment protocols, and communicate with patients.

## Related Projects

This platform has multiple components:

| Project | Location | Purpose |
|---------|----------|---------|
| **Expand Health AI** (main) | `demo/expand health/v2/` | Full practice management platform |
| **BookMeet** | `C:/Dev/Mindvalley/bookmeet/` | Scheduling/booking system (Calendly-like) |

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (hosted on Railway)
- **Frontend:** Vanilla HTML/CSS/JavaScript, PDF.js, Quill.js, SortableJS
- **AI:** Claude API (Anthropic), Gemini API (Google)
- **Email:** Resend
- **Deployment:** Railway
- **Workflows:** N8N Cloud

## Project Structure

```
demo/expand health/v2/
├── server.js              # Main Express application
├── api/                   # RESTful API endpoints
│   ├── auth.js           # Authentication (JWT, OTP)
│   ├── clients.js        # Client/patient management
│   ├── appointments.js   # Appointment scheduling
│   ├── labs.js           # Lab results & PDF analysis
│   ├── protocols.js      # AI treatment protocol generation
│   ├── forms.js          # Intake forms & wellness scores
│   ├── notes.js          # Clinical notes
│   ├── chat.js           # AI assistant chat
│   ├── kb.js             # Knowledge base documents
│   ├── messages.js       # Patient messaging
│   ├── tasks.js          # Staff task management
│   └── ...
├── database/
│   ├── schema.sql        # PostgreSQL schema
│   ├── db.js             # Database connection
│   └── migrations/       # SQL migrations
├── middleware/
│   ├── auth.js           # JWT authentication
│   ├── tenant.js         # Multi-tenancy
│   └── auditMiddleware.js
├── public/               # Static assets (CSS, JS)
├── views/                # HTML pages
└── prompts/              # AI prompt templates
```

## Key Features

### Implemented
- **Client Management** - Rich patient profiles, search, filtering
- **Labs & Tests** - PDF viewer with AI summaries, side-by-side notes
- **Protocol Builder** - AI-assisted treatment plan generation
- **Wellness Scores** - Calculate and display health metrics from forms
- **Intake Forms** - Public forms with category detection
- **AI Knowledge Base** - Tagged, searchable clinical documents
- **Ask AI Chatbot** - Context-aware AI assistant
- **Quick Notes** - Floating note widget
- **Appointments** - Scheduling with Google Calendar integration
- **OTP Authentication** - Email-based login with Resend
- **Client Dashboard** - Patient-facing portal

### Recent Work (Jan 2026)
- Wellness scores calculation and display for form submissions
- Claude fallback for AI summary generation
- Improved category detection in form responses
- UI improvements (toast notifications, utility bars)
- Google Calendar integration for appointments
- OTP email improvements with better Resend logging

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create user
- `POST /api/auth/login` - Login with JWT
- `POST /api/auth/send-otp` - Send OTP email
- `POST /api/auth/verify-otp` - Verify OTP code

### Clients
- `GET /api/clients` - List clients (paginated, searchable)
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client profile
- `PUT /api/clients/:id` - Update client
- `GET /api/clients/:id/summary` - AI-generated client summary

### Labs
- `GET /api/clients/:id/labs` - Get client's labs
- `POST /api/clients/:id/labs` - Upload lab PDF
- `GET /api/labs/:id/summary` - Generate AI summary

### Forms
- `GET /api/forms` - List form templates
- `POST /api/forms/public/:id` - Submit public form
- `GET /api/forms/:id/responses` - Get form responses
- Wellness scores calculated on submission

### Protocols
- `GET /api/protocol-templates` - List templates
- `POST /api/protocols/generate` - Generate with AI
- `GET /api/clients/:id/protocols` - Client's protocols

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
ANTHROPIC_API_KEY=...      # Claude API
GEMINI_API_KEY=...         # Google AI
RESEND_API_KEY=...         # Email
PORT=3001
```

## Development

```bash
cd "demo/expand health/v2"
npm install
npm start
# Visit http://localhost:3001
```

## Deployment

Deployed on Railway with auto-deploy from GitHub. PostgreSQL database also on Railway.

```bash
# Deploy
git push expandhealthai main

# Or manually
railway up
```

## Debug Endpoints

- `/api/debug/calendar-state` - Check calendar sync
- `/api/debug/availability-test` - Test availability
- `/api/debug/resync-calendars` - Force calendar resync

## Git Remotes

```
origin          → https://github.com/8Dvibes/mindvalley-ai-mastery-students.git (course template)
expandhealthai  → https://github.com/emilianpopa/expandhealthai.git (production)
myfork          → https://github.com/emilianpopa/mindvalley-ai-mastery-students.git
```

Push to `expandhealthai` for production deployments.

## Known Issues / TODO

- [ ] Background job processing for reminders (BullMQ)
- [ ] SMS notifications
- [ ] Zoom integration
- [ ] Reschedule booking UI
- [ ] Enhanced protocol templates

## Brand Voice

Brand voice files in `brand-voice/` folder for Tyler Fisk communication style.
