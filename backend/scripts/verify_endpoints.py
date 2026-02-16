import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

# Add thirdparty/sam3 directory to sys.path
THIRDPARTY_SAM3 = ROOT.parent / "thirdparty" / "sam3"
if str(THIRDPARTY_SAM3) not in sys.path:
    sys.path.append(str(THIRDPARTY_SAM3))

from fastapi.testclient import TestClient
from loguru import logger

from app.main import app


def test_endpoints():
    """Verify all endpoints are registered correctly."""
    client = TestClient(app)

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
        if route in routes:
            logger.info(f"✓ Route registered: {route}")
        else:
            logger.error(f"✗ Route missing: {route}")

    logger.info("\nTesting OpenAPI documentation...")
    response = client.get("/docs")
    if response.status_code == 200:
        logger.info("✓ OpenAPI docs accessible at /docs")
    else:
        logger.error(f"✗ OpenAPI docs failed: {response.status_code}")

    logger.info("\nEndpoint verification complete!")


if __name__ == "__main__":
    test_endpoints()
