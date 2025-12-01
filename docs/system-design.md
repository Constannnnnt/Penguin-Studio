

## Features

### Generate Images

1. Enter text prompt in workspace panel
2. Adjust scene parameters in controls panel
3. Click Generate to create image
4. Automatic segmentation runs on generated images

### Refine Images

1. Select generated image from library panel
2. Modify scene configuration or object properties
3. Click Refine to apply changes while preserving composition

### Segment Images

1. Upload image for segmentation
2. View detected objects with bounding boxes and masks
3. Select masks to edit object metadata
4. Save updated metadata to generation folder

## System Architecture

```
penguin-studio/
├── backend/                    # FastAPI service (Python)
│   ├── app/
│   │   ├── api/               # REST API routes and dependencies
│   │   │   └── routes/        # Generation, segmentation, scene parsing
│   │   ├── detection/         # SAM3 integration and prompt building
│   │   ├── models/            # Pydantic schemas and SAM3 wrapper
│   │   ├── services/          # Business logic (Bria, segmentation, files)
│   │   └── utils/             # Error handlers, logging, middleware
│   └── tests/                 # Pytest test suite
│
├── frontend/penguin/           # React application (TypeScript)
│   ├── src/
│   │   ├── core/              # Services and state management
│   │   │   ├── services/      # API client, semantic generation
│   │   │   └── store/         # Zustand stores (layout, filesystem)
│   │   ├── features/          # Feature modules
│   │   │   ├── imageEdit/     # Image editing controls
│   │   │   ├── objects/       # Object management panel
│   │   │   ├── scene/         # Scene configuration (lighting, camera, aesthetics)
│   │   │   └── segmentation/  # Mask viewer and selection
│   │   └── shared/            # Shared components and utilities
│   └── public/                # Static assets and preview images
│
└── thirdparty/sam3/            # SAM3 model (git submodule)
    └── sam3/                   # Object detection and segmentation
```

### Technology Stack

**Backend**
- FastAPI - REST API framework
- PyTorch - Deep learning inference
- SAM3 - Object detection and segmentation
- Bria API - Image generation with FIBO model
- Pydantic - Data validation and settings
- Loguru - Structured logging

**Frontend**
- React 19 - UI framework
- TypeScript - Type safety
- Zustand - State management
- Tailwind CSS - Styling
- Vite - Build tooling
- Radix UI - Accessible components

**Integration**
- WebSocket - Real-time progress updates
- REST API - Generation and segmentation endpoints
- File system - Generation library and metadata storage