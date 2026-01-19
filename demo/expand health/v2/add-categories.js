const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function addCategories() {
  const tenantId = 1;

  // 1. Create service_categories table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(20),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, name)
    )
  `);
  console.log('Created service_categories table');

  // 2. Add category_id to service_types if not exists
  const colCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'service_types' AND column_name = 'category_id'
  `);

  if (colCheck.rows.length === 0) {
    await pool.query(`ALTER TABLE service_types ADD COLUMN category_id INTEGER REFERENCES service_categories(id)`);
    console.log('Added category_id column to service_types');
  }

  // 3. Insert categories from Momence
  const categories = [
    { name: 'Modalities', color: '#3B82F6', sort_order: 1 },
    { name: 'Massage', color: '#10B981', sort_order: 2 },
    { name: 'Health Coach Consultations', color: '#EF4444', sort_order: 3 },
    { name: 'Events/Workshops', color: '#8B5CF6', sort_order: 4 }
  ];

  for (const cat of categories) {
    await pool.query(`
      INSERT INTO service_categories (tenant_id, name, color, sort_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id, name) DO UPDATE SET color = $3, sort_order = $4
    `, [tenantId, cat.name, cat.color, cat.sort_order]);
    console.log('Added category:', cat.name);
  }

  // 4. Get category IDs
  const catRows = await pool.query('SELECT id, name FROM service_categories WHERE tenant_id = $1', [tenantId]);
  const catMap = {};
  catRows.rows.forEach(r => catMap[r.name] = r.id);
  console.log('Category map:', catMap);

  // 5. Update services with their categories
  const serviceCategories = {
    'HBOT2 90 min': 'Modalities',
    'HBOT2 30 min': 'Modalities',
    'HBOT2 60 min': 'Modalities',
    'Lymphatic Drainage 60Min': 'Massage',
    'HBOT1 90 min': 'Modalities',
    'Back / Neck / Shoulder Massage 45 Min': 'Massage',
    'Oligoscan': 'Modalities',
    'Theragun': 'Modalities',
    'Back / Neck / Shoulder Massage 30 Min': 'Massage',
    'Health Insights': 'Modalities',
    'VO2 Max': 'Modalities',
    'VO2max + In Body Scan': 'Modalities',
    'Bulb Rife': 'Modalities',
    'Rife': 'Modalities',
    'Follow up Consultation': 'Health Coach Consultations',
    'Soul Collage': 'Events/Workshops',
    'Consultation': 'Health Coach Consultations',
    'Meeting': null,
    'Tour': 'Modalities',
    'In Body Scan': 'Modalities'
  };

  for (const [serviceName, categoryName] of Object.entries(serviceCategories)) {
    const categoryId = categoryName ? catMap[categoryName] : null;
    await pool.query(`
      UPDATE service_types SET category_id = $1 WHERE tenant_id = $2 AND name = $3
    `, [categoryId, tenantId, serviceName]);
    console.log(`Updated ${serviceName} -> ${categoryName || 'No Category'}`);
  }

  console.log('\nDone! Categories added and services updated.');
  await pool.end();
}

addCategories().catch(e => { console.error(e); process.exit(1); });
