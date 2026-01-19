const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function revertAppointmentTimes() {
  const client = await pool.connect();

  try {
    console.log('Reverting appointment times (adding 2 hours back)...');

    const result = await client.query(`
      UPDATE appointments
      SET
        start_time = start_time + INTERVAL '2 hours',
        end_time = end_time + INTERVAL '2 hours'
      WHERE tenant_id = 2
    `);

    console.log(`Updated ${result.rowCount} appointments`);

    // Verify a sample
    const sample = await client.query(`
      SELECT id, title, start_time, end_time
      FROM appointments
      WHERE id = 31852
    `);

    if (sample.rows[0]) {
      console.log('\nSample appointment 31852:');
      console.log('  start_time (UTC):', sample.rows[0].start_time);
      console.log('  In SAST (+2):', new Date(sample.rows[0].start_time).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

revertAppointmentTimes();
