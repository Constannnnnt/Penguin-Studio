# Implementation Plan

- [x] 1. Create layout state management infrastructure





  - Create new Zustand stores for layout, image editing, and file system state
  - Implement persistence middleware for layout preferences
  - Add TypeScript interfaces for all state models
  - _Requirements: 1.1, 1.2, 7.6, 7.7, 10.7, 10.8_

- [x] 1.1 Create LayoutStore with panel visibility and sizing


  - Write `src/store/layoutStore.ts` with state for panel visibility, widths, and active tab
  - Implement actions: `toggleLibraryPanel`, `toggleAdvancedControlsPanel`, `setLibraryPanelWidth`, `setAdvancedControlsPanelWidth`, `setActiveControlsTab`
  - Add Zustand persist middleware to save layout preferences to localStorage
  - Define default values: libraryPanelWidth=280, advancedControlsPanelWidth=320
  - _Requirements: 1.3, 1.4, 1.5, 7.6, 7.7, 10.7, 10.8_

- [x] 1.2 Create ImageEditStore for image manipulation state


  - Write `src/store/imageEditStore.ts` with state for brightness, contrast, saturation, rotation, flip, and crop
  - Implement actions for each image editing parameter
  - Add `resetImageEdits` action to restore default values
  - Define default values: brightness=0, contrast=0, saturation=0, rotation=0, flipHorizontal=false, flipVertical=false
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 1.3 Create FileSystemStore for file tree management


  - Write `src/store/fileSystemStore.ts` with state for file tree, selected file, and expanded folders
  - Implement actions: `loadFileTree`, `selectFile`, `toggleFolder`, `refreshFileTree`
  - Define FileNode interface with name, path, type, children, extension properties
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
-

- [x] 2. Implement core layout components




  - Create IDELayout component as the main container
  - Implement ResizeHandle component for panel resizing
  - Add PanelHeader component for consistent panel headers
  - Wire up layout stores to components
  - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3_

- [x] 2.1 Create IDELayout component with three-panel structure


  - Write `src/components/IDELayout.tsx` with flex layout for three panels
  - Integrate LayoutStore to control panel visibility and widths
  - Conditionally render LibraryPanel and AdvancedControlsPanel based on visibility state
  - Position ResizeHandle components between panels
  - Apply responsive styling with Tailwind CSS
  - _Requirements: 1.1, 1.2, 7.3, 7.4_

- [x] 2.2 Create ResizeHandle component with drag functionality


  - Write `src/components/ResizeHandle.tsx` with mouse event handlers
  - Implement drag state management with useRef and useState
  - Add mousedown, mousemove, and mouseup event listeners
  - Apply visual feedback during drag (hover and active states)
  - Enforce minimum width constraints during resize
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_


- [x] 2.3 Create PanelHeader component for consistent headers

  - Write `src/components/PanelHeader.tsx` with title and collapse button
  - Accept props: title (string), onCollapse (function)
  - Use shadcn/ui Button component for collapse button
  - Apply consistent styling with border-bottom and padding
  - Add ChevronLeft/ChevronRight icon based on panel position
  - _Requirements: 7.1, 7.2, 8.1, 8.3_

- [x] 3. Build LibraryPanel with file tree navigation





  - Create LibraryPanel component with collapsible functionality
  - Implement FileTree component with recursive rendering
  - Add keyboard navigation support for file tree
  - Integrate with FileSystemStore
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.3_

- [x] 3.1 Create LibraryPanel component structure


  - Write `src/components/LibraryPanel.tsx` with fixed width from LayoutStore
  - Add PanelHeader with "Library" title and collapse button
  - Create scrollable container for file tree
  - Apply background and border styling consistent with Material Design
  - Wire up collapse button to LayoutStore toggleLibraryPanel action
  - _Requirements: 2.1, 7.1, 7.3, 8.1, 8.3_

