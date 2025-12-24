/**
 * Tenant Separation Script
 *
 * This script:
 * 1. Creates "Expand Health South Africa" tenant
 * 2. Creates admin users for South Africa tenant
 * 3. Moves Momence-imported clients to South Africa tenant
 * 4. Renames existing tenant to "Test"
 *
 * Run on Railway: railway run node scripts/tenant-separation.js
 * Or add as a one-off command in Railway dashboard
 */

const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('=== TENANT SEPARATION SCRIPT ===\n');

  try {
    // Step 1: Query current state
    console.log('Step 1: Querying current state...\n');

    const tenants = await db.query('SELECT id, name, slug FROM tenants');
    console.log('Current Tenants:', JSON.stringify(tenants.rows, null, 2));

    const clients = await db.query(`
      SELECT c.id, c.first_name, c.last_name, c.email, c.tenant_id, c.created_at
      FROM clients c
      ORDER BY c.created_at
    `);
    console.log('\nCurrent Clients:', JSON.stringify(clients.rows, null, 2));

    const users = await db.query('SELECT id, email, first_name, last_name, tenant_id, roles FROM users');
    console.log('\nCurrent Users:', JSON.stringify(users.rows, null, 2));

    // Check for Momence integration mappings
    let momenceClientIds = [];
    try {
      const mappings = await db.query(`
        SELECT client_id FROM integration_client_mappings
        WHERE external_platform = 'momence'
      `);
      momenceClientIds = mappings.rows.map(r => r.client_id);
      console.log('\nMomence Client IDs:', momenceClientIds);
    } catch (e) {
      console.log('\nNo integration_client_mappings table found');
    }

    // Get current tenant (there should be one)
    if (tenants.rows.length === 0) {
      console.error('ERROR: No tenants found!');
      process.exit(1);
    }

    const currentTenant = tenants.rows[0];
    console.log('\n--- Current tenant:', currentTenant.name, '(id:', currentTenant.id, ')');

    // Step 2: Create South Africa tenant
    console.log('\n\nStep 2: Creating Expand Health South Africa tenant...');

    // Check if South Africa tenant already exists
    const existingSA = await db.query("SELECT id FROM tenants WHERE slug = 'expand-health-za'");
    let saTenantId;

    if (existingSA.rows.length > 0) {
      saTenantId = existingSA.rows[0].id;
      console.log('South Africa tenant already exists (id:', saTenantId, ')');
    } else {
      const saResult = await db.query(`
        INSERT INTO tenants (name, slug)
        VALUES ('Expand Health South Africa', 'expand-health-za')
        RETURNING id
      `);
      saTenantId = saResult.rows[0].id;
      console.log('Created South Africa tenant (id:', saTenantId, ')');
    }

    // Step 3: Create admin users for South Africa tenant
    console.log('\n\nStep 3: Creating admin users for South Africa tenant...');

    // Check if admin already exists
    const existingAdmin = await db.query(
      "SELECT id FROM users WHERE email = 'admin@expandhealth.co.za'"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('South Africa admin already exists');
    } else {
      const hashedPassword = await bcrypt.hash('ExpandHealth2024!', 10);
      await db.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, roles)
        VALUES ($1, 'admin@expandhealth.co.za', $2, 'Admin', 'SA', ARRAY['admin', 'practitioner'])
      `, [saTenantId, hashedPassword]);
      console.log('Created admin user: admin@expandhealth.co.za (password: ExpandHealth2024!)');
    }

    // Also create a practitioner account
    const existingPractitioner = await db.query(
      "SELECT id FROM users WHERE email = 'practitioner@expandhealth.co.za'"
    );

    if (existingPractitioner.rows.length > 0) {
      console.log('South Africa practitioner already exists');
    } else {
      const hashedPassword = await bcrypt.hash('ExpandHealth2024!', 10);
      await db.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, roles)
        VALUES ($1, 'practitioner@expandhealth.co.za', $2, 'Practitioner', 'SA', ARRAY['practitioner'])
      `, [saTenantId, hashedPassword]);
      console.log('Created practitioner user: practitioner@expandhealth.co.za (password: ExpandHealth2024!)');
    }

    // Step 4: Move Momence clients to South Africa tenant
    console.log('\n\nStep 4: Moving Momence-imported clients to South Africa tenant...');

    // Identify Momence clients by looking at the created_at timestamp
    // The original clients (test data) were created first, Momence imports came later
    // We'll identify them by checking if they have external IDs or by import batch

    // First, let's see the client distribution by created_at
    const clientsByDate = await db.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        string_agg(first_name || ' ' || last_name, ', ') as names
      FROM clients
      WHERE tenant_id = $1
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, [currentTenant.id]);

    console.log('\nClients by date:');
    clientsByDate.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.count} clients - ${row.names}`);
    });

    // If we have Momence mappings, use those
    if (momenceClientIds.length > 0) {
      const updateResult = await db.query(`
        UPDATE clients
        SET tenant_id = $1, updated_at = NOW()
        WHERE id = ANY($2)
        RETURNING id, first_name, last_name
      `, [saTenantId, momenceClientIds]);

      console.log('\nMoved clients via Momence mappings:', updateResult.rows.length);
      updateResult.rows.forEach(c => console.log(`  - ${c.first_name} ${c.last_name}`));

      // Also update the integration mappings
      await db.query(`
        UPDATE integration_client_mappings
        SET tenant_id = $1
        WHERE external_platform = 'momence'
      `, [saTenantId]);
    } else {
      // Alternative: Move clients that are NOT the original test clients
      // Original clients likely include: Chris Moore and 5-6 others created as test data
      // We'll keep clients with certain names as test clients

      const testClientNames = [
        'Chris Moore',
        'Test Client',
        'Demo User',
        'John Doe',
        'Jane Doe'
      ];

      // Get all clients except known test clients
      const nonTestClients = await db.query(`
        SELECT id, first_name, last_name, email
        FROM clients
        WHERE tenant_id = $1
        AND CONCAT(first_name, ' ', last_name) NOT IN (
          'Chris Moore', 'Test Client', 'Demo User', 'John Doe', 'Jane Doe'
        )
        AND email NOT LIKE '%test%'
        AND email NOT LIKE '%demo%'
      `, [currentTenant.id]);

      console.log('\nClients to move to South Africa:');
      nonTestClients.rows.forEach(c => console.log(`  - ${c.first_name} ${c.last_name} (${c.email})`));

      if (nonTestClients.rows.length > 0) {
        const clientIdsToMove = nonTestClients.rows.map(c => c.id);

        // Move clients
        await db.query(`
          UPDATE clients
          SET tenant_id = $1, updated_at = NOW()
          WHERE id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        // Move related data (protocols, labs, etc.)
        await db.query(`
          UPDATE protocols
          SET tenant_id = $1, updated_at = NOW()
          WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        await db.query(`
          UPDATE lab_results
          SET tenant_id = $1
          WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        await db.query(`
          UPDATE engagement_plans
          SET tenant_id = $1, updated_at = NOW()
          WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        console.log(`\nMoved ${clientIdsToMove.length} clients to South Africa tenant`);
      } else {
        console.log('\nNo clients to move (all appear to be test clients)');
      }
    }

    // Step 5: Rename existing tenant to Test
    console.log('\n\nStep 5: Renaming existing tenant to Test...');

    await db.query(`
      UPDATE tenants
      SET name = 'Test Tenant', slug = 'test'
      WHERE id = $1
    `, [currentTenant.id]);

    console.log(`Renamed "${currentTenant.name}" to "Test Tenant"`);

    // Step 6: Verify final state
    console.log('\n\n=== FINAL STATE ===\n');

    const finalTenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY id');
    console.log('Tenants:');
    finalTenants.rows.forEach(t => console.log(`  - ${t.name} (${t.slug}) [id: ${t.id}]`));

    const finalUsers = await db.query(`
      SELECT u.email, u.first_name, u.last_name, u.roles, t.name as tenant_name
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      ORDER BY t.id, u.email
    `);
    console.log('\nUsers:');
    finalUsers.rows.forEach(u => {
      console.log(`  - ${u.email} (${u.first_name} ${u.last_name}) - ${u.tenant_name} - ${u.roles.join(', ')}`);
    });

    const finalClients = await db.query(`
      SELECT c.first_name, c.last_name, c.email, t.name as tenant_name
      FROM clients c
      JOIN tenants t ON c.tenant_id = t.id
      ORDER BY t.id, c.last_name
    `);
    console.log('\nClients:');
    finalClients.rows.forEach(c => {
      console.log(`  - ${c.first_name} ${c.last_name} (${c.email}) - ${c.tenant_name}`);
    });

    console.log('\n=== TENANT SEPARATION COMPLETE ===');
    console.log('\nLogin credentials for South Africa tenant:');
    console.log('  Admin: admin@expandhealth.co.za / ExpandHealth2024!');
    console.log('  Practitioner: practitioner@expandhealth.co.za / ExpandHealth2024!');

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
