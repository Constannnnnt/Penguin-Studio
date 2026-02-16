
import pytest
from pathlib import Path
from app.utils.filesystem import validate_path

def test_validate_path_success(tmp_path):
    base = tmp_path / "base"
    base.mkdir()

    # Valid child
    result = validate_path(base, "child")
    assert result == base / "child"

    # Valid nested child
    result = validate_path(base, "child/nested")
    assert result == base / "child" / "nested"

def test_validate_path_traversal_attempt(tmp_path):
    base = tmp_path / "base"
    base.mkdir()

    # Simple traversal
    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "../outside")

    # Traversal to root
    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "/etc/passwd")

    # Sneaky traversal
    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "child/../../outside")

def test_validate_path_absolute_input(tmp_path):
    base = tmp_path / "base"
    base.mkdir()

    # Absolute path input that is outside base
    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "/tmp/evil")

def test_validate_path_symlink(tmp_path):
    base = tmp_path / "base"
    base.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret").touch()

    # Create symlink inside base pointing to outside
    link = base / "link"
    link.symlink_to(outside)

    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "link")

def test_validate_path_partial_traversal(tmp_path):
    # Test partial traversal: base=/tmp/base, attempt=/tmp/base_suffix
    base = tmp_path / "base"
    base.mkdir()

    # Create sibling directory that shares prefix
    base_suffix = tmp_path / "base_suffix"
    base_suffix.mkdir()

    # Construct relative path that resolves to base_suffix
    # ../base_suffix

    with pytest.raises(ValueError, match="Path traversal attempt"):
        validate_path(base, "../base_suffix")
