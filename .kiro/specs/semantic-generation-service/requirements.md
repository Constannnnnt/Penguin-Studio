# Requirements Document

## Introduction

This document specifies the requirements for a Semantic Generation Service that converts frontend application state (scene configuration, object metadata, and manipulations) back into the semantic JSON format used by the system. This is the reverse process of semantic parsing - taking structured UI state and generating natural language descriptions that match the format of the example JSON files (01.json, 02.json, 03.json).

The service enables users to export their edited scenes as semantic JSON files that can be saved, shared, and later re-imported into the system.

## Glossary

- **Semantic JSON**: The natural language-based JSON format used to describe scenes, containing fields like `short_description`, `objects`, `background_setting`, `lighting`, `aesthetics`, etc.
- **Frontend State**: The current application state stored in Zustand stores (configStore, segmentationStore) including scene configuration, object metadata, and transformations.
- **Semantic Generation**: The process of converting structured data and numeric values back into natural language descriptions.
- **Object Metadata**: Structured information about detected objects including description, location, relationship, size, shape, color, texture, appearance, and orientation.
- **Scene Configuration**: Settings for camera, lighting, aesthetics, and photographic characteristics.
- **Mask Manipulation State**: Transformations applied to objects including position changes, size adjustments, and image edits.
- **Refine Function**: The user-facing function that triggers semantic generation and saves the resulting JSON.

## Requirements

### Requirement 1

**User Story:** As a user, I want to export my edited scene as a semantic JSON file, so that I can save my work and share it with others.

#### Acceptance Criteria

1. WHEN a user clicks a "Refine" or "Export" button THEN the system SHALL generate a semantic JSON file from the current frontend state
2. WHEN the semantic JSON is generated THEN the system SHALL include all scene configuration values converted to natural language descriptions
3. WHEN the semantic JSON is generated THEN the system SHALL include all object metadata with updated values reflecting user edits
4. WHEN the semantic JSON is generated THEN the system SHALL save the file to a designated location
5. WHEN the save operation completes THEN the system SHALL notify the user of success or failure

### Requirement 2

**User Story:** As a developer, I want to convert numeric scene values to semantic descriptions, so that the exported JSON matches the expected format.

#### Acceptance Criteria

1. WHEN converting camera angle values THEN the system SHALL map numeric or enum values to descriptive text (e.g., "eye-level", "overhead")
2. WHEN converting lens focal length THEN the system SHALL map values to descriptive text (e.g., "macro", "portrait lens (e.g., 85mm-100mm)")
3. WHEN converting depth of field (0-100 scale) THEN the system SHALL map to descriptive text (e.g., "shallow", "deep")
4. WHEN converting focus values (0-100 scale) THEN the system SHALL map to descriptive text (e.g., "sharp focus", "soft focus")
5. WHEN converting lighting conditions THEN the system SHALL map enum values to descriptive text (e.g., "natural", "soft diffused studio lighting")

### Requirement 3

**User Story:** As a developer, I want to convert lighting direction values to semantic descriptions, so that 6DOF lighting data is human-readable.

#### Acceptance Criteria

1. WHEN converting lighting direction x-coordinate (0-100) THEN the system SHALL map to horizontal position text (e.g., "from the left", "centered", "from the right")
2. WHEN converting lighting direction y-coordinate (0-100) THEN the system SHALL map to vertical position text (e.g., "overhead", "at eye-level", "from below")
3. WHEN converting lighting rotation (0-360 degrees) THEN the system SHALL incorporate rotation into directional description
4. WHEN converting lighting tilt (-90 to 90 degrees) THEN the system SHALL incorporate tilt into directional description
5. WHEN combining all lighting direction components THEN the system SHALL generate a coherent natural language description (e.g., "soft, diffused light coming from slightly above and in front")

### Requirement 4

**User Story:** As a developer, I want to convert shadow intensity values to semantic descriptions, so that discrete shadow levels are human-readable.

#### Acceptance Criteria

1. WHEN converting shadow intensity 0 THEN the system SHALL generate "no shadows" or "shadowless"
2. WHEN converting shadow intensity 1 THEN the system SHALL generate "subtle shadows" or "very light shadows"
3. WHEN converting shadow intensity 2 THEN the system SHALL generate "soft shadows" or "gentle shadows"
4. WHEN converting shadow intensity 3 THEN the system SHALL generate "moderate shadows" or "normal shadows"
5. WHEN converting shadow intensity 4 THEN the system SHALL generate "strong shadows" or "pronounced shadows"
6. WHEN converting shadow intensity 5 THEN the system SHALL generate "dramatic shadows" or "harsh shadows"

### Requirement 5

**User Story:** As a developer, I want to generate object descriptions from metadata, so that each object in the scene has a complete natural language description.

#### Acceptance Criteria

