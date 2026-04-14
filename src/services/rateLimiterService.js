const config = require('../config');

const messageTimestamps = new Map();

function isRateLimited(socketId) {
  const now = Date.now();
  const { maxMessages, windowMs } = config.rateLimit;

  if (!messageTimestamps.has(socketId)) {
    messageTimestamps.set(socketId, []);
  }

  const timestamps = messageTimestamps.get(socketId);
  const recent = timestamps.filter((t) => now - t < windowMs);
  messageTimestamps.set(socketId, recent);

  if (recent.length >= maxMessages) return true;

  recent.push(now);
  return false;
}

function clearRateLimit(socketId) {
  messageTimestamps.delete(socketId);
}

module.exports = { isRateLimited, clearRateLimit };
