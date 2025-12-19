/**
 * Labs & Tests API Routes
 * Handles PDF uploads, viewing, and AI summaries
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'labs');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Get all labs (with optional client filter and pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      page = 1,
      limit = 20,
      sortBy = 'uploaded_date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    let queryParams = [];

    if (client_id) {
      whereClause = 'WHERE client_id = $1';
      queryParams.push(client_id);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM labs ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get labs with client info
    const validSortColumns = ['uploaded_date', 'test_date', 'title', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'uploaded_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const paramsOffset = queryParams.length;
    queryParams.push(limit, offset);

    const labsQuery = `
      SELECT
        l.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email
      FROM labs l
      LEFT JOIN clients c ON l.client_id = c.id
      ${whereClause}
      ORDER BY l.${sortColumn} ${order}
      LIMIT $${paramsOffset + 1} OFFSET $${paramsOffset + 2}
    `;

    const labsResult = await db.query(labsQuery, queryParams);

    res.json({
      labs: labsResult.rows,
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

// Get labs for a specific client
router.get('/client/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Get labs for this client
    const labsResult = await db.query(
      `SELECT
        l.*,
        c.first_name || ' ' || c.last_name as client_name
      FROM labs l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.client_id = $1
      ORDER BY l.test_date DESC NULLS LAST, l.created_at DESC`,
      [clientId]
    );

    res.json({
      labs: labsResult.rows
    });

  } catch (error) {
    next(error);
  }
});

// Get single lab by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        l.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email
      FROM labs l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    res.json({ lab: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Upload new lab PDF
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { client_id, title, lab_type, test_date } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Verify client exists
    const clientCheck = await db.query(
      'SELECT id FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Store file info in database
    const result = await db.query(
      `INSERT INTO labs (
        client_id, title, lab_type, file_url, file_size,
        test_date, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        client_id,
        title || req.file.originalname,
        lab_type || 'General',
        `/uploads/labs/${req.file.filename}`,
        req.file.size,
        test_date || null,
        req.user.userId
      ]
    );

    res.status(201).json({
      message: 'Lab uploaded successfully',
      lab: result.rows[0]
    });

  } catch (error) {
    // Clean up uploaded file if database insert fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    next(error);
  }
});

// Delete lab
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get file path before deleting
    const labResult = await db.query(
      'SELECT file_url FROM labs WHERE id = $1',
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const filePath = path.join(__dirname, '..', labResult.rows[0].file_url);

    // Delete from database
    await db.query('DELETE FROM labs WHERE id = $1', [id]);

    // Delete file from filesystem
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue even if file deletion fails
    }

    res.json({ message: 'Lab deleted successfully' });

  } catch (error) {
    next(error);
  }
});

// Update lab (title, type, test date, AI summary)
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, lab_type, test_date, ai_summary } = req.body;

    const result = await db.query(
      `UPDATE labs SET
        title = COALESCE($1, title),
        lab_type = COALESCE($2, lab_type),
        test_date = COALESCE($3, test_date),
        ai_summary = COALESCE($4, ai_summary)
      WHERE id = $5
      RETURNING *`,
      [title, lab_type, test_date, ai_summary, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    res.json({
      message: 'Lab updated successfully',
      lab: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Get notes for a lab
router.get('/:id/notes', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        ln.*,
        u.first_name || ' ' || u.last_name as author_name
      FROM lab_notes ln
      LEFT JOIN users u ON ln.created_by = u.id
      WHERE ln.lab_id = $1
      ORDER BY ln.created_at DESC`,
      [id]
    );

    res.json({ notes: result.rows });

  } catch (error) {
    next(error);
  }
});

// Add a note to a lab
router.post('/:id/notes', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Verify lab exists
    const labCheck = await db.query('SELECT id FROM labs WHERE id = $1', [id]);
    if (labCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const result = await db.query(
      `INSERT INTO lab_notes (lab_id, content, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, content.trim(), req.user.userId]
    );

    // Get author name for response
    const noteWithAuthor = await db.query(
      `SELECT
        ln.*,
        u.first_name || ' ' || u.last_name as author_name
      FROM lab_notes ln
      LEFT JOIN users u ON ln.created_by = u.id
      WHERE ln.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'Note added successfully',
      note: noteWithAuthor.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Delete a note
router.delete('/:labId/notes/:noteId', authenticateToken, async (req, res, next) => {
  try {
    const { labId, noteId } = req.params;

    const result = await db.query(
      'DELETE FROM lab_notes WHERE id = $1 AND lab_id = $2 RETURNING id',
      [noteId, labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    next(error);
  }
});

// Generate AI summary for lab PDF
router.post('/:id/generate-summary', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get lab data
    const labResult = await db.query(
      'SELECT * FROM labs WHERE id = $1',
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const lab = labResult.rows[0];

    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key not configured',
        summary: 'AI summary generation is not available. Please configure GEMINI_API_KEY in environment variables.'
      });
    }

    // For MVP: Generate a placeholder summary
    // In production, you would:
    // 1. Extract text from PDF using pdf-parse or similar
    // 2. Send to Gemini API for analysis
    // 3. Store the summary in database

    const summary = `**Lab Result Analysis**

This is a placeholder AI summary for ${lab.title || 'the lab result'}.

**Key Findings:**
- Lab type: ${lab.lab_type || 'General'}
- Test date: ${lab.test_date ? new Date(lab.test_date).toLocaleDateString() : 'Not specified'}
- File size: ${(lab.file_size / 1024).toFixed(2)} KB

**Note:** Full AI analysis requires Gemini API integration and PDF text extraction. This is a demonstration of the summary feature.

**Next Steps:**
To enable full AI summaries:
1. Ensure GEMINI_API_KEY is set in environment
2. Install pdf-parse: npm install pdf-parse
3. Implement PDF text extraction
4. Send extracted text to Gemini API
5. Parse and format the response`;

    // Update lab with summary
    await db.query(
      'UPDATE labs SET ai_summary = $1 WHERE id = $2',
      [summary, id]
    );

    res.json({
      message: 'AI summary generated successfully',
      summary: summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    next(error);
  }
});

module.exports = router;
