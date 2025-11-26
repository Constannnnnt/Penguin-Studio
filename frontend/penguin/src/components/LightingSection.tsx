import * as React from 'react';
import { useConfigStore } from '@/store/configStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LightingDirectionControl } from '@/components/LightingDirectionControl';


const LIGHTING_CONDITIONS = [
  { value: 'natural', label: 'Natural Light' },
  { value: 'artificial', label: 'Artificial Light' },
  { value: 'mixed', label: 'Mixed Lighting' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'blue-hour', label: 'Blue Hour' },
  { value: 'studio', label: 'Studio Lighting' },
] as const;

export const LightingSection: React.FC = () => {
  const config = useConfigStore(
    (state) => state.sceneConfig.lighting
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">Lighting Conditions</Label>
        <Select
          value={config.conditions}
          onValueChange={(value: string) => 
            updateSceneConfig('lighting.conditions', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIGHTING_CONDITIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <LightingDirectionControl
          value={config.direction}
          onChange={(newDirection) => {
            updateSceneConfig('lighting.direction', newDirection);
          }}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Shadow Intensity</Label>
        <div className="px-2">
          <Slider
            value={[config.shadows]}
            onValueChange={([value]) => 
              updateSceneConfig('lighting.shadows', value)
            }
            max={5}
            min={0}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>None</span>
          <span className="font-medium">{config.shadows}</span>
          <span>Dramatic</span>
        </div>
      </div>
    </div>
  );
};
