# Tempo

Behavior-aware Pomodoro timer that detects flow and distraction states in real-time using browser activity signals.

**Live:** https://tempo-client-two.vercel.app/

**Status:** Phase 1 prototype — deployed.

## What it does

- Pomodoro timer with adaptive breaks based on detected behavior
- Tracks keyboard/mouse activity, tab visibility, and tab switches
- Flow detection: delays break when user is in deep focus
- Distraction detection: offers early break after repeated tab switching
- Session dashboard with focus score visualization
- Settings panel to tune all timer and sensitivity parameters

## Setup

### Prerequisites

- Node.js 18+
- Docker Desktop (for MongoDB)

### Clone and install

```bash
git clone <repo>
cd tempo
npm install
```

This installs dependencies for both `server/` and `client/` workspaces.

### Start MongoDB

```bash
docker run -d --name tempo-mongo -p 27017:27017 mongo:7
```

Verify running:
```bash
docker ps
```

### Start dev servers

**Terminal 1 — server:**
```bash
cd server
npx tsx src/index.ts
```

Expected output: `MongoDB connected` then `Tempo server on port 3001`

**Terminal 2 — client:**
```bash
cd client
npx vite
```

Expected output: `Local: http://localhost:5173`

Open `http://localhost:5173` in browser.

## Run tests

```bash
npm test
```

Runs all server and client tests. Server tests use in-memory MongoDB, no real DB needed.

## Clearing test data

If stale sessions accumulate in MongoDB:

```bash
docker exec -it tempo-mongo mongosh tempo --eval "db.sessions.deleteMany({})"
```

## Architecture

npm workspaces: `server/` (Express + TypeScript) and `client/` (React + TypeScript).

- **Server:** REST API (`/api/sessions`, `/api/samples`, `/api/settings`), Mongoose + MongoDB
- **Client:** React Router, single-page app with timer, dashboard, settings

Session state machine lives in pure reducer (`client/src/lib/pomodoroReducer.ts`), fully tested. Behavior tracking runs client-side every 10s, sampled to server.

## Deployment

Deployed on Vercel as two separate projects:

- **Client** — Vite static build, env var `VITE_API_URL` pointing to server
- **Server** — Express app as a Vercel serverless function (`server/api/index.ts`)

MongoDB hosted on Atlas.

## Known limitations

- No authentication — uses UUID from localStorage, sessions are device-local
- Phase 2 (mood-adaptive breaks) not implemented yet
