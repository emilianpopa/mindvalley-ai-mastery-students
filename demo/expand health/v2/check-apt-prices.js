const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  // Check appointments with their service types
  const result = await pool.query(`
    SELECT
      a.id,
      a.title,
      a.price as apt_price,
      a.service_type_id,
      st.name as service_name,
      st.price as service_price
    FROM appointments a
    LEFT JOIN service_types st ON a.service_type_id = st.id
    WHERE a.tenant_id = 2
    ORDER BY a.start_time DESC
    LIMIT 15
  `);

  console.log('Recent appointments with service prices:');
  result.rows.forEach(r => {
    console.log(`id=${r.id} | title="${r.title}" | apt_price=${r.apt_price} | svc_id=${r.service_type_id} | svc_name="${r.service_name}" | svc_price=${r.service_price}`);
  });

  await pool.end();
}

check();
