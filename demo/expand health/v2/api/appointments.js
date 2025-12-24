/**
 * Appointments API Routes
 * Handles CRUD operations for appointments/bookings
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// APPOINTMENTS CRUD
// ============================================

/**
 * GET /api/appointments
 * List appointments with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      start_date,
      end_date,
      staff_id,
      client_id,
      service_type_id,
      status,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        a.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        st.name as service_name,
        st.color as service_color,
        st.duration_minutes as service_duration
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN staff s ON a.staff_id = s.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      WHERE a.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

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

    if (staff_id) {
      query += ` AND a.staff_id = $${paramIndex}`;
      params.push(staff_id);
      paramIndex++;
    }

    if (client_id) {
      query += ` AND a.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (service_type_id) {
      query += ` AND a.service_type_id = $${paramIndex}`;
      params.push(service_type_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY a.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      appointments: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments/calendar
 * Get appointments formatted for calendar view
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
        a.id,
        a.title,
        a.start_time,
        a.end_time,
        a.status,
        a.location_type,
        a.client_id,
        a.staff_id,
        a.service_type_id,
        c.first_name || ' ' || c.last_name as client_name,
        s.first_name || ' ' || s.last_name as staff_name,
        s.color as staff_color,
        st.name as service_name,
        st.color as service_color
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN staff s ON a.staff_id = s.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      WHERE a.tenant_id = $1
        AND a.start_time >= $2
        AND a.end_time <= $3
    `;

    const params = [tenantId, start, end];

    if (staff_id) {
      query += ` AND a.staff_id = $4`;
      params.push(staff_id);
    }

    query += ` ORDER BY a.start_time ASC`;

    const result = await db.query(query, params);

    // Format for FullCalendar
    const events = result.rows.map(apt => ({
      id: apt.id,
      title: apt.title || apt.service_name || 'Appointment',
      start: apt.start_time,
      end: apt.end_time,
      backgroundColor: apt.service_color || apt.staff_color || '#3B82F6',
      borderColor: apt.service_color || apt.staff_color || '#3B82F6',
      extendedProps: {
        status: apt.status,
        clientId: apt.client_id,
        clientName: apt.client_name,
        staffId: apt.staff_id,
        staffName: apt.staff_name,
        serviceId: apt.service_type_id,
        serviceName: apt.service_name,
        locationType: apt.location_type
      }
    }));

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments/:id
 * Get single appointment details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        a.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.email as staff_email,
        st.name as service_name,
        st.duration_minutes as service_duration,
        st.price as service_price,
        u.email as created_by_email
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN staff s ON a.staff_id = s.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1 AND a.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments
 * Create new appointment
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const {
      client_id,
      staff_id,
      service_type_id,
      title,
      start_time,
      end_time,
      status = 'scheduled',
      location_type = 'in_person',
      location_address,
      video_link,
      price,
      client_notes,
      staff_notes,
      internal_notes
    } = req.body;

    // Validate required fields
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }

    // Check for conflicts if staff is assigned
    if (staff_id) {
      const conflictCheck = await db.query(`
        SELECT id FROM appointments
        WHERE staff_id = $1
          AND status NOT IN ('cancelled', 'no_show')
          AND (
            (start_time <= $2 AND end_time > $2) OR
            (start_time < $3 AND end_time >= $3) OR
            (start_time >= $2 AND end_time <= $3)
          )
      `, [staff_id, start_time, end_time]);

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'Time slot conflict',
          conflicting_appointment_id: conflictCheck.rows[0].id
        });
      }
    }

    const result = await db.query(`
      INSERT INTO appointments (
        tenant_id, client_id, staff_id, service_type_id,
        title, start_time, end_time, status,
        location_type, location_address, video_link,
        price, client_notes, staff_notes, internal_notes,
        booked_by, booking_source, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      tenantId, client_id, staff_id, service_type_id,
      title, start_time, end_time, status,
      location_type, location_address, video_link,
      price, client_notes, staff_notes, internal_notes,
      'staff', 'admin', userId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/appointments/:id
 * Update appointment
 */
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const {
      client_id,
      staff_id,
      service_type_id,
      title,
      start_time,
      end_time,
      status,
      location_type,
      location_address,
      video_link,
      price,
      payment_status,
      client_notes,
      staff_notes,
      internal_notes
    } = req.body;

    // Check appointment exists and belongs to tenant
    const existing = await db.query(
      'SELECT id FROM appointments WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check for conflicts if changing time/staff
    if (staff_id && (start_time || end_time)) {
      const conflictCheck = await db.query(`
        SELECT id FROM appointments
        WHERE staff_id = $1
          AND id != $2
          AND status NOT IN ('cancelled', 'no_show')
          AND (
            (start_time <= $3 AND end_time > $3) OR
            (start_time < $4 AND end_time >= $4) OR
            (start_time >= $3 AND end_time <= $4)
          )
      `, [staff_id, id, start_time, end_time]);

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'Time slot conflict',
          conflicting_appointment_id: conflictCheck.rows[0].id
        });
      }
    }

    const result = await db.query(`
      UPDATE appointments SET
        client_id = COALESCE($1, client_id),
        staff_id = COALESCE($2, staff_id),
        service_type_id = COALESCE($3, service_type_id),
        title = COALESCE($4, title),
        start_time = COALESCE($5, start_time),
        end_time = COALESCE($6, end_time),
        status = COALESCE($7, status),
        location_type = COALESCE($8, location_type),
        location_address = COALESCE($9, location_address),
        video_link = COALESCE($10, video_link),
        price = COALESCE($11, price),
        payment_status = COALESCE($12, payment_status),
        client_notes = COALESCE($13, client_notes),
        staff_notes = COALESCE($14, staff_notes),
        internal_notes = COALESCE($15, internal_notes),
        updated_at = NOW()
      WHERE id = $16 AND tenant_id = $17
      RETURNING *
    `, [
      client_id, staff_id, service_type_id,
      title, start_time, end_time, status,
      location_type, location_address, video_link,
      price, payment_status,
      client_notes, staff_notes, internal_notes,
      id, tenantId
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/cancel
 * Cancel an appointment
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(`
      UPDATE appointments SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'staff',
        cancellation_reason = $1,
        updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [reason, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/check-in
 * Mark client as checked in
 */
router.post('/:id/check-in', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE appointments SET
        status = 'in_progress',
        checked_in_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/complete
 * Mark appointment as completed
 */
router.post('/:id/complete', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE appointments SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/no-show
 * Mark client as no-show
 */
router.post('/:id/no-show', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE appointments SET
        status = 'no_show',
        no_show = true,
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/appointments/:id
 * Delete appointment (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM appointments WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

// ============================================
// AVAILABILITY CHECK
// ============================================

/**
 * GET /api/appointments/availability/slots
 * Get available time slots for booking
 */
router.get('/availability/slots', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { date, staff_id, service_type_id, duration_minutes = 60 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const dayOfWeek = new Date(date).getDay();

    // Get staff availability for this day
    let availabilityQuery = `
      SELECT sa.*, s.id as staff_id, s.first_name, s.last_name
      FROM staff_availability sa
      JOIN staff s ON sa.staff_id = s.id
      WHERE s.tenant_id = $1
        AND sa.day_of_week = $2
        AND sa.is_available = true
        AND s.is_active = true
        AND s.accepts_bookings = true
    `;
    const params = [tenantId, dayOfWeek];

    if (staff_id) {
      availabilityQuery += ` AND s.id = $3`;
      params.push(staff_id);
    }

    const availabilityResult = await db.query(availabilityQuery, params);

    if (availabilityResult.rows.length === 0) {
      return res.json({ slots: [], message: 'No availability for this date' });
    }

    // Get existing appointments for this date
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const appointmentsResult = await db.query(`
      SELECT staff_id, start_time, end_time
      FROM appointments
      WHERE tenant_id = $1
        AND start_time >= $2
        AND start_time <= $3
        AND status NOT IN ('cancelled', 'no_show')
    `, [tenantId, startOfDay, endOfDay]);

    // Get time-off for this date
    const timeOffResult = await db.query(`
      SELECT staff_id, start_datetime, end_datetime
      FROM staff_time_off
      WHERE start_datetime <= $1
        AND end_datetime >= $2
    `, [endOfDay, startOfDay]);

    // Calculate available slots
    const slots = [];
    const duration = parseInt(duration_minutes) || 60;

    for (const availability of availabilityResult.rows) {
      const staffAppointments = appointmentsResult.rows.filter(
        a => a.staff_id === availability.staff_id
      );
      const staffTimeOff = timeOffResult.rows.filter(
        t => t.staff_id === availability.staff_id
      );

      // Generate slots based on availability
      const startTime = new Date(`${date}T${availability.start_time}`);
      const endTime = new Date(`${date}T${availability.end_time}`);

      let currentSlot = new Date(startTime);

      while (currentSlot.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + duration * 60000);

        // Check if slot conflicts with existing appointments
        const hasConflict = staffAppointments.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return (currentSlot < aptEnd && slotEnd > aptStart);
        });

        // Check if slot conflicts with time-off
        const hasTimeOff = staffTimeOff.some(to => {
          const toStart = new Date(to.start_datetime);
          const toEnd = new Date(to.end_datetime);
          return (currentSlot < toEnd && slotEnd > toStart);
        });

        if (!hasConflict && !hasTimeOff) {
          slots.push({
            staff_id: availability.staff_id,
            staff_name: `${availability.first_name} ${availability.last_name}`,
            start_time: currentSlot.toISOString(),
            end_time: slotEnd.toISOString(),
            duration_minutes: duration
          });
        }

        // Move to next slot (30-minute intervals)
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
      }
    }

    res.json({ slots });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
