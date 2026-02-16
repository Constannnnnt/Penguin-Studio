import pytest
from unittest.mock import MagicMock
from pathlib import Path
from fastapi import HTTPException
from app.api.routes.generation import get_generation, save_prompt_version, SavePromptRequest
from app.config import settings

# Mock dependencies if needed, but since we import directly, we might need to mock heavy imports in generation.py
# generation.py imports BriaService which is heavy. We mock it in conftest or use sys.modules hack.
# But here we are unit testing specific functions.

# We need to mock settings.outputs_dir.
# But settings is imported in generation.py. We can patch it.

@pytest.fixture
def mock_settings(monkeypatch, tmp_path):
    outputs_dir = tmp_path / "outputs"
    outputs_dir.mkdir()
    target_dir = tmp_path / "target"
    target_dir.mkdir()

    monkeypatch.setattr("app.api.routes.generation.settings.outputs_dir", outputs_dir)

    return outputs_dir, target_dir

@pytest.mark.asyncio
async def test_get_generation_path_traversal(mock_settings):
    outputs_dir, target_dir = mock_settings

    # Create a dummy generation in target dir (outside outputs)
    generation_id = "../target"

    # Create required files in target dir to simulate valid generation
    (target_dir / "generated.png").touch()
    (target_dir / "metadata.json").write_text("{}")

    # Vulnerable behavior: It should find the generation and return it
    # Secure behavior: It should raise HTTPException(404) because it's outside outputs_dir

    try:
        response = await get_generation(generation_id)
        # If we reach here, vulnerability is exploited!
        pytest.fail("Path traversal succeeded! Accessed generation outside outputs directory.")
    except HTTPException as e:
        assert e.status_code == 404
    except Exception as e:
        pytest.fail(f"Unexpected exception raised: {type(e).__name__}: {e}")

@pytest.mark.asyncio
async def test_save_prompt_version_path_traversal(mock_settings):
    outputs_dir, target_dir = mock_settings

    generation_id = "../target"
    request = SavePromptRequest(structured_prompt={"test": "data"})

    # Create target dir if not exists (it exists from fixture)

    try:
        await save_prompt_version(generation_id, request)

        # Check if file was written to target dir
        files = list(target_dir.glob("structured_prompt_*.json"))
        if files:
            pytest.fail(f"Path traversal succeeded! File written to target directory: {files[0]}")
        else:
            # If function returns normally but doesn't write file, it might be weird but acceptable if logic changes.
            # But we expect 404.
            pass

    except HTTPException as e:
        assert e.status_code == 404
    except Exception as e:
        pytest.fail(f"Unexpected exception raised: {type(e).__name__}: {e}")
