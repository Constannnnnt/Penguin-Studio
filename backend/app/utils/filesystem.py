import asyncio
import json
from pathlib import Path
from typing import Any, List, Union

from app.config import settings


def ensure_directories() -> None:
    """Create required directories if they don't exist."""
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.outputs_dir.mkdir(parents=True, exist_ok=True)


async def read_json_async(path: Union[str, Path]) -> Any:
    """Read and parse a JSON file asynchronously."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _read_json_sync, path)


def _read_json_sync(path: Union[str, Path]) -> Any:
    """Synchronous helper for reading JSON."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


async def write_json_async(path: Union[str, Path], data: Any, indent: int = 2) -> None:
    """Serialize and write data to a JSON file asynchronously."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _write_json_sync, path, data, indent)


def _write_json_sync(path: Union[str, Path], data: Any, indent: int) -> None:
    """Synchronous helper for writing JSON."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


async def glob_async(path: Path, pattern: str) -> List[Path]:
    """Glob a directory asynchronously."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, list, path.glob(pattern))
