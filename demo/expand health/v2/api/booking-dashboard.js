/**
 * Booking Dashboard API Routes
 * Momence-style dashboard with sales stats, appointments, and activity
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenant');
const db = require('../database/db');

// Apply auth and tenant context to all routes
router.use(authenticateToken);
router.use(setTenantContext);

/**
 * GET /api/booking-dashboard/stats
 * Get overview stats for the booking dashboard (last 30 days)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get appointment stats for last 30 days
    const appointmentStats = await db.query(`
      SELECT
        COUNT(*) as total_bookings,
        COALESCE(SUM(CASE WHEN price IS NOT NULL THEN price ELSE 0 END), 0) as total_sales,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status IN ('unpaid', 'pending') THEN 1 END) as unpaid_count
      FROM appointments
      WHERE tenant_id = $1
        AND created_at >= $2
    `, [tenantId, thirtyDaysAgo.toISOString()]);

    // Get new customers in last 30 days
    const newCustomers = await db.query(`
      SELECT COUNT(*) as count
      FROM clients
      WHERE tenant_id = $1
        AND created_at >= $2
    `, [tenantId, thirtyDaysAgo.toISOString()]);

    // Get first-time visitors (clients with only 1 appointment ever)
    const firstTimeVisitors = await db.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT client_id
        FROM appointments
        WHERE tenant_id = $1
          AND created_at >= $2
        GROUP BY client_id
        HAVING COUNT(*) = 1
      ) as first_timers
    `, [tenantId, thirtyDaysAgo.toISOString()]);

    // Get total active members/customers
    const totalMembers = await db.query(`
      SELECT COUNT(*) as count
      FROM clients
      WHERE tenant_id = $1
        AND status IN ('active', 'enabled')
    `, [tenantId]);

    // Calculate conversion rate (appointments with payment_status = 'paid' / total)
    const stats = appointmentStats.rows[0];
    const totalBookings = parseInt(stats.total_bookings) || 0;
    const paidCount = parseInt(stats.paid_count) || 0;
    const conversionRate = totalBookings > 0 ? ((paidCount / totalBookings) * 100).toFixed(1) : 0;

    res.json({
      period: 'last_30_days',
      overview: {
        totalSales: parseFloat(stats.total_sales) || 0,
        totalBookings: totalBookings,
        newCustomers: parseInt(newCustomers.rows[0].count) || 0,
        firstTimeVisitors: parseInt(firstTimeVisitors.rows[0].count) || 0,
        totalMembers: parseInt(totalMembers.rows[0].count) || 0,
        conversionRate: parseFloat(conversionRate)
      },
      appointments: {
        completed: parseInt(stats.completed) || 0,
        cancelled: parseInt(stats.cancelled) || 0,
        noShows: parseInt(stats.no_shows) || 0
      },
      payments: {
        paid: parseInt(stats.paid_count) || 0,
        unpaid: parseInt(stats.unpaid_count) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching booking dashboard stats:', error);
    next(error);
  }
});

/**
 * GET /api/booking-dashboard/sales-chart
 * Get daily sales data for chart (last 7 days)
 */
router.get('/sales-chart', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesData = await db.query(`
      SELECT
        DATE(start_time) as date,
        COALESCE(SUM(price), 0) as daily_sales,
        COUNT(*) as booking_count
      FROM appointments
      WHERE tenant_id = $1
        AND start_time >= $2
        AND status NOT IN ('cancelled')
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `, [tenantId, startDate.toISOString()]);

    // Fill in missing dates with 0
    const result = [];
    const current = new Date(startDate);
    const today = new Date();

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const found = salesData.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);

      result.push({
        date: dateStr,
        sales: found ? parseFloat(found.daily_sales) : 0,
        bookings: found ? parseInt(found.booking_count) : 0
      });

      current.setDate(current.getDate() + 1);
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching sales chart data:', error);
    next(error);
  }
});

/**
 * GET /api/booking-dashboard/upcoming-appointments
 * Get upcoming appointments for the dashboard
 */
router.get('/upcoming-appointments', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const now = new Date();

    const appointments = await db.query(`
      SELECT
        a.id,
        a.title,
        a.start_time,
        a.end_time,
        a.status,
        a.payment_status,
        a.price,
        a.location_type,
        a.location_details,
        c.id as client_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        s.id as staff_id,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        st.name as service_name,
        st.color as service_color,
        st.duration_minutes
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN staff s ON a.staff_id = s.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      WHERE a.tenant_id = $1
        AND a.start_time >= $2
        AND a.status NOT IN ('cancelled', 'no_show')
      ORDER BY a.start_time ASC
      LIMIT $3
    `, [tenantId, now.toISOString(), limit]);

    // Format for display
    const formatted = appointments.rows.map(apt => {
      const startTime = new Date(apt.start_time);
      const now = new Date();
      const diffMs = startTime - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let relativeTime = '';
      if (diffDays === 0) {
        relativeTime = 'Today';
      } else if (diffDays === 1) {
        relativeTime = 'Tomorrow';
      } else {
        relativeTime = `in ${diffDays} days`;
      }

      return {
        id: apt.id,
        title: apt.service_name || apt.title,
        startTime: apt.start_time,
        endTime: apt.end_time,
        relativeTime,
        status: apt.status,
        paymentStatus: apt.payment_status,
        price: apt.price,
        location: apt.location_type,
        locationDetails: apt.location_details,
        client: apt.client_id ? {
          id: apt.client_id,
          name: `${apt.client_first_name} ${apt.client_last_name}`,
          email: apt.client_email
        } : null,
        staff: apt.staff_id ? {
          id: apt.staff_id,
          name: `${apt.staff_first_name} ${apt.staff_last_name}`
        } : null,
        service: {
          name: apt.service_name,
          color: apt.service_color,
          duration: apt.duration_minutes
        }
      };
    });

    res.json({ appointments: formatted });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    next(error);
  }
});

