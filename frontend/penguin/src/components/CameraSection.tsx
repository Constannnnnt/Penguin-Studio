import * as React from 'react';
import { useConfigStore } from '@/store/configStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

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
      <div className="space-y-3">
        <Label className="text-base font-medium">Camera Angle</Label>
        <Select
          value={config.camera_angle}
          onValueChange={(value) => 
            updateSceneConfig('photographic_characteristics.camera_angle', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAMERA_ANGLES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Lens Focal Length</Label>
        <Select
          value={config.lens_focal_length}
          onValueChange={(value) => 
            updateSceneConfig('photographic_characteristics.lens_focal_length', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FOCAL_LENGTHS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Depth of Field</Label>
        <div className="px-2">
          <Slider
            value={[config.depth_of_field]}
            onValueChange={([value]) => 
              updateSceneConfig('photographic_characteristics.depth_of_field', value)
            }
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Shallow</span>
          <span className="font-medium">{config.depth_of_field}</span>
          <span>Deep</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Focus</Label>
        <div className="px-2">
          <Slider
            value={[config.focus]}
            onValueChange={([value]) => 
              updateSceneConfig('photographic_characteristics.focus', value)
            }
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Soft</span>
          <span className="font-medium">{config.focus}</span>
          <span>Sharp</span>
        </div>
      </div>
    </div>
  );
};
