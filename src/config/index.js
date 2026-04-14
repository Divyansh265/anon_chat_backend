import 'dotenv/config';

const rawOrigins = process.env.CORS_ORIGIN || '*';

const corsOrigin =
  rawOrigins === '*'
    ? '*'
    : rawOrigins.includes(',')
    ? rawOrigins.split(',').map((o) => o.trim())
    : rawOrigins;

export default {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'anon_chat',
  },
  rateLimit: {
    maxMessages: parseInt(process.env.RATE_LIMIT_MAX || '5'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000'),
  },
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '500'),
  corsOrigin,
};
