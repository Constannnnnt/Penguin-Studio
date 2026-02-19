# Penguin Studio - System Design

## Features

### Generate Images

1. Enter text prompt in workspace panel
2. Adjust scene parameters in controls panel (lighting, camera, aesthetics)
3. Click Generate to create image
4. System receives structured prompt breakdown from Bria API
5. Automatic segmentation detects and masks all objects
6. Scene controls auto-populate from generated metadata

### Refine Images

1. Select generated image from library panel
2. Modify scene configuration (lighting direction, shadows, camera angle, etc.)
3. Manipulate object masks (drag, resize, rotate, flip)
4. System tracks all edits and generates modification prompt
5. Click Refine to run edit workflow (`/api/edit`) while preserving composition via seed

### Segment Images

1. Upload image for segmentation
2. Tiered prompt strategy queries SAM3 with multiple description specificity levels
3. View detected objects with bounding boxes and colored mask overlays
4. Select masks to edit object metadata
5. Save updated metadata to generation folder

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (React/TypeScript)                     │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │   Library   │  │  Workspace   │  │  Controls   │  │    State     │   │
│  │   Panel     │  │    Panel     │  │   Panel     │  │   Stores     │   │
│  │             │  │              │  │             │  │  (Zustand)   │   │
│  │ - File tree │  │ - ImageView  │  │ - Scene tab │  │              │   │
│  │ - Gen load  │  │ - MaskView   │  │ - Objects   │  │ - Config     │   │
│  │             │  │ - Prompt     │  │   tab       │  │ - Segment    │   │
│  │             │  │   input      │  │             │  │ - Layout     │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └──────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Core Services                                 │  │
│  │  - API Client (REST calls)                                        │  │
│  │  - Edit Tracker (monitors changes, generates modification prompts)│  │
│  │  - Semantic Generation Service (builds structured JSON)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          REST API / WebSocket
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI/Python)                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        API Routes                               │    │
│  │  /api/generate      - Text-to-image generation                  │    │
│  │  /api/edit          - Canonical image edit/refinement workflow  │    │
│  │  /api/refine        - Legacy alias to /api/edit                │    │
│  │  /api/segment       - Upload and segment image                  │    │
│  │  /api/segment-generation/{id} - Segment existing generation     │    │
│  │  /api/load-generation/{id}    - Load generation with masks      │    │
│  │  /api/parse-scene   - Semantic parsing of metadata              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐    │
│  │ Bria Service   │  │ Segmentation   │  │ Scene Parsing Service   │    │
│  │                │  │ Service        │  │                         │    │
│  │ - API client   │  │                │  │ - Sentence transformers │    │
│  │ - Retry logic  │  │ - SAM3 wrapper │  │ - Embedding matching    │    │
│  │ - Caching      │  │ - Prompt build │  │ - Option quantization   │    │
│  │ - Rate limit   │  │ - Mask export  │  │                         │    │
│  └────────────────┘  └────────────────┘  └─────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Detection Pipeline                           │    │
│  │  FieldSpecBuilder → SemanticRefiner → PromptBuilder → SAM3      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                            External Services
                                    │
                    ┌───────────────────────────────┐
                    │        Bria FIBO API          │
                    │   (Image Generation Service)  │
                    └───────────────────────────────┘
