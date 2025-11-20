import * as React from 'react';
import { useConfigStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldGroup } from '@/components/FieldGroup';
import { useDebounce } from '@/hooks';
import type { LocationOption, SizeOption, OrientationOption } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const LOCATION_OPTIONS: readonly LocationOption[] = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center-left',
  'center-right',
] as const;

const SIZE_OPTIONS: readonly SizeOption[] = [
  'small',
  'medium',
  'large',
  'very large',
] as const;

const ORIENTATION_OPTIONS: readonly OrientationOption[] = [
  'front-facing',
  'left',
  'right',
  'back',
  'angled',
] as const;

// ============================================================================
// ScenePanel Component
// ============================================================================

/**
 * ScenePanel component provides controls for editing scene objects and background settings
 * 
 * Behavior:
 * - When an object is selected: Shows object property editing controls
 * - When no object is selected: Shows background setting textarea
 * 
 * Features:
 * - Debounced text input updates (300ms)
 * - Conditional rendering based on selectedObject state
 * - Uses FieldGroup for location, size, and orientation options
 * 
 */
export const ScenePanel: React.FC = () => {
  // Selective store subscriptions - only subscribe to what we need
  const selectedObject = useConfigStore((state) => state.selectedObject);
  const objects = useConfigStore((state) => state.config.objects);
  const backgroundSetting = useConfigStore((state) => state.config.background_setting);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const updateObject = useConfigStore((state) => state.updateObject);

  // Get the current object or use empty defaults
  const object = selectedObject !== null && objects[selectedObject]
    ? objects[selectedObject]
    : null;

  // ========================================================================
  // All hooks must be called at the top level (Rules of Hooks)
  // ========================================================================

  // Local state for object editing (debounced text inputs)
  const [localDescription, setLocalDescription] = React.useState(object?.description || '');
  const [localShapeAndColor, setLocalShapeAndColor] = React.useState(object?.shape_and_color || '');
  const [localTexture, setLocalTexture] = React.useState(object?.texture || '');
  const [localAppearanceDetails, setLocalAppearanceDetails] = React.useState(
    object?.appearance_details || ''
  );

  // Local state for background editing
  const [localBackground, setLocalBackground] = React.useState(backgroundSetting);

  // Debounced values for object editing
  const debouncedDescription = useDebounce(localDescription, 300);
  const debouncedShapeAndColor = useDebounce(localShapeAndColor, 300);
  const debouncedTexture = useDebounce(localTexture, 300);
  const debouncedAppearanceDetails = useDebounce(localAppearanceDetails, 300);

  // Debounced value for background editing
  const debouncedBackground = useDebounce(localBackground, 300);

  // Sync local state when selected object changes
  React.useEffect(() => {
    if (object) {
      setLocalDescription(object.description);
      setLocalShapeAndColor(object.shape_and_color);
      setLocalTexture(object.texture || '');
      setLocalAppearanceDetails(object.appearance_details || '');
    }
  }, [selectedObject, object]);

  // Sync background local state when config changes
  React.useEffect(() => {
    setLocalBackground(backgroundSetting);
  }, [backgroundSetting]);

  // Update store when debounced object values change
  React.useEffect(() => {
    if (object && selectedObject !== null && debouncedDescription !== object.description) {
      updateObject(selectedObject, 'description', debouncedDescription);
    }
  }, [debouncedDescription, selectedObject, object, updateObject]);

  React.useEffect(() => {
    if (object && selectedObject !== null && debouncedShapeAndColor !== object.shape_and_color) {
      updateObject(selectedObject, 'shape_and_color', debouncedShapeAndColor);
    }
  }, [debouncedShapeAndColor, selectedObject, object, updateObject]);

  React.useEffect(() => {
    if (object && selectedObject !== null && debouncedTexture !== (object.texture || '')) {
      updateObject(selectedObject, 'texture', debouncedTexture || undefined);
    }
  }, [debouncedTexture, selectedObject, object, updateObject]);

  React.useEffect(() => {
    if (object && selectedObject !== null && debouncedAppearanceDetails !== (object.appearance_details || '')) {
      updateObject(selectedObject, 'appearance_details', debouncedAppearanceDetails || undefined);
    }
  }, [debouncedAppearanceDetails, selectedObject, object, updateObject]);

  // Update store when debounced background value changes
  React.useEffect(() => {
    if (selectedObject === null && debouncedBackground !== backgroundSetting) {
      updateConfig('background_setting', debouncedBackground);
    }
  }, [debouncedBackground, selectedObject, backgroundSetting, updateConfig]);

  // ========================================================================
  // Object Editing Mode
  // ========================================================================
  
  if (object && selectedObject !== null) {

    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-4 md:pb-6">
          <CardTitle className="text-lg sm:text-xl md:text-2xl">Object Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="object-description" className="text-sm sm:text-base">Description</Label>
            <Textarea
              id="object-description"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Describe the object..."
              rows={3}
              aria-describedby="object-description-help"
              className="text-sm sm:text-base"
            />
            <p
              id="object-description-help"
              className="text-xs sm:text-sm text-muted-foreground"
            >
              Provide a clear description of the object
            </p>
          </div>

          {/* Location */}
          <FieldGroup
            label="Location"
            options={LOCATION_OPTIONS}
            value={object.location}
            onChange={(value) =>
              updateObject(selectedObject, 'location', value as LocationOption)
            }
            columns={3}
          />

          {/* Size */}
          <FieldGroup
            label="Size"
            options={SIZE_OPTIONS}
            value={object.relative_size}
            onChange={(value) =>
              updateObject(selectedObject, 'relative_size', value as SizeOption)
            }
            columns={2}
          />

          {/* Shape and Color */}
          <div className="space-y-2">
            <Label htmlFor="object-shape-color" className="text-sm sm:text-base">Shape and Color</Label>
            <Textarea
              id="object-shape-color"
              value={localShapeAndColor}
              onChange={(e) => setLocalShapeAndColor(e.target.value)}
              placeholder="e.g., round red ball, rectangular blue box..."
              rows={2}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Texture (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="object-texture" className="text-sm sm:text-base">
              Texture <span className="text-muted-foreground text-xs sm:text-sm">(Optional)</span>
            </Label>
            <Textarea
              id="object-texture"
              value={localTexture}
              onChange={(e) => setLocalTexture(e.target.value)}
              placeholder="e.g., smooth, rough, metallic, wooden..."
              rows={2}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Appearance Details (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="object-appearance" className="text-sm sm:text-base">
              Appearance Details <span className="text-muted-foreground text-xs sm:text-sm">(Optional)</span>
            </Label>
            <Textarea
              id="object-appearance"
              value={localAppearanceDetails}
              onChange={(e) => setLocalAppearanceDetails(e.target.value)}
              placeholder="Additional visual details..."
              rows={2}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Orientation */}
          <FieldGroup
            label="Orientation"
            options={ORIENTATION_OPTIONS}
            value={object.orientation}
            onChange={(value) =>
              updateObject(selectedObject, 'orientation', value as OrientationOption)
            }
            columns={2}
          />
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // Background Editing Mode
  // ========================================================================

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">Background</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="background-setting" className="text-sm sm:text-base">Background Setting</Label>
          <Textarea
            id="background-setting"
            value={localBackground}
            onChange={(e) => setLocalBackground(e.target.value)}
            placeholder="Describe the background environment..."
            rows={6}
            aria-describedby="background-setting-help"
            className="text-sm sm:text-base"
          />
          <p
            id="background-setting-help"
            className="text-xs sm:text-sm text-muted-foreground"
          >
            Describe the environment, setting, or backdrop for your scene
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

