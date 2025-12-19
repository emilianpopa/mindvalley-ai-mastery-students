# ExpandHealth V2 - Web Portal

Full-featured healthcare practice management platform with AI-powered protocol generation.

## Features

- **Client Management** - Rich patient profiles with search and filtering
- **Labs & Tests** - PDF viewer with AI summaries and side-by-side notes
- **Protocol Builder** - Modular AI-assisted treatment plan generation
- **AI Knowledge Base** - Tagged, searchable clinical protocols
- **Ask AI Chatbot** - Context-aware AI assistant for patient queries
- **Quick Notes** - Floating note-taking widget available everywhere

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** Vanilla HTML/CSS/JavaScript, PDF.js, Quill.js, SortableJS
- **AI:** Claude API (Anthropic), Gemini API (Google)
- **Deployment:** Railway

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Set Up Database
Create PostgreSQL database and run schema:
```bash
psql $DATABASE_URL < database/schema.sql
```

### 4. Start Server
```bash
npm start
```

Visit: http://localhost:3001

## Development

- **Server:** `server.js` - Main Express application
- **Database:** `database/schema.sql` - PostgreSQL schema
- **API Routes:** `api/` - RESTful endpoints
- **Frontend:** `views/` - HTML pages, `public/` - Assets

## Database Schema

See `database/schema.sql` for full schema.

**Main tables:**
- `users` - Authentication and user profiles
- `clients` - Patient records
- `labs` - Lab results and PDFs
- `protocols` - Treatment plans
- `kb_documents` - Knowledge base files
- `notes` - Clinical notes
- `chat_messages` - AI conversation history

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token

### Clients
- `GET /api/clients` - List all clients (paginated, searchable)
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get client profile
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Labs
- `GET /api/clients/:id/labs` - Get client's labs
- `POST /api/clients/:id/labs` - Upload new lab PDF
- `GET /api/labs/:id` - Get specific lab with AI summary
- `DELETE /api/labs/:id` - Delete lab

### Protocols
- `GET /api/protocol-templates` - List protocol templates
- `POST /api/protocols/generate` - Generate new protocol
- `GET /api/clients/:id/protocols` - Get client's protocols
- `PUT /api/protocols/:id` - Update protocol
- `POST /api/protocols/:id/edit` - Chat-style protocol editing

### Knowledge Base
- `GET /api/kb/documents` - List KB documents (filterable by tag)
- `POST /api/kb/documents` - Upload new document
- `GET /api/kb/tags` - List all tags
- `DELETE /api/kb/documents/:id` - Delete document

### Notes
- `GET /api/clients/:id/notes` - Get client's notes
- `POST /api/clients/:id/notes` - Create new note

### Chat
- `POST /api/chat` - Send message to AI assistant

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Protected routes require valid token
- Helmet.js for security headers
- CORS configured for specific origins

## Deployment to Railway

1. Create new Railway project
2. Add PostgreSQL database
3. Set environment variables
4. Deploy from GitHub or CLI:
```bash
railway up
```

## License

MIT
