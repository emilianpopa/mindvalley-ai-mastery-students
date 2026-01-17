/**
 * Database Initialization Module
 * Runs migrations on startup to ensure schema is up to date
 */

const db = require('./db');
const { initBookingDatabase } = require('./booking-init');

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
 * Initialize scheduled_messages table for client check-ins
 */
async function initScheduledMessages() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS scheduled_messages (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL,
        message_content TEXT NOT NULL,
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        message_type VARCHAR(30) DEFAULT 'check_in',
        engagement_plan_id INTEGER REFERENCES protocols(id) ON DELETE SET NULL,
        phase_number INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT scheduled_messages_channel_check CHECK (
            channel IN ('whatsapp', 'email', 'sms')
        ),
        CONSTRAINT scheduled_messages_status_check CHECK (
            status IN ('pending', 'sent', 'failed', 'cancelled')
        ),
        CONSTRAINT scheduled_messages_type_check CHECK (
            message_type IN ('check_in', 'phase_start', 'reminder', 'follow_up', 'custom')
        )
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_client ON scheduled_messages(client_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_engagement ON scheduled_messages(engagement_plan_id);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ Scheduled messages table ready');

    await db.query(createIndexesSQL);
    console.log('✅ Scheduled messages indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize scheduled_messages:', error.message);
    return false;
  }
}

/**
 * Initialize integrations tables for external platform sync
 */
async function initIntegrations() {
  const createIntegrationsTableSQL = `
    CREATE TABLE IF NOT EXISTS integrations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'disconnected',
      client_id VARCHAR(255),
      client_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      platform_host_id VARCHAR(255),
      platform_config JSONB DEFAULT '{}',
      sync_clients BOOLEAN DEFAULT true,
      sync_appointments BOOLEAN DEFAULT true,
      sync_direction VARCHAR(20) DEFAULT 'bidirectional',
      last_sync_at TIMESTAMP WITH TIME ZONE,
      last_sync_status VARCHAR(20),
      last_sync_error TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT integrations_platform_check CHECK (
        platform IN ('momence', 'practice_better', 'bookem', 'calendly', 'acuity')
      ),
      CONSTRAINT integrations_status_check CHECK (
        status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')
      ),
      CONSTRAINT integrations_tenant_platform_unique UNIQUE (tenant_id, platform)
    );
  `;

  const createClientMappingsSQL = `
    CREATE TABLE IF NOT EXISTS integration_client_mappings (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      external_id VARCHAR(255) NOT NULL,
      external_data JSONB DEFAULT '{}',
      sync_status VARCHAR(20) DEFAULT 'synced',
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT client_mappings_unique UNIQUE (integration_id, client_id),
      CONSTRAINT client_mappings_external_unique UNIQUE (integration_id, external_id)
    );
  `;

  const createAppointmentMappingsSQL = `
    CREATE TABLE IF NOT EXISTS integration_appointment_mappings (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      appointment_type VARCHAR(50) NOT NULL,
      external_id VARCHAR(255) NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      external_client_id VARCHAR(255),
      title VARCHAR(255),
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      status VARCHAR(30),
      location VARCHAR(255),
      notes TEXT,
      external_data JSONB DEFAULT '{}',
      sync_status VARCHAR(20) DEFAULT 'synced',
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT appointment_mappings_unique UNIQUE (integration_id, external_id)
    );
  `;

  const createSyncLogsSQL = `
    CREATE TABLE IF NOT EXISTS integration_sync_logs (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      sync_type VARCHAR(30) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      records_processed INTEGER DEFAULT 0,
      records_created INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      error_message TEXT,
      details JSONB DEFAULT '{}',
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
    CREATE INDEX IF NOT EXISTS idx_client_mappings_integration ON integration_client_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_client_mappings_client ON integration_client_mappings(client_id);
    CREATE INDEX IF NOT EXISTS idx_appointment_mappings_integration ON integration_appointment_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
  `;

  try {
    await db.query(createIntegrationsTableSQL);
    console.log('✅ integrations table ready');

    await db.query(createClientMappingsSQL);
    console.log('✅ integration_client_mappings table ready');

    await db.query(createAppointmentMappingsSQL);
    console.log('✅ integration_appointment_mappings table ready');

    await db.query(createSyncLogsSQL);
    console.log('✅ integration_sync_logs table ready');

    await db.query(createIndexesSQL);
    console.log('✅ integration indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize integrations:', error.message);
    return false;
  }
}

