# EcoBuddy — Adaptive Environmental Quiz

A study buddy that generates adaptive multiple-choice questions about environmental topics using OpenAI. Built for the Lamma fullstack home assignment.

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key
- **PostgreSQL** via Docker Desktop (required — no SQLite fallback)

## Quick start

### 1. Start PostgreSQL

1. **Start Docker Desktop** (wait until it shows "Running" in the system tray).
2. Then:

```bash
docker compose up -d db
```

If you see `dockerDesktopLinuxEngine: The system cannot find the file specified`, Docker Desktop is **not running** — open it from the Start menu and retry.

If Postgres is down, the API will not start (and the UI shows the generic support error). There is no SQLite fallback.

### 2. Backend

```bash
cd backend
copy .env.example .env   # Windows — or cp on Mac/Linux
# Edit .env and set OPENAI_API_KEY=sk-...

python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Features

- AI-generated adaptive questions (reinforce on wrong, advance on correct)
- Session resume on browser refresh (state in PostgreSQL)
- Curious-peer EcoBuddy persona
- Session insights summary at end
- Coins (+1 for 3-in-a-row, +5 per set) and DiceBear avatar closet

## Design notes

See [`docs/design-decisions.md`](docs/design-decisions.md) for architecture rationale (slideshow source), including **live LLM failure modes & mitigations**.

### OpenAI vs mock mode

In `backend/.env`:

- `MOCK_LLM=true` — deterministic sample questions (no API calls, good for demos)
- `MOCK_LLM=false` + `OPENAI_API_KEY=sk-...` — real generation (requires credits)

## Project structure

```
backend/app/     FastAPI, models, LLM service, quiz logic
frontend/src/    React UI, DiceBear avatar, closet
docs/            Design decisions for slide deck
```
