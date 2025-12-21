/**
 * HIPAA Audit Logging Middleware
 * Automatically logs API requests that access or modify PHI
 */

const auditLogger = require('../services/auditLogger');

// Routes that access PHI and should be logged
const PHI_ROUTES = [
  { pattern: /^\/api\/clients/, resourceType: 'client' },
  { pattern: /^\/api\/labs/, resourceType: 'lab_result' },
  { pattern: /^\/api\/protocols/, resourceType: 'protocol' },
  { pattern: /^\/api\/forms\/\d+\/submissions/, resourceType: 'form_submission' },
  { pattern: /^\/api\/notes/, resourceType: 'note' }
];

// Routes to exclude from logging
const EXCLUDE_ROUTES = [
  /^\/api\/auth\/verify/,
  /^\/api\/dashboard\/stats/,
  /^\/api\/kb/,
  /\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.ico$/
];

/**
 * Determine if a route should be logged
 */
function shouldLogRoute(path) {
  // Exclude static files and certain routes
  if (EXCLUDE_ROUTES.some(pattern => pattern.test(path))) {
    return false;
  }
  // Check if route accesses PHI
  return PHI_ROUTES.some(route => route.pattern.test(path));
}

/**
 * Get resource type for a route
 */
function getResourceTypeForRoute(path) {
  const match = PHI_ROUTES.find(route => route.pattern.test(path));
  return match?.resourceType || 'unknown';
}

/**
 * Extract resource ID from path
 */
function extractResourceId(path) {
  // Match patterns like /api/clients/123 or /api/labs/456
  const match = path.match(/\/api\/\w+\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Main audit middleware
 */
function auditMiddleware(req, res, next) {
  // Skip if route shouldn't be logged
  if (!shouldLogRoute(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const resourceType = getResourceTypeForRoute(req.path);
  const resourceId = extractResourceId(req.path);

  // Store original methods to capture response
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody = null;

  // Override res.json to capture response
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Override res.send to capture response
  res.send = function(body) {
    if (typeof body === 'string') {
      try {
        responseBody = JSON.parse(body);
      } catch (e) {
        responseBody = body;
      }
    } else {
      responseBody = body;
    }
    return originalSend.call(this, body);
  };

  // Log on response finish
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Determine event type based on HTTP method
      let eventType;
      switch (req.method) {
        case 'GET':
          eventType = auditLogger.EVENT_TYPES.ACCESS;
          break;
        case 'POST':
          eventType = auditLogger.EVENT_TYPES.CREATE;
          break;
        case 'PUT':
        case 'PATCH':
          eventType = auditLogger.EVENT_TYPES.UPDATE;
          break;
        case 'DELETE':
          eventType = auditLogger.EVENT_TYPES.DELETE;
          break;
        default:
          eventType = auditLogger.EVENT_TYPES.ACCESS;
      }

      // Get resource name from response if available
      let resourceName = null;
      if (responseBody) {
        if (responseBody.client) {
          resourceName = `${responseBody.client.first_name} ${responseBody.client.last_name}`;
        } else if (responseBody.protocol) {
          resourceName = responseBody.protocol.title || responseBody.protocol.notes?.substring(0, 50);
        } else if (responseBody.lab) {
          resourceName = responseBody.lab.test_name || `Lab #${resourceId}`;
        }
      }

      // Log the event
      await auditLogger.logAuditEvent({
        eventType,
        eventCategory: auditLogger.getCategoryForResource ?
          getCategoryForResource(resourceType) :
          resourceType,
        ...auditLogger.getUserInfo(req),
        ...auditLogger.getRequestInfo(req),
        resourceType,
        resourceId,
        resourceName,
        action: `${req.method.toLowerCase()}_${resourceType}`,
        actionDescription: `${req.method} ${req.path} (${duration}ms)`,
        newValues: req.method !== 'GET' ? sanitizeRequestBody(req.body) : null,
        status: success ? 'success' : 'failure',
        errorMessage: !success ? (responseBody?.error || `HTTP ${res.statusCode}`) : null
      });

    } catch (error) {
      console.error('[AuditMiddleware] Error logging request:', error);
    }
  });

  next();
}

/**
 * Get category for resource type
 */
function getCategoryForResource(resourceType) {
  const categoryMap = {
    client: 'client',
    lab_result: 'lab',
    protocol: 'protocol',
    form_submission: 'form',
    note: 'note'
  };
  return categoryMap[resourceType] || 'system';
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeRequestBody(body) {
  if (!body) return null;

  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'credit_card'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Express middleware to add audit helpers to request
 */
function attachAuditHelpers(req, res, next) {
  // Add convenience methods to request object
  req.auditLog = {
    access: (resourceType, resourceId, resourceName, description) =>
      auditLogger.logAccess(req, resourceType, resourceId, resourceName, description),
    create: (resourceType, resourceId, resourceName, newValues) =>
      auditLogger.logCreate(req, resourceType, resourceId, resourceName, newValues),
    update: (resourceType, resourceId, resourceName, oldValues, newValues) =>
      auditLogger.logUpdate(req, resourceType, resourceId, resourceName, oldValues, newValues),
    delete: (resourceType, resourceId, resourceName, oldValues) =>
      auditLogger.logDelete(req, resourceType, resourceId, resourceName, oldValues),
    export: (resourceType, resourceId, resourceName, format) =>
      auditLogger.logExport(req, resourceType, resourceId, resourceName, format),
    share: (resourceType, resourceId, resourceName, method, recipient) =>
      auditLogger.logShare(req, resourceType, resourceId, resourceName, method, recipient)
  };

  next();
}

module.exports = {
  auditMiddleware,
  attachAuditHelpers
};
