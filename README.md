# AgriPulse

AgriPulse is a crop-market intelligence app with:
- Next.js frontend (`app/`, `components/`, `lib/`)
- FastAPI backend (`backend/app`)
- Forecast + recommendation pipeline
- Report history and PDF download endpoints
- Optional external mandi price source (data.gov.in), with local CSV fallback

## Current capabilities

- 7-day forecast response for crop/mandi
- Recommendation (`WAIT`, `SELL NOW`, `HOLD`) with confidence/risk
- Volatility and shock alert output
- Best mandi comparison endpoint
- Saved report history + PDF download (SQLite-backed persistence)
- Server-side report search, filters, sort, and pagination
- Baseline fallback model when data is limited (`model_used: baseline`)
- Automatic fallback to baseline when Prophet runtime fails
- Metadata endpoint cache (TTL) for better responsiveness
- Forecast endpoint cache (short TTL) for faster repeated requests
- JWT login for report APIs (`/auth/login`, `/auth/me`)
- Per-user report history/download/delete scoped to authenticated user

## Quick run (Windows)

### Backend only

```powershell
.\run-backend.cmd
```

Backend docs: `http://127.0.0.1:9877/docs`

### Frontend only

```powershell
.\run-frontend.cmd
```

Frontend: `http://127.0.0.1:3000`

By default the launcher runs frontend in `dev` mode for faster startup.
Set `AGRIPULSE_FRONTEND_MODE=prod` in `.env.local` when you want production mode.

### Both (two terminals auto-opened)

```powershell
.\run-dev.cmd
```

In PowerShell, always use `.\` for local scripts. In Command Prompt, you can run `run-dev.cmd` directly.

## Manual run commands

### Backend

```cmd
cd backend
..\.venv311\Scripts\python.exe -m pip install -r requirements.txt
..\.venv311\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9877
```

### Frontend

```cmd
pnpm install
pnpm dev
```

If `pnpm` is unavailable:

```cmd
npm install
npm run dev
```

## Environment variables

Copy `.env.example` to `.env.local` and adjust values as needed.

Important keys:
- `NEXT_PUBLIC_API_BASE_URL` (frontend -> backend URL)
- `NEXT_PUBLIC_API_KEY` (optional; only needed when backend key auth is enabled)
- `AGRIPULSE_API_KEY_ENABLED` (`0` by default)
- `AGRIPULSE_API_KEY`
- `AGRIPULSE_PRICE_SOURCE` (`local_csv` recommended for local development)
- `AGRIPULSE_REPORTS_DB_PATH` (optional custom SQLite path)
- `AGRIPULSE_AUTH_ENABLED` (`1` enables JWT protection for report APIs)
- `AGRIPULSE_AUTH_DEMO_USERNAME` / `AGRIPULSE_AUTH_DEMO_PASSWORD` (demo login credentials)

## Docker

```cmd
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:9877/docs`

## Testing

### Backend tests

```cmd
cd backend
..\.venv311\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```

### Frontend type-check

```cmd
pnpm lint
```

## API endpoints

- `GET /health`
- `GET /metadata`
- `POST /forecast`
- `GET /best-mandi`
- `POST /auth/login`
- `GET /auth/me`
- `POST /reports/save`
- `GET /reports/history`
- `GET /reports/download/{report_id}`
- `DELETE /reports/{report_id}`

## Upgrade roadmap

1. Replace in-memory metadata cache with Redis for multi-instance deployments.
2. Move report storage from SQLite to PostgreSQL.
3. Add background jobs for scheduled forecast generation.
4. Add DB-backed users (hashed passwords + refresh tokens) instead of demo credentials.
5. Add CI workflow for backend tests + frontend type checks on every push.