```

---

## Directory Structure

```
penguin-studio/
├── backend/                        # FastAPI service (Python)
│   ├── app/
│   │   ├── api/                   # REST API layer
│   │   │   ├── routes/
│   │   │   │   ├── generation.py  # /generate, /edit, /refine(alias), /load-generation
│   │   │   │   ├── segmentation.py# /segment endpoints
│   │   │   │   ├── scene_parsing.py # /parse-scene
│   │   │   │   └── websocket.py   # Real-time progress
│   │   │   └── dependencies.py    # Dependency injection
│   │   │
│   │   ├── detection/             # Object detection pipeline
│   │   │   ├── types.py           # PromptSpec, PromptTier, DetectionResult
│   │   │   ├── field_spec_builder.py  # Extract fields from metadata
│   │   │   ├── semantic_refiner.py    # NLP refinement (spaCy)
│   │   │   ├── prompt_builder.py      # Build tiered prompts
│   │   │   └── desc_deduper.py        # Deduplicate descriptors
│   │   │
│   │   ├── models/
│   │   │   ├── sam3_model.py      # SAM3 wrapper for detection
│   │   │   └── schemas.py         # Pydantic request/response models
│   │   │
│   │   ├── services/
│   │   │   ├── bria_service.py    # Bria API client (generate, refine)
│   │   │   ├── segmentation_service.py # Orchestrates detection pipeline
│   │   │   ├── scene_parsing_service.py # Semantic similarity matching
│   │   │   ├── file_service.py    # File I/O, mask saving
│   │   │   └── prompt_service.py  # PromptPipeline coordination
│   │   │
│   │   ├── utils/                 # Logging, errors, middleware
│   │   ├── config.py              # Settings and environment
│   │   └── main.py                # FastAPI app factory
│   │
│   ├── outputs/                   # Generated images and masks
│   │   └── gen-{id}/
│   │       ├── generated.png
│   │       ├── structured_prompt.json
│   │       ├── metadata.json
│   │       ├── segmentation_meta.json
│   │       └── mask_*.png
│   │
│   └── tests/                     # Pytest test suite
│
├── frontend/penguin/              # React application (TypeScript)
│   ├── src/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── api.ts         # REST API client
│   │   │   │   └── semanticGeneration/  # JSON builder, validators
│   │   │   ├── store/
│   │   │   │   ├── layoutStore.ts     # Panel sizes, collapse state
│   │   │   │   └── fileSystemStore.ts # Library tree, selection
│   │   │   └── types/             # TypeScript interfaces
│   │   │
│   │   ├── features/
│   │   │   ├── scene/
│   │   │   │   ├── components/
│   │   │   │   │   ├── SceneTab.tsx
│   │   │   │   │   ├── BackgroundSection.tsx
│   │   │   │   │   ├── CameraSection.tsx
│   │   │   │   │   ├── LightingSection.tsx
│   │   │   │   │   ├── LightingDirectionControl.tsx
│   │   │   │   │   └── AestheticsSection.tsx
│   │   │   │   └── store/
│   │   │   │       └── configStore.ts  # Scene config, objects, edit sync
│   │   │   │
│   │   │   ├── objects/
│   │   │   │   └── components/
│   │   │   │       ├── ObjectsTab.tsx
│   │   │   │       ├── ObjectListItem.tsx
│   │   │   │       ├── ObjectDetailsTab.tsx
│   │   │   │       └── ObjectMetadataPanel.tsx
│   │   │   │
│   │   │   ├── segmentation/
│   │   │   │   ├── components/
│   │   │   │   │   ├── MaskViewer.tsx
│   │   │   │   │   ├── DraggableMaskOverlay.tsx
│   │   │   │   │   └── MaskTooltip.tsx
│   │   │   │   └── store/
│   │   │   │       └── segmentationStore.ts  # Masks, manipulation state
│   │   │   │
│   │   │   └── imageEdit/
│   │   │       └── components/
│   │   │           └── ImageViewer.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── layout/        # IDELayout, panels, headers
│   │   │   │   └── ui/            # Radix UI primitives
│   │   │   ├── hooks/
│   │   │   │   ├── useGeneration.ts    # Generate/refine logic
│   │   │   │   └── useLoadGeneration.ts
│   │   │   └── lib/
│   │   │       ├── editTracker.ts      # Track edits, build mod prompts
│   │   │       ├── maskUtils.ts
│   │   │       └── imageTransform.ts
│   │   │
│   │   └── App.tsx                # Root component
│   │
│   └── public/                    # Static assets
│
└── thirdparty/sam3/               # SAM3 model (git submodule)
```

---

## Technology Stack

### Backend

| Component        | Technology                | Purpose                                        |
| ---------------- | ------------------------- | ---------------------------------------------- |
| Framework        | FastAPI                   | Async REST API with automatic OpenAPI docs     |
| ML Runtime       | PyTorch                   | SAM3 model inference                           |
| Segmentation     | SAM3 (Segment Anything 3) | Object detection and mask generation           |
| Image Generation | Bria FIBO API             | Text-to-image and structured prompt generation |
| Validation       | Pydantic                  | Request/response schemas, settings             |
| NLP              | spaCy                     | Dependency parsing for prompt refinement       |
| Embeddings       | sentence-transformers     | Semantic similarity matching                   |
| Logging          | Loguru                    | Structured logging with rotation               |
| HTTP Client      | httpx                     | Async HTTP for Bria API calls                  |

### Frontend

| Component     | Technology   | Purpose                                        |
| ------------- | ------------ | ---------------------------------------------- |
| Framework     | React 19     | Component-based UI                             |
| Language      | TypeScript   | Type safety                                    |
| State         | Zustand      | Lightweight stores with persistence            |
| Styling       | Tailwind CSS | Utility-first CSS                              |
| Build         | Vite         | Fast dev server and bundling                   |
| Components    | Radix UI     | Accessible primitives (dialogs, sliders, etc.) |
| Icons         | Lucide React | Icon library                                   |
| Notifications | Sonner       | Toast notifications                            |

### Integration

| Component      | Technology          | Purpose                            |
| -------------- | ------------------- | ---------------------------------- |
| API Protocol   | REST + WebSocket    | Sync requests + real-time progress |
| File Storage   | Local filesystem    | Generation outputs and masks       |
| Static Serving | FastAPI StaticFiles | Serve generated images to frontend |

---

## Backend Services

### BriaService

Handles all communication with Bria's image generation/edit APIs.

**Responsibilities:**

- Generate images from text prompts or structured prompts
- Edit/refine images using Bria `/v2/image/edit`
- Generate structured prompts without image (VLM bridge)
- Request retry with exponential backoff
- Rate limiting (1 request/second minimum)
- Result caching (24-hour TTL)
- Shared HTTP connection pooling (single AsyncClient) for lower latency and fewer socket churn issues
- Save generations to disk

**Key Methods:**

```python
async def generate_image(prompt, structured_prompt, parameters) -> GenerationResult
async def refine_image(structured_prompt, seed, modification_prompt) -> GenerationResult
async def generate_structured_prompt(prompt, images) -> StructuredPrompt
```

### SegmentationService

Orchestrates the object detection and mask generation pipeline.

**Responsibilities:**

- Process uploaded images or existing generations
- Build tiered prompt sets from structured prompt metadata
- Execute SAM3 detection with confidence-based tier selection
- Generate PNG mask files
- Calculate mask metadata (centroid, area, bounding box)
- Save segmentation results

**Detection Strategy:**

```
For each object in structured prompt:
    1. Build prompts at multiple tiers (CORE_VISUAL, CORE)
    2. Run SAM3 detection for each tier
    3. Select detection with highest confidence > 0.4
    4. Relabel with friendly object name
