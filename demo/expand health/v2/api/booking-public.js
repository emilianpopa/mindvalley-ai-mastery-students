/**
 * Public Booking API Routes
 * Unauthenticated endpoints for client self-booking
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============================================
// PUBLIC BOOKING ENDPOINTS (NO AUTH REQUIRED)
// ============================================

/**
 * GET /api/book/:tenantSlug
 * Get booking page configuration for a tenant
 */
router.get('/:tenantSlug', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;

    // Find tenant by slug
    const tenantResult = await db.query(`
      SELECT id, name, slug FROM tenants WHERE slug = $1
    `, [tenantSlug]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking page not found' });
    }

    const tenant = tenantResult.rows[0];

    // Get booking settings
    const settingsResult = await db.query(`
      SELECT * FROM booking_settings WHERE tenant_id = $1
    `, [tenant.id]);

    const settings = settingsResult.rows[0] || {
      booking_enabled: true,
      show_staff_selection: true,
      show_prices: true,
      booking_page_title: tenant.name,
      booking_page_color: '#0F766E'
    };

    if (!settings.booking_enabled) {
      return res.status(403).json({ error: 'Online booking is currently disabled' });
    }

    // Get active services
    const servicesResult = await db.query(`
      SELECT
        st.id, st.name, st.description, st.duration_minutes, st.price, st.color
      FROM service_types st
      WHERE st.tenant_id = $1 AND st.is_active = true
      ORDER BY st.name
    `, [tenant.id]);

    // Get active staff if staff selection is enabled
    let staff = [];
    if (settings.show_staff_selection) {
      const staffResult = await db.query(`
        SELECT
          s.id, s.first_name, s.last_name, s.title, s.bio, s.photo_url, s.color
        FROM staff s
        WHERE s.tenant_id = $1 AND s.is_active = true AND s.accepts_bookings = true
        ORDER BY s.first_name, s.last_name
      `, [tenant.id]);
      staff = staffResult.rows;
    }

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      settings: {
        title: settings.booking_page_title || tenant.name,
        description: settings.booking_page_description,
        logo_url: settings.booking_page_logo_url,
        color: settings.booking_page_color,
        show_staff_selection: settings.show_staff_selection,
        show_prices: settings.show_prices,
        min_booking_notice_hours: settings.min_booking_notice_hours || 24,
        max_booking_advance_days: settings.max_booking_advance_days || 60,
        cancellation_policy: settings.cancellation_policy
      },
      services: servicesResult.rows,
      staff: staff
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/book/:tenantSlug/availability
 * Get available time slots for a specific date
 */
router.get('/:tenantSlug/availability', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const { date, service_id, staff_id } = req.query;

    if (!date || !service_id) {
      return res.status(400).json({ error: 'date and service_id are required' });
    }

    // Find tenant
    const tenantResult = await db.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking page not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get service duration
    const serviceResult = await db.query(
      'SELECT duration_minutes FROM service_types WHERE id = $1 AND tenant_id = $2',
      [service_id, tenantId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const duration = serviceResult.rows[0].duration_minutes;
    const dayOfWeek = new Date(date).getDay();

    // Get staff availability for this day
    let availabilityQuery = `
      SELECT sa.*, s.id as staff_id, s.first_name, s.last_name
      FROM staff_availability sa
      JOIN staff s ON sa.staff_id = s.id
      JOIN staff_services ss ON s.id = ss.staff_id
      WHERE s.tenant_id = $1
        AND sa.day_of_week = $2
        AND sa.is_available = true
        AND s.is_active = true
        AND s.accepts_bookings = true
        AND ss.service_type_id = $3
        AND ss.is_active = true
    `;
    const params = [tenantId, dayOfWeek, service_id];

    if (staff_id) {
      availabilityQuery += ` AND s.id = $4`;
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
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now

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

        // Skip slots in the past or within minimum booking notice
        if (currentSlot < minBookingTime) {
          currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
          continue;
        }

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
            display_time: currentSlot.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          });
        }

        // Move to next slot (30-minute intervals)
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
      }
    }

    // Sort by time, then by staff name
    slots.sort((a, b) => {
      const timeCompare = new Date(a.start_time) - new Date(b.start_time);
      if (timeCompare !== 0) return timeCompare;
      return a.staff_name.localeCompare(b.staff_name);
    });

    res.json({ slots });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/book/:tenantSlug
 * Create a new booking (client self-booking)
 */
router.post('/:tenantSlug', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const {
      service_id,
      staff_id,
      start_time,
      end_time,
      client_first_name,
      client_last_name,
      client_email,
      client_phone,
      client_notes
    } = req.body;

    // Validate required fields
    if (!service_id || !start_time || !end_time || !client_first_name || !client_last_name || !client_email) {
      return res.status(400).json({
        error: 'Missing required fields: service_id, start_time, end_time, client_first_name, client_last_name, client_email'
      });
    }

    // Find tenant
    const tenantResult = await db.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking page not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get service details
    const serviceResult = await db.query(
      'SELECT * FROM service_types WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [service_id, tenantId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // Check for time slot conflicts
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
          error: 'This time slot is no longer available. Please select a different time.'
        });
      }
    }

    // Find or create client
    let clientId = null;
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE email = $1 AND tenant_id = $2',
      [client_email.toLowerCase(), tenantId]
    );

    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      // Create new client
      const newClient = await db.query(`
        INSERT INTO clients (tenant_id, first_name, last_name, email, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [tenantId, client_first_name, client_last_name, client_email.toLowerCase(), client_phone]);

      clientId = newClient.rows[0].id;
    }

    // Create the appointment
    const appointmentResult = await db.query(`
      INSERT INTO appointments (
        tenant_id, client_id, staff_id, service_type_id,
        title, start_time, end_time, status,
        price, client_notes, booked_by, booking_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      tenantId,
      clientId,
      staff_id || null,
      service_id,
      service.name,
      start_time,
      end_time,
      'scheduled',
      service.price,
      client_notes,
      'client',
      'online'
    ]);

    const appointment = appointmentResult.rows[0];

    // TODO: Send confirmation email

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      appointment: {
        id: appointment.id,
        service: service.name,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/book/:tenantSlug/cancel/:appointmentId
 * Cancel a booking (requires email verification)
 */
router.post('/:tenantSlug/cancel/:appointmentId', async (req, res, next) => {
  try {
    const { tenantSlug, appointmentId } = req.params;
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    // Find tenant
    const tenantResult = await db.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking page not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Find appointment and verify client email
    const appointmentResult = await db.query(`
      SELECT a.*, c.email as client_email
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = $1 AND a.tenant_id = $2
    `, [appointmentId, tenantId]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentResult.rows[0];

    // Verify email matches
    if (appointment.client_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match the booking' });
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Check if appointment is in the past
    if (new Date(appointment.start_time) < new Date()) {
      return res.status(400).json({ error: 'Cannot cancel past appointments' });
    }

    // Cancel the appointment
    await db.query(`
      UPDATE appointments SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'client',
        cancellation_reason = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [reason, appointmentId]);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