- [x] 3.2 Create FileTree component with recursive rendering


  - Write `src/components/FileTree.tsx` with recursive structure
  - Accept props: node, selectedFile, expandedFolders, onSelectFile, onToggleFolder, depth
  - Render folder and file icons using lucide-react
  - Apply indentation based on depth prop
  - Handle click events to select files or toggle folders
  - Apply selected and hover states with Tailwind CSS
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.3 Add keyboard navigation to FileTree


  - Implement onKeyDown handler in FileTree component
  - Support Enter/Space to select file or toggle folder
  - Support ArrowRight to expand folder
  - Support ArrowLeft to collapse folder
  - Set tabIndex={0} for keyboard focus
  - Add ARIA attributes for accessibility
  - _Requirements: 2.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3.4 Integrate FileSystemStore with LibraryPanel


  - Connect FileTree to FileSystemStore state
  - Implement loadFileTree action to fetch file structure
  - Call loadFileTree on component mount
  - Handle file selection to update selectedFile state
  - Handle folder toggle to update expandedFolders state
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
-

- [x] 4. Refactor workspace into WorkspacePanel




  - Create WorkspacePanel component with two sections
  - Implement ImageViewer component for image display
  - Create PromptControls component with textarea and action buttons
  - Migrate existing Canvas functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4.1 Create WorkspacePanel component structure


  - Write `src/components/WorkspacePanel.tsx` with flex column layout
  - Create upper section for ImageViewer with flex-1 for flexible height
  - Create lower section for PromptControls with fixed height
  - Add border-top to separate sections
  - Apply background styling consistent with Material Design
  - _Requirements: 3.1, 3.2, 8.1, 8.3_

- [x] 4.2 Create ImageViewer component


  - Write `src/components/ImageViewer.tsx` to display generated images
  - Accept props: image (string | null), isLoading (boolean), error (string | null)
  - Render GeneratedImage component when image is available
  - Render LoadingSpinner when isLoading is true
  - Render empty state with icon when no image
  - Render error state with message when error exists
  - Apply aspect-video container with object-contain for images
  - _Requirements: 3.1, 3.7, 3.8_

- [x] 4.3 Create PromptControls component


  - Write `src/components/PromptControls.tsx` with textarea and buttons
  - Accept props: prompt, onPromptChange, onGenerate, onRefine, isLoading
  - Use shadcn/ui Textarea component with minimum 10 characters validation
  - Create two Button components: "Generate" (primary) and "Refine" (secondary)
  - Disable buttons when isLoading or prompt length < 10
  - Add Wand2 icon to Generate button and Sparkles icon to Refine button
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 8.1_

- [x] 4.4 Migrate Canvas functionality to WorkspacePanel


  - Move image generation logic from Canvas to WorkspacePanel
  - Integrate useGeneration hook for API calls
  - Connect prompt state to ConfigStore short_description
  - Implement handleGenerate to call generateImage with current config
  - Implement handleRefine to call refineImage API endpoint
  - Remove old Canvas component after migration
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

- [x] 5. Build AdvancedControlsPanel with tabs





  - Create AdvancedControlsPanel component with tab navigation
  - Implement ImageControlsTab with editing controls
  - Create GenerationControlsTab wrapper for existing panels
  - Integrate with LayoutStore for tab state
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.4_

- [x] 5.1 Create AdvancedControlsPanel component structure


  - Write `src/components/AdvancedControlsPanel.tsx` with fixed width from LayoutStore
  - Add PanelHeader with "Advanced Controls" title and collapse button
  - Integrate shadcn/ui Tabs component with two tabs
  - Wire up activeControlsTab state from LayoutStore
  - Create TabsList with "Image Controls" and "Generation" triggers
  - Create TabsContent containers for each tab
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.4, 8.1_

- [x] 5.2 Create ImageControlsTab component


  - Write `src/components/ImageControlsTab.tsx` with all image editing controls
  - Add Slider components for brightness, contrast, and saturation (-100 to 100 range)
  - Add rotation buttons with RotateCcw and RotateCw icons
  - Add flip buttons for horizontal and vertical flipping
  - Add crop control placeholder for future implementation
  - Add "Reset All" button to call resetImageEdits action
  - Connect all controls to ImageEditStore state and actions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.1_

