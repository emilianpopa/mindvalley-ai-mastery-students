/**
 * Labs & Tests API Routes
 * Handles PDF uploads, viewing, and AI summaries
 * PDFs are stored in PostgreSQL database to persist across Railway deployments
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
let genAI = null;
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
}

// Configure multer for file uploads - use memory storage to store in database
// This ensures PDFs persist across Railway deployments (ephemeral filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
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

    // Get labs with client info (exclude file_data to reduce payload)
    const validSortColumns = ['uploaded_date', 'test_date', 'title', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'uploaded_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const paramsOffset = queryParams.length;
    queryParams.push(limit, offset);

    const labsQuery = `
      SELECT
        l.id, l.client_id, l.title, l.lab_type, l.file_url, l.file_size,
        l.uploaded_date, l.test_date, l.ai_summary, l.extracted_data,
        l.created_at, l.uploaded_by, l.original_filename, l.file_mime_type,
        CASE WHEN l.file_data IS NOT NULL THEN true ELSE false END as has_file_data,
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

    // Get labs for this client (exclude file_data to reduce payload)
    const labsResult = await db.query(
      `SELECT
        l.id, l.client_id, l.title, l.lab_type, l.file_url, l.file_size,
        l.uploaded_date, l.test_date, l.ai_summary, l.extracted_data,
        l.created_at, l.uploaded_by, l.original_filename, l.file_mime_type,
        CASE WHEN l.file_data IS NOT NULL THEN true ELSE false END as has_file_data,
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

// Serve PDF file from database
router.get('/:id/file', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT file_data, file_mime_type, original_filename, title FROM labs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const lab = result.rows[0];

    if (!lab.file_data) {
      return res.status(404).json({ error: 'PDF file not found in database' });
    }

    // Set headers for PDF
    res.setHeader('Content-Type', lab.file_mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${lab.original_filename || lab.title || 'lab-result'}.pdf"`);

    // Send the binary data
    res.send(lab.file_data);

  } catch (error) {
    next(error);
  }
});

// Get single lab by ID (exclude file_data to reduce payload)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        l.id, l.client_id, l.title, l.lab_type, l.file_url, l.file_size,
        l.uploaded_date, l.test_date, l.ai_summary, l.extracted_data,
        l.created_at, l.uploaded_by, l.original_filename, l.file_mime_type,
        CASE WHEN l.file_data IS NOT NULL THEN true ELSE false END as has_file_data,
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

    // Store file in database with binary data
    const result = await db.query(
      `INSERT INTO labs (
        client_id, title, lab_type, file_url, file_size,
        test_date, uploaded_by, file_data, file_mime_type, original_filename
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, client_id, title, lab_type, file_url, file_size,
                uploaded_date, test_date, ai_summary, extracted_data,
                created_at, uploaded_by, original_filename, file_mime_type`,
      [
        client_id,
        title || req.file.originalname,
        lab_type || 'General',
        '/api/labs/temp/file', // Will be updated after insert
        req.file.size,
        test_date || null,
        req.user.userId,
        req.file.buffer, // Store the PDF binary data
        req.file.mimetype,
        req.file.originalname
      ]
    );

    // Update file_url with actual lab ID
    const labId = result.rows[0].id;
    await db.query(
      'UPDATE labs SET file_url = $1 WHERE id = $2',
      [`/api/labs/${labId}/file`, labId]
    );

    result.rows[0].file_url = `/api/labs/${labId}/file`;

    res.status(201).json({
      message: 'Lab uploaded successfully',
      lab: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Delete lab
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if lab exists
    const labResult = await db.query(
      'SELECT id FROM labs WHERE id = $1',
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    // Delete from database (file_data is deleted with the row)
    await db.query('DELETE FROM labs WHERE id = $1', [id]);

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
      RETURNING id, client_id, title, lab_type, file_url, file_size,
                uploaded_date, test_date, ai_summary, extracted_data,
                created_at, uploaded_by, original_filename, file_mime_type`,
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

    // Get lab data with client info (including file_data for PDF parsing)
    const labResult = await db.query(
      `SELECT l.*, c.first_name, c.last_name, c.date_of_birth, c.gender,
              c.medical_history, c.current_medications
       FROM labs l
       LEFT JOIN clients c ON l.client_id = c.id
       WHERE l.id = $1`,
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const lab = labResult.rows[0];

    // Check if Gemini is configured
    if (!geminiModel) {
      return res.status(500).json({
        error: 'Gemini API key not configured',
        summary: 'AI summary generation is not available. Please configure GEMINI_API_KEY in environment variables.'
      });
    }

    let pdfText = '';
    let extractedData = null;

    // Try to extract text from PDF - first from database, then from file system
    try {
      const pdfParse = require('pdf-parse');
      let dataBuffer;

      // First try to get PDF from database
      if (lab.file_data) {
        dataBuffer = lab.file_data;
        console.log('Using PDF data from database');
      } else {
        // Fallback to file system for old uploads
        const filePath = path.join(__dirname, '..', lab.file_url);
        dataBuffer = await fs.readFile(filePath);
        console.log('Using PDF data from file system');
      }

      const pdfData = await pdfParse(dataBuffer);
      pdfText = pdfData.text;
      console.log(`Extracted ${pdfText.length} characters from PDF`);
    } catch (pdfError) {
      console.log('Could not extract PDF text:', pdfError.message);
      // Check if we have extracted_data in the database
      if (lab.extracted_data) {
        extractedData = typeof lab.extracted_data === 'string'
          ? JSON.parse(lab.extracted_data)
          : lab.extracted_data;
      }
    }

    // Build context for the AI
    const clientInfo = lab.first_name ? `
Patient: ${lab.first_name} ${lab.last_name}
Gender: ${lab.gender || 'Not specified'}
Date of Birth: ${lab.date_of_birth ? new Date(lab.date_of_birth).toLocaleDateString() : 'Not specified'}
Medical History: ${lab.medical_history || 'Not provided'}
Current Medications: ${lab.current_medications || 'Not provided'}
` : '';

    // Build the prompt
    let prompt = `You are a clinical laboratory analyst assistant for a longevity and functional medicine practice. Analyze the following lab results and provide a comprehensive clinical summary.

${clientInfo}
Lab Type: ${lab.lab_type || 'General'}
Test Date: ${lab.test_date ? new Date(lab.test_date).toLocaleDateString() : 'Not specified'}
Lab Title: ${lab.title || 'Lab Result'}
`;

    if (pdfText) {
      prompt += `\n\nLab Report Text:\n${pdfText.substring(0, 15000)}\n`;
    } else if (extractedData && extractedData.markers) {
      prompt += `\n\nExtracted Lab Markers:\n`;
      extractedData.markers.forEach(m => {
        prompt += `- ${m.name}: ${m.value} ${m.unit || ''} (Reference: ${m.range || 'N/A'}) ${m.flag ? `[${m.flag.toUpperCase()}]` : ''}\n`;
      });
      if (extractedData.interpretation) {
        prompt += `\nPrevious Interpretation: ${extractedData.interpretation}\n`;
      }
    } else {
      prompt += `\n\nNote: No lab data text could be extracted. Please provide a general analysis based on the lab type.\n`;
    }

    prompt += `
Please provide your analysis in the following format:

**Clinical Summary**
[2-3 sentence overview of the key findings]

**Key Findings**
[List the most significant abnormal or notable values with clinical context]

**Clinical Implications**
[What do these results suggest about the patient's health?]

**Recommendations**
[Suggested follow-up tests, lifestyle modifications, or treatment considerations]

**Priority Level**
[Routine / Attention Needed / Urgent - with brief explanation]

Keep the analysis professional, clinically relevant, and actionable for a healthcare practitioner.`;

    // Call Gemini API
    console.log('Calling Gemini API for lab summary...');
    const result = await geminiModel.generateContent(prompt);
    const summary = result.response.text();
    console.log('Gemini response received, length:', summary.length);

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

    // Return a helpful error message
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        error: 'Gemini API configuration error',
        details: error.message
      });
    }

    next(error);
  }
});

module.exports = router;
