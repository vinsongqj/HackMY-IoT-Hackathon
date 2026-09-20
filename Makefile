.PHONY: install run front back clean docker-build docker-up docker-down docker-logs

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