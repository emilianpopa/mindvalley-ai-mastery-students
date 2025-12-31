const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:LHOzOWDEpqqpSXGjojvCUhxyObfmXuZO@metro.proxy.rlwy.net:36811/railway';
const pool = new Pool({ connectionString });

async function assignAdminRole() {
  try {
    // Check if roles table exists and has admin role
    const rolesCheck = await pool.query("SELECT * FROM roles WHERE name = 'admin'");
    console.log('Roles check:', rolesCheck.rows);

    let adminRoleId;
    if (rolesCheck.rows.length === 0) {
      // Create admin role
      const newRole = await pool.query(
        "INSERT INTO roles (name, description) VALUES ('admin', 'Administrator with full access') RETURNING id"
      );
      adminRoleId = newRole.rows[0].id;
      console.log('Created admin role with id:', adminRoleId);
    } else {
      adminRoleId = rolesCheck.rows[0].id;
      console.log('Admin role exists with id:', adminRoleId);
    }

    // Get all users to see who we need to assign
    const users = await pool.query('SELECT id, email FROM users');
    console.log('\nAll users:', users.rows);

    // Check existing user_roles
    const existingRoles = await pool.query(`
      SELECT ur.user_id, u.email, r.name as role_name
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      JOIN roles r ON ur.role_id = r.id
    `);
    console.log('\nExisting user roles:', existingRoles.rows);

    // Assign admin role to all users (for now)
    for (const user of users.rows) {
      // Check if already assigned
      const check = await pool.query(
        'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [user.id, adminRoleId]
      );

      if (check.rows.length === 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [user.id, adminRoleId]
        );
        console.log(`Assigned admin role to ${user.email}`);
      } else {
        console.log(`${user.email} already has admin role`);
      }
    }

    console.log('\nDone! All users now have admin role.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

assignAdminRole();
