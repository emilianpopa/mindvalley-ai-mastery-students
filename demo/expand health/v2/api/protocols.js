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
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
let anthropic = null;
if (anthropicApiKey) {
  anthropic = new Anthropic({
    apiKey: anthropicApiKey
  });
  console.log('[Protocols API] Claude/Anthropic configured');
} else {
  console.log('[Protocols API] Warning: No ANTHROPIC_API_KEY or CLAUDE_API_KEY found');
}

// Import Clinical Protocol Engine prompt generator
const { generateClinicalProtocolPrompt, calculateAge } = require('../prompts/clinical-protocol-engine');

// Import Engagement Plan Alignment module
const {
  extractProtocolElements,
  generateAlignedEngagementPlanPrompt,
  validateEngagementPlanAlignment,
  autoFixEngagementPlan,
  generateRegenerationPrompt
} = require('../prompts/engagement-plan-alignment');

// Initialize Gemini SDK for Knowledge Base queries (using new File Search API)
const { GoogleGenAI } = require('@google/genai');
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('[Protocols API] Gemini configured');
} else {
  console.log('[Protocols API] Warning: No GEMINI_API_KEY found');
}

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

// Seed clinical protocol templates
router.post('/templates/seed', authenticateToken, async (req, res, next) => {
  try {
    const { clinicalTemplates } = require('../database/seed-clinical-templates');

    let inserted = 0;
    let skipped = 0;
    const results = [];

    for (const template of clinicalTemplates) {
      // Check if template with this name exists
      const checkResult = await db.query(
        'SELECT id FROM protocol_templates WHERE name = $1',
        [template.name]
      );

      if (checkResult.rows.length > 0) {
        skipped++;
        results.push({ name: template.name, status: 'skipped', reason: 'already exists' });
        continue;
      }

      // Insert new template
      await db.query(
        `INSERT INTO protocol_templates (name, description, category, duration_weeks, modules)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          template.name,
          template.description,
          template.category,
          template.duration_weeks,
          JSON.stringify(template.modules)
        ]
      );

      inserted++;
      results.push({ name: template.name, status: 'inserted' });
    }

    res.json({
      message: 'Clinical templates seeding complete',
      inserted,
      skipped,
      results
    });

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

// ========================================
// ENGAGEMENT PLANS ROUTES (must be before /:id to avoid route conflict)
// ========================================

// Get all engagement plans for a client
router.get('/engagement-plans/client/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;

    const result = await db.query(`
      SELECT
        ep.id,
        ep.client_id,
        ep.source_protocol_id,
        ep.title,
        ep.status,
        ep.plan_data,
        ep.validation_data,
        ep.created_at,
        ep.updated_at,
        p.title as protocol_title,
        p.status as protocol_status
      FROM engagement_plans ep
      LEFT JOIN protocols p ON ep.source_protocol_id = p.id
      WHERE ep.client_id = $1
      ORDER BY ep.updated_at DESC
    `, [clientId]);

    console.log('[Engagement Plans] Found', result.rows.length, 'plans for client', clientId);

    res.json({
      success: true,
      engagement_plans: result.rows.map(row => ({
        id: row.id,
        client_id: row.client_id,
        source_protocol_id: row.source_protocol_id,
        title: row.title,
        status: row.status,
        plan_data: typeof row.plan_data === 'string' ? JSON.parse(row.plan_data) : row.plan_data,
        validation_data: typeof row.validation_data === 'string' ? JSON.parse(row.validation_data) : row.validation_data,
        created_at: row.created_at,
        updated_at: row.updated_at,
        protocol_title: row.protocol_title,
        protocol_status: row.protocol_status,
        protocol_deleted: row.source_protocol_id && !row.protocol_title
      }))
    });
  } catch (error) {
    console.error('[Engagement Plans] Error loading plans:', error);
    next(error);
  }
});

// Get a specific engagement plan by ID
router.get('/engagement-plans/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        ep.*,
        p.title as protocol_title,
        p.modules as protocol_modules,
        c.first_name, c.last_name
      FROM engagement_plans ep
      LEFT JOIN protocols p ON ep.source_protocol_id = p.id
      LEFT JOIN clients c ON ep.client_id = c.id
      WHERE ep.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement plan not found' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      engagement_plan: {
        id: row.id,
        client_id: row.client_id,
        client_name: `${row.first_name} ${row.last_name}`,
        source_protocol_id: row.source_protocol_id,
        protocol_title: row.protocol_title,
        title: row.title,
        status: row.status,
        plan_data: typeof row.plan_data === 'string' ? JSON.parse(row.plan_data) : row.plan_data,
        validation_data: typeof row.validation_data === 'string' ? JSON.parse(row.validation_data) : row.validation_data,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('[Engagement Plans] Error loading plan:', error);
    next(error);
  }
});

// Update engagement plan (independent of protocol)
router.put('/engagement-plans/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, status, plan_data } = req.body;

    const updateResult = await db.query(`
      UPDATE engagement_plans SET
        title = COALESCE($1, title),
        status = COALESCE($2, status),
        plan_data = COALESCE($3, plan_data),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [title, status, plan_data ? JSON.stringify(plan_data) : null, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement plan not found' });
    }

    console.log('[Engagement Plans] Updated plan:', id);

    res.json({
      success: true,
      engagement_plan: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[Engagement Plans] Error updating plan:', error);
    next(error);
  }
});

// Delete engagement plan
router.delete('/engagement-plans/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleteResult = await db.query(
      'DELETE FROM engagement_plans WHERE id = $1 RETURNING id',
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement plan not found' });
    }

    console.log('[Engagement Plans] Deleted plan:', id);

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    console.error('[Engagement Plans] Error deleting plan:', error);
    next(error);
  }
});

// Compare engagement plan alignment (for plans in engagement_plans table)
router.get('/engagement-plans/:id/compare-alignment', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('[Compare Alignment] Checking engagement plan:', id);

    // Get the engagement plan from the new table
    const epResult = await db.query(
      'SELECT * FROM engagement_plans WHERE id = $1',
      [id]
    );

    if (epResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement plan not found' });
    }

    const engagementPlanRow = epResult.rows[0];
    const engagementPlan = engagementPlanRow.plan_data;
    const sourceProtocolId = engagementPlanRow.source_protocol_id;

    // If there's a source protocol, get it for comparison
    let protocol = null;
    let protocolElements = { supplements: [], clinic_treatments: [], lifestyle_protocols: [], retest_schedule: [], safety_constraints: [] };

    console.log('[Compare Alignment] sourceProtocolId:', sourceProtocolId);

    if (sourceProtocolId) {
      const protocolResult = await db.query('SELECT * FROM protocols WHERE id = $1', [sourceProtocolId]);
      console.log('[Compare Alignment] Found source protocol:', protocolResult.rows.length > 0);

      if (protocolResult.rows.length > 0) {
        protocol = protocolResult.rows[0];
        console.log('[Compare Alignment] Protocol fields available:', {
          has_ai_recommendations: !!protocol.ai_recommendations,
          ai_rec_length: protocol.ai_recommendations ? String(protocol.ai_recommendations).length : 0,
          has_modules: !!protocol.modules,
          modules_length: protocol.modules ? String(protocol.modules).length : 0,
          has_content: !!protocol.content
        });

        // Extract protocol data - PRIORITY: ai_recommendations (where AI protocols are stored)
        let protocolData = null;

        // First try ai_recommendations (where AI-generated protocols are stored)
        if (protocol.ai_recommendations) {
          try {
            const aiRec = typeof protocol.ai_recommendations === 'string'
              ? JSON.parse(protocol.ai_recommendations)
              : protocol.ai_recommendations;

            console.log('[Compare Alignment] ai_recommendations keys:', Object.keys(aiRec || {}));

            // Check if it has protocol structure (not just an engagement plan)
            if (aiRec.core_protocol || aiRec.phased_expansion || aiRec.clinic_treatments || aiRec.retest_schedule) {
              protocolData = aiRec;
              console.log('[Compare Alignment] Using ai_recommendations for protocol extraction');
            } else {
              console.log('[Compare Alignment] ai_recommendations does not have protocol structure');
            }
          } catch (e) {
            console.log('[Compare Alignment] Could not parse ai_recommendations:', e.message);
          }
        }

        // Fallback to modules
        if (!protocolData && protocol.modules) {
          try {
            protocolData = typeof protocol.modules === 'string'
              ? JSON.parse(protocol.modules)
              : protocol.modules;
            console.log('[Compare Alignment] modules parsed, keys:', Object.keys(protocolData || {}));
            if (protocolData && (Array.isArray(protocolData) ? protocolData.length > 0 : true)) {
              console.log('[Compare Alignment] Using modules for protocol extraction');
            } else {
              protocolData = null;
            }
          } catch (e) {
            console.log('[Compare Alignment] Could not parse modules:', e.message);
            protocolData = null;
          }
        }

        // Fallback to content
        if (!protocolData && protocol.content) {
          try {
            protocolData = JSON.parse(protocol.content);
            console.log('[Compare Alignment] Using content for protocol extraction');
          } catch (e) {
            protocolData = { content: protocol.content };
          }
        }

        if (!protocolData) {
          console.log('[Compare Alignment] WARNING: No protocol data found in any field!');
        }

        protocolElements = extractProtocolElements(protocolData || {});
        console.log('[Compare Alignment] Extracted elements:', {
          supplements: protocolElements.supplements.length,
          clinic_treatments: protocolElements.clinic_treatments.length,
          lifestyle_protocols: protocolElements.lifestyle_protocols.length,
          retest_schedule: protocolElements.retest_schedule.length
        });
      }
    } else {
      console.log('[Compare Alignment] No sourceProtocolId - engagement plan has no linked protocol');
    }

    // Validate alignment
    const alignmentResult = validateEngagementPlanAlignment(engagementPlan, protocolElements);

    // Find extra items (items in engagement plan but not in protocol)
    const extraItems = findExtraItems(engagementPlan, protocolElements);

    res.json({
      hasEngagementPlan: true,
      engagementSource: 'engagement_plans_table',
      protocolTitle: protocol ? protocol.title : engagementPlanRow.title || 'Engagement Plan',
      sourceProtocolId: sourceProtocolId,

      // Protocol elements (source of truth)
      protocolElements: {
        supplements: protocolElements.supplements.map(s => s.name),
        clinic_treatments: protocolElements.clinic_treatments.map(t => t.name),
        lifestyle_protocols: protocolElements.lifestyle_protocols.map(l => l.name),
        retest_schedule: protocolElements.retest_schedule.map(r => r.name),
        safety_constraints: protocolElements.safety_constraints.length
      },

      // Alignment validation
      alignment: {
        isAligned: sourceProtocolId ? (alignmentResult.isAligned && extraItems.length === 0) : true,
        overallCoverage: alignmentResult.overallCoverage,
        coveragePercentage: alignmentResult.coveragePercentage,

        // Items in protocol but missing from engagement plan
        missingFromEngagementPlan: {
          supplements: alignmentResult.missingSupplements,
          clinic_treatments: alignmentResult.missingClinicTreatments,
          lifestyle_protocols: alignmentResult.missingLifestyleProtocols,
          retest_schedule: alignmentResult.missingRetests
        },

        // Items in engagement plan but NOT in protocol
        extraInEngagementPlan: extraItems
      },

      // Summary
      summary: sourceProtocolId
        ? generateAlignmentSummary(alignmentResult, extraItems, protocol?.title || 'Protocol')
        : 'This engagement plan was created independently without a source protocol.'
    });

  } catch (error) {
    console.error('[Compare Alignment] Error:', error);
    next(error);
  }
});

