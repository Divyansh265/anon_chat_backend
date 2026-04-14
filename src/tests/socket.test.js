const http = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const app = require('../app');
const registerChatHandlers = require('../sockets/chatHandler');

jest.mock('../models/sessionModel', () => ({
  createSession: jest.fn().mockResolvedValue('mock-session-id'),
  endSession: jest.fn().mockResolvedValue(),
  saveMessage: jest.fn().mockResolvedValue(),
}));

let server, io, port;
let clientA, clientB;

function createClient(p) {
  return Client(`http://localhost:${p}`, { autoConnect: false, transports: ['websocket'] });
}

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeAll((done) => {
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });
  io.on('connection', (socket) => registerChatHandlers(io, socket));
  server.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => {
  io.close();
  server.close(done);
});

beforeEach((done) => {
  const mm = require('../services/matchmakingService');
  ['a', 'b'].forEach((id) => { mm.dequeue(id); mm.removePair(id); mm.clearSession(id); });

  clientA = createClient(port);
  clientB = createClient(port);

  let connected = 0;
  const onConnect = () => { if (++connected === 2) done(); };
  clientA.once('connect', onConnect);
  clientB.once('connect', onConnect);
  clientA.connect();
  clientB.connect();
});

afterEach(() => {
  clientA.disconnect();
  clientB.disconnect();
});

describe('Searching', () => {
  test('emits "searching" when user starts search alone', (done) => {
    clientA.once('searching', () => done());
    clientA.emit('start_search');
  });
});

describe('Matchmaking', () => {
  test('two users get matched and both receive "matched" event', async () => {
    const matchA = waitFor(clientA, 'matched');
    const matchB = waitFor(clientB, 'matched');
    clientA.emit('start_search');
    clientB.emit('start_search');
    const [dataA, dataB] = await Promise.all([matchA, matchB]);
    expect(dataA.anonName).toBeDefined();
    expect(dataB.anonName).toBeDefined();
  });
});

describe('Messaging', () => {
  async function matchBothClients() {
    const matchA = waitFor(clientA, 'matched');
    const matchB = waitFor(clientB, 'matched');
    clientA.emit('start_search');
    clientB.emit('start_search');
    await Promise.all([matchA, matchB]);
  }

  test('message sent by A is received by B', async () => {
    await matchBothClients();
    const received = waitFor(clientB, 'receive_message');
    clientA.emit('send_message', { content: 'Hello B!' });
    const msg = await received;
    expect(msg.content).toBe('Hello B!');
    expect(msg.isSelf).toBeUndefined();
  });

  test('sender receives echo with isSelf=true', async () => {
    await matchBothClients();
    const echo = waitFor(clientA, 'receive_message');
    clientA.emit('send_message', { content: 'Echo test' });
    const msg = await echo;
    expect(msg.content).toBe('Echo test');
    expect(msg.isSelf).toBe(true);
  });

  test('empty message is ignored', async () => {
    await matchBothClients();
    let received = false;
    clientB.once('receive_message', () => { received = true; });
    clientA.emit('send_message', { content: '' });
    await new Promise((r) => setTimeout(r, 300));
    expect(received).toBe(false);
  });

  test('message over max length triggers error_event', async () => {
    await matchBothClients();
    const errEvt = waitFor(clientA, 'error_event');
    clientA.emit('send_message', { content: 'x'.repeat(501) });
    const err = await errEvt;
    expect(err.message).toMatch(/too long/i);
  });

  test('rate limiting triggers error_event after burst', async () => {
    await matchBothClients();
    for (let i = 0; i < 6; i++) {
      clientA.emit('send_message', { content: `msg ${i}` });
    }
    const err = await waitFor(clientA, 'error_event');
    expect(err.message).toMatch(/slow down|too many/i);
  });
});

describe('Skip / End chat', () => {
  async function matchBothClients() {
    const matchA = waitFor(clientA, 'matched');
    const matchB = waitFor(clientB, 'matched');
    clientA.emit('start_search');
    clientB.emit('start_search');
    await Promise.all([matchA, matchB]);
  }

  test('when A skips, B receives "chat_ended"', async () => {
    await matchBothClients();
    const ended = waitFor(clientB, 'chat_ended');
    clientA.emit('skip_chat');
    await ended;
  });

  test('when A skips, A goes back to searching', async () => {
    await matchBothClients();
    const searching = waitFor(clientA, 'searching');
    clientA.emit('skip_chat');
    await searching;
  });
});

describe('Disconnect handling', () => {
  test('when A disconnects, B receives "partner_disconnected"', async () => {
    const matchA = waitFor(clientA, 'matched');
    const matchB = waitFor(clientB, 'matched');
    clientA.emit('start_search');
    clientB.emit('start_search');
    await Promise.all([matchA, matchB]);

    const disconnected = waitFor(clientB, 'partner_disconnected');
    clientA.disconnect();
    await disconnected;
  });
});
