import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  logger.error('Unhandled error', { status, message, path: req.path, method: req.method });
  res.status(status).json({ success: false, error: message });
}
