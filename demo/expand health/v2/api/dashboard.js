/**
 * Dashboard API Routes
 * Provides aggregated stats for the dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenant');
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

// Apply auth and tenant context to all dashboard routes
router.use(authenticateToken);
router.use(setTenantContext);

// Get dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    // Build tenant filter for queries
    const tenantFilter = (!req.user.isPlatformAdmin && req.tenant?.id)
      ? { where: 'WHERE tenant_id = $1', params: [req.tenant.id] }
      : { where: '', params: [] };

    // Get client stats (with tenant filtering)
    const clientsResult = await db.query(`
      SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM clients
      ${tenantFilter.where}
    `, tenantFilter.params);

    // Get labs stats (with tenant filtering)
    const labsResult = await db.query(`
      SELECT COUNT(*) as total_labs
      FROM labs
      ${tenantFilter.where}
    `, tenantFilter.params);

    // Get protocols stats (with tenant filtering)
    const protocolsResult = await db.query(`
      SELECT
        COUNT(*) as total_protocols,
        COUNT(*) FILTER (WHERE status = 'active') as active_protocols
      FROM protocols
      ${tenantFilter.where}
    `, tenantFilter.params);

    // Get engagement plans count (protocols with ai_recommendations, with tenant filtering)
    const engagementPlansResult = await db.query(`
      SELECT COUNT(*) as total_engagement_plans
      FROM protocols
      ${tenantFilter.where ? tenantFilter.where + ' AND' : 'WHERE'}
      ai_recommendations IS NOT NULL AND TRIM(ai_recommendations) != ''
    `, tenantFilter.params);

    // Get KB documents count (5 sample + uploaded)
    const uploadedDocuments = loadUploadedDocuments();
    const kbDocumentsCount = 5 + uploadedDocuments.length;

    // User info is already available from auth middleware
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
        firstName: req.user.firstName || 'User',
        lastName: req.user.lastName || ''
      },
      tenant: req.tenant ? {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug
      } : null
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
});

// Get recent activity
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Build tenant filter for queries
    const tenantFilter = (!req.user.isPlatformAdmin && req.tenant?.id)
      ? { where: 'WHERE c.tenant_id = $2', clientWhere: 'WHERE tenant_id = $2', params: [limit, req.tenant.id] }
      : { where: '', clientWhere: '', params: [limit] };

    // Get recent clients (with tenant filtering)
    const recentClients = await db.query(`
      SELECT
        'client' as type,
        id,
        first_name || ' ' || last_name as title,
        'New client added' as description,
        created_at as timestamp
      FROM clients
      ${tenantFilter.clientWhere}
      ORDER BY created_at DESC
      LIMIT $1
    `, tenantFilter.params);

    // Get recent labs (with tenant filtering)
    const recentLabs = await db.query(`
      SELECT
        'lab' as type,
        l.id,
        l.title,
        'Lab uploaded for ' || c.first_name || ' ' || c.last_name as description,
        l.created_at as timestamp
      FROM labs l
      LEFT JOIN clients c ON l.client_id = c.id
      ${tenantFilter.where}
      ORDER BY l.created_at DESC
      LIMIT $1
    `, tenantFilter.params);

    // Get recent protocols (with tenant filtering)
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
      ${tenantFilter.where.replace('c.tenant_id', 'p.tenant_id')}
      ORDER BY p.created_at DESC
      LIMIT $1
    `, tenantFilter.params);

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
