const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteDuplicateAppointments() {
  const client = await pool.connect();
  try {
    // Find and delete duplicate appointments, keeping the one with the lowest ID
    // Duplicates are defined as same title, start_time, and client_id

    console.log('Finding duplicate appointments...');

    // First, let's see how many duplicates exist
    const countResult = await client.query(`
      SELECT COUNT(*) as total_duplicates FROM (
        SELECT id FROM appointments a
        WHERE tenant_id = 2
        AND EXISTS (
          SELECT 1 FROM appointments b
          WHERE b.tenant_id = a.tenant_id
            AND b.title = a.title
            AND b.start_time = a.start_time
            AND COALESCE(b.client_id, 0) = COALESCE(a.client_id, 0)
            AND b.id < a.id
        )
      ) duplicates
    `);

    console.log(`Found ${countResult.rows[0].total_duplicates} duplicate appointments to delete`);

    if (parseInt(countResult.rows[0].total_duplicates) === 0) {
      console.log('No duplicates found!');
      return;
    }

    // Delete duplicates, keeping the record with the lowest ID
    const deleteResult = await client.query(`
      DELETE FROM appointments a
      WHERE tenant_id = 2
      AND EXISTS (
        SELECT 1 FROM appointments b
        WHERE b.tenant_id = a.tenant_id
          AND b.title = a.title
          AND b.start_time = a.start_time
          AND COALESCE(b.client_id, 0) = COALESCE(a.client_id, 0)
          AND b.id < a.id
      )
    `);

    console.log(`Deleted ${deleteResult.rowCount} duplicate appointments`);

    // Verify remaining count
    const remaining = await client.query(`
      SELECT COUNT(*) FROM appointments WHERE tenant_id = 2
    `);
    console.log(`Remaining appointments: ${remaining.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

deleteDuplicateAppointments();
