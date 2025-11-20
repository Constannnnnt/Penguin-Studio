import { useImageEditStore } from '@/store/imageEditStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';

export const ImageControlsTab: React.FC = () => {
  const {
    brightness,
    contrast,
    saturation,
    rotation,
    flipHorizontal,
    flipVertical,
    setBrightness,
    setContrast,
    setSaturation,
    setRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    resetImageEdits,
  } = useImageEditStore();

  const hasEdits = brightness !== 0 || contrast !== 0 || saturation !== 0 || rotation !== 0 || flipHorizontal || flipVertical;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="brightness-slider" className="text-sm font-medium">Brightness</Label>
          <span className="text-sm font-medium text-muted-foreground tabular-nums transition-all duration-150">{brightness}</span>
        </div>
        <Slider
          id="brightness-slider"
          value={[brightness]}
          onValueChange={([value]) => setBrightness(value)}
          min={-100}
          max={100}
          step={1}
          className="cursor-pointer transition-all duration-150"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="contrast-slider" className="text-sm font-medium">Contrast</Label>
          <span className="text-sm font-medium text-muted-foreground tabular-nums transition-all duration-150">{contrast}</span>
        </div>
        <Slider
          id="contrast-slider"
          value={[contrast]}
          onValueChange={([value]) => setContrast(value)}
          min={-100}
          max={100}
          step={1}
          className="cursor-pointer transition-all duration-150"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="saturation-slider" className="text-sm font-medium">Saturation</Label>
          <span className="text-sm font-medium text-muted-foreground tabular-nums transition-all duration-150">{saturation}</span>
        </div>
        <Slider
          id="saturation-slider"
          value={[saturation]}
          onValueChange={([value]) => setSaturation(value)}
          min={-100}
          max={100}
          step={1}
          className="cursor-pointer transition-all duration-150"
        />
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Rotation</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((rotation - 90 + 360) % 360)}
            aria-label="Rotate counter-clockwise"
            className="h-9 transition-all duration-150 hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((rotation + 90) % 360)}
            aria-label="Rotate clockwise"
            className="h-9 transition-all duration-150 hover:scale-105 active:scale-95"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <span className="flex items-center text-sm font-medium text-muted-foreground ml-auto tabular-nums transition-all duration-150">
            {rotation}°
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Flip</Label>
        <div className="flex gap-2">
          <Button
            variant={flipHorizontal ? 'default' : 'outline'}
            size="sm"
            onClick={toggleFlipHorizontal}
            aria-label="Flip horizontal"
            aria-pressed={flipHorizontal}
            className="flex-1 h-9 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FlipHorizontal className="h-4 w-4 mr-2" />
            Horizontal
          </Button>
          <Button
            variant={flipVertical ? 'default' : 'outline'}
            size="sm"
            onClick={toggleFlipVertical}
            aria-label="Flip vertical"
            aria-pressed={flipVertical}
            className="flex-1 h-9 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FlipVertical className="h-4 w-4 mr-2" />
            Vertical
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Crop</Label>
        <div className="text-sm text-muted-foreground">
          Crop functionality coming soon
        </div>
      </div>

      <Separator className="my-4" />

      <Button
        variant="outline"
        className="w-full h-9 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
        onClick={resetImageEdits}
        disabled={!hasEdits}
        aria-label="Reset all image edits"
      >
        Reset All
      </Button>
      {hasEdits && (
        <p className="text-xs text-center text-muted-foreground animate-in fade-in duration-200">
          Changes are applied in real-time
        </p>
      )}
    </div>
  );
};
