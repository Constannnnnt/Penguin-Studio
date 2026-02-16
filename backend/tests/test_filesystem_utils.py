import json

import pytest
from app.utils.filesystem import glob_async, read_json_async, write_json_async


@pytest.mark.asyncio
async def test_read_json_async(tmp_path):
    # Setup
    test_file = tmp_path / "test.json"
    data = {"key": "value", "list": [1, 2, 3]}
    with open(test_file, "w") as f:
        json.dump(data, f)

    # Execute
    result = await read_json_async(test_file)

    # Verify
    assert result == data


@pytest.mark.asyncio
async def test_write_json_async(tmp_path):
    # Setup
    test_file = tmp_path / "output.json"
    data = {"key": "value", "nested": {"a": 1}}

    # Execute
    await write_json_async(test_file, data)

    # Verify
    assert test_file.exists()
    with open(test_file, "r") as f:
        content = json.load(f)
    assert content == data


@pytest.mark.asyncio
async def test_glob_async(tmp_path):
    # Setup
    (tmp_path / "file1.txt").touch()
    (tmp_path / "file2.txt").touch()
    (tmp_path / "other.log").touch()

    # Execute
    txt_files = await glob_async(tmp_path, "*.txt")

    # Verify
    assert len(txt_files) == 2
    names = sorted([f.name for f in txt_files])
    assert names == ["file1.txt", "file2.txt"]
