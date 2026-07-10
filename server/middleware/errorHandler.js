const logger = require('../utils/logger');

/**
 * Centralized Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`Error encountered during request ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server';

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;
