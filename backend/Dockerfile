# syntax=docker/dockerfile:1

# The uv image bundles a CPython 3.12 plus the uv resolver, so the lockfile
# drives an exact, reproducible install (same result as `uv sync` locally).
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Sensible default so the container can reach a simulator running on the
    # host. Anything set in backend/.env (injected via docker compose env_file)
    # overrides this.
    SIMULATOR_BASE_URL=http://host.docker.internal:9898

# Keep the repo layout (.../backend/src/...) inside the image so config.py's
# `Path(__file__).resolve().parents[2]` still resolves to the project root, and
# so ParkingSimulator*/settings can optionally be mounted at /app.
WORKDIR /app/backend

# Resolve dependencies from the lockfile first: this layer stays cached until
# pyproject.toml / uv.lock change, so editing source doesn't reinstall anything.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY src ./src

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "src"]
