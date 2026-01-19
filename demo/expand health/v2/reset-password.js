const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
  try {
    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [hash, 'admin@expandhealth.io']
    );

    console.log('Password reset for:', result.rows[0]);
    console.log('New password:', newPassword);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetPassword();
