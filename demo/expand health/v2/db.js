/**
 * Database Connection Module
 * PostgreSQL connection pool
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Run migrations on startup
async function runMigrations() {
  try {
    // Add file_data columns for PDF storage (if not exist)
    await pool.query(`
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS file_data BYTEA;
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100) DEFAULT 'application/pdf';
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
    `);
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.log('Migration note:', error.message);
  }
}

// Run migrations
runMigrations();

// Export query function
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
