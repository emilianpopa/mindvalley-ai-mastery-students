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

    // Create a map for normalized name lookup
    const serviceMap = {};
    services.rows.forEach(s => {
      // Normalize: lowercase, collapse multiple spaces, trim
      const normalized = s.name.toLowerCase().replace(/\s+/g, ' ').trim();
      serviceMap[normalized] = s.id;
    });

    // Find appointments without service_type_id or where title doesn't match
    const appointments = await client.query(`
      SELECT id, title, service_type_id
      FROM appointments
      WHERE tenant_id = 2
        AND (service_type_id IS NULL OR title IS NOT NULL)
    `);

    console.log(`Processing ${appointments.rows.length} appointments...`);

    let updated = 0;
    let alreadyLinked = 0;
    let notFound = 0;

    for (const apt of appointments.rows) {
      if (!apt.title) continue;

      // Normalize the appointment title
      const normalizedTitle = apt.title.toLowerCase().replace(/\s+/g, ' ').trim();

      // Find matching service
      const serviceId = serviceMap[normalizedTitle];

      if (serviceId) {
        if (apt.service_type_id !== serviceId) {
          await client.query(
            'UPDATE appointments SET service_type_id = $1 WHERE id = $2',
            [serviceId, apt.id]
          );
          updated++;
          if (updated <= 20) {
            console.log(`Linked: "${apt.title}" -> service_type_id=${serviceId}`);
          }
        } else {
          alreadyLinked++;
        }
      } else {
        notFound++;
        if (notFound <= 10) {
          console.log(`No service found for: "${apt.title}"`);
        }
      }
    }

    console.log(`\nDone!`);
    console.log(`Updated: ${updated}`);
    console.log(`Already linked: ${alreadyLinked}`);
    console.log(`No matching service: ${notFound}`);

  } finally {
    client.release();
    await pool.end();
  }
}

linkAppointmentsToServices();