- [x] 5.3 Create GenerationControlsTab component


  - Write `src/components/GenerationControlsTab.tsx` as a wrapper
  - Import existing PanelNav and PanelContainer components
  - Render PanelNav for panel navigation
  - Render PanelContainer to display active panel
  - Maintain all existing functionality of Scene, Camera, Lighting, Aesthetics, and Medium panels
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 6. Implement image editing functionality





  - Create image transformation utilities
  - Apply image edits to displayed image
  - Integrate with ImageViewer component
  - Add real-time preview of edits
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 6.1 Create image transformation utilities


  - Write `src/lib/imageTransform.ts` with transformation functions
  - Implement applyBrightness function using CSS filter
  - Implement applyContrast function using CSS filter
  - Implement applySaturation function using CSS filter
  - Implement applyRotation function using CSS transform
  - Implement applyFlip function using CSS transform
  - Create combineTransforms function to merge all transformations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6.2 Integrate image transformations with ImageViewer


  - Modify ImageViewer to accept imageEditState from ImageEditStore
  - Apply CSS filters and transforms to image element
  - Use combineTransforms utility to generate style object
  - Ensure transformations update in real-time as controls change
  - Maintain image aspect ratio during transformations
  - _Requirements: 5.7, 8.1_

- [x] 6.3 Add image download functionality


  - Create downloadImage utility function in `src/lib/imageUtils.ts`
  - Apply transformations to canvas element
  - Convert canvas to blob and trigger download
  - Add download button to ImageViewer component
  - Handle download errors gracefully


  - _Requirements: 5.7_

- [ ] 7. Add keyboard shortcuts

  - Create useKeyboardShortcuts hook
  - Implement shortcuts for Generate, Refine, and panel toggles
  - Add tooltip hints for shortcuts
  - Handle platform differences (Ctrl vs Cmd)


  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 7.1 Create useKeyboardShortcuts hook
  - Write `src/hooks/useKeyboardShortcuts.ts` with keyboard event handling
  - Accept shortcuts configuration object as parameter
  - Implement useEffect to add and remove keydown event listeners
  - Detect platform (Windows/Mac) to use Ctrl or Cmd modifier


  - Prevent default browser behavior for registered shortcuts
  - Support multiple modifier keys (Ctrl, Shift, Alt)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

- [ ] 7.2 Implement keyboard shortcuts in App component
  - Import useKeyboardShortcuts hook in App or IDELayout component
  - Register Ctrl+G (Cmd+G) for Generate action


  - Register Ctrl+R (Cmd+R) for Refine action
  - Register Ctrl+B (Cmd+B) for Library Panel toggle
  - Register Ctrl+Shift+B (Cmd+Shift+B) for Advanced Controls Panel toggle
  - Connect shortcuts to respective action handlers



  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 7.3 Add keyboard shortcut tooltips
  - Update Button components to include keyboard shortcut hints in tooltips
  - Use shadcn/ui Tooltip component
  - Display shortcuts in format "Generate (Ctrl+G)" or "Generate (⌘G)" on Mac
  - Add tooltips to panel collapse buttons


  - Ensure tooltips are accessible with keyboard navigation
  - _Requirements: 9.5_

- [ ] 8. Implement state persistence



  - Add localStorage persistence for layout preferences
  - Persist panel widths and visibility
  - Persist active tab selection

  - Restore state on application load
  - _Requirements: 7.6, 7.7, 10.7, 10.8_

- [ ] 8.1 Configure Zustand persist middleware for LayoutStore
  - Add persist middleware to LayoutStore with storage name 'penguin-layout-storage'
  - Configure to persist libraryPanelVisible, advancedControlsPanelVisible, libraryPanelWidth, advancedControlsPanelWidth, activeControlsTab
  - Test persistence by changing layout and refreshing browser
  - Verify state restoration on application reload


  - _Requirements: 7.6, 7.7, 10.7, 10.8_

- [ ] 8.2 Add version migration for layout state
  - Implement version field in persisted layout state
  - Create migration function to handle schema changes
  - Add default value fallbacks for missing fields


  - Test migration with old localStorage data
  - _Requirements: 7.7, 10.8_

- [-] 9. Update App.tsx to use new layout


  - Replace existing layout with IDELayout component
  - Remove old sidebar structure
  - Update routing if necessary
  - Ensure theme and error boundary still work
  - _Requirements: 1.1, 1.2_

- [ ] 9.1 Refactor App.tsx to use IDELayout
  - Import IDELayout component
  - Replace existing aside and main structure with IDELayout
  - Move Header component to appropriate location (Library Panel or separate top bar)
  - Ensure ThemeProvider and ErrorBoundary wrap IDELayout
  - Remove lazy loading for PanelNav and PanelContainer (now in GenerationControlsTab)
  - _Requirements: 1.1, 1.2_

