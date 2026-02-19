## 2026-02-18 - Full Store Subscription Re-renders
**Learning:** Components rendering items from a store list (like `DraggableMaskOverlay`) cause O(N) re-renders when subscribing to the full store state, even if they are memoized. Each store update triggers a re-render for every item because the hook returns a new state object.
**Action:** Always use targeted selectors with `useShallow` (or granular selectors) in list item components to subscribe only to the specific data needed for that item.

## 2026-03-05 - File Upload Memory Bottleneck
**Learning:** `UploadFile.read()` in FastAPI loads the entire file into memory (bytes), which can cause memory exhaustion with concurrent large uploads. The underlying `file` attribute (SpooledTemporaryFile) supports `shutil.copyfileobj` for streaming, but it must be run in a threadpool to avoid blocking the event loop.
**Action:** Always use `shutil.copyfileobj` wrapped in `asyncio.to_thread` or `run_in_threadpool` for handling file uploads > 1MB, and check file size using `seek(0, 2)` instead of reading content.
