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

// ============================================
// SERVICE ADD-ONS
// ============================================

/**
 * GET /api/services/:id/addons
 * Get all add-ons for a service
 */
router.get('/:id/addons', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(`
      SELECT * FROM service_addons
      WHERE service_type_id = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY sort_order ASC, name ASC
    `, [id, tenantId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services/:id/addons
 * Create add-on for a service
 */
router.post('/:id/addons', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, description, price = 0, duration_minutes = 0, sort_order = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await db.query(`
      INSERT INTO service_addons (tenant_id, service_type_id, name, description, price, duration_minutes, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenantId, id, name, description, price, duration_minutes, sort_order]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/services/:id/addons/:addonId
 * Update an add-on
 */
router.put('/:id/addons/:addonId', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { addonId } = req.params;
    const { name, description, price, duration_minutes, sort_order, is_active } = req.body;

    const result = await db.query(`
      UPDATE service_addons SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        duration_minutes = COALESCE($4, duration_minutes),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [name, description, price, duration_minutes, sort_order, is_active, addonId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Add-on not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/services/:id/addons/:addonId
 * Delete an add-on
 */
router.delete('/:id/addons/:addonId', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { addonId } = req.params;

    await db.query(
      'DELETE FROM service_addons WHERE id = $1 AND tenant_id = $2',
      [addonId, tenantId]
    );

    res.json({ success: true, deleted_id: addonId });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STAFF SERVICE PRICING
// ============================================

/**
 * GET /api/services/:id/staff-prices
 * Get staff-specific prices for a service
 */
router.get('/:id/staff-prices', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        ssp.*,
        s.first_name,
        s.last_name,
        s.email,
        s.title
      FROM staff_service_prices ssp
      JOIN staff s ON ssp.staff_id = s.id
      WHERE ssp.service_type_id = $1 AND ssp.tenant_id = $2 AND ssp.is_active = true
      ORDER BY s.first_name, s.last_name
    `, [id, tenantId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services/:id/staff-prices
 * Set staff-specific price for a service
 */
router.post('/:id/staff-prices', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { staff_id, price } = req.body;

    if (!staff_id || price === undefined) {
      return res.status(400).json({ error: 'staff_id and price are required' });
    }

    // Upsert - insert or update on conflict
    const result = await db.query(`
      INSERT INTO staff_service_prices (tenant_id, staff_id, service_type_id, price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (staff_id, service_type_id)
      DO UPDATE SET price = $4, is_active = true, updated_at = NOW()
      RETURNING *
    `, [tenantId, staff_id, id, price]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/services/:id/staff-prices/:staffId
 * Remove staff-specific price
 */
router.delete('/:id/staff-prices/:staffId', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id, staffId } = req.params;

    await db.query(
      'DELETE FROM staff_service_prices WHERE service_type_id = $1 AND staff_id = $2 AND tenant_id = $3',
      [id, staffId, tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRICING TABLE VIEW (like Momence)
// ============================================

/**
 * GET /api/services/pricing/all
 * Get all services with their pricing, add-ons, and staff prices
 * Similar to Momence's appointment pricing view
 */
router.get('/pricing/all', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Get all active services with base info
    const servicesResult = await db.query(`
      SELECT
        st.id,
        st.name,
        st.description,
        st.duration_minutes,
        st.price,
        st.price_in_credits,
        st.max_customers,
        st.buffer_before_minutes,
        st.buffer_after_minutes,
        st.color,
        st.category,
        st.momence_id,
        sc.name as category_name
      FROM service_types st
      LEFT JOIN service_categories sc ON st.category_id = sc.id
      WHERE st.tenant_id = $1 AND st.is_active = true
      ORDER BY st.name ASC
    `, [tenantId]);

    const services = servicesResult.rows;

    // Get add-ons for all services
    const addonsResult = await db.query(`
      SELECT * FROM service_addons
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY service_type_id, sort_order ASC
    `, [tenantId]);

    // Get staff prices for all services
    const staffPricesResult = await db.query(`
      SELECT
        ssp.*,
        s.first_name,
        s.last_name,
        s.email
      FROM staff_service_prices ssp
      JOIN staff s ON ssp.staff_id = s.id
      WHERE ssp.tenant_id = $1 AND ssp.is_active = true AND s.is_active = true
    `, [tenantId]);

    // Map add-ons and staff prices to their services
    const addonsMap = {};
    addonsResult.rows.forEach(addon => {
      if (!addonsMap[addon.service_type_id]) {
        addonsMap[addon.service_type_id] = [];
      }
      addonsMap[addon.service_type_id].push(addon);
    });

    const staffPricesMap = {};
    staffPricesResult.rows.forEach(sp => {
      if (!staffPricesMap[sp.service_type_id]) {
        staffPricesMap[sp.service_type_id] = [];
      }
      staffPricesMap[sp.service_type_id].push(sp);
    });

    // Combine into final response
    const pricingData = services.map(service => ({
      ...service,
      addons: addonsMap[service.id] || [],
      staffPrices: staffPricesMap[service.id] || []
    }));

    res.json(pricingData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services/pricing/bulk-update
 * Bulk update prices for multiple services
 */
router.post('/pricing/bulk-update', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    const results = [];
    for (const update of updates) {
      const { service_id, price, price_in_credits, duration_minutes } = update;

      if (!service_id) continue;

      const result = await db.query(`
        UPDATE service_types SET
          price = COALESCE($1, price),
          price_in_credits = COALESCE($2, price_in_credits),
          duration_minutes = COALESCE($3, duration_minutes),
          updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, name, price, price_in_credits, duration_minutes
      `, [price, price_in_credits, duration_minutes, service_id, tenantId]);

      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    res.json({
      success: true,
      updated: results.length,
      services: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services/sync-from-momence
 * Bulk upsert services by name (for Momence import)
 * Creates new services or updates existing ones matched by name
 */
router.post('/sync-from-momence', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { services } = req.body;

    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'services must be an array' });
    }

    // Get category map
    const catResult = await db.query(
      'SELECT id, name FROM service_categories WHERE tenant_id = $1',
      [tenantId]
    );
    const categoryMap = {};
    catResult.rows.forEach(row => {
      categoryMap[row.name] = row.id;
    });

    const results = { created: 0, updated: 0, errors: [] };

    for (const service of services) {
      try {
        const { name, price, duration_minutes, category } = service;

        if (!name) {
          results.errors.push({ service, error: 'name is required' });
          continue;
        }

        const categoryId = category ? categoryMap[category] : null;

        // Check if service exists
        const existing = await db.query(
          'SELECT id FROM service_types WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)',
          [tenantId, name]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await db.query(`
            UPDATE service_types SET
              price = COALESCE($1, price),
              duration_minutes = COALESCE($2, duration_minutes),
              category_id = COALESCE($3, category_id),
              category = COALESCE($4, category),
              updated_at = NOW()
            WHERE id = $5
          `, [price, duration_minutes, categoryId, category, existing.rows[0].id]);
          results.updated++;
        } else {
          // Create new
          await db.query(`
            INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
          `, [tenantId, name, price || 0, duration_minutes || 60, categoryId, category]);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ service: service.name, error: err.message });
      }
    }

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
