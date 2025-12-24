/**
 * Integrations API Routes
 *
 * Manages external platform integrations (Momence, Practice Better, etc.)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { setTenantContext, requireClinicAdmin } = require('../middleware/tenant');

const {
  MomenceService,
  mapMomenceMemberToClient,
  mapClientToMomenceMember,
  mapMomenceEventToAppointment,
  generateOAuthState
} = require('../services/momence');

// All integration routes require authentication and admin access
router.use(authenticateToken);
router.use(setTenantContext);
router.use(requireClinicAdmin);

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map();

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
      client_secret: i.client_secret ? '********' : null,
      access_token: i.access_token ? '********' : null,
      refresh_token: i.refresh_token ? '********' : null
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
        client_secret: integration.client_secret ? '********' : null,
        access_token: integration.access_token ? '********' : null,
        refresh_token: integration.refresh_token ? '********' : null
      },
      syncLogs: syncLogs.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new integration (save credentials)
 */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id;
    const { platform, client_id, client_secret, sync_clients, sync_appointments, sync_direction } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    // Check if integration already exists
    const existing = await db.query(`
      SELECT id FROM integrations WHERE tenant_id = $1 AND platform = $2
    `, [tenantId, platform]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Integration with ${platform} already exists` });
    }

    const result = await db.query(`
      INSERT INTO integrations (
        tenant_id, platform, client_id, client_secret,
        sync_clients, sync_appointments, sync_direction,
        status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'disconnected', $8)
      RETURNING *
    `, [
      tenantId,
      platform,
      client_id || null,
      client_secret || null,
      sync_clients !== false,
      sync_appointments !== false,
      sync_direction || 'bidirectional',
      req.user.id
    ]);

    res.status(201).json({
      message: 'Integration created. Connect to authorize.',
      integration: {
        ...result.rows[0],
        client_secret: result.rows[0].client_secret ? '********' : null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update integration settings
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;
    const { client_id, client_secret, sync_clients, sync_appointments, sync_direction } = req.body;

    const existing = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await db.query(`
      UPDATE integrations
      SET
        client_id = COALESCE($1, client_id),
        client_secret = COALESCE($2, client_secret),
        sync_clients = COALESCE($3, sync_clients),
        sync_appointments = COALESCE($4, sync_appointments),
        sync_direction = COALESCE($5, sync_direction),
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [client_id, client_secret, sync_clients, sync_appointments, sync_direction, id, tenantId]);

    res.json({
      message: 'Integration updated',
      integration: {
        ...result.rows[0],
        client_secret: result.rows[0].client_secret ? '********' : null,
        access_token: result.rows[0].access_token ? '********' : null,
        refresh_token: result.rows[0].refresh_token ? '********' : null
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

// ============================================
// OAUTH2 FLOW
// ============================================

/**
 * Initiate OAuth2 flow - returns authorization URL
 */
router.post('/:id/connect', async (req, res, next) => {
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

    if (!integration.client_id || !integration.client_secret) {
      return res.status(400).json({ error: 'Client ID and Secret are required before connecting' });
    }

    // Generate state for CSRF protection
    const state = generateOAuthState();

    // Store state with integration info (expires in 10 minutes)
    oauthStates.set(state, {
      integrationId: id,
      tenantId: tenantId,
      userId: req.user.id,
      createdAt: Date.now()
    });

    // Clean up old states
    setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);

    // Build redirect URI
    const baseUrl = process.env.APP_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3001');
    const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;

    let authUrl;

    if (integration.platform === 'momence') {
      authUrl = MomenceService.getAuthorizationUrl(integration.client_id, redirectUri, state);
    } else {
      return res.status(400).json({ error: `OAuth not implemented for ${integration.platform}` });
    }

    // Update status to connecting
    await db.query(`
      UPDATE integrations SET status = 'connecting', updated_at = NOW() WHERE id = $1
    `, [id]);

    res.json({
      authUrl,
      message: 'Redirect user to authUrl to authorize'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth2 callback handler
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.redirect('/admin?tab=integrations&error=' + encodeURIComponent(error_description || error));
    }

    if (!state || !oauthStates.has(state)) {
      return res.redirect('/admin?tab=integrations&error=' + encodeURIComponent('Invalid or expired state'));
    }

    const stateData = oauthStates.get(state);
    oauthStates.delete(state);

    // Check state isn't too old (10 minutes)
    if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
      return res.redirect('/admin?tab=integrations&error=' + encodeURIComponent('Authorization expired'));
    }

    // Get integration
    const integrationResult = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [stateData.integrationId, stateData.tenantId]);

    if (integrationResult.rows.length === 0) {
      return res.redirect('/admin?tab=integrations&error=' + encodeURIComponent('Integration not found'));
    }

    const integration = integrationResult.rows[0];

    // Build redirect URI (must match the one used in authorization)
    const baseUrl = process.env.APP_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3001');
    const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;

    let tokens;

    if (integration.platform === 'momence') {
      tokens = await MomenceService.exchangeCodeForToken(
        code,
        integration.client_id,
        integration.client_secret,
        redirectUri
      );
    } else {
      return res.redirect('/admin?tab=integrations&error=' + encodeURIComponent('Platform not supported'));
    }

    // Calculate token expiry
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Update integration with tokens
    await db.query(`
      UPDATE integrations
      SET
        access_token = $1,
        refresh_token = $2,
        token_expires_at = $3,
        status = 'connected',
        updated_at = NOW()
      WHERE id = $4
    `, [tokens.access_token, tokens.refresh_token, tokenExpiresAt, stateData.integrationId]);

    res.redirect('/admin?tab=integrations&success=' + encodeURIComponent('Connected successfully'));
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/admin?tab=integrations&error=' + encodeURIComponent(error.message || 'Connection failed'));
  }
});

