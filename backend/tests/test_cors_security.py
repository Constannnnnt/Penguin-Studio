import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_cors_middleware_secure():
    """
    Test that the application rejects unauthorized origins and accepts authorized ones.
    """
    # 1. Authorized Origin
    authorized_origin = "http://localhost:5173"
    response = client.options("/", headers={"Origin": authorized_origin, "Access-Control-Request-Method": "GET"})

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == authorized_origin

    # 2. Unauthorized Origin
    unauthorized_origin = "http://evil.com"
    response = client.options("/", headers={"Origin": unauthorized_origin, "Access-Control-Request-Method": "GET"})

    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin != "*" and allow_origin != unauthorized_origin, f"Vulnerability: Unauthorized origin allowed ({allow_origin})"

def test_cors_staticfiles_secure():
    """
    Test that static files also respect CORS settings.
    """
    # Ensure outputs directory exists
    settings.outputs_dir.mkdir(parents=True, exist_ok=True)

    # Create a dummy file in outputs directory for testing
    output_file = settings.outputs_dir / "test.txt"
    output_file.write_text("test content")

    try:
        # 1. Authorized Origin
        authorized_origin = "http://localhost:5173"
        response = client.get("/outputs/test.txt", headers={"Origin": authorized_origin})

        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == authorized_origin

        # 2. Unauthorized Origin
        unauthorized_origin = "http://evil.com"
        response = client.get("/outputs/test.txt", headers={"Origin": unauthorized_origin})

        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin != "*" and allow_origin != unauthorized_origin, f"Vulnerability: Unauthorized origin allowed for static files ({allow_origin})"

    finally:
        if output_file.exists():
            output_file.unlink()
