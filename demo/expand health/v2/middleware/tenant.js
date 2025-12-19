/**
 * Tenant Context Middleware
 * Sets tenant context for multi-tenancy support
 */

const db = require('../database/db');

/**
 * Sets tenant context from authenticated user
 * Must be used AFTER authenticateToken middleware
 */
async function setTenantContext(req, res, next) {
  try {
    if (!req.user) {
      return next();
    }

    // Get user's tenant info
    const result = await db.query(`
      SELECT
        u.tenant_id,
        u.is_platform_admin,
        t.name as tenant_name,
        t.slug as tenant_slug,
        t.settings as tenant_settings,
        t.kb_sharing_mode,
        t.subscription_tier,
        t.status as tenant_status
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length > 0) {
      const row = result.rows[0];

      // Attach tenant info to request
      req.tenant = {
        id: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug,
        settings: row.tenant_settings || {},
        kbSharingMode: row.kb_sharing_mode,
        subscriptionTier: row.subscription_tier,
        status: row.tenant_status
      };

      req.user.tenantId = row.tenant_id;
      req.user.isPlatformAdmin = row.is_platform_admin || false;

      // Set PostgreSQL session variables for RLS
      if (row.tenant_id) {
        await db.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [row.tenant_id.toString()]);
      }
      await db.query(`SELECT set_config('app.is_platform_admin', $1, false)`, [row.is_platform_admin ? 'true' : 'false']);
    }

    next();
  } catch (error) {
    console.error('[Tenant] Error setting tenant context:', error);
    next(error);
  }
}

/**
 * Require platform admin access
 */
function requirePlatformAdmin(req, res, next) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({
      error: 'Platform admin access required',
      message: 'This action requires platform administrator privileges'
    });
  }
  next();
}

/**
 * Require clinic admin or platform admin access
 */
async function requireClinicAdmin(req, res, next) {
  try {
    if (req.user?.isPlatformAdmin) {
      return next();
    }

    // Check if user has clinic_admin role
    const result = await db.query(`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.name IN ('clinic_admin', 'super_admin')
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This action requires clinic administrator privileges'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check module permission for current user
 * @param {string} moduleName - The module to check
 * @param {string} permission - 'view', 'create', 'edit', or 'delete'
 */
function requireModulePermission(moduleName, permission) {
  return async (req, res, next) => {
    try {
      // Platform admins bypass permission checks
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      const permissionColumn = `can_${permission}`;

      const result = await db.query(`
        SELECT rmp.${permissionColumn} as has_permission
        FROM role_module_permissions rmp
        JOIN modules m ON rmp.module_id = m.id
        JOIN user_roles ur ON rmp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND m.name = $2
      `, [req.user.id, moduleName]);

      const hasPermission = result.rows.some(row => row.has_permission === true);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Permission denied',
          message: `You don't have ${permission} access to the ${moduleName} module`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Ensure resource belongs to current tenant
 * For use when accessing specific resources by ID
 */
function ensureTenantResource(tableName, idParam = 'id') {
  return async (req, res, next) => {
    try {
      // Platform admins can access any tenant's resources
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      const resourceId = req.params[idParam];

      if (!resourceId) {
        return next();
      }

      const result = await db.query(
        `SELECT tenant_id FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (result.rows[0].tenant_id !== req.tenant?.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This resource belongs to another clinic'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Add tenant_id to request body for create operations
 */
function injectTenantId(req, res, next) {
  if (req.tenant?.id && req.body) {
    req.body.tenant_id = req.tenant.id;
  }
  next();
}

/**
 * Log admin actions to audit log
 */
async function logAdminAction(userId, tenantId, action, entityType, entityId, oldValues, newValues, req) {
  try {
    await db.query(`
      INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req?.ip || req?.connection?.remoteAddress,
      req?.headers?.['user-agent']
    ]);
  } catch (error) {
    console.error('[Audit] Error logging action:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

module.exports = {
  setTenantContext,
  requirePlatformAdmin,
  requireClinicAdmin,
  requireModulePermission,
  ensureTenantResource,
  injectTenantId,
  logAdminAction
};
