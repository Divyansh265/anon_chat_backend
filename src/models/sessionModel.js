const db = require('../db/pool');

async function createSession(userAId, userBId) {
  const res = await db.query(
    `INSERT INTO chat_sessions (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id`,
    [userAId, userBId]
  );
  return res.rows[0].id;
}

async function endSession(sessionId, reason) {
  await db.query(
    `UPDATE chat_sessions SET ended_at = NOW(), end_reason = $1 WHERE id = $2`,
    [reason, sessionId]
  );
}

async function saveMessage(sessionId, senderId, content) {
  await db.query(
    `INSERT INTO chat_messages (session_id, sender_id, content) VALUES ($1, $2, $3)`,
    [sessionId, senderId, content]
  );
}

module.exports = { createSession, endSession, saveMessage };
