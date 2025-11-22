# Penguin Architecture

## Overview
- Full-stack image generation and SAM3-based segmentation workspace.
- Frontend: React + Vite + TypeScript with Zustand state, Tailwind/shadcn UI, WebSocket + REST clients.
- Backend: FastAPI service wrapping SAM3 model; async file handling, WebSocket streaming, and metrics.
- Assets and results: uploads/ for raw inputs, outputs/ for generated masks, examples/ for demo pairs served statically.

## Frontend
- **Entry & layout**: `src/main.tsx` bootstraps performance logging then renders `App` → `IDELayout`. `ThemeProvider` supplies dark/light tokens; `Toaster` shows inline notifications.
- **State stores (Zustand)**:
  - `configStore`: user prompt/config builder with nested field updates, object add/remove, active panel selection.
  - `segmentationStore`: orchestrates segmentation requests (upload or example), progress/errors, mask selection/visibility, and last operation retry. Normalizes URLs against `VITE_API_BASE_URL` and preloads mask PNGs for smoother overlay.
  - `layoutStore`: persists panel collapse/width and active controls tab.
  - `fileSystemStore`: keeps a virtual tree of generated images (auto-injects segmented images).
  - `imageEditStore`: local edits (brightness/contrast/rotation/crop/flip) for future generation UX.
- **Services & hooks**:
  - `services/api.ts`: typed REST client with validation/sanitization for generation/refine APIs; timeout-wrapped fetch helpers.
  - `services/exampleLoader.ts`: pulls paired sample image/JSON blobs from `/examples`.
  - `hooks/useSegmentationWebSocket.ts`: maintains a persistent ws://.../ws/segment channel; streams progress → `setProgress`, results → `setResults` (now normalized to absolute URLs), errors → `setError`.
  - `hooks/useOptimizedImage.ts`: preloading/lazy support plus batch `preloadImages`.
  - `hooks/useGeneration.ts`, `useMaskKeyboardShortcuts`, `useDebounce`, `useKeyboardShortcuts` support the UI workflow and accessibility.
- **Key components**:
  - `IDELayout` splits Library / Workspace / Controls with resizable, collapsible panels.
  - `WorkspacePanel`: upload image+metadata, toggle original/segmented view, show shortcuts, and drive generation/refinement handlers. Relays segmentation status/errors from the store.
  - `MaskViewer`: renders the original image with CSS-mask overlays; loads mask bitmaps to hit-test hover/click, uses store visibility/selection, and tooltip metadata.
  - Library/Controls tabs (`LibraryPanel`, `ScenePanel`, `ObjectDetailsTab`, `CameraDetailsTab`, `LightingDetailsTab`, etc.) edit the config the backend expects.
- **Segmentation flow (HTTP)**:
  1) `uploadImage` builds `FormData` with image, optional metadata (auto-grab sidecar JSON if present), and prompts (fallback “object”).
  2) POST `/api/v1/segment` with 30s timeout.
  3) Normalize result URLs, preload masks, store results, and push a virtual file entry.
- **Segmentation flow (WebSocket)**:
  - `sendSegmentationRequest(imageData, prompts)` → backend streams `progress`/`result`/`error` events; `setResults` normalizes URLs for display.
- **Error & UX guidelines**:
  - Use `handleSegmentationError` for user-safe messages and `SegmentationErrorCode`.
  - Keep mask URLs absolute via `normalizeResults`; when adding new result writers or WebSocket handlers, reuse this helper.
  - For new UI around masks, keep the alpha-channel mask contract (`mask_url` points to RGBA mask; overlay uses CSS `mask-image`).

