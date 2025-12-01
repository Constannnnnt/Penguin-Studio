import React, { useState } from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { applyColorScheme, revertColorScheme, getPreviousColorAdjustments } from '@/features/scene/lib/colorSchemeIntegration';
import { CollapsibleAestheticOption, type AestheticOption } from './CollapsibleAestheticOption';
import { PreviewGrid } from './PreviewGrid';
import { ColorSwatchGrid } from './ColorSwatchGrid';
import {
  STYLE_MEDIUM_PREVIEWS,
  AESTHETIC_STYLE_PREVIEWS,
  COMPOSITION_PREVIEWS,
  MOOD_ATMOSPHERE_PREVIEWS,
  COLOR_SCHEME_MAPPINGS,
  COLOR_SCHEME_SWATCHES,
} from '@/features/scene/constants';
import { Button } from '@/shared/components/ui/button';

type AestheticSectionType = 
  | 'style-medium'
  | 'aesthetic-style'
  | 'composition'
  | 'mood-atmosphere'
  | 'color-scheme';

const STYLE_MEDIUMS: AestheticOption[] = [
  { value: 'photograph', label: 'Photograph', previewSrc: STYLE_MEDIUM_PREVIEWS.photograph },
  { value: 'painting', label: 'Painting', previewSrc: STYLE_MEDIUM_PREVIEWS.painting },
  { value: 'digital-art', label: 'Digital Art', previewSrc: STYLE_MEDIUM_PREVIEWS['digital-art'] },
  { value: 'sketch', label: 'Sketch', previewSrc: STYLE_MEDIUM_PREVIEWS.sketch },
  { value: '3d-render', label: '3D Render', previewSrc: STYLE_MEDIUM_PREVIEWS['3d-render'] },
];

const AESTHETIC_STYLES: AestheticOption[] = [
  { value: 'realistic', label: 'Realistic', previewSrc: AESTHETIC_STYLE_PREVIEWS.realistic },
  { value: 'artistic', label: 'Artistic', previewSrc: AESTHETIC_STYLE_PREVIEWS.artistic },
  { value: 'stylized', label: 'Stylized', previewSrc: AESTHETIC_STYLE_PREVIEWS.stylized },
  { value: 'abstract', label: 'Abstract', previewSrc: AESTHETIC_STYLE_PREVIEWS.abstract },
  { value: 'minimalist', label: 'Minimalist', previewSrc: AESTHETIC_STYLE_PREVIEWS.minimalist },
];

const COMPOSITIONS: AestheticOption[] = [
  { value: 'centered', label: 'Centered', previewSrc: COMPOSITION_PREVIEWS.centered },
  { value: 'rule-of-thirds', label: 'Rule of Thirds', previewSrc: COMPOSITION_PREVIEWS['rule-of-thirds'] },
  { value: 'diagonal', label: 'Diagonal', previewSrc: COMPOSITION_PREVIEWS.diagonal },
  { value: 'symmetrical', label: 'Symmetrical', previewSrc: COMPOSITION_PREVIEWS.symmetrical },
  { value: 'asymmetrical', label: 'Asymmetrical', previewSrc: COMPOSITION_PREVIEWS.asymmetrical },
];

const COLOR_SCHEMES: AestheticOption[] = [
  { value: 'vibrant', label: 'Vibrant', previewSrc: COLOR_SCHEME_SWATCHES.vibrant, colorValues: COLOR_SCHEME_MAPPINGS.vibrant },
  { value: 'muted', label: 'Muted', previewSrc: COLOR_SCHEME_SWATCHES.muted, colorValues: COLOR_SCHEME_MAPPINGS.muted },
  { value: 'monochrome', label: 'Monochrome', previewSrc: COLOR_SCHEME_SWATCHES.monochrome, colorValues: COLOR_SCHEME_MAPPINGS.monochrome },
  { value: 'warm', label: 'Warm', previewSrc: COLOR_SCHEME_SWATCHES.warm, colorValues: COLOR_SCHEME_MAPPINGS.warm },
  { value: 'cool', label: 'Cool', previewSrc: COLOR_SCHEME_SWATCHES.cool, colorValues: COLOR_SCHEME_MAPPINGS.cool },
];

const MOOD_ATMOSPHERES: AestheticOption[] = [
  { value: 'neutral', label: 'Neutral', previewSrc: MOOD_ATMOSPHERE_PREVIEWS.neutral },
  { value: 'cheerful', label: 'Cheerful', previewSrc: MOOD_ATMOSPHERE_PREVIEWS.cheerful },
  { value: 'dramatic', label: 'Dramatic', previewSrc: MOOD_ATMOSPHERE_PREVIEWS.dramatic },
  { value: 'serene', label: 'Serene', previewSrc: MOOD_ATMOSPHERE_PREVIEWS.serene },
  { value: 'mysterious', label: 'Mysterious', previewSrc: MOOD_ATMOSPHERE_PREVIEWS.mysterious },
];

