-- ExpandHealth V2 Database Schema
-- PostgreSQL

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS lab_notes CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS kb_document_tags CASCADE;
DROP TABLE IF EXISTS kb_tags CASCADE;
DROP TABLE IF EXISTS kb_documents CASCADE;
DROP TABLE IF EXISTS protocol_modules CASCADE;
DROP TABLE IF EXISTS protocols CASCADE;
DROP TABLE IF EXISTS protocol_templates CASCADE;
DROP TABLE IF EXISTS labs CASCADE;
DROP TABLE IF EXISTS client_metadata CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Full system access', '{"all": true}'::jsonb),
('doctor', 'Can manage clients, protocols, KB', '{"clients": true, "protocols": true, "kb": true, "labs": true}'::jsonb),
('therapist', 'Can view clients and add notes', '{"clients": "read", "notes": true}'::jsonb),
('receptionist', 'Can manage appointments and basic client info', '{"clients": "basic"}'::jsonb);

-- ============================================
-- CLIENTS (PATIENTS)
-- ============================================

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  avatar_url VARCHAR(500),
  health_program_status BOOLEAN DEFAULT false,
  biological_clock_enabled BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE client_metadata (
  client_id INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  personality_type VARCHAR(50),
  financial_capability VARCHAR(50),
  lifestyle_notes TEXT,
  medical_history JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LABS & TESTS
-- ============================================

CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  lab_type VARCHAR(100),
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  uploaded_date DATE DEFAULT CURRENT_DATE,
  test_date DATE,
  ai_summary TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

CREATE TABLE lab_notes (
  id SERIAL PRIMARY KEY,
  lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- PROTOCOLS
-- ============================================

CREATE TABLE protocol_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE protocols (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  directional_prompt TEXT,
  template_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  note_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE protocol_modules (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  module_order INTEGER NOT NULL,
  module_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================

CREATE TABLE kb_documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  notes TEXT,
  content_text TEXT,
  uploaded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

CREATE TABLE kb_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(20),
  category VARCHAR(100)
);

CREATE TABLE kb_document_tags (
  document_id INTEGER REFERENCES kb_documents(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES kb_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- Insert default KB tags
INSERT INTO kb_tags (name, color, category) VALUES
('Cardiometabolic & Heart Health', '#9CA3AF', 'Cardiometabolic & Heart Health'),
('Hormonal & Endocrine', '#F87171', 'Hormonal & Endocrine'),
('Longevity & Healthy Ageing', '#FBBF24', 'Longevity & Healthy Ageing'),
('Immune & Inflammation', '#60A5FA', 'Immune & Inflammation'),
('Gut & Detox', '#34D399', 'Gut & Detox');

-- ============================================
-- NOTES
-- ============================================

CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'quick_note',
  is_consultation BOOLEAN DEFAULT false,
  consultation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- AI CHAT
-- ============================================

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context_used JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Clients
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_name ON clients(last_name, first_name);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- Labs
CREATE INDEX idx_labs_client_id ON labs(client_id);
CREATE INDEX idx_labs_test_date ON labs(test_date DESC);

-- Protocols
CREATE INDEX idx_protocols_client_id ON protocols(client_id);
CREATE INDEX idx_protocols_status ON protocols(status);
CREATE INDEX idx_protocols_created_at ON protocols(created_at DESC);

-- Protocol Templates
CREATE INDEX idx_protocol_templates_category ON protocol_templates(category);
CREATE INDEX idx_protocol_templates_public ON protocol_templates(is_public);

-- Notes
CREATE INDEX idx_notes_client_id ON notes(client_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Chat
CREATE INDEX idx_chat_messages_client_id ON chat_messages(client_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- KB Documents
CREATE INDEX idx_kb_documents_title ON kb_documents(title);
CREATE INDEX idx_kb_documents_created_at ON kb_documents(created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_kb_documents_content_text ON kb_documents USING gin(to_tsvector('english', content_text));
CREATE INDEX idx_notes_content ON notes USING gin(to_tsvector('english', content));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_protocol_templates_updated_at BEFORE UPDATE ON protocol_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON protocols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_metadata_updated_at BEFORE UPDATE ON client_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Create default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO users (email, password_hash, first_name, last_name, status) VALUES
('admin@expandhealth.io', '$2b$10$rGqH9p7XfQE7Z6ZJQyP3.eYvB8YLh6HqQY8vK0X7gN3yJ5cZ8tZ4S', 'Admin', 'User', 'enabled');

-- Assign super_admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@expandhealth.io' AND r.name = 'super_admin';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'ExpandHealth V2 database schema created successfully!';
    RAISE NOTICE 'Default admin user: admin@expandhealth.io / admin123';
    RAISE NOTICE 'Please change the admin password after first login.';
END $$;
