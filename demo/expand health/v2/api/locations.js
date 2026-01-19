/**
 * Locations API Routes
 * Handles CRUD operations for locations/rooms
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// LOCATIONS CRUD
// ============================================

/**
 * GET /api/locations
 * List all locations for the tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { active_only } = req.query;

    let query = `
      SELECT *
      FROM locations
      WHERE tenant_id = $1
    `;

    if (active_only === 'true') {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY is_primary DESC, name ASC`;

    let result = await db.query(query, [tenantId]);

    // Auto-seed default locations if none exist for this tenant
    if (result.rows.length === 0 && tenantId) {
      console.log(`No locations for tenant ${tenantId}, auto-seeding defaults...`);
      const defaultLocations = [
        { name: '28 DeWolfe Street', is_primary: true },
        { name: 'Compression boot location', is_primary: false },
        { name: 'Consult Room 1', is_primary: false },
        { name: 'Consult Room 2', is_primary: false },
        { name: 'Consult Room 3', is_primary: false },
        { name: 'Drip Location', is_primary: false },
        { name: 'Event Space', is_primary: false },
        { name: 'HBOT', is_primary: false },
        { name: 'Hocatt + Massage', is_primary: false },
        { name: 'Ice bath 1', is_primary: false },
        { name: 'Ice bath 2', is_primary: false },
        { name: 'Infrared Sauna', is_primary: false },
        { name: 'PEMF', is_primary: false },
        { name: 'Reception / meeting space', is_primary: false },
        { name: 'Red Light Therapy Room', is_primary: false },
        { name: 'Somadome', is_primary: false },
        { name: 'Online', is_primary: false }
      ];

      for (const loc of defaultLocations) {
        await db.query(
          `INSERT INTO locations (tenant_id, name, is_primary, is_active)
           VALUES ($1, $2, $3, true)`,
          [tenantId, loc.name, loc.is_primary]
        );
      }
      console.log(`✅ Auto-seeded ${defaultLocations.length} locations for tenant ${tenantId}`);

      // Re-fetch locations
      result = await db.query(query, [tenantId]);
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/availability
 * Check which venues are occupied at a given time
 * Query params: start_time, duration (in minutes)
 * NOTE: This route MUST be before /:id to avoid being matched as an id
 */
router.get('/availability', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { start_time, duration = 60, exclude_appointment_id } = req.query;

    if (!start_time) {
      return res.status(400).json({ error: 'start_time is required' });
    }

    const startTime = new Date(start_time);
    const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

    // Get all locations
    const locationsResult = await db.query(
      `SELECT id, name FROM locations WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );

    // Find appointments that overlap with the requested time slot
    let conflictQuery = `
      SELECT DISTINCT location_id
      FROM appointments
      WHERE tenant_id = $1
        AND location_id IS NOT NULL
        AND status NOT IN ('cancelled', 'no_show')
        AND start_time < $3
        AND end_time > $2
    `;
    const queryParams = [tenantId, startTime, endTime];

    // Exclude current appointment when editing
    if (exclude_appointment_id) {
      conflictQuery += ` AND id != $4`;
      queryParams.push(exclude_appointment_id);
    }

    const conflictsResult = await db.query(conflictQuery, queryParams);
    const occupiedLocationIds = new Set(conflictsResult.rows.map(r => r.location_id));

    // Return locations with availability status
    const locations = locationsResult.rows.map(loc => ({
      ...loc,
      is_occupied: occupiedLocationIds.has(loc.id)
    }));

    res.json(locations);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/:id
 * Get single location
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM locations WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/locations
 * Create a new location
 */
router.post('/', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      name,
      address,
      city,
      state,
      zip,
      country,
      phone,
      email,
      timezone,
      is_primary
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    // If this is set as primary, unset other primary locations
    if (is_primary) {
      await db.query(
        `UPDATE locations SET is_primary = false WHERE tenant_id = $1`,
        [tenantId]
      );
    }

    const result = await db.query(
      `INSERT INTO locations (tenant_id, name, address, city, state, zip, country, phone, email, timezone, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [tenantId, name, address, city, state, zip, country || 'South Africa', phone, email, timezone || 'Africa/Johannesburg', is_primary || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/locations/:id
 * Update a location
 */
router.put('/:id', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      name,
      address,
      city,
      state,
      zip,
      country,
      phone,
      email,
      timezone,
      is_active,
      is_primary
    } = req.body;

    // Check location exists
    const existing = await db.query(
      `SELECT * FROM locations WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // If this is set as primary, unset other primary locations
    if (is_primary) {
      await db.query(
        `UPDATE locations SET is_primary = false WHERE tenant_id = $1 AND id != $2`,
        [tenantId, id]
      );
    }

    const result = await db.query(
      `UPDATE locations SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        zip = COALESCE($5, zip),
        country = COALESCE($6, country),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        timezone = COALESCE($9, timezone),
        is_active = COALESCE($10, is_active),
        is_primary = COALESCE($11, is_primary),
        updated_at = NOW()
       WHERE id = $12 AND tenant_id = $13
       RETURNING *`,
      [name, address, city, state, zip, country, phone, email, timezone, is_active, is_primary, id, tenantId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/locations/:id
 * Soft delete a location (set is_active = false)
 */
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE locations SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ message: 'Location deactivated', location: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/locations/seed
 * Seed default locations (for development)
 */
router.post('/seed', requireRole(['admin']), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Check if locations already exist
    const existing = await db.query(
      `SELECT COUNT(*) FROM locations WHERE tenant_id = $1`,
      [tenantId]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Locations already exist. Delete them first to re-seed.' });
    }

    const locations = [
      { name: '28 DeWolfe Street', is_primary: true },
      { name: 'Compression boot location', is_primary: false },
      { name: 'Consult Room 1', is_primary: false },
      { name: 'Consult Room 2', is_primary: false },
      { name: 'Consult Room 3', is_primary: false },
      { name: 'Drip Location', is_primary: false },
      { name: 'Event Space', is_primary: false },
      { name: 'HBOT', is_primary: false },
      { name: 'Hocatt + Massage', is_primary: false },
      { name: 'Ice bath 1', is_primary: false },
      { name: 'Ice bath 2', is_primary: false },
      { name: 'Infrared Sauna', is_primary: false },
      { name: 'PEMF', is_primary: false },
      { name: 'Reception / meeting space', is_primary: false },
      { name: 'Red Light Therapy Room', is_primary: false },
      { name: 'Somadome', is_primary: false },
      { name: 'Online', is_primary: false }
    ];

    const insertedLocations = [];
    for (const loc of locations) {
      const result = await db.query(
        `INSERT INTO locations (tenant_id, name, is_primary, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [tenantId, loc.name, loc.is_primary]
      );
      insertedLocations.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Seeded ${insertedLocations.length} locations`,
      locations: insertedLocations
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