/**
 * GET /api/booking-dashboard/recent-activity
 * Get recent booking activity
 */
router.get('/recent-activity', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const limit = parseInt(req.query.limit) || 10;

    // Get recent appointment activities (created, updated, cancelled)
    const recentAppointments = await db.query(`
      SELECT
        a.id,
        a.title,
        a.start_time,
        a.status,
        a.created_at,
        a.updated_at,
        a.cancelled_at,
        a.booking_source,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        st.name as service_name
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN service_types st ON a.service_type_id = st.id
      WHERE a.tenant_id = $1
      ORDER BY GREATEST(a.created_at, COALESCE(a.updated_at, a.created_at)) DESC
      LIMIT $2
    `, [tenantId, limit]);

    // Format activity entries
    const activities = recentAppointments.rows.map(apt => {
      const clientName = `${apt.client_first_name || ''} ${apt.client_last_name || ''}`.trim() || 'Unknown';
      let activityType = 'booked';
      let timestamp = apt.created_at;
      let description = '';

      if (apt.status === 'cancelled' && apt.cancelled_at) {
        activityType = 'cancelled';
        timestamp = apt.cancelled_at;
        description = `${clientName} cancelled ${apt.service_name || apt.title}`;
      } else if (apt.status === 'completed') {
        activityType = 'completed';
        description = `${clientName} completed ${apt.service_name || apt.title}`;
      } else {
        description = `${clientName} booked ${apt.service_name || apt.title}`;
      }

      // Calculate relative time
      const now = new Date();
      const activityTime = new Date(timestamp);
      const diffMs = now - activityTime;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relativeTime = '';
      if (diffMins < 60) {
        relativeTime = `${diffMins} min ago`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours} hours ago`;
      } else {
        relativeTime = `${diffDays} days ago`;
      }

      return {
        id: apt.id,
        type: activityType,
        description,
        serviceName: apt.service_name || apt.title,
        clientName,
        timestamp,
        relativeTime,
        bookingSource: apt.booking_source
      };
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    next(error);
  }
});

/**
 * GET /api/booking-dashboard/today-summary
 * Get today's appointment summary
 */
router.get('/today-summary', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaySummary = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        COALESCE(SUM(price), 0) as expected_revenue
      FROM appointments
      WHERE tenant_id = $1
        AND start_time >= $2
        AND start_time <= $3
    `, [tenantId, startOfDay.toISOString(), endOfDay.toISOString()]);

    const summary = todaySummary.rows[0];

    res.json({
      date: new Date().toISOString().split('T')[0],
      total: parseInt(summary.total) || 0,
      scheduled: parseInt(summary.scheduled) || 0,
      confirmed: parseInt(summary.confirmed) || 0,
      inProgress: parseInt(summary.in_progress) || 0,
      completed: parseInt(summary.completed) || 0,
      cancelled: parseInt(summary.cancelled) || 0,
      noShows: parseInt(summary.no_shows) || 0,
      expectedRevenue: parseFloat(summary.expected_revenue) || 0
    });
  } catch (error) {
    console.error('Error fetching today summary:', error);
    next(error);
  }
});

/**
 * GET /api/booking-dashboard/staff-performance
 * Get staff performance metrics
 */
router.get('/staff-performance', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staffPerformance = await db.query(`
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.color,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows,
        COALESCE(SUM(a.price), 0) as revenue
      FROM staff s
      LEFT JOIN appointments a ON s.id = a.staff_id
        AND a.tenant_id = $1
        AND a.start_time >= $2
      WHERE s.tenant_id = $1
        AND s.is_active = true
      GROUP BY s.id
      ORDER BY revenue DESC
    `, [tenantId, thirtyDaysAgo.toISOString()]);

    const staff = staffPerformance.rows.map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      color: s.color,
      totalAppointments: parseInt(s.total_appointments) || 0,
      completed: parseInt(s.completed) || 0,
      noShows: parseInt(s.no_shows) || 0,
      revenue: parseFloat(s.revenue) || 0
    }));

    res.json({ staff });
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    next(error);
  }
});

module.exports = router;
