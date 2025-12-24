/**
 * Staff API Routes
 * Handles CRUD operations for staff/practitioners and their schedules
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// STAFF CRUD
// ============================================

/**
 * GET /api/staff
 * List all staff members
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { active_only, accepts_bookings } = req.query;

    let query = `
      SELECT
        s.*,
        u.email as user_email,
        COUNT(DISTINCT ss.service_type_id) as service_count
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN staff_services ss ON s.id = ss.staff_id AND ss.is_active = true
      WHERE s.tenant_id = $1
    `;

    if (active_only === 'true') {
      query += ` AND s.is_active = true`;
    }

    if (accepts_bookings === 'true') {
      query += ` AND s.accepts_bookings = true`;
    }

    query += ` GROUP BY s.id, u.email ORDER BY s.first_name, s.last_name`;

    const result = await db.query(query, [tenantId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/staff/:id
 * Get single staff member with services and availability
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Get staff member
    const staffResult = await db.query(`
      SELECT s.*, u.email as user_email
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.tenant_id = $2
    `, [id, tenantId]);

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staff = staffResult.rows[0];

    // Get services this staff can perform
    const servicesResult = await db.query(`
      SELECT
        st.id, st.name, st.duration_minutes, st.price, st.color,
        ss.custom_duration_minutes, ss.custom_price
      FROM service_types st
      JOIN staff_services ss ON st.id = ss.service_type_id
      WHERE ss.staff_id = $1 AND ss.is_active = true AND st.is_active = true
      ORDER BY st.name
    `, [id]);

    staff.services = servicesResult.rows;

    // Get availability schedule
    const availabilityResult = await db.query(`
      SELECT * FROM staff_availability
      WHERE staff_id = $1
      ORDER BY day_of_week, start_time
    `, [id]);

    staff.availability = availabilityResult.rows;

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/staff
 * Create new staff member
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const {
      user_id,
      first_name,
      last_name,
      email,
      phone,
      title,
      bio,
      photo_url,
      color = '#10B981',
      is_active = true,
      accepts_bookings = true
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const result = await db.query(`
      INSERT INTO staff (
        tenant_id, user_id, first_name, last_name, email, phone,
        title, bio, photo_url, color, is_active, accepts_bookings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      tenantId, user_id, first_name, last_name, email, phone,
      title, bio, photo_url, color, is_active, accepts_bookings
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/staff/:id
 * Update staff member
 */
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const {
      user_id,
      first_name,
      last_name,
      email,
      phone,
      title,
      bio,
      photo_url,
      color,
      is_active,
      accepts_bookings
    } = req.body;

    const result = await db.query(`
      UPDATE staff SET
        user_id = COALESCE($1, user_id),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        title = COALESCE($6, title),
        bio = COALESCE($7, bio),
        photo_url = COALESCE($8, photo_url),
        color = COALESCE($9, color),
        is_active = COALESCE($10, is_active),
        accepts_bookings = COALESCE($11, accepts_bookings),
        updated_at = NOW()
      WHERE id = $12 AND tenant_id = $13
      RETURNING *
    `, [
      user_id, first_name, last_name, email, phone,
      title, bio, photo_url, color, is_active, accepts_bookings,
      id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/staff/:id
 * Delete staff member
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Check for future appointments
    const appointmentCheck = await db.query(`
      SELECT COUNT(*) FROM appointments
      WHERE staff_id = $1 AND start_time > NOW() AND status NOT IN ('cancelled', 'no_show')
    `, [id]);

    if (parseInt(appointmentCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete staff with upcoming appointments. Deactivate instead or cancel appointments first.'
      });
    }

    await db.query(
      'DELETE FROM staff WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STAFF SERVICES (which services staff can perform)
// ============================================

/**
 * GET /api/staff/:id/services
 * Get services a staff member can perform
 */
router.get('/:id/services', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        st.*,
        ss.custom_duration_minutes,
        ss.custom_price,
        ss.is_active as staff_service_active
      FROM service_types st
      JOIN staff_services ss ON st.id = ss.service_type_id
      WHERE ss.staff_id = $1 AND st.tenant_id = $2
      ORDER BY st.name
    `, [id, tenantId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/staff/:id/services
 * Assign services to staff member
 */
router.post('/:id/services', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { service_ids, custom_durations = {}, custom_prices = {} } = req.body;

    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    // Remove existing assignments
    await db.query('DELETE FROM staff_services WHERE staff_id = $1', [id]);

    // Add new assignments
    for (const serviceId of service_ids) {
      await db.query(`
        INSERT INTO staff_services (staff_id, service_type_id, custom_duration_minutes, custom_price)
        VALUES ($1, $2, $3, $4)
      `, [
        id,
        serviceId,
        custom_durations[serviceId] || null,
        custom_prices[serviceId] || null
      ]);
    }

    res.json({ success: true, assigned_services: service_ids.length });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STAFF AVAILABILITY (weekly schedule)
// ============================================

/**
 * GET /api/staff/:id/availability
 * Get staff weekly availability schedule
 */
router.get('/:id/availability', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT * FROM staff_availability
      WHERE staff_id = $1
      ORDER BY day_of_week, start_time
    `, [id]);

    // Format as a week view
    const weekSchedule = {
      0: [], // Sunday
      1: [], // Monday
      2: [], // Tuesday
      3: [], // Wednesday
      4: [], // Thursday
      5: [], // Friday
      6: []  // Saturday
    };

    for (const row of result.rows) {
      weekSchedule[row.day_of_week].push({
        id: row.id,
        start_time: row.start_time,
        end_time: row.end_time,
        is_available: row.is_available
      });
    }

    res.json(weekSchedule);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/staff/:id/availability
 * Update staff weekly availability schedule
 */
router.put('/:id/availability', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schedule } = req.body;

    // schedule format: { 0: [{start_time, end_time}], 1: [...], ... }

    // Clear existing schedule
    await db.query('DELETE FROM staff_availability WHERE staff_id = $1', [id]);

    // Insert new schedule
    for (const [dayOfWeek, slots] of Object.entries(schedule)) {
      for (const slot of slots) {
        await db.query(`
          INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time, is_available)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, parseInt(dayOfWeek), slot.start_time, slot.end_time, slot.is_available !== false]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STAFF TIME OFF
// ============================================

/**
 * GET /api/staff/:id/time-off
 * Get staff time off / blocked time
 */
router.get('/:id/time-off', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM staff_time_off WHERE staff_id = $1';
    const params = [id];

    if (start_date && end_date) {
      query += ' AND start_datetime >= $2 AND end_datetime <= $3';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY start_datetime';

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/staff/:id/time-off
 * Add time off for staff member
 */
router.post('/:id/time-off', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_datetime, end_datetime, reason, is_all_day = false } = req.body;

    if (!start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'start_datetime and end_datetime are required' });
    }

    // Check for appointment conflicts
    const conflictCheck = await db.query(`
      SELECT COUNT(*) FROM appointments
      WHERE staff_id = $1
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time >= $2 AND start_time < $3) OR
          (end_time > $2 AND end_time <= $3)
        )
    `, [id, start_datetime, end_datetime]);

    if (parseInt(conflictCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Time off conflicts with existing appointments. Cancel appointments first.'
      });
    }

    const result = await db.query(`
      INSERT INTO staff_time_off (staff_id, start_datetime, end_datetime, reason, is_all_day)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, start_datetime, end_datetime, reason, is_all_day]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/staff/:id/time-off/:timeOffId
 * Remove time off
 */
router.delete('/:id/time-off/:timeOffId', async (req, res, next) => {
  try {
    const { id, timeOffId } = req.params;

    await db.query(
      'DELETE FROM staff_time_off WHERE id = $1 AND staff_id = $2',
      [timeOffId, id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STAFF APPOINTMENTS
// ============================================

/**
 * GET /api/staff/:id/appointments
 * Get appointments for a specific staff member
 */
router.get('/:id/appointments', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { start_date, end_date, status } = req.query;

    let query = `
      SELECT
        a.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        st.name as service_name,
        st.color as service_color
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      WHERE a.staff_id = $1 AND a.tenant_id = $2
    `;
    const params = [id, tenantId];
    let paramIndex = 3;

    if (start_date) {
      query += ` AND a.start_time >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND a.start_time <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY a.start_time';

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
