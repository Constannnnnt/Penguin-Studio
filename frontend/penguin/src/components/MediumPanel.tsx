import * as React from 'react';
import { useConfigStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/FieldGroup';
import type { StyleMedium, ArtisticStyle } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const STYLE_MEDIUM_OPTIONS: readonly StyleMedium[] = [
  'photograph',
  'oil painting',
  '3D render',
  'watercolor',
  'digital art',
  'sketch',
] as const;

const ARTISTIC_STYLE_OPTIONS: readonly ArtisticStyle[] = [
  'realistic',
  'surreal',
  'cinematic',
  'minimalism',
  'impressionist',
  'abstract',
] as const;

// ============================================================================
// MediumPanel Component
// ============================================================================

/**
 * MediumPanel component provides controls for style and medium configuration
 * 
 * Features:
 * - Style medium selection (6 options)
 * - Artistic style selection (6 options)
 * - Uses FieldGroup component for consistent UI
 * 
 */
export const MediumPanel: React.FC = () => {
  // Selective store subscriptions - only subscribe to style_medium and artistic_style
  const styleMedium = useConfigStore((state) => state.config.style_medium);
  const artisticStyle = useConfigStore((state) => state.config.artistic_style);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">Style & Medium</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
        {/* Style Medium */}
        <FieldGroup
          label="Style Medium"
          options={STYLE_MEDIUM_OPTIONS}
          value={styleMedium}
          onChange={(value) =>
            updateConfig('style_medium', value as StyleMedium)
          }
          columns={2}
        />

        {/* Artistic Style */}
        <FieldGroup
          label="Artistic Style"
          options={ARTISTIC_STYLE_OPTIONS}
          value={artisticStyle}
          onChange={(value) =>
            updateConfig('artistic_style', value as ArtisticStyle)
          }
          columns={2}
        />
      </CardContent>
    </Card>
  );
};
