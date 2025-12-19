/**
 * Global Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    status = 409;
    message = 'Resource already exists';
  }
  if (err.code === '23503') { // Foreign key violation
    status = 400;
    message = 'Invalid reference';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  }

  // Send error response
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