```

### SceneParsingService

Maps natural language scene descriptions to discrete control values.

**Responsibilities:**

- Pre-compute embeddings for all option sets on startup
- Match lighting conditions, camera angles, lens types via cosine similarity
- Parse shadow intensity from descriptive text
- Extract lighting direction from spatial keywords
- Return confidence scores for UI indication

**Option Sets:**

- Camera angles: eye-level, overhead, low-angle, high-angle
- Lens types: wide-angle, standard, portrait, macro
- Lighting conditions: natural, studio, soft diffused, dramatic, golden hour
- Style mediums: photograph, painting, digital art, sketch, 3D render
- Shadow intensity: 0-5 scale with keyword mapping

### PromptPipeline

Transforms structured object metadata into SAM3-compatible detection prompts.

**Pipeline Stages:**

1. **FieldSpecBuilder**: Extract visual, location, relation, orientation fields
2. **SemanticRefiner**: Use spaCy to extract adj+noun phrases, prepositional spans
3. **DescriptorDeduper**: Remove redundant descriptors via lemma matching
4. **PromptBuilder**: Compose tiered prompts with word count limits

---

## Frontend State Management

### ConfigStore

Central store for scene configuration and object data.

**State:**

- `config`: Full PenguinConfig for API calls
- `sceneConfig`: Scene configuration for UI controls
- `selectedObject`: Currently selected object index
- `activePanel`: Current control panel tab

**Key Actions:**

- `updateSceneConfig(path, value)`: Update nested config + track edit
- `updateObject(index, field, value)`: Update object + track edit
- `updateConfigFromStructuredPrompt(sp)`: Sync from generation response
- `applySemanticParsing(parsed)`: Apply parsed scene metadata

### SegmentationStore

Manages segmentation results and mask manipulation.

**State:**

- `results`: Segmentation response with masks array
- `selectedMaskId`: Currently selected mask
- `hoveredMaskId`: Currently hovered mask
- `maskManipulation`: Map of mask transforms (position, scale, rotation, flip)
- `masksVisible`: Toggle mask overlay visibility

**Manipulation State:**

```typescript
interface MaskManipulationState {
  maskId: string;
  originalBoundingBox: BoundingBox;
  currentBoundingBox: BoundingBox;
  transform: {
    position: { x: number; y: number };
    scale: { width: number; height: number };
    rotation: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };
  isDragging: boolean;
  isResizing: boolean;
  isRotationMode: boolean;
}
```

### Edit Tracker

Standalone module that monitors configuration changes and generates modification prompts.

**Tracking:**

```typescript
editTracker.trackEdit("lighting.conditions", "natural", "dramatic");
// Records: { field, category, oldValue, newValue, description }
```

**Prompt Generation:**

```typescript
editTracker.getModificationPrompt();
// Returns: "change lighting to dramatic, move demon to center, and make shadows stronger"
```

**Field Descriptions:**

- `lighting.conditions` → "change lighting to {value}"
- `lighting.shadows` → "change shadows to {label}"
- `objects[i].location` → "move {objectName} to {value}"
- `photographic_characteristics.camera_angle` → "change camera angle to {value}"

---

## API Endpoints

### Generation

| Method | Endpoint                    | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| POST   | `/api/generate`             | Generate image from prompt            |
| POST   | `/api/refine`               | Refine image with modification prompt |
| POST   | `/api/structured-prompt`    | Generate structured prompt only       |
| GET    | `/api/generate/{id}`        | Get generation by ID                  |
| GET    | `/api/load-generation/{id}` | Load generation with masks            |

### Segmentation

| Method | Endpoint                       | Description                 |
| ------ | ------------------------------ | --------------------------- |
| POST   | `/api/segment`                 | Upload and segment image    |
| POST   | `/api/segment-generation/{id}` | Segment existing generation |

### Scene Parsing

| Method | Endpoint           | Description                    |
| ------ | ------------------ | ------------------------------ |
| POST   | `/api/parse-scene` | Parse metadata to scene config |

### Static Files

| Path                              | Description     |
| --------------------------------- | --------------- |
| `/outputs/{gen-id}/generated.png` | Generated image |
| `/outputs/{gen-id}/mask_*.png`    | Mask images     |

---

## Data Flow

### Generation Flow

```
User enters prompt
        │
        ▼
