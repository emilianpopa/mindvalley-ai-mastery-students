/**
 * Migration: Add Integrations Support
 *
 * Creates tables for managing external platform integrations (Momence, Practice Better, etc.)
 */

const db = require('../db');

async function up() {
  console.log('Running migration: add-integrations');

  // Create integrations table
  await db.query(`
    CREATE TABLE IF NOT EXISTS integrations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'disconnected',

      -- OAuth2 credentials (encrypted in production)
      client_id VARCHAR(255),
      client_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,

      -- Platform-specific config
      platform_host_id VARCHAR(255),
      platform_config JSONB DEFAULT '{}',

      -- Sync settings
      sync_clients BOOLEAN DEFAULT true,
      sync_appointments BOOLEAN DEFAULT true,
      sync_direction VARCHAR(20) DEFAULT 'bidirectional',
      last_sync_at TIMESTAMP WITH TIME ZONE,
      last_sync_status VARCHAR(20),
      last_sync_error TEXT,

      -- Metadata
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      CONSTRAINT integrations_platform_check CHECK (
        platform IN ('momence', 'practice_better', 'bookem', 'calendly', 'acuity')
      ),
      CONSTRAINT integrations_status_check CHECK (
        status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')
      ),
      CONSTRAINT integrations_sync_direction_check CHECK (
        sync_direction IN ('import_only', 'export_only', 'bidirectional')
      ),
      CONSTRAINT integrations_tenant_platform_unique UNIQUE (tenant_id, platform)
    );
  `);
  console.log('  Created integrations table');

  // Create client mappings table (links Expand clients to external platform members)
  await db.query(`
    CREATE TABLE IF NOT EXISTS integration_client_mappings (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      external_id VARCHAR(255) NOT NULL,
      external_data JSONB DEFAULT '{}',
      sync_status VARCHAR(20) DEFAULT 'synced',
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      CONSTRAINT client_mappings_sync_status_check CHECK (
        sync_status IN ('synced', 'pending', 'conflict', 'error')
      ),
      CONSTRAINT client_mappings_unique UNIQUE (integration_id, client_id),
      CONSTRAINT client_mappings_external_unique UNIQUE (integration_id, external_id)
    );
  `);
  console.log('  Created integration_client_mappings table');

  // Create appointment mappings table
  await db.query(`
    CREATE TABLE IF NOT EXISTS integration_appointment_mappings (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      appointment_type VARCHAR(50) NOT NULL,
      external_id VARCHAR(255) NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      external_client_id VARCHAR(255),

      -- Appointment details
      title VARCHAR(255),
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      status VARCHAR(30),
      location VARCHAR(255),
      notes TEXT,
      external_data JSONB DEFAULT '{}',

      -- Sync metadata
      sync_status VARCHAR(20) DEFAULT 'synced',
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      CONSTRAINT appointment_mappings_type_check CHECK (
        appointment_type IN ('session', 'appointment', 'class', 'event')
      ),
      CONSTRAINT appointment_mappings_sync_status_check CHECK (
        sync_status IN ('synced', 'pending', 'conflict', 'error')
      ),
      CONSTRAINT appointment_mappings_unique UNIQUE (integration_id, external_id)
    );
  `);
  console.log('  Created integration_appointment_mappings table');

  // Create sync log table
  await db.query(`
    CREATE TABLE IF NOT EXISTS integration_sync_logs (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      sync_type VARCHAR(30) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,

      -- Stats
      records_processed INTEGER DEFAULT 0,
      records_created INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,

      -- Details
      error_message TEXT,
      details JSONB DEFAULT '{}',

      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,

      CONSTRAINT sync_logs_type_check CHECK (
        sync_type IN ('clients', 'appointments', 'full', 'webhook')
      ),
      CONSTRAINT sync_logs_direction_check CHECK (
        direction IN ('import', 'export', 'bidirectional')
      ),
      CONSTRAINT sync_logs_status_check CHECK (
        status IN ('running', 'completed', 'failed', 'partial')
      )
    );
  `);
  console.log('  Created integration_sync_logs table');

  // Create indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
    CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

    CREATE INDEX IF NOT EXISTS idx_client_mappings_integration ON integration_client_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_client_mappings_client ON integration_client_mappings(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_mappings_external ON integration_client_mappings(external_id);

    CREATE INDEX IF NOT EXISTS idx_appointment_mappings_integration ON integration_appointment_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_appointment_mappings_client ON integration_appointment_mappings(client_id);
    CREATE INDEX IF NOT EXISTS idx_appointment_mappings_start ON integration_appointment_mappings(start_time);

    CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON integration_sync_logs(started_at DESC);
  `);
  console.log('  Created indexes');

  console.log('Migration complete: add-integrations');
}

async function down() {
  console.log('Rolling back migration: add-integrations');

  await db.query('DROP TABLE IF EXISTS integration_sync_logs CASCADE');
  await db.query('DROP TABLE IF EXISTS integration_appointment_mappings CASCADE');
  await db.query('DROP TABLE IF EXISTS integration_client_mappings CASCADE');
  await db.query('DROP TABLE IF EXISTS integrations CASCADE');

  console.log('Rollback complete: add-integrations');
}

// Run migration if called directly
if (require.main === module) {
  const action = process.argv[2] || 'up';

  if (action === 'up') {
    up().then(() => process.exit(0)).catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
  } else if (action === 'down') {
    down().then(() => process.exit(0)).catch(err => {
      console.error('Rollback failed:', err);
      process.exit(1);
    });
  }
}

module.exports = { up, down };
