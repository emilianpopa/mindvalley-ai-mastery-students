/**
 * Query current tenants, clients, and mappings
 * Run with: railway run node scripts/query-tenants.js
 */

const db = require('../database/db');

async function main() {
  try {
    // Get tenants
    const tenants = await db.query('SELECT id, name, slug FROM tenants');
    console.log('=== TENANTS ===');
    console.log(JSON.stringify(tenants.rows, null, 2));

    // Get clients with tenant info
    const clients = await db.query(`
      SELECT c.id, c.first_name, c.last_name, c.email, c.tenant_id, t.name as tenant_name,
             c.created_at
      FROM clients c
      LEFT JOIN tenants t ON c.tenant_id = t.id
      ORDER BY c.created_at
    `);
    console.log('\n=== CLIENTS ===');
    console.log(JSON.stringify(clients.rows, null, 2));

    // Check for integration mappings (Momence imports)
    try {
      const mappings = await db.query(`
        SELECT * FROM integration_client_mappings
        WHERE external_platform = 'momence'
      `);
      console.log('\n=== MOMENCE MAPPINGS ===');
      console.log(JSON.stringify(mappings.rows, null, 2));
    } catch (e) {
      console.log('\n=== MOMENCE MAPPINGS ===');
      console.log('Table may not exist or no mappings found');
    }

    // Get users (admins)
    const users = await db.query('SELECT id, email, first_name, last_name, tenant_id, roles FROM users');
    console.log('\n=== USERS ===');
    console.log(JSON.stringify(users.rows, null, 2));

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
