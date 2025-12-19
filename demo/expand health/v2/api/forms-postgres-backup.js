const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ========================================
// FORM TEMPLATES ENDPOINTS
// ========================================

// GET /api/forms/templates - List all form templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ft.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        (SELECT COUNT(*) FROM form_submissions WHERE form_id = ft.id) as submissions_count
      FROM form_templates ft
      LEFT JOIN users u ON ft.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (ft.name ILIKE $${paramCount} OR ft.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND ft.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (status) {
      query += ` AND ft.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY ft.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM form_templates WHERE 1=1 ${search ? `AND (name ILIKE '%${search}%' OR description ILIKE '%${search}%')` : ''} ${category ? `AND category = '${category}'` : ''} ${status ? `AND status = '${status}'` : ''}`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      forms: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({ error: 'Failed to fetch form templates' });
  }
});

// GET /api/forms/templates/:id - Get single form template
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        ft.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        (SELECT COUNT(*) FROM form_submissions WHERE form_id = ft.id) as submissions_count,
        (SELECT COUNT(*) FROM form_submissions WHERE form_id = ft.id AND status = 'pending') as pending_count
      FROM form_templates ft
      LEFT JOIN users u ON ft.created_by = u.id
      WHERE ft.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching form template:', error);
    res.status(500).json({ error: 'Failed to fetch form template' });
  }
});

// POST /api/forms/templates - Create new form template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, fields, settings } = req.body;

    if (!name || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Name and fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO form_templates (name, description, category, status, fields, settings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, category, 'draft', JSON.stringify(fields), JSON.stringify(settings || {}), req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating form template:', error);
    res.status(500).json({ error: 'Failed to create form template' });
  }
});

// PUT /api/forms/templates/:id - Update form template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, status, fields, settings } = req.body;

    const result = await pool.query(
      `UPDATE form_templates
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           status = COALESCE($4, status),
           fields = COALESCE($5, fields),
           settings = COALESCE($6, settings),
           updated_at = NOW(),
           last_updated = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, category, status, fields ? JSON.stringify(fields) : null, settings ? JSON.stringify(settings) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating form template:', error);
    res.status(500).json({ error: 'Failed to update form template' });
  }
});

// DELETE /api/forms/templates/:id - Delete form template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if form has submissions
    const submissionsCheck = await pool.query(
      'SELECT COUNT(*) FROM form_submissions WHERE form_id = $1',
      [id]
    );

    const submissionCount = parseInt(submissionsCheck.rows[0].count);
    if (submissionCount > 0) {
      return res.status(400).json({
        error: `Cannot delete form with ${submissionCount} submission(s). Archive it instead.`
      });
    }

    const result = await pool.query(
      'DELETE FROM form_templates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form template not found' });
    }

    res.json({ message: 'Form template deleted successfully' });
  } catch (error) {
    console.error('Error deleting form template:', error);
    res.status(500).json({ error: 'Failed to delete form template' });
  }
});

// GET /api/forms/categories - Get all form categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count
       FROM form_templates
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY category`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ========================================
// FORM SUBMISSIONS ENDPOINTS
// ========================================

// GET /api/forms/submissions - List all form submissions
router.get('/submissions', authenticateToken, async (req, res) => {
  try {
    const { form_id, client_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        fs.*,
        ft.name as form_name,
        ft.category as form_category,
        c.name as client_name,
        c.email as client_email,
        CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
      FROM form_submissions fs
      INNER JOIN form_templates ft ON fs.form_id = ft.id
      LEFT JOIN clients c ON fs.client_id = c.id
      LEFT JOIN users u ON fs.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (form_id) {
      query += ` AND fs.form_id = $${paramCount}`;
      params.push(form_id);
      paramCount++;
    }

    if (client_id) {
      query += ` AND fs.client_id = $${paramCount}`;
      params.push(client_id);
      paramCount++;
    }

    if (status) {
      query += ` AND fs.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY fs.submitted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM form_submissions WHERE 1=1 ${form_id ? `AND form_id = ${form_id}` : ''} ${client_id ? `AND client_id = ${client_id}` : ''} ${status ? `AND status = '${status}'` : ''}`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      submissions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
});

// GET /api/forms/submissions/:id - Get single submission
router.get('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        fs.*,
        ft.name as form_name,
        ft.description as form_description,
        ft.category as form_category,
        ft.fields as form_fields,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
      FROM form_submissions fs
      INNER JOIN form_templates ft ON fs.form_id = ft.id
      LEFT JOIN clients c ON fs.client_id = c.id
      LEFT JOIN users u ON fs.reviewed_by = u.id
      WHERE fs.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching form submission:', error);
    res.status(500).json({ error: 'Failed to fetch form submission' });
  }
});

// POST /api/forms/submissions - Submit a form (client-facing)
router.post('/submissions', async (req, res) => {
  try {
    const { form_id, client_id, responses } = req.body;

    if (!form_id || !responses) {
      return res.status(400).json({ error: 'Form ID and responses are required' });
    }

    // Validate form exists
    const formCheck = await pool.query(
      'SELECT * FROM form_templates WHERE id = $1 AND status = $2',
      [form_id, 'published']
    );

    if (formCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found or not published' });
    }

    const result = await pool.query(
      `INSERT INTO form_submissions (form_id, client_id, responses, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [form_id, client_id, JSON.stringify(responses), 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// PUT /api/forms/submissions/:id - Update submission (review, notes)
router.put('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    let query = `
      UPDATE form_submissions
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          reviewed_by = $3,
          reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [status, notes, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating form submission:', error);
    res.status(500).json({ error: 'Failed to update form submission' });
  }
});

// DELETE /api/forms/submissions/:id - Delete submission
router.delete('/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM form_submissions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    res.json({ message: 'Form submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting form submission:', error);
    res.status(500).json({ error: 'Failed to delete form submission' });
  }
});

// ========================================
// STATS & ANALYTICS
// ========================================

// GET /api/forms/stats - Get form statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM form_templates) as total_forms,
        (SELECT COUNT(*) FROM form_templates WHERE status = 'published') as published_forms,
        (SELECT COUNT(*) FROM form_submissions) as total_submissions,
        (SELECT COUNT(*) FROM form_submissions WHERE status = 'pending') as pending_submissions,
        (SELECT COUNT(*) FROM form_submissions WHERE submitted_at > NOW() - INTERVAL '7 days') as submissions_this_week
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({ error: 'Failed to fetch form stats' });
  }
});

module.exports = router;
