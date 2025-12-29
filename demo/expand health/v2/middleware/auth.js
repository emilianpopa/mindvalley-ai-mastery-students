/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Check if tenants table exists (cached)
let tenantsTableExists = null;

async function checkTenantsTable() {
  if (tenantsTableExists !== null) return tenantsTableExists;
  try {
    await db.query("SELECT 1 FROM tenants LIMIT 1");
    tenantsTableExists = true;
  } catch (error) {
    tenantsTableExists = false;
  }
  return tenantsTableExists;
}

// Verify JWT token
async function authenticateToken(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('[Auth] No token provided for', req.method, req.path);
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if multi-tenancy is enabled (tenants table exists)
    const hasMultiTenancy = await checkTenantsTable();

    let result;
    if (hasMultiTenancy) {
      // Get user from database with tenant info
      result = await db.query(`
        SELECT
          u.id, u.email, u.first_name, u.last_name, u.status, u.role,
          u.tenant_id, u.is_platform_admin,
          t.name as tenant_name, t.slug as tenant_slug
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1
      `, [decoded.userId]);
    } else {
      // Legacy mode: no multi-tenancy
      result = await db.query(
        'SELECT id, email, first_name, last_name, status, role FROM users WHERE id = $1',
        [decoded.userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.status !== 'enabled') {
      return res.status(403).json({ error: 'Account disabled' });
    }

    // Attach user to request (with tenant info if available)
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      role: user.role || null,
      tenantId: user.tenant_id || null,
      isPlatformAdmin: user.is_platform_admin || false,
      tenantName: user.tenant_name || null,
      tenantSlug: user.tenant_slug || null
    };

    next();
  } catch (error) {
    console.log('[Auth] Error for', req.method, req.path, '-', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
}

// Check if user has specific role
function requireRole(...roles) {
  // Flatten roles array in case it was passed as nested array
  const flatRoles = roles.flat();

  return async (req, res, next) => {
    try {
      // First check the direct role column on the user (faster)
      if (req.user.role && flatRoles.includes(req.user.role)) {
        return next();
      }

      // Also check if platform admin (they have all permissions)
      if (req.user.isPlatformAdmin) {
        return next();
      }

      // Fall back to checking the user_roles junction table
      const result = await db.query(`
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `, [req.user.id]);

      const userRoles = result.rows.map(row => row.name);

      const hasRole = flatRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
