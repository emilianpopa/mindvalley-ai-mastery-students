/**
 * Database Initialization Module
 * Runs migrations on startup to ensure schema is up to date
 */

const db = require('./db');

/**
 * Initialize the audit_logs table for HIPAA compliance
 */
async function initAuditLogs() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        event_id UUID DEFAULT gen_random_uuid() NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_category VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        resource_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        action_description TEXT,
        previous_values JSONB,
        new_values JSONB,
        changed_fields TEXT[],
        contains_phi BOOLEAN DEFAULT false,
        phi_types TEXT[],
        request_method VARCHAR(10),
        request_path TEXT,
        request_query JSONB,
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT audit_logs_event_type_check CHECK (
            event_type IN ('access', 'create', 'update', 'delete', 'export', 'login', 'logout', 'failed_login', 'share')
        )
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_contains_phi ON audit_logs(contains_phi) WHERE contains_phi = true;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';
  `;

  const createViewSQL = `
    CREATE OR REPLACE VIEW phi_access_log AS
    SELECT
        al.event_id,
        al.created_at,
        al.user_email,
        al.user_role,
        al.ip_address,
        al.event_type,
        al.action,
        al.resource_type,
        al.resource_id,
        al.resource_name,
        al.phi_types,
        al.status
    FROM audit_logs al
    WHERE al.contains_phi = true
    ORDER BY al.created_at DESC;
  `;

  try {
    // Create table
    await db.query(createTableSQL);
    console.log('✅ audit_logs table ready');

    // Create indexes
    await db.query(createIndexesSQL);
    console.log('✅ audit_logs indexes ready');

    // Create view
    await db.query(createViewSQL);
    console.log('✅ phi_access_log view ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize audit_logs:', error.message);
    return false;
  }
}

/**
 * Initialize encryption support for PHI fields
 */
async function initEncryption() {
  const addColumnsSQL = `
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS dob_hash VARCHAR(64);
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_phone_hash VARCHAR(64);
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_clients_dob_hash ON clients(dob_hash);
    CREATE INDEX IF NOT EXISTS idx_clients_emergency_phone_hash ON clients(emergency_phone_hash);
  `;

  const createMetadataSQL = `
    CREATE TABLE IF NOT EXISTS encryption_metadata (
        id SERIAL PRIMARY KEY,
        key_version INTEGER DEFAULT 1,
        algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rotated_at TIMESTAMP WITH TIME ZONE,
        notes TEXT
    );
  `;

  const insertMetadataSQL = `
    INSERT INTO encryption_metadata (key_version, notes)
    SELECT 1, 'Initial encryption key'
    WHERE NOT EXISTS (SELECT 1 FROM encryption_metadata WHERE key_version = 1);
  `;

  try {
    await db.query(addColumnsSQL);
    console.log('✅ Encryption columns ready');

    await db.query(createIndexesSQL);
    console.log('✅ Encryption indexes ready');

    await db.query(createMetadataSQL);
    await db.query(insertMetadataSQL);
    console.log('✅ Encryption metadata ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize encryption:', error.message);
    return false;
  }
}

/**
 * Run all database initializations
 */
async function initDatabase() {
  console.log('\n🔄 Initializing database schema...');

  try {
    // Initialize audit logs table
    await initAuditLogs();

    // Initialize encryption support
    await initEncryption();

    console.log('✅ Database initialization complete\n');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

module.exports = {
  initDatabase,
  initAuditLogs,
  initEncryption
};
