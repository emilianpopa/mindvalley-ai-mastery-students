/**
 * Memberships API Routes
 * Handles CRUD operations for membership plans
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// MEMBERSHIP PLANS CRUD
// ============================================

/**
 * GET /api/memberships
 * List all membership plans
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { active_only = 'true', type } = req.query;

    let query = `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM client_memberships cm WHERE cm.membership_id = m.id AND cm.status = 'active') as active_members
      FROM memberships m
      WHERE m.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (active_only === 'true') {
      query += ` AND m.is_active = true`;
    }

    if (type) {
      query += ` AND m.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY m.name ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memberships/:id
 * Get a single membership plan with benefits
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const membershipResult = await db.query(`
      SELECT
        m.*,
        (SELECT COUNT(*) FROM client_memberships cm WHERE cm.membership_id = m.id AND cm.status = 'active') as active_members
      FROM memberships m
      WHERE m.id = $1 AND m.tenant_id = $2
    `, [id, tenantId]);

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Get benefits
    const benefitsResult = await db.query(`
      SELECT * FROM membership_benefits WHERE membership_id = $1
    `, [id]);

    res.json({
      ...membershipResult.rows[0],
      benefits: benefitsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memberships
 * Create a new membership plan
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      name,
      description,
      type = 'unlimited',
      price,
      billing_period = 'monthly',
      duration_days,
      class_limit,
      credits_amount,
      color = '#6366F1',
      allow_freeze = false,
      freeze_limit_days,
      cancellation_notice_days = 30,
      applicable_class_kinds,
      applicable_locations,
      benefits = []
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create membership
      const membershipResult = await client.query(`
        INSERT INTO memberships (
          tenant_id, name, description, type, price, billing_period,
          duration_days, class_limit, credits_amount, color, allow_freeze,
          freeze_limit_days, cancellation_notice_days, applicable_class_kinds, applicable_locations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        tenantId, name, description, type, price, billing_period,
        duration_days, class_limit, credits_amount, color, allow_freeze,
        freeze_limit_days, cancellation_notice_days, applicable_class_kinds, applicable_locations
      ]);

      const membership = membershipResult.rows[0];

      // Create benefits if provided
      if (benefits.length > 0) {
        for (const benefit of benefits) {
          await client.query(`
            INSERT INTO membership_benefits (
              membership_id, benefit_type, description, value, percentage_discount, quantity
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            membership.id, benefit.benefit_type, benefit.description,
            benefit.value, benefit.percentage_discount, benefit.quantity
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch complete membership with benefits
      const completeResult = await db.query(`
        SELECT * FROM memberships WHERE id = $1
      `, [membership.id]);

      const benefitsResult = await db.query(`
        SELECT * FROM membership_benefits WHERE membership_id = $1
      `, [membership.id]);

      res.status(201).json({
        ...completeResult.rows[0],
        benefits: benefitsResult.rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/memberships/:id
 * Update a membership plan
 */
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      name,
      description,
      type,
      price,
      billing_period,
      duration_days,
      class_limit,
      credits_amount,
      color,
      is_active,
      allow_freeze,
      freeze_limit_days,
      cancellation_notice_days,
      applicable_class_kinds,
      applicable_locations
    } = req.body;

    const result = await db.query(`
      UPDATE memberships SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        type = COALESCE($3, type),
        price = COALESCE($4, price),
        billing_period = COALESCE($5, billing_period),
        duration_days = COALESCE($6, duration_days),
        class_limit = COALESCE($7, class_limit),
        credits_amount = COALESCE($8, credits_amount),
        color = COALESCE($9, color),
        is_active = COALESCE($10, is_active),
        allow_freeze = COALESCE($11, allow_freeze),
        freeze_limit_days = COALESCE($12, freeze_limit_days),
        cancellation_notice_days = COALESCE($13, cancellation_notice_days),
        applicable_class_kinds = COALESCE($14, applicable_class_kinds),
        applicable_locations = COALESCE($15, applicable_locations),
        updated_at = NOW()
      WHERE id = $16 AND tenant_id = $17
      RETURNING *
    `, [
      name, description, type, price, billing_period,
      duration_days, class_limit, credits_amount, color, is_active,
      allow_freeze, freeze_limit_days, cancellation_notice_days,
      applicable_class_kinds, applicable_locations, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/memberships/:id
 * Delete a membership plan (soft delete by deactivating)
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Check if there are active subscriptions
    const activeCheck = await db.query(`
      SELECT COUNT(*) FROM client_memberships
      WHERE membership_id = $1 AND status = 'active'
    `, [id]);

    if (parseInt(activeCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete membership with active subscribers. Deactivate it instead.'
      });
    }

    const result = await db.query(
      'DELETE FROM memberships WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CLIENT MEMBERSHIPS
// ============================================

/**
 * GET /api/memberships/clients
 * List client memberships
 */
router.get('/clients/list', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { status, client_id, membership_id } = req.query;

    let query = `
      SELECT
        cm.*,
        m.name as membership_name,
        m.type as membership_type,
        m.price as membership_price,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email
      FROM client_memberships cm
      LEFT JOIN memberships m ON cm.membership_id = m.id
      LEFT JOIN clients c ON cm.client_id = c.id
      WHERE cm.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND cm.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (client_id) {
      query += ` AND cm.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (membership_id) {
      query += ` AND cm.membership_id = $${paramIndex}`;
      params.push(membership_id);
      paramIndex++;
    }

    query += ` ORDER BY cm.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memberships/clients
 * Assign a membership to a client
 */
router.post('/clients', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      client_id,
      membership_id,
      start_date,
      auto_renew = true
    } = req.body;

    if (!client_id || !membership_id || !start_date) {
      return res.status(400).json({ error: 'client_id, membership_id, and start_date are required' });
    }

    // Get membership details
    const membershipResult = await db.query(
      'SELECT * FROM memberships WHERE id = $1 AND tenant_id = $2',
      [membership_id, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    const membership = membershipResult.rows[0];

    // Calculate end date and next billing date
    let end_date = null;
    let next_billing_date = null;
    const startDateObj = new Date(start_date);

    if (membership.duration_days) {
      end_date = new Date(startDateObj);
      end_date.setDate(end_date.getDate() + membership.duration_days);
    }

    if (membership.billing_period !== 'one_time') {
      next_billing_date = new Date(startDateObj);
      switch (membership.billing_period) {
        case 'weekly':
          next_billing_date.setDate(next_billing_date.getDate() + 7);
          break;
        case 'monthly':
          next_billing_date.setMonth(next_billing_date.getMonth() + 1);
          break;
        case 'quarterly':
          next_billing_date.setMonth(next_billing_date.getMonth() + 3);
          break;
        case 'yearly':
          next_billing_date.setFullYear(next_billing_date.getFullYear() + 1);
          break;
      }
    }

    const result = await db.query(`
      INSERT INTO client_memberships (
        tenant_id, client_id, membership_id, status, start_date,
        end_date, next_billing_date, classes_remaining, credits_remaining, auto_renew
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      tenantId, client_id, membership_id, start_date,
      end_date, next_billing_date, membership.class_limit,
      membership.credits_amount, auto_renew
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
