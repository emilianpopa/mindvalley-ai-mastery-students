const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

const router = express.Router();
router.use(authenticateToken);

// ============================================
// GET ALL SCHEDULED MESSAGES FOR A CLIENT
// ============================================
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT sm.*,
             c.first_name as client_first_name,
             c.last_name as client_last_name,
             c.email as client_email,
             c.phone as client_phone,
             u.first_name as created_by_first_name,
             u.last_name as created_by_last_name
      FROM scheduled_messages sm
      LEFT JOIN clients c ON sm.client_id = c.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.client_id = $1
    `;
    const params = [clientId];

    if (status) {
      query += ` AND sm.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY sm.scheduled_for ASC`;

    const result = await db.query(query, params);

    res.json({
      messages: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
});

// ============================================
// GET UPCOMING MESSAGES (for dashboard/notifications)
// ============================================
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(`
      SELECT sm.*,
             c.first_name as client_first_name,
             c.last_name as client_last_name,
             c.email as client_email,
             c.phone as client_phone
      FROM scheduled_messages sm
      LEFT JOIN clients c ON sm.client_id = c.id
      WHERE sm.status = 'pending'
        AND sm.scheduled_for >= NOW()
      ORDER BY sm.scheduled_for ASC
      LIMIT $1
    `, [limit]);

    res.json({
      messages: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching upcoming messages:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming messages' });
  }
});

// ============================================
// CREATE SCHEDULED MESSAGE
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      client_id,
      channel,
      message_content,
      scheduled_for,
      message_type = 'check_in',
      engagement_plan_id = null,
      phase_number = null
    } = req.body;
    const userId = req.user.id;

    if (!client_id || !channel || !message_content || !scheduled_for) {
      return res.status(400).json({
        error: 'client_id, channel, message_content, and scheduled_for are required'
      });
    }

    // Validate channel
    const validChannels = ['whatsapp', 'email', 'sms'];
    if (!validChannels.includes(channel.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid channel. Must be whatsapp, email, or sms'
      });
    }

    // Get client info for the message
    const clientResult = await db.query(
      'SELECT first_name, last_name, email, phone FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    const result = await db.query(`
      INSERT INTO scheduled_messages
        (client_id, channel, message_content, scheduled_for, message_type,
         engagement_plan_id, phase_number, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *
    `, [client_id, channel.toLowerCase(), message_content, scheduled_for,
        message_type, engagement_plan_id, phase_number, userId]);

    res.status(201).json({
      message: result.rows[0],
      client: {
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone
      }
    });
  } catch (error) {
    console.error('Error creating scheduled message:', error);
    res.status(500).json({ error: 'Failed to create scheduled message' });
  }
});

// ============================================
// CREATE BULK MESSAGES FROM ENGAGEMENT PLAN
// ============================================
router.post('/bulk-from-plan', async (req, res) => {
  try {
    const {
      client_id,
      engagement_plan_id,
      channel,
      start_date,
      check_in_frequency,
      message_tone
    } = req.body;
    const userId = req.user.id;

    if (!client_id || !engagement_plan_id || !channel || !start_date) {
      return res.status(400).json({
        error: 'client_id, engagement_plan_id, channel, and start_date are required'
      });
    }

    // Get client info
    const clientResult = await db.query(
      'SELECT first_name, last_name FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];
    const clientName = client.first_name;

    // Get engagement plan
    const planResult = await db.query(
      'SELECT ai_recommendations FROM protocols WHERE id = $1',
      [engagement_plan_id]
    );

    if (planResult.rows.length === 0 || !planResult.rows[0].ai_recommendations) {
      return res.status(404).json({ error: 'Engagement plan not found' });
    }

    let planData;
    try {
      planData = JSON.parse(planResult.rows[0].ai_recommendations);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid engagement plan data' });
    }

    // Calculate frequency in days
    const frequencyDays = {
      'Daily': 1,
      'Every 2 days': 2,
      'Every 3 days': 3,
      'Twice a week': 3.5,
      'Weekly': 7,
      'Bi-weekly': 14,
      'Monthly': 30
    };

    const daysBetween = frequencyDays[check_in_frequency] || 3;

    // Generate messages for each phase
    const messages = [];
    let currentDate = new Date(start_date);

    if (planData.phases) {
      planData.phases.forEach((phase, phaseIndex) => {
        // Phase start message
        const phaseStartMessage = generatePhaseMessage(
          clientName,
          phase,
          phaseIndex + 1,
          'start',
          message_tone
        );

        messages.push({
          client_id,
          channel: channel.toLowerCase(),
          message_content: phaseStartMessage,
          scheduled_for: new Date(currentDate),
          message_type: 'phase_start',
          engagement_plan_id,
          phase_number: phaseIndex + 1
        });

        // Check-in messages during phase (assume each phase is ~1 week)
        const checkInsPerPhase = Math.floor(7 / daysBetween);
        for (let i = 1; i <= checkInsPerPhase; i++) {
          currentDate.setDate(currentDate.getDate() + daysBetween);

          const checkInMessage = generateCheckInMessage(
            clientName,
            phase,
            phaseIndex + 1,
            i,
            message_tone
          );

          messages.push({
            client_id,
            channel: channel.toLowerCase(),
            message_content: checkInMessage,
            scheduled_for: new Date(currentDate),
            message_type: 'check_in',
            engagement_plan_id,
            phase_number: phaseIndex + 1
          });
        }

        // Move to next week for next phase
        currentDate.setDate(currentDate.getDate() + daysBetween);
      });
    }

    // Insert all messages
    const insertedMessages = [];
    for (const msg of messages) {
      const result = await db.query(`
        INSERT INTO scheduled_messages
          (client_id, channel, message_content, scheduled_for, message_type,
           engagement_plan_id, phase_number, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
        RETURNING *
      `, [msg.client_id, msg.channel, msg.message_content, msg.scheduled_for,
          msg.message_type, msg.engagement_plan_id, msg.phase_number, userId]);

      insertedMessages.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      messages_created: insertedMessages.length,
      messages: insertedMessages
    });
  } catch (error) {
    console.error('Error creating bulk messages:', error);
    res.status(500).json({ error: 'Failed to create scheduled messages' });
  }
});

// ============================================
// UPDATE SCHEDULED MESSAGE
// ============================================
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message_content, scheduled_for, status } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (message_content !== undefined) {
      updates.push(`message_content = $${paramCount++}`);
      values.push(message_content);
    }
    if (scheduled_for !== undefined) {
      updates.push(`scheduled_for = $${paramCount++}`);
      values.push(scheduled_for);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(messageId);

    const result = await db.query(`
      UPDATE scheduled_messages
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error updating scheduled message:', error);
    res.status(500).json({ error: 'Failed to update scheduled message' });
  }
});

