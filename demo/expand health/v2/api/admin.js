/**
 * Admin API Routes
 * Manages tenants, users, roles, and permissions
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const {
  setTenantContext,
  requirePlatformAdmin,
  requireClinicAdmin,
  logAdminAction
} = require('../middleware/tenant');

// All admin routes require authentication and tenant context
router.use(authenticateToken);
router.use(setTenantContext);

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/stats', requireClinicAdmin, async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user.isPlatformAdmin;
    const tenantId = req.tenant?.id;

    let stats = {};

    if (isPlatformAdmin) {
      // Platform-wide stats
      const [tenants, users, clients, protocols] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM tenants WHERE status = $1', ['active']),
        db.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['enabled']),
        db.query('SELECT COUNT(*) as count FROM clients WHERE status = $1', ['enabled']),
        db.query('SELECT COUNT(*) as count FROM protocols')
      ]);

      stats = {
        totalTenants: parseInt(tenants.rows[0].count),
        totalUsers: parseInt(users.rows[0].count),
        totalClients: parseInt(clients.rows[0].count),
        totalProtocols: parseInt(protocols.rows[0].count),
        scope: 'platform',
        tenantId: tenantId,
        tenantName: req.tenant?.name
      };
    } else {
      // Tenant-specific stats
      const [users, clients, protocols, kbDocs] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND status = $2', [tenantId, 'enabled']),
        db.query('SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND status = $2', [tenantId, 'enabled']),
        db.query('SELECT COUNT(*) as count FROM protocols WHERE tenant_id = $1', [tenantId]),
        db.query('SELECT COUNT(*) as count FROM kb_documents WHERE tenant_id = $1 OR is_global = true', [tenantId])
      ]);

      stats = {
        totalUsers: parseInt(users.rows[0].count),
        totalClients: parseInt(clients.rows[0].count),
        totalProtocols: parseInt(protocols.rows[0].count),
        totalKBDocuments: parseInt(kbDocs.rows[0].count),
        scope: 'tenant',
        tenantId: tenantId,
        tenantName: req.tenant?.name
      };
    }

    // Recent activity
    const recentActivity = await db.query(`
      SELECT al.action, al.entity_type, al.created_at, u.first_name, u.last_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${isPlatformAdmin ? '1=1' : 'al.tenant_id = $1'}
      ORDER BY al.created_at DESC
      LIMIT 10
    `, isPlatformAdmin ? [] : [tenantId]);

    stats.recentActivity = recentActivity.rows;

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================
// TENANT MANAGEMENT (Platform Admin only)
// ============================================

// List all tenants
router.get('/tenants', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT
        t.*,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT c.id) as client_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.status = 'enabled'
      LEFT JOIN clients c ON t.id = c.tenant_id AND c.status = 'enabled'
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.name ILIKE $${params.length} OR t.slug ILIKE $${params.length})`;
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);

    res.json({
      tenants: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Create new tenant
router.post('/tenants', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { name, slug, logo_url, primary_color, subscription_tier, kb_sharing_mode, settings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existing = await db.query('SELECT id FROM tenants WHERE slug = $1', [finalSlug]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A tenant with this slug already exists' });
    }

    const result = await db.query(`
      INSERT INTO tenants (name, slug, logo_url, primary_color, subscription_tier, kb_sharing_mode, settings, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      name,
      finalSlug,
      logo_url || null,
      primary_color || '#0d9488',
      subscription_tier || 'starter',
      kb_sharing_mode || 'private',
      JSON.stringify(settings || {}),
      req.user.id
    ]);

    // Create default KB collection for the tenant
    await db.query(`
      INSERT INTO tenant_kb_collections (tenant_id, name, description, created_by)
      VALUES ($1, $2, $3, $4)
    `, [result.rows[0].id, 'Main Collection', 'Primary knowledge base collection', req.user.id]);

    await logAdminAction(req.user.id, null, 'create_tenant', 'tenant', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant details
router.get('/tenants/:id', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        t.*,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT c.id) as client_count,
        COUNT(DISTINCT p.id) as protocol_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN clients c ON t.id = c.tenant_id
      LEFT JOIN protocols p ON t.id = p.tenant_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get KB collections for this tenant
    const collections = await db.query(`
      SELECT * FROM tenant_kb_collections WHERE tenant_id = $1 ORDER BY created_at
    `, [id]);

    res.json({
      tenant: result.rows[0],
      kbCollections: collections.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.put('/tenants/:id', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, logo_url, primary_color, subscription_tier, kb_sharing_mode, settings, status } = req.body;

    // Get current values for audit
    const current = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const result = await db.query(`
      UPDATE tenants
      SET name = COALESCE($1, name),
          logo_url = COALESCE($2, logo_url),
          primary_color = COALESCE($3, primary_color),
          subscription_tier = COALESCE($4, subscription_tier),
          kb_sharing_mode = COALESCE($5, kb_sharing_mode),
          settings = COALESCE($6, settings),
          status = COALESCE($7, status)
      WHERE id = $8
      RETURNING *
    `, [name, logo_url, primary_color, subscription_tier, kb_sharing_mode, settings ? JSON.stringify(settings) : null, status, id]);

    await logAdminAction(req.user.id, parseInt(id), 'update_tenant', 'tenant', parseInt(id), current.rows[0], result.rows[0], req);

    res.json({
      message: 'Tenant updated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate tenant
router.delete('/tenants/:id', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE tenants SET status = 'cancelled' WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await logAdminAction(req.user.id, parseInt(id), 'deactivate_tenant', 'tenant', parseInt(id), { status: 'active' }, { status: 'cancelled' }, req);

    res.json({
      message: 'Tenant deactivated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// List users (filtered by tenant for clinic admins)
router.get('/users', requireClinicAdmin, async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user.isPlatformAdmin;
    const { tenant_id, role, status, search } = req.query;

    let query = `
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.avatar_url,
        u.job_title, u.phone, u.status, u.created_at, u.last_login,
        u.tenant_id, u.is_platform_admin,
        t.name as tenant_name,
        COALESCE(
          json_agg(
            json_build_object('id', r.id, 'name', r.name)
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Non-platform admins can only see their tenant's users
    if (!isPlatformAdmin && req.tenant?.id) {
      params.push(req.tenant.id);
      query += ` AND u.tenant_id = $${params.length}`;
    } else if (tenant_id) {
      params.push(tenant_id);
      query += ` AND u.tenant_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND u.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`;
    }

    query += ` GROUP BY u.id, t.name ORDER BY u.created_at DESC`;

    const result = await db.query(query, params);

    // Filter by role if specified (after aggregation)
    let users = result.rows;
    if (role) {
      users = users.filter(u => u.roles.some(r => r.name === role));
    }

    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    next(error);
  }
});

// Create new user
router.post('/users', requireClinicAdmin, async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, job_title, phone, roles, tenant_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Non-platform admins can only create users in their own tenant
    const targetTenantId = req.user.isPlatformAdmin ? (tenant_id || req.tenant?.id) : req.tenant?.id;

    // Check email uniqueness
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, job_title, phone, tenant_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'enabled')
      RETURNING id, email, first_name, last_name, job_title, phone, tenant_id, status, created_at
    `, [email.toLowerCase(), passwordHash, first_name, last_name, job_title, phone, targetTenantId]);

    const userId = result.rows[0].id;

    // Assign roles
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        await db.query(`
          INSERT INTO user_roles (user_id, role_id)
          SELECT $1, id FROM roles WHERE name = $2
        `, [userId, roleName]);
      }
    } else {
      // Default to therapist role
      await db.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE name = 'therapist'
      `, [userId]);
    }

    await logAdminAction(req.user.id, targetTenantId, 'create_user', 'user', userId, null, { email, roles }, req);

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get user details
router.get('/users/:id', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.avatar_url,
        u.job_title, u.phone, u.status, u.created_at, u.last_login,
        u.tenant_id, u.is_platform_admin,
        t.name as tenant_name,
        COALESCE(
          json_agg(
            json_build_object('id', r.id, 'name', r.name, 'description', r.description)
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, t.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Non-platform admins can only view their tenant's users
    if (!req.user.isPlatformAdmin && result.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, job_title, phone, avatar_url } = req.body;

    // Check user exists and belongs to correct tenant
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.isPlatformAdmin && existing.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      UPDATE users
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          job_title = COALESCE($3, job_title),
          phone = COALESCE($4, phone),
          avatar_url = COALESCE($5, avatar_url)
      WHERE id = $6
      RETURNING id, email, first_name, last_name, job_title, phone, avatar_url, status
    `, [first_name, last_name, job_title, phone, avatar_url, id]);

    await logAdminAction(req.user.id, existing.rows[0].tenant_id, 'update_user', 'user', parseInt(id), existing.rows[0], result.rows[0], req);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update user status (enable/disable)
router.put('/users/:id/status', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['enabled', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "enabled" or "disabled"' });
    }

    // Prevent disabling yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.isPlatformAdmin && existing.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      UPDATE users SET status = $1 WHERE id = $2
      RETURNING id, email, status
    `, [status, id]);

    await logAdminAction(req.user.id, existing.rows[0].tenant_id, `${status}_user`, 'user', parseInt(id), { status: existing.rows[0].status }, { status }, req);

    res.json({
      message: `User ${status === 'enabled' ? 'enabled' : 'disabled'} successfully`,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update user roles
router.put('/users/:id/roles', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles must be an array' });
    }

    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.isPlatformAdmin && existing.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current roles for audit
    const currentRoles = await db.query(`
      SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1
    `, [id]);

    // Remove existing roles
    await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    // Add new roles
    for (const roleName of roles) {
      await db.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE name = $2
      `, [id, roleName]);
    }

    await logAdminAction(
      req.user.id,
      existing.rows[0].tenant_id,
      'update_user_roles',
      'user',
      parseInt(id),
      { roles: currentRoles.rows.map(r => r.name) },
      { roles },
      req
    );

    res.json({
      message: 'User roles updated successfully',
      roles
    });
  } catch (error) {
    next(error);
  }
});

// Send user invitation
router.post('/users/invite', requireClinicAdmin, async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get role ID
    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role || 'therapist']);
    const roleId = roleResult.rows[0]?.id;

    await db.query(`
      INSERT INTO tenant_invitations (tenant_id, email, role_id, token, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.tenant?.id, email.toLowerCase(), roleId, token, expiresAt, req.user.id]);

    await logAdminAction(req.user.id, req.tenant?.id, 'send_invitation', 'invitation', null, null, { email, role }, req);

    // In production, send email with invitation link
    const baseUrl = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3001');
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

    res.status(201).json({
      message: 'Invitation sent successfully',
      inviteUrl, // In production, don't return this - send via email
      expiresAt
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.isPlatformAdmin && existing.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent deleting platform admins unless you're also a platform admin
    if (existing.rows[0].is_platform_admin && !req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Cannot delete platform administrators' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await logAdminAction(req.user.id, existing.rows[0].tenant_id, 'delete_user', 'user', parseInt(id), existing.rows[0], null, req);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROLE MANAGEMENT
// ============================================

// List all roles
router.get('/roles', requireClinicAdmin, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        r.*,
        COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.id
    `);

    res.json({
      roles: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get role with permissions
router.get('/roles/:id', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const roleResult = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permissionsResult = await db.query(`
      SELECT
        m.id as module_id, m.name as module_name, m.display_name,
        rmp.can_view, rmp.can_create, rmp.can_edit, rmp.can_delete
      FROM modules m
      LEFT JOIN role_module_permissions rmp ON m.id = rmp.module_id AND rmp.role_id = $1
      ORDER BY m.sort_order
    `, [id]);

    res.json({
      role: roleResult.rows[0],
      permissions: permissionsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create custom role (Platform Admin only)
router.post('/roles', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existing = await db.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }

    const result = await db.query(`
      INSERT INTO roles (name, description, permissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description, JSON.stringify(permissions || {})]);

    await logAdminAction(req.user.id, null, 'create_role', 'role', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json({
      message: 'Role created successfully',
      role: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update role permissions
router.put('/roles/:id/permissions', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    const roleResult = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Delete existing permissions
    await db.query('DELETE FROM role_module_permissions WHERE role_id = $1', [id]);

    // Insert new permissions
    for (const perm of permissions) {
      await db.query(`
        INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, perm.module_id, perm.can_view || false, perm.can_create || false, perm.can_edit || false, perm.can_delete || false]);
    }

    await logAdminAction(req.user.id, null, 'update_role_permissions', 'role', parseInt(id), null, { permissions }, req);

    res.json({ message: 'Role permissions updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete role (Platform Admin only)
router.delete('/roles/:id', requirePlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting built-in roles
    const builtInRoles = ['super_admin', 'clinic_admin', 'doctor', 'therapist', 'receptionist'];
    const roleResult = await db.query('SELECT name FROM roles WHERE id = $1', [id]);

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (builtInRoles.includes(roleResult.rows[0].name)) {
      return res.status(400).json({ error: 'Cannot delete built-in roles' });
    }

    await db.query('DELETE FROM roles WHERE id = $1', [id]);

    await logAdminAction(req.user.id, null, 'delete_role', 'role', parseInt(id), roleResult.rows[0], null, req);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MODULE MANAGEMENT
// ============================================

// List all modules
router.get('/modules', requireClinicAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM modules ORDER BY sort_order');
    res.json({ modules: result.rows });
  } catch (error) {
    next(error);
  }
});

// ============================================
// KB COLLECTIONS (Tenant-specific)
// ============================================

// List KB collections for a tenant
router.get('/tenants/:tenantId/kb-collections', requireClinicAdmin, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Non-platform admins can only view their own tenant's collections
    if (!req.user.isPlatformAdmin && parseInt(tenantId) !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      SELECT
        kc.*,
        COUNT(DISTINCT kd.id) as document_count
      FROM tenant_kb_collections kc
      LEFT JOIN kb_documents kd ON kc.id = kd.collection_id
      WHERE kc.tenant_id = $1
      GROUP BY kc.id
      ORDER BY kc.created_at
    `, [tenantId]);

    res.json({ collections: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create KB collection
router.post('/tenants/:tenantId/kb-collections', requireClinicAdmin, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, description, is_shared, gemini_store_id } = req.body;

    if (!req.user.isPlatformAdmin && parseInt(tenantId) !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const result = await db.query(`
      INSERT INTO tenant_kb_collections (tenant_id, name, description, is_shared, gemini_store_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tenantId, name, description, is_shared || false, gemini_store_id, req.user.id]);

    await logAdminAction(req.user.id, parseInt(tenantId), 'create_kb_collection', 'kb_collection', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json({
      message: 'KB collection created successfully',
      collection: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update KB collection sharing
router.put('/kb-collections/:id/sharing', requireClinicAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_shared } = req.body;

    const existing = await db.query('SELECT * FROM tenant_kb_collections WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (!req.user.isPlatformAdmin && existing.rows[0].tenant_id !== req.tenant?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      UPDATE tenant_kb_collections SET is_shared = $1 WHERE id = $2 RETURNING *
    `, [is_shared, id]);

    await logAdminAction(req.user.id, existing.rows[0].tenant_id, 'update_kb_sharing', 'kb_collection', parseInt(id), { is_shared: existing.rows[0].is_shared }, { is_shared }, req);

    res.json({
      message: `Collection ${is_shared ? 'shared' : 'unshared'} successfully`,
      collection: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// TENANT SEPARATION MIGRATION
// ============================================

/**
 * POST /api/admin/migrate/tenant-separation
 * One-time migration to separate tenants:
 * - Creates "Expand Health South Africa" tenant
 * - Moves Momence-imported clients to SA tenant
 * - Creates admin users for SA tenant
 * - Renames existing tenant to "Test Tenant"
 */
