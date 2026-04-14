const { pool } = require('../db/pool');

async function healthCheck(req, res, next) {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
}

module.exports = { healthCheck };
