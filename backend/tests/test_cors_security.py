
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import types

# Helper to mock a module and its children
def mock_module(name):
    sys.modules[name] = MagicMock()

# Mock heavy external dependencies
mock_module("sam3")
mock_module("torch")
mock_module("transformers")
mock_module("spacy")
mock_module("sentence_transformers")

# Handle namespace packages
google = types.ModuleType("google")
sys.modules["google"] = google
sys.modules["google.generativeai"] = MagicMock()
sys.modules["google.api_core"] = MagicMock()
sys.modules["google.genai"] = MagicMock()

google_adk = types.ModuleType("google.adk")
google_adk.Agent = MagicMock()
google_adk.Runner = MagicMock()
sys.modules["google.adk"] = google_adk

google_adk_sessions = types.ModuleType("google.adk.sessions")
sys.modules["google.adk.sessions"] = google_adk_sessions

sys.modules["google.adk.sessions.in_memory_session_service"] = MagicMock()

# Now import app
from app.main import app  # noqa: E402
from app.api import dependencies  # noqa: E402

# Patch the dependency override for get_sam3_model
app.dependency_overrides[dependencies.get_sam3_model] = lambda: MagicMock()

client = TestClient(app)

def test_cors_rejected():
    """Verify that evil origin is rejected"""
    response = client.options(
        "/api/v1/segment",
        headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # CORSMiddleware does not add ACAO header if origin is not allowed
    assert "access-control-allow-origin" not in response.headers

def test_cors_allowed():
    """Verify that allowed origin is accepted"""
    response = client.options(
        "/api/v1/segment",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"

def test_static_cors_rejected():
    """Verify that evil origin is rejected for static files"""
    response = client.options(
        "/outputs/test.png",
        headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # My custom implementation returns "null" if not allowed
    # But wait, CORSMiddleware might intercept this too if it matches path?
    # If CORSMiddleware intercepts, it behaves like test_cors_rejected (no header).
    # If it falls through to CORSStaticFiles, it returns "null".

    # Since CORSMiddleware is on the main app, it likely intercepts.
    if "access-control-allow-origin" in response.headers:
        assert response.headers["access-control-allow-origin"] == "null"
    else:
        # If header is missing, that's also valid rejection
        pass

def test_static_cors_allowed():
    """Verify that allowed origin is accepted for static files"""
    response = client.options(
        "/outputs/test.png",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
