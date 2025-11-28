# Implementation Plan

- [x] 1. Set up project structure and core interfaces





  - Create directory structure for semantic generation service
  - Define TypeScript interfaces for all components (SemanticGenerationService, ValueConverters, DescriptionGenerators, JSONBuilder)
  - Set up error types (SemanticGenerationError, ValidationError, MissingFieldError, ConversionError)
  - Configure fast-check for property-based testing
  - _Requirements: 11.1_

-

- [x] 2. Implement value converter utilities



  - [x] 2.1 Implement camera angle converter

    - Write function to convert CameraAngle enum/string to descriptive text
    - Handle custom values by passing through unchanged
    - _Requirements: 2.1, 7.1_

  - [x] 2.2 Implement lens focal length converter

    - Write function to convert LensType enum/string to descriptive text
    - Handle custom values by passing through unchanged
    - _Requirements: 2.2, 7.2_

  - [x] 2.3 Implement depth of field converter

    - Write function to map 0-100 scale to descriptive text ranges
    - Use mapping: 0-20="very shallow", 21-40="shallow", 41-60="medium", 61-80="deep", 81-100="very deep"
    - _Requirements: 2.3_

  - [x] 2.4 Implement focus value converter

    - Write function to map 0-100 scale to descriptive text ranges
    - Use mapping: 0-20="soft focus", 21-40="slight soft", 41-60="sharp", 61-80="very sharp", 81-100="hyper sharp"
    - _Requirements: 2.4_

  - [x] 2.5 Implement lighting conditions converter

    - Write function to convert LightingCondition enum/string to descriptive text
    - Handle custom values by passing through unchanged
    - _Requirements: 2.5, 7.3_

  - [x] 2.6 Implement shadow intensity converter

    - Write function to map 0-5 discrete scale to descriptive text
    - Use mapping: 0="no shadows", 1="subtle", 2="soft", 3="moderate", 4="strong", 5="dramatic"
    - _Requirements: 4.1-4.6_

  - [x] 2.7 Implement lighting direction converter

    - Write function to convert 6DOF lighting direction to natural language
    - Parse x-coordinate (0-100) to horizontal position (left/center/right)
    - Parse y-coordinate (0-100) to vertical position (above/eye-level/below)
    - Incorporate rotation (0-360) into description
    - Incorporate tilt (-90 to 90) into description
    - Combine all components into coherent description
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.8 Implement style medium converter

    - Write function to convert StyleMedium enum/string to descriptive text
    - Handle custom values by passing through unchanged
    - _Requirements: 7.4_

  - [x] 2.9 Implement aesthetic style converter

    - Write function to convert AestheticStyle enum/string to descriptive text
    - Handle custom values by passing through unchanged
    - _Requirements: 7.5_

  - [ ]* 2.10 Write property test for value converters
    - **Property 2: Value conversion consistency**
    - **Property 3: Numeric range mapping**
    - **Property 4: Lighting direction coherence**
    - **Property 11: Custom value pass-through**
    - **Validates: Requirements 2.1-2.5, 3.1-3.5, 4.1-4.6, 7.1-7.5**

- [x] 3. Implement description generators





  - [x] 3.1 Implement object description generator

    - Write function to generate description from MaskMetadata and MaskManipulationState
    - Combine all metadata fields (description, location, relationship, size, shape_and_color, texture, appearance_details, orientation)
    - Handle missing optional fields gracefully
    - _Requirements: 5.1_

  - [x] 3.2 Implement position-based location updater

    - Write function to update location field based on currentBoundingBox
    - Calculate new position relative to image dimensions
    - Map to location descriptors (center, top-left, top-right, etc.)
    - _Requirements: 5.2_

  - [x] 3.3 Implement size-based relative_size updater

    - Write function to update relative_size based on scale transform
    - Calculate new size relative to image dimensions
    - Map to size descriptors (small, medium, large, very large)
    - _Requirements: 5.3_

  - [x] 3.4 Implement image edit reflector

    - Write function to update appearance_details based on brightness, contrast, exposure, blur
    - Write function to update shape_and_color based on saturation, hue, vibrance
    - Write function to update texture based on blur
    - Generate descriptive text for each edit type
    - _Requirements: 5.4, 12.1-12.7_

  - [x] 3.5 Implement orientation updater

    - Write function to update orientation based on position/rotation changes
    - Detect orientation changes from original position
    - _Requirements: 5.5_

  - [x] 3.6 Implement relationship generator

    - Write function to generate relationship descriptions between objects
    - Calculate spatial relationships (above, below, beside, overlapping)
    - Update relationships when objects move
    - Handle object addition and removal
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 3.7 Implement short description generator

    - Write function to synthesize scene overview from all components
    - Include object mentions (up to 3 key objects)
    - Include background setting if notable
    - Include lighting characteristics if distinctive
    - Include aesthetic/mood information
    - Ensure 2-4 sentence length
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.8 Implement background description generator

    - Write function to format background setting text
    - Handle empty/default backgrounds
    - _Requirements: 1.2_

  - [x] 3.9 Implement lighting description generator

    - Write function to generate complete lighting object
    - Use value converters for conditions, direction, shadows
    - Combine into coherent lighting description
    - _Requirements: 1.2_

  - [x] 3.10 Implement aesthetics description generator

    - Write function to generate complete aesthetics object
    - Include composition, color_scheme, mood_atmosphere
    - Include preference_score and aesthetic_score
    - _Requirements: 9.1, 9.2_

  - [x] 3.11 Implement photographic characteristics generator

    - Write function to generate complete photographic characteristics object
    - Use value converters for camera_angle, lens_focal_length, depth_of_field, focus
    - _Requirements: 1.2_

  - [ ]* 3.12 Write property tests for description generators
    - **Property 5: Object metadata preservation**
    - **Property 6: Transform reflection in metadata**
    - **Property 7: Scale reflection in metadata**
    - **Property 8: Image edit reflection in metadata**
    - **Property 9: Short description comprehensiveness**
    - **Property 10: Short description length constraint**
    - **Property 12: Relationship update on position change**
    - **Validates: Requirements 5.1-5.5, 6.1-6.5, 8.1-8.5, 12.1-12.7**
