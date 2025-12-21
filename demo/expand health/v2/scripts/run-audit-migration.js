/**
 * HIPAA Audit Logs Migration
 * Creates the audit_logs table for HIPAA compliance
 *
 * Run: node scripts/run-audit-migration.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔒 Running HIPAA Audit Logs Migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'create_audit_logs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verifying table creation...');

    // Verify table exists
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ audit_logs table created with columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️ Table may not have been created properly');
    }

    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'audit_logs'
    `);

    console.log('\n📊 Indexes created:');
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });

    console.log('\n' + '═'.repeat(50));
    console.log('✅ HIPAA Audit Logging is now enabled!');
    console.log('\nAPI Endpoints:');
    console.log('   GET  /api/audit/logs      - View all audit logs');
    console.log('   GET  /api/audit/phi-access - View PHI access logs');
    console.log('   GET  /api/audit/summary   - View audit summary');
    console.log('   POST /api/audit/export    - Export logs for compliance');
    console.log('\n' + '═'.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
