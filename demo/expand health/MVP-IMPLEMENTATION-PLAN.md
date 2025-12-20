# ExpandHealth MVP - Implementation Plan

**Start Date:** December 16, 2025
**Target Completion:** 8-10 weeks (Mid-February 2026)
**Approach:** MVP First - Core features only

---

## MVP Scope Confirmed

### ✅ In Scope (Priority Features)
1. **Enhanced Client Management** - Rich profiles, search, status tracking
2. **Labs & Tests** - PDF viewer, AI summaries, side-by-side notes
3. **Protocol Builder** - Modular editor, chat-style editing, context panels
4. **AI Knowledge Base** - Tags, categories, enhanced organization

### ✅ Supporting Features (Required for MVP)
5. **PostgreSQL Database** - Replace JSON files with scalable storage
6. **Authentication System** - User login, JWT tokens, role-based access
7. **Ask AI Chatbot** - Global assistant (already partially built)
8. **Notes Module (Basic)** - Quick notes widget, rich text editor

### ⏭️ Deferred to V2 (Post-MVP)
- Dynamic Forms Builder (complex)
- AI Scribe (real-time transcription)
- Engagement Plans with Email/SMS
- Staff Management
- Wearables (Oura integration)
- WhatsApp integration

---

## Development Strategy

### Parallel Development Approach
**Keep existing system running** while building V2 in a new folder:

```
demo/expand health/
├── [Current files - LIVE on Railway]
│   ├── server-simple.js
│   ├── dashboard.html
│   ├── patients.json
│   └── ...
│
└── v2/  [NEW - Development version]
    ├── server.js (new Express-based server)
    ├── database/
    │   ├── schema.sql
    │   └── migrations/
    ├── public/
    │   ├── css/
    │   ├── js/
    │   └── assets/
    ├── views/
    │   ├── clients.html
    │   ├── labs.html
    │   ├── protocols.html
    │   └── kb-admin.html
    └── api/
        ├── auth.js
        ├── clients.js
        ├── labs.js
        ├── protocols.js
        └── kb.js
```

**Benefits:**
- ✅ Current system stays live for users
- ✅ No risk of breaking production
- ✅ Easy to test V2 before switching
- ✅ Can migrate data when ready

---

## 8-Week Sprint Plan

### Week 1-2: Foundation
**Goal:** Database + Authentication + Core UI Framework

#### Tasks:
1. **PostgreSQL Setup** (Day 1-2)
   - Add PostgreSQL to Railway project
   - Design database schema (see below)
   - Create migration scripts
   - Test connection

2. **Express Server Setup** (Day 3-4)
   - Install Express.js
   - Set up middleware (CORS, body-parser, helmet)
   - Configure environment variables
   - Create API route structure

3. **Authentication System** (Day 5-7)
   - User registration/login endpoints
   - Password hashing (bcrypt)
   - JWT token generation/validation
   - Protected route middleware

4. **UI Framework** (Day 8-10)
   - Create base HTML template
   - Sidebar navigation
   - Header with user profile
   - Modal system (for dialogs)
   - Notification toasts
   - Loading states

**Deliverables:**
- ✅ PostgreSQL database with schema
- ✅ Express server with auth
- ✅ Login page
- ✅ Dashboard shell with navigation

---

### Week 3: Enhanced Clients Module
**Goal:** Rich client management with search, filters, profiles

#### Tasks:
1. **Clients Table View** (Day 11-13)
   - API: GET /api/clients (list with pagination)
   - API: POST /api/clients (create new)
   - API: DELETE /api/clients/:id
   - Table UI with sortable columns
   - Search functionality
   - Status badges (Enabled/Disabled)
   - Action buttons (View, Delete, More)

2. **Client Profile Pages** (Day 14-15)
   - API: GET /api/clients/:id (full profile)
   - API: PUT /api/clients/:id (update)
   - Profile view with tabs:
     - Overview (demographics, contact)
     - Labs & Tests
     - Protocols
     - Notes
   - Avatar upload
   - Edit mode

**Deliverables:**
- ✅ Full CRUD for clients
- ✅ Searchable client list
- ✅ Rich profile pages