// ========================================
// SINGLE PROTOCOL ROUTES (/:id patterns)
// ========================================

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

    // Build the AI prompt using Clinical Protocol Engine
    const aiPrompt = generateClinicalProtocolPrompt({
      clientData,
      labsContent,
      formsContent,
      notesContent,
      kbContext,
      userPrompt: prompt,
      selectedTemplates: selectedTemplateNames // Pass the selected templates to the AI
    });

    console.log('[Protocol Generate] Calling Claude API...');

    // Check if Anthropic is configured
    if (!anthropic) {
      console.error('[Protocol Generate] Error: Anthropic API not configured');
      return res.status(500).json({
        error: 'AI service not configured',
        message: 'The Anthropic API key is not set. Please configure ANTHROPIC_API_KEY environment variable.'
      });
    }

    // Call Claude API with increased max_tokens to prevent truncation
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,  // Increased from 4096 to prevent response truncation
      messages: [{
        role: 'user',
        content: aiPrompt
      }]
    });

    console.log('[Protocol Generate] Claude API response received');

    const aiResponse = response.content[0].text;
    console.log('[Protocol Generate] Raw AI response length:', aiResponse.length);
    console.log('[Protocol Generate] Raw AI response preview:', aiResponse.substring(0, 500));

    // Parse the JSON response
    let protocolData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Protocol Generate] JSON match found, length:', jsonMatch[0].length);
        protocolData = JSON.parse(jsonMatch[0]);
        console.log('[Protocol Generate] Successfully parsed JSON');
      } else {
        console.error('[Protocol Generate] No JSON found in response');
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Protocol Generate] Failed to parse response:', parseError.message);
      console.error('[Protocol Generate] Parse error details:', parseError);
      // Return a clinical fallback structure
      protocolData = generateClinicalFallbackProtocol(clientData, prompt, templates, selectedTemplateNames);
    }

    // =====================================================
    // TRANSFORM: Convert new clinical structure for storage
    // =====================================================
    // The new structure has core_protocol, phased_expansion, clinic_treatments
    // We need to transform it for both the legacy UI and the new clinical UI

    // Build modules array from new structure for backward compatibility
    let modulesForDb = [];

    // Log the structure we received from AI for debugging
    console.log('[Protocol Generate] AI Response Structure Keys:', Object.keys(protocolData));
    console.log('[Protocol Generate] Has core_protocol:', !!protocolData.core_protocol);
    console.log('[Protocol Generate] Has phased_expansion:', !!protocolData.phased_expansion);
    console.log('[Protocol Generate] Has modules:', !!protocolData.modules);
    console.log('[Protocol Generate] Has what_not_to_do_early:', !!protocolData.what_not_to_do_early);

    // Check if this is the new clinical structure
    if (protocolData.core_protocol) {
      console.log('[Protocol Generate] Detected new Clinical Protocol Engine structure');
      console.log('[Protocol Generate] core_protocol:', JSON.stringify(protocolData.core_protocol).substring(0, 300));

      // Convert core_protocol to a module - always add it even if items is empty
      const coreItems = protocolData.core_protocol.items || [];
      console.log('[Protocol Generate] core_protocol items count:', coreItems.length);

      modulesForDb.push({
        name: protocolData.core_protocol.phase_name || 'Core Protocol - Weeks 1-2',
        description: protocolData.summary || 'Minimum Viable Plan - Conservative start',
        goal: 'Establish tolerance, reduce risk, prevent overactivation',
        is_core_protocol: true,
        duration_weeks: protocolData.core_protocol.duration_weeks || 2,
        items: coreItems,
        safety_gates: protocolData.core_protocol.safety_gates || [],
        what_not_to_do: protocolData.core_protocol.what_not_to_do || []
      });

      // Convert phased_expansion to modules
      if (protocolData.phased_expansion && Array.isArray(protocolData.phased_expansion)) {
        protocolData.phased_expansion.forEach(phase => {
          modulesForDb.push({
            name: phase.phase_name || `Phase ${phase.phase_number}`,
            description: `Starts week ${phase.start_week}`,
            goal: phase.readiness_criteria?.join('; ') || 'Conditional expansion',
            phase_number: phase.phase_number,
            start_week: phase.start_week,
            duration_weeks: phase.duration_weeks,
            items: phase.items || [],
            safety_gates: phase.safety_gates || [],
            readiness_criteria: phase.readiness_criteria || [],
            clinician_decision_points: phase.clinician_decision_points || []
          });
        });
      }

      // Convert clinic_treatments to a module
      if (protocolData.clinic_treatments && protocolData.clinic_treatments.available_modalities) {
        modulesForDb.push({
          name: 'Clinic Treatments',
          description: protocolData.clinic_treatments.phase || 'Available after core protocol stability',
          goal: 'Advanced therapeutic support',
          is_clinic_treatments: true,
          readiness_criteria: protocolData.clinic_treatments.readiness_criteria || [],
          items: protocolData.clinic_treatments.available_modalities.map(m => ({
            name: m.name,
            description: m.indication,
            notes: m.notes,
            contraindications: m.contraindications,
            frequency: m.protocol
          })),
          note: protocolData.clinic_treatments.note
        });
      }
    } else if (protocolData.modules) {
      // Legacy structure - use as-is
      modulesForDb = protocolData.modules;
    }

    // Add "What Not To Do Early" as a module if present
    if (protocolData.what_not_to_do_early && protocolData.what_not_to_do_early.delayed_interventions?.length) {
      modulesForDb.push({
        name: protocolData.what_not_to_do_early.title || 'What NOT To Do Early (Weeks 1-4)',
        description: protocolData.what_not_to_do_early.description || 'Interventions intentionally delayed for safety',
        goal: 'Safety and proper sequencing',
        is_safety_section: true,
        items: protocolData.what_not_to_do_early.delayed_interventions.map(d => ({
          name: d.intervention,
          description: d.reason_for_delay,
          notes: `Risk if premature: ${d.risk_if_premature}. When appropriate: ${d.when_appropriate}`,
          is_delayed: true
        })),
        prohibited_items: protocolData.what_not_to_do_early.prohibited_in_core_protocol || []
      });
    }

    // Add Safety Summary as a module if present
    if (protocolData.safety_summary) {
      const safetyItems = [];
      if (protocolData.safety_summary.absolute_contraindications?.length) {
        safetyItems.push({
          name: 'Absolute Contraindications',
          description: protocolData.safety_summary.absolute_contraindications.join('; '),
          category: 'safety'
        });
      }
      if (protocolData.safety_summary.monitoring_requirements?.length) {
        safetyItems.push({
          name: 'Monitoring Requirements',
          description: protocolData.safety_summary.monitoring_requirements.join('; '),
          category: 'safety'
        });
      }
      if (protocolData.safety_summary.warning_signs?.length) {
        safetyItems.push({
          name: 'Warning Signs',
          description: protocolData.safety_summary.warning_signs.join('; '),
          category: 'safety'
        });
      }
      if (safetyItems.length > 0) {
        modulesForDb.push({
          name: 'Safety Summary',
          description: 'Important safety considerations for this protocol',
          goal: 'Patient safety and monitoring',
          is_safety_section: true,
          items: safetyItems
        });
      }
    }

    // Add Retest Schedule as a module if present
    if (protocolData.retest_schedule?.length) {
      modulesForDb.push({
        name: 'Retest Schedule',
        description: 'Recommended follow-up testing schedule',
        goal: 'Monitor progress and adjust protocol',
        is_retest_section: true,
        items: protocolData.retest_schedule.map(r => ({
          name: r.test,
          description: `Timing: ${r.timing}. Purpose: ${r.purpose}`,
          category: 'retest'
        }))
      });
    }

    // FALLBACK: If modulesForDb is still empty, create modules from the raw protocol data
    if (modulesForDb.length === 0) {
      console.log('[Protocol Generate] WARNING: No modules extracted, creating fallback structure');

      // Try to create at least a basic module from available data
      const fallbackModule = {
        name: protocolData.title || 'Protocol Overview',
        description: protocolData.summary || 'Generated protocol',
        goal: 'Clinical optimization based on assessment',
        items: []
      };

      // Try to extract items from integrated_findings
      if (protocolData.integrated_findings) {
        if (protocolData.integrated_findings.primary_concerns?.length) {
          fallbackModule.items.push({
            name: 'Primary Concerns',
            description: protocolData.integrated_findings.primary_concerns.join('; '),
            category: 'assessment'
          });
        }
        if (protocolData.integrated_findings.confirmed_conditions?.length) {
          fallbackModule.items.push({
            name: 'Confirmed Conditions',
            description: protocolData.integrated_findings.confirmed_conditions.join('; '),
            category: 'assessment'
          });
        }
      }

      // Add safety summary if present
      if (protocolData.safety_summary) {
        fallbackModule.items.push({
          name: 'Safety Summary',
          description: [
            protocolData.safety_summary.absolute_contraindications?.length ? `Contraindications: ${protocolData.safety_summary.absolute_contraindications.join(', ')}` : '',
            protocolData.safety_summary.monitoring_requirements?.length ? `Monitoring: ${protocolData.safety_summary.monitoring_requirements.join(', ')}` : ''
          ].filter(Boolean).join('. '),
          category: 'safety'
        });
      }

      // Add precautions
      if (protocolData.precautions?.length) {
        fallbackModule.items.push({
          name: 'Precautions',
          description: protocolData.precautions.join('; '),
          category: 'safety'
        });
      }

      modulesForDb.push(fallbackModule);
      console.log('[Protocol Generate] Created fallback module with', fallbackModule.items.length, 'items');
    }

    console.log('[Protocol Generate] Final modulesForDb count:', modulesForDb.length);

    // Calculate total duration
    let totalDurationWeeks = 8; // default
    if (protocolData.core_protocol?.duration_weeks) {
      totalDurationWeeks = protocolData.core_protocol.duration_weeks;
      if (protocolData.phased_expansion) {
        protocolData.phased_expansion.forEach(phase => {
          const phaseEnd = (phase.start_week || 0) + (phase.duration_weeks || 4);
          if (phaseEnd > totalDurationWeeks) {
            totalDurationWeeks = phaseEnd;
          }
        });
      }
    } else if (protocolData.duration_weeks) {
      totalDurationWeeks = protocolData.duration_weeks;
    }

    // Build comprehensive notes for storage
    const protocolNotes = buildProtocolNotes(protocolData, prompt);

    // Save the protocol to the database
    // Actual DB Schema: id, client_id, template_id, start_date, end_date, status, modules, notes, ai_recommendations, created_by, created_at, updated_at
    try {
      const insertResult = await db.query(
        `INSERT INTO protocols (
          client_id, template_id, start_date, end_date, status, modules, notes, ai_recommendations, created_by
        ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + interval '${totalDurationWeeks} weeks', 'draft', $3, $4, $5, $6)
        RETURNING *`,
        [
          client_id,
          primaryTemplateId,
          JSON.stringify(modulesForDb),
          protocolNotes,
          JSON.stringify(protocolData), // Store full clinical structure as JSON
          req.user.id
        ]
      );

      console.log('[Protocol Generate] Protocol saved to database');

      res.status(201).json({
        message: 'Protocol generated successfully',
        protocol: insertResult.rows[0],
        modules: modulesForDb, // Include the converted modules for immediate display
        ...protocolData
      });

    } catch (saveError) {
      console.error('[Protocol Generate] Error saving protocol:', saveError.message);
      // Return the generated data even if save fails
      res.json({
        message: 'Protocol generated (not saved - database error)',
        modules: modulesForDb, // Include modules even on save error
        ...protocolData,
        saveError: saveError.message
      });
    }

  } catch (error) {
    console.error('[Protocol Generate] Error:', error);
    console.error('[Protocol Generate] Error message:', error.message);
    console.error('[Protocol Generate] Error stack:', error.stack);

    // Determine specific error type for better user feedback
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;

    // Check for specific Anthropic API errors
    if (error.status === 401 || error.message?.includes('authentication') || error.message?.includes('API key')) {
      errorMessage = 'API authentication failed. Please check your Anthropic API key.';
      statusCode = 401;
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      errorMessage = 'API rate limit exceeded. Please try again in a few minutes.';
      statusCode = 429;
    } else if (error.status === 500 || error.status === 502 || error.status === 503) {
      errorMessage = 'AI service temporarily unavailable. Please try again.';
      statusCode = 503;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to AI service. Please check your network connection.';
      statusCode = 503;
    }

    // Return more specific error info
    res.status(statusCode).json({
      error: 'Protocol generation failed',
      message: errorMessage,
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
        model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
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

// Helper function to calculate age (kept for backward compatibility, also imported from clinical-protocol-engine.js)
function calculateAgeLocal(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Helper function to build protocol notes for database storage
function buildProtocolNotes(protocolData, prompt) {
  let notes = `Title: ${protocolData.title || 'Clinical Protocol'}\n\n`;
  notes += `Prompt: ${prompt}\n\n`;

  // Add integrated findings
  if (protocolData.integrated_findings) {
    notes += `=== INTEGRATED FINDINGS ===\n`;
    if (protocolData.integrated_findings.primary_concerns?.length) {
      notes += `Primary Concerns:\n${protocolData.integrated_findings.primary_concerns.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    if (protocolData.integrated_findings.confirmed_conditions?.length) {
      notes += `Confirmed Conditions:\n${protocolData.integrated_findings.confirmed_conditions.map(c => `- ${c}`).join('\n')}\n\n`;
    }
  }

  // Add safety summary
  if (protocolData.safety_summary) {
    notes += `=== SAFETY SUMMARY ===\n`;
    if (protocolData.safety_summary.absolute_contraindications?.length) {
      notes += `Absolute Contraindications:\n${protocolData.safety_summary.absolute_contraindications.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    if (protocolData.safety_summary.monitoring_requirements?.length) {
      notes += `Monitoring Requirements:\n${protocolData.safety_summary.monitoring_requirements.map(c => `- ${c}`).join('\n')}\n\n`;
    }
  }

  // Add precautions
  if (protocolData.precautions?.length) {
    notes += `Precautions: ${protocolData.precautions.join(', ')}\n\n`;
  }

  // Add follow-up
  if (protocolData.followUp) {
    notes += `Follow-up: ${protocolData.followUp}\n`;
  }

  return notes;
}

// Helper function to generate clinical fallback protocol
function generateClinicalFallbackProtocol(clientData, prompt, templates, selectedTemplateNames) {
  const promptLower = prompt.toLowerCase();

  return {
    title: `${selectedTemplateNames || 'Root-Cause Resolution'} Protocol for ${clientData.first_name}`,
    summary: `Clinical protocol addressing ${prompt}. This protocol follows a phased approach with safety gates and conditional progression.`,

    integrated_findings: {
      primary_concerns: ['Assessment pending - based on clinical presentation'],
      confirmed_conditions: [],
      risk_factors: ['Individual response monitoring required']
    },

    core_protocol: {
      phase_name: 'Core Protocol - Weeks 1-2 (Minimum Viable Plan)',
      duration_weeks: 2,
      max_actions: '3-5 actions maximum',
      items: [
        {
          name: 'Hydration Protocol',
          category: 'lifestyle',
          dosage: 'Half body weight in oz water daily',
          timing: 'Throughout day, more in morning',
          rationale: 'Foundation for all metabolic processes',
          contraindications: 'Adjust if kidney issues or fluid restrictions'
        },
        {
          name: 'Sleep Optimization',
          category: 'lifestyle',
          dosage: '7-9 hours nightly',
          timing: 'Consistent sleep/wake times within 30 min window',
          rationale: 'Critical for healing and hormone regulation',
          contraindications: 'Assess for sleep apnea if snoring/fatigue persists'
        },
        {
          name: 'Bowel Function Assessment',
          category: 'lifestyle',
          dosage: 'Track daily bowel movements',
          timing: 'Daily logging',
          rationale: 'Must establish regularity before detox protocols',
          contraindications: 'Seek help if <1 BM every 48 hours'
        }
      ],
      safety_gates: [
        'Do not progress to Phase 1 if bowel movements are less than daily',
        'Hold if sleep quality drops significantly (>50% reduction)',
        'Pause if new symptoms emerge'
      ],
      what_not_to_do: [
        'No cold exposure (cold plunge, ice baths)',
        'No high-dose supplements',
        'No fasting protocols',
        'No intensive exercise',
        'No multiple binders simultaneously'
      ]
    },

    phased_expansion: [
      {
        phase_name: 'Phase 1: Foundation Building',
        phase_number: 1,
        start_week: 3,
        duration_weeks: 4,
        readiness_criteria: [
          'Daily bowel movements established',
          'Sleep quality stable or improving',
          'No adverse reactions during core protocol'
        ],
        items: [
          {
            name: 'Magnesium Glycinate',
            category: 'supplement',
            dosage: '300-400mg',
            timing: 'Evening, 1 hour before bed',
            rationale: 'Supports relaxation, bowel function, and cellular energy',
            contraindications: 'Start low if loose stools present'
          }
        ],
        safety_gates: ['Reduce dose if loose stools develop'],
        clinician_decision_points: ['Assess need for additional support based on response']
      }
    ],

    clinic_treatments: {
      phase: 'Available after core protocol stability confirmed',
      readiness_criteria: [
        'Bowel function regular (daily, well-formed)',
        'Sleep quality improved or stable',
        'No active detox reactions'
      ],
      available_modalities: [
        {
          name: 'Infrared Sauna',
          indication: 'Detox support, relaxation',
          contraindications: 'Active constipation, dehydration, pregnancy',
          protocol: '20-30 min, 2x/week initially',
          notes: 'Start conservative, ensure hydration before/after'
        },
        {
          name: 'Red Light Therapy',
          indication: 'Cellular energy, tissue healing',
          contraindications: 'Active cancer (consult oncologist)',
          protocol: '15-20 min, 3x/week',
          notes: 'Low risk, can start early if desired'
        }
      ],
      note: 'Cold plunge/cryotherapy NOT recommended during initial phases'
    },

    safety_summary: {
      absolute_contraindications: ['Active infection without treatment', 'Unstable medical conditions'],
      relative_contraindications: ['Recent surgery', 'Pregnancy (consult OB)'],
      monitoring_requirements: ['Track symptoms daily', 'Note any new reactions'],
      emergency_criteria: ['Severe reaction', 'Breathing difficulty', 'Chest pain']
    },

    precautions: [
      'Start slow - one change at a time',
      'Monitor for any adverse reactions',
      'Consult healthcare provider before starting'
    ],
    followUp: 'Review at 2 weeks to assess core protocol response before progression'
  };
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

    // ========================================
    // PROTOCOL ALIGNMENT - Extract all elements from the protocol
    // ========================================
    console.log('[Engagement Plan] Extracting protocol elements for alignment...');

    // Try to get structured protocol data from ai_recommendations or modules
    let protocolData = null;
    try {
      if (protocol.ai_recommendations) {
        // Check if it's already an engagement plan (has "phases" key) - if so, use modules instead
        const parsed = typeof protocol.ai_recommendations === 'string'
          ? JSON.parse(protocol.ai_recommendations)
          : protocol.ai_recommendations;

        if (parsed.core_protocol || parsed.phased_expansion || parsed.clinic_treatments) {
          protocolData = parsed;
          console.log('[Engagement Plan] Using structured protocol from ai_recommendations');
        }
      }

      // Fallback to modules if ai_recommendations doesn't have protocol structure
      if (!protocolData && modules.length > 0) {
        protocolData = { modules };
        console.log('[Engagement Plan] Using modules array for protocol extraction');
      }
    } catch (e) {
      console.error('[Engagement Plan] Error parsing protocol data:', e.message);
    }

    // Extract all protocol elements
    let protocolElements = {
      supplements: [],
      clinic_treatments: [],
      lifestyle_protocols: [],
      retest_schedule: [],
      safety_constraints: []
    };

    if (protocolData) {
      protocolElements = extractProtocolElements(protocolData);
      console.log('[Engagement Plan] Extracted elements:', {
        supplements: protocolElements.supplements.length,
        clinic_treatments: protocolElements.clinic_treatments.length,
        lifestyle_protocols: protocolElements.lifestyle_protocols.length,
        retest_schedule: protocolElements.retest_schedule.length,
        safety_constraints: protocolElements.safety_constraints.length
      });
    } else {
      console.log('[Engagement Plan] No protocol data found - will generate generic engagement plan');
    }

    // Query KB for engagement strategies ONLY (not hardcoded modalities)
    console.log('[Engagement Plan] Querying KB for engagement strategies...');
    let kbEngagementContext = '';
    try {
      const engagementQueries = [
        'patient engagement strategies functional medicine',
        'phased protocol delivery best practices',
        'behavior change techniques wellness coaching',
        `engagement strategies for ${protocol.template_category || 'wellness'} protocols`
        // REMOVED: Hardcoded clinic modality queries - these caused misalignment
      ];

      const kbResults = await Promise.all(
        engagementQueries.map(q => queryKnowledgeBase(q, `Protocol: ${protocol.template_name}, Client notes: ${protocol.lifestyle_notes || 'general wellness'}`))
      );
      kbEngagementContext = kbResults.filter(r => r).join('\n\n');
      if (kbEngagementContext) {
        console.log('[Engagement Plan] KB engagement context retrieved');
      }
    } catch (kbError) {
      console.error('[Engagement Plan] KB query error:', kbError.message);
    }

    // Build the AI prompt for engagement plan using ALIGNED prompt generator
    // This ensures the engagement plan ONLY includes items from the actual protocol
    const protocolDurationWeeks = protocol.end_date
      ? Math.ceil((new Date(protocol.end_date) - new Date(protocol.start_date)) / (1000 * 60 * 60 * 24 * 7))
      : 8;

    let aiPrompt;

    // Use aligned prompt if we have protocol elements, otherwise use generic prompt
    if (protocolElements.supplements.length > 0 || protocolElements.clinic_treatments.length > 0) {
      console.log('[Engagement Plan] Using ALIGNED prompt generator (protocol-driven)');
      aiPrompt = generateAlignedEngagementPlanPrompt({
        clientName,
        protocolTitle: protocol.template_name || protocol.title || 'Custom Protocol',
        protocolElements,
        personalityType: personality_type,
        communicationPreferences: communication_preferences,
        protocolDurationWeeks
      });

      // Add KB context if available
      if (kbEngagementContext) {
        aiPrompt += `\n\n## ADDITIONAL ENGAGEMENT STRATEGIES FROM KNOWLEDGE BASE\n${kbEngagementContext}\n\nUse these strategies to enhance delivery, but DO NOT add treatments not listed in the protocol above.`;
      }
    } else {
      // Fallback to generic prompt when no protocol structure is available
      console.log('[Engagement Plan] Using generic prompt (no protocol structure found)');
      aiPrompt = `You are an expert health coach. Create a 4-phase engagement plan for ${clientName}.

Protocol: ${protocol.template_name || 'Custom Protocol'}
Category: ${protocol.template_category || 'General Wellness'}
Duration: ${protocolDurationWeeks} weeks

Modules:
${modules.map((m, i) => `${i + 1}. ${m.name}: ${m.items?.length || 0} items`).join('\n')}

${kbEngagementContext ? `Knowledge Base Context:\n${kbEngagementContext}\n` : ''}

Create a phased engagement plan with JSON structure:
{
  "title": "Engagement Plan for ${clientName}",
  "summary": "2-3 sentence overview",
  "total_weeks": 4,
  "phases": [
    {
      "phase_number": 1,
      "title": "Phase 1: Foundations (Week 1)",
      "subtitle": "Brief description",
      "items": ["Action item 1", "Action item 2"],
      "progress_goal": "Measurable goal",
      "check_in_prompts": ["Question for patient"]
    }
  ],
  "communication_schedule": {
    "check_in_frequency": "Every 3 days",
    "preferred_channel": "WhatsApp",
    "message_tone": "Encouraging"
  },
  "success_metrics": ["Metric 1", "Metric 2"]
}

IMPORTANT: Only include treatments/supplements that are in the protocol modules above.
Do NOT add treatments like HBOT, red light, cold plunge, etc. unless they are explicitly in the protocol.

Return ONLY valid JSON.`;
    }

    console.log('[Engagement Plan] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

    // ========================================
    // VALIDATION & REGENERATION LOOP - Ensure engagement plan covers all protocol items
    // ========================================
    const hasProtocolElements = (protocolElements?.supplements?.length > 0) || (protocolElements?.clinic_treatments?.length > 0);

    if (hasProtocolElements) {
      console.log('[Engagement Plan] Validating alignment with protocol...');

      let validationResult = validateEngagementPlanAlignment(engagementPlan, protocolElements);
      let regenerationAttempts = 0;
      const maxRegenerationAttempts = 2;

      console.log('[Engagement Plan] Initial validation result:', {
        isAligned: validationResult?.isAligned,
        overallCoverage: (validationResult?.overallCoverage || 0) + '%',
        missingSupplements: validationResult?.missingSupplements?.length || 0,
        missingClinicTreatments: validationResult?.missingClinicTreatments?.length || 0,
        missingLifestyleProtocols: validationResult?.missingLifestyleProtocols?.length || 0,
        missingRetests: validationResult?.missingRetests?.length || 0
      });

      // Regeneration loop - try to get AI to fix missing items
      while (!validationResult?.isAligned && regenerationAttempts < maxRegenerationAttempts) {
        regenerationAttempts++;
        console.log(`[Engagement Plan] Alignment failed. Regeneration attempt ${regenerationAttempts}/${maxRegenerationAttempts}...`);

        // Generate regeneration prompt with specific missing items
        const regenPrompt = generateRegenerationPrompt(engagementPlan, validationResult, protocolElements);

        try {
          const regenResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
              { role: 'user', content: aiPrompt },
              { role: 'assistant', content: JSON.stringify(engagementPlan) },
              { role: 'user', content: regenPrompt }
            ]
          });

          const regenText = regenResponse.content[0].text;
          const regenJsonMatch = regenText.match(/\{[\s\S]*\}/);
          if (regenJsonMatch) {
            engagementPlan = JSON.parse(regenJsonMatch[0]);
            console.log('[Engagement Plan] Regeneration response parsed successfully');

            // Re-validate
            validationResult = validateEngagementPlanAlignment(engagementPlan, protocolElements);
            console.log(`[Engagement Plan] Post-regeneration validation:`, {
              isAligned: validationResult?.isAligned,
              overallCoverage: (validationResult?.overallCoverage || 0) + '%'
            });
          }
        } catch (regenError) {
          console.error('[Engagement Plan] Regeneration failed:', regenError.message);
          break;
        }
      }

      // Final fallback: Auto-fix if still not fully aligned after regeneration attempts
      if (!validationResult?.isAligned) {
        console.log('[Engagement Plan] Regeneration did not achieve full coverage. Applying auto-fix...');
        engagementPlan = autoFixEngagementPlan(engagementPlan, validationResult, protocolElements);
        console.log('[Engagement Plan] Auto-fix complete. Added missing items.');

        // Add validation metadata to the plan
        engagementPlan._validation = {
          originalCoverage: validationResult?.overallCoverage || 0,
          regenerationAttempts: regenerationAttempts,
          autoFixed: true,
          fixedAt: new Date().toISOString(),
          itemsAdded: {
            supplements: validationResult?.missingSupplements || [],
            clinic_treatments: validationResult?.missingClinicTreatments || [],
            lifestyle_protocols: validationResult?.missingLifestyleProtocols || [],
            retests: validationResult?.missingRetests || []
          }
        };
      } else {
        engagementPlan._validation = {
          originalCoverage: validationResult?.overallCoverage || 100,
          regenerationAttempts: regenerationAttempts,
          autoFixed: false,
          validatedAt: new Date().toISOString()
        };
        console.log(`[Engagement Plan] Validation passed - ${validationResult?.overallCoverage || 100}% protocol coverage${regenerationAttempts > 0 ? ` (after ${regenerationAttempts} regeneration(s))` : ''}`);
      }
    }

    // Save engagement plan to separate engagement_plans table
    // This ensures engagement plans persist even if the protocol is deleted
    const planTitle = engagementPlan.title || `Engagement Plan for ${clientName}`;
    const validationData = engagementPlan._validation || {};

    // Remove internal validation metadata from plan_data before saving
    const planDataToSave = { ...engagementPlan };
    delete planDataToSave._validation;
    delete planDataToSave._alignment_note;

    console.log('[Engagement Plan] Saving to engagement_plans table...');

    // Check if an engagement plan already exists for this protocol
    const existingPlan = await db.query(
      'SELECT id FROM engagement_plans WHERE source_protocol_id = $1',
      [id]
    );

    let engagementPlanId;
    if (existingPlan.rows.length > 0) {
      // Update existing plan
      const updateResult = await db.query(
        `UPDATE engagement_plans SET
          title = $1,
          plan_data = $2,
          validation_data = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE source_protocol_id = $4
        RETURNING id`,
        [planTitle, JSON.stringify(planDataToSave), JSON.stringify(validationData), id]
      );
      engagementPlanId = updateResult.rows[0].id;
      console.log('[Engagement Plan] Updated existing plan id:', engagementPlanId);
    } else {
      // Insert new plan
      const insertResult = await db.query(
        `INSERT INTO engagement_plans (client_id, source_protocol_id, title, plan_data, validation_data, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [protocol.client_id, id, planTitle, JSON.stringify(planDataToSave), JSON.stringify(validationData), req.user?.id]
      );
      engagementPlanId = insertResult.rows[0].id;
      console.log('[Engagement Plan] Created new plan id:', engagementPlanId);
    }

    // Also update protocol's ai_recommendations for backward compatibility
    // (This can be removed later once all code uses engagement_plans table)
    await db.query(
      `UPDATE protocols SET
        ai_recommendations = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [JSON.stringify(engagementPlan), id]
    );

    console.log('[Engagement Plan] Generated and saved successfully');

    res.json({
      success: true,
      engagement_plan: engagementPlan,
      engagement_plan_id: engagementPlanId,
      protocol_id: id,
      client_name: clientName
    });

  } catch (error) {
    console.error('[Engagement Plan] Error:', error);
    next(error);
  }
});

// Debug endpoint to check ai_recommendations data (includes ALL statuses)
router.get('/debug/check-engagement/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const result = await db.query(`
      SELECT id, client_id, status,
             LENGTH(ai_recommendations) as ai_rec_length,
             SUBSTRING(ai_recommendations, 1, 200) as ai_rec_preview,
             created_at
      FROM protocols
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [clientId]);

    console.log('[Debug] Found', result.rows.length, 'protocols for client', clientId);
    result.rows.forEach(r => console.log('[Debug] Protocol', r.id, 'status:', r.status, 'ai_rec_length:', r.ai_rec_length));

    res.json({
      client_id: clientId,
      protocols: result.rows
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
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

// Compare protocol and engagement plan alignment
// Returns detailed report of what's in protocol vs engagement plan
router.get('/:id/compare-alignment', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('[Compare Alignment] Checking protocol:', id);

    // Get the protocol
    const protocolResult = await db.query('SELECT * FROM protocols WHERE id = $1', [id]);
    if (protocolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    const protocol = protocolResult.rows[0];

    // Get engagement plan - first try new table, then legacy
    let engagementPlan = null;
    let engagementSource = 'none';

    // Try new engagement_plans table
    const epResult = await db.query(
      'SELECT * FROM engagement_plans WHERE source_protocol_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    if (epResult.rows.length > 0) {
      engagementPlan = epResult.rows[0].plan_data;
      engagementSource = 'engagement_plans_table';
    } else if (protocol.ai_recommendations) {
      // Fallback to legacy storage
      try {
        engagementPlan = typeof protocol.ai_recommendations === 'string'
          ? JSON.parse(protocol.ai_recommendations)
          : protocol.ai_recommendations;
        engagementSource = 'protocol_ai_recommendations';
      } catch (e) {
        console.log('[Compare Alignment] Could not parse ai_recommendations');
      }
    }

    if (!engagementPlan) {
      return res.json({
        hasEngagementPlan: false,
        message: 'No engagement plan found for this protocol'
      });
    }

    // Extract protocol elements - PRIORITY: ai_recommendations (where AI protocols are stored)
    let protocolData = null;

    // First try ai_recommendations (where AI-generated protocols are stored)
    if (protocol.ai_recommendations) {
      try {
        const aiRec = typeof protocol.ai_recommendations === 'string'
          ? JSON.parse(protocol.ai_recommendations)
          : protocol.ai_recommendations;

        // Check if it has protocol structure (not just an engagement plan)
        if (aiRec.core_protocol || aiRec.phased_expansion || aiRec.clinic_treatments || aiRec.retest_schedule) {
          protocolData = aiRec;
          console.log('[Compare Alignment Legacy] Using ai_recommendations for protocol extraction');
        }
      } catch (e) {
        console.log('[Compare Alignment Legacy] Could not parse ai_recommendations:', e.message);
      }
    }

    // Fallback to modules
    if (!protocolData && protocol.modules) {
      try {
        protocolData = typeof protocol.modules === 'string'
          ? JSON.parse(protocol.modules)
          : protocol.modules;
        if (protocolData && (Array.isArray(protocolData) ? protocolData.length > 0 : true)) {
          console.log('[Compare Alignment Legacy] Using modules for protocol extraction');
        } else {
          protocolData = null;
        }
      } catch (e) {
        protocolData = null;
      }
    }

    // Fallback to content
    if (!protocolData && protocol.content) {
      try {
        protocolData = JSON.parse(protocol.content);
        console.log('[Compare Alignment Legacy] Using content for protocol extraction');
      } catch (e) {
        protocolData = { content: protocol.content };
      }
    }

    // Extract elements from protocol
    const protocolElements = extractProtocolElements(protocolData || {});
    console.log('[Compare Alignment Legacy] Extracted elements:', {
      supplements: protocolElements.supplements.length,
      clinic_treatments: protocolElements.clinic_treatments.length,
      lifestyle_protocols: protocolElements.lifestyle_protocols.length,
      retest_schedule: protocolElements.retest_schedule.length
    });

    // Validate alignment
    const alignmentResult = validateEngagementPlanAlignment(engagementPlan, protocolElements);

    // Find items in engagement plan that are NOT in protocol (extra/invented items)
    const extraItems = findExtraItems(engagementPlan, protocolElements);

    res.json({
      hasEngagementPlan: true,
      engagementSource,
      protocolTitle: protocol.title,

      // Protocol elements (source of truth)
      protocolElements: {
        supplements: protocolElements.supplements.map(s => s.name),
        clinic_treatments: protocolElements.clinic_treatments.map(t => t.name),
        lifestyle_protocols: protocolElements.lifestyle_protocols.map(l => l.name),
        retest_schedule: protocolElements.retest_schedule.map(r => r.name),
        safety_constraints: protocolElements.safety_constraints.length
      },

      // Alignment validation
      alignment: {
        isAligned: alignmentResult.isAligned && extraItems.length === 0,
        overallCoverage: alignmentResult.overallCoverage,
        coveragePercentage: alignmentResult.coveragePercentage,

        // Items in protocol but missing from engagement plan
        missingFromEngagementPlan: {
          supplements: alignmentResult.missingSupplements,
          clinic_treatments: alignmentResult.missingClinicTreatments,
          lifestyle_protocols: alignmentResult.missingLifestyleProtocols,
          retest_schedule: alignmentResult.missingRetests
        },

        // Items in engagement plan but NOT in protocol (hallucinated/invented)
        extraInEngagementPlan: extraItems
      },

      // Summary
      summary: generateAlignmentSummary(alignmentResult, extraItems, protocol.title)
    });

  } catch (error) {
    console.error('[Compare Alignment] Error:', error);
    next(error);
  }
});

// Helper: Find items in engagement plan that are NOT in protocol
function findExtraItems(engagementPlan, protocolElements) {
  const extraItems = [];
  const planText = JSON.stringify(engagementPlan).toLowerCase();

  // Known treatment names that might be hallucinated
  const knownTreatments = [
    'hbot', 'hyperbaric',
    'nad+', 'nad iv', 'nad infusion',
    'red light', 'red light therapy',
    'infrared sauna', 'ir sauna',
    'cold plunge', 'cold therapy', 'cryotherapy',
    'pemf', 'pulsed electromagnetic',
    'float tank', 'sensory deprivation',
    'iv vitamin c', 'high dose vitamin c',
    'stem cell', 'prp', 'platelet rich plasma',
    'eboo'  // unless explicitly in protocol
  ];

  // Build list of protocol items for comparison
  const protocolItemNames = [
    ...protocolElements.supplements.map(s => s.name.toLowerCase()),
    ...protocolElements.clinic_treatments.map(t => t.name.toLowerCase()),
    ...protocolElements.lifestyle_protocols.map(l => l.name.toLowerCase())
  ];

  // Check for known treatments that might be hallucinated
  knownTreatments.forEach(treatment => {
    if (planText.includes(treatment)) {
      // Check if it's actually in the protocol
      const inProtocol = protocolItemNames.some(name =>
        name.includes(treatment) || treatment.includes(name.split(' ')[0])
      );
      if (!inProtocol) {
        extraItems.push({
          name: treatment.toUpperCase(),
          type: 'potentially_hallucinated',
          reason: 'Found in engagement plan but not in protocol'
        });
      }
    }
  });

  return extraItems;
}

// Helper: Generate human-readable alignment summary
function generateAlignmentSummary(alignmentResult, extraItems, protocolTitle) {
  const issues = [];

  if (alignmentResult.missingSupplements.length > 0) {
    issues.push(`Missing ${alignmentResult.missingSupplements.length} supplement(s) from protocol: ${alignmentResult.missingSupplements.join(', ')}`);
  }
  if (alignmentResult.missingClinicTreatments.length > 0) {
    issues.push(`Missing ${alignmentResult.missingClinicTreatments.length} clinic treatment(s) from protocol: ${alignmentResult.missingClinicTreatments.join(', ')}`);
  }
  if (alignmentResult.missingLifestyleProtocols.length > 0) {
    issues.push(`Missing ${alignmentResult.missingLifestyleProtocols.length} lifestyle protocol(s) from protocol: ${alignmentResult.missingLifestyleProtocols.join(', ')}`);
  }
  if (alignmentResult.missingRetests.length > 0) {
    issues.push(`Missing ${alignmentResult.missingRetests.length} retest item(s) from protocol: ${alignmentResult.missingRetests.join(', ')}`);
  }
  if (extraItems.length > 0) {
    issues.push(`Found ${extraItems.length} item(s) in engagement plan that are NOT in the protocol: ${extraItems.map(e => e.name).join(', ')}`);
  }

  if (issues.length === 0) {
    return `✅ The engagement plan is fully aligned with "${protocolTitle}". All protocol items are included and no extra items were added.`;
  }

  return `⚠️ Alignment issues found:\n${issues.map(i => `• ${i}`).join('\n')}\n\nRecommendation: Regenerate the engagement plan to fix alignment issues.`;
}

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
        model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
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

    console.log('[Update Engagement Plan] Protocol ID:', id, 'Plan:', engagement_plan === null ? 'CLEARING' : 'UPDATING');

    // Get the current protocol
    const protocolResult = await db.query(
      'SELECT * FROM protocols WHERE id = $1',
      [id]
    );

    if (protocolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    // Handle clearing the engagement plan (when engagement_plan is null)
    let planJson;
    if (engagement_plan === null || engagement_plan === undefined) {
      planJson = null;  // Clear the engagement plan
      console.log('[Update Engagement Plan] Clearing ai_recommendations');
    } else {
      planJson = typeof engagement_plan === 'string'
        ? engagement_plan
        : JSON.stringify(engagement_plan);
    }

    await db.query(
      'UPDATE protocols SET ai_recommendations = $1, updated_at = NOW() WHERE id = $2',
      [planJson, id]
    );

    console.log('[Update Engagement Plan] Updated successfully');

    res.json({
      success: true,
      message: engagement_plan === null ? 'Engagement plan cleared successfully' : 'Engagement plan updated successfully'
    });

  } catch (error) {
    console.error('[Update Engagement Plan] Error:', error);
    next(error);
  }
});

// ============================================
// GENERATE AI SUMMARY FOR PROTOCOL
// Creates a concise overview of the entire protocol
// ============================================
router.post('/:id/generate-summary', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[Generate Protocol Summary] Generating summary for protocol ${id}`);

    // Get the protocol
    const result = await db.pool.query('SELECT * FROM protocols WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    const protocol = result.rows[0];
    const protocolContent = protocol.content || '';
    const protocolModules = protocol.modules || [];

    if (!protocolContent && (!protocolModules || protocolModules.length === 0)) {
      return res.status(400).json({ error: 'Protocol has no content to summarize' });
    }

    // Build content for summarization
    let contentToSummarize = '';

    if (protocolContent) {
      contentToSummarize = protocolContent;
    }

    // Also include module data if available
    if (protocolModules && Array.isArray(protocolModules) && protocolModules.length > 0) {
      contentToSummarize += '\n\nProtocol Modules:\n';
      protocolModules.forEach((module, idx) => {
        contentToSummarize += `\n## ${module.name || `Module ${idx + 1}`}\n`;
        if (module.goal) contentToSummarize += `Goal: ${module.goal}\n`;
        if (module.rationale) contentToSummarize += `Rationale: ${module.rationale}\n`;
        if (module.items && Array.isArray(module.items)) {
          module.items.forEach(item => {
            contentToSummarize += `- ${item.name}`;
            if (item.dosage) contentToSummarize += ` (${item.dosage})`;
            if (item.timing) contentToSummarize += ` - ${item.timing}`;
            contentToSummarize += '\n';
          });
        }
      });
    }

    // Generate summary using Claude
    const prompt = `You are a clinical protocol summarizer. Analyze the following health/wellness protocol and create a concise, easy-to-understand summary.

Protocol Title: ${protocol.title || 'Health Protocol'}

Protocol Content:
${contentToSummarize}

Create a summary that includes:
1. **Main Focus**: What is this protocol primarily addressing? (1-2 sentences)
2. **Key Interventions**: List the main supplements, lifestyle changes, or treatments (3-5 bullet points)
3. **Expected Timeline**: How long is this protocol designed to run?
4. **Key Goals**: What are the primary health outcomes this protocol aims to achieve?

Keep the summary concise (150-250 words), professional, and easy for both practitioners and clients to understand. Use clear, non-technical language where possible.`;

    let summary = '';

    // Try Claude first, fall back to Gemini
    if (anthropic) {
      console.log('[Generate Protocol Summary] Using Claude/Anthropic');
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      summary = response.content[0].text;
    } else if (genAI) {
      console.log('[Generate Protocol Summary] Using Gemini (Claude not configured)');
      try {
        const result = await genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt
        });
        summary = result.text || '';
        console.log('[Generate Protocol Summary] Gemini response received, summary length:', summary.length);
      } catch (geminiError) {
        console.error('[Generate Protocol Summary] Gemini error:', geminiError.message);
        throw geminiError;
      }
    } else {
      return res.status(500).json({ error: 'AI service not configured. Please set ANTHROPIC_API_KEY or GEMINI_API_KEY environment variable.' });
    }

    if (!summary) {
      throw new Error('AI returned empty summary');
    }

    // Save the summary to the protocol
    await db.pool.query(
      'UPDATE protocols SET ai_summary = $1, updated_at = NOW() WHERE id = $2',
      [summary, id]
    );

    console.log('[Generate Protocol Summary] Summary generated and saved successfully');

    res.json({
      success: true,
      summary: summary
    });

  } catch (error) {
    console.error('[Generate Protocol Summary] Error:', error);
    res.status(500).json({ error: 'Failed to generate protocol summary', details: error.message });
  }
});

module.exports = router;
