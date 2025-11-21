# Design Document

## Overview

This design document outlines the architecture and implementation approach for transforming the Penguin frontend application into a professional IDE-like interface. The redesign introduces a three-panel layout with collapsible side panels, tabbed controls, and enhanced file management capabilities. The design maintains all existing functionality while reorganizing the UI for improved workflow efficiency and professional aesthetics.

### Key Design Goals

1. **Professional IDE Experience**: Create a familiar, productive environment similar to modern code editors
2. **Flexible Workspace**: Enable users to customize panel sizes and visibility based on their workflow
3. **Organized Controls**: Group related functionality into logical tabs and panels
4. **Consistent Design System**: Apply Material Design principles through shadcn/ui components
5. **Performance**: Maintain fast rendering and smooth interactions through optimized React patterns

## Architecture

### High-Level Component Structure

```
App
├── ThemeProvider
├── ErrorBoundary
└── IDELayout
    ├── LibraryPanel (collapsible)
    │   ├── PanelHeader
    │   ├── FileTree
    │   └── CollapseButton
    ├── ResizeHandle
    ├── WorkspacePanel (flexible)
    │   ├── ImageViewer
    │   │   ├── GeneratedImage
    │   │   ├── LoadingState
    │   │   └── EmptyState
    │   └── PromptControls
    │       ├── PromptTextarea
    │       └── ActionButtons (Generate, Refine)
    ├── ResizeHandle
    └── AdvancedControlsPanel (collapsible)
        ├── PanelHeader
        ├── TabNavigation
        ├── ImageControlsTab
        │   ├── BrightnessControl
        │   ├── ContrastControl
        │   ├── SaturationControl
        │   ├── CropControl
        │   ├── RotationControl
        │   └── FlipControls
        ├── GenerationControlsTab
        │   ├── PanelNav
        │   └── PanelContainer
        │       ├── ScenePanel
        │       ├── CameraPanel
        │       ├── LightingPanel
        │       ├── AestheticsPanel
        │       └── MediumPanel
        └── CollapseButton
```

### State Management Architecture

The application uses Zustand for state management with the following store structure:

```typescript
// Existing ConfigStore (maintained)
interface ConfigState {
  config: PenguinConfig;
  selectedObject: number | null;
  activePanel: PanelType;
  // ... existing actions
}

// New LayoutStore
interface LayoutState {
  // Panel visibility
  libraryPanelVisible: boolean;
  advancedControlsPanelVisible: boolean;
  
  // Panel widths (in pixels)
  libraryPanelWidth: number;
  advancedControlsPanelWidth: number;
  
  // Active tab in Advanced Controls
  activeControlsTab: 'image' | 'generation';
  
  // Actions
  toggleLibraryPanel: () => void;
  toggleAdvancedControlsPanel: () => void;
  setLibraryPanelWidth: (width: number) => void;
  setAdvancedControlsPanelWidth: (width: number) => void;
  setActiveControlsTab: (tab: 'image' | 'generation') => void;
}

// New ImageEditStore
interface ImageEditState {
  // Image editing parameters
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  cropArea: CropArea | null;
  
  // Actions
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setRotation: (value: number) => void;
  toggleFlipHorizontal: () => void;
  toggleFlipVertical: () => void;
  setCropArea: (area: CropArea | null) => void;
  resetImageEdits: () => void;
}

// New FileSystemStore
interface FileSystemState {
  // File tree structure
  rootDirectory: FileNode;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  
  // Actions
  loadFileTree: () => Promise<void>;
  selectFile: (path: string) => void;
  toggleFolder: (path: string) => void;
  refreshFileTree: () => Promise<void>;
}
```

## Components and Interfaces

### 1. IDELayout Component

Main layout container managing the three-panel structure.

```typescript
interface IDELayoutProps {
  children?: React.ReactNode;
}

const IDELayout: React.FC<IDELayoutProps> = () => {
  const {
    libraryPanelVisible,
    advancedControlsPanelVisible,
    libraryPanelWidth,
    advancedControlsPanelWidth,
  } = useLayoutStore();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {libraryPanelVisible && (
        <>
          <LibraryPanel width={libraryPanelWidth} />
          <ResizeHandle
            onResize={(delta) => handleLibraryResize(delta)}
            minWidth={200}
          />
        </>
      )}
      
      <WorkspacePanel />
      
      {advancedControlsPanelVisible && (
        <>
          <ResizeHandle
            onResize={(delta) => handleAdvancedControlsResize(delta)}
            minWidth={280}
          />
          <AdvancedControlsPanel width={advancedControlsPanelWidth} />
        </>
      )}
    </div>
  );
};
```

### 2. LibraryPanel Component

File management panel with tree view.

