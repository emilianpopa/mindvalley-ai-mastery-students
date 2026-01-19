const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addServices() {
  const tenantId = 1;
  
  const services = [
    { name: 'HBOT2 90 min', duration: 112, price: 3000, color: '#3B82F6', category: 'Modalities' },
    { name: 'HBOT2 30 min', duration: 38, price: 1125, color: '#3B82F6', category: 'Modalities' },
    { name: 'HBOT2 60 min', duration: 72, price: 2250, color: '#3B82F6', category: 'Modalities' },
    { name: 'Lymphatic Drainage 60Min', duration: 45, price: 950, color: '#10B981', category: 'Massage' },
    { name: 'HBOT1 90 min', duration: 112, price: 3000, color: '#8B5CF6', category: 'Modalities' },
    { name: 'Back / Neck / Shoulder Massage 45 Min', duration: 30, price: 825, color: '#10B981', category: 'Massage' },
    { name: 'Oligoscan', duration: 10, price: 1200, color: '#3B82F6', category: 'Modalities' },
    { name: 'Theragun', duration: 15, price: 200, color: '#3B82F6', category: 'Modalities' },
    { name: 'Back / Neck / Shoulder Massage 30 Min', duration: 30, price: 550, color: '#10B981', category: 'Massage' },
    { name: 'Health Insights', duration: 72, price: 1950, color: '#3B82F6', category: 'Modalities' },
    { name: 'VO2 Max', duration: 45, price: 1200, color: '#3B82F6', category: 'Modalities' },
    { name: 'VO2max + In Body Scan', duration: 60, price: 1150, color: '#3B82F6', category: 'Modalities' },
    { name: 'Bulb Rife', duration: 30, price: 600, color: '#EF4444', category: 'Modalities' },
    { name: 'Rife', duration: 20, price: 350, color: '#3B82F6', category: 'Modalities' },
    { name: 'Follow up Consultation', duration: 30, price: 850, color: '#EF4444', category: 'Health Coach Consultations' },
    { name: 'Soul Collage', duration: 180, price: 750, color: '#8B5CF6', category: 'Events/Workshops' },
    { name: 'Consultation', duration: 60, price: 1700, color: '#EF4444', category: 'Health Coach Consultations' },
    { name: 'Meeting', duration: 30, price: 0, color: '#3B82F6', category: null },
    { name: 'Tour', duration: 45, price: 0, color: '#3B82F6', category: 'Modalities' },
    { name: 'In Body Scan', duration: 10, price: 150, color: '#3B82F6', category: 'Modalities' }
  ];

  // Clear existing services first
  await pool.query('DELETE FROM service_types WHERE tenant_id = $1', [tenantId]);
  console.log('Cleared existing services');

  for (const svc of services) {
    try {
      await pool.query(`
        INSERT INTO service_types (tenant_id, name, duration_minutes, price, color, is_active, buffer_before_minutes, buffer_after_minutes)
        VALUES ($1, $2, $3, $4, $5, true, 10, 10)
      `, [tenantId, svc.name, svc.duration, svc.price, svc.color]);
      console.log('Added:', svc.name);
    } catch (err) {
      console.error('Error adding', svc.name, err.message);
    }
  }
  
  const result = await pool.query('SELECT COUNT(*) FROM service_types WHERE tenant_id = $1', [tenantId]);
  console.log('Total services:', result.rows[0].count);
  
  await pool.end();
}

addServices();
