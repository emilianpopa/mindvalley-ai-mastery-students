const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const services = await pool.query('SELECT id, name, tenant_id FROM service_types LIMIT 5');
    console.log('Services:', services.rows);

    const users = await pool.query('SELECT id, email, tenant_id FROM users LIMIT 5');
    console.log('Users:', users.rows);

    const admin = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@expandhealth.io'");
    console.log('Admin user:', admin.rows);

    const tenants = await pool.query('SELECT id, name FROM tenants LIMIT 3');
    console.log('Tenants:', tenants.rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
