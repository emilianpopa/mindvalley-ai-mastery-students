/**
 * Dashboard API Routes
 * Provides aggregated stats for the dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');
const fs = require('fs');
const path = require('path');

// File-based storage for KB documents (same as kb.js)
const UPLOAD_STORAGE_FILE = path.join(__dirname, '..', 'data', 'uploaded-documents.json');

// Load uploaded documents from file
function loadUploadedDocuments() {
  try {
    if (fs.existsSync(UPLOAD_STORAGE_FILE)) {
      const data = fs.readFileSync(UPLOAD_STORAGE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading uploaded documents:', error);
  }
  return [];
}

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    // Get client stats
    const clientsResult = await db.query(`
      SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM clients
    `);

    // Get labs stats
    const labsResult = await db.query(`
      SELECT COUNT(*) as total_labs
      FROM labs
    `);

    // Get protocols stats
    const protocolsResult = await db.query(`
      SELECT
        COUNT(*) as total_protocols,
        COUNT(*) FILTER (WHERE status = 'active') as active_protocols
      FROM protocols
    `);

    // Get engagement plans count (protocols with ai_recommendations)
    const engagementPlansResult = await db.query(`
      SELECT COUNT(*) as total_engagement_plans
      FROM protocols
      WHERE ai_recommendations IS NOT NULL AND TRIM(ai_recommendations) != ''
    `);

    // Get KB documents count (5 sample + uploaded)
    const uploadedDocuments = loadUploadedDocuments();
    const kbDocumentsCount = 5 + uploadedDocuments.length;

    // Get user info for welcome message
    const userResult = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.user.userId]
    );

    const user = userResult.rows[0] || { first_name: 'User', last_name: '' };

    res.json({
      stats: {
        clients: {
          total: parseInt(clientsResult.rows[0].total_clients) || 0,
          active: parseInt(clientsResult.rows[0].active_clients) || 0,
          newThisMonth: parseInt(clientsResult.rows[0].new_this_month) || 0
        },
        labs: {
          total: parseInt(labsResult.rows[0].total_labs) || 0
        },
        protocols: {
          total: parseInt(protocolsResult.rows[0].total_protocols) || 0,
          active: parseInt(protocolsResult.rows[0].active_protocols) || 0
        },
        engagementPlans: {
          total: parseInt(engagementPlansResult.rows[0].total_engagement_plans) || 0
        },
        kbDocuments: kbDocumentsCount
      },
      user: {
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent clients
    const recentClients = await db.query(`
      SELECT
        'client' as type,
        id,
        first_name || ' ' || last_name as title,
        'New client added' as description,
        created_at as timestamp
      FROM clients
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    // Get recent labs
    const recentLabs = await db.query(`
      SELECT
        'lab' as type,
        l.id,
        l.title,
        'Lab uploaded for ' || c.first_name || ' ' || c.last_name as description,
        l.created_at as timestamp
      FROM labs l
      LEFT JOIN clients c ON l.client_id = c.id
      ORDER BY l.created_at DESC
      LIMIT $1
    `, [limit]);

    // Get recent protocols
    const recentProtocols = await db.query(`
      SELECT
        'protocol' as type,
        p.id,
        pt.name as title,
        'Protocol started for ' || c.first_name || ' ' || c.last_name as description,
        p.created_at as timestamp
      FROM protocols p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN protocol_templates pt ON p.template_id = pt.id
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [limit]);

    // Combine and sort by timestamp
    const allActivity = [
      ...recentClients.rows,
      ...recentLabs.rows,
      ...recentProtocols.rows
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, limit);

    res.json({ activity: allActivity });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    next(error);
  }
});

module.exports = router;
