/**
 * Tags API
 * Manages class tags for filtering and reporting
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// CRUD Operations
// ============================================

/**
 * GET /api/tags
 * List all tags for the tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { active_only, applies_to } = req.query;

    let query = `
      SELECT *
      FROM class_tags
      WHERE tenant_id = $1
    `;
    const params = [tenantId];

    if (active_only === 'true') {
      query += ` AND is_active = true`;
    }

    if (applies_to) {
      query += ` AND $${params.length + 1} = ANY(applies_to)`;
      params.push(applies_to);
    }

    query += ` ORDER BY name ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/:id
 * Get single tag
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM class_tags WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      name,
      color = '#7C3AED',
      applies_to = ['classes'],
      inherit_to_customer = false,
      show_as_badge = false
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = await db.query(
      `INSERT INTO class_tags (tenant_id, name, color, applies_to, inherit_to_customer, show_as_badge)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, name, color, applies_to, inherit_to_customer, show_as_badge]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A tag with this name already exists' });
    }
    next(error);
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put('/:id', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      name,
      color,
      applies_to,
      inherit_to_customer,
      show_as_badge,
      is_active
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      params.push(color);
    }
    if (applies_to !== undefined) {
      updates.push(`applies_to = $${paramIndex++}`);
      params.push(applies_to);
    }
    if (inherit_to_customer !== undefined) {
      updates.push(`inherit_to_customer = $${paramIndex++}`);
      params.push(inherit_to_customer);
    }
    if (show_as_badge !== undefined) {
      updates.push(`show_as_badge = $${paramIndex++}`);
      params.push(show_as_badge);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id, tenantId);

    const result = await db.query(
      `UPDATE class_tags SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A tag with this name already exists' });
    }
    next(error);
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag (hard delete since tags are not sensitive data)
 */
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM class_tags WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags/:id/assign
 * Assign a tag to a class or template
 */
router.post('/:id/assign', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { class_id, template_id } = req.body;

    if (!class_id && !template_id) {
      return res.status(400).json({ error: 'Either class_id or template_id is required' });
    }

    if (class_id && template_id) {
      return res.status(400).json({ error: 'Only one of class_id or template_id can be provided' });
    }

    const result = await db.query(
      `INSERT INTO class_tag_assignments (tag_id, class_id, template_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [id, class_id || null, template_id || null]
    );

    res.status(201).json(result.rows[0] || { message: 'Tag already assigned' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tags/:id/unassign
 * Remove a tag from a class or template
 */
router.delete('/:id/unassign', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { class_id, template_id } = req.body;

    let query = `DELETE FROM class_tag_assignments WHERE tag_id = $1`;
    const params = [id];

    if (class_id) {
      query += ` AND class_id = $2`;
      params.push(class_id);
    } else if (template_id) {
      query += ` AND template_id = $2`;
      params.push(template_id);
    } else {
      return res.status(400).json({ error: 'Either class_id or template_id is required' });
    }

    await db.query(query, params);
    res.json({ message: 'Tag unassigned successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/for-class/:classId
 * Get all tags assigned to a specific class
 */
router.get('/for-class/:classId', async (req, res, next) => {
  try {
    const { classId } = req.params;

    const result = await db.query(
      `SELECT ct.*
       FROM class_tags ct
       JOIN class_tag_assignments cta ON ct.id = cta.tag_id
       WHERE cta.class_id = $1 AND ct.is_active = true`,
      [classId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/for-template/:templateId
 * Get all tags assigned to a specific template
 */
router.get('/for-template/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;

    const result = await db.query(
      `SELECT ct.*
       FROM class_tags ct
       JOIN class_tag_assignments cta ON ct.id = cta.tag_id
       WHERE cta.template_id = $1 AND ct.is_active = true`,
      [templateId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
