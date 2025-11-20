import * as React from 'react';
import { useConfigStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/FieldGroup';
import type { CompositionType, ColorScheme, MoodType } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const COMPOSITION_OPTIONS: readonly CompositionType[] = [
  'centered',
  'rule of thirds',
  'symmetrical',
  'diagonal',
  'leading lines',
  'frame within frame',
] as const;

const COLOR_SCHEME_OPTIONS: readonly ColorScheme[] = [
  'vibrant',
  'muted',
  'monochrome',
  'warm',
  'cool',
  'pastel',
  'cinematic',
] as const;

const MOOD_ATMOSPHERE_OPTIONS: readonly MoodType[] = [
  'neutral',
  'joyful',
  'dramatic',
  'calm',
  'mysterious',
  'energetic',
  'melancholic',
] as const;

// ============================================================================
// AestheticsPanel Component
// ============================================================================

/**
 * AestheticsPanel component provides controls for aesthetic configuration
 * 
 * Features:
 * - Composition selection (6 options)
 * - Color scheme selection (7 options)
 * - Mood and atmosphere selection (7 options)
 * - Uses FieldGroup component for consistent UI
 * 
 */
export const AestheticsPanel: React.FC = () => {
  // Selective store subscription - only subscribe to aesthetics
  const aesthetics = useConfigStore((state) => state.config.aesthetics);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">Aesthetic Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
        <FieldGroup
          label="Composition"
          options={COMPOSITION_OPTIONS}
          value={aesthetics.composition}
          onChange={(value) =>
            updateConfig('aesthetics.composition', value as CompositionType)
          }
          columns={2}
        />

        <FieldGroup
          label="Color Scheme"
          options={COLOR_SCHEME_OPTIONS}
          value={aesthetics.color_scheme}
          onChange={(value) =>
            updateConfig('aesthetics.color_scheme', value as ColorScheme)
          }
          columns={2}
        />

        <FieldGroup
          label="Mood & Atmosphere"
          options={MOOD_ATMOSPHERE_OPTIONS}
          value={aesthetics.mood_atmosphere}
          onChange={(value) =>
            updateConfig('aesthetics.mood_atmosphere', value as MoodType)
          }
          columns={2}
        />
      </CardContent>
    </Card>
  );
};