┌─────────────────────┐
│ POST /api/generate  │
│ { prompt, aspect }  │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Bria API            │
│ - VLM bridge        │
│ - FIBO generation   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Save to disk        │
│ - generated.png     │
│ - structured_prompt │
│ - metadata.json     │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Return to frontend  │
│ { id, image_url,    │
│   structured_prompt,│
│   seed }            │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Frontend updates:   │
│ - configStore       │
│ - Triggers segment  │
│ - Refreshes library │
└─────────────────────┘
```

### Refinement Flow

```
User makes edits (lighting, objects, etc.)
        │
        ▼
┌─────────────────────┐
│ Edit Tracker        │
│ Records all changes │
└─────────────────────┘
        │
        ▼
User clicks Refine
        │
        ▼
┌─────────────────────┐
│ getModificationPrompt()
│ "change lighting to │
│  dramatic, move..."│
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ POST /api/refine    │
│ { structured_prompt,│
│   seed,             │
│   modification_prompt}
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Bria API refine     │
│ Same seed = similar │
│ composition         │
└─────────────────────┘
        │
        ▼
(Same as generation flow)
```

### Segmentation Flow

```
Generation complete (or image uploaded)
        │
        ▼
┌─────────────────────────────┐
│ Extract objects from        │
│ structured_prompt.objects   │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ PromptPipeline              │
│ For each object:            │
│   - Parse fields            │
│   - Refine with NLP         │
│   - Build tiered prompts    │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ SAM3 Detection              │
│ For each object:            │
│   - Try CORE_VISUAL tier    │
│   - Try CORE tier           │
│   - Pick highest confidence │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Generate mask PNGs          │
│ Calculate metadata          │
│ Save segmentation_meta.json │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Return to frontend          │
│ { masks[], original_url }   │
└─────────────────────────────┘
```
