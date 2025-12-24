/**
 * Integrations API Routes
 *
 * Manages external platform integrations (Momence, Practice Better, etc.)
 * Uses Legacy API authentication (hostId + token) for Momence.
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { setTenantContext, requireClinicAdmin } = require('../middleware/tenant');

const {
  MomenceService,
  mapMomenceMemberToClient,
  mapMomenceEventToAppointment
} = require('../services/momence');

// All integration routes require authentication and admin access
router.use(authenticateToken);
router.use(setTenantContext);
router.use(requireClinicAdmin);

// ============================================
// INTEGRATION MANAGEMENT
// ============================================

/**
 * List all integrations for tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;

    const result = await db.query(`
      SELECT
        i.*,
        (SELECT COUNT(*) FROM integration_client_mappings WHERE integration_id = i.id) as client_count,
        (SELECT COUNT(*) FROM integration_appointment_mappings WHERE integration_id = i.id) as appointment_count
      FROM integrations i
      WHERE i.tenant_id = $1
      ORDER BY i.created_at DESC
    `, [tenantId]);

    // Hide sensitive fields
    const integrations = result.rows.map(i => ({
      ...i,
      access_token: i.access_token ? '********' : null
    }));

    res.json({ integrations });
  } catch (error) {
    next(error);
  }
});

/**
 * Get single integration details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const result = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = result.rows[0];

    // Get recent sync logs
    const syncLogs = await db.query(`
      SELECT * FROM integration_sync_logs
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `, [id]);

    // Get mapping counts
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM integration_client_mappings WHERE integration_id = $1) as client_count,
        (SELECT COUNT(*) FROM integration_appointment_mappings WHERE integration_id = $1) as appointment_count,
        (SELECT COUNT(*) FROM integration_client_mappings WHERE integration_id = $1 AND sync_status = 'error') as client_errors,
        (SELECT COUNT(*) FROM integration_appointment_mappings WHERE integration_id = $1 AND sync_status = 'error') as appointment_errors
    `, [id]);

    res.json({
      integration: {
        ...integration,
        access_token: integration.access_token ? '********' : null
      },
      syncLogs: syncLogs.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new integration with credentials and test connection
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    const { platform, host_id, token, sync_clients, sync_appointments, sync_direction } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    if (!host_id || !token) {
      return res.status(400).json({ error: 'Host ID and Token are required' });
    }

    // Check if integration already exists
    const existing = await db.query(`
      SELECT id FROM integrations WHERE tenant_id = $1 AND platform = $2
    `, [tenantId, platform]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Integration with ${platform} already exists. Use the update endpoint.` });
    }

    // Test the connection first
    let connectionTest = { success: false };
    if (platform === 'momence') {
      try {
        const testService = new MomenceService({
          platform_host_id: host_id,
          access_token: token
        });
        connectionTest = await testService.testConnection();
      } catch (testError) {
        return res.status(400).json({
          error: `Connection failed: ${testError.message}. Please verify your Host ID and Token.`
        });
      }
    }

    const result = await db.query(`
      INSERT INTO integrations (
        tenant_id, platform, platform_host_id, access_token,
        sync_clients, sync_appointments, sync_direction,
        status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'connected', $8)
      RETURNING *
    `, [
      tenantId,
      platform,
      host_id,
      token,
      sync_clients !== false,
      sync_appointments !== false,
      sync_direction || 'bidirectional',
      req.user.id
    ]);

    res.status(201).json({
      message: 'Integration connected successfully!',
      connected: true,
      integration: {
        ...result.rows[0],
        access_token: '********'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update integration settings and test connection
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;
    const { host_id, token, sync_clients, sync_appointments, sync_direction } = req.body;

    const existing = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = existing.rows[0];

    // Use new values or fallback to existing
    const newHostId = host_id || integration.platform_host_id;
    const newToken = token || integration.access_token;

    // Test the connection with new credentials
    let connectionTest = { success: false };
    if (integration.platform === 'momence') {
      try {
        const testService = new MomenceService({
          platform_host_id: newHostId,
          access_token: newToken
        });
        connectionTest = await testService.testConnection();
      } catch (testError) {
        return res.status(400).json({
          error: `Connection failed: ${testError.message}. Please verify your Host ID and Token.`
        });
      }
    }

    const result = await db.query(`
      UPDATE integrations
      SET
        platform_host_id = $1,
        access_token = $2,
        sync_clients = COALESCE($3, sync_clients),
        sync_appointments = COALESCE($4, sync_appointments),
        sync_direction = COALESCE($5, sync_direction),
        status = 'connected',
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [newHostId, newToken, sync_clients, sync_appointments, sync_direction, id, tenantId]);

    res.json({
      message: 'Integration updated and connected!',
      connected: true,
      integration: {
        ...result.rows[0],
        access_token: '********'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete integration
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const result = await db.query(`
      DELETE FROM integrations WHERE id = $1 AND tenant_id = $2 RETURNING id
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * Disconnect integration (clear tokens but keep settings)
 */
