const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixAppointmentTimes() {
  const client = await pool.connect();

  try {
    // The appointments were imported with times treated as UTC when they were actually SAST (UTC+2)
    // So 7:45 AM SAST was stored as 7:45 AM UTC, which displays as 9:45 AM SAST
    // We need to subtract 2 hours from all appointment times

    console.log('Fixing appointment times (subtracting 2 hours to correct for SAST timezone)...');

    const result = await client.query(`
      UPDATE appointments
      SET
        start_time = start_time - INTERVAL '2 hours',
        end_time = end_time - INTERVAL '2 hours'
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
      console.log('  start_time:', sample.rows[0].start_time);
      console.log('  end_time:', sample.rows[0].end_time);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

fixAppointmentTimes();