// ============================================
// DELETE SCHEDULED MESSAGE
// ============================================
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await db.query(
      'DELETE FROM scheduled_messages WHERE id = $1 RETURNING *',
      [messageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      success: true,
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting scheduled message:', error);
    res.status(500).json({ error: 'Failed to delete scheduled message' });
  }
});

// ============================================
// SEND MESSAGE NOW (triggers n8n webhook)
// ============================================
router.post('/:messageId/send', async (req, res) => {
  try {
    const { messageId } = req.params;

    // Get message details
    const msgResult = await db.query(`
      SELECT sm.*,
             c.first_name, c.last_name, c.email, c.phone
      FROM scheduled_messages sm
      LEFT JOIN clients c ON sm.client_id = c.id
      WHERE sm.id = $1
    `, [messageId]);

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = msgResult.rows[0];

    // Call n8n webhook to send the message
    const n8nWebhookUrl = process.env.N8N_MESSAGE_WEBHOOK_URL;

    if (n8nWebhookUrl) {
      try {
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: message.id,
            channel: message.channel,
            recipient: {
              name: `${message.first_name} ${message.last_name}`,
              email: message.email,
              phone: message.phone
            },
            content: message.message_content,
            message_type: message.message_type
          })
        });

        if (webhookResponse.ok) {
          // Update message status to sent
          await db.query(
            'UPDATE scheduled_messages SET status = $1, sent_at = NOW() WHERE id = $2',
            ['sent', messageId]
          );

          res.json({
            success: true,
            message: 'Message sent successfully',
            webhook_response: await webhookResponse.json()
          });
        } else {
          throw new Error('Webhook returned error');
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);

        // Update status to failed
        await db.query(
          'UPDATE scheduled_messages SET status = $1 WHERE id = $2',
          ['failed', messageId]
        );

        res.status(500).json({
          error: 'Failed to send message via webhook',
          details: webhookError.message
        });
      }
    } else {
      // No webhook configured - just mark as sent (demo mode)
      await db.query(
        'UPDATE scheduled_messages SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', messageId]
      );

      res.json({
        success: true,
        message: 'Message marked as sent (no webhook configured)',
        demo_mode: true
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// WEBHOOK ENDPOINT FOR N8N TO PROCESS DUE MESSAGES
// ============================================
router.get('/due', async (req, res) => {
  try {
    // Get messages that are due to be sent (scheduled time has passed)
    const result = await db.query(`
      SELECT sm.*,
             c.first_name, c.last_name, c.email, c.phone
      FROM scheduled_messages sm
      LEFT JOIN clients c ON sm.client_id = c.id
      WHERE sm.status = 'pending'
        AND sm.scheduled_for <= NOW()
      ORDER BY sm.scheduled_for ASC
      LIMIT 50
    `);

    res.json({
      due_messages: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching due messages:', error);
    res.status(500).json({ error: 'Failed to fetch due messages' });
  }
});

// Helper functions for message generation
function generatePhaseMessage(clientName, phase, phaseNum, type, tone) {
  const toneStyles = {
    'Encouraging and supportive': {
      greeting: `Hi ${clientName}! `,
      emoji: '💪',
      closing: 'You\'ve got this!'
    },
    'Professional and informative': {
      greeting: `Hello ${clientName}, `,
      emoji: '',
      closing: 'Please reach out if you have any questions.'
    },
    'Friendly and casual': {
      greeting: `Hey ${clientName}! `,
      emoji: '🌟',
      closing: 'Chat soon!'
    },
    'Motivational and energetic': {
      greeting: `${clientName}! `,
      emoji: '🚀',
      closing: 'Let\'s make it happen!'
    },
    'Calm and reassuring': {
      greeting: `Dear ${clientName}, `,
      emoji: '🌿',
      closing: 'Take it one step at a time.'
    },
    'Direct and concise': {
      greeting: `${clientName}, `,
      emoji: '',
      closing: ''
    }
  };

  const style = toneStyles[tone] || toneStyles['Encouraging and supportive'];

  if (type === 'start') {
    return `${style.greeting}${style.emoji}\n\nWe're starting ${phase.title}!\n\n` +
           `Focus areas for this phase:\n${(phase.items || []).slice(0, 3).map(item => `• ${item}`).join('\n')}\n\n` +
           `${phase.progress_goal ? `Goal: ${phase.progress_goal}\n\n` : ''}` +
           `${style.closing}`;
  }

  return `${style.greeting}${style.emoji}\n\nQuick check-in for ${phase.title}.\n\n` +
         `${style.closing}`;
}

function generateCheckInMessage(clientName, phase, phaseNum, checkInNum, tone) {
  const toneStyles = {
    'Encouraging and supportive': {
      greeting: `Hi ${clientName}! `,
      questions: phase.check_in_prompts || ['How are you feeling today?', 'Any wins to share?'],
      emoji: '💫',
      closing: 'Keep up the great work!'
    },
    'Professional and informative': {
      greeting: `Hello ${clientName}, `,
      questions: phase.check_in_prompts || ['How is your progress?'],
      emoji: '',
      closing: 'Please update us on your progress.'
    },
    'Friendly and casual': {
      greeting: `Hey ${clientName}! `,
      questions: phase.check_in_prompts || ['How\'s it going?', 'Anything I can help with?'],
      emoji: '😊',
      closing: 'Talk soon!'
    },
    'Motivational and energetic': {
      greeting: `${clientName}! `,
      questions: phase.check_in_prompts || ['Ready to crush it today?', 'What wins have you had?'],
      emoji: '⚡',
      closing: 'You\'re doing amazing!'
    },
    'Calm and reassuring': {
      greeting: `Dear ${clientName}, `,
      questions: phase.check_in_prompts || ['How are you feeling?', 'Is there anything you need support with?'],
      emoji: '🌸',
      closing: 'Remember, progress takes time.'
    },
    'Direct and concise': {
      greeting: `${clientName}, `,
      questions: phase.check_in_prompts || ['Status update?'],
      emoji: '',
      closing: ''
    }
  };

  const style = toneStyles[tone] || toneStyles['Encouraging and supportive'];
  const question = style.questions[checkInNum % style.questions.length] || style.questions[0];

  return `${style.greeting}${style.emoji}\n\n` +
         `Check-in #${checkInNum} for Phase ${phaseNum}\n\n` +
         `${question}\n\n` +
         `${style.closing}`;
}

module.exports = router;
