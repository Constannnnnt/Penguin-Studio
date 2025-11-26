# Requirements Document

## Introduction

This specification defines the enhanced Scene Tab interface for the Penguin application's Generation Controls. The Scene Tab provides comprehensive controls for background settings, camera/photographic characteristics, lighting configuration, and aesthetic styles. The interface parses default values from JSON metadata using semantic similarity and provides intuitive UI components including buttons, sliders, and interactive lighting direction controls.

## Glossary

- **Scene Tab**: The tab within Generation Controls containing background, camera, lighting, and aesthetic configuration options
- **Background Setting**: The environment or backdrop configuration parsed from the "background_setting" field in JSON metadata
- **Photographic Characteristics**: Camera and lens settings including angle, focal length, depth of field, and focus parsed from the "photographic_characteristics" field
- **Lighting Configuration**: Light setup including conditions, direction, and shadows parsed from the "lighting" field
- **Aesthetic Styles**: Visual style and medium settings parsed from the "style_medium" and "aesthetics" fields
- **Semantic Parsing**: Backend process that extracts and maps JSON values to UI controls using semantic similarity
- **Lighting Direction Indicator**: Interactive rectangular representation showing flashlight icon position and orientation for lighting direction
- **Discrete Slider**: A slider control with specific value steps rather than continuous values
- **Custom Input Button**: A button that allows users to enter custom values not available in preset options
- **JSON Metadata**: The structured data containing scene information from backend examples

## Requirements

### Requirement 1

**User Story:** As a user, I want to configure background settings using values from JSON metadata, so that I can maintain consistency with existing scene descriptions.

#### Acceptance Criteria

1. WHEN the Scene Tab loads THEN the system SHALL parse the "background_setting" field from the current JSON metadata
2. WHEN background setting is available THEN the system SHALL display the parsed value as the default background configuration
3. WHEN the user modifies background settings THEN the system SHALL update the scene configuration with the new background value
4. WHEN no background setting is available in JSON THEN the system SHALL provide a default neutral background option
5. WHEN the user saves scene configuration THEN the system SHALL include the background setting in the output parameters

### Requirement 2

**User Story:** As a user, I want to configure camera settings using button controls with semantic parsing, so that I can easily select appropriate photographic characteristics.

#### Acceptance Criteria

1. WHEN the Scene Tab displays camera controls THEN the system SHALL provide button groups for camera angle and lens focal length
2. WHEN JSON metadata contains "photographic_characteristics" THEN the system SHALL parse camera_angle and lens_focal_length using semantic similarity
3. WHEN camera angle buttons are displayed THEN the system SHALL include options for "eye-level", "overhead", "low-angle", "high-angle", and "custom"
4. WHEN lens focal length buttons are displayed THEN the system SHALL include options for "wide-angle", "standard", "portrait", "macro", and "custom"
5. WHEN the user clicks a "custom" button THEN the system SHALL display an input field for entering custom values
6. WHEN semantic parsing identifies a matching value THEN the system SHALL pre-select the corresponding button as default

### Requirement 3

**User Story:** As a user, I want to configure depth of field and focus using sliders with parsed defaults, so that I can fine-tune photographic depth characteristics.

#### Acceptance Criteria

1. WHEN the Scene Tab displays depth controls THEN the system SHALL provide sliders for depth_of_field and focus
2. WHEN JSON metadata contains depth_of_field values THEN the system SHALL parse and set the slider default using semantic similarity
3. WHEN JSON metadata contains focus values THEN the system SHALL parse and set the slider default using semantic similarity
4. WHEN the depth of field slider is adjusted THEN the system SHALL update the configuration with values ranging from "very shallow" to "very deep"
5. WHEN the focus slider is adjusted THEN the system SHALL update the configuration with values ranging from "soft focus" to "sharp focus"
6. WHEN the user interacts with sliders THEN the system SHALL display the current value as text below the slider

### Requirement 4

**User Story:** As a user, I want to configure lighting conditions using button controls with custom input options, so that I can specify appropriate lighting setups.

#### Acceptance Criteria

1. WHEN the Scene Tab displays lighting controls THEN the system SHALL provide button groups for lighting conditions
2. WHEN lighting condition buttons are displayed THEN the system SHALL include options for "natural", "studio", "soft diffused", "dramatic", "golden hour", and "custom"
3. WHEN JSON metadata contains lighting conditions THEN the system SHALL parse and pre-select the matching button using semantic similarity
4. WHEN the user clicks the "custom" lighting button THEN the system SHALL display an input field for entering custom lighting descriptions
5. WHEN lighting conditions are modified THEN the system SHALL update the scene configuration with the selected or custom lighting setup

### Requirement 5

**User Story:** As a user, I want to configure shadows using discrete sliders with parsed defaults, so that I can control shadow intensity and characteristics.

#### Acceptance Criteria

