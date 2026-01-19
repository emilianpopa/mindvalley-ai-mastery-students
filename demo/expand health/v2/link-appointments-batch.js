const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function linkAppointmentsToServices() {
  const client = await pool.connect();

  try {
    // Get all service types
    const services = await client.query(
      'SELECT id, name FROM service_types WHERE tenant_id = 2'
    );

    console.log(`Found ${services.rows.length} service types`);

    // Update each service type's appointments in one batch query
    let totalUpdated = 0;

    for (const service of services.rows) {
      // Normalize: collapse multiple spaces to single space
      const normalizedName = service.name.toLowerCase().replace(/\s+/g, ' ').trim();

      // Update all appointments that match this service name (case insensitive, handling extra spaces)
      const result = await client.query(`
        UPDATE appointments
        SET service_type_id = $1
        WHERE tenant_id = 2
          AND service_type_id IS NULL
          AND LOWER(REGEXP_REPLACE(title, '\\s+', ' ', 'g')) = $2
      `, [service.id, normalizedName]);

      if (result.rowCount > 0) {
        console.log(`Updated ${result.rowCount} appointments for "${service.name}" (id=${service.id})`);
        totalUpdated += result.rowCount;
      }
    }

    // Also handle appointments that have service_type_id but point to wrong/deleted services
    const fixWrong = await client.query(`
      UPDATE appointments a
      SET service_type_id = st.id
      FROM service_types st
      WHERE a.tenant_id = 2
        AND st.tenant_id = 2
        AND LOWER(REGEXP_REPLACE(a.title, '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(st.name, '\\s+', ' ', 'g'))
        AND (a.service_type_id IS NULL OR a.service_type_id != st.id)
    `);

    console.log(`\nFixed ${fixWrong.rowCount} appointments with mismatched service_type_id`);
    totalUpdated += fixWrong.rowCount;

    console.log(`\nTotal updated: ${totalUpdated}`);

  } finally {
    client.release();
    await pool.end();
  }
}

linkAppointmentsToServices();
