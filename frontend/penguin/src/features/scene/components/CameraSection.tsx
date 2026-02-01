import * as React from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { Camera } from 'lucide-react';

const CAMERA_ANGLES = [
  { value: 'eye-level', label: 'Eye Level' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
  { value: 'bird-eye', label: 'Bird\'s Eye' },
  { value: 'worm-eye', label: 'Worm\'s Eye' },
] as const;

const FOCAL_LENGTHS = [
  { value: 'wide', label: 'Wide (24mm)' },
  { value: 'standard', label: 'Standard (50mm)' },
  { value: 'telephoto', label: 'Telephoto (85mm)' },
  { value: 'super-telephoto', label: 'Super Telephoto (200mm+)' },
] as const;

export const CameraSection: React.FC = () => {
  const config = useConfigStore(
    (state) => state.sceneConfig.photographic_characteristics
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="industrial-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
              Camera Angle
            </Label>
            <Camera className="h-3 w-3 text-primary/40" />
          </div>
          <Select
            value={config.camera_angle}
            onValueChange={(value) =>
              updateSceneConfig('photographic_characteristics.camera_angle', value)
            }
          >
            <SelectTrigger className="h-9 border-primary/20 bg-background/20 font-mono text-[11px] focus:ring-0 focus:border-primary/50 transition-colors uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="industrial-panel border-primary/20">
              {CAMERA_ANGLES.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="industrial-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
              Lens Focal Length
            </Label>
            <div className="h-px w-8 bg-primary/20" />
          </div>
          <Select
            value={config.lens_focal_length}
            onValueChange={(value) =>
              updateSceneConfig('photographic_characteristics.lens_focal_length', value)
            }
          >
            <SelectTrigger className="h-9 border-primary/20 bg-background/20 font-mono text-[11px] focus:ring-0 focus:border-primary/50 transition-colors uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="industrial-panel border-primary/20">
              {FOCAL_LENGTHS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="industrial-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
            Depth of Field
          </Label>
          <span className="text-[10px] font-mono text-primary font-bold">{config.depth_of_field}</span>
        </div>

        <div className="px-1 pt-2 pb-1 relative">
          <PerformantSlider
            value={config.depth_of_field}
            onValueChange={(value) =>
              updateSceneConfig('photographic_characteristics.depth_of_field', value)
            }
            max={100}
            min={0}
            step={1}
            className="w-full relative z-10 cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>Shallow</span>
          <span>Balanced</span>
          <span>Deep</span>
        </div>
      </div>

      <div className="industrial-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
            Focus
          </Label>
          <span className="text-[10px] font-mono text-primary font-bold">{config.focus}</span>
        </div>

        <div className="px-1 pt-2 pb-1 relative">
          <PerformantSlider
            value={config.focus}
            onValueChange={(value) =>
              updateSceneConfig('photographic_characteristics.focus', value)
            }
            max={100}
            min={0}
            step={1}
            className="w-full relative z-10 cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>Soft</span>
          <span>Balanced</span>
          <span>Sharp</span>
        </div>
      </div>
    </div>
  );
};
