/**
 * Seed Momence Service Prices
 * Imports service pricing from Momence into ExpandHealth
 *
 * Run with: node seed-momence-prices.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Service pricing data from Momence screenshots
const services = [
  // Page 1
  { name: 'HBOT2 90 min', price: 3000.00, duration: 112, category: 'Modalities' },
  { name: 'HBOT2 30 min', price: 1125.00, duration: 38, category: 'Modalities' },
  { name: 'HBOT2 60 min', price: 2250.00, duration: 72, category: 'Modalities' },
  { name: 'Lymphatic Drainage 60Min', price: 950.00, duration: 45, category: 'Massage' },
  { name: 'HBOT1 90 min', price: 3000.00, duration: 112, category: 'Modalities' },
  { name: 'Back / Neck / Shoulder Massage 45 Min', price: 825.00, duration: 30, category: 'Massage' },
  { name: 'Oligoscan', price: 1200.00, duration: 10, category: 'Modalities' },
  { name: 'Theragun', price: 200.00, duration: 15, category: 'Modalities' },
  { name: 'Back / Neck / Shoulder Massage 30 Min', price: 550.00, duration: 30, category: 'Massage' },
  { name: 'Health Insights', price: 1950.00, duration: 72, category: 'Modalities' },
  { name: 'VO2 Max', price: 1200.00, duration: 45, category: 'Modalities' },
  { name: 'VO2max + In Body Scan', price: 1150.00, duration: 60, category: 'Modalities' },
  { name: 'Bulb Rife', price: 600.00, duration: 30, category: 'Modalities' },
  { name: 'Rife', price: 350.00, duration: 20, category: 'Modalities' },
  { name: 'Follow up Consultation', price: 850.00, duration: 30, category: 'Health Coach Consultations' },
  { name: 'Soul Collage', price: 750.00, duration: 180, category: 'Events/Workshops' },
  { name: 'Consultation', price: 1700.00, duration: 60, category: 'Health Coach Consultations' },
  { name: 'Meeting', price: 0.00, duration: 30, category: null },
  { name: 'Tour', price: 0.00, duration: 45, category: 'Modalities' },
  { name: 'In Body Scan', price: 150.00, duration: 10, category: 'Modalities' },

  // Page 2
  { name: '30 min Massage', price: 400.00, duration: 30, category: null },
  { name: 'Hot Cold (Cold plunge+Infra Red Sauna)', price: 550.00, duration: 35, category: 'Modalities' },
  { name: 'Massage Targetted Area 45 Min', price: 600.00, duration: 45, category: 'Massage' },
  { name: 'Lymphatic Drainage 90 Min', price: 1200.00, duration: 90, category: 'Massage' },
  { name: 'Swedish Massage 90 Min', price: 1450.00, duration: 90, category: 'Massage' },
  { name: 'Reflex Foot Massage 60 Min', price: 950.00, duration: 60, category: 'Massage' },
  { name: 'Deep Tissue Massage 90 Min', price: 1050.00, duration: 90, category: 'Massage' },
  { name: 'Deep Tissue Massage 60 Min', price: 1150.00, duration: 60, category: 'Massage' },
  { name: 'Cold Plunge Sea View', price: 150.00, duration: 3, category: 'Modalities' },
  { name: 'Sports Massage 90 Min', price: 1050.00, duration: 90, category: 'Massage' },
  { name: 'Sports Massage 60 Min', price: 1150.00, duration: 60, category: 'Massage' },
  { name: 'Cold Plunge City View', price: 150.00, duration: 3, category: 'Modalities' },
  { name: 'Infrared Sauna', price: 500.00, duration: 30, category: 'Modalities' },
  { name: 'Swedish Massage 60 Min', price: 950.00, duration: 60, category: 'Massage' },
  { name: 'PEMF', price: 300.00, duration: 12, category: 'Modalities' },
  { name: 'HBOT1 60 min', price: 2250.00, duration: 72, category: 'Modalities' },
  { name: 'HBOT1 30 min', price: 1125.00, duration: 38, category: 'Modalities' },
  { name: 'Hocatt Ozone + PEMF', price: 650.00, duration: 20, category: 'Modalities' },
  { name: 'Hocatt Ozone Steam Sauna', price: 500.00, duration: 20, category: 'Modalities' },
  { name: 'Lymphatic Drainage Compression boots', price: 150.00, duration: 20, category: 'Modalities' },

  // Page 3
  { name: 'Somadome', price: 150.00, duration: 20, category: 'Modalities' },
  { name: 'Red Light Therapy', price: 500.00, duration: 20, category: 'Modalities' },
];

async function seedPrices() {
  const client = await pool.connect();

  try {
    // Get tenant ID
    const tenantResult = await client.query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      console.error('No tenant found!');
      return;
    }
    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant ID: ${tenantId}`);

    // Get category IDs
    const catResult = await client.query(
      'SELECT id, name FROM service_categories WHERE tenant_id = $1',
      [tenantId]
    );
    const categoryMap = {};
    catResult.rows.forEach(row => {
      categoryMap[row.name] = row.id;
    });
    console.log('Category map:', categoryMap);

    let created = 0;
    let updated = 0;

    for (const service of services) {
      const categoryId = service.category ? categoryMap[service.category] : null;

      // Check if service exists
      const existing = await client.query(
        'SELECT id FROM service_types WHERE tenant_id = $1 AND name = $2',
        [tenantId, service.name]
      );

      if (existing.rows.length > 0) {
        // Update existing service
        await client.query(`
          UPDATE service_types
          SET price = $1, duration_minutes = $2, category_id = $3, category = $4, updated_at = NOW()
          WHERE id = $5
        `, [service.price, service.duration, categoryId, service.category, existing.rows[0].id]);
        updated++;
        console.log(`Updated: ${service.name} -> ZAR ${service.price.toFixed(2)}`);
      } else {
        // Insert new service
        await client.query(`
          INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
        `, [tenantId, service.name, service.price, service.duration, categoryId, service.category]);
        created++;
        console.log(`Created: ${service.name} -> ZAR ${service.price.toFixed(2)}`);
      }
    }

    console.log(`\nDone! Created: ${created}, Updated: ${updated}`);

  } finally {
    client.release();
    await pool.end();
  }
}

seedPrices().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
