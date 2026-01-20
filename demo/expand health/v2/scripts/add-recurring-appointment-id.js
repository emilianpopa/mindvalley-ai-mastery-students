/**
 * Migration: Add recurring_appointment_id to appointments table
 *
 * Run: node scripts/add-recurring-appointment-id.js
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
    console.log('🚀 Running migration: Add recurring_appointment_id to appointments...\n');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'appointments' AND column_name = 'recurring_appointment_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column recurring_appointment_id already exists in appointments table');
    } else {
      // Add recurring_appointment_id column
      console.log('📦 Adding recurring_appointment_id column...');
      await client.query(`
        ALTER TABLE appointments
        ADD COLUMN recurring_appointment_id INTEGER REFERENCES recurring_appointments(id) ON DELETE SET NULL
      `);
      console.log('   ✅ recurring_appointment_id column added');
    }

    // Create index (IF NOT EXISTS handles duplicates)
    console.log('📦 Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON appointments(recurring_appointment_id)
    `);
    console.log('   ✅ Index created');

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Migration complete!');
    console.log('\nAppointments can now be linked to recurring appointment patterns.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
