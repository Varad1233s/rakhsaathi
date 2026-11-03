# RaktSaathi

Verified blood-request coordination: **Requester → Hospital verification → matched Donors → Medical coordination → Blood bank supply → Fulfilled.**

Stack: React 19 + Vite + TypeScript + MUI 7 (SaasAble-inspired shell) · Node + Express + TypeScript · PostgreSQL + Prisma · Socket.IO · Leaflet/OpenStreetMap.

> **Honest status:** this project was written in an offline sandbox. The shared pure logic (Haversine, blood compatibility, state machine, AI scoring) has passing unit tests, but **`npm install`, `tsc`, `prisma validate/migrate`, `vite build` and Playwright have NOT been run yet** because the sandbox had no internet and no PostgreSQL. Run the steps below; if the first `npm run typecheck`/`build` reports errors, send them back and they are quick fixes.

## Windows setup (PowerShell)

Prerequisites: Node.js 20.19+ (or 22), Git, and PostgreSQL 16 **or** Docker Desktop.

```powershell
# 0) Unzip, then open PowerShell in the rakt-saathi folder
cd path\to\rakt-saathi

# 1) PostgreSQL — option A: Docker
Copy-Item .env.example .env
docker compose up -d
#    option B: installed PostgreSQL
#    psql -U postgres -c "CREATE DATABASE raktsaathi;"

# 2) Backend
cd backend
Copy-Item .env.example .env
#    Edit .env: set DATABASE_URL password, and JWT_SECRET (>= 32 chars). Generate one:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm install
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init     # creates the first migration + tables
npm run seed                           # admin user (+ clearly-labelled DEMO data if SEED_DEMO_DATA=true)
npm run typecheck
npm test
npm run dev                            # API on http://localhost:4000

# 3) Frontend (new PowerShell window)
cd path\to\rakt-saathi\frontend
Copy-Item .env.example .env
npm install
npm run build                          # runs tsc + vite build
npm run dev                            # http://localhost:5173
```

Sign in: admin `admin@raktsaathi.local` / the `SEED_ADMIN_PASSWORD` you set. Demo users (if seeded; password `Demo@12345`):
`requester@demo.local`, `hospital@demo.local`, `arjun@demo.local` (donor), `priya@demo.local`, `sneha@demo.local`, `bank@demo.local`.
Remove demo data before any real deployment (`SEED_DEMO_DATA=false`).

Phone testing on the same Wi-Fi: set `CLIENT_ORIGIN` in `backend/.env` to include `http://<PC-IP>:5173`, set `VITE_API_URL=http://<PC-IP>:4000` in `frontend/.env`, allow ports 4000/5173 in Windows Firewall. Geolocation on a phone needs **HTTPS** (use a tunnel such as `cloudflared`/`ngrok` or a deployed HTTPS host); plain `http://<PC-IP>` will not give location.

## Environment variables
`backend/.env.example` and `frontend/.env.example` document every variable (DB URL, JWT secret/expiry, port, allowed origins, matching radius, minimum donation interval, seed credentials, `VITE_API_URL`).

## Architecture
```
backend/src  config/ middleware/ routes/ services/ sockets/ utils/   (routes hold the HTTP handlers; services hold business logic)
backend/prisma  schema.prisma  seed.ts   (migrations/ is created by `prisma migrate dev`)
frontend/src  components/ layouts/ pages/{public,requester,donor,hospital,bloodbank,admin,shared}/ services/ hooks/ context/ utils/ theme/
```

### Rules enforced by the backend
- Request states `PENDING_VERIFICATION → VERIFIED → DONOR_ACCEPTED → MEDICAL_COORDINATION → FULFILLED` (+ `REJECTED`, `CANCELLED`, `EXPIRED`) via a transition table (`utils/transitions.ts`); illegal moves return 409. Overdue requests expire automatically (5-minute job).
- Requester and patient are separate records. "Myself / Someone else" supported; different names are never rejected.
- Hospitals are searched from PostgreSQL. New hospitals are always `PENDING_VERIFICATION`; only admins verify them; requests can target only verified hospitals; only staff of a *verified* hospital can verify/reject requests. Staff joining an existing hospital need admin approval.
- Donor coordinates are stored privately and used only server-side; every API returns **approximate distance rounded up to 0.5 km**, never coordinates.
- Donor matching uses a fixed red-cell compatibility table plus an outreach filter (available, ≥ N days since last donation, within radius or same city). AI never decides compatibility, eligibility or treatment.
- Blood bank allocation is transactional, compatibility-checked, supports partial fulfilment, FEFO batch consumption, inventory log, low-stock and expiry tracking.
- Socket.IO events: `request.created`, `request.verified`, `request.rejected`, `donor.responded`, `bloodbank.updated`, `request.fulfilled`, `notification.created`, `donor.location.updated` (the last goes only to the donor's own sessions, by design, to protect privacy).

### AI-assisted features (`utils/ai.ts`, `routes/ai.ts`)
Transparent statistical/rule-based helpers, no external model or API key: donor outreach priority score, duplicate-request detection (flag, never blocks), shortage forecast (days of cover from 14-day allocations), emergency summary text, weekly operational report. They can be swapped for an LLM later behind the same endpoints.

## Location limits
Browsers only deliver position while the page is open and active. Closing the tab or locking an iPhone suspends `watchPosition`; a website cannot do native background tracking. The donor UI says so, and the app fully works with location denied (matching falls back to city).

## Known limitations
- Not yet compiled/tested by the author (see top). No Playwright suite is included; responsive QA is by design (breakpoints, safe-area insets, 16 px inputs, table→card, bottom nav) and must be verified on your devices.
- No email/SMS delivery; notifications are in-app and live via sockets.
- Hospital/bank map coordinates are entered by admins at verification time (no geocoding service).
- PWA: manifest + icon (Add to Home Screen). No offline service worker.
- Passwords use `bcryptjs` (pure JS) instead of native `bcrypt` to avoid Windows build tooling.
- Account recovery / email verification are not implemented.
- Real clinical safeguards (donor screening, cross-matching) remain with hospitals; the app states this in the UI.

## Licence
Project code: yours to license. UI structure inspired by SaasAble UI (MIT, © Phoenixcoded) — see `THIRD_PARTY_LICENSES.md`.
