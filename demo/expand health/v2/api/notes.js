const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');
const pool = db.pool;  // For backwards compatibility
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

// Initialize AI clients
let genAI = null;
let anthropic = null;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

console.log('[Notes API] AI Status:');
console.log('  - Gemini:', genAI ? '✅ configured' : '❌ not configured');
console.log('  - Claude:', anthropic ? '✅ configured' : '❌ not configured');

// ============================================
// DEBUG: List all notes to see their types (temporary)
// ============================================
router.get('/debug-notes', async (req, res) => {
  try {
    const clientId = req.query.client_id || null;
    let query = `
      SELECT id, client_id, note_type, is_consultation, LEFT(content, 100) as content_preview
      FROM notes
    `;
    const params = [];
    if (clientId) {
      query += ` WHERE client_id = $1`;
      params.push(clientId);
    }
    query += ` ORDER BY id DESC LIMIT 20`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FIX MISCLASSIFIED NOTES (One-time migration - no auth required)
// Updates notes that contain consultation content but are marked as quick_note
// ============================================
router.post('/fix-misclassified', async (req, res) => {
  try {
    let totalUpdated = 0;
    let allNoteIds = [];

    // STEP 1: Fix notes with note_type='consultation' but is_consultation=false/null
    const fixTypeQuery = `
      UPDATE notes
      SET is_consultation = true
      WHERE note_type = 'consultation'
        AND (is_consultation = false OR is_consultation IS NULL)
      RETURNING id
    `;
    const fixTypeResult = await pool.query(fixTypeQuery);
    if (fixTypeResult.rows.length > 0) {
      totalUpdated += fixTypeResult.rows.length;
      allNoteIds.push(...fixTypeResult.rows.map(n => n.id));
      console.log(`[Notes Migration] Fixed ${fixTypeResult.rows.length} notes with note_type=consultation but missing is_consultation flag`);
    }

    // STEP 2: Find notes by keywords that look like consultations
    const consultationKeywords = [
      'consultation',
      'beginning the consultation',
      'consultation now',
      'follow-up',
      'follow up session',
      'appointment',
      'session notes',
      'patient presented',
      'client presented',
      'patient name',
      'date of visit',
      'reason for visit'
    ];

    const keywordConditions = consultationKeywords
      .map((_, i) => `LOWER(content) LIKE $${i + 1}`)
      .join(' OR ');

    const findQuery = `
      SELECT id, content, note_type, is_consultation
      FROM notes
      WHERE note_type = 'quick_note'
        AND (is_consultation = false OR is_consultation IS NULL)
        AND (${keywordConditions})
    `;

    const keywordParams = consultationKeywords.map(k => `%${k.toLowerCase()}%`);
    const findResult = await pool.query(findQuery, keywordParams);

    if (findResult.rows.length > 0) {
      const noteIds = findResult.rows.map(n => n.id);
      const updateQuery = `
        UPDATE notes
        SET is_consultation = true,
            note_type = 'consultation'
        WHERE id = ANY($1)
        RETURNING id
      `;
      const updateResult = await pool.query(updateQuery, [noteIds]);
      totalUpdated += updateResult.rows.length;
      allNoteIds.push(...updateResult.rows.map(n => n.id));
      console.log(`[Notes Migration] Fixed ${updateResult.rows.length} notes with consultation keywords`);
    }

    if (totalUpdated === 0) {
      return res.json({
        message: 'No misclassified notes found',
        updated: 0
      });
    }

    res.json({
      message: `Successfully updated ${totalUpdated} misclassified notes`,
      updated: totalUpdated,
      noteIds: allNoteIds
    });

  } catch (error) {
    console.error('Error fixing misclassified notes:', error);
    res.status(500).json({ error: 'Failed to fix misclassified notes', details: error.message });
  }
});

// Apply auth to all other routes
router.use(authenticateToken);

// ============================================
// GET ALL NOTES FOR A CLIENT
// ============================================
router.get('/client/:clientId', async (req, res) => {
  console.log('[Notes API] GET /client/:clientId called');
  try {
    const { clientId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;
    console.log('[Notes API] Fetching notes for client:', clientId);

    let query = `
      SELECT n.*, u.first_name as author_first_name, u.last_name as author_last_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.client_id = $1
    `;
    const params = [clientId];

    // Filter by note type if specified
    if (type) {
      query += ` AND n.note_type = $${params.length + 1}`;
      params.push(type);
      // When fetching quick_notes, exclude consultation notes
      // (consultation notes may have note_type set but is_consultation=true)
      if (type === 'quick_note') {
        query += ` AND (n.is_consultation = false OR n.is_consultation IS NULL)`;
      }
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    console.log('[Notes API] Executing query with params:', params);
    const result = await pool.query(query, params);
    console.log('[Notes API] Query result rows:', result.rows.length);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM notes WHERE client_id = $1`;
    const countParams = [clientId];
    if (type) {
      countQuery += ` AND note_type = $2`;
      countParams.push(type);
      // Match the main query's consultation exclusion for quick_notes
      if (type === 'quick_note') {
        countQuery += ` AND (is_consultation = false OR is_consultation IS NULL)`;
      }
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      notes: result.rows.map(note => ({
        id: note.id,
        client_id: note.client_id,
        content: note.content,
        note_type: note.note_type,
        is_consultation: note.is_consultation,
        consultation_date: note.consultation_date,
        created_at: note.created_at,
        author: note.author_first_name && note.author_last_name
          ? `${note.author_first_name} ${note.author_last_name}`
          : 'Unknown',
        created_by: note.created_by
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Notes API] Error fetching client notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes', details: error.message });
  }
});

// ============================================
// GET SINGLE NOTE
// ============================================
router.get('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    const result = await pool.query(`
      SELECT n.*, u.first_name as author_first_name, u.last_name as author_last_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = $1
    `, [noteId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = result.rows[0];
    res.json({
      id: note.id,
      client_id: note.client_id,
      content: note.content,
      note_type: note.note_type,
      is_consultation: note.is_consultation,
      consultation_date: note.consultation_date,
      created_at: note.created_at,
      author: note.author_first_name && note.author_last_name
        ? `${note.author_first_name} ${note.author_last_name}`
        : 'Unknown',
      created_by: note.created_by
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// ============================================
// CREATE NEW NOTE
// ============================================
router.post('/', async (req, res) => {
  try {
    console.log('[Notes POST] Request body:', JSON.stringify(req.body));
    const { client_id, content, note_type = 'quick_note', is_consultation = false, consultation_date, title } = req.body;
    const userId = req.user.id;
    console.log('[Notes POST] Parsed - client_id:', client_id, 'userId:', userId, 'content length:', content?.length);

    if (!client_id || !content) {
      console.log('[Notes POST] Validation failed - client_id:', client_id, 'content:', !!content);
      return res.status(400).json({ error: 'Client ID and content are required' });
    }

    // Verify client exists
    const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // If it's a consultation note, we might want to store the title with the content
    let finalContent = content;
    if (is_consultation && title) {
      finalContent = `## ${title}\n\n${content}`;
    }

    const result = await pool.query(`
      INSERT INTO notes (client_id, content, note_type, is_consultation, consultation_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [client_id, finalContent, note_type, is_consultation, consultation_date || null, userId]);

    const note = result.rows[0];

    // Get author info
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    res.status(201).json({
      id: note.id,
      client_id: note.client_id,
      content: note.content,
      note_type: note.note_type,
      is_consultation: note.is_consultation,
      consultation_date: note.consultation_date,
      created_at: note.created_at,
      author: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
      created_by: note.created_by
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// ============================================
// UPDATE NOTE
// ============================================
router.put('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, note_type, is_consultation, consultation_date } = req.body;
    const userId = req.user.id;

    // Check if note exists and user has permission
    const noteCheck = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }
    if (note_type !== undefined) {
      updates.push(`note_type = $${paramCount++}`);
      values.push(note_type);
    }
    if (is_consultation !== undefined) {
      updates.push(`is_consultation = $${paramCount++}`);
      values.push(is_consultation);
    }
    if (consultation_date !== undefined) {
      updates.push(`consultation_date = $${paramCount++}`);
      values.push(consultation_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(noteId);

    const result = await pool.query(`
      UPDATE notes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const note = result.rows[0];

    // Get author info
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [note.created_by]
    );
    const user = userResult.rows[0];

    res.json({
      id: note.id,
      client_id: note.client_id,
      content: note.content,
      note_type: note.note_type,
      is_consultation: note.is_consultation,
      consultation_date: note.consultation_date,
      created_at: note.created_at,
      author: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
      created_by: note.created_by
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// ============================================
// DELETE NOTE
// ============================================
router.delete('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [noteId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================
// GENERATE AI SUMMARY FOR NOTE CONTENT
// ============================================
router.post('/generate-summary', async (req, res) => {
  try {
    const { content, noteType } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!genAI && !anthropic) {
      return res.status(500).json({ error: 'AI services not configured' });
    }

    const isConsultation = noteType === 'consultation' || noteType === 'progress';

    const prompt = isConsultation
      ? `You are a medical note summarizer. Analyze the following consultation note and extract the key points in a concise, structured format.

Consultation Note:
${content}

Create a summary with:
1. Main reason for visit/consultation
2. Key findings or observations (2-4 bullet points)
3. Any recommendations or next steps mentioned

Keep the summary brief and clinically relevant. Use bullet points for clarity.`
      : `Summarize the following note in 2-3 concise bullet points:

${content}

Keep each bullet point brief and focused on the key information.`;

    let summary = '';

    // Try Gemini first, fall back to Claude
    if (genAI) {
      try {
        const result = await genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt
        });
        summary = result.text || '';
      } catch (geminiError) {
        console.error('[Notes AI] Gemini failed:', geminiError.message);
        if (anthropic) {
          const claudeResult = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
          });
          summary = claudeResult.content[0].text || '';
        } else {
          throw geminiError;
        }
      }
    } else if (anthropic) {
      const claudeResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      summary = claudeResult.content[0].text || '';
    }

    res.json({ summary });

  } catch (error) {
    console.error('[Notes AI] Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate AI summary', details: error.message });
  }
});

// ============================================
// GET NOTES SUMMARY FOR PROTOCOL GENERATION
// Returns all client notes in a format suitable for AI processing
// ============================================
router.get('/client/:clientId/summary', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get all notes grouped by type
    const result = await pool.query(`
      SELECT n.*, u.first_name as author_first_name, u.last_name as author_last_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.client_id = $1
      ORDER BY n.created_at DESC
    `, [clientId]);

    // Group notes by type
    const grouped = {
      quick_notes: [],
      consultation_notes: [],
      form_notes: [],
      lab_notes: [],
      wearable_notes: []
    };

    result.rows.forEach(note => {
      const noteData = {
        id: note.id,
        content: note.content,
        date: note.created_at,
        author: note.author_first_name && note.author_last_name
          ? `${note.author_first_name} ${note.author_last_name}`
          : 'Unknown'
      };

      if (note.is_consultation) {
        grouped.consultation_notes.push({
          ...noteData,
          consultation_date: note.consultation_date
        });
      } else {
        const type = note.note_type || 'quick_note';
        if (grouped[type + 's']) {
          grouped[type + 's'].push(noteData);
        } else if (grouped[type + '_notes']) {
          grouped[type + '_notes'].push(noteData);
        } else {
          grouped.quick_notes.push(noteData);
        }
      }
    });

    // Build text summary for protocol generation
    let textSummary = '';

    if (grouped.consultation_notes.length > 0) {
      textSummary += '## Consultation Notes\n\n';
      grouped.consultation_notes.forEach(note => {
        textSummary += `**${new Date(note.consultation_date || note.date).toLocaleDateString()}** (${note.author}):\n${note.content}\n\n`;
      });
    }

    if (grouped.quick_notes.length > 0) {
      textSummary += '## Quick Notes\n\n';
      grouped.quick_notes.forEach(note => {
        textSummary += `**${new Date(note.date).toLocaleDateString()}** (${note.author}):\n${note.content}\n\n`;
      });
    }

    ['form_notes', 'lab_notes', 'wearable_notes'].forEach(type => {
      if (grouped[type].length > 0) {
        const title = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        textSummary += `## ${title}\n\n`;
        grouped[type].forEach(note => {
          textSummary += `**${new Date(note.date).toLocaleDateString()}** (${note.author}):\n${note.content}\n\n`;
        });
      }
    });

    res.json({
      grouped,
      text_summary: textSummary.trim(),
      total_notes: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching notes summary:', error);
    res.status(500).json({ error: 'Failed to fetch notes summary' });
  }
});

module.exports = router;
