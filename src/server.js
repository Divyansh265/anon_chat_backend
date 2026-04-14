const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const registerChatHandlers = require('./sockets/chatHandler');

const server = http.createServer(app);

const ioOptions =
  config.corsOrigin === '*'
    ? { cors: { origin: '*', methods: ['GET', 'POST'] } }
    : { cors: { origin: config.corsOrigin, methods: ['GET', 'POST'], credentials: true } };

const io = new Server(server, {
  ...ioOptions,
  pingTimeout: 20000,
  pingInterval: 10000,
});

io.on('connection', (socket) => {
  registerChatHandlers(io, socket);
});

server.listen(config.port, () => {
  logger.info('Server running', { port: config.port, env: config.nodeEnv });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
