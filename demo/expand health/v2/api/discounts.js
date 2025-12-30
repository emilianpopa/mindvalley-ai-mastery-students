/**
 * Discount Codes API Routes
 * Handles CRUD operations for discount codes/coupons
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// DISCOUNT CODES CRUD
// ============================================

/**
 * GET /api/discounts
 * List all discount codes
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { active_only = 'false', applies_to } = req.query;

    let query = `
      SELECT
        d.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM discount_codes d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (active_only === 'true') {
      query += ` AND d.is_active = true AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)`;
    }

    if (applies_to) {
      query += ` AND d.applies_to = $${paramIndex}`;
      params.push(applies_to);
      paramIndex++;
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/discounts/:id
 * Get a single discount code
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        d.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM discount_codes d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = $1 AND d.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/discounts/validate/:code
 * Validate a discount code (for checkout)
 */
router.get('/validate/:code', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { code } = req.params;
    const { purchase_amount, item_type } = req.query;

    const result = await db.query(`
      SELECT * FROM discount_codes
      WHERE code = $1 AND tenant_id = $2
    `, [code.toUpperCase(), tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid discount code' });
    }

    const discount = result.rows[0];

    // Check if active
    if (!discount.is_active) {
      return res.json({ valid: false, error: 'This discount code is no longer active' });
    }

    // Check date validity
    const now = new Date();
    if (discount.start_date && new Date(discount.start_date) > now) {
      return res.json({ valid: false, error: 'This discount code is not yet valid' });
    }
    if (discount.end_date && new Date(discount.end_date) < now) {
      return res.json({ valid: false, error: 'This discount code has expired' });
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return res.json({ valid: false, error: 'This discount code has reached its usage limit' });
    }

    // Check minimum purchase amount
    if (discount.min_purchase_amount && purchase_amount) {
      if (parseFloat(purchase_amount) < parseFloat(discount.min_purchase_amount)) {
        return res.json({
          valid: false,
          error: `Minimum purchase of ${discount.min_purchase_amount} required`
        });
      }
    }

    // Check applies_to constraint
    if (discount.applies_to !== 'all' && item_type) {
      if (discount.applies_to !== item_type) {
        return res.json({
          valid: false,
          error: `This discount code only applies to ${discount.applies_to}`
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (purchase_amount) {
      if (discount.discount_type === 'percentage') {
        discountAmount = (parseFloat(purchase_amount) * parseFloat(discount.discount_value)) / 100;
        if (discount.max_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(discount.max_discount_amount));
        }
      } else if (discount.discount_type === 'fixed_amount') {
        discountAmount = parseFloat(discount.discount_value);
      }
    }

    res.json({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        name: discount.name,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        applies_to: discount.applies_to,
        calculated_discount: discountAmount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discounts
 * Create a new discount code
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      applies_to = 'all',
      applicable_item_ids,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      per_customer_limit = 1,
      start_date,
      end_date,
      first_time_only = false,
      stackable = false
    } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'Code, discount_type, and discount_value are required' });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim();

    // Check if code already exists
    const existingCheck = await db.query(
      'SELECT id FROM discount_codes WHERE code = $1 AND tenant_id = $2',
      [normalizedCode, tenantId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A discount code with this code already exists' });
    }

    const result = await db.query(`
      INSERT INTO discount_codes (
        tenant_id, code, name, description, discount_type, discount_value,
        applies_to, applicable_item_ids, min_purchase_amount, max_discount_amount,
        usage_limit, per_customer_limit, start_date, end_date, first_time_only,
        stackable, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      tenantId, normalizedCode, name, description, discount_type, discount_value,
      applies_to, applicable_item_ids, min_purchase_amount, max_discount_amount,
      usage_limit, per_customer_limit, start_date, end_date, first_time_only,
      stackable, userId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/discounts/:id
 * Update a discount code
 */
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      applies_to,
      applicable_item_ids,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      per_customer_limit,
      start_date,
      end_date,
      is_active,
      first_time_only,
      stackable
    } = req.body;

    // Normalize code if provided
    const normalizedCode = code ? code.toUpperCase().trim() : null;

    // If code is being changed, check for duplicates
    if (normalizedCode) {
      const existingCheck = await db.query(
        'SELECT id FROM discount_codes WHERE code = $1 AND tenant_id = $2 AND id != $3',
        [normalizedCode, tenantId, id]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A discount code with this code already exists' });
      }
    }

    const result = await db.query(`
      UPDATE discount_codes SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        discount_type = COALESCE($4, discount_type),
        discount_value = COALESCE($5, discount_value),
        applies_to = COALESCE($6, applies_to),
        applicable_item_ids = COALESCE($7, applicable_item_ids),
        min_purchase_amount = COALESCE($8, min_purchase_amount),
        max_discount_amount = COALESCE($9, max_discount_amount),
        usage_limit = COALESCE($10, usage_limit),
        per_customer_limit = COALESCE($11, per_customer_limit),
        start_date = COALESCE($12, start_date),
        end_date = COALESCE($13, end_date),
        is_active = COALESCE($14, is_active),
        first_time_only = COALESCE($15, first_time_only),
        stackable = COALESCE($16, stackable),
        updated_at = NOW()
      WHERE id = $17 AND tenant_id = $18
      RETURNING *
    `, [
      normalizedCode, name, description, discount_type, discount_value,
      applies_to, applicable_item_ids, min_purchase_amount, max_discount_amount,
      usage_limit, per_customer_limit, start_date, end_date, is_active,
      first_time_only, stackable, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/discounts/:id
 * Delete a discount code
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM discount_codes WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discounts/:id/increment-usage
 * Increment usage count when a discount is used
 */
router.post('/:id/increment-usage', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE discount_codes SET
        usage_count = usage_count + 1,
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
