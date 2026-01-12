const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const { Resend } = require('resend');

// Initialize Resend for email
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Gemini AI client (using new SDK)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Configure multer for PDF upload
const storage = multer.memoryStorage();
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

// ========================================
// PDF PARSING ENDPOINT
// ========================================

// POST /api/forms/parse-pdf - Parse PDF and extract form structure
router.post('/parse-pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    // Check if Gemini API is configured
    if (!genAI) {
      return res.status(503).json({
        error: 'PDF parsing service not configured',
        details: 'GEMINI_API_KEY is missing in environment variables'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'Unable to extract text from PDF' });
    }

    // Use Gemini AI to analyze the PDF and extract form structure
    const prompt = `You are an expert at analyzing form documents and converting them into structured digital forms.

I have extracted text from a PDF form. Please analyze this text and convert it into a structured form template.

For each field in the form, identify:
1. The field label/question
2. The appropriate field type (text, textarea, email, tel, date, radio, checkbox, range)
3. Whether the field is required
4. For radio/checkbox fields, extract all the options
5. Any placeholder text or hints

Return a JSON object with this structure:
{
  "name": "Form Title",
  "description": "Brief description of what this form collects",
  "category": "Assessment" (or "Onboarding", "Mental Health", "Check-in", "Follow-up", "Other"),
  "fields": [
    {
      "id": "unique_field_id",
      "type": "text|textarea|email|tel|date|radio|checkbox|range",
      "label": "Field label/question",
      "placeholder": "Placeholder text",
      "required": true|false,
      "options": ["option1", "option2"] // only for radio/checkbox
    }
  ]
}

Guidelines:
- Use "text" for short single-line inputs (name, age, etc.)
- Use "textarea" for longer text (descriptions, notes, symptoms)
- Use "email" for email addresses
- Use "tel" for phone numbers
- Use "date" for dates (DOB, appointment dates)
- Use "radio" for single-choice questions (Yes/No, Male/Female, etc.)
- Use "checkbox" for multi-choice questions (symptoms, conditions, etc.)
- Use "range" for scale questions (1-10, severity ratings)
- Group related checkbox options logically
- Make critical fields (name, contact info) required
- Infer the form category from the content

Here is the PDF text:

${pdfText}

Return ONLY the JSON object, no other text.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    const responseText = result.text;
    let parsedForm;

    try {
      // Extract JSON from response (Gemini might add extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedForm = JSON.parse(jsonMatch[0]);
      } else {
        parsedForm = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: 'The AI returned invalid JSON'
      });
    }

    // Validate the parsed form structure
    if (!parsedForm.name || !parsedForm.fields || !Array.isArray(parsedForm.fields)) {
      return res.status(500).json({
        error: 'Invalid form structure returned by AI'
      });
    }

    // Return the parsed form data
    res.json({
      success: true,
      form: parsedForm,
      metadata: {
        originalFileName: req.file.originalname,
        pageCount: pdfData.numpages,
        textLength: pdfText.length
      }
    });

  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({
      error: 'Failed to parse PDF',
      details: error.message
    });
  }
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

// GET /api/forms/public/:id - Get form template for public submission (no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { preview } = req.query;

    // In preview mode, allow viewing draft forms too
    let query;
    if (preview === 'true') {
      query = `SELECT id, name, description, category, fields, settings, status
               FROM form_templates
               WHERE id = $1`;
    } else {
      query = `SELECT id, name, description, category, fields, settings, status
               FROM form_templates
               WHERE id = $1 AND status = 'published'`;
    }

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found or not available' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// ========================================
// OTP VERIFICATION FOR PUBLIC FORMS
// ========================================

// In-memory OTP store (in production, use Redis or database)
const otpStore = new Map();

// OTP Configuration
const OTP_CONFIG = {
  expiryMinutes: 10,
  maxAttempts: 3,
  cooldownMinutes: 1
};

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate secure link token
function generateLinkToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Notify clinician about new form submission
async function notifyClinicianOfSubmission(form, submission, clientId) {
  try {
    // Get clinician details
    const clinicianResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [form.assigned_clinician]
    );

    if (clinicianResult.rows.length === 0) {
      console.log('Assigned clinician not found, skipping notification');
      return;
    }

    const clinician = clinicianResult.rows[0];

    // Get client details if linked
    let clientName = submission.submitted_name || 'Unknown';
    let clientEmail = submission.submitted_email || 'Not provided';

    if (clientId) {
      const clientResult = await pool.query(
        'SELECT first_name, last_name, email FROM clients WHERE id = $1',
        [clientId]
      );
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        clientName = `${client.first_name} ${client.last_name}`.trim();
        clientEmail = client.email || clientEmail;
      }
    }

    console.log(`📧 Notifying ${clinician.first_name} ${clinician.last_name} (${clinician.email}) about new form submission from ${clientName}`);

    // Send email notification if Resend is configured
    if (resend && clinician.email) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'ExpandHealth <onboarding@resend.dev>';
      const submissionDate = new Date(submission.submitted_at).toLocaleString();
      const dashboardUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/forms/${form.id}/responses?highlight=${submission.id}`;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: clinician.email,
          subject: `New Form Submission: ${form.name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #0f766e; font-size: 28px; margin: 0;">✦ ExpandHealth</h1>
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 32px;">
                <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 8px;">New Form Submission</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
                  A new form has been submitted that requires your review.
                </p>

                <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 12px;"><strong style="color: #374151;">Form:</strong> <span style="color: #6b7280;">${form.name}</span></p>
                  <p style="margin: 0 0 12px;"><strong style="color: #374151;">Submitted by:</strong> <span style="color: #6b7280;">${clientName}</span></p>
                  <p style="margin: 0 0 12px;"><strong style="color: #374151;">Email:</strong> <span style="color: #6b7280;">${clientEmail}</span></p>
                  <p style="margin: 0;"><strong style="color: #374151;">Date:</strong> <span style="color: #6b7280;">${submissionDate}</span></p>
                </div>

                <div style="text-align: center;">
                  <a href="${dashboardUrl}" style="display: inline-block; background: #0f766e; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    View Submission
                  </a>
                </div>
              </div>

              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                This notification was sent because you are assigned to this form in ExpandHealth.
              </p>
            </div>
          `
        });
        console.log(`✅ Clinician notification email sent to ${clinician.email}`);
      } catch (emailError) {
        console.error('Failed to send clinician notification email:', emailError);
      }
    }
  } catch (error) {
    console.error('Error in notifyClinicianOfSubmission:', error);
  }
}