1. WHEN generating object descriptions THEN the system SHALL combine all object metadata fields into coherent natural language
2. WHEN an object has been moved THEN the system SHALL update the location field to reflect the new position
3. WHEN an object has been resized THEN the system SHALL update the relative_size field to reflect the new dimensions
4. WHEN an object has image edits applied THEN the system SHALL update appearance_details and shape_and_color to reflect the edits
5. WHEN an object has orientation changes THEN the system SHALL update the orientation field accordingly

### Requirement 6

**User Story:** As a developer, I want to generate a short description for the entire scene, so that the semantic JSON has a comprehensive overview.

#### Acceptance Criteria

1. WHEN generating the short description THEN the system SHALL synthesize information from all objects, background, lighting, and aesthetics
2. WHEN multiple objects exist THEN the system SHALL mention key objects in the description
3. WHEN specific lighting or aesthetic styles are set THEN the system SHALL incorporate them into the description
4. WHEN the description is generated THEN the system SHALL produce 2-4 sentences that capture the essence of the scene
5. WHEN custom values are present THEN the system SHALL incorporate them naturally into the description

### Requirement 7

**User Story:** As a developer, I want to handle custom user-entered values, so that non-standard inputs are preserved in the semantic JSON.

#### Acceptance Criteria

1. WHEN a user enters a custom camera angle THEN the system SHALL use the custom text in the generated JSON
2. WHEN a user enters a custom lens type THEN the system SHALL use the custom text in the generated JSON
3. WHEN a user enters a custom lighting condition THEN the system SHALL use the custom text in the generated JSON
4. WHEN a user enters a custom style medium THEN the system SHALL use the custom text in the generated JSON
5. WHEN a user enters a custom aesthetic style THEN the system SHALL use the custom text in the generated JSON

### Requirement 8

**User Story:** As a developer, I want to preserve object relationships, so that spatial and semantic connections between objects are maintained.

#### Acceptance Criteria

1. WHEN objects have relationship metadata THEN the system SHALL include relationship descriptions in the generated JSON
2. WHEN objects have been moved relative to each other THEN the system SHALL update relationship descriptions accordingly
3. WHEN new objects are added THEN the system SHALL generate appropriate relationship descriptions
4. WHEN objects are removed THEN the system SHALL update remaining objects' relationships
5. WHEN objects overlap or are adjacent THEN the system SHALL reflect this in relationship descriptions

### Requirement 9

**User Story:** As a developer, I want to generate aesthetic and composition descriptions, so that the artistic intent is captured.

#### Acceptance Criteria

1. WHEN generating aesthetics THEN the system SHALL include composition, color_scheme, and mood_atmosphere fields
2. WHEN generating aesthetics THEN the system SHALL include preference_score and aesthetic_score fields
3. WHEN style_medium is set THEN the system SHALL include it in the generated JSON
4. WHEN artistic_style is set THEN the system SHALL include it in the generated JSON
5. WHEN context information exists THEN the system SHALL include it in the generated JSON

### Requirement 10

**User Story:** As a user, I want the system to validate generated JSON, so that exported files are guaranteed to be valid.

#### Acceptance Criteria

1. WHEN JSON is generated THEN the system SHALL validate it against the expected schema
2. WHEN required fields are missing THEN the system SHALL provide default values or report an error
3. WHEN field values are invalid THEN the system SHALL report validation errors to the user
4. WHEN validation passes THEN the system SHALL proceed with saving the file
5. WHEN validation fails THEN the system SHALL display specific error messages indicating what needs to be fixed

### Requirement 11

**User Story:** As a developer, I want to implement semantic generation as a service, so that it can be reused across the application.

#### Acceptance Criteria

1. WHEN implementing the service THEN the system SHALL create a SemanticGenerationService class or module
2. WHEN the service is called THEN the system SHALL accept frontend state as input
3. WHEN the service processes state THEN the system SHALL return a complete semantic JSON object
4. WHEN the service encounters errors THEN the system SHALL throw descriptive exceptions
5. WHEN the service is used THEN the system SHALL log generation steps for debugging

### Requirement 12

**User Story:** As a developer, I want to handle image edits in semantic descriptions, so that brightness, contrast, saturation, and other adjustments are reflected.

#### Acceptance Criteria

1. WHEN brightness is adjusted THEN the system SHALL update appearance_details with brightness descriptors (e.g., "brighter", "darker")
2. WHEN contrast is adjusted THEN the system SHALL update appearance_details with contrast descriptors (e.g., "high contrast", "muted")
3. WHEN saturation is adjusted THEN the system SHALL update shape_and_color with saturation descriptors (e.g., "vibrant", "desaturated")
4. WHEN hue is adjusted THEN the system SHALL update shape_and_color with color shift descriptors
5. WHEN blur is applied THEN the system SHALL update texture with blur descriptors (e.g., "blurred 5px")
6. WHEN exposure is adjusted THEN the system SHALL update appearance_details with exposure descriptors
7. WHEN vibrance is adjusted THEN the system SHALL update shape_and_color with vibrance descriptors
