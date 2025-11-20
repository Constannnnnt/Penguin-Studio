import * as React from 'react';
import { useConfigStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/FieldGroup';
import type { LightingCondition, LightingDirection, ShadowType } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const LIGHTING_CONDITIONS_OPTIONS: readonly LightingCondition[] = [
  'daylight',
  'studio',
  'golden hour',
  'blue hour',
  'overcast',
  'night',
] as const;

const LIGHTING_DIRECTION_OPTIONS: readonly LightingDirection[] = [
  'front-lit',
  'back-lit',
  'side-lit',
  'top-lit',
  'bottom-lit',
  'diffused',
] as const;

const SHADOW_QUALITY_OPTIONS: readonly ShadowType[] = [
  'soft',
  'hard',
  'subtle',
  'dramatic',
  'none',
] as const;

// ============================================================================
// LightingPanel Component
// ============================================================================

/**
 * LightingPanel component provides controls for lighting configuration
 * 
 * Features:
 * - Lighting conditions selection (6 options)
 * - Lighting direction selection (6 options)
 * - Shadow quality selection (5 options)
 * - Uses FieldGroup component for consistent UI
 * 
 */
export const LightingPanel: React.FC = () => {
  // Selective store subscription - only subscribe to lighting 
  const lighting = useConfigStore((state) => state.config.lighting);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">Lighting Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
        {/* Lighting Conditions */}
        <FieldGroup
          label="Lighting Conditions"
          options={LIGHTING_CONDITIONS_OPTIONS}
          value={lighting.conditions}
          onChange={(value) =>
            updateConfig('lighting.conditions', value as LightingCondition)
          }
          columns={2}
        />

        {/* Lighting Direction */}
        <FieldGroup
          label="Lighting Direction"
          options={LIGHTING_DIRECTION_OPTIONS}
          value={lighting.direction}
          onChange={(value) =>
            updateConfig('lighting.direction', value as LightingDirection)
          }
          columns={2}
        />

        {/* Shadow Quality*/}
        <FieldGroup
          label="Shadow Quality"
          options={SHADOW_QUALITY_OPTIONS}
          value={lighting.shadows}
          onChange={(value) =>
            updateConfig('lighting.shadows', value as ShadowType)
          }
          columns={2}
        />
      </CardContent>
    </Card>
  );
};
