const request = require('supertest');

jest.mock('../db/pool', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  pool: {
    on: jest.fn(),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  },
}));

const app = require('../app');
const { pool } = require('../db/pool');

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [], rowCount: 1 });
});

describe('GET /health', () => {
  test('returns 200 with status ok when DB is reachable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });

  test('returns 503 when DB throws', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('disconnected');
  });
});

describe('Unknown routes', () => {
  test('returns 404 for unknown path', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