/**
 * Initialize staff_tasks table for internal to-do list
 */
async function initStaffTasks() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff_tasks (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      assigned_to INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      assigned_to_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      send_reminder BOOLEAN DEFAULT false,
      reminder_sent BOOLEAN DEFAULT false,
      reminder_time TIMESTAMP,
      completed_at TIMESTAMP,
      completed_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id)
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_tenant ON staff_tasks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to_user ON staff_tasks(assigned_to_user);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_client ON staff_tasks(client_id);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_appointment ON staff_tasks(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON staff_tasks(created_at DESC);
  `;

  const createTriggerSQL = `
    CREATE OR REPLACE FUNCTION update_staff_tasks_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_staff_tasks_updated_at ON staff_tasks;
    CREATE TRIGGER update_staff_tasks_updated_at BEFORE UPDATE ON staff_tasks
        FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ staff_tasks table ready');

    await db.query(createIndexesSQL);
    console.log('✅ staff_tasks indexes ready');

    await db.query(createTriggerSQL);
    console.log('✅ staff_tasks trigger ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize staff_tasks:', error.message);
    return false;
  }
}

/**
 * Initialize messages table for inbox/communication
 */
async function initMessages() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL DEFAULT 'email',
        direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
        subject VARCHAR(500),
        content TEXT NOT NULL,
        to_email VARCHAR(255),
        to_phone VARCHAR(50),
        from_email VARCHAR(255),
        from_phone VARCHAR(50),
        status VARCHAR(30) DEFAULT 'sent',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        sent_by INTEGER REFERENCES users(id),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT messages_channel_check CHECK (channel IN ('email', 'sms', 'in-app', 'whatsapp')),
        CONSTRAINT messages_direction_check CHECK (direction IN ('inbound', 'outbound'))
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
    CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ messages table ready');

    await db.query(createIndexesSQL);
    console.log('✅ messages indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize messages:', error.message);
    return false;
  }
}

/**
 * Initialize protocols AI summary column
 */
async function initProtocolsAISummary() {
  const addColumnSQL = `
    ALTER TABLE protocols ADD COLUMN IF NOT EXISTS ai_summary TEXT;
  `;

  try {
    await db.query(addColumnSQL);
    console.log('✅ Protocols ai_summary column ready');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize protocols ai_summary:', error.message);
    return false;
  }
}

/**
 * Initialize lab_notes table for storing notes on lab results
 */
async function initLabNotes() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS lab_notes (
      id SERIAL PRIMARY KEY,
      lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id)
    );
  `;

  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_lab_notes_lab_id ON lab_notes(lab_id);
  `;

  try {
    await db.query(createTableSQL);
    await db.query(createIndexSQL);
    console.log('✅ lab_notes table ready');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize lab_notes:', error.message);
    return false;
  }
}

/**
 * Initialize time block support for appointments
 */
async function initTimeBlocks() {
  const addColumnSQL = `
    ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS is_time_block BOOLEAN DEFAULT false;
  `;

  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_appointments_is_time_block ON appointments(is_time_block);
  `;

  try {
    await db.query(addColumnSQL);
    await db.query(createIndexSQL);
    console.log('✅ Time block support ready');
  } catch (error) {
    if (error.code === '42701') {
      // Column already exists
      console.log('✅ Time block column already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Run all database initializations
 */
async function initDatabase() {
  console.log('\n🔄 Initializing database schema...');

  try {
    // Initialize protocols AI summary column
    await initProtocolsAISummary();

    // Initialize lab_notes table
    await initLabNotes();

    // Initialize audit logs table
    await initAuditLogs();

    // Initialize encryption support
    await initEncryption();

    // Initialize scheduled messages table
    await initScheduledMessages();

    // Initialize integrations tables
    await initIntegrations();

    // Initialize booking system tables
    await initBookingDatabase();

    // Initialize messages/inbox table
    await initMessages();

    // Initialize staff tasks table
    await initStaffTasks();

    // Initialize time block support
    await initTimeBlocks();

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
  initEncryption,
  initScheduledMessages,
  initIntegrations,
  initMessages,
  initStaffTasks,
  initProtocolsAISummary,
  initLabNotes,
  initTimeBlocks
};
