require('dotenv').config();
const { query, pool } = require('../db/pool');

describe('PostgreSQL connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('can connect and run a simple query', async () => {
    const res = await query('SELECT 1 + 1 AS result');
    expect(res.rows[0].result).toBe(2);
  });

  test('chat_sessions table exists', async () => {
    const res = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'chat_sessions'
    `);
    expect(res.rows.length).toBe(1);
  });

  test('chat_messages table exists', async () => {
    const res = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'chat_messages'
    `);
    expect(res.rows.length).toBe(1);
  });

  test('can insert and retrieve a chat session', async () => {
    const userA = 'test-user-a-' + Date.now();
    const userB = 'test-user-b-' + Date.now();

    const insert = await query(
      `INSERT INTO chat_sessions (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id`,
      [userA, userB]
    );
    const sessionId = insert.rows[0].id;
    expect(sessionId).toBeDefined();

    const select = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [sessionId]);
    expect(select.rows[0].user_a_id).toBe(userA);
    expect(select.rows[0].user_b_id).toBe(userB);
    expect(select.rows[0].ended_at).toBeNull();

    await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
  });

  test('can insert a message linked to a session', async () => {
    const userA = 'test-msg-a-' + Date.now();
    const userB = 'test-msg-b-' + Date.now();

    const sessionRes = await query(
      `INSERT INTO chat_sessions (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id`,
      [userA, userB]
    );
    const sessionId = sessionRes.rows[0].id;

    await query(
      `INSERT INTO chat_messages (session_id, sender_id, content) VALUES ($1, $2, $3)`,
      [sessionId, userA, 'Hello from test']
    );

    const msgRes = await query(`SELECT * FROM chat_messages WHERE session_id = $1`, [sessionId]);
    expect(msgRes.rows.length).toBe(1);
    expect(msgRes.rows[0].content).toBe('Hello from test');

    await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
  });

  test('can end a session with a reason', async () => {
    const userA = 'test-end-a-' + Date.now();
    const userB = 'test-end-b-' + Date.now();

    const sessionRes = await query(
      `INSERT INTO chat_sessions (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id`,
      [userA, userB]
    );
    const sessionId = sessionRes.rows[0].id;

    await query(
      `UPDATE chat_sessions SET ended_at = NOW(), end_reason = $1 WHERE id = $2`,
      ['skip', sessionId]
    );

    const res = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [sessionId]);
    expect(res.rows[0].end_reason).toBe('skip');
    expect(res.rows[0].ended_at).not.toBeNull();

    await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
  });
});
