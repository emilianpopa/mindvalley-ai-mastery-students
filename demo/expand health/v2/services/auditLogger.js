/**
 * HIPAA Audit Logger Service
 * Provides comprehensive logging for all PHI access and modifications
 */

const db = require('../database/db');

// PHI field definitions - fields that contain Protected Health Information
const PHI_FIELDS = {
  client: ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'address', 'medical_history', 'lifestyle_notes'],
  lab_result: ['results', 'notes', 'file_path', 'summary'],
  protocol: ['notes', 'ai_recommendations', 'content'],
  form_submission: ['responses', 'response_data'],
  note: ['content', 'title']
};

// Event types
const EVENT_TYPES = {
  ACCESS: 'access',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  LOGIN: 'login',
  LOGOUT: 'logout',
  FAILED_LOGIN: 'failed_login',
  SHARE: 'share'
};

// Event categories
const EVENT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  CLIENT: 'client',
  LAB: 'lab',
  PROTOCOL: 'protocol',
  FORM: 'form',
  NOTE: 'note',
  ADMIN: 'admin',
  SYSTEM: 'system'
};

/**
 * Main audit logging function
 */
async function logAuditEvent({
  eventType,
  eventCategory,
  userId,
  userEmail,
  userRole,
  ipAddress,
  userAgent,
  resourceType,
  resourceId,
  resourceName,
  action,
  actionDescription,
  previousValues,
  newValues,
  changedFields,
  containsPhi = false,
  phiTypes = [],
  requestMethod,
  requestPath,
  requestQuery,
  status = 'success',
  errorMessage
}) {
  try {
    // Determine if PHI is involved based on resource type and changed fields
    if (!containsPhi && resourceType && PHI_FIELDS[resourceType]) {
      const phiFieldsForResource = PHI_FIELDS[resourceType];
      if (changedFields && changedFields.length > 0) {
        const phiFieldsAccessed = changedFields.filter(f => phiFieldsForResource.includes(f));
        if (phiFieldsAccessed.length > 0) {
          containsPhi = true;
          phiTypes = [...new Set([...phiTypes, ...phiFieldsAccessed])];
        }
      } else if (eventType === EVENT_TYPES.ACCESS) {
        // Any access to PHI-containing resources is flagged
        containsPhi = true;
        phiTypes = phiFieldsForResource;
      }
    }

    // Sanitize sensitive data from being stored in logs
    const sanitizedPreviousValues = sanitizeLogData(previousValues);
    const sanitizedNewValues = sanitizeLogData(newValues);

    const query = `
      INSERT INTO audit_logs (
        event_type, event_category,
        user_id, user_email, user_role, ip_address, user_agent,
        resource_type, resource_id, resource_name,
        action, action_description,
        previous_values, new_values, changed_fields,
        contains_phi, phi_types,
        request_method, request_path, request_query,
        status, error_message
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        $13, $14, $15,
        $16, $17,
        $18, $19, $20,
        $21, $22
      ) RETURNING event_id
    `;

    const values = [
      eventType, eventCategory,
      userId, userEmail, userRole, ipAddress, userAgent,
      resourceType, resourceId?.toString(), resourceName,
      action, actionDescription,
      sanitizedPreviousValues ? JSON.stringify(sanitizedPreviousValues) : null,
      sanitizedNewValues ? JSON.stringify(sanitizedNewValues) : null,
      changedFields,
      containsPhi, phiTypes,
      requestMethod, requestPath,
      requestQuery ? JSON.stringify(requestQuery) : null,
      status, errorMessage
    ];

    const result = await db.query(query, values);
    return result.rows[0]?.event_id;

  } catch (error) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('[AuditLogger] Error logging audit event:', error);
    // Optionally write to file as backup
    logToFile({
      timestamp: new Date().toISOString(),
      eventType, eventCategory, userId, action,
      error: error.message
    });
    return null;
  }
}

/**
 * Sanitize sensitive data before logging
 * Remove actual PHI values but keep field names for audit purposes
 */
function sanitizeLogData(data) {
  if (!data) return null;

  const sensitivePatterns = [
    /password/i, /secret/i, /token/i, /key/i, /auth/i,
    /ssn/i, /social.*security/i, /credit.*card/i
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    // Check if field name matches sensitive patterns
    if (sensitivePatterns.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REDACTED]';
    }
    // Recursively sanitize nested objects
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Backup logging to file system
 */
function logToFile(entry) {
  const fs = require('fs');
  const path = require('path');

  try {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error('[AuditLogger] Failed to write to log file:', error);
  }
}

/**
 * Helper to extract request info from Express request object
 */
function getRequestInfo(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestMethod: req.method,
    requestPath: req.originalUrl || req.path,
    requestQuery: Object.keys(req.query || {}).length > 0 ? req.query : null
  };
}