---

### Week 4: Labs & Tests Enhancement
**Goal:** PDF viewer with AI summaries and side-by-side notes

#### Tasks:
1. **Labs API** (Day 16-17)
   - API: POST /api/clients/:id/labs (upload PDF)
   - API: GET /api/clients/:id/labs (list labs)
   - API: GET /api/labs/:id (get single lab)
   - API: DELETE /api/labs/:id
   - File storage (Railway persistent volumes or S3)
   - Gemini Vision extraction
   - Claude API summarization

2. **PDF Viewer UI** (Day 18-20)
   - Integrate PDF.js
   - Split-pane layout (PDF left, notes right)
   - AI summary display
   - Quick notes panel
   - Save notes to database
   - Print/Export functionality

**Deliverables:**
- ✅ PDF upload and storage
- ✅ In-browser PDF viewer
- ✅ AI-generated summaries
- ✅ Side-by-side note-taking

---

### Week 5-6: Protocol Builder Enhancement
**Goal:** Modular protocol editor with AI assistance

#### Tasks:
1. **Protocol Templates System** (Day 21-23)
   - API: GET /api/protocol-templates (list)
   - API: POST /api/protocol-templates (create)
   - API: PUT /api/protocol-templates/:id (update)
   - Template library UI
   - Template preview
   - Clone template functionality

2. **Protocol Generation API** (Day 24-26)
   - API: POST /api/protocols/generate
     - Input: patient ID, template IDs, notes IDs, prompt
     - Output: Generated protocol JSON
   - Claude API integration (enhanced prompt)
   - Structured output format (modules)
   - Save draft protocols

3. **Modular Protocol Editor** (Day 27-30)
   - Protocol editor UI with modules
   - Drag-and-drop module reordering (SortableJS)
   - Add module button
   - Delete module button
   - Edit module inline

4. **Chat-Style Editing** (Day 31-33)
   - Chat input at bottom of editor
   - AI editing commands:
     - "Remove L-theanine from supplements table"
     - "Add magnesium 400mg before bed"
     - "Change dosage to 200mg"
   - Apply edits to selected module
   - Edit history/undo

5. **Context Panels** (Day 34-36)
   - Split-screen layout
   - Toggle panels:
     - Lab results panel
     - Previous protocols panel
     - Notes panel
   - Load data from APIs
   - Minimize/maximize panels

**Deliverables:**
- ✅ Protocol template library
- ✅ AI protocol generation
- ✅ Modular drag-drop editor
- ✅ Chat-style editing
- ✅ Contextual reference panels

---

### Week 7: AI Knowledge Base Enhancement
**Goal:** Tagged, organized knowledge base with better UI

#### Tasks:
1. **Tagging System** (Day 37-39)
   - Database: Add tags table
   - Database: Add document_tags junction table
   - API: GET /api/kb/tags (list all tags)
   - API: POST /api/kb/documents (with tags)
   - API: GET /api/kb/documents?tag=X (filter by tag)
   - Predefined categories:
     - Cardiometabolic & Heart Health
     - Hormonal & Endocrine
     - Longevity & Healthy Ageing
     - Immune & Inflammation
     - Gut & Detox

2. **Enhanced Upload Modal** (Day 40-41)
   - Modal UI with:
     - File name input
     - Tag dropdown (multi-select)
     - Drag-and-drop file upload
     - Notes field
     - Preview before save
   - File validation (.pdf, .docx, .txt, .md)
   - Progress indicator

3. **KB Admin UI Improvements** (Day 42-43)
   - Tag filter chips
   - Color-coded tags
   - Enhanced table view
   - Batch operations (delete multiple)
   - Export KB to ZIP

**Deliverables:**
- ✅ Tag-based organization
- ✅ Enhanced upload experience
- ✅ Better KB browsing

---

### Week 8: Ask AI Chatbot + Polish
**Goal:** Global AI assistant + final testing

