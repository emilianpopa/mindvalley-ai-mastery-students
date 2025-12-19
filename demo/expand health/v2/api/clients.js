/**
 * Client Management API Routes
 * Handles CRUD operations for clients
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

// Get all clients (with search and pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        first_name ILIKE $${paramCount} OR
        last_name ILIKE $${paramCount} OR
        email ILIKE $${paramCount} OR
        phone ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get clients
    const validSortColumns = ['first_name', 'last_name', 'email', 'created_at', 'date_of_birth'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryParams.push(limit, offset);
    const clientsQuery = `
      SELECT
        id, first_name, last_name, email, phone,
        date_of_birth, gender, status,
        created_at, updated_at, last_login
      FROM clients
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const clientsResult = await db.query(clientsQuery, queryParams);

    res.json({
      clients: clientsResult.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get single client by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id, first_name, last_name, email, phone,
        date_of_birth, gender, address, city, state,
        zip_code, emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies,
        status, created_at, updated_at
      FROM clients
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Create new client
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      zip_code,
      emergency_contact_name,
      emergency_contact_phone,
      medical_history,
      current_medications,
      allergies
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        error: 'First name, last name, and email are required'
      });
    }

    // Check if email already exists
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE email = $1',
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({
        error: 'A client with this email already exists'
      });
    }

    // Insert client
    const result = await db.query(
      `INSERT INTO clients (
        first_name, last_name, email, phone, date_of_birth, gender,
        address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, first_name, last_name, email, phone, created_at`,
      [
        first_name, last_name, email, phone, date_of_birth, gender,
        address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies, 'active'
      ]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      zip_code,
      emergency_contact_name,
      emergency_contact_phone,
      medical_history,
      current_medications,
      allergies,
      status
    } = req.body;

    // Check if client exists
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE id = $1',
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if email is being changed to one that already exists
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'A client with this email already exists'
        });
      }
    }

    // Update client
    const result = await db.query(
      `UPDATE clients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        zip_code = COALESCE($10, zip_code),
        emergency_contact_name = COALESCE($11, emergency_contact_name),
        emergency_contact_phone = COALESCE($12, emergency_contact_phone),
        medical_history = COALESCE($13, medical_history),
        current_medications = COALESCE($14, current_medications),
        allergies = COALESCE($15, allergies),
        status = COALESCE($16, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING id, first_name, last_name, email, phone, status, updated_at`,
      [
        first_name, last_name, email, phone, date_of_birth, gender,
        address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies, status, id
      ]
    );

    res.json({
      message: 'Client updated successfully',
      client: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Delete client (soft delete - set status to 'archived')
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE clients
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client archived successfully' });

  } catch (error) {
    next(error);
  }
});

// Get client stats
router.get('/stats/summary', authenticateToken, async (req, res, next) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_clients,
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM clients
    `;

    const result = await db.query(statsQuery);
    res.json({ stats: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Get client health metrics (biological age, vitals, wearable data)
router.get('/:id/health-metrics', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get client basic info for age calculation
    const clientResult = await db.query(
      'SELECT id, first_name, last_name, date_of_birth FROM clients WHERE id = $1',
      [id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    // Calculate chronological age
    let chronologicalAge = null;
    if (client.date_of_birth) {
      const birthDate = new Date(client.date_of_birth);
      const today = new Date();
      chronologicalAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // For now, return mock data that can be dynamically replaced
    // In production, this would pull from:
    // - Lab results (blood tests, biomarkers)
    // - Wearable integrations (Oura, Whoop, Apple Health)
    // - Form submissions (intake forms with vitals)
    // - AI-calculated biological age from biomarkers

    // Mock biological age calculation (4 years younger than chronological)
    const biologicalAge = chronologicalAge ? chronologicalAge - 4 : null;

    // Mock vitals data - in production would come from latest form submission or lab
    const vitals = {
      weight: { value: 82, unit: 'kg', lastUpdated: '2025-05-31' },
      height: { value: 178, unit: 'cm', lastUpdated: '2025-05-31' },
      bmi: { value: 25.9, lastUpdated: '2025-05-31' },
      bloodPressure: { systolic: 128, diastolic: 82, unit: 'mmHg', lastUpdated: '2025-05-31' }
    };

    // Mock wearable data - in production would come from wearable integrations
    const wearableVitals = {
      vo2Max: { value: 42.5, unit: 'ml/kg/min', trend: 2.3, lastUpdated: '2025-06-01' },
      restingHeartRate: { value: 58, unit: 'bpm', trend: -3, lastUpdated: '2025-06-01' },
      hrv: { value: 45, unit: 'ms', trend: 8, lastUpdated: '2025-06-01' },
      source: 'Oura Ring',
      lastSync: '2h ago'
    };

    // Health scores - in production would be calculated from all data sources
    const healthScores = {
      sleep: { score: 48, status: 'warning' },
      diet: { score: 90, status: 'good' },
      stress: { score: 42, status: 'poor' },
      activity: { score: 89, status: 'good' }
    };

    res.json({
      clientId: id,
      clientName: `${client.first_name} ${client.last_name}`,
      biologicalAge: {
        value: biologicalAge,
        chronologicalAge: chronologicalAge,
        difference: chronologicalAge && biologicalAge ? chronologicalAge - biologicalAge : null,
        lastUpdated: '2025-05-31'
      },
      vitals,
      wearableVitals,
      healthScores
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