/**
 * Helper to extract user info from authenticated request
 */
function getUserInfo(req) {
  return {
    userId: req.user?.userId || req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role
  };
}

// Convenience logging functions

async function logAccess(req, resourceType, resourceId, resourceName, actionDescription) {
  return logAuditEvent({
    eventType: EVENT_TYPES.ACCESS,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `view_${resourceType}`,
    actionDescription: actionDescription || `Viewed ${resourceType} record`
  });
}

async function logCreate(req, resourceType, resourceId, resourceName, newValues) {
  return logAuditEvent({
    eventType: EVENT_TYPES.CREATE,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `create_${resourceType}`,
    actionDescription: `Created new ${resourceType} record`,
    newValues,
    changedFields: newValues ? Object.keys(newValues) : []
  });
}

async function logUpdate(req, resourceType, resourceId, resourceName, previousValues, newValues) {
  const changedFields = getChangedFields(previousValues, newValues);
  return logAuditEvent({
    eventType: EVENT_TYPES.UPDATE,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `update_${resourceType}`,
    actionDescription: `Updated ${resourceType} record`,
    previousValues,
    newValues,
    changedFields
  });
}

async function logDelete(req, resourceType, resourceId, resourceName, previousValues) {
  return logAuditEvent({
    eventType: EVENT_TYPES.DELETE,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `delete_${resourceType}`,
    actionDescription: `Deleted ${resourceType} record`,
    previousValues
  });
}

async function logExport(req, resourceType, resourceId, resourceName, exportFormat) {
  return logAuditEvent({
    eventType: EVENT_TYPES.EXPORT,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `export_${resourceType}`,
    actionDescription: `Exported ${resourceType} as ${exportFormat}`,
    containsPhi: true
  });
}

async function logLogin(req, userId, userEmail, success, errorMessage) {
  return logAuditEvent({
    eventType: success ? EVENT_TYPES.LOGIN : EVENT_TYPES.FAILED_LOGIN,
    eventCategory: EVENT_CATEGORIES.AUTHENTICATION,
    userId: success ? userId : null,
    userEmail,
    ...getRequestInfo(req),
    action: success ? 'login_success' : 'login_failure',
    actionDescription: success ? 'User logged in successfully' : `Login failed: ${errorMessage}`,
    status: success ? 'success' : 'failure',
    errorMessage: success ? null : errorMessage
  });
}

async function logLogout(req) {
  return logAuditEvent({
    eventType: EVENT_TYPES.LOGOUT,
    eventCategory: EVENT_CATEGORIES.AUTHENTICATION,
    ...getUserInfo(req),
    ...getRequestInfo(req),
    action: 'logout',
    actionDescription: 'User logged out'
  });
}

async function logShare(req, resourceType, resourceId, resourceName, shareMethod, recipient) {
  return logAuditEvent({
    eventType: EVENT_TYPES.SHARE,
    eventCategory: getCategoryForResource(resourceType),
    ...getUserInfo(req),
    ...getRequestInfo(req),
    resourceType,
    resourceId,
    resourceName,
    action: `share_${resourceType}`,
    actionDescription: `Shared ${resourceType} via ${shareMethod} to ${recipient || 'external'}`,
    containsPhi: true
  });
}

// Helper functions

function getCategoryForResource(resourceType) {
  const categoryMap = {
    client: EVENT_CATEGORIES.CLIENT,
    lab_result: EVENT_CATEGORIES.LAB,
    protocol: EVENT_CATEGORIES.PROTOCOL,
    form: EVENT_CATEGORIES.FORM,
    form_submission: EVENT_CATEGORIES.FORM,
    note: EVENT_CATEGORIES.NOTE,
    user: EVENT_CATEGORIES.ADMIN
  };
  return categoryMap[resourceType] || EVENT_CATEGORIES.SYSTEM;
}

function getChangedFields(oldObj, newObj) {
  if (!oldObj || !newObj) return [];

  const changed = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changed.push(key);
    }
  }

  return changed;
}

module.exports = {
  logAuditEvent,
  logAccess,
  logCreate,
  logUpdate,
  logDelete,
  logExport,
  logLogin,
  logLogout,
  logShare,
  getRequestInfo,
  getUserInfo,
  EVENT_TYPES,
  EVENT_CATEGORIES,
  PHI_FIELDS
};
