import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    config.nodeEnv === 'production' || config.db.host.includes('render.com')
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message });
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    logger.debug('DB query executed', { duration: Date.now() - start, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('DB query failed', { error: err.message, query: text });
    throw err;
  }
}

export { pool };
