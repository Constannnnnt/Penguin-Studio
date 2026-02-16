import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock

from app.main import app
from app.services.file_service import FileService
from app.api.dependencies import get_file_service, get_sam3_model

@pytest.fixture
def mock_sam3_model():
    mock = Mock()
    mock.load = AsyncMock()
    return mock

@pytest.fixture
def client(mock_sam3_model):
    # Override dependencies
    app.dependency_overrides[get_sam3_model] = lambda: mock_sam3_model
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}

@pytest.fixture
def mock_file_service(tmp_path):
    service = Mock(spec=FileService)
    service.outputs_dir = tmp_path / "outputs"
    service.outputs_dir.mkdir()

    # Create some dummy files
    result_dir = service.outputs_dir / "result_1"
    result_dir.mkdir()
    (result_dir / "image.png").touch()

    return service

def test_get_library(client, mock_file_service):
    app.dependency_overrides[get_file_service] = lambda: mock_file_service

    response = client.get("/api/v1/library")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Home"
    assert data["type"] == "directory"

    # Find results node
    results_node = next((c for c in data["children"] if c["name"] == "results"), None)
    assert results_node is not None
    assert results_node["type"] == "directory"

    # Check for result_1
    result_1_node = next((c for c in results_node["children"] if c["name"] == "result_1"), None)
    assert result_1_node is not None
    assert result_1_node["type"] == "directory"
