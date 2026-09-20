# hackmyiot

## Setup

1. Download/unzip the Park Simulator and place the `ParkingSimulator-win-x64` folder directly at the **repo root** (as a sibling of `backend/` and `frontend/`). It's gitignored, so this step is manual for everyone who clones the repo.

   The backend expects it at exactly this path:
   ```
   hackmyiot/
   ├── ParkingSimulator-win-x64/
   │   ├── ParkingSimulator.exe
   │   └── settings/
   │       ├── settings.json
   │       └── lvl1.json
   ├── backend/
   └── frontend/
   ```

2. In `backend/`, copy `.env.example` to `.env` and fill in your Supabase credentials (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`).

3. In `ParkingSimulator-win-x64/settings/settings.json`, set `WebhookUrl` to `http://localhost:8000/webhook`.

4. Run the backend:
   ```
   cd backend
   uv sync
   uv run uvicorn main:app --port 8000 --app-dir src
   ```

5. Run the simulator (`ParkingSimulator.exe`) alongside it.

## Run with Docker

Both services are containerized and wired together with `docker compose`:

- **backend** — FastAPI/uvicorn from `backend/Dockerfile`, listening on `:8000`.
  `backend/.env` is injected into the container via `env_file`; secrets are never
  baked into the image.
- **frontend** — the Vite build served by nginx from `frontend/Dockerfile`, on
  `http://localhost:8080`. nginx reverse-proxies `/api` and `/ws` to the backend
  container, so the app stays same-origin (no CORS setup needed).

1. Create `backend/.env` (step 2 above) and fill in your Supabase credentials.

2. Start the simulator on the host as usual, then build and run:

   ```
   docker compose up --build
   ```

   Open the dashboard at http://localhost:8080.

3. The backend container reaches the simulator on your host through
   `http://host.docker.internal:9898`, which is its default. If your simulator
   listens elsewhere, override it in `backend/.env`:

   ```
   SIMULATOR_BASE_URL=http://host.docker.internal:9898
   ```

   `host.docker.internal` is mapped to the host via `extra_hosts` in
   `docker-compose.yml`, so this also works on Linux. Alternatively, mount the
   simulator's `settings/` folder (see the commented `volumes` entry) to reuse its
   `ListenAddress` / `Name` / `Password`.

Because the backend publishes port 8000, the simulator's existing
`WebhookUrl` of `http://localhost:8000/webhook` keeps working unchanged.

Handy targets: `make docker-build`, `make docker-up`, `make docker-down`,
`make docker-logs`.
