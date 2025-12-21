/**
 * Audit Logs API
 * Provides endpoints for viewing and searching audit logs (admin only)
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Use the existing requireRole middleware for admin access
const requireAdmin = requireRole('admin');

/**
 * GET /api/audit/logs
 * Get audit logs with filtering and pagination
 */
router.get('/logs', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      event_type,
      event_category,
      user_id,
      resource_type,
      resource_id,
      contains_phi,
      status,
      start_date,
      end_date,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (event_type) {
      paramCount++;
      conditions.push(`event_type = $${paramCount}`);
      params.push(event_type);
    }

    if (event_category) {
      paramCount++;
      conditions.push(`event_category = $${paramCount}`);
      params.push(event_category);
    }

    if (user_id) {
      paramCount++;
      conditions.push(`user_id = $${paramCount}`);
      params.push(parseInt(user_id));
    }

    if (resource_type) {
      paramCount++;
      conditions.push(`resource_type = $${paramCount}`);
      params.push(resource_type);
    }

    if (resource_id) {
      paramCount++;
      conditions.push(`resource_id = $${paramCount}`);
      params.push(resource_id);
    }

    if (contains_phi === 'true') {
      conditions.push('contains_phi = true');
    } else if (contains_phi === 'false') {
      conditions.push('contains_phi = false');
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      params.push(new Date(start_date));
    }

    if (end_date) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      params.push(new Date(end_date));
    }

    if (search) {
      paramCount++;
      conditions.push(`(
        user_email ILIKE $${paramCount} OR
        resource_name ILIKE $${paramCount} OR
        action ILIKE $${paramCount} OR
        action_description ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get logs
    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(offset);

    const logsQuery = `
      SELECT
        event_id,
        event_type,
        event_category,
        user_id,
        user_email,
        user_role,
        ip_address,
        resource_type,
        resource_id,
        resource_name,
        action,
        action_description,
        contains_phi,
        phi_types,
        status,
        error_message,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const logsResult = await db.query(logsQuery, params);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Audit API] Error fetching logs:', error);
    next(error);
  }
});

/**
 * GET /api/audit/logs/:eventId
 * Get detailed audit log entry
 */
router.get('/logs/:eventId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      'SELECT * FROM audit_logs WHERE event_id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json({ log: result.rows[0] });

  } catch (error) {
    console.error('[Audit API] Error fetching log detail:', error);
    next(error);
  }
});

/**
 * GET /api/audit/phi-access
 * Get PHI access logs (for compliance reporting)
 */
router.get('/phi-access', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      start_date,
      end_date,
      user_id
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [parseInt(limit), offset];
    const conditions = ['contains_phi = true'];
    let paramCount = 2;

    if (start_date) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      params.push(new Date(start_date));
    }

    if (end_date) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      params.push(new Date(end_date));
    }

    if (user_id) {
      paramCount++;
      conditions.push(`user_id = $${paramCount}`);
      params.push(parseInt(user_id));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        event_id,
        created_at,
        user_email,
        user_role,
        ip_address,
        event_type,
        action,
        resource_type,
        resource_id,
        resource_name,
        phi_types,
        status
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, params);

    // Get count for pagination
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await db.query(countQuery, params.slice(2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Audit API] Error fetching PHI access logs:', error);
    next(error);
  }
});

/**
 * GET /api/audit/summary
 * Get audit summary statistics
 */
router.get('/summary', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get summary statistics
    const summaryQuery = `
      SELECT
        event_type,
        event_category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE contains_phi = true) as phi_count,
        COUNT(*) FILTER (WHERE status = 'failure') as failure_count
      FROM audit_logs
      WHERE created_at >= $1
      GROUP BY event_type, event_category
      ORDER BY count DESC
    `;

    const summaryResult = await db.query(summaryQuery, [startDate]);

    // Get user activity summary
    const userActivityQuery = `
      SELECT
        user_id,
        user_email,
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE contains_phi = true) as phi_accesses,
        COUNT(*) FILTER (WHERE event_type = 'login') as logins,
        MAX(created_at) as last_activity
      FROM audit_logs
      WHERE created_at >= $1 AND user_id IS NOT NULL
      GROUP BY user_id, user_email
      ORDER BY total_actions DESC
      LIMIT 20
    `;

    const userActivityResult = await db.query(userActivityQuery, [startDate]);

    // Get daily activity trend
    const trendQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE contains_phi = true) as phi_accesses
      FROM audit_logs
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const trendResult = await db.query(trendQuery, [startDate]);

    // Get failed actions
    const failedQuery = `
      SELECT
        event_type,
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= $1 AND status = 'failure'
      GROUP BY event_type, action
      ORDER BY count DESC
      LIMIT 10
    `;

    const failedResult = await db.query(failedQuery, [startDate]);

    res.json({
      period: {
        start: startDate,
        end: new Date(),
        days: parseInt(days)
      },
      summary: summaryResult.rows,
      userActivity: userActivityResult.rows,
      dailyTrend: trendResult.rows,
      failedActions: failedResult.rows
    });

  } catch (error) {
    console.error('[Audit API] Error fetching summary:', error);
    next(error);
  }
});

/**
 * GET /api/audit/user/:userId
 * Get all activity for a specific user
 */
router.get('/user/:userId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db.query(
      `SELECT
        event_id,
        event_type,
        event_category,
        resource_type,
        resource_id,
        resource_name,
        action,
        action_description,
        contains_phi,
        ip_address,
        status,
        created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM audit_logs WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Audit API] Error fetching user activity:', error);
    next(error);
  }
});

/**
 * GET /api/audit/resource/:resourceType/:resourceId
 * Get all activity for a specific resource
 */
router.get('/resource/:resourceType/:resourceId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;

    const result = await db.query(
      `SELECT
        event_id,
        event_type,
        user_email,
        action,
        action_description,
        changed_fields,
        status,
        created_at
      FROM audit_logs
      WHERE resource_type = $1 AND resource_id = $2
      ORDER BY created_at DESC
      LIMIT 100`,
      [resourceType, resourceId]
    );

    res.json({ logs: result.rows });

  } catch (error) {
    console.error('[Audit API] Error fetching resource activity:', error);
    next(error);
  }
});

/**
 * POST /api/audit/export
 * Export audit logs for compliance reporting
 */
router.post('/export', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { start_date, end_date, format = 'json', include_phi_only = false } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    let query = `
      SELECT * FROM audit_logs
      WHERE created_at >= $1 AND created_at <= $2
    `;

    if (include_phi_only) {
      query += ' AND contains_phi = true';
    }

    query += ' ORDER BY created_at ASC';

    const result = await db.query(query, [new Date(start_date), new Date(end_date)]);

    // Log this export action
    const auditLogger = require('../services/auditLogger');
    await auditLogger.logExport(
      req,
      'audit_log',
      null,
      `Audit logs ${start_date} to ${end_date}`,
      format
    );

    if (format === 'csv') {
      // Generate CSV
      const fields = [
        'event_id', 'created_at', 'event_type', 'event_category',
        'user_email', 'ip_address', 'resource_type', 'resource_id',
        'action', 'contains_phi', 'status'
      ];

      const csv = [
        fields.join(','),
        ...result.rows.map(row =>
          fields.map(f => `"${(row[f] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${start_date}-${end_date}.csv`);
      return res.send(csv);
    }

    res.json({
      export: {
        start_date,
        end_date,
        total_records: result.rows.length,
        exported_at: new Date()
      },
      logs: result.rows
    });

  } catch (error) {
    console.error('[Audit API] Error exporting logs:', error);
    next(error);
  }
});

module.exports = router;