/**
 * Disconnect integration
 */
router.post('/:id/disconnect', async (req, res, next) => {
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

    // Try to logout from platform
    if (integration.access_token && integration.platform === 'momence') {
      try {
        const service = new MomenceService(integration);
        await service.logout();
      } catch (e) {
        console.warn('Failed to logout from Momence:', e.message);
      }
    }

    // Clear tokens
    await db.query(`
      UPDATE integrations
      SET
        access_token = NULL,
        refresh_token = NULL,
        token_expires_at = NULL,
        status = 'disconnected',
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Test integration connection
 */
router.post('/:id/test', async (req, res, next) => {
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

    if (!integration.access_token) {
      return res.status(400).json({ error: 'Integration not connected' });
    }

    let testResult;

    if (integration.platform === 'momence') {
      const service = new MomenceService(integration);
      testResult = await service.testConnection();
    } else {
      return res.status(400).json({ error: `Test not implemented for ${integration.platform}` });
    }

    res.json({
      success: true,
      message: 'Connection successful',
      data: testResult
    });
  } catch (error) {
    // Update status to error
    try {
      await db.query(`
        UPDATE integrations SET status = 'error', last_sync_error = $1 WHERE id = $2
      `, [error.message, req.params.id]);
    } catch (e) { /* ignore */ }

    res.status(400).json({
      success: false,
      error: error.message
    });
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
    const { direction = 'import' } = req.body;

    const result = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = result.rows[0];

    if (integration.status !== 'connected') {
      return res.status(400).json({ error: 'Integration not connected' });
    }

    // Create sync log
    const logResult = await db.query(`
      INSERT INTO integration_sync_logs (integration_id, sync_type, direction, status)
      VALUES ($1, 'clients', $2, 'running')
      RETURNING id
    `, [id, direction]);
    const syncLogId = logResult.rows[0].id;

    let stats = { processed: 0, created: 0, updated: 0, failed: 0 };

    try {
      if (integration.platform === 'momence') {
        const service = new MomenceService(integration);

        if (direction === 'import') {
          // Import from Momence
          const membersResponse = await service.getMembers();
          const members = membersResponse.members || membersResponse.data || membersResponse || [];

          for (const member of members) {
            stats.processed++;

            try {
              // Check if mapping exists
              const existingMapping = await db.query(`
                SELECT * FROM integration_client_mappings
                WHERE integration_id = $1 AND external_id = $2
              `, [id, member.id]);

              if (existingMapping.rows.length > 0) {
                // Update existing client
                const clientData = mapMomenceMemberToClient(member);
                await db.query(`
                  UPDATE clients
                  SET
                    first_name = $1,
                    last_name = $2,
                    email = COALESCE($3, email),
                    phone = COALESCE($4, phone),
                    updated_at = NOW()
                  WHERE id = $5
                `, [
                  clientData.first_name,
                  clientData.last_name,
                  clientData.email,
                  clientData.phone,
                  existingMapping.rows[0].client_id
                ]);

                // Update mapping
                await db.query(`
                  UPDATE integration_client_mappings
                  SET external_data = $1, sync_status = 'synced', last_synced_at = NOW()
                  WHERE id = $2
                `, [JSON.stringify(member), existingMapping.rows[0].id]);

                stats.updated++;
              } else {
                // Create new client
                const clientData = mapMomenceMemberToClient(member);
                const clientResult = await db.query(`
                  INSERT INTO clients (
                    tenant_id, first_name, last_name, email, phone,
                    date_of_birth, gender, status
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, 'enabled')
                  RETURNING id
                `, [
                  tenantId,
                  clientData.first_name,
                  clientData.last_name,
                  clientData.email,
                  clientData.phone,
                  clientData.date_of_birth,
                  clientData.gender
                ]);

                // Create mapping
                await db.query(`
                  INSERT INTO integration_client_mappings (
                    integration_id, client_id, external_id, external_data
                  )
                  VALUES ($1, $2, $3, $4)
                `, [id, clientResult.rows[0].id, member.id, JSON.stringify(member)]);

                stats.created++;
              }
            } catch (err) {
              console.error('Error syncing member:', member.id, err);
              stats.failed++;
            }
          }
        }
        // TODO: Implement export direction
      }

      // Update sync log with success
      await db.query(`
        UPDATE integration_sync_logs
        SET
          status = $1,
          records_processed = $2,
          records_created = $3,
          records_updated = $4,
          records_failed = $5,
          completed_at = NOW()
        WHERE id = $6
      `, [
        stats.failed > 0 ? 'partial' : 'completed',
        stats.processed, stats.created, stats.updated, stats.failed,
        syncLogId
      ]);

      // Update integration
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(), last_sync_status = $1
        WHERE id = $2
      `, [stats.failed > 0 ? 'partial' : 'success', id]);

      res.json({
        message: 'Client sync completed',
        stats
      });

    } catch (error) {
      // Update sync log with error
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'failed', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [error.message, syncLogId]);

      throw error;
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
    const { direction = 'import', startDate, endDate } = req.body;

    const result = await db.query(`
      SELECT * FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = result.rows[0];

    if (integration.status !== 'connected') {
      return res.status(400).json({ error: 'Integration not connected' });
    }

    // Create sync log
    const logResult = await db.query(`
      INSERT INTO integration_sync_logs (integration_id, sync_type, direction, status)
      VALUES ($1, 'appointments', $2, 'running')
      RETURNING id
    `, [id, direction]);
    const syncLogId = logResult.rows[0].id;

    let stats = { processed: 0, created: 0, updated: 0, failed: 0 };

    try {
      if (integration.platform === 'momence') {
        const service = new MomenceService(integration);

        if (direction === 'import') {
          // Import sessions
          const params = {};
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;

          const sessionsResponse = await service.getSessions(params);
          const sessions = sessionsResponse.sessions || sessionsResponse.data || sessionsResponse || [];

          for (const session of sessions) {
            stats.processed++;

            try {
              // Check if mapping exists
              const existingMapping = await db.query(`
                SELECT * FROM integration_appointment_mappings
                WHERE integration_id = $1 AND external_id = $2
              `, [id, session.id]);

              const appointmentData = mapMomenceEventToAppointment(session, 'session');

              if (existingMapping.rows.length > 0) {
                // Update existing
                await db.query(`
                  UPDATE integration_appointment_mappings
                  SET
                    title = $1,
                    start_time = $2,
                    end_time = $3,
                    status = $4,
                    location = $5,
                    external_data = $6,
                    sync_status = 'synced',
                    last_synced_at = NOW()
                  WHERE id = $7
                `, [
                  appointmentData.title,
                  appointmentData.start_time,
                  appointmentData.end_time,
                  appointmentData.status,
                  appointmentData.location,
                  JSON.stringify(session),
                  existingMapping.rows[0].id
                ]);

                stats.updated++;
              } else {
                // Create new mapping
                await db.query(`
                  INSERT INTO integration_appointment_mappings (
                    integration_id, appointment_type, external_id,
                    title, start_time, end_time, status, location, external_data
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                  id,
                  'session',
                  session.id,
                  appointmentData.title,
                  appointmentData.start_time,
                  appointmentData.end_time,
                  appointmentData.status,
                  appointmentData.location,
                  JSON.stringify(session)
                ]);

                stats.created++;
              }
            } catch (err) {
              console.error('Error syncing session:', session.id, err);
              stats.failed++;
            }
          }

          // Also import appointment reservations
          try {
            const appointmentsResponse = await service.getAppointmentReservations(params);
            const appointments = appointmentsResponse.appointments || appointmentsResponse.data || appointmentsResponse || [];

            for (const appointment of appointments) {
              stats.processed++;

              try {
                const existingMapping = await db.query(`
                  SELECT * FROM integration_appointment_mappings
                  WHERE integration_id = $1 AND external_id = $2
                `, [id, appointment.id]);

                const appointmentData = mapMomenceEventToAppointment(appointment, 'appointment');

                if (existingMapping.rows.length > 0) {
                  await db.query(`
                    UPDATE integration_appointment_mappings
                    SET
                      title = $1,
                      start_time = $2,
                      end_time = $3,
                      status = $4,
                      location = $5,
                      external_data = $6,
                      sync_status = 'synced',
                      last_synced_at = NOW()
                    WHERE id = $7
                  `, [
                    appointmentData.title,
                    appointmentData.start_time,
                    appointmentData.end_time,
                    appointmentData.status,
                    appointmentData.location,
                    JSON.stringify(appointment),
                    existingMapping.rows[0].id
                  ]);

                  stats.updated++;
                } else {
                  await db.query(`
                    INSERT INTO integration_appointment_mappings (
                      integration_id, appointment_type, external_id,
                      title, start_time, end_time, status, location, external_data
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  `, [
                    id,
                    'appointment',
                    appointment.id,
                    appointmentData.title,
                    appointmentData.start_time,
                    appointmentData.end_time,
                    appointmentData.status,
                    appointmentData.location,
                    JSON.stringify(appointment)
                  ]);

                  stats.created++;
                }
              } catch (err) {
                console.error('Error syncing appointment:', appointment.id, err);
                stats.failed++;
              }
            }
          } catch (e) {
            console.warn('Could not fetch appointments:', e.message);
          }
        }
      }

      // Update sync log
      await db.query(`
        UPDATE integration_sync_logs
        SET
          status = $1,
          records_processed = $2,
          records_created = $3,
          records_updated = $4,
          records_failed = $5,
          completed_at = NOW()
        WHERE id = $6
      `, [
        stats.failed > 0 ? 'partial' : 'completed',
        stats.processed, stats.created, stats.updated, stats.failed,
        syncLogId
      ]);

      // Update integration
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(), last_sync_status = $1
        WHERE id = $2
      `, [stats.failed > 0 ? 'partial' : 'success', id]);

      res.json({
        message: 'Appointment sync completed',
        stats
      });

    } catch (error) {
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'failed', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [error.message, syncLogId]);

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get sync logs for integration
 */
router.get('/:id/sync-logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;
    const { limit = 20 } = req.query;

    // Verify integration belongs to tenant
    const integration = await db.query(`
      SELECT id FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (integration.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await db.query(`
      SELECT * FROM integration_sync_logs
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `, [id, parseInt(limit)]);

    res.json({ logs: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Get client mappings
 */
router.get('/:id/clients', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;

    const integration = await db.query(`
      SELECT id FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (integration.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await db.query(`
      SELECT
        m.*,
        c.first_name, c.last_name, c.email
      FROM integration_client_mappings m
      JOIN clients c ON m.client_id = c.id
      WHERE m.integration_id = $1
      ORDER BY m.last_synced_at DESC
    `, [id]);

    res.json({ mappings: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Get appointment mappings
 */
router.get('/:id/appointments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.id;
    const { startDate, endDate } = req.query;

    const integration = await db.query(`
      SELECT id FROM integrations WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (integration.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    let query = `
      SELECT
        m.*,
        c.first_name as client_first_name, c.last_name as client_last_name
      FROM integration_appointment_mappings m
      LEFT JOIN clients c ON m.client_id = c.id
      WHERE m.integration_id = $1
    `;
    const params = [id];

    if (startDate) {
      params.push(startDate);
      query += ` AND m.start_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND m.start_time <= $${params.length}`;
    }

    query += ' ORDER BY m.start_time DESC LIMIT 100';

    const result = await db.query(query, params);

    res.json({ appointments: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
