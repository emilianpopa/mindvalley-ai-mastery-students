/**
 * Global Search API
 * Searches across clients, practitioners (staff), services, and appointments
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/search
 * Global search across multiple entities
 * Query params:
 *   - q: search query (required, min 2 chars)
 *   - limit: max results per category (default 5)
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { q, limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        clients: [],
        staff: [],
        services: [],
        appointments: []
      });
    }

    const searchTerm = `%${q.toLowerCase()}%`;
    const limitNum = Math.min(parseInt(limit) || 5, 20);

    // Search clients
    const clientsQuery = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        'client' as type
      FROM clients
      WHERE tenant_id = $1
        AND (
          LOWER(first_name) LIKE $2
          OR LOWER(last_name) LIKE $2
          OR LOWER(email) LIKE $2
          OR LOWER(first_name || ' ' || last_name) LIKE $2
        )
      ORDER BY first_name, last_name
      LIMIT $3
    `;

    // Search staff/practitioners
    const staffQuery = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        'staff' as type
      FROM staff
      WHERE tenant_id = $1
        AND is_active = true
        AND (
          LOWER(first_name) LIKE $2
          OR LOWER(last_name) LIKE $2
          OR LOWER(email) LIKE $2
          OR LOWER(first_name || ' ' || last_name) LIKE $2
        )
      ORDER BY first_name, last_name
      LIMIT $3
    `;

    // Search services
    const servicesQuery = `
      SELECT
        id,
        name,
        price,
        duration_minutes,
        'service' as type
      FROM service_types
      WHERE tenant_id = $1
        AND is_active = true
        AND LOWER(name) LIKE $2
      ORDER BY name
      LIMIT $3
    `;

    // Search appointments (by title or client name)
    const appointmentsQuery = `
      SELECT
        a.id,
        a.title,
        a.start_time,
        a.status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        'appointment' as type
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.tenant_id = $1
        AND (
          LOWER(a.title) LIKE $2
          OR LOWER(c.first_name || ' ' || c.last_name) LIKE $2
        )
        AND a.start_time >= NOW() - INTERVAL '30 days'
      ORDER BY a.start_time DESC
      LIMIT $3
    `;

    // Execute all queries in parallel
    const [clients, staff, services, appointments] = await Promise.all([
      db.query(clientsQuery, [tenantId, searchTerm, limitNum]),
      db.query(staffQuery, [tenantId, searchTerm, limitNum]),
      db.query(servicesQuery, [tenantId, searchTerm, limitNum]),
      db.query(appointmentsQuery, [tenantId, searchTerm, limitNum])
    ]);

    res.json({
      clients: clients.rows,
      staff: staff.rows,
      services: services.rows,
      appointments: appointments.rows,
      query: q
    });
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
});

module.exports = router;
