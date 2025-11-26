# Scene Parsing API

The Scene Parsing API provides semantic parsing of JSON metadata to extract scene configuration parameters for the enhanced scene tab interface.

## Endpoints

### POST /api/v1/scene/parse

Parse scene metadata using semantic similarity matching.

**Request Body:**
```json
{
  "metadata": {
    "background_setting": "clean white studio backdrop",
    "photographic_characteristics": {
      "camera_angle": "eye-level",
      "lens_focal_length": "standard lens (e.g., 50mm)",
      "depth_of_field": "shallow",
      "focus": "sharp focus"
    },
    "lighting": {
      "conditions": "bright, natural light",
      "direction": "soft light from above",
      "shadows": "soft, subtle shadows"
    },
    "style_medium": "photograph",
    "aesthetics": {
      "artistic_style": "realistic, detailed"
    }
  }
}
```

**Response:**
```json
{
  "background_setting": "clean white studio backdrop",
  "photographic_characteristics": {
    "camera_angle": {
      "value": "eye-level",
      "confidence": 1.0,
      "isCustom": false
    },
    "lens_focal_length": {
      "value": "standard",
      "confidence": 0.85,
      "isCustom": false
    },
    "depth_of_field": {
      "value": 25,
      "confidence": 1.0
    },
    "focus": {
      "value": 75,
      "confidence": 1.0
    }
  },
  "lighting": {
    "conditions": {
      "value": "natural",
      "confidence": 0.9,
      "isCustom": false
    },
    "direction": {
      "value": {
        "x": 50,
        "y": 10,
        "rotation": 0,
        "tilt": -45
      },
      "confidence": 0.8
    },
    "shadows": {
      "value": 2,
      "confidence": 1.0
    }
  },
  "aesthetics": {
    "style_medium": {
      "value": "photograph",
      "confidence": 1.0,
      "isCustom": false
    },
    "aesthetic_style": {
      "value": "realistic",
      "confidence": 0.75,
      "isCustom": false
    }
  }
}
```

### GET /api/v1/scene/options

Get available options for scene parsing.

**Response:**
```json
{
  "camera_angles": ["eye-level", "overhead", "low-angle", "high-angle"],
  "lens_types": ["wide-angle", "standard", "portrait", "macro"],
  "lighting_conditions": ["natural", "studio", "soft diffused", "dramatic", "golden hour"],
  "style_mediums": ["photograph", "painting", "digital art", "sketch", "3D render"],
  "aesthetic_styles": ["realistic", "artistic", "vintage", "modern", "dramatic"],
  "shadow_intensities": [0, 1, 2, 3, 4, 5],
  "depth_of_field_range": {"min": 0, "max": 100},
  "focus_range": {"min": 0, "max": 100},
  "lighting_direction_ranges": {
    "x": {"min": 0, "max": 100},
    "y": {"min": 0, "max": 100},
    "rotation": {"min": 0, "max": 360},
    "tilt": {"min": -90, "max": 90}
  }
}
```

### POST /api/v1/scene/validate

Validate a scene configuration.

**Request Body:** Same structure as the response from `/parse` endpoint.

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Low confidence for camera angle parsing"]
}
```

## Semantic Matching

The service uses sentence transformers to perform semantic similarity matching between input text and predefined options. Key features:

- **Confidence Scoring**: Each match includes a confidence score (0-1)
- **Custom Input Detection**: Values that don't match predefined options are marked as custom
- **Fallback Handling**: Default values provided when parsing fails
- **Vector Similarity**: Uses pre-computed embeddings for efficient matching

## Value Mappings

### Camera Angles
- `eye-level`: Standard horizontal view
- `overhead`: Top-down view
- `low-angle`: Camera below subject
- `high-angle`: Camera above subject

### Lens Types
- `wide-angle`: Wide field of view
- `standard`: Normal perspective (50mm equivalent)
- `portrait`: Longer focal length for portraits
- `macro`: Close-up photography

### Lighting Conditions
- `natural`: Daylight or ambient lighting
- `studio`: Controlled artificial lighting
- `soft diffused`: Gentle, even lighting
- `dramatic`: High contrast lighting
- `golden hour`: Warm, low-angle sunlight

### Shadow Intensity (0-5)
- `0`: No shadows
- `1`: Subtle shadows
- `2`: Soft shadows
- `3`: Moderate shadows
- `4`: Strong shadows
- `5`: Dramatic shadows

### Depth of Field & Focus (0-100)
- **Depth of Field**: 0 = very shallow, 100 = very deep
- **Focus**: 0 = soft focus, 100 = hyper sharp

### Lighting Direction
- **x**: Horizontal position (0-100, left to right)
- **y**: Vertical position (0-100, top to bottom)
- **rotation**: Light rotation (0-360 degrees)
- **tilt**: Light tilt angle (-90 to 90 degrees)

## Error Handling

The API provides comprehensive error handling:

- **400 Bad Request**: Invalid input format or validation errors
- **500 Internal Server Error**: Processing failures or service unavailable

All errors include detailed error messages and request IDs for tracking.