export const AestheticsSection: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<AestheticSectionType | null>(null);
  
  const config = useConfigStore(
    (state) => state.sceneConfig.aesthetics
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  const handleToggle = (section: AestheticSectionType): void => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  const handleStyleMediumSelect = (value: string): void => {
    updateSceneConfig('aesthetics.style_medium', value);
    setExpandedSection(null);
  };

  const handleAestheticStyleSelect = (value: string): void => {
    updateSceneConfig('aesthetics.aesthetic_style', value);
    setExpandedSection(null);
  };

  const handleCompositionSelect = (value: string): void => {
    updateSceneConfig('aesthetics.composition', value);
    setExpandedSection(null);
  };

  const handleMoodAtmosphereSelect = (value: string): void => {
    updateSceneConfig('aesthetics.mood_atmosphere', value);
    setExpandedSection(null);
  };

  const handleColorSchemeSelect = (value: string): void => {
    updateSceneConfig('aesthetics.color_scheme', value);
    applyColorScheme(value);
    setExpandedSection(null);
  };

  const handleRevertColorScheme = (): void => {
    revertColorScheme();
    updateSceneConfig('aesthetics.color_scheme', 'vibrant');
  };

  const hasPreviousColorAdjustments = getPreviousColorAdjustments() !== null;

  return (
    <div className="space-y-2 xs:space-y-3">
      <CollapsibleAestheticOption
        label="Style Medium"
        currentValue={config.style_medium}
        options={STYLE_MEDIUMS}
        isExpanded={expandedSection === 'style-medium'}
        onToggle={() => handleToggle('style-medium')}
        onSelect={handleStyleMediumSelect}
        renderPreview="image"
      >
        <PreviewGrid
          options={STYLE_MEDIUMS}
          onSelect={handleStyleMediumSelect}
          currentValue={config.style_medium}
        />
      </CollapsibleAestheticOption>

      <CollapsibleAestheticOption
        label="Aesthetic Style"
        currentValue={config.aesthetic_style}
        options={AESTHETIC_STYLES}
        isExpanded={expandedSection === 'aesthetic-style'}
        onToggle={() => handleToggle('aesthetic-style')}
        onSelect={handleAestheticStyleSelect}
        renderPreview="image"
      >
        <PreviewGrid
          options={AESTHETIC_STYLES}
          onSelect={handleAestheticStyleSelect}
          currentValue={config.aesthetic_style}
        />
      </CollapsibleAestheticOption>

      <CollapsibleAestheticOption
        label="Composition"
        currentValue={config.composition}
        options={COMPOSITIONS}
        isExpanded={expandedSection === 'composition'}
        onToggle={() => handleToggle('composition')}
        onSelect={handleCompositionSelect}
        renderPreview="image"
      >
        <PreviewGrid
          options={COMPOSITIONS}
          onSelect={handleCompositionSelect}
          currentValue={config.composition}
        />
      </CollapsibleAestheticOption>

      <CollapsibleAestheticOption
        label="Mood & Atmosphere"
        currentValue={config.mood_atmosphere}
        options={MOOD_ATMOSPHERES}
        isExpanded={expandedSection === 'mood-atmosphere'}
        onToggle={() => handleToggle('mood-atmosphere')}
        onSelect={handleMoodAtmosphereSelect}
        renderPreview="image"
      >
        <PreviewGrid
          options={MOOD_ATMOSPHERES}
          onSelect={handleMoodAtmosphereSelect}
          currentValue={config.mood_atmosphere}
        />
      </CollapsibleAestheticOption>

      <CollapsibleAestheticOption
        label="Color Scheme"
        currentValue={config.color_scheme}
        options={COLOR_SCHEMES}
        isExpanded={expandedSection === 'color-scheme'}
        onToggle={() => handleToggle('color-scheme')}
        onSelect={handleColorSchemeSelect}
        renderPreview="color-swatch"
      >
        <ColorSwatchGrid
          options={COLOR_SCHEMES}
          onSelect={handleColorSchemeSelect}
          currentValue={config.color_scheme}
        />
      </CollapsibleAestheticOption>

      {hasPreviousColorAdjustments && (
        <div className="mt-2">
          <Button
            onClick={handleRevertColorScheme}
            variant="outline"
            size="sm"
            className="w-full min-h-[44px] touch-manipulation text-xs xs:text-sm"
          >
            Revert Color Scheme
          </Button>
        </div>
      )}
    </div>
  );
};
