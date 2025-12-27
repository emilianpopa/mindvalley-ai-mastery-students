/**
 * Classes API Routes
 * Handles CRUD operations for class templates and scheduled classes
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// CLASS TEMPLATES CRUD
// ============================================

/**
 * GET /api/classes/templates
 * List all class templates
 */
router.get('/templates', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { class_kind, active_only = 'true' } = req.query;

    let query = `
      SELECT
        ct.*,
        s.first_name || ' ' || s.last_name as default_staff_name,
        l.name as location_name
      FROM class_templates ct
      LEFT JOIN staff s ON ct.default_staff_id = s.id
      LEFT JOIN locations l ON ct.location_id = l.id
      WHERE ct.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (active_only === 'true') {
      query += ` AND ct.is_active = true`;
    }

    if (class_kind) {
      query += ` AND ct.class_kind = $${paramIndex}`;
      params.push(class_kind);
      paramIndex++;
    }

    query += ` ORDER BY ct.name ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/templates/:id
 * Get a single class template
 */
router.get('/templates/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        ct.*,
        s.first_name || ' ' || s.last_name as default_staff_name,
        l.name as location_name
      FROM class_templates ct
      LEFT JOIN staff s ON ct.default_staff_id = s.id
      LEFT JOIN locations l ON ct.location_id = l.id
      WHERE ct.id = $1 AND ct.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/templates
 * Create a new class template
 */
router.post('/templates', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name,
      description,
      class_kind = 'class',
      duration_minutes = 60,
      max_participants,
      price,
      color = '#6366F1',
      image_url,
      location_id,
      default_staff_id,
      enable_waitlist = false,
      enable_spot_selection = false
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await db.query(`
      INSERT INTO class_templates (
        tenant_id, name, description, class_kind, duration_minutes,
        max_participants, price, color, image_url, location_id,
        default_staff_id, enable_waitlist, enable_spot_selection
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      tenantId, name, description, class_kind, duration_minutes,
      max_participants, price, color, image_url, location_id,
      default_staff_id, enable_waitlist, enable_spot_selection
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/classes/templates/:id
 * Update a class template
 */
router.put('/templates/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const {
      name,
      description,
      class_kind,
      duration_minutes,
      max_participants,
      price,
      color,
      image_url,
      location_id,
      default_staff_id,
      enable_waitlist,
      enable_spot_selection,
      is_active
    } = req.body;

    const result = await db.query(`
      UPDATE class_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        class_kind = COALESCE($3, class_kind),
        duration_minutes = COALESCE($4, duration_minutes),
        max_participants = COALESCE($5, max_participants),
        price = COALESCE($6, price),
        color = COALESCE($7, color),
        image_url = COALESCE($8, image_url),
        location_id = COALESCE($9, location_id),
        default_staff_id = COALESCE($10, default_staff_id),
        enable_waitlist = COALESCE($11, enable_waitlist),
        enable_spot_selection = COALESCE($12, enable_spot_selection),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15
      RETURNING *
    `, [
      name, description, class_kind, duration_minutes,
      max_participants, price, color, image_url, location_id,
      default_staff_id, enable_waitlist, enable_spot_selection,
      is_active, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/classes/templates/:id
 * Delete a class template
 */
router.delete('/templates/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM class_templates WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SCHEDULED CLASSES CRUD
// ============================================

/**
 * GET /api/classes
 * List scheduled classes with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      start_date,
      end_date,
      staff_id,
      location_id,
      class_kind,
      status,
      upcoming_only = 'false',
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        sc.*,
        ct.name as template_name,
        s.first_name || ' ' || s.last_name as staff_name,
        s.color as staff_color,
        l.name as location_name
      FROM scheduled_classes sc
      LEFT JOIN class_templates ct ON sc.template_id = ct.id
      LEFT JOIN staff s ON sc.staff_id = s.id
      LEFT JOIN locations l ON sc.location_id = l.id
      WHERE sc.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (upcoming_only === 'true') {
      query += ` AND sc.start_time >= NOW() AND sc.status = 'scheduled'`;
    }

    if (start_date) {
      query += ` AND sc.start_time >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND sc.start_time <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (staff_id) {
      query += ` AND sc.staff_id = $${paramIndex}`;
      params.push(staff_id);
      paramIndex++;
    }

    if (location_id) {
      query += ` AND sc.location_id = $${paramIndex}`;
      params.push(location_id);
      paramIndex++;
    }

    if (class_kind) {
      query += ` AND sc.class_kind = $${paramIndex}`;
      params.push(class_kind);
      paramIndex++;
    }

    if (status) {
      query += ` AND sc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY sc.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      classes: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/upcoming
 * Get upcoming classes for dashboard
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { limit = 5 } = req.query;

    const result = await db.query(`
      SELECT
        sc.*,
        ct.name as template_name,
        s.first_name || ' ' || s.last_name as staff_name,
        s.color as staff_color,
        l.name as location_name,
        (SELECT COUNT(*) FROM class_registrations cr
         WHERE cr.class_id = sc.id AND cr.status = 'registered') as registered_count
      FROM scheduled_classes sc
      LEFT JOIN class_templates ct ON sc.template_id = ct.id
      LEFT JOIN staff s ON sc.staff_id = s.id
      LEFT JOIN locations l ON sc.location_id = l.id
      WHERE sc.tenant_id = $1
        AND sc.start_time >= NOW()
        AND sc.status = 'scheduled'
      ORDER BY sc.start_time ASC
      LIMIT $2
    `, [tenantId, limit]);

    // Add relative time for each class
    const classes = result.rows.map(cls => {
      const startTime = new Date(cls.start_time);
      const now = new Date();
      const diffMs = startTime - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relativeTime = '';
      if (diffDays > 0) {
        relativeTime = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        relativeTime = `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else {
        relativeTime = 'starting soon';
      }

      return {
        ...cls,
        relativeTime
      };
    });

    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/calendar
 * Get classes formatted for calendar view
 */
router.get('/calendar', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { start, end, staff_id } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates are required' });
    }

    let query = `
      SELECT
        sc.id,
        sc.name,
        sc.start_time,
        sc.end_time,
        sc.status,
        sc.class_kind,
        sc.max_participants,
        sc.current_participants,
        sc.color,
        sc.staff_id,
        s.first_name || ' ' || s.last_name as staff_name,
        l.name as location_name
      FROM scheduled_classes sc
      LEFT JOIN staff s ON sc.staff_id = s.id
      LEFT JOIN locations l ON sc.location_id = l.id
      WHERE sc.tenant_id = $1
        AND sc.start_time >= $2
        AND sc.end_time <= $3
    `;

    const params = [tenantId, start, end];

    if (staff_id) {
      query += ` AND sc.staff_id = $4`;
      params.push(staff_id);
    }

    query += ` ORDER BY sc.start_time ASC`;

    const result = await db.query(query, params);

    // Format for FullCalendar
    const events = result.rows.map(cls => ({
      id: cls.id,
      title: cls.name,
      start: cls.start_time,
      end: cls.end_time,
      backgroundColor: cls.color || '#6366F1',
      borderColor: cls.color || '#6366F1',
      extendedProps: {
        status: cls.status,
        classKind: cls.class_kind,
        staffId: cls.staff_id,
        staffName: cls.staff_name,
        locationName: cls.location_name,
        maxParticipants: cls.max_participants,
        currentParticipants: cls.current_participants,
        type: 'class'
      }
    }));

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/:id
 * Get a single scheduled class with registrations
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const classResult = await db.query(`
      SELECT
        sc.*,
        ct.name as template_name,
        s.first_name || ' ' || s.last_name as staff_name,
        s.email as staff_email,
        l.name as location_name,
        l.address as location_address
      FROM scheduled_classes sc
      LEFT JOIN class_templates ct ON sc.template_id = ct.id
      LEFT JOIN staff s ON sc.staff_id = s.id
      LEFT JOIN locations l ON sc.location_id = l.id
      WHERE sc.id = $1 AND sc.tenant_id = $2
    `, [id, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get registrations
    const registrationsResult = await db.query(`
      SELECT
        cr.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM class_registrations cr
      JOIN clients c ON cr.client_id = c.id
      WHERE cr.class_id = $1
      ORDER BY cr.registered_at ASC
    `, [id]);

    res.json({
      ...classResult.rows[0],
      registrations: registrationsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes
 * Create a new scheduled class
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      template_id,
      name,
      description,
      class_kind = 'class',
      class_type = 'one_off',
      start_time,
      end_time,
      duration_minutes = 60,
      max_participants,
      price,
      color = '#6366F1',
      image_url,
      staff_id,
      location_id,
      enable_waitlist = false,
      enable_spot_selection = false,
      recurring_rule,
      notes
    } = req.body;

    if (!name || !start_time) {
      return res.status(400).json({ error: 'Name and start_time are required' });
    }

    // Calculate end_time if not provided
    const actualEndTime = end_time || new Date(new Date(start_time).getTime() + duration_minutes * 60000).toISOString();

    const result = await db.query(`
      INSERT INTO scheduled_classes (
        tenant_id, template_id, name, description, class_kind, class_type,
        start_time, end_time, duration_minutes, max_participants, price,
        color, image_url, staff_id, location_id, enable_waitlist,
        enable_spot_selection, recurring_rule, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      tenantId, template_id, name, description, class_kind, class_type,
      start_time, actualEndTime, duration_minutes, max_participants, price,
      color, image_url, staff_id, location_id, enable_waitlist,
      enable_spot_selection, recurring_rule, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/classes/:id
 * Update a scheduled class
 */
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const {
      name,
      description,
      class_kind,
      start_time,
      end_time,
      duration_minutes,
      max_participants,
      price,
      color,
      image_url,
      staff_id,
      location_id,
      enable_waitlist,
      enable_spot_selection,
      status,
      notes,
      detached_from_template
    } = req.body;

    const result = await db.query(`
      UPDATE scheduled_classes SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        class_kind = COALESCE($3, class_kind),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        duration_minutes = COALESCE($6, duration_minutes),
        max_participants = COALESCE($7, max_participants),
        price = COALESCE($8, price),
        color = COALESCE($9, color),
        image_url = COALESCE($10, image_url),
        staff_id = COALESCE($11, staff_id),
        location_id = COALESCE($12, location_id),
        enable_waitlist = COALESCE($13, enable_waitlist),
        enable_spot_selection = COALESCE($14, enable_spot_selection),
        status = COALESCE($15, status),
        notes = COALESCE($16, notes),
        detached_from_template = COALESCE($17, detached_from_template),
        updated_at = NOW()
      WHERE id = $18 AND tenant_id = $19
      RETURNING *
    `, [
      name, description, class_kind, start_time, end_time, duration_minutes,
      max_participants, price, color, image_url, staff_id, location_id,
      enable_waitlist, enable_spot_selection, status, notes,
      detached_from_template, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:id/cancel
 * Cancel a scheduled class
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE scheduled_classes SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Also cancel all registrations
    await db.query(`
      UPDATE class_registrations SET
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE class_id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/classes/:id
 * Delete a scheduled class
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM scheduled_classes WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CLASS REGISTRATIONS
// ============================================

/**
 * POST /api/classes/:id/register
 * Register a client for a class
 */
router.post('/:id/register', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { client_id, spot_number, payment_amount } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    // Check class exists and has availability
    const classResult = await db.query(`
      SELECT * FROM scheduled_classes
      WHERE id = $1 AND tenant_id = $2 AND status = 'scheduled'
    `, [id, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found or not available' });
    }

    const cls = classResult.rows[0];

    // Check if already registered
    const existingReg = await db.query(`
      SELECT id FROM class_registrations
      WHERE class_id = $1 AND client_id = $2 AND status != 'cancelled'
    `, [id, client_id]);

    if (existingReg.rows.length > 0) {
      return res.status(400).json({ error: 'Client already registered for this class' });
    }

    // Check capacity
    let status = 'registered';
    if (cls.max_participants && cls.current_participants >= cls.max_participants) {
      if (cls.enable_waitlist) {
        status = 'waitlisted';
      } else {
        return res.status(400).json({ error: 'Class is full' });
      }
    }

    // Create registration
    const result = await db.query(`
      INSERT INTO class_registrations (
        tenant_id, class_id, client_id, status, spot_number, payment_amount
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tenantId, id, client_id, status, spot_number, payment_amount]);

    // Update participant count if registered (not waitlisted)
    if (status === 'registered') {
      await db.query(`
        UPDATE scheduled_classes SET
          current_participants = current_participants + 1,
          updated_at = NOW()
        WHERE id = $1
      `, [id]);
    } else {
      await db.query(`
        UPDATE scheduled_classes SET
          waitlist_count = waitlist_count + 1,
          updated_at = NOW()
        WHERE id = $1
      `, [id]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:id/registrations/:registrationId/check-in
 * Check in a registration
 */
router.post('/:id/registrations/:registrationId/check-in', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id, registrationId } = req.params;

    const result = await db.query(`
      UPDATE class_registrations SET
        status = 'checked_in',
        checked_in_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND class_id = $2 AND tenant_id = $3
      RETURNING *
    `, [registrationId, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:id/registrations/:registrationId/cancel
 * Cancel a registration
 */
router.post('/:id/registrations/:registrationId/cancel', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id, registrationId } = req.params;

    // Get current registration
    const regResult = await db.query(`
      SELECT status FROM class_registrations
      WHERE id = $1 AND class_id = $2 AND tenant_id = $3
    `, [registrationId, id, tenantId]);

    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const wasRegistered = regResult.rows[0].status === 'registered';

    const result = await db.query(`
      UPDATE class_registrations SET
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND class_id = $2 AND tenant_id = $3
      RETURNING *
    `, [registrationId, id, tenantId]);

    // Update participant count
    if (wasRegistered) {
      await db.query(`
        UPDATE scheduled_classes SET
          current_participants = GREATEST(0, current_participants - 1),
          updated_at = NOW()
        WHERE id = $1
      `, [id]);

      // Promote first waitlisted person if any
      const waitlistResult = await db.query(`
        UPDATE class_registrations SET
          status = 'registered',
          updated_at = NOW()
        WHERE id = (
          SELECT id FROM class_registrations
          WHERE class_id = $1 AND status = 'waitlisted'
          ORDER BY registered_at ASC
          LIMIT 1
        )
        RETURNING *
      `, [id]);

      if (waitlistResult.rows.length > 0) {
        await db.query(`
          UPDATE scheduled_classes SET
            current_participants = current_participants + 1,
            waitlist_count = GREATEST(0, waitlist_count - 1),
            updated_at = NOW()
          WHERE id = $1
        `, [id]);
      }
    } else {
      await db.query(`
        UPDATE scheduled_classes SET
          waitlist_count = GREATEST(0, waitlist_count - 1),
          updated_at = NOW()
        WHERE id = $1
      `, [id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
