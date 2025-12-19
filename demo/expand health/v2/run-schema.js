/**
 * Run database schema setup
 * This creates all tables and the default admin user
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('📊 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected! Reading schema file...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔧 Executing schema...');
    await client.query(schema);

    console.log('✅ Schema executed successfully!');
    console.log('');
    console.log('📋 Default admin user created:');
    console.log('   Email: admin@expandhealth.io');
    console.log('   Password: admin123');
    console.log('');
    console.log('🎉 Database setup complete!');

    client.release();
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error running schema:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runSchema();
