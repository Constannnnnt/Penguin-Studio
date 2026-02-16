from fastapi.testclient import TestClient
from loguru import logger
import pytest
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_endpoint_registration(client):
    """Verify all endpoints are registered correctly."""
    logger.info("Testing endpoint registration...")

    routes = [route.path for route in app.routes]
    logger.info(f"Registered routes: {routes}")

    expected_routes = [
        "/api/v1/segment",
        "/api/v1/results/{result_id}",
        "/api/v1/health",
        "/ws/segment",
        "/outputs",
    ]

    for route in expected_routes:
        assert route in routes, f"Route missing: {route}"
        logger.info(f"✓ Route registered: {route}")


def test_openapi_docs(client):
    """Verify OpenAPI documentation is accessible."""
    logger.info("Testing OpenAPI documentation...")
    response = client.get("/docs")
    assert response.status_code == 200, f"OpenAPI docs failed: {response.status_code}"
    logger.info("✓ OpenAPI docs accessible at /docs")
