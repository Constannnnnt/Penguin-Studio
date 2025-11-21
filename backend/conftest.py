"""Pytest configuration and fixtures."""
import sys
from pathlib import Path

# Add backend directory to Python path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
