-- ExpandHealth V2 Multi-Tenancy Migration
-- This script adds multi-tenant support to the existing schema
-- Run this AFTER the initial schema.sql

-- ============================================
-- NEW TABLES FOR MULTI-TENANCY
-- ============================================

-- Tenants (Clinics)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  primary_color VARCHAR(20) DEFAULT '#0d9488',
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_tier VARCHAR(50) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  kb_sharing_mode VARCHAR(20) DEFAULT 'private' CHECK (kb_sharing_mode IN ('private', 'shared', 'hybrid')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Tenant Invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- System Modules (for granular permissions)
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0
);

-- Role-Module Permissions
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE(role_id, module_id)
);

-- Tenant KB Collections (for proprietary documents)
CREATE TABLE IF NOT EXISTS tenant_kb_collections (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  gemini_store_id VARCHAR(255),
  is_shared BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Audit Log (track admin actions)
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ALTER EXISTING TABLES (Add tenant_id)
-- ============================================

-- Users table modifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- Protocols table
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- Protocol Templates table
ALTER TABLE protocol_templates ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- Labs table
ALTER TABLE labs ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- KB Documents table
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES tenant_kb_collections(id);
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- Chat Messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- ============================================
-- INDEXES FOR TENANT QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(is_platform_admin) WHERE is_platform_admin = true;
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_protocols_tenant ON protocols(tenant_id);
CREATE INDEX IF NOT EXISTS idx_protocol_templates_tenant ON protocol_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_labs_tenant ON labs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_tenant ON kb_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_global ON kb_documents(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_notes_tenant ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- INSERT DEFAULT MODULES
-- ============================================

INSERT INTO modules (name, display_name, description, icon, sort_order) VALUES
  ('dashboard', 'Dashboard', 'View dashboard and analytics', 'chart-bar', 1),
  ('clients', 'Clients', 'Manage client records', 'users', 2),
  ('protocols', 'Protocols', 'Create and manage treatment protocols', 'clipboard-list', 3),
  ('labs', 'Lab Results', 'Upload and view lab results', 'beaker', 4),
  ('kb', 'Knowledge Base', 'Manage knowledge base documents', 'book-open', 5),
  ('chat', 'AI Assistant', 'Use AI chat assistant', 'chat', 6),
  ('admin', 'Administration', 'Access admin settings', 'cog', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- UPDATE ROLES WITH MODULE PERMISSIONS
-- ============================================

-- Add clinic_admin role if not exists
INSERT INTO roles (name, description, permissions) VALUES
  ('clinic_admin', 'Clinic administrator with full clinic access', '{"clinic_admin": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Set up default module permissions for existing roles
-- Super Admin - full access to everything
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Clinic Admin - full access except admin module
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'clinic_admin' AND m.name != 'admin'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Doctor - access to clinical modules
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM roles r, modules m
WHERE r.name = 'doctor' AND m.name IN ('dashboard', 'clients', 'protocols', 'labs', 'kb', 'chat')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Therapist - view clients, add notes
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id,
  CASE WHEN m.name IN ('dashboard', 'clients', 'chat') THEN true ELSE false END,
  CASE WHEN m.name IN ('clients') THEN true ELSE false END,
  false, false
FROM roles r, modules m
WHERE r.name = 'therapist'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Receptionist - basic client access
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id,
  CASE WHEN m.name IN ('dashboard', 'clients') THEN true ELSE false END,
  false, false, false
FROM roles r, modules m
WHERE r.name = 'receptionist'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ============================================
-- CREATE DEFAULT TENANT AND MIGRATE EXISTING DATA
-- ============================================

-- Create a default tenant for existing data
INSERT INTO tenants (name, slug, settings, subscription_tier, kb_sharing_mode)
VALUES ('ExpandHealth Demo', 'expandhealth-demo', '{"demo": true}'::jsonb, 'enterprise', 'shared')
ON CONFLICT (slug) DO NOTHING;

-- Get the default tenant ID
DO $$
DECLARE
  default_tenant_id INTEGER;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'expandhealth-demo';

  -- Update existing users to belong to default tenant (if not already set)
  UPDATE users SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Mark the first admin as platform admin
  UPDATE users SET is_platform_admin = true
  WHERE email = 'admin@expandhealth.io';

  -- Update existing clients
  UPDATE clients SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing protocols
  UPDATE protocols SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing protocol templates
  UPDATE protocol_templates SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing labs
  UPDATE labs SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing KB documents
  UPDATE kb_documents SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing notes
  UPDATE notes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Update existing chat messages
  UPDATE chat_messages SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Create default KB collection for the tenant
  INSERT INTO tenant_kb_collections (tenant_id, name, description, is_global)
  VALUES (default_tenant_id, 'Global Knowledge Base', 'Shared ExpandHealth medical knowledge', true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Migration complete! Default tenant ID: %', default_tenant_id;
END $$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Note: RLS policies use current_setting('app.current_tenant_id')
-- This must be set by the application before queries

-- Clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_clients ON clients
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- Protocols RLS
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_protocols ON protocols
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- Labs RLS
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_labs ON labs
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- KB Documents RLS (with global document support)
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_kb_documents ON kb_documents
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR is_global = true
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- Notes RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notes ON notes
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- Chat Messages RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_chat_messages ON chat_messages
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id INTEGER, p_is_platform_admin BOOLEAN DEFAULT false)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.is_platform_admin', p_is_platform_admin::text, false);
END;
$$ LANGUAGE plpgsql;

-- Function to generate URL-friendly slug
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Multi-tenancy migration completed!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  - tenants';
  RAISE NOTICE '  - tenant_invitations';
  RAISE NOTICE '  - modules';
  RAISE NOTICE '  - role_module_permissions';
  RAISE NOTICE '  - tenant_kb_collections';
  RAISE NOTICE '  - audit_log';
  RAISE NOTICE '';
  RAISE NOTICE 'Existing tables modified with tenant_id';
  RAISE NOTICE 'Row Level Security policies applied';
  RAISE NOTICE 'Default tenant created: expandhealth-demo';
  RAISE NOTICE '=========================================';
END $$;
