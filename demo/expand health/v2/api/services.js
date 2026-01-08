/**
 * Services API Routes
 * Handles CRUD operations for service types
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// SERVICE TYPES CRUD
// ============================================

/**
 * GET /api/services
 * List all service types
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { active_only, category } = req.query;

    let query = `
      SELECT
        st.*,
        sc.name as category_name,
        sc.color as category_color,
        COUNT(DISTINCT ss.staff_id) as staff_count
      FROM service_types st
      LEFT JOIN service_categories sc ON st.category_id = sc.id
      LEFT JOIN staff_services ss ON st.id = ss.service_type_id AND ss.is_active = true
      WHERE st.tenant_id = $1
    `;

    const params = [tenantId];

    if (active_only === 'true') {
      query += ` AND st.is_active = true`;
    }

    // Filter by category name if provided
    if (category) {
      params.push(category);
      query += ` AND sc.name = $${params.length}`;
    }

    query += ` GROUP BY st.id, sc.name, sc.color ORDER BY st.name ASC`;

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// ============================================
// SERVICE CATEGORIES CRUD (must be before /:id routes)
// ============================================

/**
 * GET /api/services/categories/list
 * List all service categories
 */
router.get('/categories/list', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const result = await db.query(`
      SELECT sc.*, COUNT(st.id) as service_count
      FROM service_categories sc
      LEFT JOIN service_types st ON sc.id = st.category_id AND st.is_active = true
      WHERE sc.tenant_id = $1 AND sc.is_active = true
      GROUP BY sc.id
      ORDER BY sc.sort_order ASC, sc.name ASC
    `, [tenantId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services/categories
 * Create new service category
 */
router.post('/categories', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const { name, description, color = '#3B82F6', sort_order = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await db.query(`
      INSERT INTO service_categories (tenant_id, name, description, color, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [tenantId, name, description, color, sort_order]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    next(error);
  }
});

/**
 * PUT /api/services/categories/:id
 * Update service category
 */
router.put('/categories/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const { name, description, color, sort_order, is_active } = req.body;

    const result = await db.query(`
      UPDATE service_categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        color = COALESCE($3, color),
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [name, description, color, sort_order, is_active, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/services/categories/:id
 * Delete service category
 */
router.delete('/categories/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // First, unassign services from this category
    await db.query(
      'UPDATE service_types SET category_id = NULL WHERE category_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    // Then delete the category
    await db.query(
      'DELETE FROM service_categories WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SERVICE TYPES - Individual routes (after category routes)
// ============================================

/**
 * GET /api/services/:id
 * Get single service type with staff who can perform it
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Get service
    const serviceResult = await db.query(`
      SELECT * FROM service_types
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // Get staff who can perform this service
    const staffResult = await db.query(`
      SELECT
        s.id, s.first_name, s.last_name, s.title, s.color,
        ss.custom_duration_minutes, ss.custom_price
      FROM staff s
      JOIN staff_services ss ON s.id = ss.staff_id
      WHERE ss.service_type_id = $1 AND ss.is_active = true AND s.is_active = true
      ORDER BY s.first_name, s.last_name
    `, [id]);

    service.staff = staffResult.rows;

    res.json(service);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services
 * Create new service type
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const {
      name,
      description,
      duration_minutes = 60,
      price,
      color = '#3B82F6',
      is_active = true,
      requires_staff = true,
      max_attendees = 1,
      buffer_before_minutes = 0,
      buffer_after_minutes = 0,
      cancellation_policy,
      category_id
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await db.query(`
      INSERT INTO service_types (
        tenant_id, name, description, duration_minutes, price,
        color, is_active, requires_staff, max_attendees,
        buffer_before_minutes, buffer_after_minutes, cancellation_policy, category_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      tenantId, name, description, duration_minutes, price,
      color, is_active, requires_staff, max_attendees,
      buffer_before_minutes, buffer_after_minutes, cancellation_policy, category_id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/services/:id
 * Update service type
 */
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const {
      name,
      description,
      duration_minutes,
      price,
      color,
      is_active,
      requires_staff,
      max_attendees,
      buffer_before_minutes,
      buffer_after_minutes,
      cancellation_policy,
      category_id
    } = req.body;

    const result = await db.query(`
      UPDATE service_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        duration_minutes = COALESCE($3, duration_minutes),
        price = COALESCE($4, price),
        color = COALESCE($5, color),
        is_active = COALESCE($6, is_active),
        requires_staff = COALESCE($7, requires_staff),
        max_attendees = COALESCE($8, max_attendees),
        buffer_before_minutes = COALESCE($9, buffer_before_minutes),
        buffer_after_minutes = COALESCE($10, buffer_after_minutes),
        cancellation_policy = COALESCE($11, cancellation_policy),
        category_id = COALESCE($12, category_id),
        updated_at = NOW()
      WHERE id = $13 AND tenant_id = $14
      RETURNING *
    `, [
      name, description, duration_minutes, price, color,
      is_active, requires_staff, max_attendees,
      buffer_before_minutes, buffer_after_minutes, cancellation_policy,
      category_id, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/services/:id
 * Delete service type (soft delete by setting is_active = false)
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Check if service has appointments
      const appointmentCheck = await db.query(
        'SELECT COUNT(*) FROM appointments WHERE service_type_id = $1',
        [id]
      );

      if (parseInt(appointmentCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot delete service with existing appointments. Use soft delete instead.'
        });
      }

      await db.query(
        'DELETE FROM service_types WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
    } else {
      // Soft delete
      await db.query(
        'UPDATE service_types SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
