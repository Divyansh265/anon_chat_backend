import * as matchmaking from '../services/matchmakingService.js';
import { isRateLimited, clearRateLimit } from '../services/rateLimiterService.js';
import { createSession, endSession, saveMessage } from '../models/sessionModel.js';
import { generateAnonName } from '../utils/generateId.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export default function registerChatHandlers(io, socket) {
  const userId = socket.id;
  logger.info('Socket connected', { userId });

  socket.on('start_search', async () => {
    if (matchmaking.isInChat(userId)) {
      socket.emit('error_event', { message: 'Already in a chat. Skip first.' });
      return;
    }

    socket.emit('searching');
    matchmaking.enqueue(userId);

    const partnerId = matchmaking.tryMatch(userId);
    if (!partnerId) {
      logger.info('User waiting in queue', { userId });
      return;
    }

    await handleMatch(io, userId, partnerId);
  });

  socket.on('send_message', async ({ content }) => {
    if (!content || typeof content !== 'string') return;

    if (content.length > config.maxMessageLength) {
      socket.emit('error_event', { message: `Message too long. Max ${config.maxMessageLength} chars.` });
      return;
    }

    if (isRateLimited(userId)) {
      socket.emit('error_event', { message: 'Slow down! Too many messages.' });
      return;
    }

    const partnerId = matchmaking.getPartner(userId);
    if (!partnerId) {
      socket.emit('error_event', { message: 'No active chat partner.' });
      return;
    }

    const sessionId = matchmaking.getSession(userId);
    const message = {
      content: content.trim(),
      senderId: userId,
      timestamp: new Date().toISOString(),
    };

    io.to(partnerId).emit('receive_message', message);
    socket.emit('receive_message', { ...message, isSelf: true });

    if (sessionId) {
      saveMessage(sessionId, userId, content.trim()).catch((err) => {
        logger.error('Failed to save message', { error: err.message });
      });
    }
  });

  socket.on('skip_chat', async () => {
    await handleSkipOrEnd(io, socket, 'skip');
  });

  socket.on('disconnect', async () => {
    logger.info('Socket disconnected', { userId });
    await handleSkipOrEnd(io, socket, 'disconnect');
    clearRateLimit(userId);
  });
}

async function handleMatch(io, userAId, userBId) {
  let sessionId = null;

  try {
    sessionId = await createSession(userAId, userBId);
    matchmaking.setSession(userAId, sessionId);
    matchmaking.setSession(userBId, sessionId);
  } catch (err) {
    logger.error('Failed to create DB session', { error: err.message });
  }

  io.to(userAId).emit('matched', { partnerId: userBId, anonName: generateAnonName() });
  io.to(userBId).emit('matched', { partnerId: userAId, anonName: generateAnonName() });

  logger.info('Match established', { userAId, userBId, sessionId });
}

async function handleSkipOrEnd(io, socket, reason) {
  const userId = socket.id;

  if (matchmaking.isInQueue(userId)) {
    matchmaking.dequeue(userId);
    return;
  }

  const partnerId = matchmaking.removePair(userId);
  const sessionId = matchmaking.getSession(userId);

  matchmaking.clearSession(userId);
  if (partnerId) matchmaking.clearSession(partnerId);

  if (sessionId) {
    endSession(sessionId, reason).catch((err) => {
      logger.error('Failed to end DB session', { error: err.message });
    });
  }

  if (partnerId) {
    const event = reason === 'disconnect' ? 'partner_disconnected' : 'chat_ended';
    io.to(partnerId).emit(event, { reason });
    logger.info('Notified partner', { partnerId, event });
  }

  if (reason === 'skip') {
    socket.emit('searching');
    matchmaking.enqueue(userId);
    const newPartnerId = matchmaking.tryMatch(userId);
    if (newPartnerId) await handleMatch(io, userId, newPartnerId);
  }
}
