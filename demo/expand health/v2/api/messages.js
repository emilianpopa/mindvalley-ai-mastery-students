/**
 * Messages API Routes
 * Handles customer messaging through email, SMS, and in-app channels
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// ========================================
// GET ALL MESSAGES (with filters)
// ========================================
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      channel,
      direction,
      page = 1,
      limit = 50,
      sortBy = 'sent_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (client_id) {
      paramCount++;
      whereConditions.push(`client_id = $${paramCount}`);
      queryParams.push(client_id);
    }

    if (channel) {
      paramCount++;
      whereConditions.push(`channel = $${paramCount}`);
      queryParams.push(channel);
    }

    if (direction) {
      paramCount++;
      whereConditions.push(`direction = $${paramCount}`);
      queryParams.push(direction);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM messages ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get messages
    const validSortColumns = ['sent_at', 'created_at', 'channel'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'sent_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryParams.push(limit, offset);

    const messagesQuery = `
      SELECT
        m.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM messages m
      LEFT JOIN clients c ON m.client_id = c.id
      ${whereClause}
      ORDER BY m.${sortColumn} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await db.query(messagesQuery, queryParams);

    res.json({
      messages: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    next(error);
  }
});

// ========================================
// GET MESSAGES FOR A CLIENT
// ========================================
router.get('/client/:clientId', authenticateToken, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { channel, limit = 100 } = req.query;

    let whereClause = 'WHERE client_id = $1';
    let queryParams = [clientId];

    if (channel && channel !== 'all') {
      whereClause += ' AND channel = $2';
      queryParams.push(channel);
    }

    const result = await db.query(`
      SELECT * FROM messages
      ${whereClause}
      ORDER BY sent_at ASC
      LIMIT $${queryParams.length + 1}
    `, [...queryParams, limit]);

    res.json({ messages: result.rows });

  } catch (error) {
    console.error('Error fetching client messages:', error);
    next(error);
  }
});

// ========================================
// GET SINGLE MESSAGE
// ========================================
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        m.*,
        c.first_name || ' ' || c.last_name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM messages m
      LEFT JOIN clients c ON m.client_id = c.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });

  } catch (error) {
    console.error('Error fetching message:', error);
    next(error);
  }
});

// ========================================
// CREATE NEW MESSAGE
// ========================================
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      client_id,
      channel = 'email',
      direction = 'outbound',
      subject,
      content,
      to_email,
      to_phone,
      metadata
    } = req.body;

    // Validation
    if (!client_id || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['client_id', 'content']
      });
    }

    // Validate channel
    const validChannels = ['email', 'sms', 'in-app'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        error: 'Invalid channel',
        validChannels
      });
    }

    // Get client info if email/phone not provided
    let targetEmail = to_email;
    let targetPhone = to_phone;

    if (!targetEmail || !targetPhone) {
      const clientResult = await db.query(
        'SELECT email, phone FROM clients WHERE id = $1',
        [client_id]
      );
      if (clientResult.rows.length > 0) {
        targetEmail = targetEmail || clientResult.rows[0].email;
        targetPhone = targetPhone || clientResult.rows[0].phone;
      }
    }

    const result = await db.query(`
      INSERT INTO messages (
        client_id, channel, direction, subject, content,
        to_email, to_phone, status, sent_at, sent_by, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10)
      RETURNING *
    `, [
      client_id,
      channel,
      direction,
      subject,
      content,
      targetEmail,
      targetPhone,
      'sent',
      req.user.userId,
      metadata ? JSON.stringify(metadata) : null
    ]);

    // TODO: Actually send the message via email/SMS service
    // For now, just store it in the database

    res.status(201).json({
      message: 'Message sent successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error sending message:', error);
    next(error);
  }
});

// ========================================
// UPDATE MESSAGE (mark as read, etc.)
// ========================================
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, read_at } = req.body;

    const result = await db.query(`
      UPDATE messages SET
        status = COALESCE($1, status),
        read_at = COALESCE($2, read_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, read_at, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      message: 'Message updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating message:', error);
    next(error);
  }
});

// ========================================
// DELETE MESSAGE
// ========================================
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM messages WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error deleting message:', error);
    next(error);
  }
});

// ========================================
// GET UNREAD COUNT
// ========================================
router.get('/stats/unread', authenticateToken, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE direction = 'inbound' AND read_at IS NULL) as unread_count,
        COUNT(*) FILTER (WHERE direction = 'inbound') as total_inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound') as total_outbound
      FROM messages
    `);

    res.json({
      unread: parseInt(result.rows[0].unread_count) || 0,
      totalInbound: parseInt(result.rows[0].total_inbound) || 0,
      totalOutbound: parseInt(result.rows[0].total_outbound) || 0
    });

  } catch (error) {
    console.error('Error fetching message stats:', error);
    next(error);
  }
});

// ========================================
// GET RECENT CONVERSATIONS
// ========================================
router.get('/conversations/recent', authenticateToken, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    // Get the most recent message for each client
    const result = await db.query(`
      WITH RankedMessages AS (
        SELECT
          m.*,
          c.first_name,
          c.last_name,
          c.email as client_email,
          c.phone as client_phone,
          ROW_NUMBER() OVER (PARTITION BY m.client_id ORDER BY m.sent_at DESC) as rn
        FROM messages m
        LEFT JOIN clients c ON m.client_id = c.id
      )
      SELECT * FROM RankedMessages
      WHERE rn = 1
      ORDER BY sent_at DESC
      LIMIT $1
    `, [limit]);

    // Count unread per client
    const unreadResult = await db.query(`
      SELECT client_id, COUNT(*) as unread_count
      FROM messages
      WHERE direction = 'inbound' AND read_at IS NULL
      GROUP BY client_id
    `);

    const unreadMap = {};
    unreadResult.rows.forEach(r => {
      unreadMap[r.client_id] = parseInt(r.unread_count);
    });

    const conversations = result.rows.map(row => ({
      client_id: row.client_id,
      client_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      client_email: row.client_email,
      client_phone: row.client_phone,
      last_message: row.content,
      last_message_subject: row.subject,
      last_message_channel: row.channel,
      last_message_time: row.sent_at,
      last_message_direction: row.direction,
      unread_count: unreadMap[row.client_id] || 0
    }));

    res.json({ conversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    next(error);
  }
});

module.exports = router;
