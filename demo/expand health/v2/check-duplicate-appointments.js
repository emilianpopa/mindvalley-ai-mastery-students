const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
  const client = await pool.connect();
  try {
    // Find appointments with same title, start_time, client for tenant 2
    const result = await client.query(`
      SELECT title, start_time, client_id, COUNT(*) as count
      FROM appointments
      WHERE tenant_id = 2
      GROUP BY title, start_time, client_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('Duplicate appointments found:', result.rows.length);
    result.rows.forEach(row => {
      console.log(`  "${row.title}" at ${row.start_time} - ${row.count} duplicates`);
    });

    // Get total count
    const total = await client.query(`
      SELECT COUNT(*) FROM appointments WHERE tenant_id = 2
    `);
    console.log('\nTotal appointments for tenant 2:', total.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

checkDuplicates();
