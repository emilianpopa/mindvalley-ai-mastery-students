const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const result = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@expandhealth.io'");
  console.log('Admin user:', result.rows);
  await pool.end();
}

check();
