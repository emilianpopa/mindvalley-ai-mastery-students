const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const services = await pool.query('SELECT id, name, category_id FROM service_types WHERE tenant_id = 1 ORDER BY id LIMIT 10');
    console.log('Services with category_id:');
    services.rows.forEach(s => console.log('  ', s.id, s.name.substring(0,30), '| cat:', s.category_id));

    const cats = await pool.query('SELECT id, name FROM service_categories WHERE tenant_id = 1');
    console.log('\nCategories:', cats.rows);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
