/**
 * AI Chat API Routes
 * Handles AI-powered chat assistant with context awareness
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// Initialize Claude SDK (Anthropic)
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Initialize Gemini SDK (using new File Search API)
const { GoogleGenAI } = require('@google/genai');
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Chat endpoint with context
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      message,
      context = {},
      conversationHistory = []
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build context string from provided context
    let contextString = '';

    // If client context is provided
    if (context.client_id) {
      const clientData = await getClientContext(context.client_id);
      contextString += `\n\nCLIENT CONTEXT:\n${clientData}`;
    }

    // If protocol context is provided
    if (context.protocol_id) {
      const protocolData = await getProtocolContext(context.protocol_id);
      contextString += `\n\nPROTOCOL CONTEXT:\n${protocolData}`;
    }

    // If lab context is provided
    if (context.lab_id) {
      const labData = await getLabContext(context.lab_id);
      contextString += `\n\nLAB CONTEXT:\n${labData}`;
    }

    // Query Gemini Knowledge Base if available (using File Search API)
    let kbContext = '';
    if (process.env.GEMINI_FILE_SEARCH_STORE_ID) {
      try {
        kbContext = await queryKnowledgeBase(message);
        if (kbContext) {
          contextString += `\n\nKNOWLEDGE BASE:\n${kbContext}`;
        }
      } catch (kbError) {
        console.error('Knowledge base query error:', kbError);
      }
    }

    // Build conversation messages for Claude
    const messages = [];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current message with context
    const userMessage = contextString
      ? `${message}\n\n---\nContext for this question:${contextString}`
      : message;

    messages.push({
      role: 'user',
      content: userMessage
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: getSystemPrompt(),
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Return response with citations if KB was used
    res.json({
      message: assistantMessage,
      hasKBContext: !!kbContext,
      context: {
        client: !!context.client_id,
        protocol: !!context.protocol_id,
        lab: !!context.lab_id,
        knowledgeBase: !!kbContext
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    next(error);
  }
});

// Get suggested queries based on context
router.post('/suggestions', authenticateToken, async (req, res, next) => {
  try {
    const { context = {} } = req.body;

    const suggestions = [];

    if (context.page === 'client-profile' && context.client_id) {
      suggestions.push(
        'What protocol would you recommend for this client?',
        'How should I interpret their latest lab results?',
        'What supplements might help with their health conditions?',
        'Are there any contraindications with their current medications?'
      );
    } else if (context.page === 'protocols') {
      suggestions.push(
        'What are best practices for hormone balance protocols?',
        'How do I customize a protocol for a specific client?',
        'What are common pitfalls in gut healing protocols?',
        'When should I adjust protocol duration?'
      );
    } else if (context.page === 'labs') {
      suggestions.push(
        'How do I interpret thyroid panel results?',
        'What are optimal ranges for vitamin D?',
        'How often should labs be repeated?',
        'What labs are essential for hormone health?'
      );
    } else if (context.page === 'protocol-templates') {
      suggestions.push(
        'What modules should I include in a detox protocol?',
        'How long should a typical gut healing protocol last?',
        'What are key components of an adrenal support protocol?',
        'How do I structure a weight management protocol?'
      );
    } else {
      // General suggestions
      suggestions.push(
        'What are the latest best practices in functional medicine?',
        'How do I create an effective treatment protocol?',
        'What labs should I order for new clients?',
        'How do I track client progress effectively?'
      );
    }

    res.json({ suggestions });

  } catch (error) {
    console.error('Suggestions error:', error);
    next(error);
  }
});

// Get client context with comprehensive data
async function getClientContext(clientId) {
  // Get basic client info
  const clientResult = await db.query(
    `SELECT
      id, first_name, last_name, email, phone, date_of_birth, gender,
      medical_history, current_medications, allergies, status
    FROM clients WHERE id = $1`,
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    return 'Client not found';
  }

  const client = clientResult.rows[0];
  let context = `
CLIENT PROFILE:
- Name: ${client.first_name} ${client.last_name}
- Age: ${client.date_of_birth ? calculateAge(client.date_of_birth) : 'Unknown'}
- Gender: ${client.gender || 'Not specified'}
- Medical History: ${client.medical_history || 'None reported'}
- Current Medications: ${client.current_medications || 'None listed'}
- Allergies: ${client.allergies || 'None listed'}
`;

  // Get recent notes
  try {
    const notesResult = await db.query(
      `SELECT content, note_type, is_consultation, created_at
       FROM notes WHERE client_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [clientId]
    );
    if (notesResult.rows.length > 0) {
      context += '\nRECENT NOTES:\n';
      notesResult.rows.forEach(note => {
        const noteType = note.is_consultation ? 'Consultation' : (note.note_type || 'Note');
        const date = new Date(note.created_at).toLocaleDateString();
        context += `[${noteType} - ${date}]: ${note.content.substring(0, 300)}${note.content.length > 300 ? '...' : ''}\n`;
      });
    }
  } catch (e) {
    console.error('Error fetching notes:', e.message);
  }

  // Get recent lab results
  try {
    const labsResult = await db.query(
      `SELECT title, lab_type, test_date, ai_summary
       FROM labs WHERE client_id = $1
       ORDER BY test_date DESC LIMIT 3`,
      [clientId]
    );
    if (labsResult.rows.length > 0) {
      context += '\nRECENT LAB RESULTS:\n';
      labsResult.rows.forEach(lab => {
        const date = lab.test_date ? new Date(lab.test_date).toLocaleDateString() : 'Date unknown';
        context += `[${lab.title} - ${date}]: ${lab.ai_summary ? lab.ai_summary.substring(0, 200) + '...' : 'No summary available'}\n`;
      });
    }
  } catch (e) {
    console.error('Error fetching labs:', e.message);
  }

  // Get active protocols
  try {
    const protocolsResult = await db.query(
      `SELECT p.status, p.start_date, p.modules, pt.name as template_name
       FROM protocols p
       LEFT JOIN protocol_templates pt ON p.template_id = pt.id
       WHERE p.client_id = $1 AND p.status IN ('active', 'draft')
       ORDER BY p.created_at DESC LIMIT 3`,
      [clientId]
    );
    if (protocolsResult.rows.length > 0) {
      context += '\nACTIVE PROTOCOLS:\n';
      protocolsResult.rows.forEach(protocol => {
        context += `- ${protocol.template_name || 'Custom Protocol'} (${protocol.status})\n`;
      });
    }
  } catch (e) {
    console.error('Error fetching protocols:', e.message);
  }

  return context.trim();
}

// Get protocol context
async function getProtocolContext(protocolId) {
  const result = await db.query(
    `SELECT
      p.*,
      c.first_name || ' ' || c.last_name as client_name,
      c.medical_history, c.current_medications,
      pt.name as template_name,
      pt.category, pt.description, pt.modules
    FROM protocols p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN protocol_templates pt ON p.template_id = pt.id
    WHERE p.id = $1`,
    [protocolId]
  );

  if (result.rows.length === 0) {
    return 'Protocol not found';
  }

  const protocol = result.rows[0];
  const modules = typeof protocol.template_modules === 'string'
    ? JSON.parse(protocol.template_modules)
    : protocol.template_modules || [];

  return `
Protocol: ${protocol.template_name}
Category: ${protocol.category}
Description: ${protocol.description || 'N/A'}
Client: ${protocol.client_name}
Client Medical History: ${protocol.medical_history || 'None'}
Client Medications: ${protocol.current_medications || 'None'}
Start Date: ${protocol.start_date}
End Date: ${protocol.end_date || 'Ongoing'}
Status: ${protocol.status}
Modules: ${modules.length} modules planned
Notes: ${protocol.notes || 'No notes'}
  `.trim();
}

// Get lab context
async function getLabContext(labId) {
  const result = await db.query(
    `SELECT
      l.*,
      c.first_name || ' ' || c.last_name as client_name,
      c.medical_history
    FROM labs l
    LEFT JOIN clients c ON l.client_id = c.id
    WHERE l.id = $1`,
    [labId]
  );

  if (result.rows.length === 0) {
    return 'Lab not found';
  }

  const lab = result.rows[0];
  return `
Lab: ${lab.title}
Type: ${lab.lab_type}
Client: ${lab.client_name}
Client Medical History: ${lab.medical_history || 'None'}
Test Date: ${lab.test_date || 'Not specified'}
AI Summary: ${lab.ai_summary ? lab.ai_summary.substring(0, 500) + '...' : 'Not yet generated'}
  `.trim();
}

// Query Gemini Knowledge Base using File Search API
// This replaces the deprecated Semantic Retrieval (Corpus) API
async function queryKnowledgeBase(query) {
  try {
    if (!process.env.GEMINI_FILE_SEARCH_STORE_ID || !process.env.GEMINI_API_KEY) {
      console.log('[KB Query] Knowledge base not configured');
      return null;
    }

    console.log(`[KB Query] Querying File Search store with: "${query.substring(0, 50)}..."`);

    // Use File Search API with generateContent
    const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE_ID;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the knowledge base, provide relevant information about: ${query}

Return the key facts, protocols, dosages, and clinical recommendations found in the knowledge base. Be specific and cite sources when possible.`,
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

    const kbContext = 'RELEVANT KNOWLEDGE BASE CONTENT:\n\n' + response.text;

    // Extract grounding metadata for citations if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('[KB Query] Response includes grounding citations');
    }

    console.log(`[KB Query] Built context with ${kbContext.length} characters`);
    return kbContext;

  } catch (error) {
    console.error('[KB Query] Error querying knowledge base:', error);
    return null;
  }
}

// Calculate age from date of birth
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

// System prompt for Claude
function getSystemPrompt() {
  return `You are an AI assistant for ExpandHealth, a functional medicine practice management platform. You help healthcare practitioners by:

1. Answering questions about patient care, protocols, and lab results
2. Providing evidence-based recommendations
3. Helping interpret health data in context
4. Suggesting treatment approaches based on functional medicine principles

CRITICAL GUIDELINES FOR KNOWLEDGE BASE USAGE:
- **ALWAYS prioritize information from the KNOWLEDGE BASE section when provided**
- When knowledge base content is included in the context, you MUST incorporate and cite it in your response
- Cross-reference knowledge base protocols with client data to provide personalized recommendations
- Explicitly mention which protocols or documents from the knowledge base apply to the question
- If the knowledge base contains relevant treatment protocols, reference them by name (e.g., "According to the PK Protocol...")

General Guidelines:
- Be professional, concise, and evidence-based
- When client health data is provided, use it to give personalized insights
- Always cite the specific knowledge base source when using KB information
- If asked about medical decisions, remind that final decisions should involve the practitioner's clinical judgment
- Use markdown formatting for better readability
- When creating protocols or engagement plans, actively integrate relevant KB content

You have access to:
- Client health profiles (conditions, medications, goals)
- Protocol templates and active protocols
- Lab results and summaries
- **ExpandHealth Knowledge Base** (treatment protocols, supplement guidelines, condition-specific approaches)

When the KNOWLEDGE BASE section appears in context, treat it as authoritative clinical reference material that should inform your recommendations.

Always prioritize patient safety and remind practitioners to use their clinical judgment.`;
}

// Generate AI-powered personality insights for a client
router.post('/personality-insights/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    console.log(`[Personality Insights] Starting analysis for client ${clientId}`);

    // Check if CLAUDE_API_KEY is configured
    if (!process.env.CLAUDE_API_KEY) {
      console.error('[Personality Insights] CLAUDE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Gather all available client data
    let clientResult, notesResult, formsResult;

    try {
      // Get client basic info (without metadata table that may not exist)
      clientResult = await db.query(
        `SELECT
          id, first_name, last_name, email, phone, date_of_birth,
          gender, address, city, medical_history, current_medications,
          allergies, status
        FROM clients
        WHERE id = $1`,
        [clientId]
      );
      console.log(`[Personality Insights] Client found: ${clientResult.rows.length > 0}`);
    } catch (dbError) {
      console.error('[Personality Insights] Client query error:', dbError.message);
      throw dbError;
    }

    try {
      // Get client notes (consultation notes, quick notes)
      notesResult = await db.query(
        `SELECT content, note_type, is_consultation, consultation_date, created_at
         FROM notes
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [clientId]
      );
      console.log(`[Personality Insights] Notes found: ${notesResult.rows.length}`);
    } catch (dbError) {
      console.error('[Personality Insights] Notes query error:', dbError.message);
      notesResult = { rows: [] };
    }

    try {
      // Get form submissions (intake forms, questionnaires)
      formsResult = await db.query(
        `SELECT fs.responses as form_data, fs.ai_summary, fs.submitted_at, ft.name as form_name
         FROM form_submissions fs
         JOIN form_templates ft ON fs.form_id = ft.id
         WHERE fs.client_id = $1
         ORDER BY fs.submitted_at DESC
         LIMIT 10`,
        [clientId]
      );
      console.log(`[Personality Insights] Form submissions found: ${formsResult.rows.length}`);
    } catch (dbError) {
      console.error('[Personality Insights] Forms query error:', dbError.message);
      formsResult = { rows: [] };
    }

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];
    const notes = notesResult.rows;
    const formSubmissions = formsResult.rows;

    // Build comprehensive client context for AI analysis
    let clientContext = `
CLIENT PROFILE:
- Name: ${client.first_name} ${client.last_name}
- Age: ${client.date_of_birth ? calculateAge(client.date_of_birth) : 'Unknown'}
- Gender: ${client.gender || 'Not specified'}
- Location: ${client.city || 'Not specified'}
- Status: ${client.status}
- Medical History: ${client.medical_history || 'Not provided'}
- Current Medications: ${client.current_medications || 'None listed'}
- Allergies: ${client.allergies || 'None listed'}
`;

    // Add notes context
    if (notes.length > 0) {
      clientContext += '\nCONSULTATION NOTES & OBSERVATIONS:\n';
      notes.forEach((note, i) => {
        const noteType = note.is_consultation ? 'Consultation' : (note.note_type || 'Quick Note');
        const date = note.consultation_date || note.created_at;
        clientContext += `\n[${noteType} - ${new Date(date).toLocaleDateString()}]:\n${note.content.substring(0, 500)}${note.content.length > 500 ? '...' : ''}\n`;
      });
    }

    // Add form submission context
    if (formSubmissions.length > 0) {
      clientContext += '\nFORM RESPONSES:\n';
      formSubmissions.forEach((form, i) => {
        clientContext += `\n[${form.form_name} - ${new Date(form.submitted_at).toLocaleDateString()}]:\n`;
        if (form.ai_summary) {
          clientContext += `Summary: ${form.ai_summary.substring(0, 300)}...\n`;
        }
        // Parse form data for key personality-revealing answers
        try {
          const formData = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
          // Look for personality-relevant fields
          const relevantFields = ['goals', 'motivation', 'communication', 'preferences', 'lifestyle',
                                   'stress', 'occupation', 'hobbies', 'priorities', 'concerns'];
          Object.entries(formData || {}).forEach(([key, value]) => {
            if (relevantFields.some(f => key.toLowerCase().includes(f)) && value) {
              clientContext += `- ${key}: ${String(value).substring(0, 200)}\n`;
            }
          });
        } catch (e) {
          // Skip if can't parse
        }
      });
    }

    // Call Claude to analyze personality
    const personalityPrompt = `You are a client psychology analyst for a functional medicine practice. Based on the following client data, analyze their personality and communication preferences to help practitioners better serve them.

${clientContext}

Please analyze this client and provide a JSON response with the following structure:
{
  "personalityType": "MBTI-style type with name (e.g., 'ENTJ - The Commander')",
  "communicationStyle": "2-3 word description (e.g., 'Direct & Analytical')",
  "decisionMaking": "How they make decisions (e.g., 'Data-Driven', 'Intuition-Based', 'Consensus-Seeking')",
  "motivationDriver": "Primary motivation (e.g., 'Achievement & Results', 'Health & Longevity', 'Family & Relationships')",
  "insights": [
    {
      "category": "Best approach",
      "text": "Specific advice on how to present information to this client"
    },
    {
      "category": "Communication tip",
      "text": "How to communicate effectively with this client"
    },
    {
      "category": "Engagement style",
      "text": "How to keep this client engaged and compliant"
    },
    {
      "category": "Potential challenges",
      "text": "What challenges might arise and how to address them"
    }
  ],
  "confidence": "high/medium/low based on data availability"
}

Base your analysis on:
1. Communication patterns evident in notes
2. Goals and concerns expressed in forms
3. Response patterns and engagement level
4. Occupation and lifestyle indicators
5. Health goals and motivation level

If limited data is available, make reasonable inferences but indicate lower confidence.
Return ONLY valid JSON, no markdown formatting.`;

    console.log('[Personality Insights] Calling Claude API...');
    let personalityData;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: personalityPrompt
        }]
      });

      console.log('[Personality Insights] Claude API response received');
      const aiResponse = response.content[0].text;

      // Parse the JSON response
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          personalityData = JSON.parse(jsonMatch[0]);
          console.log('[Personality Insights] Successfully parsed AI response');
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('[Personality Insights] Failed to parse AI response:', parseError.message);
        console.log('[Personality Insights] Raw AI response:', aiResponse.substring(0, 500));
        // Return default data if parsing fails
        personalityData = {
          personalityType: 'INTJ - The Architect',
          communicationStyle: 'Thoughtful & Strategic',
          decisionMaking: 'Data-Driven',
          motivationDriver: 'Health & Longevity',
          insights: [
            { category: 'Best approach', text: 'Present information with clear evidence and rationale.' },
            { category: 'Communication tip', text: 'Be thorough but concise, respecting their time.' },
            { category: 'Engagement style', text: 'Set clear milestones and track measurable progress.' },
            { category: 'Potential challenges', text: 'May need detailed explanations for recommendations.' }
          ],
          confidence: 'low'
        };
      }
    } catch (apiError) {
      console.error('[Personality Insights] Claude API error:', apiError.message);
      // Return default profile if API fails
      personalityData = {
        personalityType: 'INTJ - The Architect',
        communicationStyle: 'Thoughtful & Strategic',
        decisionMaking: 'Data-Driven',
        motivationDriver: 'Health & Longevity',
        insights: [
          { category: 'Best approach', text: 'Present information with clear evidence and rationale.' },
          { category: 'Communication tip', text: 'Be thorough but concise, respecting their time.' },
          { category: 'Engagement style', text: 'Set clear milestones and track measurable progress.' },
          { category: 'Potential challenges', text: 'May need detailed explanations for recommendations.' }
        ],
        confidence: 'low'
      };
    }

    console.log('[Personality Insights] Sending response');
    res.json({
      clientId,
      clientName: `${client.first_name} ${client.last_name}`,
      ...personalityData,
      dataSourcesUsed: {
        notes: notes.length,
        formSubmissions: formSubmissions.length
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Personality insights error:', error);
    next(error);
  }
});

// Generate AI-powered client health summary for dashboard
router.post('/client-summary/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    console.log(`[Client Summary] Starting summary generation for client ${clientId}`);

    // Check if CLAUDE_API_KEY is configured
    if (!process.env.CLAUDE_API_KEY) {
      console.error('[Client Summary] CLAUDE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Gather all available client data
    let clientResult, notesResult, formsResult, labsResult;

    try {
      // Get client basic info
      clientResult = await db.query(
        `SELECT
          id, first_name, last_name, email, phone, date_of_birth,
          gender, address, city, medical_history, current_medications,
          allergies, status
        FROM clients
        WHERE id = $1`,
        [clientId]
      );
      console.log(`[Client Summary] Client found: ${clientResult.rows.length > 0}`);
    } catch (dbError) {
      console.error('[Client Summary] Client query error:', dbError.message);
      throw dbError;
    }

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    try {
      // Get client notes
      notesResult = await db.query(
        `SELECT content, note_type, is_consultation, consultation_date, created_at
         FROM notes
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [clientId]
      );
      console.log(`[Client Summary] Notes found: ${notesResult.rows.length}`);
    } catch (dbError) {
      console.error('[Client Summary] Notes query error:', dbError.message);
      notesResult = { rows: [] };
    }

    try {
      // Get form submissions
      formsResult = await db.query(
        `SELECT fs.responses as form_data, fs.ai_summary, fs.submitted_at, ft.name as form_name
         FROM form_submissions fs
         JOIN form_templates ft ON fs.form_id = ft.id
         WHERE fs.client_id = $1
         ORDER BY fs.submitted_at DESC
         LIMIT 10`,
        [clientId]
      );
      console.log(`[Client Summary] Form submissions found: ${formsResult.rows.length}`);
    } catch (dbError) {
      console.error('[Client Summary] Forms query error:', dbError.message);
      formsResult = { rows: [] };
    }

    try {
      // Get lab results
      labsResult = await db.query(
        `SELECT title as name, lab_type, test_date, ai_summary, extracted_data as biomarkers
         FROM labs
         WHERE client_id = $1
         ORDER BY COALESCE(test_date, created_at) DESC
         LIMIT 10`,
        [clientId]
      );
      console.log(`[Client Summary] Labs found: ${labsResult.rows.length}`);
    } catch (dbError) {
      console.error('[Client Summary] Labs query error:', dbError.message);
      labsResult = { rows: [] };
    }

    const notes = notesResult.rows;
    const formSubmissions = formsResult.rows;
    const labs = labsResult.rows;

    // Check if we have any data to summarize
    const hasData = notes.length > 0 || formSubmissions.length > 0 || labs.length > 0 ||
                    client.medical_history || client.current_medications || client.allergies;

    if (!hasData) {
      console.log('[Client Summary] No data available for summary');
      return res.json({
        clientId,
        summary: null,
        message: 'No data available to generate summary. Add notes, forms, or lab results first.',
        dataSourcesUsed: { notes: 0, forms: 0, labs: 0 },
        generatedAt: new Date().toISOString()
      });
    }

    // Build comprehensive client context for AI analysis
    let clientContext = `
CLIENT PROFILE:
- Name: ${client.first_name} ${client.last_name}
- Age: ${client.date_of_birth ? calculateAge(client.date_of_birth) : 'Unknown'}
- Gender: ${client.gender || 'Not specified'}
- Medical History: ${client.medical_history || 'Not provided'}
- Current Medications: ${client.current_medications || 'None listed'}
- Allergies: ${client.allergies || 'None listed'}
`;

    // Add notes context
    if (notes.length > 0) {
      clientContext += '\nCLINICAL NOTES:\n';
      notes.forEach((note) => {
        const noteType = note.is_consultation ? 'Consultation' : (note.note_type || 'Note');
        const date = note.consultation_date || note.created_at;
        clientContext += `\n[${noteType} - ${new Date(date).toLocaleDateString()}]:\n${note.content}\n`;
      });
    }

    // Add form submission context
    if (formSubmissions.length > 0) {
      clientContext += '\nFORM RESPONSES:\n';
      formSubmissions.forEach((form) => {
        clientContext += `\n[${form.form_name} - ${new Date(form.submitted_at).toLocaleDateString()}]:\n`;
        if (form.ai_summary) {
          clientContext += `AI Summary: ${form.ai_summary}\n`;
        }
        try {
          const formData = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
          console.log(`[Client Summary] Processing form data for ${form.form_name}:`, formData ? Object.keys(formData).length + ' fields' : 'null');
          if (formData && typeof formData === 'object') {
            Object.entries(formData).forEach(([key, value]) => {
              if (value && String(value).trim()) {
                // Handle arrays (checkbox selections) specially
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                clientContext += `- ${key}: ${displayValue.substring(0, 500)}\n`;
              }
            });
          }
        } catch (e) {
          console.error(`[Client Summary] Error parsing form data for ${form.form_name}:`, e.message);
        }
      });
    }

    // Add lab results context
    if (labs.length > 0) {
      clientContext += '\nLAB RESULTS:\n';
      labs.forEach((lab) => {
        const labDate = lab.test_date ? new Date(lab.test_date).toLocaleDateString() : 'Date not specified';
        clientContext += `\n[${lab.name} - ${labDate}]:\n`;
        if (lab.ai_summary) {
          clientContext += `AI Summary: ${lab.ai_summary}\n`;
        }
        // Handle extracted_data (biomarkers) - can be object or array
        if (lab.biomarkers) {
          try {
            const biomarkersData = typeof lab.biomarkers === 'string' ? JSON.parse(lab.biomarkers) : lab.biomarkers;
            if (Array.isArray(biomarkersData)) {
              const outOfRange = biomarkersData.filter(b => b.status === 'high' || b.status === 'low');
              if (outOfRange.length > 0) {
                clientContext += `Out of range markers: ${outOfRange.map(b => `${b.name}: ${b.value} ${b.unit || ''} (${b.status})`).join(', ')}\n`;
              }
            } else if (typeof biomarkersData === 'object') {
              // If it's an object with key-value pairs
              Object.entries(biomarkersData).forEach(([key, value]) => {
                if (value) {
                  clientContext += `- ${key}: ${String(value).substring(0, 200)}\n`;
                }
              });
            }
          } catch (e) {
            console.error('[Client Summary] Error parsing biomarkers:', e.message);
          }
        }
      });
    }

    // Call Claude to generate summary
    const summaryPrompt = `You are a clinical assistant for a functional medicine practice. Based on the following client data, generate a concise health summary for the practitioner's dashboard.

${clientContext}

Generate a summary with the following bullet points (only include categories where data exists):

1. **Health goals** - What the client wants to achieve (if mentioned in forms/notes)
2. **Symptoms** - Key symptoms or complaints mentioned
3. **Medical history** - Important medical history, conditions, blood pressure if available
4. **Family history** - Any relevant family medical history
5. **Previous surgical intervention** - Any surgeries or procedures
6. **Allergies** - Drug or food allergies (or state "No known allergies" if none)
7. **Key lab findings** - Any notable lab results or trends (if labs available)
8. **Current medications** - What they're currently taking

Format your response as a JSON object:
{
  "summaryItems": [
    {
      "category": "Health goals",
      "text": "The actual content..."
    },
    ...
  ],
  "lastUpdated": "Date of most recent data point"
}

Rules:
- Only include categories where you have actual data
- Be concise but include key clinical details
- Use professional medical language
- If blood pressure is mentioned, include the reading
- If medications are mentioned, include names and dosages when available
- Return ONLY valid JSON, no markdown formatting`;

    console.log('[Client Summary] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    });

    console.log('[Client Summary] Claude API response received');
    const aiResponse = response.content[0].text;

    // Parse the JSON response
    let summaryData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryData = JSON.parse(jsonMatch[0]);
        console.log('[Client Summary] Successfully parsed AI response');
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Client Summary] Failed to parse AI response:', parseError.message);
      console.log('[Client Summary] Raw AI response:', aiResponse.substring(0, 500));
      // Return raw text if parsing fails
      summaryData = {
        summaryItems: [{
          category: 'Summary',
          text: aiResponse.substring(0, 1000)
        }],
        lastUpdated: new Date().toISOString()
      };
    }

    console.log('[Client Summary] Sending response');
    res.json({
      clientId,
      clientName: `${client.first_name} ${client.last_name}`,
      summary: summaryData.summaryItems,
      lastUpdated: summaryData.lastUpdated || new Date().toISOString(),
      dataSourcesUsed: {
        notes: notes.length,
        forms: formSubmissions.length,
        labs: labs.length
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Client Summary] Error:', error);
    next(error);
  }
});

module.exports = router;
