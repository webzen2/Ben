# Jarvis — BCAutomations Personal AI OS

Voice-first ambient AI operating system for Ben Curry.

## Stack
- **Frontend**: React + Vite → Vercel
- **Backend**: Node.js/Express → Railway
- **Storage**: Supabase
- **AI Brain**: Claude claude-sonnet-4-6

## Agents
| Agent | Capability |
|-------|-----------|
| Brain | Routes all voice/text commands, composes morning briefing |
| Client | GHL pipeline, onboarding triggers, follow-up DMs, contract status |
| Files & Notes | PDF upload+summarize, voice notes by topic |
| Research | Web search (Brave/Serper), daily competitor intel |
| Social | Instagram/Facebook scheduling, analytics, DM draft replies |
| Calendar | Google Calendar OAuth, create events by voice, daily schedule |
| Browser | Open URLs/sites by voice command |

## Quick Start

### Backend (Railway)
```bash
cd jarvis/backend
cp .env.example .env   # fill in all keys
npm install
npm run dev
```

### Frontend (Vercel)
```bash
cd jarvis/frontend
npm install
npm run dev
```

### Supabase
Run `supabase-schema.sql` in your Supabase SQL editor.

### Google Calendar OAuth (one-time)
1. Visit `http://localhost:3001/auth/google`
2. Authorize, copy the `refresh_token` from the response
3. Add it to backend `.env` as `GOOGLE_REFRESH_TOKEN`

## Environment Variables

See `backend/.env.example` for all required keys:
- `ANTHROPIC_API_KEY` — Claude API
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
- `GHL_API_KEY` + `GHL_LOCATION_ID`
- `SERPER_API_KEY` or `BRAVE_API_KEY`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN` + `FACEBOOK_PAGE_ID` + `FACEBOOK_ACCESS_TOKEN`

## Deploy to Vercel
Update `frontend/vercel.json` → replace `your-railway-app.railway.app` with your Railway URL.
