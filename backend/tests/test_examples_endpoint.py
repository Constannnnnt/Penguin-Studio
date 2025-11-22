"""Integration tests for examples endpoint."""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import settings


@pytest.fixture
def client():
    """Create test client."""
    app = create_app()
    return TestClient(app)


def test_examples_directory_exists():
    """Test that examples directory exists and contains files."""
    assert settings.examples_dir.exists(), f"Examples directory not found: {settings.examples_dir}"
    
    files = list(settings.examples_dir.glob("*"))
    assert len(files) > 0, "Examples directory is empty"
    
    # Check for expected files
    assert (settings.examples_dir / "01.png").exists(), "01.png not found"
    assert (settings.examples_dir / "01.json").exists(), "01.json not found"


def test_example_image_accessible(client):
    """Test that example image is accessible via HTTP."""
    response = client.get("/examples/01.png")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.headers["content-type"].startswith("image/"), \
        f"Expected image content-type, got {response.headers['content-type']}"
    assert len(response.content) > 0, "Image content is empty"


def test_example_json_accessible(client):
    """Test that example JSON is accessible via HTTP."""
    response = client.get("/examples/01.json")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.headers["content-type"] == "application/json", \
        f"Expected application/json, got {response.headers['content-type']}"
    assert len(response.content) > 0, "JSON content is empty"


def test_cors_headers_present(client):
    """Test that CORS headers are correctly configured."""
    # Test with origin header
    response = client.get(
        "/examples/01.png",
        headers={"Origin": "http://localhost:5173"}
    )
    
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers, \
        "CORS header 'access-control-allow-origin' not found"
    
    cors_origin = response.headers["access-control-allow-origin"]
    assert cors_origin in ["http://localhost:5173", "*"], \
        f"Unexpected CORS origin: {cors_origin}"


def test_nonexistent_example_returns_404(client):
    """Test that requesting non-existent example returns 404."""
    response = client.get("/examples/nonexistent.png")
    assert response.status_code == 404


def test_cors_configuration():
    """Test that CORS is configured with correct origins."""
    assert "http://localhost:5173" in settings.cors_origins, \
        "Frontend origin not in CORS configuration"