-

- [x] 4. Implement JSON builder




  - [x] 4.1 Implement objects array builder


    - Write function to build objects array from masks and manipulations
    - Iterate through all masks
    - Generate description for each object
    - Filter out hidden objects
    - _Requirements: 1.3_

  - [x] 4.2 Implement lighting object builder


    - Write function to build lighting object from LightingConfig
    - Use lighting description generator
    - _Requirements: 1.2_

  - [x] 4.3 Implement aesthetics object builder


    - Write function to build aesthetics object from AestheticsConfig
    - Use aesthetics description generator
    - Include style_medium and artistic_style
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 4.4 Implement photographic characteristics builder


    - Write function to build photographic characteristics from PhotographicConfig
    - Use photographic description generator
    - _Requirements: 1.2_

  - [x] 4.5 Implement complete JSON builder


    - Write function to assemble all components into SemanticJSON
    - Generate short_description
    - Build objects array
    - Include background_setting
    - Build lighting object
    - Build aesthetics object
    - Build photographic_characteristics object
    - Include style_medium
    - Include context if present
    - Include artistic_style if present
    - _Requirements: 1.2, 1.3_

  - [ ]* 4.6 Write property test for JSON builder
    - **Property 1: Generation completeness**
    - **Validates: Requirements 1.2, 9.1, 9.2, 11.3**

- [x] 5. Implement validation





  - [x] 5.1 Define JSON schema


    - Create JSON schema for SemanticJSON
    - Define required fields
    - Define field types and constraints
    - _Requirements: 10.1_

  - [x] 5.2 Implement schema validator


    - Write function to validate JSON against schema
    - Return validation result with errors
    - Collect all errors before returning
    - _Requirements: 10.1_

  - [x] 5.3 Implement field-specific validators


    - Write validators for each field type
    - Check for required fields
    - Check for valid field types
    - Check for valid value ranges
    - _Requirements: 10.2, 10.3_

  - [x] 5.4 Implement error message generator


    - Write function to generate specific error messages
    - Include field name in error message
    - Include expected type/value in error message
    - Include actual value in error message
    - _Requirements: 10.3, 10.5_

  - [x] 5.5 Implement default value provider


    - Write function to provide default values for missing fields
    - Define sensible defaults for each field type
    - Log warnings when defaults are used
    - _Requirements: 10.2_

  - [ ]* 5.6 Write property tests for validation
    - **Property 13: Validation schema compliance**
    - **Property 14: Error reporting specificity**
    - **Property 15: Default value provision**
    - **Validates: Requirements 10.1-10.5**
-

- [x] 6. Implement main service class



  - [x] 6.1 Implement SemanticGenerationService class


    - Create class with all required methods
    - Implement generateSemanticJSON method
    - Implement validate method
    - Implement saveToFile method
    - Add logging for all operations
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 6.2 Implement state reader


    - Write function to read current state from stores
    - Combine configStore and segmentationStore state
    - Handle missing or incomplete state
    - _Requirements: 11.2_

  - [x] 6.3 Implement file saver


    - Write function to save JSON to file
    - Handle file system errors
    - Provide user-friendly error messages
    - Return save result with success/failure status
    - _Requirements: 1.4_

  - [x] 6.4 Implement user notification


    - Write function to notify user of save success/failure
    - Use toast notifications or similar UI feedback
    - _Requirements: 1.5_

  - [ ]* 6.5 Write integration test for main service
    - Test complete generation flow from state to file
    - Test error handling
    - Test logging
    - _Requirements: 11.1-11.5_
-

- [x] 7. Implement UI integration



  - [x] 7.1 Add "Refine" or "Export" button to UI


    - Add button to appropriate location in UI (likely in ControlsPanel or Header)
    - Wire button to service call
    - _Requirements: 1.1_

  - [x] 7.2 Implement button click handler

    - Read current state from stores
    - Call semantic generation service
    - Handle success and error cases
    - Show user notification
    - _Requirements: 1.1, 1.5_

  - [x] 7.3 Implement file download

    - Generate filename based on timestamp or scene name
    - Trigger browser download of JSON file
    - _Requirements: 1.4_

  - [ ]* 7.4 Write UI integration test
    - Test button click triggers generation
    - Test file download
    - Test user notifications
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
-

- [ ] 9. Implement round-trip testing

  - [x] 9.1 Create round-trip test utility


    - Write function to load example JSON
    - Parse to state using semantic parsing service
    - Generate back to JSON using semantic generation service
    - Compare original and generated JSON
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 9.2 Write property test for round-trip consistency
    - **Property 16: Round-trip consistency**
    - Test with example files (01.json, 02.json, 03.json)
    - Test with randomly generated semantic JSON
    - Allow tolerance for numeric conversions
    - Verify semantic equivalence
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 9.3 Write integration tests with example files
    - Test round-trip with 01.json
    - Test round-trip with 02.json
    - Test round-trip with 03.json
    - Verify all fields are preserved
    - _Requirements: 1.1, 1.2, 1.3_
-

- [x] 10. Final checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