router.post('/:id/disconnect', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const result = await db.query(`
      UPDATE integrations
      SET
        access_token = NULL,
        status = 'disconnected',
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration disconnected' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Sync clients from external platform
 */
router.post('/:id/sync/clients', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const integrationResult = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = integrationResult.rows[0];

    if (integration.status !== 'connected') {
      return res.status(400).json({ error: 'Integration is not connected' });
    }

    // Create sync log entry
    const syncLogResult = await db.query(`
      INSERT INTO integration_sync_logs (integration_id, sync_type, direction, status)
      VALUES ($1, 'clients', 'import', 'running')
      RETURNING id
    `, [id]);
    const syncLogId = syncLogResult.rows[0].id;

    let service;
    let members = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    try {
      if (integration.platform === 'momence') {
        service = new MomenceService(integration);
        const response = await service.getMembers({ limit: 100 });
        members = response.data || response.members || response || [];
      }

      // Process each member
      for (const member of members) {
        try {
          const clientData = mapMomenceMemberToClient(member);

          // Check if mapping exists
          const mappingResult = await db.query(`
            SELECT icm.*, c.id as client_id
            FROM integration_client_mappings icm
            JOIN clients c ON c.id = icm.client_id
            WHERE icm.integration_id = $1 AND icm.external_id = $2
          `, [id, clientData.external_id]);

          if (mappingResult.rows.length > 0) {
            // Update existing client
            await db.query(`
              UPDATE clients
              SET
                first_name = $1,
                last_name = $2,
                email = $3,
                phone = $4,
                updated_at = NOW()
              WHERE id = $5
            `, [
              clientData.first_name,
              clientData.last_name,
              clientData.email,
              clientData.phone,
              mappingResult.rows[0].client_id
            ]);

            // Update mapping
            await db.query(`
              UPDATE integration_client_mappings
              SET external_data = $1, last_synced_at = NOW(), sync_status = 'synced'
              WHERE id = $2
            `, [JSON.stringify(member), mappingResult.rows[0].id]);

            updated++;
          } else {
            // Check if client with same email exists
            const existingClient = await db.query(`
              SELECT id FROM clients WHERE email = $1 AND tenant_id = $2
            `, [clientData.email, tenantId]);

            let clientId;
            if (existingClient.rows.length > 0) {
              clientId = existingClient.rows[0].id;
              // Update existing
              await db.query(`
                UPDATE clients
                SET
                  first_name = COALESCE(NULLIF($1, ''), first_name),
                  last_name = COALESCE(NULLIF($2, ''), last_name),
                  phone = COALESCE(NULLIF($3, ''), phone),
                  updated_at = NOW()
                WHERE id = $4
              `, [clientData.first_name, clientData.last_name, clientData.phone, clientId]);
              updated++;
            } else {
              // Create new client
              const newClient = await db.query(`
                INSERT INTO clients (tenant_id, first_name, last_name, email, phone, status)
                VALUES ($1, $2, $3, $4, $5, 'active')
                RETURNING id
              `, [tenantId, clientData.first_name, clientData.last_name, clientData.email, clientData.phone]);
              clientId = newClient.rows[0].id;
              created++;
            }

            // Create mapping
            await db.query(`
              INSERT INTO integration_client_mappings (integration_id, client_id, external_id, external_data)
              VALUES ($1, $2, $3, $4)
            `, [id, clientId, clientData.external_id, JSON.stringify(member)]);
          }
        } catch (memberError) {
          console.error('Error processing member:', memberError);
          failed++;
        }
      }

      // Update sync log with success
      await db.query(`
        UPDATE integration_sync_logs
        SET
          status = 'completed',
          records_processed = $1,
          records_created = $2,
          records_updated = $3,
          records_failed = $4,
          completed_at = NOW()
        WHERE id = $5
      `, [members.length, created, updated, failed, syncLogId]);

      // Update integration last sync
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(), last_sync_status = 'success'
        WHERE id = $1
      `, [id]);

      res.json({
        message: 'Client sync completed',
        processed: members.length,
        created,
        updated,
        failed
      });

    } catch (syncError) {
      // Update sync log with error
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'error', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [syncError.message, syncLogId]);

      // Update integration status
      await db.query(`
        UPDATE integrations
        SET last_sync_status = 'error', last_sync_error = $1
        WHERE id = $2
      `, [syncError.message, id]);

      throw syncError;
    }

  } catch (error) {
    next(error);
  }
});

