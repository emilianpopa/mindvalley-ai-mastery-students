const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedAppointments() {
  try {
    // Get staff members
    const staff = await pool.query('SELECT id, first_name, last_name FROM staff WHERE tenant_id = 1 AND is_active = true');
    console.log('Staff members:', staff.rows.map(s => `${s.id}: ${s.first_name} ${s.last_name}`));

    // Get services
    const services = await pool.query('SELECT id, name, price, duration_minutes FROM service_types WHERE tenant_id = 1 LIMIT 10');
    console.log('\nServices:', services.rows.map(s => `${s.id}: ${s.name}`));

    // Get or create a test client
    let clientResult = await pool.query("SELECT id FROM clients WHERE tenant_id = 1 AND email = 'test.client@example.com'");
    let clientId;

    if (clientResult.rows.length === 0) {
      const newClient = await pool.query(`
        INSERT INTO clients (tenant_id, first_name, last_name, email, phone)
        VALUES (1, 'Test', 'Client', 'test.client@example.com', '+27123456789')
        RETURNING id
      `);
      clientId = newClient.rows[0].id;
      console.log('\nCreated test client with ID:', clientId);
    } else {
      clientId = clientResult.rows[0].id;
      console.log('\nUsing existing test client ID:', clientId);
    }

    // Create appointments for different staff members
    const appointments = [
      // Avela Jafta (id: 4) - HBOT appointments
      { staff_id: 4, service_id: 91, date: '2026-02-25', time: '09:00', status: 'confirmed' },
      { staff_id: 4, service_id: 91, date: '2026-02-25', time: '10:15', status: 'confirmed' },
      { staff_id: 4, service_id: 89, date: '2026-02-23', time: '09:00', status: 'completed' },
      { staff_id: 4, service_id: 89, date: '2026-02-23', time: '10:15', status: 'completed' },
      { staff_id: 4, service_id: 91, date: '2026-02-27', time: '09:00', status: 'confirmed' },
      { staff_id: 4, service_id: 91, date: '2026-02-27', time: '10:00', status: 'confirmed' },

      // Karrin Bamber (id: 11) - HBOT appointments
      { staff_id: 11, service_id: 89, date: '2026-02-25', time: '11:00', status: 'confirmed' },
      { staff_id: 11, service_id: 91, date: '2026-02-26', time: '14:00', status: 'confirmed' },

      // Dr Melody Fourie (id: 8) - Consultations
      { staff_id: 8, service_id: 105, date: '2026-02-25', time: '10:00', status: 'confirmed' },
      { staff_id: 8, service_id: 103, date: '2026-02-25', time: '11:30', status: 'confirmed' },
      { staff_id: 8, service_id: 99, date: '2026-02-26', time: '09:00', status: 'confirmed' },

      // Chantel Newmark (id: 6) - Massage
      { staff_id: 6, service_id: 97, date: '2026-02-25', time: '09:00', status: 'confirmed' },
      { staff_id: 6, service_id: 94, date: '2026-02-25', time: '10:00', status: 'confirmed' },
      { staff_id: 6, service_id: 92, date: '2026-02-25', time: '11:00', status: 'confirmed' },

      // Jack Harland (id: 9) - Rife
      { staff_id: 9, service_id: 102, date: '2026-02-25', time: '09:20', status: 'confirmed' },
      { staff_id: 9, service_id: 101, date: '2026-02-25', time: '10:40', status: 'confirmed' },
    ];

    let created = 0;
    for (const apt of appointments) {
      // Get service details
      const serviceInfo = await pool.query('SELECT name, price, duration_minutes FROM service_types WHERE id = $1', [apt.service_id]);
      if (serviceInfo.rows.length === 0) continue;

      const service = serviceInfo.rows[0];
      const startTime = new Date(`${apt.date}T${apt.time}:00`);
      const endTime = new Date(startTime.getTime() + (service.duration_minutes || 60) * 60000);

      // Check if appointment already exists
      const existing = await pool.query(
        `SELECT id FROM appointments WHERE staff_id = $1 AND start_time = $2`,
        [apt.staff_id, startTime]
      );

      if (existing.rows.length > 0) {
        console.log(`Skipping existing appointment: ${service.name} at ${apt.date} ${apt.time}`);
        continue;
      }

      await pool.query(`
        INSERT INTO appointments (
          tenant_id, client_id, staff_id, service_type_id,
          start_time, end_time, status, price, title, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        1,
        clientId,
        apt.staff_id,
        apt.service_id,
        startTime,
        endTime,
        apt.status,
        service.price,
        service.name,
        'unpaid'
      ]);

      created++;
      console.log(`Created: ${service.name} for staff ${apt.staff_id} at ${apt.date} ${apt.time}`);
    }

    console.log(`\nDone! Created ${created} appointments.`);

    // Show appointments for Avela
    const avelaAppts = await pool.query(`
      SELECT a.id, st.name as service, a.start_time, a.status, a.price
      FROM appointments a
      JOIN service_types st ON a.service_type_id = st.id
      WHERE a.staff_id = 4
      ORDER BY a.start_time
    `);
    console.log('\n=== Avela Jafta Appointments ===');
    avelaAppts.rows.forEach(a => {
      console.log(`${a.service} | ${a.start_time} | ${a.status} | R${a.price}`);
    });

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedAppointments();
