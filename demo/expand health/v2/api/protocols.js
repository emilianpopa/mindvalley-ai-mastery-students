/**
 * Protocols & Templates API Routes
 * Handles protocol templates and client-specific protocols
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// Initialize Claude SDK for AI protocol generation
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Initialize Gemini SDK for Knowledge Base queries (using new File Search API)
const { GoogleGenAI } = require('@google/genai');
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper function to query Knowledge Base using File Search API
// This replaces the deprecated Semantic Retrieval (Corpus) API
async function queryKnowledgeBase(query, context = '') {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_FILE_SEARCH_STORE_ID) {
    console.log('[KB Query] Knowledge base not configured (missing GEMINI_API_KEY or GEMINI_FILE_SEARCH_STORE_ID)');
    return null;
  }

  try {
    console.log(`[KB Query] Querying File Search store for: "${query.substring(0, 50)}..."`);

    // Use File Search API with generateContent
    const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE_ID;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the knowledge base, provide relevant information about: ${query}

${context ? `Additional context: ${context}` : ''}

Return the key facts, protocols, dosages, and recommendations found in the knowledge base. Be specific and cite sources when possible.`,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [fileSearchStoreName]
          }
        }]
      }
    });

    if (!response || !response.text) {
      console.log('[KB Query] No response from File Search');
      return null;
    }

    const kbContext = response.text;

    // Extract grounding metadata for citations if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('[KB Query] Response includes grounding citations');
    }

    console.log(`[KB Query] Retrieved ${kbContext.length} characters from File Search`);
    return kbContext;

  } catch (error) {
    console.error('[KB Query] Error querying knowledge base:', error.message);
    return null;
  }
}

// ========================================
// PROTOCOL TEMPLATES
// ========================================

// Get all protocol templates (with pagination and search)
router.get('/templates', authenticateToken, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
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
      whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM protocol_templates ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get templates
    const validSortColumns = ['name', 'category', 'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryParams.push(limit, offset);

    const templatesQuery = `
      SELECT
        id,
        name,
        description,
        category,
        duration_weeks,
        modules,
        created_at,
        updated_at,
        (SELECT COUNT(DISTINCT client_id) FROM protocols WHERE template_id = protocol_templates.id) as usage_count
      FROM protocol_templates
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const templatesResult = await db.query(templatesQuery, queryParams);

    res.json({
      templates: templatesResult.rows,
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

// Get single protocol template by ID
router.get('/templates/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        pt.*,
        (SELECT COUNT(DISTINCT client_id) FROM protocols WHERE template_id = pt.id) as usage_count,
        (SELECT json_agg(json_build_object(
          'client_id', p.client_id,
          'client_name', c.first_name || ' ' || c.last_name,
          'start_date', p.start_date,
          'status', p.status
        )) FROM protocols p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.template_id = pt.id
        LIMIT 5) as recent_uses
      FROM protocol_templates pt
      WHERE pt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol template not found' });
    }

    res.json({ template: result.rows[0] });

  } catch (error) {
    next(error);
  }
});

// Create new protocol template
router.post('/templates', authenticateToken, async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      duration_weeks,
      modules
    } = req.body;

    // Validation
    if (!name || !category || !modules) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'category', 'modules']
      });
    }

    // Validate modules is an array
    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'Modules must be an array' });
    }

    const result = await db.query(
      `INSERT INTO protocol_templates (
        name, description, category, duration_weeks, modules
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [name, description, category, duration_weeks || null, JSON.stringify(modules)]
    );

    res.status(201).json({
      message: 'Protocol template created successfully',
      template: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Update protocol template
router.put('/templates/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      duration_weeks,
      modules
    } = req.body;

    const result = await db.query(
      `UPDATE protocol_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        duration_weeks = COALESCE($4, duration_weeks),
        modules = COALESCE($5, modules),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        name,
        description,
        category,
        duration_weeks,
        modules ? JSON.stringify(modules) : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol template not found' });
    }

    res.json({
      message: 'Protocol template updated successfully',
      template: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Delete protocol template
router.delete('/templates/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if template is in use
    const usageCheck = await db.query(
      'SELECT COUNT(*) FROM protocols WHERE template_id = $1',
      [id]
    );

    const usageCount = parseInt(usageCheck.rows[0].count);

    if (usageCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete template that is in use',
        usageCount: usageCount,
        message: `This template is used by ${usageCount} client protocol(s). Archive them first.`
      });
    }

    const result = await db.query(
      'DELETE FROM protocol_templates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol template not found' });
    }

    res.json({ message: 'Protocol template deleted successfully' });

  } catch (error) {
    next(error);
  }
});

// ========================================
// CLIENT PROTOCOLS
// ========================================

// Get all client protocols (with filters and pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      template_id,
      status,
      page = 1,
      limit = 20,
      sortBy = 'start_date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (client_id) {
      paramCount++;
      whereConditions.push(`p.client_id = $${paramCount}`);
      queryParams.push(client_id);
    }

    if (template_id) {
      paramCount++;
      whereConditions.push(`p.template_id = $${paramCount}`);
      queryParams.push(template_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`p.status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM protocols p ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get protocols with client and template info
    const validSortColumns = ['start_date', 'end_date', 'status', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryParams.push(limit, offset);

    const protocolsQuery = `
      SELECT
        p.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email,
        pt.name as template_name,
        pt.category as template_category,
        pt.duration_weeks as template_duration
      FROM protocols p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      ${whereClause}
      ORDER BY p.${sortColumn} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const protocolsResult = await db.query(protocolsQuery, queryParams);

    res.json({
      protocols: protocolsResult.rows,
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

// ========================================
// GET PROTOCOLS BY CLIENT (must be before /:id to avoid route conflict)
// ========================================

// Get all protocols for a specific client
router.get('/client/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const result = await db.query(
      `SELECT p.*, pt.name as template_name, pt.category as template_category
       FROM protocols p
       LEFT JOIN protocol_templates pt ON p.template_id = pt.id
       WHERE p.client_id = $1 AND p.status != 'archived'
       ORDER BY p.created_at DESC`,
      [clientId]
    );

    // Transform the data to include title from notes field
    const protocols = result.rows.map(row => {
      // Extract title from notes field (format: "Title: xxx\n\n...")
      const titleMatch = row.notes?.match(/^Title:\s*(.+?)(?:\n|$)/);
      const title = titleMatch ? titleMatch[1] : row.template_name || 'Custom Protocol';

      return {
        id: row.id,
        client_id: row.client_id,
        title: title,
        status: row.status,
        template_name: row.template_name,
        template_category: row.template_category,
        modules: row.modules,
        ai_recommendations: row.ai_recommendations,
        start_date: row.start_date,
        end_date: row.end_date,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    res.json({ protocols });
  } catch (error) {
    console.error('Error fetching protocols for client:', error);
    next(error);
  }
});

// Get single client protocol by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        p.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        pt.name as template_name,
        pt.description as template_description,
        pt.category as template_category,
        pt.modules as template_modules
      FROM protocols p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const row = result.rows[0];

    // Extract title from notes field (format: "Title: xxx\n\n...") - same as client list endpoint
    const titleMatch = row.notes?.match(/^Title:\s*(.+?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1] : row.template_name || 'Custom Protocol';

    // Generate content from modules if available, otherwise use notes
    let content = '';
    if (row.modules && Array.isArray(row.modules) && row.modules.length > 0) {
      // Format modules into readable protocol content
      content = row.modules.map((module, index) => {
        let moduleContent = `## ${module.name || module.title || `Module ${index + 1}`}\n`;
        if (module.description) moduleContent += `${module.description}\n`;
        if (module.goal) moduleContent += `**Goal:** ${module.goal}\n`;

        if (module.items && Array.isArray(module.items)) {
          moduleContent += '\n';
          module.items.forEach(item => {
            moduleContent += `### ${item.name}\n`;
            if (item.description) moduleContent += `${item.description}\n`;
            if (item.dosage) moduleContent += `- **Dosage:** ${item.dosage}\n`;
            if (item.timing) moduleContent += `- **Timing:** ${item.timing}\n`;
            if (item.duration) moduleContent += `- **Duration:** ${item.duration}\n`;
            if (item.frequency) moduleContent += `- **Frequency:** ${item.frequency}\n`;
            if (item.notes) moduleContent += `- **Notes:** ${item.notes}\n`;
            moduleContent += '\n';
          });
        }
        return moduleContent;
      }).join('\n---\n\n');
    } else if (row.notes && row.notes !== 'n/a') {
      // Fallback to notes content
      const contentMatch = row.notes.match(/^Title:\s*.+?\n\n([\s\S]*)/);
      content = contentMatch ? contentMatch[1] : row.notes;
    }

    const protocol = {
      id: row.id,
      client_id: row.client_id,
      title: title,
      content: content,
      status: row.status,
      template_name: row.template_name,
      template_category: row.template_category,
      template_description: row.template_description,
      modules: row.modules,
      ai_recommendations: row.ai_recommendations,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      client_name: row.client_name,
      client_email: row.client_email,
      client_phone: row.client_phone
    };

    res.json({ protocol });

  } catch (error) {
    next(error);
  }
});

// Create new client protocol
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      template_id,
      start_date,
      custom_modules,
      notes
    } = req.body;

    // Validation
    if (!client_id || !template_id || !start_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['client_id', 'template_id', 'start_date']
      });
    }

    // Verify client exists
    const clientCheck = await db.query(
      'SELECT id FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Verify template exists and get duration
    const templateCheck = await db.query(
      'SELECT duration_weeks, modules FROM protocol_templates WHERE id = $1',
      [template_id]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol template not found' });
    }

    const template = templateCheck.rows[0];

    // Calculate end date if duration is specified
    let end_date = null;
    if (template.duration_weeks) {
      const startDate = new Date(start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (template.duration_weeks * 7));
      end_date = endDate.toISOString().split('T')[0];
    }

    // Use custom modules or fall back to template modules
    const modules = custom_modules || template.modules;

    const result = await db.query(
      `INSERT INTO protocols (
        client_id, template_id, start_date, end_date,
        modules, notes, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        client_id,
        template_id,
        start_date,
        end_date,
        JSON.stringify(modules),
        notes,
        'active',
        req.user.userId
      ]
    );

    res.status(201).json({
      message: 'Protocol created successfully',
      protocol: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Update client protocol
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      start_date,
      end_date,
      status,
      modules,
      notes,
      ai_recommendations
    } = req.body;

    const result = await db.query(
      `UPDATE protocols SET
        start_date = COALESCE($1, start_date),
        end_date = COALESCE($2, end_date),
        status = COALESCE($3, status),
        modules = COALESCE($4, modules),
        notes = COALESCE($5, notes),
        ai_recommendations = COALESCE($6, ai_recommendations),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [
        start_date,
        end_date,
        status,
        modules ? JSON.stringify(modules) : null,
        notes,
        ai_recommendations,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    res.json({
      message: 'Protocol updated successfully',
      protocol: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// Archive protocol (soft delete)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE protocols SET
        status = 'archived',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    res.json({ message: 'Protocol archived successfully' });

  } catch (error) {
    next(error);
  }
});

// Generate AI recommendations for protocol
router.post('/:id/generate-recommendations', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get protocol data with client info
    const protocolResult = await db.query(
      `SELECT
        p.*,
        c.first_name || ' ' || c.last_name as client_name,
        cm.medical_history,
        cm.lifestyle_notes,
        pt.name as template_name,
        pt.category as template_category
      FROM protocols p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN client_metadata cm ON c.id = cm.client_id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      WHERE p.id = $1`,
      [id]
    );

    if (protocolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const protocol = protocolResult.rows[0];

    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key not configured',
        recommendations: 'AI recommendations are not available. Please configure GEMINI_API_KEY in environment variables.'
      });
    }

    // For MVP: Generate placeholder recommendations
    // In production, you would:
    // 1. Query Gemini Knowledge Base with client health data
    // 2. Ask for protocol optimization suggestions
    // 3. Parse and format the response

    const recommendations = `**AI Protocol Recommendations for ${protocol.client_name}**

**Current Protocol:** ${protocol.template_name} (${protocol.template_category})
**Start Date:** ${new Date(protocol.start_date).toLocaleDateString()}
**Status:** ${protocol.status}

**Personalized Suggestions:**
- Based on client lifestyle: ${protocol.lifestyle_notes || 'Not specified'}
- Medical history: ${protocol.medical_history ? JSON.stringify(protocol.medical_history) : 'None on file'}

**Optimization Opportunities:**
1. Review supplement timing for better absorption
2. Consider adding stress management techniques
3. Adjust protocol duration based on progress markers

**Next Steps:**
To enable full AI recommendations:
1. Ensure GEMINI_API_KEY is set in environment
2. Query Gemini Knowledge Base with client data
3. Use structured prompts for protocol optimization
4. Parse and format recommendations

**Note:** This is a demonstration of the AI recommendations feature. Full integration requires Gemini API connection.`;

    // Update protocol with recommendations
    await db.query(
      'UPDATE protocols SET ai_recommendations = $1 WHERE id = $2',
      [recommendations, id]
    );

    res.json({
      message: 'AI recommendations generated successfully',
      recommendations: recommendations
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    next(error);
  }
});

// ========================================
// AI PROTOCOL GENERATION
// ========================================

// Generate protocol using AI based on prompt, templates, and notes
router.post('/generate', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      prompt,
      templates = [],
      note_ids = [],
      lab_ids = []
    } = req.body;

    console.log('[Protocol Generate] Request received:', { client_id, prompt, templates, note_ids, lab_ids });

    // Validation
    if (!client_id || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['client_id', 'prompt']
      });
    }

    // Get client data
    let clientData = null;
    try {
      const clientResult = await db.query(
        `SELECT id, first_name, last_name, email, date_of_birth, gender,
                medical_history, current_medications, allergies
         FROM clients WHERE id = $1`,
        [client_id]
      );
      if (clientResult.rows.length > 0) {
        clientData = clientResult.rows[0];
      }
    } catch (dbError) {
      console.error('[Protocol Generate] Error fetching client:', dbError.message);
    }

    if (!clientData) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // ========================================
    // FETCH ALL CLIENT DATA AUTOMATICALLY
    // ========================================

    // Get ALL notes for this client (not just selected ones)
    let notesContent = '';
    try {
      const notesResult = await db.query(
        `SELECT content, note_type, created_at, is_consultation FROM notes
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [client_id]
      );
      if (notesResult.rows.length > 0) {
        notesContent = notesResult.rows.map(note =>
          `[${note.is_consultation ? 'Consultation' : (note.note_type || 'Note')} - ${new Date(note.created_at).toLocaleDateString()}]:\n${note.content}`
        ).join('\n\n');
        console.log(`[Protocol Generate] Found ${notesResult.rows.length} notes for client`);
      }
    } catch (dbError) {
      console.error('[Protocol Generate] Error fetching notes:', dbError.message);
    }

    // Get lab results for this client (filtered by lab_ids if provided)
    let labsContent = '';
    try {
      let labsQuery = `SELECT id, title, lab_type, test_date, ai_summary, extracted_data
         FROM labs
         WHERE client_id = $1`;
      const labsParams = [client_id];

      // If specific lab_ids are provided, filter to only those
      if (lab_ids && lab_ids.length > 0) {
        labsQuery += ` AND id = ANY($2)`;
        labsParams.push(lab_ids.map(id => parseInt(id)));
        console.log(`[Protocol Generate] Filtering to ${lab_ids.length} selected labs`);
      }

      labsQuery += ` ORDER BY test_date DESC NULLS LAST LIMIT 10`;

      const labsResult = await db.query(labsQuery, labsParams);
      if (labsResult.rows.length > 0) {
        labsContent = labsResult.rows.map(lab => {
          let labText = `[${lab.lab_type || 'Lab'} - ${lab.title}`;
          if (lab.test_date) {
            labText += ` - ${new Date(lab.test_date).toLocaleDateString()}`;
          }
          labText += ']:\n';

          // Include AI summary if available
          if (lab.ai_summary) {
            labText += `AI Summary: ${lab.ai_summary.substring(0, 1000)}...\n`;
          }

          // Include extracted markers if available
          if (lab.extracted_data) {
            try {
              const data = typeof lab.extracted_data === 'string'
                ? JSON.parse(lab.extracted_data)
                : lab.extracted_data;
              if (data.markers && data.markers.length > 0) {
                labText += 'Key Markers:\n';
                data.markers.forEach(m => {
                  const flag = m.flag ? ` [${m.flag.toUpperCase()}]` : '';
                  labText += `  - ${m.name}: ${m.value} ${m.unit || ''} (Ref: ${m.range || 'N/A'})${flag}\n`;
                });
              }
              if (data.interpretation) {
                labText += `Interpretation: ${data.interpretation}\n`;
              }
            } catch (e) {
              // Skip if can't parse
            }
          }
          return labText;
        }).join('\n\n');
        console.log(`[Protocol Generate] Found ${labsResult.rows.length} labs for client`);
      }
    } catch (dbError) {
      console.error('[Protocol Generate] Error fetching labs:', dbError.message);
    }

    // Get ALL form submissions for this client
    let formsContent = '';
    try {
      const formsResult = await db.query(
        `SELECT fs.*, ft.name as form_name, ft.category as form_category
         FROM form_submissions fs
         LEFT JOIN form_templates ft ON fs.form_template_id = ft.id
         WHERE fs.client_id = $1
         ORDER BY fs.submitted_at DESC
         LIMIT 10`,
        [client_id]
      );
      if (formsResult.rows.length > 0) {
        formsContent = formsResult.rows.map(form => {
          let formText = `[Form: ${form.form_name || 'Intake Form'} - ${new Date(form.submitted_at).toLocaleDateString()}]:\n`;

          // Include AI summary if available
          if (form.ai_summary) {
            formText += `AI Summary: ${form.ai_summary.substring(0, 1000)}\n`;
          }

          // Include form responses
          if (form.responses) {
            try {
              const responses = typeof form.responses === 'string'
                ? JSON.parse(form.responses)
                : form.responses;
              formText += 'Responses:\n';
              Object.entries(responses).forEach(([key, value]) => {
                if (value && typeof value !== 'object') {
                  formText += `  - ${key.replace(/_/g, ' ')}: ${value}\n`;
                } else if (value && typeof value === 'object') {
                  formText += `  - ${key.replace(/_/g, ' ')}: ${JSON.stringify(value)}\n`;
                }
              });
            } catch (e) {
              // Skip if can't parse
            }
          }
          return formText;
        }).join('\n\n');
        console.log(`[Protocol Generate] Found ${formsResult.rows.length} form submissions for client`);
      }
    } catch (dbError) {
      console.error('[Protocol Generate] Error fetching forms:', dbError.message);
    }

    // Map template codes to full names and database IDs
    const templateInfo = {
      'sleep': { name: 'Sleep Optimization Protocol', id: 4 },  // Energy Optimization
      'hygiene': { name: 'Sleep Hygiene Protocol', id: 4 },
      'gut': { name: 'Gut Healing Protocol', id: 2 },
      'weight': { name: 'Weight Management Protocol', id: 5 },
      'adrenal': { name: 'Adrenal Support Protocol', id: 4 },
      'blood-sugar': { name: 'Blood Sugar Management Protocol', id: 1 },
      'immune': { name: 'Immune Support Protocol', id: 3 }
    };

    const selectedTemplateNames = templates.map(t => templateInfo[t]?.name || t).join(', ');
    // Get the first template ID from selected templates, or default to 1
    const primaryTemplateId = templates.length > 0 && templateInfo[templates[0]]
      ? templateInfo[templates[0]].id
      : 1;

    // Query Knowledge Base for relevant protocol information
    console.log('[Protocol Generate] Querying Knowledge Base...');
    const kbQueries = [];
    const promptLower = prompt.toLowerCase();
    const medicalHistoryLower = (clientData.medical_history || '').toLowerCase();

    // Build context-aware KB queries based on templates and prompt
    if (templates.includes('gut') || promptLower.includes('gut') || promptLower.includes('digest')) {
      kbQueries.push('gut healing protocols, L-glutamine dosing, probiotic recommendations, digestive enzyme protocols');
    }
    if (templates.includes('sleep') || promptLower.includes('sleep') || promptLower.includes('fatigue') || promptLower.includes('energy')) {
      kbQueries.push('sleep optimization protocols, magnesium supplementation, circadian rhythm support, melatonin alternatives');
    }
    if (templates.includes('adrenal') || promptLower.includes('stress') || promptLower.includes('adrenal') || promptLower.includes('cortisol')) {
      kbQueries.push('adrenal support protocols, adaptogen recommendations, cortisol management, ashwagandha dosing');
    }
    if (templates.includes('immune') || promptLower.includes('immune') || promptLower.includes('inflammation')) {
      kbQueries.push('immune support protocols, vitamin D dosing, zinc protocols, immune-boosting supplements');
    }
    if (templates.includes('weight') || promptLower.includes('weight') || promptLower.includes('metabolic') || promptLower.includes('blood sugar')) {
      kbQueries.push('metabolic support protocols, blood sugar management, weight management supplements');
    }

    // =====================================================
    // CLINIC MODALITIES - Always query for available treatments
    // =====================================================
    // These are the key therapeutic modalities offered at ExpandHealth
    // Query KB to bring in specific protocols for each modality

    kbQueries.push('HBOT hyperbaric oxygen therapy protocols indications benefits treatment schedule');
    kbQueries.push('red light therapy photobiomodulation protocols wavelength dosing treatment frequency');
    kbQueries.push('cold plunge cryotherapy cold exposure protocols benefits timing');
    kbQueries.push('IV therapy intravenous nutrient protocols NAD glutathione vitamin C Myers cocktail');
    kbQueries.push('peptide therapy BPC-157 thymosin alpha GHK-Cu protocols dosing');
    kbQueries.push('ozone therapy blood ozonation EBOO MAH protocols indications');
    kbQueries.push('infrared sauna detox protocols heat therapy benefits');

    // Query based on specific conditions mentioned
    if (promptLower.includes('detox') || medicalHistoryLower.includes('toxin') || medicalHistoryLower.includes('heavy metal')) {
      kbQueries.push('detoxification protocols chelation IV glutathione sauna ozone');
    }
    if (promptLower.includes('recovery') || promptLower.includes('injury') || promptLower.includes('heal')) {
      kbQueries.push('tissue repair protocols HBOT red light peptides BPC-157 recovery');
    }
    if (promptLower.includes('longevity') || promptLower.includes('anti-aging') || promptLower.includes('aging')) {
      kbQueries.push('longevity protocols NAD peptides hyperbaric oxygen cellular regeneration');
    }
    if (promptLower.includes('brain') || promptLower.includes('cognitive') || promptLower.includes('neuro')) {
      kbQueries.push('brain optimization HBOT red light nootropics cognitive protocols');
    }
    if (promptLower.includes('autoimmune') || medicalHistoryLower.includes('autoimmune')) {
      kbQueries.push('autoimmune protocols ozone therapy IV therapy peptides inflammation');
    }

    // Always query for general best practices with the user's specific request
    kbQueries.push(`best practices for ${prompt}`);

    // Execute KB queries in parallel
    let kbContext = '';
    try {
      const kbResults = await Promise.all(
        kbQueries.map(q => queryKnowledgeBase(q, `Client: ${clientData.first_name}, Conditions: ${clientData.medical_history || 'none'}`))
      );
      kbContext = kbResults.filter(r => r).join('\n\n---\n\n');
      if (kbContext) {
        console.log('[Protocol Generate] KB context retrieved successfully');
        console.log(`[Protocol Generate] KB context length: ${kbContext.length} characters`);
        // Log first 500 chars of KB context for debugging
        console.log('[Protocol Generate] KB context preview:', kbContext.substring(0, 500));
      } else {
        console.log('[Protocol Generate] WARNING: No KB context retrieved from any queries');
      }
    } catch (kbError) {
      console.error('[Protocol Generate] KB query error:', kbError.message);
    }

    // Build the AI prompt with KB context
    const aiPrompt = `You are an expert functional medicine protocol specialist with deep knowledge of evidence-based supplement protocols, therapeutic dosages, and clinical timing recommendations. Generate a comprehensive, personalized wellness protocol.

###############################################################
#  CRITICAL RULE - READ THIS FIRST BEFORE ANYTHING ELSE       #
###############################################################

**EVIDENCE-BASED PROTOCOL GENERATION ONLY**

You MUST ONLY create treatment modules for conditions that are EXPLICITLY CONFIRMED in the LABORATORY RESULTS section below.

ABSOLUTE RULES:
1. SCAN THE LAB RESULTS FIRST - Identify ONLY conditions with positive/abnormal findings
2. DO NOT create modules for conditions not tested or not confirmed
3. The Knowledge Base provides treatment approaches - but ONLY apply them to CONFIRMED conditions
4. If a condition is mentioned in the KB but NOT in the client's labs, DO NOT include it

SPECIFICALLY FORBIDDEN (unless lab-confirmed):
- H. pylori eradication → ONLY if H. pylori is POSITIVE in lab results
- Parasite protocols → ONLY if parasites are CONFIRMED in stool testing
- SIBO treatment → ONLY if SIBO is CONFIRMED via breath test
- Candida protocols → ONLY if Candida overgrowth is CONFIRMED
- Any antimicrobial/eradication protocol → ONLY if pathogen is CONFIRMED

If you violate these rules, the protocol will be REJECTED.

###############################################################

CLIENT INFORMATION:
- Name: ${clientData.first_name} ${clientData.last_name}
- Age: ${clientData.date_of_birth ? calculateAge(clientData.date_of_birth) : 'Unknown'}
- Gender: ${clientData.gender || 'Not specified'}
- Medical History: ${clientData.medical_history || 'None provided'}
- Current Medications: ${clientData.current_medications || 'None listed'}
- Allergies: ${clientData.allergies || 'None listed'}

SELECTED PROTOCOL TEMPLATES: ${selectedTemplateNames || 'None - custom protocol'}

${labsContent ? `LABORATORY RESULTS (SOURCE OF TRUTH FOR CONDITIONS):
*** ONLY create treatment modules for conditions CONFIRMED in these results ***
The following lab results are from the client's medical records:

${labsContent}
` : `NO LABORATORY RESULTS PROVIDED:
*** Without lab confirmation, focus ONLY on general wellness, lifestyle, and the user's specific request. DO NOT assume any infections, pathogens, or specific conditions exist. ***
`}

${formsContent ? `INTAKE FORMS & QUESTIONNAIRES:\nThe client has submitted the following health assessments:\n\n${formsContent}\n` : ''}

${notesContent ? `CLINICAL NOTES:\nThe following notes have been documented for this client:\n\n${notesContent}\n` : ''}

${kbContext ? `
=== KNOWLEDGE BASE PROTOCOLS (REFERENCE ONLY - APPLY TO CONFIRMED CONDITIONS) ===
The following are treatment protocols from the ExpandHealth knowledge base.
*** IMPORTANT: Only apply these protocols to conditions that are CONFIRMED in the LABORATORY RESULTS above. ***
*** If a protocol targets a condition not in the labs, DO NOT include it. ***

${kbContext}

Use these protocols for dosages and approaches, but ONLY for lab-confirmed conditions.
` : ''}

USER REQUEST: ${prompt}

CRITICAL INSTRUCTIONS:
1. First, identify ONLY the conditions that are CONFIRMED in the laboratory results
2. Create treatment modules ONLY for those confirmed conditions
3. If Knowledge Base content is provided, use it for dosages and approaches for CONFIRMED conditions only
4. Reference specific protocols by name from the KB when applicable
5. The protocol should be specifically tailored to address confirmed abnormal lab values and documented symptoms

IMPORTANT REQUIREMENTS:
1. For ALL supplements, you MUST include specific therapeutic dosages (e.g., "5g", "500mg", "10 billion CFU")
2. For ALL supplements, you MUST include precise timing (e.g., "With breakfast", "30 min before bed", "Between meals on empty stomach")
3. Include clinical notes explaining WHY each supplement is recommended and any special instructions

*** CLINIC MODALITIES - ABSOLUTELY REQUIRED (DO NOT SKIP) ***
ExpandHealth is a clinic that offers IN-PERSON therapeutic modalities. EVERY protocol MUST include a "Clinic Treatments" module as the LAST module.

YOU MUST ALWAYS include AT LEAST 3-4 of these clinic treatments in EVERY protocol:
1. HBOT (Hyperbaric Oxygen Therapy) - 60-90 min sessions, 2x/week for tissue healing, brain health, recovery
2. Red Light Therapy / Photobiomodulation - 15-20 min sessions, 3x/week for cellular energy, skin health, pain
3. Cold Plunge / Cryotherapy - 3-5 min sessions, 2-3x/week for inflammation, recovery, metabolic health
4. IV Therapy - NAD+, glutathione, vitamin C, Myers cocktail - weekly infusions for nutrient delivery
5. Infrared Sauna - 30-45 min sessions, 2-3x/week for detoxification, cardiovascular health
6. PEMF Therapy - 20-30 min sessions for circulation, cellular energy, pain support

For each clinic modality, ALWAYS include:
- Name of the treatment
- Specific frequency (e.g., "2x per week")
- Duration per session (e.g., "60 minutes")
- Clinical notes explaining WHY this treatment benefits this specific client

FAILURE TO INCLUDE A "Clinic Treatments" MODULE WILL MAKE THIS PROTOCOL INCOMPLETE.

Generate a detailed protocol with this EXACT JSON structure:
{
  "title": "Protocol title",
  "summary": "Brief 2-3 sentence summary of protocol goals and expected outcomes",
  "duration_weeks": 8,
  "modules": [
    {
      "name": "Gut Healing Supplements",
      "description": "Targeted supplements to repair intestinal lining and restore gut health",
      "goal": "Heal leaky gut, reduce inflammation, restore microbiome balance",
      "items": [
        {
          "name": "L-Glutamine",
          "dosage": "5g powder",
          "timing": "Twice daily - morning on empty stomach and before bed",
          "notes": "Primary amino acid for intestinal cell repair. Mix in water. Start with 2.5g and increase over 1 week."
        }
      ]
    },
    {
      "name": "Sleep Optimization Supplements",
      "description": "Natural compounds to improve sleep quality and duration",
      "goal": "Improve sleep onset, increase deep sleep phases, reduce night waking",
      "items": [
        {
          "name": "Magnesium Glycinate",
          "dosage": "400mg",
          "timing": "30-60 minutes before bed",
          "notes": "Glycinate form has superior absorption and calming effect. May cause loose stools initially."
        }
      ]
    },
    {
      "name": "Diet & Nutrition",
      "description": "Dietary modifications to support healing",
      "goal": "Reduce inflammatory triggers, support gut repair",
      "items": [
        {
          "name": "Eliminate inflammatory foods",
          "description": "Remove gluten, dairy, refined sugar, and processed foods for protocol duration",
          "duration": "Full protocol duration",
          "notes": "Keep food diary to track reactions when reintroducing foods later"
        }
      ]
    },
    {
      "name": "Lifestyle Modifications",
      "description": "Daily habits to enhance protocol effectiveness",
      "goal": "Optimize rest, reduce stress, support natural healing",
      "items": [
        {
          "name": "Sleep hygiene routine",
          "description": "Consistent sleep/wake times, no screens 1hr before bed, cool dark room",
          "frequency": "Daily",
          "notes": "This amplifies supplement effectiveness significantly"
        }
      ]
    },
    {
      "name": "Clinic Treatments",
      "description": "In-clinic therapeutic modalities to accelerate healing",
      "goal": "Enhance protocol outcomes through advanced therapies",
      "items": [
        {
          "name": "HBOT (Hyperbaric Oxygen Therapy)",
          "frequency": "2x per week",
          "duration": "60 minutes at 1.5 ATA",
          "notes": "Increases oxygen delivery to tissues, supports mitochondrial function. Recommended for 10-20 sessions."
        },
        {
          "name": "Red Light Therapy",
          "frequency": "3x per week",
          "duration": "15-20 minutes",
          "notes": "Near-infrared and red light for cellular energy (ATP) production. Target treatment areas based on symptoms."
        },
        {
          "name": "IV Therapy - NAD+",
          "frequency": "Weekly for 4 weeks, then monthly",
          "duration": "2-4 hours infusion",
          "notes": "Supports cellular energy, brain function, and anti-aging. Start with 250mg and titrate up."
        }
      ]
    }
  ],
  "precautions": ["Specific precautions based on client's medications and conditions"],
  "followUp": "Recommended follow-up timeline"
}

SUPPLEMENT DOSAGE GUIDELINES TO FOLLOW:
- L-Glutamine: 5-10g/day for gut healing
- Probiotics: 25-100 billion CFU for therapeutic effect
- Digestive Enzymes: Full spectrum with each meal
- Zinc Carnosine: 75-150mg/day for gut lining
- Omega-3 Fish Oil: 2-4g EPA/DHA combined
- Vitamin D3: 2000-5000 IU based on levels, always with K2
- Magnesium (any form): 300-500mg
- B-Complex: Methylated forms preferred
- Vitamin C: 1-3g/day in divided doses
- Ashwagandha: 300-600mg standardized extract
- Berberine: 500mg 2-3x daily with meals
- Curcumin: 500-1000mg with piperine or liposomal form

Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

    console.log('[Protocol Generate] Calling Claude API...');

    // Call Claude API with increased max_tokens to prevent truncation
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,  // Increased from 4096 to prevent response truncation
      messages: [{
        role: 'user',
        content: aiPrompt
      }]
    });

    console.log('[Protocol Generate] Claude API response received');

    const aiResponse = response.content[0].text;

    // Parse the JSON response
    let protocolData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        protocolData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Protocol Generate] Failed to parse response:', parseError.message);
      // Return a comprehensive fallback structure with clinical dosages
      const isGutProtocol = templates.includes('gut') || prompt.toLowerCase().includes('gut');
      const isSleepProtocol = templates.includes('sleep') || prompt.toLowerCase().includes('sleep') || prompt.toLowerCase().includes('fatigue');

      protocolData = {
        title: `${selectedTemplateNames || 'Comprehensive Wellness'} Protocol for ${clientData.first_name}`,
        summary: `Personalized protocol addressing ${prompt}. This protocol combines targeted supplementation, dietary modifications, and lifestyle changes for optimal results.`,
        duration_weeks: 8,
        modules: [],
        precautions: ['Consult with healthcare provider before starting', 'Start supplements one at a time to monitor tolerance', 'Discontinue if adverse reactions occur'],
        followUp: 'Follow up in 4 weeks to assess progress and adjust protocol as needed'
      };

      // Add Gut Healing Supplements if relevant
      if (isGutProtocol) {
        protocolData.modules.push({
          name: 'Gut Healing Supplements',
          description: 'Targeted supplements to repair intestinal lining and restore gut health',
          goal: 'Heal intestinal lining, reduce inflammation, restore healthy microbiome',
          items: [
            { name: 'L-Glutamine', dosage: '5g powder', timing: 'Twice daily - morning on empty stomach and before bed', notes: 'Primary amino acid for intestinal cell repair. Mix in water. Start with 2.5g and increase over 1 week.' },
            { name: 'Multi-Strain Probiotic', dosage: '50 billion CFU', timing: 'Morning with breakfast', notes: 'Look for strains including Lactobacillus and Bifidobacterium. Refrigerate after opening.' },
            { name: 'Digestive Enzymes', dosage: 'Full spectrum blend', timing: 'With each main meal', notes: 'Take at beginning of meal. Should include protease, lipase, and amylase.' },
            { name: 'Zinc Carnosine', dosage: '75mg', timing: 'Twice daily between meals', notes: 'Specifically supports gastric and intestinal lining repair.' },
            { name: 'Omega-3 Fish Oil', dosage: '2g EPA/DHA', timing: 'With meals (split dose)', notes: 'Anti-inflammatory. Choose molecularly distilled, third-party tested brand.' },
            { name: 'Vitamin D3 with K2', dosage: '5000 IU D3 / 100mcg K2', timing: 'Morning with fatty meal', notes: 'Essential for gut immune function. K2 ensures proper calcium metabolism.' }
          ]
        });
      }

      // Add Sleep Supplements if relevant
      if (isSleepProtocol) {
        protocolData.modules.push({
          name: 'Sleep & Energy Supplements',
          description: 'Natural compounds to optimize sleep quality and restore energy',
          goal: 'Improve sleep onset, increase deep sleep, reduce daytime fatigue',
          items: [
            { name: 'Magnesium Glycinate', dosage: '400mg', timing: '30-60 minutes before bed', notes: 'Glycinate form is highly absorbable and has calming effect. May cause loose stools initially.' },
            { name: 'Ashwagandha', dosage: '300mg (KSM-66 extract)', timing: 'Evening with dinner', notes: 'Adaptogen that reduces cortisol and supports adrenal function. Take for 4-8 weeks continuously.' },
            { name: 'L-Theanine', dosage: '200mg', timing: 'Before bed or during stressful periods', notes: 'Promotes relaxation without sedation. Can be combined with magnesium.' },
            { name: 'B-Complex (Methylated)', dosage: 'Full spectrum', timing: 'Morning with breakfast', notes: 'Essential for energy production. Methylated forms (methylfolate, methylcobalamin) are better absorbed.' },
            { name: 'CoQ10 (Ubiquinol)', dosage: '200mg', timing: 'Morning with fatty breakfast', notes: 'Mitochondrial support for cellular energy. Ubiquinol form is active and better absorbed.' }
          ]
        });
      }

      // Add Diet module
      protocolData.modules.push({
        name: 'Diet & Nutrition',
        description: 'Dietary modifications to support healing and reduce inflammation',
        goal: 'Remove inflammatory triggers, nourish gut lining, stabilize blood sugar',
        items: [
          { name: 'Eliminate inflammatory foods', description: 'Remove gluten, dairy, refined sugar, alcohol, and processed foods for protocol duration', notes: 'Keep food diary to track symptoms and reactions' },
          { name: 'Increase fiber intake', description: 'Add 25-35g fiber daily from vegetables, legumes, and low-sugar fruits', notes: 'Increase gradually to avoid digestive discomfort' },
          { name: 'Bone broth daily', description: 'Consume 1-2 cups of quality bone broth', notes: 'Rich in collagen, glutamine, and minerals for gut healing' },
          { name: 'Anti-inflammatory foods', description: 'Include fatty fish, olive oil, leafy greens, berries, turmeric', notes: 'These provide natural anti-inflammatory compounds' }
        ]
      });

      // Add Lifestyle module
      protocolData.modules.push({
        name: 'Lifestyle Modifications',
        description: 'Daily habits to enhance protocol effectiveness',
        goal: 'Optimize circadian rhythm, reduce stress, support natural healing',
        items: [
          { name: 'Sleep hygiene routine', description: 'Consistent 10pm-6am sleep schedule, no screens 1hr before bed, cool dark room (65-68°F)', notes: 'Critical for gut repair which happens during sleep' },
          { name: 'Morning sunlight exposure', description: '10-20 minutes of natural light within 1 hour of waking', notes: 'Sets circadian rhythm and improves cortisol pattern' },
          { name: 'Stress management practice', description: '10-15 minutes daily of meditation, breathwork, or gentle yoga', notes: 'Stress directly impairs gut function via vagus nerve' },
          { name: 'Gentle movement', description: '30 minutes daily walking or light exercise', notes: 'Avoid intense exercise initially as it can stress the body' }
        ]
      });
    }

    // =====================================================
    // POST-PROCESSING: Ensure Clinic Treatments module exists
    // =====================================================
    // This is CRITICAL - every ExpandHealth protocol MUST include clinic modalities
    const hasClinicTreatments = protocolData.modules?.some(m =>
      m.name?.toLowerCase().includes('clinic') ||
      m.name?.toLowerCase().includes('in-clinic') ||
      m.name?.toLowerCase().includes('therapeutic modalities')
    );

    if (!hasClinicTreatments && protocolData.modules) {
      console.log('[Protocol Generate] Adding Clinic Treatments module (was missing from AI response)');

      // Determine which treatments to recommend based on client data and prompt
      const clinicTreatments = [];
      const promptLower = prompt.toLowerCase();
      const medicalHistoryLower = (clientData.medical_history || '').toLowerCase();

      // HBOT - recommended for most protocols
      clinicTreatments.push({
        name: 'HBOT (Hyperbaric Oxygen Therapy)',
        frequency: '2x per week',
        duration: '60 minutes at 1.5 ATA',
        notes: 'Increases oxygen delivery to tissues, supports mitochondrial function and cellular repair. Recommended for 10-20 sessions initial course.'
      });

      // Red Light Therapy - recommended for most protocols
      clinicTreatments.push({
        name: 'Red Light Therapy / Photobiomodulation',
        frequency: '3x per week',
        duration: '15-20 minutes',
        notes: 'Near-infrared (850nm) and red (630nm) light for cellular energy (ATP) production, reduces inflammation, supports skin and tissue healing.'
      });

      // IV Therapy - based on needs
      if (promptLower.includes('energy') || promptLower.includes('fatigue') || promptLower.includes('longevity') || promptLower.includes('detox')) {
        clinicTreatments.push({
          name: 'IV Therapy - NAD+',
          frequency: 'Weekly for 4 weeks, then bi-weekly',
          duration: '2-4 hours infusion',
          notes: 'Supports cellular energy, brain function, DNA repair, and longevity pathways. Start with 250mg and titrate up to 500mg based on tolerance.'
        });
      } else {
        clinicTreatments.push({
          name: 'IV Therapy - Myers Cocktail',
          frequency: 'Weekly for 4 weeks',
          duration: '30-45 minutes infusion',
          notes: 'Blend of B vitamins, vitamin C, magnesium, and minerals for enhanced nutrient absorption and energy support.'
        });
      }

      // Infrared Sauna - for detox/metabolic
      if (promptLower.includes('detox') || promptLower.includes('weight') || promptLower.includes('metabolic') || medicalHistoryLower.includes('toxin')) {
        clinicTreatments.push({
          name: 'Infrared Sauna',
          frequency: '2-3x per week',
          duration: '30-45 minutes',
          notes: 'Full-spectrum infrared for deep tissue detoxification, improved circulation, and cardiovascular health. Stay well hydrated.'
        });
      }

      // Cold Plunge - for inflammation/recovery
      if (promptLower.includes('inflammation') || promptLower.includes('recovery') || promptLower.includes('immune') || promptLower.includes('stress')) {
        clinicTreatments.push({
          name: 'Cold Plunge / Cryotherapy',
          frequency: '2-3x per week',
          duration: '3-5 minutes at 50-55°F',
          notes: 'Activates cold shock proteins, reduces inflammation, improves stress resilience and metabolic health. Build up tolerance gradually.'
        });
      }

      // PEMF - for pain/healing
      if (promptLower.includes('pain') || promptLower.includes('healing') || promptLower.includes('injury') || promptLower.includes('bone')) {
        clinicTreatments.push({
          name: 'PEMF Therapy',
          frequency: '2-3x per week',
          duration: '20-30 minutes',
          notes: 'Pulsed electromagnetic field therapy for enhanced circulation, cellular energy, bone healing, and pain support.'
        });
      }

      // Add the Clinic Treatments module at the end
      protocolData.modules.push({
        name: 'Clinic Treatments',
        description: 'In-clinic therapeutic modalities to accelerate healing and optimize protocol outcomes',
        goal: 'Enhance cellular function, accelerate recovery, and provide advanced therapeutic support',
        items: clinicTreatments
      });
    }

    // Save the protocol to the database
    // Actual DB Schema: id, client_id, template_id, start_date, end_date, status, modules, notes, ai_recommendations, created_by, created_at, updated_at
    try {
      const durationWeeks = protocolData.duration_weeks || 8;
      const insertResult = await db.query(
        `INSERT INTO protocols (
          client_id, template_id, start_date, end_date, status, modules, notes, ai_recommendations, created_by
        ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + interval '${durationWeeks} weeks', 'draft', $3, $4, $5, $6)
        RETURNING *`,
        [
          client_id,
          primaryTemplateId, // template_id from first selected template
          JSON.stringify(protocolData.modules),
          `Title: ${protocolData.title}\n\nPrompt: ${prompt}\n\nPrecautions: ${protocolData.precautions?.join(', ')}\n\nFollow-up: ${protocolData.followUp}`,
          protocolData.summary,
          req.user.id
        ]
      );

      console.log('[Protocol Generate] Protocol saved to database');

      res.status(201).json({
        message: 'Protocol generated successfully',
        protocol: insertResult.rows[0],
        ...protocolData
      });

    } catch (saveError) {
      console.error('[Protocol Generate] Error saving protocol:', saveError.message);
      // Return the generated data even if save fails
      res.json({
        message: 'Protocol generated (not saved - database error)',
        ...protocolData,
        saveError: saveError.message
      });
    }

  } catch (error) {
    console.error('[Protocol Generate] Error:', error);
    console.error('[Protocol Generate] Error message:', error.message);
    console.error('[Protocol Generate] Error stack:', error.stack);

    // Return more specific error info
    res.status(500).json({
      error: 'Protocol generation failed',
      message: error.message || 'Unknown error',
      details: error.status ? `API Status: ${error.status}` : undefined
    });
  }
});

// ========================================
// AI MODULE EDITING
// ========================================

// Edit a module using AI prompt
router.post('/edit-module', authenticateToken, async (req, res, next) => {
  try {
    const {
      module: currentModule,
      prompt,
      action = 'edit' // 'edit', 'add', or 'remove'
    } = req.body;

    console.log('[Module Edit] Request received:', { action, prompt, moduleName: currentModule?.name });

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // For 'add' action, we're creating a new module
    if (action === 'add') {
      const aiPrompt = `You are a functional medicine protocol specialist. Create a NEW protocol module based on this request:

USER REQUEST: ${prompt}

Generate a protocol module with this EXACT JSON structure:
{
  "name": "Module Name",
  "description": "Brief description of this module's purpose",
  "goal": "Specific goal this module aims to achieve",
  "items": [
    {
      "name": "Item name",
      "dosage": "Specific dosage (e.g., '500mg', '5g')",
      "timing": "When to take/do this",
      "notes": "Clinical notes and instructions"
    }
  ]
}

For supplement modules, always include: name, dosage, timing, notes
For lifestyle modules, include: name, description, frequency, notes
For diet modules, include: name, description, duration, notes

Return ONLY valid JSON. No markdown, no code blocks.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{ role: 'user', content: aiPrompt }]
      });

      const aiResponse = response.content[0].text;
      let newModule;

      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          newModule = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Create a basic module structure
        newModule = {
          name: 'New Module',
          description: prompt,
          goal: 'As specified in request',
          items: []
        };
      }

      console.log('[Module Edit] New module created:', newModule.name);

      return res.json({
        success: true,
        action: 'add',
        module: newModule
      });
    }

    // For 'edit' or 'remove' actions, we need the current module
    if (!currentModule) {
      return res.status(400).json({ error: 'Current module data is required for edit/remove actions' });
    }

    const aiPrompt = `You are a functional medicine protocol specialist. Modify this protocol module based on the user's request.

CURRENT MODULE:
${JSON.stringify(currentModule, null, 2)}

USER REQUEST: ${prompt}

IMPORTANT INSTRUCTIONS:
1. If the user asks to REMOVE an item (e.g., "remove L-Theanine"), remove that specific item from the items array
2. If the user asks to ADD an item, add it with proper dosage, timing, and notes
3. If the user asks to MODIFY an item, update just that specific item
4. Keep all other items unchanged
5. Maintain the same structure and format

Return the MODIFIED module as valid JSON with this structure:
{
  "name": "Module Name",
  "description": "Module description",
  "goal": "Module goal",
  "items": [
    // Modified items array
  ]
}

Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

    console.log('[Module Edit] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: aiPrompt }]
    });

    console.log('[Module Edit] Claude API response received');

    const aiResponse = response.content[0].text;
    let updatedModule;

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        updatedModule = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Module Edit] Failed to parse response:', parseError.message);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: parseError.message
      });
    }

    console.log('[Module Edit] Module updated successfully');

    res.json({
      success: true,
      action: action,
      module: updatedModule
    });

  } catch (error) {
    console.error('[Module Edit] Error:', error);
    next(error);
  }
});

// Generate a new module using AI
router.post('/generate-module', authenticateToken, async (req, res, next) => {
  try {
    const { prompt, client_id } = req.body;

    console.log('[Module Generate] Request received:', { prompt, client_id });

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get client data if provided
    let clientContext = '';
    if (client_id) {
      try {
        const clientResult = await db.query(
          `SELECT first_name, last_name, medical_history, current_medications, allergies
           FROM clients WHERE id = $1`,
          [client_id]
        );
        if (clientResult.rows.length > 0) {
          const client = clientResult.rows[0];
          clientContext = `
CLIENT CONTEXT:
- Name: ${client.first_name} ${client.last_name}
- Medical History: ${client.medical_history || 'None provided'}
- Current Medications: ${client.current_medications || 'None listed'}
- Allergies: ${client.allergies || 'None listed'}
`;
        }
      } catch (dbError) {
        console.error('[Module Generate] Error fetching client:', dbError.message);
      }
    }

    const aiPrompt = `You are a functional medicine protocol specialist. Create a NEW protocol module based on this request:
${clientContext}
USER REQUEST: ${prompt}

Generate a detailed protocol module with this EXACT JSON structure:
{
  "name": "Descriptive Module Name",
  "description": "Clear description of this module's purpose and approach",
  "goal": "Specific, measurable goal this module aims to achieve",
  "items": [
    {
      "name": "Supplement/Activity Name",
      "dosage": "Specific therapeutic dosage (e.g., '500mg', '5g powder', '2 capsules')",
      "timing": "Precise timing instructions (e.g., 'Morning with breakfast', '30 min before bed')",
      "notes": "Clinical rationale, precautions, and additional instructions"
    }
  ]
}

REQUIREMENTS:
- Include 3-6 relevant items in the module
- Use evidence-based therapeutic dosages
- Provide specific timing instructions
- Include clinical notes with rationale
- Consider any client allergies or medications if provided

Return ONLY valid JSON. No markdown, no code blocks.`;

    console.log('[Module Generate] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: aiPrompt }]
    });

    console.log('[Module Generate] Claude API response received');

    const aiResponse = response.content[0].text;
    let newModule;

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        newModule = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Module Generate] Failed to parse response:', parseError.message);
      // Create fallback module
      newModule = {
        name: 'Custom Module',
        description: prompt,
        goal: 'Custom goal based on user request',
        items: [
          {
            name: 'Custom Item',
            dosage: 'As directed',
            timing: 'As needed',
            notes: 'Please customize this module based on your specific needs.'
          }
        ]
      };
    }

    console.log('[Module Generate] New module generated:', newModule.name);

    res.json({
      success: true,
      module: newModule
    });

  } catch (error) {
    console.error('[Module Generate] Error:', error);
    next(error);
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ========================================
// ENGAGEMENT PLAN GENERATION
// ========================================

// Generate personalized engagement plan from protocol
router.post('/:id/generate-engagement-plan', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { personality_type, communication_preferences } = req.body;

    console.log('[Engagement Plan] Generating for protocol:', id);

    // Get protocol with client info
    const protocolResult = await db.query(
      `SELECT
        p.*,
        c.first_name, c.last_name, c.email, c.phone,
        cm.medical_history, cm.lifestyle_notes,
        pt.name as template_name, pt.category as template_category
      FROM protocols p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN client_metadata cm ON c.id = cm.client_id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      WHERE p.id = $1`,
      [id]
    );

    if (protocolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const protocol = protocolResult.rows[0];
    const clientName = `${protocol.first_name} ${protocol.last_name}`;

    // Parse modules from protocol
    let modules = [];
    try {
      modules = typeof protocol.modules === 'string'
        ? JSON.parse(protocol.modules)
        : protocol.modules || [];
    } catch (e) {
      console.error('[Engagement Plan] Error parsing modules:', e.message);
    }

    // Query KB for engagement strategies AND clinic modalities
    console.log('[Engagement Plan] Querying KB for engagement strategies and modalities...');
    let kbEngagementContext = '';
    try {
      const engagementQueries = [
        'patient engagement strategies functional medicine',
        'phased protocol delivery best practices',
        'behavior change techniques wellness coaching',
        `engagement strategies for ${protocol.template_category || 'wellness'} protocols`,
        // Clinic modalities - to include treatment scheduling in engagement plan
        'HBOT hyperbaric oxygen therapy session scheduling frequency treatment plan',
        'red light therapy treatment schedule photobiomodulation sessions',
        'IV therapy treatment schedule infusion frequency protocols',
        'cold plunge cryotherapy treatment schedule timing protocols',
        'peptide therapy treatment protocol schedule administration',
        'ozone therapy EBOO MAH treatment schedule sessions',
        'infrared sauna treatment protocol schedule sessions'
      ];

      const kbResults = await Promise.all(
        engagementQueries.map(q => queryKnowledgeBase(q, `Protocol: ${protocol.template_name}, Client notes: ${protocol.lifestyle_notes || 'general wellness'}`))
      );
      kbEngagementContext = kbResults.filter(r => r).join('\n\n');
      if (kbEngagementContext) {
        console.log('[Engagement Plan] KB engagement context retrieved with clinic modalities');
      }
    } catch (kbError) {
      console.error('[Engagement Plan] KB query error:', kbError.message);
    }

    // Build the AI prompt for engagement plan
    const aiPrompt = `You are an expert health coach and patient engagement specialist. Create a personalized, phased engagement plan to help a patient successfully implement their wellness protocol.

PATIENT INFORMATION:
- Name: ${clientName}
- Lifestyle Notes: ${protocol.lifestyle_notes || 'Not specified'}
- Personality Type: ${personality_type || 'Not specified'}
- Communication Preferences: ${communication_preferences || 'Standard'}

PROTOCOL DETAILS:
- Protocol Name: ${protocol.template_name || 'Custom Protocol'}
- Category: ${protocol.template_category || 'General Wellness'}
- Duration: ${protocol.end_date ? Math.ceil((new Date(protocol.end_date) - new Date(protocol.start_date)) / (1000 * 60 * 60 * 24 * 7)) : 8} weeks

PROTOCOL MODULES:
${modules.map((m, i) => `${i + 1}. ${m.name}: ${m.items?.length || 0} items`).join('\n')}

${kbEngagementContext ? `
=== KNOWLEDGE BASE ENGAGEMENT STRATEGIES (CRITICAL - USE THESE) ===
The following engagement strategies and protocols are from the ExpandHealth knowledge base. These are your PRIMARY source for structuring the engagement plan:

${kbEngagementContext}

*** MANDATORY: Incorporate the specific strategies, phasing approaches, and recommendations from the Knowledge Base above. Reference them by name when applicable. ***
` : ''}

Create a 4-phase engagement plan with this EXACT JSON structure:
{
  "title": "Engagement Plan for ${clientName}",
  "summary": "A 2-3 sentence overview of the engagement approach tailored to this patient",
  "total_weeks": 4,
  "phases": [
    {
      "phase_number": 1,
      "title": "Phase 1: Foundations (Week 1)",
      "subtitle": "Brief description of phase focus",
      "items": [
        "Specific action item 1 from the protocol",
        "Specific action item 2",
        "Specific action item 3",
        "Specific action item 4",
        "Specific action item 5"
      ],
      "progress_goal": "Measurable goal for this phase",
      "check_in_prompts": ["Question to ask patient at end of week"]
    }
  ],
  "communication_schedule": {
    "check_in_frequency": "Every 3 days",
    "preferred_channel": "WhatsApp",
    "message_tone": "Encouraging and supportive"
  },
  "success_metrics": ["Metric 1", "Metric 2", "Metric 3"]
}

IMPORTANT GUIDELINES:
1. Each phase should build progressively - don't overwhelm the patient in Week 1
2. Phase 1: Focus on 2-3 foundational habits only
3. Phase 2: Add dietary changes and expand supplements
4. Phase 3: Integrate feedback, adjust based on response
5. Phase 4: Optimize, assess results, plan long-term maintenance
6. Include specific items from the protocol modules in each phase
7. Make action items concrete and actionable (not vague)
8. Include check-in prompts to gather patient feedback

*** CLINIC MODALITIES - CRITICAL ***
ExpandHealth offers in-clinic therapeutic modalities. You MUST incorporate clinic treatment scheduling into the engagement plan phases:
- HBOT (Hyperbaric Oxygen Therapy) - schedule 2x/week sessions
- Red Light Therapy - schedule 3x/week sessions
- Cold Plunge / Cryotherapy - introduce in Phase 2 or 3
- IV Therapy (NAD+, glutathione, vitamin C) - weekly sessions
- Peptide Therapy - as prescribed by practitioner
- Ozone Therapy / EBOO - weekly or bi-weekly
- Infrared Sauna - 2-3x per week

Include specific clinic appointments in phase items, e.g.:
- "Schedule first HBOT session at clinic"
- "Begin red light therapy 3x/week at clinic"
- "IV NAD+ infusion this week"

Return ONLY valid JSON. No markdown, no code blocks.`;

    console.log('[Engagement Plan] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: aiPrompt }]
    });

    console.log('[Engagement Plan] Claude API response received');

    const aiResponse = response.content[0].text;
    let engagementPlan;

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        engagementPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Engagement Plan] Failed to parse response:', parseError.message);
      // Return fallback engagement plan
      engagementPlan = {
        title: `${protocol.template_name || 'Wellness'} Engagement Plan`,
        summary: `This 4-week engagement plan is designed to help ${clientName} successfully implement their wellness protocol through phased delivery and regular check-ins.`,
        total_weeks: 4,
        phases: [
          {
            phase_number: 1,
            title: 'Phase 1: Foundations (Week 1)',
            subtitle: 'Establishing the groundwork for success',
            items: [
              'Start core supplement regimen as prescribed',
              'Get morning sunlight within 30 minutes of waking',
              'Avoid screens at least 45 minutes before bedtime',
              'Begin food journaling to track meals and energy levels',
              'Journal stress triggers twice this week'
            ],
            progress_goal: 'Build initial rhythm and reduce common health disruptors',
            check_in_prompts: ['How are you feeling with the new supplements?', 'Any challenges with the morning routine?']
          },
          {
            phase_number: 2,
            title: 'Phase 2: Expand & Adapt (Week 2)',
            subtitle: 'Building on foundations and introducing dietary changes',
            items: [
              'Introduce dietary modifications per protocol guidelines',
              'Begin elimination of trigger foods if applicable',
              'Add 5-10 minutes of breathwork or meditation daily',
              'Track energy levels and symptoms in app',
              'Review and adjust supplement timing based on feedback'
            ],
            progress_goal: 'Establish dietary patterns and introduce mindfulness practices',
            check_in_prompts: ['How is the dietary transition going?', 'Notice any changes in energy or sleep?']
          },
          {
            phase_number: 3,
            title: 'Phase 3: Refine & Reflect (Week 3)',
            subtitle: 'Integrating feedback and tracking body response',
            items: [
              'Monitor wearable metrics daily (e.g. HRV, sleep quality)',
              'Track cortisol-related symptoms like restlessness or energy crashes',
              'Add one evening yoga or stretching session this week',
              'Share journal notes with practitioner',
              'Schedule recommended lab tests if applicable'
            ],
            progress_goal: 'Identify trends and begin individualizing the approach',
            check_in_prompts: ['What patterns are you noticing?', 'Any symptoms we should address?']
          },
          {
            phase_number: 4,
            title: 'Phase 4: Assess & Sustain (Week 4)',
            subtitle: 'Reviewing results and locking in long-term strategies',
            items: [
              'Complete any pending lab tests',
              'Evaluate supplement effectiveness and tolerability',
              'Refine the protocol with your practitioner based on results',
              'Maintain consistent habits (routine, dietary choices, journaling)',
              'Prepare questions for follow-up consultation'
            ],
            progress_goal: 'Make final adjustments and ensure long-term sustainability',
            check_in_prompts: ['What has worked best for you?', 'What would you like to adjust going forward?']
          }
        ],
        communication_schedule: {
          check_in_frequency: 'Every 3 days',
          preferred_channel: 'WhatsApp',
          message_tone: 'Encouraging and supportive'
        },
        success_metrics: [
          'Supplement adherence rate',
          'Sleep quality improvement',
          'Energy level changes',
          'Symptom reduction'
        ]
      };
    }

    // Update protocol with engagement plan (store as clean JSON)
    const planJson = JSON.stringify(engagementPlan);
    console.log('[Engagement Plan] Saving to protocol id:', id);
    console.log('[Engagement Plan] JSON length:', planJson.length);

    const updateResult = await db.query(
      `UPDATE protocols SET
        ai_recommendations = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, ai_recommendations`,
      [planJson, id]
    );

    console.log('[Engagement Plan] Update result rows:', updateResult.rows.length);
    if (updateResult.rows.length > 0) {
      console.log('[Engagement Plan] Saved ai_recommendations length:', updateResult.rows[0].ai_recommendations?.length);
    }
    console.log('[Engagement Plan] Generated and saved successfully');

    res.json({
      success: true,
      engagement_plan: engagementPlan,
      protocol_id: id,
      client_name: clientName
    });

  } catch (error) {
    console.error('[Engagement Plan] Error:', error);
    next(error);
  }
});

// Debug endpoint to check and fix protocol data
router.post('/debug/fix-empty-protocols', authenticateToken, async (req, res, next) => {
  try {
    // Get all protocols with empty or null notes
    const result = await db.query(`
      SELECT p.id, p.client_id, p.status, p.notes, p.ai_recommendations,
             pt.name as template_name,
             c.first_name, c.last_name
      FROM protocols p
      JOIN clients c ON p.client_id = c.id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      WHERE p.notes IS NULL OR p.notes = ''
      ORDER BY p.created_at DESC
    `);

    console.log('[Debug] Found', result.rows.length, 'protocols with empty notes');

    const updated = [];
    for (const row of result.rows) {
      const dummyTitle = row.template_name || 'Health Optimization Protocol';
      const dummyContent = `Title: ${dummyTitle}

This protocol is designed to support optimal health and wellness for ${row.first_name} ${row.last_name}.

## Overview
A comprehensive approach to improving overall health through targeted interventions, lifestyle modifications, and personalized recommendations.

## Key Focus Areas
1. Nutritional optimization
2. Sleep quality improvement
3. Stress management techniques
4. Physical activity guidance
5. Supplement recommendations

## Implementation Timeline
- Week 1-2: Assessment and baseline establishment
- Week 3-4: Initial interventions and monitoring
- Week 5-8: Optimization and adjustment phase

## Expected Outcomes
- Improved energy levels
- Better sleep quality
- Enhanced mental clarity
- Reduced inflammation markers

## Notes
This is a sample protocol content. Edit to customize for the client's specific needs.`;

      await db.query(
        'UPDATE protocols SET notes = $1 WHERE id = $2',
        [dummyContent, row.id]
      );
      updated.push({ id: row.id, title: dummyTitle });
    }

    res.json({
      message: `Updated ${updated.length} protocols with sample content`,
      updated
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    next(error);
  }
});

// Debug endpoint to view protocol raw data
router.get('/debug/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM protocols WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    res.json({ protocol: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Edit engagement plan phase using AI
router.post('/edit-engagement-phase', authenticateToken, async (req, res, next) => {
  try {
    const {
      phase: currentPhase,
      prompt,
      action = 'edit' // 'edit', 'add', or 'remove'
    } = req.body;

    console.log('[Engagement Phase Edit] Request received:', { action, prompt, phaseTitle: currentPhase?.title });

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // For 'add' action, we're creating a new phase
    if (action === 'add') {
      const aiPrompt = `You are a patient engagement specialist. Create a NEW engagement plan phase based on this request:

USER REQUEST: ${prompt}

Generate an engagement phase with this EXACT JSON structure:
{
  "title": "Phase X: Phase Name (Week X)",
  "subtitle": "Brief description of this phase's focus",
  "items": [
    "Specific action item 1",
    "Specific action item 2",
    "Specific action item 3",
    "Specific action item 4"
  ],
  "progress_goal": "What the patient should achieve by the end of this phase",
  "check_in_prompts": [
    "Question to ask during check-in 1?",
    "Question to ask during check-in 2?"
  ]
}

Return ONLY valid JSON. No markdown, no code blocks.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{ role: 'user', content: aiPrompt }]
      });

      const aiResponse = response.content[0].text;
      let newPhase;

      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          newPhase = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Create a basic phase structure
        newPhase = {
          title: 'New Phase',
          subtitle: prompt,
          items: ['Action item based on your request'],
          progress_goal: 'As specified in request',
          check_in_prompts: ['How are you feeling about this phase?']
        };
      }

      console.log('[Engagement Phase Edit] New phase created:', newPhase.title);

      return res.json({
        success: true,
        action: 'add',
        phase: newPhase
      });
    }

    // For 'edit' or 'remove' actions, we need the current phase
    if (!currentPhase) {
      return res.status(400).json({ error: 'Current phase data is required for edit/remove actions' });
    }

    const aiPrompt = `You are a patient engagement specialist. Modify this engagement plan phase based on the user's request.

CURRENT PHASE:
${JSON.stringify(currentPhase, null, 2)}

USER REQUEST: ${prompt}

IMPORTANT INSTRUCTIONS:
1. If the user asks to REMOVE an item, remove that specific item from the items array
2. If the user asks to ADD an item, add it to the items array
3. If the user asks to MODIFY content, update just that specific content
4. If the user asks to change the progress goal, update it
5. If the user asks to modify check-in questions, update the check_in_prompts array
6. Keep all other content unchanged
7. Maintain the same structure and format

Return the MODIFIED phase as valid JSON with this structure:
{
  "title": "Phase title",
  "subtitle": "Phase subtitle",
  "items": ["action item 1", "action item 2", ...],
  "progress_goal": "Goal for this phase",
  "check_in_prompts": ["question 1", "question 2"]
}

Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

    console.log('[Engagement Phase Edit] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: aiPrompt }]
    });

    console.log('[Engagement Phase Edit] Claude API response received');

    const aiResponse = response.content[0].text;
    let updatedPhase;

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        updatedPhase = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Engagement Phase Edit] Failed to parse response:', parseError.message);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: parseError.message
      });
    }

    console.log('[Engagement Phase Edit] Phase updated successfully');

    res.json({
      success: true,
      action: action,
      phase: updatedPhase
    });

  } catch (error) {
    console.error('[Engagement Phase Edit] Error:', error);
    next(error);
  }
});

// Update engagement plan for a protocol
router.put('/:id/engagement-plan', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { engagement_plan } = req.body;

    console.log('[Update Engagement Plan] Protocol ID:', id);

    // Get the current protocol
    const protocolResult = await db.query(
      'SELECT * FROM protocols WHERE id = $1',
      [id]
    );

    if (protocolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    // Update the ai_recommendations field with the new engagement plan
    const planJson = typeof engagement_plan === 'string'
      ? engagement_plan
      : JSON.stringify(engagement_plan);

    await db.query(
      'UPDATE protocols SET ai_recommendations = $1, updated_at = NOW() WHERE id = $2',
      [planJson, id]
    );

    console.log('[Update Engagement Plan] Updated successfully');

    res.json({
      success: true,
      message: 'Engagement plan updated successfully'
    });

  } catch (error) {
    console.error('[Update Engagement Plan] Error:', error);
    next(error);
  }
});

module.exports = router;
