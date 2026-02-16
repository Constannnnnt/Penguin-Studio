# SAM3 Segmentation Service Backend

FastAPI-based backend service for image segmentation using SAM3 model.

## Running the Application

Always run commands from the `backend` directory:

```bash
cd backend

# Run the API server
uv run penguin-api

# Or use Python module syntax
uv run python -m app.main

# Or use the run script
uv run python run.py
```

## Running Tests

```bash
cd backend

# Run all tests
uv run pytest -q

# Run manual SAM3 test script
uv run python tests/manual_test_sam3.py

# Run specific test
uv run pytest -k "test_name" -q
```

## Important Notes

- Never run `python main.py` directly from the `app` directory
- Always execute from the `backend` directory to ensure proper module resolution
- The `conftest.py` file handles path setup for all tests automatically
