# FocusBuddy — ADHD Body Double Web App

A full-stack productivity web app for ADHD users with live video focus sessions, AI nudges, Pomodoro timer, community task sharing, calendar, and daily reports.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + TanStack Query + Recharts
- **Backend**: Express.js + express-session + bcryptjs
- **DB (local dev)**: SQLite via better-sqlite3
- **DB (Railway)**: PostgreSQL via `pg` + Drizzle ORM
- **Auth**: Session-based with password hashing

---

## Deploy to Railway (Recommended)

### 1. Create a Railway account
Sign up at [railway.app](https://railway.app) (free tier available).

### 2. Create a new project
In the Railway dashboard → **New Project** → **Deploy from GitHub repo**
(or use **Empty Project** and connect your repo).

### 3. Add a Postgres database
In your Railway project → **New** → **Database** → **Add PostgreSQL**.
Railway automatically sets the `DATABASE_URL` environment variable in your service.

### 4. Set environment variables
In your Railway service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | A long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `NODE_ENV` | `production` |

`DATABASE_URL` and `PORT` are set automatically by Railway — do **not** add them manually.

### 5. Deploy
Railway will detect the `Dockerfile` and build automatically on every push to your main branch.

Your backend URL will be something like:
```
https://focusbuddy-production-xxxx.up.railway.app
```

### 6. Update the frontend to point to your Railway backend

After getting your Railway URL, rebuild the frontend with `VITE_API_URL` set:

```bash
cd focusbuddy
VITE_API_URL=https://your-app.up.railway.app npm run build
```

Then redeploy the contents of `dist/public/` to your static host (Perplexity, Netlify, Vercel, S3, etc.).

### 7. CORS
CORS is already configured in `server/index.ts` to reflect the request origin with credentials. No extra steps needed.

---

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
cd focusbuddy
npm install
npm run dev
```

The app starts on [http://localhost:5000](http://localhost:5000).

No database setup needed — SQLite file `focusbuddy.db` is created automatically.

---

## Project Structure

```
focusbuddy/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # Auth, Dashboard, Timer, Sessions, Community, Calendar, Reports
│       ├── components/
│       └── lib/
│           └── queryClient.ts   # API_BASE uses VITE_API_URL or proxy token
├── server/          # Express backend
│   ├── index.ts     # Express app + CORS + session setup
│   ├── routes.ts    # All API routes
│   └── storage.ts   # DB layer (Postgres via Drizzle OR raw SQLite)
├── shared/
│   └── schema.ts    # Drizzle pgTable schema + Zod types
├── Dockerfile       # Multi-stage Docker build for Railway
├── railway.json     # Railway deploy config
└── .env.example     # Environment variable reference
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Railway only | PostgreSQL connection string (auto-set by Railway Postgres plugin) |
| `SESSION_SECRET` | Yes (prod) | Random secret for express-session cookie signing |
| `PORT` | Railway only | Port to listen on (auto-set by Railway) |
| `NODE_ENV` | Yes (prod) | Set to `production` |
| `VITE_API_URL` | Frontend build | Full Railway backend URL — baked into the frontend at build time |

---

## Features

- **Auth** — Register/login with bcrypt password hashing, persistent sessions
- **Dashboard** — Stats overview, quick-add tasks, live session list, AI nudge panel
- **Focus Timer** — Circular Pomodoro timer, 3 modes, customizable durations, task selector, AI nudges
- **Live Sessions** — Create/join focus rooms with 6-char codes, video grid UI, mic/camera toggles
- **Community** — Share tasks publicly, like/copy tasks, filter by category
- **Calendar** — Monthly grid, event creation with color picker, day-detail panel
- **Reports** — Daily mood check-in, AI summary, 7-day charts (AreaChart + BarChart)