#### Tasks:
1. **Ask AI Chatbot** (Day 44-47)
   - Floating widget (bottom-left)
   - Chat UI component
   - API: POST /api/chat
     - Input: message, patient_id (optional)
     - Output: AI response
   - Context management:
     - Load patient data if patient_id provided
     - Load KB documents
     - Send to Claude API
   - Chat history per patient
   - Clear chat button

2. **Notes Module (Basic)** (Day 48-49)
   - API: POST /api/clients/:id/notes
   - API: GET /api/clients/:id/notes
   - Quick Notes floating widget (bottom-right)
   - Rich text editor (Quill.js)
   - Auto-save drafts
   - Note list on client profile

3. **Testing & Bug Fixes** (Day 50-52)
   - End-to-end testing
   - Cross-browser testing
   - Mobile responsiveness
   - Performance optimization
   - Security review
   - Documentation

4. **Migration & Deployment** (Day 53-56)
   - Data migration script (JSON → PostgreSQL)
   - Deploy V2 to Railway (new service)
   - Test on staging URL
   - Switch production URL to V2
   - Monitor for issues

**Deliverables:**
- ✅ Global AI assistant
- ✅ Quick notes feature
- ✅ Production-ready MVP
- ✅ Data migrated
- ✅ Deployed and live

---

## Database Schema

### Tables Overview

```sql
-- Users & Authentication
users
roles
user_roles

-- Clients (Patients)
clients
client_health_programs
client_biological_clock

-- Labs & Tests
labs
lab_notes

-- Protocols
protocol_templates
protocols
protocol_modules

-- Knowledge Base
kb_documents
kb_tags
kb_document_tags

-- Notes
notes

-- Chat History
chat_messages
```

### Detailed Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'enabled', -- enabled, disabled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- doctor, therapist, super_user, receptionist, nurse
  permissions JSONB -- {can_edit_kb: true, can_delete_clients: false, ...}
);

-- User roles junction
CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Clients (Patients) table
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  avatar_url VARCHAR(500),
  health_program_status BOOLEAN DEFAULT false, -- true = ✓, false = ✗
  biological_clock_enabled BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'enabled', -- enabled, disabled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Client metadata
CREATE TABLE client_metadata (
  client_id INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  personality_type VARCHAR(50), -- for engagement plans later
  financial_capability VARCHAR(50), -- low, medium, high
  lifestyle_notes TEXT,
  medical_history JSONB
);

-- Labs table
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  lab_type VARCHAR(100), -- blood_test, urine_test, genetic_test, etc.
  file_url VARCHAR(500) NOT NULL, -- PDF storage URL
  file_size INTEGER, -- bytes
  uploaded_date DATE,
  test_date DATE,
  ai_summary TEXT, -- Generated by Claude
  extracted_data JSONB, -- Gemini Vision extraction
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

