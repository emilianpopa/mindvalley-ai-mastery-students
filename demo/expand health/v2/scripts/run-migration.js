/**
 * Run Multi-Tenancy Migration
 * Creates all required tables and columns for multi-tenancy
 *
 * Run: node scripts/run-migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running multi-tenancy migration...\n');

    // 1. Create tenants table
    console.log('📦 Creating tenants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        logo_url VARCHAR(500),
        primary_color VARCHAR(20) DEFAULT '#0d9488',
        settings JSONB DEFAULT '{}'::jsonb,
        subscription_tier VARCHAR(50) DEFAULT 'starter',
        kb_sharing_mode VARCHAR(20) DEFAULT 'private',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);
    console.log('   ✅ tenants table created');

    // 2. Create tenant_invitations table
    console.log('📦 Creating tenant_invitations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_invitations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role_id INTEGER,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);
    console.log('   ✅ tenant_invitations table created');

    // 3. Create modules table
    console.log('📦 Creating modules table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        sort_order INTEGER DEFAULT 0
      )
    `);
    console.log('   ✅ modules table created');

    // 4. Create role_module_permissions table
    console.log('📦 Creating role_module_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_module_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER,
        module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        UNIQUE(role_id, module_id)
      )
    `);
    console.log('   ✅ role_module_permissions table created');

    // 5. Create tenant_kb_collections table
    console.log('📦 Creating tenant_kb_collections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_kb_collections (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        gemini_store_id VARCHAR(255),
        is_shared BOOLEAN DEFAULT false,
        is_global BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);
    console.log('   ✅ tenant_kb_collections table created');

    // 6. Create audit_log table
    console.log('📦 Creating audit_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ audit_log table created');

    // 7. Add columns to users table
    console.log('📦 Adding columns to users table...');
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER`);
      console.log('   ✅ users.tenant_id added');
    } catch (e) { console.log('   ⚠️ users.tenant_id:', e.message.substring(0, 50)); }

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false`);
      console.log('   ✅ users.is_platform_admin added');
    } catch (e) { console.log('   ⚠️ users.is_platform_admin:', e.message.substring(0, 50)); }

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100)`);
      console.log('   ✅ users.job_title added');
    } catch (e) { console.log('   ⚠️ users.job_title:', e.message.substring(0, 50)); }

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
      console.log('   ✅ users.phone added');
    } catch (e) { console.log('   ⚠️ users.phone:', e.message.substring(0, 50)); }

    // 8. Add tenant_id to other tables
    const tablesToModify = ['clients', 'protocols', 'protocol_templates', 'labs', 'kb_documents', 'notes'];
    for (const table of tablesToModify) {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id INTEGER`);
        console.log(`   ✅ ${table}.tenant_id added`);
      } catch (e) {
        console.log(`   ⚠️ ${table}.tenant_id: ${e.message.substring(0, 50)}`);
      }
    }

    // 9. Add is_global to kb_documents
    try {
      await client.query(`ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false`);
      console.log('   ✅ kb_documents.is_global added');
    } catch (e) { console.log('   ⚠️ kb_documents.is_global:', e.message.substring(0, 50)); }

    // 10. Insert default modules
    console.log('📦 Inserting default modules...');
    await client.query(`
      INSERT INTO modules (name, display_name, description, icon, sort_order) VALUES
        ('dashboard', 'Dashboard', 'View dashboard and analytics', 'chart-bar', 1),
        ('clients', 'Clients', 'Manage client records', 'users', 2),
        ('protocols', 'Protocols', 'Create and manage treatment protocols', 'clipboard-list', 3),
        ('labs', 'Lab Results', 'Upload and view lab results', 'beaker', 4),
        ('forms', 'Forms', 'Build and manage intake forms', 'document', 5),
        ('kb', 'Knowledge Base', 'Manage AI knowledge base', 'book-open', 6),
        ('chat', 'AI Chat', 'Use AI assistant', 'chat-alt', 7),
        ('users', 'Users', 'Manage user accounts', 'user-group', 8),
        ('settings', 'Settings', 'Configure system settings', 'cog', 9)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('   ✅ Default modules inserted');

    // 11. Create default tenant
    console.log('\n📦 Setting up default tenant...');
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, subscription_tier, kb_sharing_mode, status, settings)
      VALUES (
        'ExpandHealth Main',
        'expandhealth-main',
        '#0d9488',
        'enterprise',
        'hybrid',
        'active',
        '{"isDefault": true}'::jsonb
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `);
    const tenant = tenantResult.rows[0];
    console.log(`   ✅ Default tenant: ${tenant.name} (ID: ${tenant.id})`);

    // 12. Make first user platform admin
    const userResult = await client.query('SELECT id, email FROM users ORDER BY id LIMIT 1');
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      await client.query(`
        UPDATE users SET tenant_id = $1, is_platform_admin = true WHERE id = $2
      `, [tenant.id, user.id]);
      console.log(`   ✅ Platform admin: ${user.email}`);
    }

    // 13. Associate all users with default tenant
    await client.query('UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL', [tenant.id]);
    console.log('   ✅ All users associated with default tenant');

    // 14. Associate existing data
    for (const table of tablesToModify) {
      try {
        const result = await client.query(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`, [tenant.id]);
        if (result.rowCount > 0) {
          console.log(`   ✅ ${result.rowCount} ${table} records updated`);
        }
      } catch (e) {
        // Ignore
      }
    }

    // 15. Create indexes
    console.log('\n📦 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_protocols_tenant ON protocols(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_kb_documents_tenant ON kb_documents(tenant_id)'
    ];
    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (e) {
        // Ignore
      }
    }
    console.log('   ✅ Indexes created');

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Migration complete!\n');

    // Show result
    const tenants = await client.query('SELECT id, name, slug, kb_sharing_mode FROM tenants');
    console.log('📋 Tenants:');
    console.table(tenants.rows);

    const users = await client.query(`
      SELECT u.id, u.email, u.is_platform_admin as "platformAdmin", t.name as tenant
      FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id
    `);
    console.log('\n👥 Users:');
    console.table(users.rows);

    console.log('\n💡 Refresh the Admin page to see your clinic!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