- [ ] 9.2 Update component imports and exports
  - Create index.ts files for component folders to simplify imports
  - Update all component imports to use new structure
  - Ensure all components are properly exported
  - Remove unused component imports
  - _Requirements: 1.1, 1.2_

- [x] 10. Polish UI and styling




  - Apply consistent Material Design styling
  - Add smooth transitions for panel operations
  - Ensure responsive behavior
  - Add loading states and animations
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 10.1 Apply consistent Material Design styling


  - Review all components for consistent use of shadcn/ui components
  - Ensure consistent spacing using Tailwind spacing scale (p-4, gap-4, etc.)
  - Apply consistent border styles using border and border-r/border-l classes
  - Use consistent typography with text-sm, text-base, font-medium classes
  - Verify color usage matches theme variables (bg-background, text-foreground, etc.)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


- [x] 10.2 Add transitions and animations

  - Add transition-all duration-200 to panel width changes
  - Add fade-in animation for panel content when expanding
  - Add smooth transitions for tab switching
  - Add hover and focus transitions to interactive elements
  - Use Tailwind transition utilities consistently
  - _Requirements: 8.7_


- [x] 10.3 Ensure responsive behavior

  - Test layout on different screen sizes (1280px, 1920px, 2560px)
  - Adjust minimum panel widths for smaller screens
  - Ensure text and icons scale appropriately
  - Test panel resizing at various viewport sizes
  - Add responsive breakpoints if needed
  - _Requirements: 8.1, 8.3_



- [ ] 10.4 Add loading states and animations
  - Ensure LoadingSpinner is used consistently across all loading states
  - Add skeleton loaders for file tree while loading
  - Add loading state to image transformations
  - Ensure loading states are accessible with ARIA attributes
  - _Requirements: 3.7, 8.1_

- [ ]* 11. Write comprehensive tests
  - Write unit tests for all new stores
  - Write component tests for layout components
  - Write integration tests for panel interactions
  - Write accessibility tests for keyboard navigation
  - _Requirements: All_

- [ ]* 11.1 Write unit tests for stores
  - Test LayoutStore actions and state updates
  - Test ImageEditStore transformations and reset functionality
  - Test FileSystemStore file tree operations
  - Test state persistence and restoration
  - Use Vitest for test runner
  - _Requirements: 1.1, 1.2, 1.3, 7.6, 7.7, 10.7, 10.8_

- [ ]* 11.2 Write component tests for layout
  - Test IDELayout rendering with different panel visibility states
  - Test ResizeHandle drag interactions
  - Test PanelHeader collapse button functionality
  - Test FileTree rendering and interactions
  - Use React Testing Library
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 7.1, 7.2, 10.1, 10.2, 10.3_

- [ ]* 11.3 Write integration tests for workflows
  - Test complete panel resize workflow
  - Test panel collapse and expand workflow
  - Test file selection and image display workflow
  - Test image editing and preview workflow
  - Test keyboard shortcuts
  - _Requirements: 2.4, 3.5, 3.6, 5.7, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3_

- [ ]* 11.4 Write accessibility tests
  - Test keyboard navigation through all interactive elements
  - Test ARIA labels and roles
  - Test focus management
  - Test screen reader announcements
  - Use jest-axe for automated accessibility testing
  - _Requirements: 2.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12. Update documentation
  - Update README with new layout features
  - Document keyboard shortcuts
  - Add screenshots of new interface
  - Document component architecture
  - _Requirements: All_

- [ ] 12.1 Update README.md with new features
  - Add section describing IDE-like layout
  - Document three-panel structure and purpose of each panel
  - List all keyboard shortcuts with descriptions
  - Add screenshots showing Library Panel, Workspace Panel, and Advanced Controls Panel
  - Document panel resizing and collapsing features
  - _Requirements: All_

- [ ] 12.2 Create component architecture documentation
  - Write docs/architecture.md describing component hierarchy
  - Document state management with store diagrams
  - Explain data flow between components
  - Document key design decisions
  - Add Mermaid diagrams for visual representation
  - _Requirements: All_
