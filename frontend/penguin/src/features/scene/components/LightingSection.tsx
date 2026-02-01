import * as React from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';


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
      <div className="industrial-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
            Lighting Conditions
          </Label>
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
        </div>
        <Select
          value={config.conditions}
          onValueChange={(value: string) =>
            updateSceneConfig('lighting.conditions', value)
          }
        >
          <SelectTrigger className="h-9 border-primary/20 bg-background/20 font-mono text-[11px] focus:ring-0 focus:border-primary/50 transition-colors uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="industrial-panel border-primary/20">
            {LIGHTING_CONDITIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>



      <div className="industrial-panel p-4">
        <LightingDirectionControl
          value={config.direction}
          onChange={(newDirection) => {
            updateSceneConfig('lighting.direction', newDirection);
          }}
        />
      </div>

      <div className="industrial-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
            Shadow Intensity
          </Label>
          <span className="text-[10px] font-mono text-primary font-bold">{config.shadows}/5</span>
        </div>

        <div className="px-1 pt-2 pb-1 relative">
          {/* Tic marks */}
          <div className="absolute top-1/2 left-0 w-full flex justify-between px-1 pointer-events-none opacity-20 transform -translate-y-1/2">
            {[0, 1, 2, 3, 4, 5].map((tick) => (
              <div key={tick} className="h-2 w-px bg-foreground" />
            ))}
          </div>

          <PerformantSlider
            value={config.shadows}
            onValueChange={(value) =>
              updateSceneConfig('lighting.shadows', value)
            }
            max={5}
            min={0}
            step={1}
            className="w-full relative z-10 cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>Soft</span>
          <span>Balanced</span>
          <span>Hard</span>
        </div>
      </div>
    </div >
  );
};
