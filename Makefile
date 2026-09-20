.PHONY: install run front back sim clean docker-build docker-up docker-down docker-logs

# The simulator folder is named per-platform (ParkingSimulator-linux-x64,
# ParkingSimulator-win-x64, ...). Pick whichever exists in the repo root.
SIM_DIR := $(or $(wildcard ParkingSimulator-linux-x64),$(wildcard ParkingSimulator-win-x64),ParkingSimulator-linux-x64)

install:
	@echo "Installing dependencies..."
	@cd backend && uv sync
	@cd frontend && npm install

run:
	@echo "Running front and back end..."
	@cd backend && uv run uvicorn main:app --port 8000 --app-dir src --reload & \
	cd frontend && npm run dev

front:
	@echo "Running front end..."
	@cd frontend && npm install && npm run dev

back:
	@echo "Running back end..."
	@cd backend && uv sync && uv run uvicorn main:app --port 8000 --app-dir src --reload

sim:
	@echo "Starting simulator from $(SIM_DIR)..."
	@cd $(SIM_DIR) && ./ParkingSimulator

docker-build:
	@echo "Building container images..."
	@docker compose build

docker-up:
	@echo "Starting front and back end in containers..."
	@docker compose up --build

docker-down:
	@echo "Stopping containers..."
	@docker compose down

docker-logs:
	@docker compose logs -f

clean:
	@echo "Cleaning build files..."
	@rm -rf frontend/node_modules frontend/dist
	@find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true