## Backend
- **Entry**: `app/main.py` builds FastAPI app with CORS, logging middleware, static mounts (`/outputs`, `/examples`), and lifespan hook to load SAM3 then start hourly cleanup.
- **Config**: `app/config.py` via `pydantic_settings`; device/thresholds, dirs, max file size (10MB), cleanup age, CORS, host/port, log format.
- **Dependencies**: `app/api/dependencies.py` provides singletons for `SAM3Model`, `FileService`, `SegmentationService`, `WebSocketManager`; `cleanup_dependencies` closes sockets on shutdown.
- **Routes**:
  - `POST /api/v1/segment` accepts image + optional JSON metadata + prompts; validates content type/size, calls segmentation service, returns `SegmentationResponse`.
  - `GET /api/v1/health` exposes model readiness/device info.
  - `GET /api/v1/metrics` returns request counts, success/error rates, avg latency, uptime.
  - `WS /ws/segment` streams segmentation with progress/result/error frames. Incoming base64 is now size-checked and format-validated against allowed types.
- **Services**:
  - `SegmentationService`: pipeline — save upload, parse metadata → prompt plans, run tiered detection, save masks, compute metadata (bbox, centroid, area%), write original, return response (with processing time).
  - `FileService`: async file writes, RGBA mask export (alpha carries mask), periodic cleanup respecting `cleanup_age_hours`.
  - `PromptPipeline`: builds `PromptPlanSet` per object; `FieldSpecBuilder` seeds descriptors, `SemanticRefiner` dedups/expands, `PromptBuilder` renders tiers.
  - `SAM3Model`: loads SAM3 with a lock, exposes `detect()` over prompts; `get_health_status` for health checks.
  - `WebSocketManager`: tracks connections/tasks and wraps message sending; progress uses `WebSocketMessage` schema.
  - `MetricsService`: thread-safe singleton used by middleware to record request counts/latency/success-failure.
- **Error handling & middleware**:
  - `RequestLoggingMiddleware` stamps `request_id`, logs duration, updates metrics, and attaches headers.
  - `error_handlers.py` maps validation/custom exceptions to structured `ErrorResponse`; generic handler logs tracebacks with the request id.
- **Data contracts**:
  - `MaskMetadata` (mask id, label, confidence, bbox, area pixels/%, centroid, mask URL); `SegmentationResponse` (result id, original URL, mask list, processing_time_ms, timestamp).
  - File rules: max 10MB, allowed image types png/jpg/jpeg; masks saved to `/outputs/{result_id}/mask_N.png` with alpha.

## Implementation Guidelines
- **API additions**: use dependency providers for services; reuse `FileValidation` before processing uploads (including WebSockets). Bubble typed exceptions (`ValidationException`, `ProcessingException`, etc.) so `error_handlers` keep consistent payloads/headers and metrics count errors.
- **Segmentation changes**:
  - Keep prompt building through `PromptPipeline` to preserve tiered fallback behavior; add new tiers by extending `PromptTier` and `PromptBuilder`.
  - When writing masks, maintain RGBA alpha encoding so the frontend mask overlay works unchanged.
  - If adding result persistence, write under `outputs/` and surface via `/outputs` static mount; include absolute/relative URLs in `SegmentationResponse`.
- **Frontend changes**:
  - Normalize any backend URL via `normalizeResults`/`toAbsoluteUrl`; WebSocket handlers already rely on `setResults` to do this.
  - For new segmentation triggers, wire through `segmentationStore` so progress, retry, and mask visibility remain unified.
  - Keep panel sizing/collapse via `layoutStore`, and add new config inputs through `configStore.updateConfig` to preserve persistence.
  - Respect the 10MB limit and surface user-friendly errors with `handleSegmentationError`.
- **Environment**:
  - Frontend: `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` for HTTP/WS hosts.
  - Backend: `.env` keys in `app/config.py` (host/port/device/thresholds/dirs/CORS).

## Recent Adjustments
- Fixed example segmentation flow to preload masks and log using normalized results; WebSocket results are normalized so relative URLs render correctly.
- Hardened WebSocket ingestion with file size/type validation to mirror the REST endpoint.
- Simplified the workspace shortcut popover close control to a clear ASCII “x”.
