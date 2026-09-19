.PHONY: install run front back clean

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

clean:
	@echo "Cleaning build files..."
	@rm -rf frontend/node_modules frontend/dist
	@find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true