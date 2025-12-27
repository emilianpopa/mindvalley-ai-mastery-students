const { Pool } = require('pg');

// Use public URL for running locally, or DATABASE_URL for Railway
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:LHOzOWDEpqqpSXGjojvCUhxyObfmXuZO@metro.proxy.rlwy.net:36811/railway';
const pool = new Pool({ connectionString });

async function seedLocations() {
  try {
    console.log('Connecting to database...');

    // Get the ExpandHealth tenant ID
    const tenantResult = await pool.query("SELECT id FROM tenants WHERE slug = 'expand-health-za' OR slug = 'expandhealth' LIMIT 1");

    if (tenantResult.rows.length === 0) {
      console.error('ExpandHealth tenant not found');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log('Found tenant ID:', tenantId);

    // Check existing locations
    const existingResult = await pool.query('SELECT COUNT(*) FROM locations WHERE tenant_id = $1', [tenantId]);
    const existingCount = parseInt(existingResult.rows[0].count);
    console.log('Existing locations:', existingCount);

    const locations = [
      { name: '28 DeWolfe Street', is_primary: true },
      { name: 'Compression boot location', is_primary: false },
      { name: 'Consult Room 1', is_primary: false },
      { name: 'Consult Room 2', is_primary: false },
      { name: 'Consult Room 3', is_primary: false },
      { name: 'Drip Location', is_primary: false },
      { name: 'Event Space', is_primary: false },
      { name: 'HBOT', is_primary: false },
      { name: 'Hocatt + Massage', is_primary: false },
      { name: 'Ice bath 1', is_primary: false },
      { name: 'Ice bath 2', is_primary: false },
      { name: 'Infrared Sauna', is_primary: false },
      { name: 'PEMF', is_primary: false },
      { name: 'Reception / meeting space', is_primary: false },
      { name: 'Red Light Therapy Room', is_primary: false },
      { name: 'Somadome', is_primary: false },
      { name: 'Online', is_primary: false }
    ];

    let insertedCount = 0;
    for (const loc of locations) {
      // Check if location already exists
      const existsResult = await pool.query(
        'SELECT id FROM locations WHERE tenant_id = $1 AND name = $2',
        [tenantId, loc.name]
      );

      if (existsResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO locations (tenant_id, name, is_primary, is_active)
           VALUES ($1, $2, $3, true)`,
          [tenantId, loc.name, loc.is_primary]
        );
        console.log('  + Added:', loc.name);
        insertedCount++;
      } else {
        console.log('  - Exists:', loc.name);
      }
    }

    console.log(`\nDone! Inserted ${insertedCount} new locations.`);
    console.log(`Total locations: ${existingCount + insertedCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

seedLocations();