-- Lab notes
CREATE TABLE lab_notes (
  id SERIAL PRIMARY KEY,
  lab_id INTEGER REFERENCES labs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Protocol templates
CREATE TABLE protocol_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- gut_health, hormone_optimization, etc.
  modules JSONB NOT NULL, -- [{type: 'supplements', content: {...}}, ...]
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Protocols (generated for clients)
CREATE TABLE protocols (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed
  modules JSONB NOT NULL, -- [{type: 'supplements', content: {...}}, ...]
  directional_prompt TEXT, -- The prompt used to generate this
  template_ids INTEGER[], -- Array of template IDs used
  note_ids INTEGER[], -- Array of note IDs referenced
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Protocol modules (if we want to store separately for editing history)
CREATE TABLE protocol_modules (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER REFERENCES protocols(id) ON DELETE CASCADE,
  module_order INTEGER NOT NULL,
  module_type VARCHAR(50) NOT NULL, -- supplements, lifestyle, nutrition, etc.
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base documents
CREATE TABLE kb_documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50), -- pdf, docx, txt, md
  file_size INTEGER,
  notes TEXT,
  content_text TEXT, -- Extracted text for search
  uploaded_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

-- KB tags
CREATE TABLE kb_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(20), -- hex color for UI
  category VARCHAR(100) -- Cardiometabolic, Hormonal, etc.
);

-- KB document tags junction
CREATE TABLE kb_document_tags (
  document_id INTEGER REFERENCES kb_documents(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES kb_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- Notes
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'quick_note', -- quick_note, consultation, observation
  is_consultation BOOLEAN DEFAULT false,
  consultation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Chat messages (for Ask AI)
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, -- NULL for general queries
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context_used JSONB, -- What data was used to answer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_labs_client_id ON labs(client_id);
CREATE INDEX idx_protocols_client_id ON protocols(client_id);
CREATE INDEX idx_protocols_status ON protocols(status);
CREATE INDEX idx_notes_client_id ON notes(client_id);
CREATE INDEX idx_chat_messages_client_id ON chat_messages(client_id);
CREATE INDEX idx_kb_documents_title ON kb_documents(title);
```

---

## Technology Stack

### Backend
- **Node.js** (v18+)
- **Express.js** (web framework)
- **PostgreSQL** (database)
- **pg** (PostgreSQL client)
- **bcrypt** (password hashing)
- **jsonwebtoken** (JWT auth)
- **helmet** (security headers)
- **cors** (cross-origin requests)
- **multer** (file uploads)
- **pdf-parse** (PDF text extraction)

### Frontend
- **Vanilla HTML/CSS/JavaScript** (keep it simple)
- **PDF.js** (PDF rendering)
- **Quill.js** (rich text editor)
- **SortableJS** (drag-and-drop)
- **Chart.js** (future charts/graphs)

### APIs
- **Claude API** (Anthropic) - Protocol generation, summaries, chat
- **Gemini API** (Google) - PDF extraction, knowledge base queries

### Deployment
- **Railway** (hosting + PostgreSQL)
- **Environment Variables** (secure config)

---

## File Structure (V2)

```
demo/expand health/v2/
├── package.json
├── .env
├── .gitignore
├── README.md
│
├── server.js                    # Main Express server
│
├── database/
│   ├── schema.sql               # Database schema
│   ├── migrations/              # Migration scripts
│   │   ├── 001_initial.sql
│   │   └── 002_add_indexes.sql
│   └── db.js                    # Database connection module
│
├── middleware/
│   ├── auth.js                  # JWT authentication middleware
│   ├── validation.js            # Request validation
│   └── errorHandler.js          # Error handling
│
├── api/
│   ├── auth.js                  # Auth endpoints (login, register)
│   ├── clients.js               # Client CRUD endpoints
│   ├── labs.js                  # Labs endpoints
│   ├── protocols.js             # Protocol endpoints
│   ├── kb.js                    # Knowledge base endpoints
│   ├── notes.js                 # Notes endpoints
│   └── chat.js                  # AI chat endpoints
│
├── services/
│   ├── claudeService.js         # Claude API wrapper
│   ├── geminiService.js         # Gemini API wrapper
│   ├── pdfService.js            # PDF processing
│   └── fileStorage.js           # File upload/storage
│
├── public/
│   ├── css/
│   │   ├── main.css             # Global styles
│   │   ├── sidebar.css          # Navigation
│   │   ├── tables.css           # Data tables
│   │   ├── modals.css           # Dialog boxes
│   │   └── components.css       # Reusable components
│   │
│   ├── js/
│   │   ├── app.js               # Main app logic
│   │   ├── auth.js              # Login/logout
│   │   ├── api.js               # API wrapper functions
│   │   ├── clients.js           # Client page logic
│   │   ├── labs.js              # Labs page logic
│   │   ├── protocols.js         # Protocols page logic
│   │   ├── kb.js                # KB page logic
│   │   ├── chat.js              # AI chatbot widget
│   │   └── utils.js             # Utility functions
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   └── lib/                     # Third-party libraries
│       ├── pdf.js
│       ├── quill.js
│       └── sortable.js
│
└── views/
    ├── login.html               # Login page
    ├── dashboard.html           # Main dashboard
    ├── clients.html             # Clients list
    ├── client-profile.html      # Single client view
    ├── labs.html                # Labs & tests
    ├── lab-viewer.html          # PDF viewer
    ├── protocols.html           # Protocol builder
    ├── protocol-templates.html  # Template library
    ├── kb-admin.html            # Knowledge base
    └── components/              # Reusable HTML components
        ├── sidebar.html
        ├── header.html
        ├── modal.html
        └── chat-widget.html
```

---

## Migration Strategy

### Phase 1: Set Up V2 (Week 1)
1. Create `/v2` folder
2. Initialize new Express project
3. Set up PostgreSQL on Railway
4. Run schema creation

### Phase 2: Develop V2 (Week 2-7)
1. Build all MVP features
2. Test thoroughly
3. Load sample data

### Phase 3: Data Migration (Week 8)
1. Write migration script:
   - Read existing `patients.json`
   - Read existing `kb-config.json`
   - Insert into PostgreSQL
2. Test migration on staging
3. Verify data integrity

### Phase 4: Cutover (Week 8)
1. Deploy V2 to new Railway service
2. Test on staging URL
3. Update domain to point to V2
4. Monitor for 24 hours
5. Archive V1 (keep as backup)

---

## Success Metrics

After 8 weeks, we should have:

### Functional Requirements ✅
- [ ] Users can log in securely
- [ ] Users can create, view, edit, delete clients
- [ ] Users can search and filter clients
- [ ] Users can upload lab PDFs and see AI summaries
- [ ] Users can view PDFs with side-by-side notes
- [ ] Users can generate protocols from templates
- [ ] Users can edit protocols with chat commands
- [ ] Users can view context panels while editing
- [ ] Users can upload KB documents with tags
- [ ] Users can search KB by tags
- [ ] Users can chat with AI assistant about patients
- [ ] Users can take quick notes on any page

### Non-Functional Requirements ✅
- [ ] Page load time < 2 seconds
- [ ] Database queries < 100ms
- [ ] Mobile-responsive UI
- [ ] Secure (HTTPS, JWT, password hashing)
- [ ] No data loss (PostgreSQL backups)
- [ ] Error handling and logging
- [ ] Documentation for all APIs

---

## Cost Breakdown (MVP)

### Infrastructure (Monthly)
- Railway Starter Plan: $5/month
- PostgreSQL (Railway): $5/month
- **Subtotal: $10/month**

### APIs (Monthly, assuming 50 patients)
- Claude API: ~$30-50/month
  - Protocol generation: ~$0.50 per protocol
  - AI summaries: ~$0.10 per summary
  - Chat: ~$0.05 per conversation
- Gemini API: FREE (PDF extraction, KB queries)
- **Subtotal: $30-50/month**

### **Total MVP Cost: $40-60/month**

(This will scale up as you add more patients and features)

---

## Risks & Mitigations

### Risk 1: Database Migration Fails
**Mitigation:**
- Keep V1 running during migration
- Test migration on staging first
- Have rollback plan ready

### Risk 2: Performance Issues with PDF Viewer
**Mitigation:**
- Use PDF.js lazy loading
- Limit file size to 10MB
- Compress PDFs before storage

### Risk 3: AI API Rate Limits
**Mitigation:**
- Implement request queuing
- Cache common responses
- Add retry logic with exponential backoff

### Risk 4: Scope Creep
**Mitigation:**
- Stick to MVP features only
- Document feature requests for V2
- Regular check-ins to stay on track

---

## Next Steps (This Week)

### Day 1 (Today): Database Setup
1. Add PostgreSQL to Railway project
2. Create `schema.sql` file
3. Test database connection
4. Run schema creation

### Day 2-3: Express Server
1. Create V2 folder structure
2. Install dependencies
3. Set up Express server
4. Create auth endpoints
5. Test with Postman

### Day 4-5: Login Page
1. Create login UI
2. Connect to auth API
3. Store JWT token
4. Test login flow

**By end of Week 1:** You'll have a working login system with database!

---

## Ready to Start?

I can begin building **immediately**. Here's what I'll do first:

1. ✅ Create the V2 folder structure
2. ✅ Set up package.json with dependencies
3. ✅ Create database schema file
4. ✅ Build Express server foundation
5. ✅ Set up authentication system

**Shall I start now?** 🚀

Just say "yes" and I'll begin with Phase 1: Foundation!
