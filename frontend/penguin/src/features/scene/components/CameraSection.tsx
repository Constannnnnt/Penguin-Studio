import * as React from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { CameraGuideViewport } from '@/shared/components/camera/CameraGuideViewport';
import { Camera } from 'lucide-react';

const CAMERA_ANGLES = [
  { value: 'eye-level', label: 'Eye Level', hint: 'Balanced, natural perspective.' },
  { value: 'overhead', label: 'Overhead', hint: 'Top-down framing for layout and environment.' },
  { value: 'low-angle', label: 'Low Angle', hint: 'Looks up at subject for stronger presence.' },
  { value: 'high-angle', label: 'High Angle', hint: 'Looks down at subject for a lighter, distant feel.' },
] as const;

const FOCAL_LENGTHS = [
  { value: 'wide-angle', label: 'Wide Angle', hint: 'Wider field of view and stronger perspective.' },
  { value: 'standard', label: 'Standard', hint: 'Natural, balanced framing.' },
  { value: 'portrait', label: 'Portrait / Tele', hint: 'Tighter subject framing with flatter perspective.' },
  { value: 'macro', label: 'Macro', hint: 'Extreme close-up detail.' },
] as const;

type CameraAngleValue = (typeof CAMERA_ANGLES)[number]['value'];
type FocalLengthValue = (typeof FOCAL_LENGTHS)[number]['value'];

const normalizeCameraAngle = (value: string): CameraAngleValue | null => {
  const token = value.trim().toLowerCase();
  if (!token) return 'eye-level';
  if (token === 'eye-level' || token === 'eye level') return 'eye-level';
  if (token === 'low-angle' || token === 'low angle' || token.includes('worm-eye')) return 'low-angle';
  if (token === 'high-angle' || token === 'high angle') return 'high-angle';
  if (
    token === 'overhead' ||
    token.includes('bird-eye') ||
    token.includes("bird's-eye") ||
    token.includes('top-down')
  ) {
    return 'overhead';
  }
  return null;
};

const normalizeLens = (value: string): FocalLengthValue | null => {
  const token = value.trim().toLowerCase();
  if (!token) return 'standard';
  if (token.includes('wide')) return 'wide-angle';
  if (token.includes('macro')) return 'macro';
  if (token.includes('portrait') || token.includes('telephoto')) return 'portrait';
  if (token.includes('standard') || token.includes('50mm')) return 'standard';
  return null;
};

export const CameraSection: React.FC = () => {
  const config = useConfigStore(
    (state) => state.sceneConfig.photographic_characteristics
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  const normalizedCameraAngle = normalizeCameraAngle(String(config.camera_angle || ''));
  const normalizedLensFocalLength = normalizeLens(String(config.lens_focal_length || ''));
  const customCameraValue = String(config.camera_angle || '').trim();
  const customLensValue = String(config.lens_focal_length || '').trim();
  const cameraSelectValue =
    normalizedCameraAngle || (customCameraValue ? `custom:${customCameraValue}` : 'eye-level');
  const lensSelectValue =
    normalizedLensFocalLength || (customLensValue ? `custom:${customLensValue}` : 'standard');

  const cameraHint =
    CAMERA_ANGLES.find((option) => option.value === normalizedCameraAngle)?.hint ||
    'Custom perspective from the prompt.';
  const lensHint =
    FOCAL_LENGTHS.find((option) => option.value === normalizedLensFocalLength)?.hint ||
    'Custom focal behavior from the prompt.';

  return (
    <div className="space-y-6">
      <CameraGuideViewport
        cameraAngle={config.camera_angle}
        lensFocalLength={config.lens_focal_length}
        depthOfField={config.depth_of_field}
        focus={config.focus}
      />

      <div className="space-y-4">
        <div className="industrial-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
              Camera Angle
            </Label>
            <Camera className="h-3 w-3 text-primary/40" />
          </div>
          <Select
            value={cameraSelectValue}
            onValueChange={(value) => {
              if (value.startsWith('custom:')) return;
              updateSceneConfig('photographic_characteristics.camera_angle', value);
            }}
          >
            <SelectTrigger className="h-9 border-primary/20 bg-background/20 font-mono text-[11px] focus:ring-0 focus:border-primary/50 transition-colors uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="industrial-panel border-primary/20">
              {!normalizedCameraAngle && customCameraValue ? (
                <SelectItem value={`custom:${customCameraValue}`} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  Custom ({customCameraValue})
                </SelectItem>
              ) : null}
              {CAMERA_ANGLES.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
            {cameraHint}
          </p>
        </div>

        <div className="industrial-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
              Lens Focal Length
            </Label>
            <div className="h-px w-8 bg-primary/20" />
          </div>
          <Select
            value={lensSelectValue}
            onValueChange={(value) => {
              if (value.startsWith('custom:')) return;
              updateSceneConfig('photographic_characteristics.lens_focal_length', value);
            }}
          >
            <SelectTrigger className="h-9 border-primary/20 bg-background/20 font-mono text-[11px] focus:ring-0 focus:border-primary/50 transition-colors uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="industrial-panel border-primary/20">
              {!normalizedLensFocalLength && customLensValue ? (
                <SelectItem value={`custom:${customLensValue}`} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  Custom ({customLensValue})
                </SelectItem>
              ) : null}
              {FOCAL_LENGTHS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-[11px] font-mono focus:bg-primary/10 focus:text-primary uppercase tracking-wider cursor-pointer">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
            {lensHint}
          </p>
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