```typescript
interface LibraryPanelProps {
  width: number;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ width }) => {
  const { rootDirectory, selectedFile, expandedFolders } = useFileSystemStore();
  
  return (
    <aside
      style={{ width: `${width}px` }}
      className="border-r bg-muted/30 flex flex-col"
    >
      <PanelHeader title="Library" onCollapse={toggleLibraryPanel} />
      <div className="flex-1 overflow-y-auto">
        <FileTree
          node={rootDirectory}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          onSelectFile={selectFile}
          onToggleFolder={toggleFolder}
        />
      </div>
    </aside>
  );
};
```

### 3. WorkspacePanel Component

Central panel with image viewer and prompt controls.

```typescript
const WorkspacePanel: React.FC = () => {
  const { generatedImage, isLoading, error } = useGeneration();
  const [prompt, setPrompt] = useState('');
  
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        <ImageViewer
          image={generatedImage}
          isLoading={isLoading}
          error={error}
        />
      </div>
      
      <div className="border-t p-4 bg-muted/20">
        <PromptControls
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          onRefine={handleRefine}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
};
```

### 4. AdvancedControlsPanel Component

Right panel with tabbed controls.

```typescript
interface AdvancedControlsPanelProps {
  width: number;
}

const AdvancedControlsPanel: React.FC<AdvancedControlsPanelProps> = ({ width }) => {
  const { activeControlsTab, setActiveControlsTab } = useLayoutStore();
  
  return (
    <aside
      style={{ width: `${width}px` }}
      className="border-l bg-muted/30 flex flex-col"
    >
      <PanelHeader title="Advanced Controls" onCollapse={toggleAdvancedControlsPanel} />
      
      <Tabs value={activeControlsTab} onValueChange={setActiveControlsTab}>
        <TabsList className="w-full">
          <TabsTrigger value="image" className="flex-1">
            Image Controls
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex-1">
            Generation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="image" className="flex-1 overflow-y-auto p-4">
          <ImageControlsTab />
        </TabsContent>
        
        <TabsContent value="generation" className="flex-1 overflow-y-auto p-4">
          <GenerationControlsTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
};
```

### 5. ResizeHandle Component

Draggable handle for panel resizing.

```typescript
interface ResizeHandleProps {
  onResize: (delta: number) => void;
  minWidth: number;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize, minWidth }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      onResize(delta);
      startXRef.current = e.clientX;
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize]);
  
  return (
    <div
      className={cn(
        "w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
        isDragging && "bg-primary"
      )}
      onMouseDown={handleMouseDown}
    />
  );
};
```

### 6. ImageControlsTab Component

Image editing controls with sliders and buttons.

```typescript
const ImageControlsTab: React.FC = () => {
  const {
    brightness,
    contrast,
    saturation,
    rotation,
    flipHorizontal,
    flipVertical,
    setBrightness,
    setContrast,
    setSaturation,
    setRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    resetImageEdits,
  } = useImageEditStore();
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Brightness</Label>
        <Slider
          value={[brightness]}
          onValueChange={([value]) => setBrightness(value)}
          min={-100}
          max={100}
          step={1}
        />
      </div>
      
      <div className="space-y-4">
        <Label>Contrast</Label>
        <Slider
          value={[contrast]}
          onValueChange={([value]) => setContrast(value)}
          min={-100}
          max={100}
          step={1}
        />
      </div>
      
      <div className="space-y-4">
        <Label>Saturation</Label>
        <Slider
          value={[saturation]}
          onValueChange={([value]) => setSaturation(value)}
          min={-100}
          max={100}
          step={1}
        />
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <Label>Rotation</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((rotation - 90) % 360)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((rotation + 90) % 360)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <Label>Flip</Label>
        <div className="flex gap-2">
          <Button
            variant={flipHorizontal ? "default" : "outline"}
            size="sm"
            onClick={toggleFlipHorizontal}
          >
            <FlipHorizontal className="h-4 w-4 mr-2" />
            Horizontal
          </Button>
          <Button
            variant={flipVertical ? "default" : "outline"}
            size="sm"
            onClick={toggleFlipVertical}
          >
            <FlipVertical className="h-4 w-4 mr-2" />
            Vertical
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <Button
        variant="outline"
        className="w-full"
        onClick={resetImageEdits}
      >
        Reset All
      </Button>
    </div>
  );
};
```

### 7. FileTree Component

Recursive tree view for file system navigation.

