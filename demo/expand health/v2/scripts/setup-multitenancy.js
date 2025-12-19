/**
 * Setup Multi-Tenancy Script
 * Creates default tenant and configures platform admin
 *
 * Run: node scripts/setup-multitenancy.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function setupMultiTenancy() {
  const client = await pool.connect();

  try {
    console.log('🚀 Setting up multi-tenancy...\n');

    // 1. Check if tenants table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'tenants'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tenants table does not exist. Please run migration-multitenancy.sql first.');
      return;
    }

    // 2. Create default tenant
    console.log('📦 Creating default tenant...');
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, subscription_tier, kb_sharing_mode, status, settings)
      VALUES (
        'ExpandHealth Main',
        'expandhealth-main',
        '#0d9488',
        'enterprise',
        'hybrid',
        'active',
        '{"isDefault": true, "features": ["kb", "protocols", "labs", "forms", "chat"]}'::jsonb
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        settings = EXCLUDED.settings
      RETURNING id, name, slug;
    `);

    const tenant = tenantResult.rows[0];
    console.log(`   ✅ Tenant created: ${tenant.name} (${tenant.slug})`);

    // 3. Get first user and make them platform admin
    const userResult = await client.query(`
      SELECT id, email, first_name, last_name FROM users ORDER BY id LIMIT 1
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      await client.query(`
        UPDATE users
        SET tenant_id = $1, is_platform_admin = true
        WHERE id = $2
      `, [tenant.id, user.id]);

      console.log(`   ✅ Platform admin set: ${user.email}`);
    }

    // 4. Associate all users with default tenant
    const updateUsers = await client.query(`
      UPDATE users
      SET tenant_id = $1
      WHERE tenant_id IS NULL
      RETURNING id;
    `, [tenant.id]);
    console.log(`   ✅ ${updateUsers.rowCount} users associated with default tenant`);

    // 5. Associate existing data with default tenant
    const tables = ['clients', 'protocols', 'protocol_templates', 'kb_documents', 'labs', 'notes'];

    for (const table of tables) {
      try {
        const result = await client.query(`
          UPDATE ${table}
          SET tenant_id = $1
          WHERE tenant_id IS NULL
          RETURNING id;
        `, [tenant.id]);
        if (result.rowCount > 0) {
          console.log(`   ✅ ${result.rowCount} ${table} associated with default tenant`);
        }
      } catch (err) {
        // Table might not have tenant_id column yet, skip
        if (!err.message.includes('column "tenant_id" of relation')) {
          console.log(`   ⚠️ Could not update ${table}: ${err.message}`);
        }
      }
    }

    // 6. Create a second demo tenant (to show multi-tenancy)
    console.log('\n📦 Creating demo second tenant...');
    const tenant2Result = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, subscription_tier, kb_sharing_mode, status, settings)
      VALUES (
        'Partner Clinic Demo',
        'partner-clinic-demo',
        '#6366f1',
        'professional',
        'hybrid',
        'active',
        '{"isDemo": true}'::jsonb
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name
      RETURNING id, name, slug;
    `);
    const tenant2 = tenant2Result.rows[0];
    console.log(`   ✅ Demo tenant created: ${tenant2.name}`);

    // 7. Summary
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Multi-tenancy setup complete!\n');

    // Show all tenants
    const allTenants = await client.query('SELECT id, name, slug, kb_sharing_mode, status FROM tenants ORDER BY id');
    console.log('📋 Tenants:');
    console.table(allTenants.rows);

    // Show users
    const allUsers = await client.query(`
      SELECT u.id, u.email, u.is_platform_admin, t.name as tenant
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.id
    `);
    console.log('\n👥 Users:');
    console.table(allUsers.rows);

    console.log('\n💡 Next Steps:');
    console.log('   1. Log in as the platform admin');
    console.log('   2. Go to Admin → Tenants to manage clinics');
    console.log('   3. Create users in different clinics');
    console.log('   4. Configure KB sharing per clinic');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupMultiTenancy().catch(console.error);