// POST /api/forms/otp/send - Send OTP to email for form access
router.post('/otp/send', async (req, res) => {
  try {
    const { email, form_id } = req.body;

    if (!email || !form_id) {
      return res.status(400).json({ error: 'Email and form ID are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if form exists and is published
    const formCheck = await pool.query(
      'SELECT id, name FROM form_templates WHERE id = $1 AND status = $2',
      [form_id, 'published']
    );

    if (formCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found or not available' });
    }

    const form = formCheck.rows[0];
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    const otpKey = `${email}:${form_id}`;
    otpStore.set(otpKey, { otp, expiresAt, email, form_id });

    // Log OTP to console (always, for debugging)
    console.log(`📧 OTP for ${email} to access form "${form.name}": ${otp}`);

    // Send email via Resend if configured
    let emailSent = false;
    let emailError = null;

    if (resend) {
      try {
        // Use verified domain email if available, otherwise sandbox
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'ExpandHealth <onboarding@resend.dev>';
        const isSandbox = fromEmail.includes('resend.dev');

        console.log(`📧 Attempting to send OTP email via Resend...`);
        console.log(`   From: ${fromEmail}`);
        console.log(`   To: ${email}`);
        console.log(`   Sandbox mode: ${isSandbox}`);

        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Your verification code for ${form.name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #0f766e; font-size: 28px; margin: 0;">&#10022; ExpandHealth</h1>
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center;">
                <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 16px;">Your Verification Code</h2>
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">
                  Use this code to access the form: <strong>${form.name}</strong>
                </p>

                <div style="background: #0f766e; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; display: inline-block;">
                  ${otp}
                </div>

                <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
                  This code expires in 10 minutes.
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
          `
        });

        console.log('📬 Resend API response:', JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error('❌ Resend error:', emailResult.error);
          emailError = emailResult.error.message || 'Email delivery failed';
        } else if (emailResult.data?.id) {
          emailSent = true;
          console.log(`✅ OTP email queued successfully (ID: ${emailResult.data.id})`);

          // Note: In sandbox mode, emails only deliver to the Resend account owner
          if (isSandbox) {
            console.log(`⚠️ Sandbox mode: Email will only be delivered if ${email} is the Resend account owner`);
          }
        }
      } catch (err) {
        console.error('❌ Failed to send OTP email:', err.message);
        emailError = err.message;
      }
    } else {
      console.log('⚠️ Resend not configured (RESEND_API_KEY not set)');
    }

    // Return response - always include demo_otp for testing
    res.json({
      success: true,
      message: emailSent
        ? 'Verification code sent to your email'
        : 'Verification code generated',
      email_sent: emailSent,
      // Always show demo OTP in demo mode or if email wasn't successfully sent
      demo_otp: otp
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/forms/otp/verify - Verify OTP and get access token
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, form_id, otp } = req.body;

    if (!email || !form_id || !otp) {
      return res.status(400).json({ error: 'Email, form ID, and OTP are required' });
    }

    const otpKey = `${email}:${form_id}`;
    const storedData = otpStore.get(otpKey);

    if (!storedData) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid - delete it (one-time use)
    otpStore.delete(otpKey);

    // Generate a session token for this form submission
    const sessionToken = `form_${form_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sessionExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store session (in production, use Redis or database)
    otpStore.set(sessionToken, {
      email,
      form_id,
      expiresAt: sessionExpiry,
      verified: true
    });

    res.json({
      success: true,
      session_token: sessionToken,
      email: email,
      expires_in: 3600 // seconds
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// ========================================
// PERSONALIZED FORM LINKS
// ========================================

// POST /api/forms/links - Create a personalized form link (from client dashboard)
router.post('/links', authenticateToken, async (req, res) => {
  try {
    const { form_id, client_id, expiry_days } = req.body;

    if (!form_id) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Verify form exists
    const formCheck = await pool.query(
      'SELECT id, name, default_link_expiry_days FROM form_templates WHERE id = $1',
      [form_id]
    );

    if (formCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = formCheck.rows[0];
    const linkToken = generateLinkToken();
    const linkType = client_id ? 'personalized' : 'generic';
    const expiryDays = expiry_days || form.default_link_expiry_days || 14;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Try to insert into form_links table (may not exist yet)
    try {
      const result = await pool.query(
        `INSERT INTO form_links (form_id, client_id, link_token, link_type, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [form_id, client_id || null, linkToken, linkType, expiresAt, req.user.id]
      );

      const baseUrl = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${process.env.PORT || 3001}`);
      const formUrl = `${baseUrl}/f/${form_id}?token=${linkToken}`;

      res.status(201).json({
        success: true,
        link: {
          ...result.rows[0],
          url: formUrl,
          form_name: form.name
        }
      });
    } catch (dbError) {
      // If form_links table doesn't exist, fall back to simple URL
      console.log('form_links table may not exist, using simple URL');
      const baseUrl = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${process.env.PORT || 3001}`);
      const formUrl = client_id
        ? `${baseUrl}/f/${form_id}?cid=${client_id}`
        : `${baseUrl}/f/${form_id}`;

      res.status(201).json({
        success: true,
        link: {
          url: formUrl,
          form_id,
          client_id,
          link_type: linkType,
          expires_at: expiresAt,
          form_name: form.name
        }
      });
    }
  } catch (error) {
    console.error('Error creating form link:', error);
    res.status(500).json({ error: 'Failed to create form link' });
  }
});

// GET /api/forms/links/validate/:token - Validate a form link token
router.get('/links/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Try to find the link in database
    try {
      const result = await pool.query(
        `SELECT fl.*, ft.name as form_name, ft.status as form_status,
                c.first_name as client_first_name, c.last_name as client_last_name,
                c.email as client_email, c.phone as client_phone, c.date_of_birth as client_dob
         FROM form_links fl
         INNER JOIN form_templates ft ON fl.form_id = ft.id
         LEFT JOIN clients c ON fl.client_id = c.id
         WHERE fl.link_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link', valid: false });
      }

      const link = result.rows[0];

      // Check if link is active
      if (!link.is_active) {
        return res.status(400).json({ error: 'This link has been deactivated', valid: false });
      }

      // Check if link has expired
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This link has expired', valid: false });
      }

      // Check if form is published
      if (link.form_status !== 'published') {
        return res.status(400).json({ error: 'This form is no longer available', valid: false });
      }

      // Build client data if personalized link
      const clientData = link.client_id ? {
        first_name: link.client_first_name,
        last_name: link.client_last_name,
        email: link.client_email,
        phone: link.client_phone,
        date_of_birth: link.client_dob
      } : null;

      res.json({
        valid: true,
        link_type: link.link_type,
        form_id: link.form_id,
        form_name: link.form_name,
        client_id: link.client_id,
        client: clientData,
        expires_at: link.expires_at
      });
    } catch (dbError) {
      // Table doesn't exist, return generic validation
      res.json({ valid: true, link_type: 'generic' });
    }
  } catch (error) {
    console.error('Error validating link:', error);
    res.status(500).json({ error: 'Failed to validate link' });
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
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
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

// GET /api/forms/submissions/:formId - Get all submissions for a form
router.get('/submissions/:formId', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;

    // Check if this is a numeric form ID (for listing) or a submission ID
    if (!isNaN(formId)) {
      // First check if this is a form ID by looking for submissions
      const result = await pool.query(
        `SELECT
          fs.id,
          fs.form_id,
          fs.client_id,
          fs.responses as response_data,
          fs.status,
          fs.notes,
          fs.submitted_at,
          fs.created_at,
          fs.reviewed_at,
          fs.submitted_name,
          fs.submitted_email,
          COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), fs.submitted_name, 'Anonymous') as client_name,
          COALESCE(c.email, fs.submitted_email) as client_email
        FROM form_submissions fs
        LEFT JOIN clients c ON fs.client_id = c.id
        WHERE fs.form_id = $1
        ORDER BY fs.submitted_at DESC`,
        [formId]
      );

      // If we got results, return them as an array
      if (result.rows.length > 0 || await checkFormExists(formId)) {
        return res.json(result.rows);
      }
    }

    // Otherwise treat as a single submission lookup
    const result = await pool.query(
      `SELECT
        fs.*,
        ft.name as form_name,
        ft.description as form_description,
        ft.category as form_category,
        ft.fields as form_fields,
        COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), fs.submitted_name, 'Anonymous') as client_name,
        COALESCE(c.email, fs.submitted_email) as client_email,
        c.phone as client_phone,
        CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
      FROM form_submissions fs
      INNER JOIN form_templates ft ON fs.form_id = ft.id
      LEFT JOIN clients c ON fs.client_id = c.id
      LEFT JOIN users u ON fs.reviewed_by = u.id
      WHERE fs.id = $1`,
      [formId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
});

// Helper function to check if form exists
async function checkFormExists(formId) {
  const result = await pool.query('SELECT id FROM form_templates WHERE id = $1', [formId]);
  return result.rows.length > 0;
}

// PUT /api/forms/submissions/:id/status - Update submission status
router.put('/submissions/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await pool.query(
      `UPDATE form_submissions
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           reviewed_by = $3,
           reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, notes, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
});

// POST /api/forms/submissions/ai-summary - Generate AI summary of a response
router.post('/submissions/ai-summary', authenticateToken, async (req, res) => {
  try {
    const { response_id, response_data, form_name } = req.body;

    if (!response_data) {
      return res.status(400).json({ error: 'Response data is required' });
    }

    // Check if Gemini API is configured
    if (!genAI) {
      return res.status(503).json({
        error: 'AI service not configured',
        summary: 'AI summary is not available. Please configure the GEMINI_API_KEY.'
      });
    }

    // Format the response data for the AI
    const responseText = Object.entries(response_data)
      .map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        return `${key}: ${displayValue}`;
      })
      .join('\n');

    const prompt = `You are a healthcare practice assistant. Analyze the following form response and provide a brief, helpful summary for the practitioner.

Form: ${form_name || 'Patient Form'}

Responses:
${responseText}

Provide a 2-3 sentence summary highlighting:
1. Key information or concerns
2. Any red flags or important notes
3. Suggested follow-up actions if relevant

Keep your response concise and professional.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    const summary = result.text;

    res.json({ summary });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    res.status(500).json({
      error: 'Failed to generate AI summary',
      summary: 'Unable to generate summary at this time.'
    });
  }
});

// OLD: GET /api/forms/submissions/:id - Get single submission (keeping for backwards compatibility)
router.get('/submission/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        fs.*,
        ft.name as form_name,
        ft.description as form_description,
        ft.category as form_category,
        ft.fields as form_fields,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
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
    const { form_id, client_id, responses, submitted_email, submitted_name, source, link_token } = req.body;

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

    const form = formCheck.rows[0];

    // Determine link type and validate personalized link if provided
    let linkType = 'generic';
    let linkId = null;
    let preLinkedClientId = null;

    if (link_token) {
      try {
        const linkCheck = await pool.query(
          'SELECT * FROM form_links WHERE link_token = $1 AND form_id = $2 AND is_active = true',
          [link_token, form_id]
        );
        if (linkCheck.rows.length > 0) {
          const link = linkCheck.rows[0];
          linkType = link.link_type;
          linkId = link.id;
          preLinkedClientId = link.client_id;

          // Mark link as used
          await pool.query(
            'UPDATE form_links SET used_at = NOW() WHERE id = $1',
            [link.id]
          );
        }
      } catch (dbError) {
        // form_links table may not exist, continue without it
        console.log('form_links table may not exist');
      }
    }

    // Smart client matching logic
    let finalClientId = client_id || preLinkedClientId;
    let isLinked = true;

    // Extract name from submitted_name or responses
    let firstName = 'Unknown';
    let lastName = '';

    // If we have a pre-linked client from personalized link, get their name
    if (preLinkedClientId && !submitted_name) {
      try {
        const clientInfo = await pool.query(
          'SELECT first_name, last_name, email FROM clients WHERE id = $1',
          [preLinkedClientId]
        );
        if (clientInfo.rows.length > 0) {
          firstName = clientInfo.rows[0].first_name || 'Unknown';
          lastName = clientInfo.rows[0].last_name || '';
          console.log(`📋 Pre-linked client info: ${firstName} ${lastName}`);
        }
      } catch (err) {
        console.log('Could not fetch pre-linked client info:', err.message);
      }
    }

    if (submitted_name) {
      const parts = submitted_name.trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    }

    // Also try to find name fields in responses
    if (responses) {
      for (const [key, value] of Object.entries(responses)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('first') && lowerKey.includes('name') && value) {
          firstName = value;
        } else if (lowerKey.includes('last') && lowerKey.includes('name') && value) {
          lastName = value;
        } else if ((lowerKey === 'name' || lowerKey === 'full name' || lowerKey === 'fullname') && value) {
          const parts = value.trim().split(' ');
          firstName = parts[0] || firstName;
          lastName = parts.slice(1).join(' ') || lastName;
        }
      }
    }

    // If no client_id yet and we have an email, try to match or create
    if (!finalClientId && submitted_email) {
      // Check if client exists with this email
      const existingClient = await pool.query(
        'SELECT id, first_name, last_name FROM clients WHERE LOWER(email) = LOWER($1)',
        [submitted_email]
      );

      if (existingClient.rows.length > 0) {
        // Match found! Link to existing client
        finalClientId = existingClient.rows[0].id;
        console.log(`✅ Form submission matched to existing client: ${existingClient.rows[0].first_name} ${existingClient.rows[0].last_name} (ID: ${finalClientId})`);
      } else {
        // No match - create new client as lead
        const newClient = await pool.query(
          `INSERT INTO clients (email, first_name, last_name, status, created_at)
           VALUES ($1, $2, $3, 'lead', NOW())
           RETURNING id`,
          [submitted_email, firstName, lastName]
        );
        finalClientId = newClient.rows[0].id;
        console.log(`📝 New lead created from form submission: ${firstName} ${lastName} (ID: ${finalClientId})`);
      }
    }

    // If still no client_id, mark as unlinked
    if (!finalClientId) {
      isLinked = false;
      console.log(`⚠️ Form submission could not be linked to a client (no email provided)`);
    }

    // Insert the submission
    const result = await pool.query(
      `INSERT INTO form_submissions (
        form_id, client_id, responses, status, submitted_at,
        submitted_name, submitted_email, source, link_type, is_linked
      )
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        form_id,
        finalClientId,
        JSON.stringify(responses),
        'pending',
        `${firstName} ${lastName}`.trim() || null,
        submitted_email || null,
        source || 'direct',
        linkType,
        isLinked
      ]
    );

    const submission = result.rows[0];

    // Generate AI summary in background (non-blocking)
    if (genAI) {
      generateAndSaveAISummary(submission.id, responses, form.name).catch(err => {
        console.error('Background AI summary generation failed:', err);
      });
    }

    // Send notification to assigned clinician if configured
    if (form.notify_on_submission && form.assigned_clinician) {
      notifyClinicianOfSubmission(form, submission, finalClientId).catch(err => {
        console.error('Clinician notification failed:', err);
      });
    }

    res.status(201).json({
      ...submission,
      client_matched: isLinked && finalClientId !== null,
      is_new_lead: isLinked && !client_id && !preLinkedClientId
    });
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
// CLIENT SUBMISSIONS
// ========================================

// GET /api/forms/client/:clientId/submissions - Get all form submissions for a specific client
router.get('/client/:clientId/submissions', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch submissions with form info
    const result = await pool.query(
      `SELECT
        fs.*,
        ft.name as form_name,
        ft.category as form_category,
        ft.description as form_description
      FROM form_submissions fs
      INNER JOIN form_templates ft ON fs.form_id = ft.id
      WHERE fs.client_id = $1
      ORDER BY fs.submitted_at DESC
      LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    // Count total
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM form_submissions WHERE client_id = $1',
      [clientId]
    );

    res.json({
      submissions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching client submissions:', error);
    res.status(500).json({ error: 'Failed to fetch client submissions' });
  }
});

// ========================================
// UNLINKED SUBMISSIONS MANAGEMENT
// ========================================

// GET /api/forms/submissions/unlinked - Get all unlinked submissions
router.get('/submissions-unlinked', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        fs.*,
        ft.name as form_name,
        ft.category as form_category
      FROM form_submissions fs
      INNER JOIN form_templates ft ON fs.form_id = ft.id
      WHERE fs.is_linked = false OR fs.client_id IS NULL
      ORDER BY fs.submitted_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM form_submissions WHERE is_linked = false OR client_id IS NULL'
    );

    res.json({
      submissions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching unlinked submissions:', error);
    res.status(500).json({ error: 'Failed to fetch unlinked submissions' });
  }
});

// POST /api/forms/submissions/:id/link - Manually link a submission to a client
router.post('/submissions/:id/link', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Verify client exists
    const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Update the submission
    const result = await pool.query(
      `UPDATE form_submissions
       SET client_id = $1, is_linked = true, linked_at = NOW(), linked_by = $2
       WHERE id = $3
       RETURNING *`,
      [client_id, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      success: true,
      message: 'Submission linked to client successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Error linking submission:', error);
    res.status(500).json({ error: 'Failed to link submission' });
  }
});

// POST /api/forms/submissions/:id/create-client - Create client from unlinked submission
router.post('/submissions/:id/create-client', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the submission
    const submissionResult = await pool.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    if (!submission.submitted_email) {
      return res.status(400).json({ error: 'Cannot create client without email address' });
    }

    // Check if client already exists with this email
    const existingClient = await pool.query(
      'SELECT id FROM clients WHERE LOWER(email) = LOWER($1)',
      [submission.submitted_email]
    );

    if (existingClient.rows.length > 0) {
      // Link to existing client instead
      await pool.query(
        `UPDATE form_submissions
         SET client_id = $1, is_linked = true, linked_at = NOW(), linked_by = $2
         WHERE id = $3`,
        [existingClient.rows[0].id, req.user.id, id]
      );

      return res.json({
        success: true,
        message: 'Submission linked to existing client',
        client_id: existingClient.rows[0].id,
        was_existing: true
      });
    }

    // Extract name from submission
    let firstName = 'Unknown';
    let lastName = '';

    if (submission.submitted_name) {
      const parts = submission.submitted_name.trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    }

    // Create new client
    const newClient = await pool.query(
      `INSERT INTO clients (email, first_name, last_name, status, created_at)
       VALUES ($1, $2, $3, 'lead', NOW())
       RETURNING *`,
      [submission.submitted_email, firstName, lastName]
    );

    // Link submission to new client
    await pool.query(
      `UPDATE form_submissions
       SET client_id = $1, is_linked = true, linked_at = NOW(), linked_by = $2
       WHERE id = $3`,
      [newClient.rows[0].id, req.user.id, id]
    );

    res.status(201).json({
      success: true,
      message: 'Client created and submission linked',
      client: newClient.rows[0],
      was_existing: false
    });
  } catch (error) {
    console.error('Error creating client from submission:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// ========================================
// AI SUMMARY GENERATION
// ========================================

// Background function to generate and save AI summary
async function generateAndSaveAISummary(submissionId, responses, formName) {
  if (!genAI) {
    console.log('Gemini model not configured, skipping AI summary');
    return;
  }

  try {
    // Format responses for the AI
    const responseText = Object.entries(responses)
      .map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        return `${key}: ${displayValue}`;
      })
      .join('\n');

    const prompt = `You are a healthcare practice assistant. Analyze the following form response and provide a concise, clinically relevant summary for the practitioner.

Form: ${formName || 'Patient Form'}

Responses:
${responseText}

Provide a summary with:
1. **Key Information**: Essential details about the patient/client
2. **Health Concerns**: Any symptoms, conditions, or concerns mentioned
3. **Red Flags**: Anything requiring immediate attention (if any)
4. **Recommended Actions**: Suggested next steps for the practitioner

Keep the summary professional and actionable. Use bullet points for clarity.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    const summary = result.text;

    // Save to database
    await pool.query(
      `UPDATE form_submissions
       SET ai_summary = $1, ai_summary_generated_at = NOW()
       WHERE id = $2`,
      [summary, submissionId]
    );

    console.log(`✨ AI summary generated for submission ${submissionId}`);
    return summary;
  } catch (error) {
    console.error(`Error generating AI summary for submission ${submissionId}:`, error);
    throw error;
  }
}

// POST /api/forms/submissions/:id/regenerate-summary - Regenerate AI summary
router.post('/submissions/:id/regenerate-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get submission with form name
    const result = await pool.query(
      `SELECT fs.*, ft.name as form_name
       FROM form_submissions fs
       INNER JOIN form_templates ft ON fs.form_id = ft.id
       WHERE fs.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = result.rows[0];
    const responses = typeof submission.responses === 'string'
      ? JSON.parse(submission.responses)
      : submission.responses;

    const summary = await generateAndSaveAISummary(id, responses, submission.form_name);

    res.json({
      success: true,
      summary: summary,
      ai_summary: summary  // Also include as ai_summary for frontend compatibility
    });
  } catch (error) {
    console.error('Error regenerating summary:', error);
    res.status(500).json({ error: 'Failed to regenerate summary' });
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

    // Try to get unlinked count (column may not exist)
    let unlinkedCount = 0;
    try {
      const unlinkedResult = await pool.query(
        'SELECT COUNT(*) FROM form_submissions WHERE is_linked = false OR client_id IS NULL'
      );
      unlinkedCount = parseInt(unlinkedResult.rows[0].count);
    } catch (e) {
      // Column doesn't exist yet
    }

    res.json({
      ...stats.rows[0],
      unlinked_submissions: unlinkedCount
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({ error: 'Failed to fetch form stats' });
  }
});

// POST /api/forms/send-email - Send form link via email
router.post('/send-email', authenticateToken, async (req, res) => {
  try {
    const { client_id, link_id, link_url, message } = req.body;

    if (!client_id || !link_url) {
      return res.status(400).json({ error: 'Client ID and link URL are required' });
    }

    // Get client info
    const clientResult = await pool.query(
      'SELECT first_name, last_name, email FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    if (!client.email) {
      return res.status(400).json({ error: 'Client does not have an email address' });
    }

    // Get form info if link_id provided
    let formName = 'Health Form';
    if (link_id) {
      try {
        const linkResult = await pool.query(
          `SELECT ft.name FROM form_links fl
           INNER JOIN form_templates ft ON fl.form_id = ft.id
           WHERE fl.id = $1`,
          [link_id]
        );
        if (linkResult.rows.length > 0) {
          formName = linkResult.rows[0].name;
        }
      } catch (e) {
        // Ignore if form_links doesn't exist
      }
    }

    // Get current user (clinician) info
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const clinician = userResult.rows[0] || { first_name: 'Your', last_name: 'Clinician' };

    // Build email HTML
    const personalMessage = message ? `<p style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; color: #374151;">${message}</p>` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ExpandHealth</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #111827; margin: 0 0 20px;">Hi ${client.first_name || 'there'},</h2>

          <p style="margin: 0 0 20px; color: #374151;">
            ${clinician.first_name} ${clinician.last_name} has sent you a form to complete: <strong>${formName}</strong>
          </p>

          ${personalMessage}

          <p style="margin: 20px 0; color: #374151;">
            Please click the button below to access and fill out your form. You'll need to verify your email to proceed.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${link_url}" style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Fill Out Form
            </a>
          </div>

          <p style="margin: 20px 0; color: #6b7280; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${link_url}" style="color: #0f766e; word-break: break-all;">${link_url}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
            This email was sent by ExpandHealth on behalf of your healthcare provider.<br>
            If you did not expect this email, please ignore it.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    if (!resend) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ExpandHealth <noreply@expandhealth.com>';
    const isSandbox = fromEmail.includes('resend.dev');

    console.log(`📧 Sending form email via Resend...`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   To: ${client.email}`);
    console.log(`   Subject: ${formName} - Please Complete Your Form`);
    console.log(`   Sandbox mode: ${isSandbox}`);

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: client.email,
      subject: `${formName} - Please Complete Your Form`,
      html: emailHtml
    });

    console.log('📬 Resend API response:', JSON.stringify(emailResult, null, 2));

    if (emailResult.error) {
      console.error('❌ Resend error:', emailResult.error);
      return res.status(500).json({ error: emailResult.error.message || 'Email delivery failed' });
    }

    // Warn about sandbox mode
    if (isSandbox) {
      console.log(`⚠️ Sandbox mode: Email will only be delivered if ${client.email} is the Resend account owner`);
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      sandbox_mode: isSandbox,
      email_id: emailResult.data?.id
    });

  } catch (error) {
    console.error('Error sending form email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Generate AI personalized questions based on previous responses
router.post('/generate-questions', async (req, res) => {
  try {
    const { prompt, questionCount = 3, previousResponses, formId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check if Gemini is configured
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      // Return fallback questions if AI not configured
      console.log('[generate-questions] No Gemini API key, using fallback questions');
      return res.json({
        questions: generateFallbackQuestions(questionCount, previousResponses)
      });
    }

    // Build the AI prompt
    const responseSummary = Object.entries(previousResponses || {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const aiPrompt = `You are a healthcare intake form assistant. Based on a client's previous responses, generate ${questionCount} personalized follow-up questions.

Previous Responses:
${responseSummary || 'No previous responses provided'}

Instructions from the health professional:
${prompt}

Generate exactly ${questionCount} questions that are:
1. Personalized based on the client's previous answers
2. Open-ended but specific
3. Relevant to understanding their health journey
4. Written in a warm, professional tone

Return ONLY a JSON array of question objects with this format:
[
  {
    "question": "Your question text here?",
    "type": "textarea"
  }
]

Do not include any other text, just the JSON array.`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: aiPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      console.error('[generate-questions] Gemini API error:', response.status);
      return res.json({
        questions: generateFallbackQuestions(questionCount, previousResponses)
      });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON from AI response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiText;
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const questions = JSON.parse(jsonStr);

      // Validate and clean up questions
      const validQuestions = questions
        .slice(0, questionCount)
        .map(q => ({
          question: q.question || 'Please share more about your health goals.',
          type: q.type || 'textarea',
          options: q.options || null
        }));

      res.json({ questions: validQuestions });

    } catch (parseError) {
      console.error('[generate-questions] Failed to parse AI response:', parseError);
      res.json({
        questions: generateFallbackQuestions(questionCount, previousResponses)
      });
    }

  } catch (error) {
    console.error('[generate-questions] Error:', error);
    res.json({
      questions: generateFallbackQuestions(3, {})
    });
  }
});

// Helper function for fallback questions
function generateFallbackQuestions(count, responses) {
  const questions = [
    { question: 'What are your main health goals that you would like to achieve?', type: 'textarea' },
    { question: 'Are there any specific health concerns you would like to discuss?', type: 'textarea' },
    { question: 'What changes have you noticed in your health recently?', type: 'textarea' },
    { question: 'What does optimal health look like for you?', type: 'textarea' },
    { question: 'Is there anything else you would like us to know before your consultation?', type: 'textarea' }
  ];

  return questions.slice(0, count);
}

module.exports = router;
