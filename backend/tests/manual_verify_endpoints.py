import sys
from pathlib import Path

# Ensure backend directory is in path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure thirdparty/sam3 is in path
REPO_ROOT = ROOT.parent
SAM3_PATH = REPO_ROOT / "thirdparty" / "sam3"
if str(SAM3_PATH) not in sys.path:
    sys.path.append(str(SAM3_PATH))

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
