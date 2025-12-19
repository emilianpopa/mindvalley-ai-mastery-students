/**
 * Check if labs table exists and show its structure
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkLabsTable() {
  try {
    console.log('🔍 Checking labs table...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'labs'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Labs table does NOT exist');
      console.log('\n💡 Run: node run-schema.js to create all tables');
      process.exit(1);
    }

    console.log('✅ Labs table exists\n');

    // Show table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'labs'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table structure:');
    console.table(columns.rows);

    // Count rows
    const count = await pool.query('SELECT COUNT(*) FROM labs');
    console.log(`\n📊 Total labs: ${count.rows[0].count}`);

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkLabsTable();
