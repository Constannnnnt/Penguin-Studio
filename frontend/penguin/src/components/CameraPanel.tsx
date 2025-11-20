import * as React from 'react';
import { useConfigStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/FieldGroup';
import type { CameraAngle, LensType, DepthOfField, FocusType } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const CAMERA_ANGLE_OPTIONS: readonly CameraAngle[] = [
  'eye-level',
  'low-angle',
  'high-angle',
  "bird's eye",
  "worm's eye",
  'dutch angle',
] as const;

const LENS_FOCAL_LENGTH_OPTIONS: readonly LensType[] = [
  'ultra-wide',
  'wide',
  'standard',
  'telephoto',
  'super-telephoto',
] as const;

const DEPTH_OF_FIELD_OPTIONS: readonly DepthOfField[] = [
  'shallow',
  'medium',
  'deep',
] as const;

const FOCUS_OPTIONS: readonly FocusType[] = [
  'sharp',
  'soft',
  'selective',
] as const;

// ============================================================================
// CameraPanel Component
// ============================================================================

/**
 * CameraPanel component provides controls for photographic characteristics
 * 
 * Features:
 * - Camera angle selection (6 options)
 * - Lens focal length selection (5 options) 
 * - Depth of field selection (3 options) 
 * - Focus selection (3 options) 
 * - Uses FieldGroup for consistent UI and accessibility
 * - Visual highlighting of selected options 
 * 
 */
export const CameraPanel: React.FC = () => {
  // Selective store subscriptions - only subscribe to photographic characteristics
  const photographicCharacteristics = useConfigStore(
    (state) => state.config.photographic_characteristics
  );
  const updateConfig = useConfigStore((state) => state.updateConfig);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">Camera Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
        <FieldGroup
          label="Camera Angle"
          options={CAMERA_ANGLE_OPTIONS}
          value={photographicCharacteristics.camera_angle}
          onChange={(value) =>
            updateConfig('photographic_characteristics.camera_angle', value as CameraAngle)
          }
          columns={3}
        />

        <FieldGroup
          label="Lens Focal Length"
          options={LENS_FOCAL_LENGTH_OPTIONS}
          value={photographicCharacteristics.lens_focal_length}
          onChange={(value) =>
            updateConfig('photographic_characteristics.lens_focal_length', value as LensType)
          }
          columns={2}
        />

        <FieldGroup
          label="Depth of Field"
          options={DEPTH_OF_FIELD_OPTIONS}
          value={photographicCharacteristics.depth_of_field}
          onChange={(value) =>
            updateConfig('photographic_characteristics.depth_of_field', value as DepthOfField)
          }
          columns={3}
        />

        <FieldGroup
          label="Focus"
          options={FOCUS_OPTIONS}
          value={photographicCharacteristics.focus}
          onChange={(value) =>
            updateConfig('photographic_characteristics.focus', value as FocusType)
          }
          columns={3}
        />
      </CardContent>
    </Card>
  );
};
