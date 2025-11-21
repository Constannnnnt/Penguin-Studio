import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock

project_root = Path(__file__).resolve().parents[1]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

thirdparty_sam3 = project_root.parent / "thirdparty" / "sam3"
if str(thirdparty_sam3) not in sys.path:
    sys.path.insert(0, str(thirdparty_sam3))


def mock_sam3_imports():
    """Mock sam3 module imports for testing."""
    sam3_mock = MagicMock()
    sam3_mock.__file__ = str(thirdparty_sam3 / "sam3" / "__init__.py")
    
    sys.modules["sam3"] = sam3_mock
    sys.modules["sam3.model"] = MagicMock()
    sys.modules["sam3.model.sam3_image_processor"] = MagicMock()
    
    Sam3Processor = MagicMock()
    sys.modules["sam3.model.sam3_image_processor"].Sam3Processor = Sam3Processor
    
    sys.modules["sam3"].build_sam3_image_model = MagicMock()


if "sam3" not in sys.modules:
    mock_sam3_imports()
