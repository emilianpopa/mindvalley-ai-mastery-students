/**
 * Check if admin user exists and verify password hash
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function checkAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('📊 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected! Checking admin user...');

    // Get admin user
    const result = await client.query(
      'SELECT id, email, password_hash, first_name, last_name, status FROM users WHERE email = $1',
      ['admin@expandhealth.io']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found!');
      console.log('Creating admin user now...');

      const passwordHash = await bcrypt.hash('admin123', 10);

      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, first_name, last_name`,
        ['admin@expandhealth.io', passwordHash, 'Admin', 'User', 'enabled']
      );

      console.log('✅ Admin user created:', insertResult.rows[0]);
    } else {
      const user = result.rows[0];
      console.log('✅ Admin user found:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.first_name, user.last_name);
      console.log('   Status:', user.status);

      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log('   Password "admin123" valid:', isValid);

      if (!isValid) {
        console.log('❌ Password hash is incorrect! Fixing...');
        const newHash = await bcrypt.hash('admin123', 10);
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2',
          [newHash, 'admin@expandhealth.io']
        );
        console.log('✅ Password hash updated!');
      }
    }

    client.release();
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkAdmin();
