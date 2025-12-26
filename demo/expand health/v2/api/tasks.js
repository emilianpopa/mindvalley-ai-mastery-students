/**
 * Staff Tasks API Routes
 * Handles CRUD operations for internal to-do list / task management
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// TASKS CRUD
// ============================================

/**
 * GET /api/tasks
 * List all tasks for the tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, assigned_to, client_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        t.*,
        s.first_name as assigned_staff_first_name,
        s.last_name as assigned_staff_last_name,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name
      FROM staff_tasks t
      LEFT JOIN staff s ON t.assigned_to = s.id
      LEFT JOIN users u ON t.assigned_to_user = u.id
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      if (status === 'active') {
        query += ` AND t.status IN ('pending', 'in_progress')`;
      } else {
        query += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    if (assigned_to) {
      query += ` AND (t.assigned_to = $${paramIndex} OR t.assigned_to_user = $${paramIndex})`;
      params.push(assigned_to);
      paramIndex++;
    }

    if (client_id) {
      query += ` AND t.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    query += ` ORDER BY
      CASE t.status
        WHEN 'pending' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'cancelled' THEN 4
      END,
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    `;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM staff_tasks t WHERE t.tenant_id = $1`;
    const countParams = [tenantId];
    let countParamIndex = 2;

    if (status) {
      if (status === 'active') {
        countQuery += ` AND t.status IN ('pending', 'in_progress')`;
      } else {
        countQuery += ` AND t.status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }
    }

    const countResult = await db.query(countQuery, countParams);

    // Format tasks with computed fields
    const tasks = result.rows.map(task => ({
      ...task,
      assigned_to_name: task.assigned_staff_first_name
        ? `${task.assigned_staff_first_name} ${task.assigned_staff_last_name}`.trim()
        : task.assigned_user_first_name
          ? `${task.assigned_user_first_name} ${task.assigned_user_last_name}`.trim()
          : null,
      client_name: task.client_first_name
        ? `${task.client_first_name} ${task.client_last_name}`.trim()
        : null,
      created_by_name: task.creator_first_name
        ? `${task.creator_first_name} ${task.creator_last_name}`.trim()
        : null
    }));

    res.json({
      tasks,
      total: parseInt(countResult.rows[0].count),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/:id
 * Get single task
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        t.*,
        s.first_name as assigned_staff_first_name,
        s.last_name as assigned_staff_last_name,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        c.first_name as client_first_name,
        c.last_name as client_last_name
      FROM staff_tasks t
      LEFT JOIN staff s ON t.assigned_to = s.id
      LEFT JOIN users u ON t.assigned_to_user = u.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];
    task.assigned_to_name = task.assigned_staff_first_name
      ? `${task.assigned_staff_first_name} ${task.assigned_staff_last_name}`.trim()
      : task.assigned_user_first_name
        ? `${task.assigned_user_first_name} ${task.assigned_user_last_name}`.trim()
        : null;
    task.client_name = task.client_first_name
      ? `${task.client_first_name} ${task.client_last_name}`.trim()
      : null;

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const {
      title,
      description,
      due_date,
      priority = 'medium',
      assigned_to,
      assigned_to_user,
      client_id,
      appointment_id,
      send_reminder = false,
      reminder_time
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await db.query(`
      INSERT INTO staff_tasks (
        tenant_id, title, description, due_date, priority,
        assigned_to, assigned_to_user, client_id, appointment_id,
        send_reminder, reminder_time, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      tenantId,
      title.trim(),
      description || null,
      due_date || null,
      priority,
      assigned_to || null,
      assigned_to_user || null,
      client_id || null,
      appointment_id || null,
      send_reminder,
      reminder_time || null,
      userId
    ]);

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const {
      title,
      description,
      due_date,
      priority,
      status,
      assigned_to,
      assigned_to_user,
      client_id,
      appointment_id,
      send_reminder,
      reminder_time
    } = req.body;

    const result = await db.query(`
      UPDATE staff_tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        assigned_to_user = COALESCE($7, assigned_to_user),
        client_id = COALESCE($8, client_id),
        appointment_id = COALESCE($9, appointment_id),
        send_reminder = COALESCE($10, send_reminder),
        reminder_time = COALESCE($11, reminder_time),
        updated_at = NOW()
      WHERE id = $12 AND tenant_id = $13
      RETURNING *
    `, [
      title, description, due_date, priority, status,
      assigned_to, assigned_to_user, client_id, appointment_id,
      send_reminder, reminder_time,
      id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Mark task as completed
 */
router.patch('/:id/complete', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE staff_tasks SET
        status = 'completed',
        completed_at = NOW(),
        completed_by = $1,
        updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [userId, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/reopen
 * Reopen a completed task
 */
router.patch('/:id/reopen', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE staff_tasks SET
        status = 'pending',
        completed_at = NULL,
        completed_by = NULL,
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM staff_tasks WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true, deleted_id: id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
