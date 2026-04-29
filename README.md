# Tempo

Behavior-aware Pomodoro app that detects focus/distraction signals in-browser and adapts session flow.

Live: https://tempo-client-two.vercel.app/

## Highlights

- Pomodoro timer with flow extension and distraction detection
- Distraction prompt flow before early break decisions
- Stop-confirmation modals for active focus sessions and breaks
- Background distraction surfacing via Picture-in-Picture overlay (with Notification fallback)
- **Mood check-in** during breaks — adapts break duration and guidance in real time
- **Server-backed mood adaptation** — remembers recent mood patterns across sessions
- **Recommendation cards** on dashboard — one-click temporary overrides (longer breaks, shorter sessions) that expire at midnight without touching saved settings
- **Mood analytics** on dashboard — most common mood, average focus score by mood
- Session insights modal with mood adaptation explanation per session
- Dashboard list with state-aware labels (including `Took a break`)
- Configurable timer-end sound (enabled + volume + test button)
- Persisted user settings (timer, detection thresholds, overlay/permission behavior, audio, theme)
- Server-assigned daily session numbering with canonical dashboard/chart labels

## Session outcomes

Finalized session states:
- `completed`: normal focus completion
- `abandoned`: manual stop or stale overdue active-session reconciliation
- `break_taken`: user chose break from distraction prompt

Other state:
- `active`: open in-progress session record

## Tech stack

- Client: React + Vite + TypeScript
- Server: Express + Mongoose + TypeScript
- DB: MongoDB
- Monorepo: npm workspaces (`client`, `server`)

## Prerequisites

- Node.js 18+
- Docker Desktop (for local MongoDB)

## Setup

```bash
git clone <repo>
cd tempo
npm install
```

Start local MongoDB:

```bash
docker run -d --name tempo-mongo -p 27017:27017 mongo:7
```

Verify:

```bash
docker ps
```

## Run locally

Run both server and client from repo root:

```bash
npm run dev
```

Alternative manual start:

```bash
cd server && npx tsx src/index.ts
cd client && npx vite
```

Client default URL: `http://localhost:5173`

## Tests

Run all:

```bash
npm test
```

Run by workspace:

```bash
npm test --workspace=server
npm test --workspace=client
```

Useful focused suites:

```bash
cd server && npx vitest run src/test/sessions.test.ts src/test/settings.test.ts src/test/adaptation.test.ts
cd client && npx vitest run src/test/usePomodoroSession.insights.test.tsx src/test/usePomodoroSession.sound.test.tsx src/test/usePomodoroSession.distraction.test.tsx src/test/breakMoodGuidance.test.tsx src/test/dashboardSessionInsights.test.tsx
```

## Build

```bash
npm run build --workspace=server
npm run build --workspace=client
```

## Architecture notes

- App identity is device-local (`userId` in localStorage sent via `X-User-Id`).
- Session state machine is in `client/src/lib/pomodoroReducer.ts`, orchestrated by `usePomodoroSession`.
- Behavioral samples are buffered/sent every 10s during `working`.
- Focus score is computed server-side on session finalization (`PATCH /api/sessions/:id`).
- `GET /api/sessions` returns today-only sessions and normalizes `sessionNumber` by `startTime`.
- On app load, stale overdue `active` sessions are reconciled to `abandoned`.
- Mood selection during a break POSTs to `PATCH /api/sessions/:id` (mood field), which updates both the session and the `MoodAdaptation` document for that user.
- `GET /api/adaptation` returns mood counts, streaks, active override, recommendations, and guidance context flags.
- `POST /api/adaptation/actions` applies a named action (e.g. `apply_longer_breaks_today`) as a temporary same-day override that expires at midnight. Saved settings are never mutated.
- Temporary overrides are cleared lazily on next adaptation read/write — no background jobs needed.

## Environment

Client can use:
- `VITE_API_URL` for server base URL override

Without it, client calls `/api` on same origin.

## Deployment

Deployed on Vercel:
- Client: Vite static build
- Server: Express API (`server/api/index.ts`)

MongoDB is hosted on Atlas.

## Known limitations

- No auth; data is scoped by device-local generated `userId`
- Dashboard is today-scoped (not historical multi-day yet)
- Browser notification/overlay behavior depends on browser support and permission state
