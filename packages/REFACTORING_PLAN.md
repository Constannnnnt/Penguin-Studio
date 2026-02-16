# UI Framework Refactoring Plan

## Overview
Build a generic UI framework that:
1. Builds UI from structured JSON schemas
2. Transforms UI interactions back into text/descriptions

## Current Issues Identified

### 1. Naming & Organization
- `Ambi*` prefix is cryptic
- Duplicate store creation (AmbiProvider vs AmbiEditor)
- `Tracker` referenced but doesn't exist (should be HistoryTracker)
- Index exports are inconsistent

### 2. Architecture Problems
- Two incompatible state patterns: Command pattern vs direct updates
- `FieldFactory` mixes widget resolution with rendering
- No abstraction for text ↔ UI transformation
- Array fields not implemented

### 3. Missing Components
- No validation
- No array support
- No conditional rendering
- No nested object/array abstraction

---

## New Architecture

### Package: `core` - Pure Logic (No React)

```
packages/core/src/
├── schema.ts                    # EXISTING - Field definitions
├── index.ts                     # Main exports
├── history/                     # EXISTING - Keep
│   ├── HistoryTracker.ts
│   └── types.ts
├── state/                       # NEW - Unified state management
│   ├── StateMachine.ts          # Core state logic
│   ├── Reducer.ts               # Action handlers
│   └── types.ts                 # Action, State interfaces
├── transform/                   # NEW - Text ↔ UI layer
│   ├── TextEncoder.ts           # UI → Text (describe state changes)
│   ├── TextDecoder.ts           # Text → UI (parse intent)
│   └── types.ts                 # Interaction, Action types
└── utils/                       # NEW - Shared utilities
    ├── transformer.ts           # EXISTING - Move from root
    ├── observer.ts              # EXISTING - Keep
    └── path.ts                  # NEW - Path utilities
```

### Package: `ui` - React Components

```
packages/ui/src/
├── index.ts                     # Main exports
├── Registry.tsx                 # EXISTING - Widget registry
├── context/                     # NEW - Unified context
│   └── FormContext.tsx          # Single provider
├── hooks/                       # NEW - Reusable logic
│   ├── useForm.ts               # Main form hook
│   ├── useField.ts              # Field-level hook
│   └── useInteraction.ts        # Text ↔ UI interaction
├── components/                  # Organized components
│   ├── FieldRenderer.tsx        # Entry point
│   ├── widgets/                 # Widget implementations
│   │   ├── StringField.tsx
│   │   ├── NumberField.tsx
│   │   ├── BooleanField.tsx
│   │   ├── ObjectField.tsx
│   │   ├── ArrayField.tsx
│   │   └── index.ts             # Widget registry builder
│   └── layouts/                 # Form layouts
│       ├── VerticalForm.tsx
│       └── GridForm.tsx
└── primitives/                  # DEPRECATED - Legacy
    ├── AmbiProvider.tsx
    ├── AmbiField.tsx
    ├── AmbiEditor.tsx
    └── FieldFactory.tsx
```

---

## Implementation Details

### 1. Core: Transform Layer (Text ↔ UI)

The key innovation - transform UI state into text and vice versa:

```typescript
// types.ts
export interface Interaction {
  type: 'change' | 'focus' | 'blur' | 'submit' | 'reset';
  path: string;
  value?: any;
  timestamp: number;
}

export interface Action {
  type: string;
  payload: Record<string, any>;
}

// TextEncoder: UI → Text
class TextEncoder {
  static encodeInteraction(interaction: Interaction): string {
    // "Changed field 'user.name' to 'John'"
  }
  
  static encodeState(data: any, schema: EditorSchema): string {
    // Human-readable description of current state
  }
}

// TextDecoder: Text → UI
class TextDecoder {
  static decode(text: string): Action | null {
    // Parse "set user.name to John" → Action
  }
}
```

### 2. Core: State Layer

Unified state management replacing the two conflicting patterns:

```typescript
// state/types.ts
export type Action =
  | { type: 'SET_FIELD'; path: string; value: any }
  | { type: 'SET_DATA'; data: any }
  | { type: 'RESET' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  history: { past: any[]; future: any[] };
}
```

### 3. UI: Context & Hooks

Single unified context:

```typescript
// context/FormContext.tsx
interface FormContextValue<T> {
  data: T;
  setField: (path: string, value: any) => void;
  setData: (data: T) => void;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  interaction: {
    toText: (path: string) => string;
    fromText: (text: string) => void;
  };
}

// hooks/useForm.ts
function useForm<T>(config: FormConfig<T>) {
  // Returns FormContextValue
}
```

### 4. UI: Widget System

Systematic widget registry:

```typescript
// components/widgets/index.ts
interface WidgetProps {
  path: string;
  value: any;
  onChange: (value: any) => void;
  schema: FieldSchema;
  disabled?: boolean;
  readonly?: boolean;
}

type WidgetComponent = React.FC<WidgetProps>;

interface WidgetRegistry {
  [key: string]: WidgetComponent;
}

// Default widgets
export const defaultWidgets: WidgetRegistry = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  object: ObjectField,
  array: ArrayField,
};
```

---

## Migration Path

1. **Phase 1**: Add new code alongside existing (no breaking changes)
2. **Phase 2**: Update imports in consuming code
3. **Phase 3**: Mark old code as deprecated
4. **Phase 4**: Remove deprecated code

---

## Files to Create/Modify

### Core Package (New Files)
- `packages/core/src/history/types.ts`
- `packages/core/src/state/StateMachine.ts`
- `packages/core/src/state/Reducer.ts`
- `packages/core/src/state/types.ts`
- `packages/core/src/transform/TextEncoder.ts`
- `packages/core/src/transform/TextDecoder.ts`
- `packages/core/src/transform/types.ts`
- `packages/core/src/utils/path.ts`
- `packages/core/src/index.ts` (update exports)

### UI Package (New Files)
- `packages/ui/src/context/FormContext.tsx`
- `packages/ui/src/hooks/useForm.ts`
- `packages/ui/src/hooks/useField.ts`
- `packages/ui/src/hooks/useInteraction.ts`
- `packages/ui/src/components/FieldRenderer.tsx`
- `packages/ui/src/components/widgets/StringField.tsx`
- `packages/ui/src/components/widgets/NumberField.tsx`
- `packages/ui/src/components/widgets/BooleanField.tsx`
- `packages/ui/src/components/widgets/ObjectField.tsx`
- `packages/ui/src/components/widgets/ArrayField.tsx`
- `packages/ui/src/components/widgets/index.ts`
- `packages/ui/src/components/layouts/VerticalForm.tsx`
- `packages/ui/src/components/layouts/GridForm.tsx`
- `packages/ui/src/index.ts` (update exports)

### UI Package (Modify)
- `packages/ui/src/Registry.tsx` (rename to WidgetRegistry)
- `packages/ui/src/AmbiEditor.tsx` (deprecate)
- `packages/ui/src/AmbiProvider.tsx` (deprecate)
- `packages/ui/src/AmbiField.tsx` (deprecate)
- `packages/ui/src/FieldFactory.tsx` (deprecate)

---

## Verification Checklist

- [ ] All existing tests pass
- [ ] New imports work correctly
- [ ] No circular dependencies
- [ ] TypeScript compiles without errors
- [ ] Documentation updated
