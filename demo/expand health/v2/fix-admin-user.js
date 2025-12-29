const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Use public URL for running locally, or DATABASE_URL for Railway
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:LHOzOWDEpqqpSXGjojvCUhxyObfmXuZO@metro.proxy.rlwy.net:36811/railway';
const pool = new Pool({ connectionString });

async function fixAdminUser() {
  try {
    // Check existing users
    const users = await pool.query('SELECT id, email, status FROM users LIMIT 10');
    console.log('Existing users:', users.rows);

    // Check if admin user exists
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@expandhealth.io'");

    if (adminCheck.rows.length === 0) {
      console.log('Admin user not found, creating...');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Get or create tenant
      let tenantId;
      const tenantCheck = await pool.query("SELECT id FROM tenants WHERE slug = 'expandhealth'");
      if (tenantCheck.rows.length === 0) {
        const newTenant = await pool.query(
          "INSERT INTO tenants (name, slug, status) VALUES ('ExpandHealth', 'expandhealth', 'active') RETURNING id"
        );
        tenantId = newTenant.rows[0].id;
        console.log('Created tenant:', tenantId);
      } else {
        tenantId = tenantCheck.rows[0].id;
        console.log('Using existing tenant:', tenantId);
      }

      // Create admin user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status, tenant_id, is_platform_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email`,
        ['admin@expandhealth.io', hashedPassword, 'Admin', 'User', 'admin', 'active', tenantId, true]
      );
      console.log('Created admin user:', result.rows[0]);
    } else {
      console.log('Admin user exists:', adminCheck.rows[0].email);
      // Update password only (keep status as 'enabled')
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "UPDATE users SET password_hash = $1 WHERE email = 'admin@expandhealth.io'",
        [hashedPassword]
      );
      console.log('Updated admin password');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixAdminUser();
