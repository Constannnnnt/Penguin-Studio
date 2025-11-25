import { useImageEditStore } from '@/store/imageEditStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-semibold hover:text-primary transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="space-y-4 pl-1">{children}</div>}
    </div>
  );
};

export const ImageControlsTab: React.FC = () => {
  const {
    brightness,
    contrast,
    saturation,
    rotation,
    flipHorizontal,
    flipVertical,
    hue,
    blur,
    sharpen,
    exposure,
    highlights,
    shadows,
    temperature,
    tint,
    vibrance,
    vignette,
    grain,
    setBrightness,
    setContrast,
    setSaturation,
    setRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    setHue,
    setBlur,
    setSharpen,
    setExposure,
    setHighlights,
    setShadows,
    setTemperature,
    setTint,
    setVibrance,
    setVignette,
    setGrain,
    resetImageEdits,
  } = useImageEditStore();

  const hasEdits = brightness !== 0 || contrast !== 0 || saturation !== 0 || rotation !== 0 || 
    flipHorizontal || flipVertical || hue !== 0 || blur !== 0 || sharpen !== 0 || 
    exposure !== 0 || highlights !== 0 || shadows !== 0 || temperature !== 0 || 
    tint !== 0 || vibrance !== 0 || vignette !== 0 || grain !== 0;

  return (
    <div className="space-y-5">
      <CollapsibleSection title="Basic Adjustments" defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="brightness-slider" className="text-sm">Brightness</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{brightness}</span>
          </div>
          <Slider
            id="brightness-slider"
            value={[brightness]}
            onValueChange={([value]) => setBrightness(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="contrast-slider" className="text-sm">Contrast</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{contrast}</span>
          </div>
          <Slider
            id="contrast-slider"
            value={[contrast]}
            onValueChange={([value]) => setContrast(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="exposure-slider" className="text-sm">Exposure</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{exposure}</span>
          </div>
          <Slider
            id="exposure-slider"
            value={[exposure]}
            onValueChange={([value]) => setExposure(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="highlights-slider" className="text-sm">Highlights</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{highlights}</span>
          </div>
          <Slider
            id="highlights-slider"
            value={[highlights]}
            onValueChange={([value]) => setHighlights(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="shadows-slider" className="text-sm">Shadows</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{shadows}</span>
          </div>
          <Slider
            id="shadows-slider"
            value={[shadows]}
            onValueChange={([value]) => setShadows(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>
      </CollapsibleSection>

      <Separator />

      <CollapsibleSection title="Color Adjustments" defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="saturation-slider" className="text-sm">Saturation</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{saturation}</span>
          </div>
          <Slider
            id="saturation-slider"
            value={[saturation]}
            onValueChange={([value]) => setSaturation(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="vibrance-slider" className="text-sm">Vibrance</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{vibrance}</span>
          </div>
          <Slider
            id="vibrance-slider"
            value={[vibrance]}
            onValueChange={([value]) => setVibrance(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hue-slider" className="text-sm">Hue</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{hue}°</span>
          </div>
          <Slider
            id="hue-slider"
            value={[hue]}
            onValueChange={([value]) => setHue(value)}
            min={-180}
            max={180}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature-slider" className="text-sm">Temperature</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{temperature}</span>
          </div>
          <Slider
            id="temperature-slider"
            value={[temperature]}
            onValueChange={([value]) => setTemperature(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="tint-slider" className="text-sm">Tint</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{tint}</span>
          </div>
          <Slider
            id="tint-slider"
            value={[tint]}
            onValueChange={([value]) => setTint(value)}
            min={-100}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>
      </CollapsibleSection>

      <Separator />

      <CollapsibleSection title="Detail & Effects" defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sharpen-slider" className="text-sm">Sharpen</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{sharpen}</span>
          </div>
          <Slider
            id="sharpen-slider"
            value={[sharpen]}
            onValueChange={([value]) => setSharpen(value)}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="blur-slider" className="text-sm">Blur</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{blur}</span>
          </div>
          <Slider
            id="blur-slider"
            value={[blur]}
            onValueChange={([value]) => setBlur(value)}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="vignette-slider" className="text-sm">Vignette</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{vignette}</span>
          </div>
          <Slider
            id="vignette-slider"
            value={[vignette]}
            onValueChange={([value]) => setVignette(value)}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="grain-slider" className="text-sm">Grain</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{grain}</span>
          </div>
          <Slider
            id="grain-slider"
            value={[grain]}
            onValueChange={([value]) => setGrain(value)}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>
      </CollapsibleSection>

      <Separator />

      <CollapsibleSection title="Transform" defaultOpen={true}>
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
            <span className="flex items-center text-sm font-medium text-muted-foreground ml-auto tabular-nums">
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
      </CollapsibleSection>

      <Separator />

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
