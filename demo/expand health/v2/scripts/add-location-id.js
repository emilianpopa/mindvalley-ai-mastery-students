/**
 * Migration: Add location_id to appointments table
 *
 * Run: node scripts/add-location-id.js
 *
 * Or with explicit DATABASE_URL:
 * DATABASE_URL="postgresql://..." node scripts/add-location-id.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running migration: Add location_id to appointments...\n');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'appointments' AND column_name = 'location_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column location_id already exists in appointments table');
    } else {
      // Add location_id column
      console.log('📦 Adding location_id column...');
      await client.query(`
        ALTER TABLE appointments
        ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
      `);
      console.log('   ✅ location_id column added');
    }

    // Create index (IF NOT EXISTS handles duplicates)
    console.log('📦 Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id)
    `);
    console.log('   ✅ Index created');

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Migration complete!');
    console.log('\nThe venue availability feature is now ready to use.');
    console.log('Appointments can now be assigned to specific locations/rooms.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
