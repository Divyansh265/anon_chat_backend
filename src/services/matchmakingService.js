import logger from '../utils/logger.js';

const waitingQueue = [];
const activePairs = new Map();
const sessionMap = new Map();

export function enqueue(socketId) {
  if (!waitingQueue.includes(socketId)) {
    waitingQueue.push(socketId);
    logger.info('User added to queue', { socketId, queueLength: waitingQueue.length });
  }
}

export function dequeue(socketId) {
  const idx = waitingQueue.indexOf(socketId);
  if (idx !== -1) {
    waitingQueue.splice(idx, 1);
    logger.info('User removed from queue', { socketId });
  }
}

export function tryMatch(socketId) {
  const partnerIdx = waitingQueue.findIndex((id) => id !== socketId);
  if (partnerIdx === -1) return null;

  const partnerId = waitingQueue[partnerIdx];
  dequeue(socketId);
  dequeue(partnerId);

  activePairs.set(socketId, partnerId);
  activePairs.set(partnerId, socketId);

  logger.info('Users matched', { socketId, partnerId });
  return partnerId;
}

export function getPartner(socketId) {
  return activePairs.get(socketId) || null;
}

export function removePair(socketId) {
  const partnerId = activePairs.get(socketId);
  if (partnerId) activePairs.delete(partnerId);
  activePairs.delete(socketId);
  return partnerId;
}

export function setSession(socketId, sessionId) {
  sessionMap.set(socketId, sessionId);
}

export function getSession(socketId) {
  return sessionMap.get(socketId) || null;
}

export function clearSession(socketId) {
  sessionMap.delete(socketId);
}

export function isInQueue(socketId) {
  return waitingQueue.includes(socketId);
}

export function isInChat(socketId) {
  return activePairs.has(socketId);
}
