
import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import settings
from app.api.dependencies import get_segmentation_service

@pytest.fixture
def client(tmp_path):
    # Mock settings.outputs_dir to use tmp_path
    with patch("app.config.settings.outputs_dir", tmp_path):
        app = create_app()

        # Override get_segmentation_service to avoid loading spacy/models
        app.dependency_overrides[get_segmentation_service] = lambda: MagicMock()

        yield TestClient(app)

def test_get_generation_calls_validate_path(client, tmp_path):
    # We want to verify that validate_path is called with the generation_id

    with patch("app.api.routes.generation.validate_path") as mock_validate:
        # Set return value to be a valid path so it proceeds
        mock_validate.return_value = tmp_path / "some-id"
        (tmp_path / "some-id").mkdir()

        gen_id = "some-id"
        response = client.get(f"/api/generate/{gen_id}")

        assert response.status_code == 200 # Should be OK

        # Verify validate_path was called
        mock_validate.assert_called_once()
        args, _ = mock_validate.call_args
        assert args[1] == gen_id

def test_get_generation_traversal_blocked(client, tmp_path):
    # We want to verify that if validate_path raises ValueError, we get 404

    with patch("app.api.routes.generation.validate_path") as mock_validate:
        mock_validate.side_effect = ValueError("Path traversal attempt")

        gen_id = "evil-id"
        response = client.get(f"/api/generate/{gen_id}")

        assert response.status_code == 404
        assert "Generation not found" in response.json()["detail"]

        mock_validate.assert_called_once()

def test_load_generation_traversal_blocked(client):
    # Verify load_generation uses validate_path too

    with patch("app.api.routes.generation.validate_path") as mock_validate:
        mock_validate.side_effect = ValueError("Path traversal attempt")

        response = client.get("/api/load-generation/evil-id")

        assert response.status_code == 404
        mock_validate.assert_called_once()

def test_segment_generation_traversal_blocked(client):
    # Verify segment_generation uses validate_path too

    with patch("app.api.routes.generation.validate_path") as mock_validate:
        mock_validate.side_effect = ValueError("Path traversal attempt")

        response = client.post("/api/segment-generation/evil-id")

        assert response.status_code == 404
        mock_validate.assert_called_once()
