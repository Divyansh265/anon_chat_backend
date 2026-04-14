# StrangerTalk — Backend

This is the backend service for **StrangerTalk**, an anonymous real-time chat application. It handles user matchmaking, messaging, and session tracking using WebSockets, while also exposing basic HTTP endpoints for health checks and monitoring.

The system is designed to be simple, fast, and lightweight, with in-memory matchmaking for speed and PostgreSQL for persistence.

---

## Tech Stack

* Node.js (ES Modules)
* Express.js
* Socket.io
* PostgreSQL
* Render (Deployment)

---

## High-Level Architecture

The application runs both HTTP and WebSocket servers on the same port.

* **Express (HTTP)** is used for basic routes like health checks.
* **Socket.io (WebSocket)** handles real-time features like matchmaking and messaging.
* **In-memory structures** are used for fast matchmaking.
* **PostgreSQL** is used to store chat sessions and messages.

```
HTTP (Express)          WebSocket (Socket.io)
──────────────          ─────────────────────
GET /health             start_search
                        send_message
                        skip_chat
                        disconnect
        │
        ▼
In-memory state                PostgreSQL
waitingQueue[]                 chat_sessions
activePairs Map                chat_messages
sessionMap Map
```

---

## Folder Structure

The project follows a clean and scalable structure similar to production-grade backend systems:

```
src/
├── config/         Environment configurations
├── controllers/    Request handlers
├── db/             PostgreSQL pool and schema
├── middlewares/    Error handling and logging
├── models/         Database queries
├── routes/         Express routes
├── services/       Core logic (matchmaking, rate limiting)
├── sockets/        Socket.io event handlers
├── utils/          Helper functions (logger, anon name generator)
├── app.js
└── server.js
```

---

## Matchmaking Flow

The matchmaking system is intentionally simple and efficient:

1. A user starts by emitting `start_search`
2. Their socket ID is added to a waiting queue
3. If another user is already waiting, both users are matched instantly
4. They are moved into an active pair
5. Each user receives a `matched` event along with a random anonymous name
6. Messages are exchanged directly between paired sockets
7. If a user skips or disconnects, the chat ends and is logged in the database

Example:

```
User A joins → queue: [A]
User B joins → queue: [A, B]

→ Match found
→ activePairs: A ↔ B
→ Both users receive "matched"
```

---

## Socket Events

### Client → Server

* `start_search` → Join matchmaking queue
* `send_message` → Send a message `{ content }`
* `skip_chat` → End current chat and rejoin queue

### Server → Client

* `searching` → Waiting for a match
* `matched` → `{ anonName }`
* `receive_message` → `{ content, timestamp, isSelf }`
* `partner_disconnected` → Partner left unexpectedly
* `chat_ended` → Partner skipped the chat
* `error_event` → `{ message }`

---

## Setup Instructions

Install dependencies:

```bash
npm install
npm run dev
```

Set up the database schema:

```bash
psql -U postgres -d anon_chat -f src/db/schema.sql
```

---

## Environment Variables

```
PORT=4000
DB_HOST=
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=
CORS_ORIGIN=*
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=1000
MAX_MESSAGE_LENGTH=500
```

---

## Deployment (Render)

Steps to deploy:

1. Connect your GitHub repo to Render
2. Create a Web Service
3. Set root directory to `backend/`
4. Use:

   * Build command: `npm install`
   * Start command: `npm start`
5. Add all required environment variables
6. Create a PostgreSQL instance on Render
7. Run the schema once using Render shell or locally

---

## Known Limitations & Trade-offs

* **In-memory matchmaking**

  * Fast and simple, but data is lost on server restart
  * Not suitable for multi-instance scaling without Redis

* **No chat history retrieval**

  * Messages are stored but not fetched again
  * Keeps the experience anonymous and temporary

* **Rate limiting tied to socket**

  * Can be bypassed by reconnecting
  * Could be improved using IP or token-based tracking

* **Single-instance architecture**

  * Scaling horizontally would require a Redis adapter for Socket.io

* **Cold starts on Render (free tier)**

  * First request after inactivity may take ~30 seconds

---

## Final Notes

This backend focuses on **real-time performance, simplicity, and anonymity**. While it has some intentional limitations, the architecture is designed to be easily extendable—for example, adding Redis for scaling or persistent identity for stronger rate limiting.
