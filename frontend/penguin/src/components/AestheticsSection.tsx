import * as React from 'react';
import { useConfigStore } from '@/store/configStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STYLE_MEDIUMS = [
  { value: 'photograph', label: 'Photograph' },
  { value: 'painting', label: 'Painting' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'sketch', label: 'Sketch' },
  { value: '3d-render', label: '3D Render' },
] as const;

const AESTHETIC_STYLES = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'stylized', label: 'Stylized' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'minimalist', label: 'Minimalist' },
] as const;

const COMPOSITIONS = [
  { value: 'centered', label: 'Centered' },
  { value: 'rule-of-thirds', label: 'Rule of Thirds' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'symmetrical', label: 'Symmetrical' },
  { value: 'asymmetrical', label: 'Asymmetrical' },
] as const;

const COLOR_SCHEMES = [
  { value: 'vibrant', label: 'Vibrant' },
  { value: 'muted', label: 'Muted' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
] as const;

const MOOD_ATMOSPHERES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'cheerful', label: 'Cheerful' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'serene', label: 'Serene' },
  { value: 'mysterious', label: 'Mysterious' },
] as const;

export const AestheticsSection: React.FC = () => {
  const config = useConfigStore(
    (state) => state.sceneConfig.aesthetics
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">Style Medium</Label>
        <Select
          value={config.style_medium}
          onValueChange={(value) => 
            updateSceneConfig('aesthetics.style_medium', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLE_MEDIUMS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Aesthetic Style</Label>
        <Select
          value={config.aesthetic_style}
          onValueChange={(value) => 
            updateSceneConfig('aesthetics.aesthetic_style', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AESTHETIC_STYLES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Composition</Label>
        <Select
          value={config.composition}
          onValueChange={(value) => 
            updateSceneConfig('aesthetics.composition', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPOSITIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Color Scheme</Label>
        <Select
          value={config.color_scheme}
          onValueChange={(value) => 
            updateSceneConfig('aesthetics.color_scheme', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_SCHEMES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Mood & Atmosphere</Label>
        <Select
          value={config.mood_atmosphere}
          onValueChange={(value) => 
            updateSceneConfig('aesthetics.mood_atmosphere', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOOD_ATMOSPHERES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
