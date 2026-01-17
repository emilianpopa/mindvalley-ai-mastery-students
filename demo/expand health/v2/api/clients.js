/**
 * Client Management API Routes
 * Handles CRUD operations for clients
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenant');
const db = require('../db');

// Apply tenant context to all client routes
router.use(authenticateToken);
router.use(setTenantContext);

// Get all clients (with search and pagination)
router.get('/', async (req, res, next) => {
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

    // TENANT FILTERING: Non-platform admins only see their tenant's clients
    if (!req.user.isPlatformAdmin && req.user.tenantId) {
      paramCount++;
      whereConditions.push(`tenant_id = $${paramCount}`);
      queryParams.push(req.user.tenantId);
    }

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
      total: totalCount,
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
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build query with tenant filtering
    let query = `
      SELECT
        id, first_name, last_name, email, phone,
        date_of_birth, gender, address, city, state,
        zip_code, emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies,
        status, created_at, updated_at, tenant_id
      FROM clients
      WHERE id = $1
    `;
    const params = [id];

    // Non-platform admins can only access their tenant's clients
    if (!req.user.isPlatformAdmin && req.tenant?.id) {
      query += ` AND tenant_id = $2`;
      params.push(req.tenant.id);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Create new client
router.post('/', async (req, res, next) => {
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

    // Get tenant_id from authenticated user's context
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant context required to create client'
      });
    }

    // Check if email already exists within this tenant
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({
        error: 'A client with this email already exists in this clinic'
      });
    }

    // Insert client with tenant_id
    const result = await db.query(
      `INSERT INTO clients (
        tenant_id, first_name, last_name, email, phone, date_of_birth, gender,
        address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone,
        medical_history, current_medications, allergies, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id, first_name, last_name, email, phone, created_at`,
      [
        tenantId, first_name, last_name, email, phone, date_of_birth, gender,
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
router.put('/:id', async (req, res, next) => {
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

    // Check if client exists and belongs to tenant
    let checkQuery = 'SELECT id, tenant_id FROM clients WHERE id = $1';
    const checkParams = [id];

    if (!req.user.isPlatformAdmin && req.tenant?.id) {
      checkQuery += ' AND tenant_id = $2';
      checkParams.push(req.tenant.id);
    }

    const existingClient = await db.query(checkQuery, checkParams);

    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientTenantId = existingClient.rows[0].tenant_id;

    // Check if email is being changed to one that already exists in this tenant
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2 AND tenant_id = $3',
        [email, id, clientTenantId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'A client with this email already exists in this clinic'
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
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build query with tenant filtering
    let query = `
      UPDATE clients
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const params = [id];

    if (!req.user.isPlatformAdmin && req.tenant?.id) {
      query += ` AND tenant_id = $2`;
      params.push(req.tenant.id);
    }

    query += ` RETURNING id`;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client archived successfully' });

  } catch (error) {
    next(error);
  }
});

// Get client stats
router.get('/stats/summary', async (req, res, next) => {
  try {
    // Build query with tenant filtering
    let whereClause = '';
    const params = [];

    if (!req.user.isPlatformAdmin && req.tenant?.id) {
      whereClause = 'WHERE tenant_id = $1';
      params.push(req.tenant.id);
    }

    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_clients,
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM clients
      ${whereClause}
    `;

    const result = await db.query(statsQuery, params);
    res.json({ stats: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Get client health metrics (biological age, vitals, wearable data)
// This endpoint pulls REAL data from database sources (labs, forms, notes)
// Returns null/empty values when no data exists
router.get('/:id/health-metrics', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get client basic info for age calculation (with tenant filtering)
    let query = 'SELECT id, first_name, last_name, date_of_birth, tenant_id FROM clients WHERE id = $1';
    const params = [id];

    if (!req.user.isPlatformAdmin && req.tenant?.id) {
      query += ' AND tenant_id = $2';
      params.push(req.tenant.id);
    }

    const clientResult = await db.query(query, params);

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    // Calculate chronological age from date_of_birth
    let chronologicalAge = null;
    if (client.date_of_birth) {
      const birthDate = new Date(client.date_of_birth);
      const today = new Date();
      chronologicalAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // ============================================
    // PULL REAL VITALS FROM FORM SUBMISSIONS
    // ============================================
    let vitals = null;
    try {
      // Look for form submissions with vitals data (intake forms, health assessments)
      const formVitalsResult = await db.query(`
        SELECT fs.responses, fs.submitted_at, ft.name as form_name
        FROM form_submissions fs
        JOIN form_templates ft ON fs.form_id = ft.id
        WHERE fs.client_id = $1
        AND fs.responses IS NOT NULL
        ORDER BY fs.submitted_at DESC
        LIMIT 5
      `, [id]);

      // Search through form responses for vitals data
      for (const submission of formVitalsResult.rows) {
        const responses = typeof submission.responses === 'string'
          ? JSON.parse(submission.responses)
          : submission.responses;

        // Look for weight, height, blood pressure in form responses
        // Forms may have different field names, so we check common patterns
        const weight = extractVitalFromResponses(responses, ['weight', 'body_weight', 'current_weight']);
        const height = extractVitalFromResponses(responses, ['height', 'body_height', 'current_height']);
        const systolic = extractVitalFromResponses(responses, ['systolic', 'blood_pressure_systolic', 'bp_systolic']);
        const diastolic = extractVitalFromResponses(responses, ['diastolic', 'blood_pressure_diastolic', 'bp_diastolic']);

        if (weight || height || systolic) {
          vitals = {
            weight: weight ? { value: parseFloat(weight), unit: 'kg', lastUpdated: submission.submitted_at } : null,
            height: height ? { value: parseFloat(height), unit: 'cm', lastUpdated: submission.submitted_at } : null,
            bmi: (weight && height) ? { value: calculateBMI(parseFloat(weight), parseFloat(height)), lastUpdated: submission.submitted_at } : null,
            bloodPressure: (systolic && diastolic) ? { systolic: parseInt(systolic), diastolic: parseInt(diastolic), unit: 'mmHg', lastUpdated: submission.submitted_at } : null,
            source: submission.form_name
          };
          break; // Use the most recent form with vitals data
        }
      }
    } catch (vitalsError) {
      console.error('Error fetching vitals from forms:', vitalsError);
    }

    // ============================================
    // PULL BIOMARKERS FROM LAB RESULTS
    // ============================================
    let biologicalAgeData = null;
    let labBiomarkers = [];
    try {
      const labsResult = await db.query(`
        SELECT id, title, lab_type, test_date, extracted_data, ai_summary
        FROM labs
        WHERE client_id = $1
        ORDER BY test_date DESC NULLS LAST, created_at DESC
        LIMIT 10
      `, [id]);

      // Extract biomarkers from lab results
      for (const lab of labsResult.rows) {
        const extractedData = typeof lab.extracted_data === 'string'
          ? JSON.parse(lab.extracted_data)
          : lab.extracted_data;

        if (extractedData && extractedData.markers) {
          labBiomarkers = labBiomarkers.concat(extractedData.markers.map(m => ({
            ...m,
            labTitle: lab.title,
            testDate: lab.test_date
          })));
        }
      }

      // Biological age would ideally be calculated from multiple biomarkers
      // For now, only show if we have real lab data
      if (labBiomarkers.length > 0 && chronologicalAge) {
        // Note: Real biological age calculation would use an algorithm based on
        // multiple biomarkers (HbA1c, lipid panel, inflammatory markers, etc.)
        // For now, we'll mark it as not yet calculated
        biologicalAgeData = {
          value: null, // Not calculated without proper algorithm
          chronologicalAge: chronologicalAge,
          difference: null,
          lastUpdated: labBiomarkers[0]?.testDate || null,
          note: 'Biological age calculation requires sufficient biomarker data'
        };
      } else if (chronologicalAge) {
        biologicalAgeData = {
          value: null,
          chronologicalAge: chronologicalAge,
          difference: null,
          lastUpdated: null,
          note: 'Upload lab results to calculate biological age'
        };
      }
    } catch (labError) {
      console.error('Error fetching lab biomarkers:', labError);
    }

    // ============================================
    // WEARABLE DATA - Currently not integrated
    // ============================================
    // Wearable data would come from external integrations (Oura, Whoop, Apple Health)
    // Set to null until wearable integration is implemented
    const wearableVitals = null;

    // ============================================
    // HEALTH SCORES - Calculated from real data
    // ============================================
    // Health scores should be calculated from actual data points
    // Set to null when no data exists to calculate from
    let healthScores = null;

    // Only calculate health scores if we have sufficient data
    const hasFormData = vitals !== null;
    const hasLabData = labBiomarkers.length > 0;
    const hasNotesData = false; // Could check for clinical notes

    if (hasFormData || hasLabData) {
      // Get recent notes to assess for symptoms/issues
      const notesResult = await db.query(`
        SELECT content, note_type, created_at
        FROM notes
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [id]);

      healthScores = {
        sleep: null, // Would need sleep-related form questions or wearable data
        diet: null,  // Would need nutrition assessment form
        stress: null, // Would need stress assessment form or HRV data
        activity: null, // Would need activity tracking or wearable data
        dataAvailable: {
          forms: hasFormData,
          labs: hasLabData,
          notes: notesResult.rows.length > 0,
          wearables: false
        }
      };
    }

    // ============================================
    // RESPONSE - Only return data that actually exists
    // ============================================
    res.json({
      clientId: id,
      clientName: `${client.first_name} ${client.last_name}`,
      biologicalAge: biologicalAgeData,
      vitals: vitals,
      wearableVitals: wearableVitals,
      healthScores: healthScores,
      labBiomarkers: labBiomarkers.slice(0, 10), // Include top 10 recent biomarkers
      dataLastUpdated: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to extract vital values from form responses
function extractVitalFromResponses(responses, fieldNames) {
  if (!responses) return null;

  // Check if responses is an array (common form structure)
  if (Array.isArray(responses)) {
    for (const response of responses) {
      const fieldName = (response.field_name || response.fieldName || response.name || '').toLowerCase();
      const value = response.value || response.answer;
      if (fieldNames.some(fn => fieldName.includes(fn.toLowerCase())) && value) {
        return value;
      }
    }
  }

  // Check if responses is an object with key-value pairs
  if (typeof responses === 'object') {
    for (const [key, value] of Object.entries(responses)) {
      const keyLower = key.toLowerCase();
      if (fieldNames.some(fn => keyLower.includes(fn.toLowerCase())) && value) {
        return value;
      }
    }
  }

  return null;
}

// Helper function to calculate BMI
function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// ============================================
// BULK IMPORT CLIENTS FROM MOMENCE CSV
// ============================================

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// Parse customer from Momence format: "Name (email@example.com)"
function parseCustomerFromMomence(customerField) {
  const match = customerField.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    const fullName = match[1].trim();
    const email = match[2].trim().toLowerCase();

    // Split name into first and last
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return { firstName, lastName, email };
  }
  return null;
}

// Import clients from Momence CSV (supports both appointments CSV and direct customer export)
router.post('/import/momence', async (req, res, next) => {
  try {
    const { csvData, dryRun = true } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'csvData is required' });
    }

    // Get tenant context
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant context required to import clients'
      });
    }

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const header = parseCSVLine(lines[0]);
    const headerLower = header.map(h => h.toLowerCase().trim());

    // Detect CSV format
    // Format 1: Appointments CSV with "Customer" column containing "Name (email)"
    // Format 2: Direct customer export with separate "Name"/"First Name", "Email", "Phone" columns
    const customerIndex = headerLower.findIndex(h => h.includes('customer') || h === 'client');
    const emailIndex = headerLower.findIndex(h => h === 'email' || h === 'e-mail' || h === 'email address');
    const nameIndex = headerLower.findIndex(h => h === 'name' || h === 'full name' || h === 'customer name');
    const firstNameIndex = headerLower.findIndex(h => h === 'first name' || h === 'firstname');
    const lastNameIndex = headerLower.findIndex(h => h === 'last name' || h === 'lastname');
    const phoneIndex = headerLower.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile');

    // Determine which format we're dealing with
    const isDirectExport = emailIndex !== -1 && (nameIndex !== -1 || firstNameIndex !== -1);
    const isAppointmentsExport = customerIndex !== -1 && !isDirectExport;

    if (!isDirectExport && !isAppointmentsExport) {
      return res.status(400).json({
        error: 'Could not detect CSV format. Expected either: (1) Appointments CSV with "Customer" column, or (2) Customer export with "Email" and "Name" columns. Headers found: ' + header.join(', ')
      });
    }

    // Extract unique customers
    const customersMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      let firstName = '';
      let lastName = '';
      let email = '';
      let phone = '';

      if (isDirectExport) {
        // Direct customer export format
        email = (values[emailIndex] || '').trim().toLowerCase();

        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
          firstName = (values[firstNameIndex] || '').trim();
          lastName = (values[lastNameIndex] || '').trim();
        } else if (nameIndex !== -1) {
          const fullName = (values[nameIndex] || '').trim();
          const nameParts = fullName.split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        if (phoneIndex !== -1) {
          phone = (values[phoneIndex] || '').trim();
        }
      } else {
        // Appointments CSV format: "Name (email)"
        const customerField = values[customerIndex];
        if (!customerField) continue;

        const parsed = parseCustomerFromMomence(customerField);
        if (!parsed) continue;

        firstName = parsed.firstName;
        lastName = parsed.lastName;
        email = parsed.email;
      }

      // Skip if no email
      if (!email) continue;

      // Add to map (deduplicates by email)
      if (!customersMap.has(email)) {
        customersMap.set(email, { firstName, lastName, email, phone });
      }
    }

    const uniqueCustomers = Array.from(customersMap.values());

    // Get existing clients in this tenant
    const existingResult = await db.query(
      'SELECT email FROM clients WHERE tenant_id = $1',
      [tenantId]
    );
    const existingEmails = new Set(existingResult.rows.map(r => r.email?.toLowerCase()));

    // Separate new vs existing
    const newCustomers = uniqueCustomers.filter(c => !existingEmails.has(c.email));
    const existingCustomers = uniqueCustomers.filter(c => existingEmails.has(c.email));

    let imported = 0;
    let errors = [];

    if (!dryRun) {
      // Import new customers
      for (const customer of newCustomers) {
        try {
          await db.query(
            `INSERT INTO clients (tenant_id, first_name, last_name, email, phone, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP)`,
            [tenantId, customer.firstName, customer.lastName, customer.email, customer.phone || null]
          );
          imported++;
        } catch (err) {
          errors.push(`${customer.email}: ${err.message}`);
        }
      }
    }

    res.json({
      dryRun,
      totalInCSV: lines.length - 1,
      uniqueCustomers: uniqueCustomers.length,
      newCustomers: newCustomers.length,
      existingCustomers: existingCustomers.length,
      imported: dryRun ? 0 : imported,
      errors: errors.slice(0, 10),
      format: isDirectExport ? 'customer_export' : 'appointments_export',
      preview: {
        newCustomers: newCustomers.slice(0, 20),
        existingCustomers: existingCustomers.slice(0, 10).map(c => c.email)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