/**
 * Sync appointments from external platform
 */
router.post('/:id/sync/appointments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const integrationResult = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = integrationResult.rows[0];

    if (integration.status !== 'connected') {
      return res.status(400).json({ error: 'Integration is not connected' });
    }

    // Create sync log entry
    const syncLogResult = await db.query(`
      INSERT INTO integration_sync_logs (integration_id, sync_type, direction, status)
      VALUES ($1, 'appointments', 'import', 'running')
      RETURNING id
    `, [id]);
    const syncLogId = syncLogResult.rows[0].id;

    let service;
    let appointments = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    try {
      if (integration.platform === 'momence') {
        service = new MomenceService(integration);

        // Get sessions for the next 30 days
        const from = new Date().toISOString().split('T')[0];
        const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const response = await service.getSessions({ from, to });
        const sessions = response.data || response.sessions || response || [];

        // Also get appointments
        const apptResponse = await service.getAppointmentReservations({ from, to });
        const appts = apptResponse.data || apptResponse.reservations || apptResponse || [];

        // Combine both
        appointments = [
          ...sessions.map(s => ({ ...s, type: 'session' })),
          ...appts.map(a => ({ ...a, type: 'appointment' }))
        ];
      }

      // Process each appointment
      for (const appt of appointments) {
        try {
          const apptData = mapMomenceEventToAppointment(appt, appt.type);

          // Check if mapping exists
          const mappingResult = await db.query(`
            SELECT * FROM integration_appointment_mappings
            WHERE integration_id = $1 AND external_id = $2
          `, [id, apptData.external_id]);

          if (mappingResult.rows.length > 0) {
            // Update existing mapping
            await db.query(`
              UPDATE integration_appointment_mappings
              SET
                title = $1,
                start_time = $2,
                end_time = $3,
                status = $4,
                external_data = $5,
                last_synced_at = NOW(),
                sync_status = 'synced'
              WHERE id = $6
            `, [
              apptData.title,
              apptData.start_time,
              apptData.end_time,
              apptData.status,
              JSON.stringify(appt),
              mappingResult.rows[0].id
            ]);
            updated++;
          } else {
            // Create new mapping
            await db.query(`
              INSERT INTO integration_appointment_mappings (
                integration_id, appointment_type, external_id,
                title, start_time, end_time, status, location, notes, external_data
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              id,
              apptData.appointment_type,
              apptData.external_id,
              apptData.title,
              apptData.start_time,
              apptData.end_time,
              apptData.status,
              apptData.location,
              apptData.notes,
              JSON.stringify(appt)
            ]);
            created++;
          }
        } catch (apptError) {
          console.error('Error processing appointment:', apptError);
          failed++;
        }
      }

      // Update sync log with success
      await db.query(`
        UPDATE integration_sync_logs
        SET
          status = 'completed',
          records_processed = $1,
          records_created = $2,
          records_updated = $3,
          records_failed = $4,
          completed_at = NOW()
        WHERE id = $5
      `, [appointments.length, created, updated, failed, syncLogId]);

      // Update integration last sync
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(), last_sync_status = 'success'
        WHERE id = $1
      `, [id]);

      res.json({
        message: 'Appointment sync completed',
        processed: appointments.length,
        created,
        updated,
        failed
      });

    } catch (syncError) {
      // Update sync log with error
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'error', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [syncError.message, syncLogId]);

      // Update integration status
      await db.query(`
        UPDATE integrations
        SET last_sync_status = 'error', last_sync_error = $1
        WHERE id = $2
      `, [syncError.message, id]);

      throw syncError;
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