router.post('/migrate/tenant-separation', requirePlatformAdmin, async (req, res, next) => {
  try {
    const results = {
      steps: [],
      success: true
    };

    // Step 1: Get current state
    const tenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY id');
    results.steps.push({
      step: 'Query current tenants',
      data: tenants.rows
    });

    if (tenants.rows.length === 0) {
      return res.status(400).json({ error: 'No tenants found' });
    }

    const currentTenant = tenants.rows[0];

    // Step 2: Create South Africa tenant if not exists
    let saTenantId;
    const existingSA = await db.query("SELECT id FROM tenants WHERE slug = 'expand-health-za'");

    if (existingSA.rows.length > 0) {
      saTenantId = existingSA.rows[0].id;
      results.steps.push({
        step: 'South Africa tenant already exists',
        tenantId: saTenantId
      });
    } else {
      const saResult = await db.query(`
        INSERT INTO tenants (name, slug, status, created_by)
        VALUES ('Expand Health South Africa', 'expand-health-za', 'active', $1)
        RETURNING id
      `, [req.user.id]);
      saTenantId = saResult.rows[0].id;
      results.steps.push({
        step: 'Created South Africa tenant',
        tenantId: saTenantId
      });

      // Create default KB collection for SA tenant
      await db.query(`
        INSERT INTO tenant_kb_collections (tenant_id, name, description, created_by)
        VALUES ($1, 'Main Collection', 'Primary knowledge base collection', $2)
      `, [saTenantId, req.user.id]);
    }

    // Step 3: Create admin users for South Africa tenant
    const existingAdmin = await db.query(
      "SELECT id FROM users WHERE email = 'admin@expandhealth.co.za'"
    );

    if (existingAdmin.rows.length > 0) {
      results.steps.push({
        step: 'SA admin already exists',
        email: 'admin@expandhealth.co.za'
      });
    } else {
      const hashedPassword = await bcrypt.hash('ExpandHealth2024!', 10);
      await db.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
        VALUES ($1, 'admin@expandhealth.co.za', $2, 'Admin', 'SA', 'enabled')
      `, [saTenantId, hashedPassword]);

      // Assign admin role
      await db.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE u.email = 'admin@expandhealth.co.za' AND r.name = 'clinic_admin'
      `);

      results.steps.push({
        step: 'Created SA admin user',
        email: 'admin@expandhealth.co.za',
        password: 'ExpandHealth2024!'
      });
    }

    // Create practitioner for SA
    const existingPractitioner = await db.query(
      "SELECT id FROM users WHERE email = 'practitioner@expandhealth.co.za'"
    );

    if (existingPractitioner.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('ExpandHealth2024!', 10);
      await db.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
        VALUES ($1, 'practitioner@expandhealth.co.za', $2, 'Practitioner', 'SA', 'enabled')
      `, [saTenantId, hashedPassword]);

      await db.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE u.email = 'practitioner@expandhealth.co.za' AND r.name = 'therapist'
      `);

      results.steps.push({
        step: 'Created SA practitioner user',
        email: 'practitioner@expandhealth.co.za'
      });
    }

    // Step 4: Move Momence-imported clients to SA tenant
    // First check for integration_client_mappings table
    let momenceClientIds = [];
    try {
      const mappings = await db.query(`
        SELECT client_id FROM integration_client_mappings
        WHERE external_platform = 'momence'
      `);
      momenceClientIds = mappings.rows.map(r => r.client_id);
    } catch (e) {
      // Table might not exist
    }

    if (momenceClientIds.length > 0) {
      // Move clients via Momence mappings
      const updateResult = await db.query(`
        UPDATE clients
        SET tenant_id = $1, updated_at = NOW()
        WHERE id = ANY($2)
        RETURNING id, first_name, last_name
      `, [saTenantId, momenceClientIds]);

      results.steps.push({
        step: 'Moved Momence clients to SA tenant',
        count: updateResult.rows.length,
        clients: updateResult.rows.map(c => `${c.first_name} ${c.last_name}`)
      });

      // Update integration mappings
      await db.query(`
        UPDATE integration_client_mappings
        SET tenant_id = $1
        WHERE external_platform = 'momence'
      `, [saTenantId]);
    } else {
      // Alternative: Move clients that are NOT test clients
      // Keep clients with these names as test clients
      const nonTestClients = await db.query(`
        SELECT id, first_name, last_name, email
        FROM clients
        WHERE tenant_id = $1
        AND LOWER(email) NOT LIKE '%test%'
        AND LOWER(email) NOT LIKE '%demo%'
        AND LOWER(first_name) != 'test'
        AND LOWER(first_name) != 'demo'
        AND (first_name || ' ' || last_name) != 'Chris Moore'
      `, [currentTenant.id]);

      if (nonTestClients.rows.length > 0) {
        const clientIdsToMove = nonTestClients.rows.map(c => c.id);

        // Move clients
        await db.query(`
          UPDATE clients
          SET tenant_id = $1, updated_at = NOW()
          WHERE id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        // Move related data
        await db.query(`
          UPDATE protocols SET tenant_id = $1, updated_at = NOW() WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        await db.query(`
          UPDATE lab_results SET tenant_id = $1 WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        await db.query(`
          UPDATE engagement_plans SET tenant_id = $1, updated_at = NOW() WHERE client_id = ANY($2)
        `, [saTenantId, clientIdsToMove]);

        results.steps.push({
          step: 'Moved non-test clients to SA tenant',
          count: clientIdsToMove.length,
          clients: nonTestClients.rows.map(c => `${c.first_name} ${c.last_name} (${c.email})`)
        });
      } else {
        results.steps.push({
          step: 'No clients to move (all appear to be test clients)',
          count: 0
        });
      }
    }

    // Step 5: Rename existing tenant to Test
    await db.query(`
      UPDATE tenants
      SET name = 'Test Tenant', slug = 'test'
      WHERE id = $1
    `, [currentTenant.id]);

    results.steps.push({
      step: 'Renamed existing tenant to Test Tenant',
      oldName: currentTenant.name,
      newName: 'Test Tenant'
    });

    // Step 6: Get final state
    const finalTenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY id');
    const finalUsers = await db.query(`
      SELECT u.email, u.first_name, u.last_name, t.name as tenant_name
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      ORDER BY t.id, u.email
    `);
    const finalClients = await db.query(`
      SELECT c.first_name, c.last_name, c.email, t.name as tenant_name
      FROM clients c
      JOIN tenants t ON c.tenant_id = t.id
      ORDER BY t.id, c.last_name
    `);

    results.finalState = {
      tenants: finalTenants.rows,
      users: finalUsers.rows,
      clients: finalClients.rows
    };

    results.credentials = {
      southAfrica: {
        admin: { email: 'admin@expandhealth.co.za', password: 'ExpandHealth2024!' },
        practitioner: { email: 'practitioner@expandhealth.co.za', password: 'ExpandHealth2024!' }
      }
    };

    await logAdminAction(req.user.id, null, 'tenant_separation_migration', 'system', null, null, results, req);

    res.json(results);
  } catch (error) {
    console.error('Migration error:', error);
    next(error);
  }
});

// ============================================
// AUDIT LOG
// ============================================

// Get audit log
router.get('/audit-log', requireClinicAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, action, entity_type } = req.query;
    const isPlatformAdmin = req.user.isPlatformAdmin;

    let query = `
      SELECT
        al.*,
        u.first_name, u.last_name, u.email,
        t.name as tenant_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (!isPlatformAdmin) {
      params.push(req.tenant?.id);
      query += ` AND al.tenant_id = $${params.length}`;
    }

    if (action) {
      params.push(action);
      query += ` AND al.action = $${params.length}`;
    }

    if (entity_type) {
      params.push(entity_type);
      query += ` AND al.entity_type = $${params.length}`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;

    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