1. WHEN the Scene Tab displays shadow controls THEN the system SHALL provide discrete sliders for shadow configuration
2. WHEN JSON metadata contains shadow information THEN the system SHALL parse shadow intensity and characteristics using semantic similarity
3. WHEN shadow sliders are displayed THEN the system SHALL provide discrete steps for "none", "subtle", "soft", "moderate", "strong", and "dramatic"
4. WHEN the user adjusts shadow sliders THEN the system SHALL update the configuration with the selected shadow intensity
5. WHEN shadow values are modified THEN the system SHALL display the current shadow setting as text below the slider

### Requirement 6

**User Story:** As a user, I want to configure lighting direction using an interactive visual indicator, so that I can intuitively specify light source position and orientation.

#### Acceptance Criteria

1. WHEN the Scene Tab displays lighting direction controls THEN the system SHALL provide a rectangular representation of the image area
2. WHEN the lighting direction interface loads THEN the system SHALL display a flashlight icon within the rectangle to indicate light position
3. WHEN JSON metadata contains lighting direction THEN the system SHALL parse and position the flashlight icon using semantic similarity
4. WHEN the user drags the flashlight icon THEN the system SHALL update its position within the rectangle boundaries
5. WHEN the user adjusts flashlight orientation THEN the system SHALL rotate the icon to indicate 6DOF lighting direction
6. WHEN lighting direction changes THEN the system SHALL display the current position and orientation as text values below the rectangle
7. WHEN the user interacts with the lighting direction control THEN the system SHALL update the scene configuration with the new lighting direction parameters

### Requirement 7

**User Story:** As a user, I want combined aesthetic and style controls with semantic parsing, so that I can configure visual style and medium settings efficiently.

#### Acceptance Criteria

1. WHEN the Scene Tab displays aesthetic controls THEN the system SHALL combine style_medium and aesthetics into a unified interface
2. WHEN JSON metadata contains "style_medium" values THEN the system SHALL parse and pre-select matching style buttons
3. WHEN JSON metadata contains "aesthetics" values THEN the system SHALL parse and pre-select matching aesthetic buttons
4. WHEN style buttons are displayed THEN the system SHALL include options for "photograph", "painting", "digital art", "sketch", "3D render", and "custom"
5. WHEN aesthetic buttons are displayed THEN the system SHALL include options for "realistic", "artistic", "vintage", "modern", "dramatic", and "custom"
6. WHEN the user clicks custom buttons THEN the system SHALL display input fields for entering custom style or aesthetic descriptions
7. WHEN aesthetic or style values are modified THEN the system SHALL update the scene configuration with the selected or custom values

### Requirement 8

**User Story:** As a developer, I want semantic parsing to be handled by the backend, so that JSON values are accurately mapped to UI controls without frontend complexity.

#### Acceptance Criteria

1. WHEN the frontend requests scene configuration THEN the backend SHALL perform semantic similarity parsing for all relevant JSON fields
2. WHEN the backend processes photographic_characteristics THEN the system SHALL map camera_angle and lens_focal_length to appropriate UI control values
3. WHEN the backend processes lighting information THEN the system SHALL map conditions, direction, and shadows to appropriate UI control values
4. WHEN the backend processes aesthetic information THEN the system SHALL map style_medium and aesthetics to appropriate UI control values
5. WHEN semantic parsing cannot find a match THEN the backend SHALL return a default value and indicate that custom input may be needed
6. WHEN the frontend receives parsed values THEN the system SHALL apply them as defaults to the corresponding UI controls

### Requirement 9

**User Story:** As a user, I want all scene controls to provide immediate visual feedback, so that I can understand the current configuration state.

#### Acceptance Criteria

1. WHEN any scene control is modified THEN the system SHALL immediately update the visual state of the control
2. WHEN button controls are selected THEN the system SHALL apply active styling to indicate the current selection
3. WHEN slider controls are adjusted THEN the system SHALL display the current value as text near the slider
4. WHEN custom input fields are used THEN the system SHALL validate and display the entered values
5. WHEN the lighting direction indicator is modified THEN the system SHALL update the flashlight icon position and orientation in real-time
6. WHEN scene configuration changes THEN the system SHALL provide visual confirmation that settings have been updated

### Requirement 10

**User Story:** As a user, I want scene configuration to integrate with the existing generation workflow, so that my settings are applied when creating images.

#### Acceptance Criteria

1. WHEN the user configures scene settings THEN the system SHALL store the configuration in the application state
2. WHEN the user triggers image generation THEN the system SHALL include all scene configuration parameters in the generation request
3. WHEN scene configuration is modified THEN the system SHALL mark the configuration as changed to indicate unsaved settings
4. WHEN the user loads a different image or example THEN the system SHALL update scene controls with the new metadata defaults
5. WHEN scene configuration is reset THEN the system SHALL restore all controls to their default values based on current JSON metadata