```typescript
interface FileTreeProps {
  node: FileNode;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
  depth?: number;
}

const FileTree: React.FC<FileTreeProps> = ({
  node,
  selectedFile,
  expandedFolders,
  onSelectFile,
  onToggleFolder,
  depth = 0,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  
  const handleClick = () => {
    if (node.type === 'directory') {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && node.type === 'directory' && !isExpanded) {
      onToggleFolder(node.path);
    } else if (e.key === 'ArrowLeft' && node.type === 'directory' && isExpanded) {
      onToggleFolder(node.path);
    }
  };
  
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm",
          isSelected && "bg-accent",
          "transition-colors"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {node.type === 'directory' && (
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        )}
        {node.type === 'directory' ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

## Data Models

### LayoutState

```typescript
interface LayoutState {
  libraryPanelVisible: boolean;
  advancedControlsPanelVisible: boolean;
  libraryPanelWidth: number;
  advancedControlsPanelWidth: number;
  activeControlsTab: 'image' | 'generation';
}
```

### ImageEditState

```typescript
interface ImageEditState {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  rotation: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
  cropArea: CropArea | null;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### FileSystemState

```typescript
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
  modifiedAt?: Date;
}

interface FileSystemState {
  rootDirectory: FileNode;
  selectedFile: string | null;
  expandedFolders: Set<string>;
}
```

## Error Handling

### Panel Resize Errors

- Enforce minimum and maximum width constraints
- Prevent panels from becoming too small to be usable
- Handle edge cases when window is resized

### File System Errors

- Display error messages when file tree fails to load
- Provide retry mechanism for failed file operations
- Handle permission errors gracefully

### Image Edit Errors

- Validate slider values before applying
- Handle cases where image editing fails
- Provide reset functionality to recover from errors

## Testing Strategy

### Unit Tests

1. **Store Tests**
   - Test layout store actions and state updates
   - Test image edit store transformations
   - Test file system store operations

2. **Component Tests**
   - Test ResizeHandle drag interactions
   - Test FileTree keyboard navigation
   - Test ImageControlsTab slider updates
   - Test panel collapse/expand functionality

3. **Hook Tests**
   - Test useKeyboardShortcuts hook
   - Test useResizeObserver hook
   - Test useFileSystem hook

### Integration Tests

1. **Layout Tests**
   - Test panel resizing with constraints
   - Test panel collapse and expand
   - Test state persistence in localStorage

2. **Workflow Tests**
   - Test complete image generation workflow
   - Test image editing and preview
   - Test file selection and display

### Accessibility Tests

1. **Keyboard Navigation**
   - Test tab order through all interactive elements
   - Test keyboard shortcuts
   - Test file tree navigation with arrow keys

2. **Screen Reader**
   - Test ARIA labels and roles
   - Test focus management
   - Test announcements for state changes

### Performance Tests

1. **Rendering Performance**
   - Test large file tree rendering
   - Test panel resize performance
   - Test image preview loading

2. **Memory Usage**
   - Test for memory leaks in resize handlers
   - Test image caching strategy
   - Test store subscription cleanup

## Migration Strategy

### Phase 1: Layout Infrastructure

1. Create new layout stores (LayoutStore, ImageEditStore, FileSystemStore)
2. Implement IDELayout component with basic three-panel structure
3. Implement ResizeHandle component with drag functionality
4. Add panel collapse/expand functionality

### Phase 2: Library Panel

1. Implement FileTree component with basic rendering
2. Add keyboard navigation support
3. Integrate with file system API
4. Add file selection and preview

### Phase 3: Workspace Panel

1. Refactor Canvas component into ImageViewer
2. Create PromptControls component
3. Implement Generate and Refine actions
4. Add loading and error states

### Phase 4: Advanced Controls Panel

1. Implement tab navigation
2. Create ImageControlsTab with all editing controls
3. Migrate existing panels to GenerationControlsTab
4. Integrate image editing with preview

### Phase 5: Polish and Optimization

1. Add keyboard shortcuts
2. Implement state persistence
3. Add animations and transitions
4. Optimize performance
5. Complete accessibility audit

## Design Decisions and Rationales

### Three-Panel Layout

**Decision**: Use a fixed three-panel layout with collapsible sides rather than a flexible multi-panel system.

**Rationale**: This provides a familiar IDE-like experience while keeping the implementation simpler. Users can customize the layout through panel resizing and collapsing, which covers most use cases without the complexity of arbitrary panel arrangements.

### Zustand for State Management

**Decision**: Continue using Zustand and add new stores for layout, image editing, and file system state.

**Rationale**: Zustand is already in use and provides excellent performance with minimal boilerplate. Creating separate stores keeps concerns separated and makes the codebase more maintainable.

### Tabbed Advanced Controls

**Decision**: Use tabs to separate image editing controls from generation controls.

**Rationale**: This reduces visual clutter and allows users to focus on one type of control at a time. The tab structure is familiar and easy to navigate.

### Local Storage Persistence

**Decision**: Persist panel widths, visibility, and tab selection in localStorage.

**Rationale**: Users expect their layout preferences to be remembered across sessions. localStorage is simple, reliable, and doesn't require backend changes.

### Keyboard Shortcuts

**Decision**: Implement common keyboard shortcuts for frequent actions.

**Rationale**: Power users expect keyboard shortcuts in IDE-like interfaces. This significantly improves workflow efficiency for users who prefer keyboard navigation.

### Material Design with shadcn/ui

**Decision**: Continue using shadcn/ui components and ensure consistent Material Design principles.

**Rationale**: shadcn/ui provides high-quality, accessible components that follow Material Design principles. Maintaining consistency with the existing design system ensures a cohesive user experience.
