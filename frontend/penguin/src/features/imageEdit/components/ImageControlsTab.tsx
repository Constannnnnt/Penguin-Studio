import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { resetColorSchemeAndAdjustments } from '@/features/scene/lib/colorSchemeIntegration';
import { Label } from '@/shared/components/ui/label';
import { Slider } from '@/shared/components/ui/slider';
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ChevronDown, ChevronRight, Target, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-all group font-heading"
      >
        <span className="flex items-center gap-2">
          <div className="h-1 w-4 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors" />
          {title}
        </span>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="relative space-y-5 pl-2 border-l border-primary/10 ml-2 py-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const ImageControlsTab: React.FC = () => {
  const {
    brightness: globalBrightness,
    contrast: globalContrast,
    saturation: globalSaturation,
    rotation,
    flipHorizontal,
    flipVertical,
    hue: globalHue,
    blur: globalBlur,
    sharpen,
    exposure: globalExposure,
    highlights,
    shadows,
    temperature,
    tint,
    vibrance: globalVibrance,
    vignette,
    grain,
    setBrightness: setGlobalBrightness,
    setContrast: setGlobalContrast,
    setSaturation: setGlobalSaturation,
    setRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    setHue: setGlobalHue,
    setBlur: setGlobalBlur,
    setSharpen,
    setExposure: setGlobalExposure,
    setHighlights,
    setShadows,
    setTemperature,
    setTint,
    setVibrance: setGlobalVibrance,
    setVignette,
    setGrain,
  } = useImageEditStore();

  const { selectedMaskId, maskManipulation, applyImageEditToMask, results } = useSegmentationStore();

  // Get the selected mask details
  const selectedMask = selectedMaskId && results
    ? results.masks.find(m => m.mask_id === selectedMaskId)
    : null;

  // Get per-mask edits if a mask is selected
  const selectedMaskState = selectedMaskId ? maskManipulation.get(selectedMaskId) : null;
  const perMaskEdits = selectedMaskState?.transform.imageEdits;

  // Use per-mask values if a mask is selected, otherwise use global values
  const brightness = perMaskEdits?.brightness ?? globalBrightness;
  const contrast = perMaskEdits?.contrast ?? globalContrast;
  const saturation = perMaskEdits?.saturation ?? globalSaturation;
  const hue = perMaskEdits?.hue ?? globalHue;
  const blur = perMaskEdits?.blur ?? globalBlur;
  const exposure = perMaskEdits?.exposure ?? globalExposure;
  const vibrance = perMaskEdits?.vibrance ?? globalVibrance;

  // Wrapper functions that apply to selected mask or global
  const setBrightness = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { brightness: value });
    } else {
      setGlobalBrightness(value);
    }
  };

  const setContrast = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { contrast: value });
    } else {
      setGlobalContrast(value);
    }
  };

  const setSaturation = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { saturation: value });
    } else {
      setGlobalSaturation(value);
    }
  };

  const setHue = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { hue: value });
    } else {
      setGlobalHue(value);
    }
  };

  const setBlur = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { blur: value });
    } else {
      setGlobalBlur(value);
    }
  };

  const setExposure = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { exposure: value });
    } else {
      setGlobalExposure(value);
    }
  };

  const setVibrance = (value: number) => {
    if (selectedMaskId) {
      applyImageEditToMask(selectedMaskId, { vibrance: value });
    } else {
      setGlobalVibrance(value);
    }
  };

  const hasEdits = brightness !== 0 || contrast !== 0 || saturation !== 0 || rotation !== 0 ||
    flipHorizontal || flipVertical || hue !== 0 || blur !== 0 || sharpen !== 0 ||
    exposure !== 0 || highlights !== 0 || shadows !== 0 || temperature !== 0 ||
    tint !== 0 || vibrance !== 0 || vignette !== 0 || grain !== 0;

  const handleReset = () => {
    if (selectedMaskId) {
      // Reset the selected mask's transform
      const { resetMaskTransform } = useSegmentationStore.getState();
      resetMaskTransform(selectedMaskId);
    } else {
      // Reset global image edits and color scheme
      resetColorSchemeAndAdjustments();
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {selectedMask ? (
          <div className="industrial-panel safety-accent-border p-3">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 border border-primary/20 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/80 font-heading mb-0.5">
                  Component Logic
                </h4>
                <p className="text-[13px] font-black text-foreground truncate uppercase font-sans tracking-tight">
                  {selectedMask.promptText || selectedMask.label}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Local Modulation Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="industrial-panel p-4 border-dashed bg-background/20">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-muted/10 border border-border/20 text-muted-foreground/60">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80 font-heading mb-0.5">
                  Global Parameters
                </h4>
                <p className="text-[11px] font-bold text-muted-foreground leading-snug">
                  Standard adjustments apply to master composite. Select object for focal edit.
                </p>
              </div>
            </div>
          </div>
        )}

        <CollapsibleSection title="Basic Adjustments" defaultOpen={true}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="brightness-slider" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 cursor-help font-heading">
                    Brightness
                  </Label>
                </TooltipTrigger>
                <TooltipContent className="industrial-panel">
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    {selectedMask
                      ? `Modulate brightness for ${selectedMask.promptText || selectedMask.label}`
                      : 'Modulate master brightness'}
                  </p>
                </TooltipContent>
              </Tooltip>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-black text-primary border border-primary/5">{brightness}</span>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="contrast-slider" className="text-sm cursor-help">
                    Contrast
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust contrast for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust contrast for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="exposure-slider" className="text-sm cursor-help">
                    Exposure
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust exposure for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust exposure for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="saturation-slider" className="text-sm cursor-help">
                    Saturation
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust color saturation for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust color saturation for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="vibrance-slider" className="text-sm cursor-help">
                    Vibrance
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust vibrance for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust vibrance for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="hue-slider" className="text-sm cursor-help">
                    Hue
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust hue for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust hue for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="blur-slider" className="text-sm cursor-help">
                    Blur
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {selectedMask
                      ? `Adjust blur for ${selectedMask.promptText || selectedMask.label}`
                      : 'Adjust blur for the entire image'}
                  </p>
                </TooltipContent>
              </Tooltip>
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
          onClick={handleReset}
          disabled={!hasEdits}
          aria-label={selectedMaskId ? "Reset mask edits" : "Reset all image edits"}
        >
          Reset All
        </Button>
        {hasEdits && (
          <p className="text-xs text-center text-muted-foreground animate-in fade-in duration-200">
            Changes are applied in real-time
          </p>
        )}
      </div>
    </TooltipProvider>
  );
};
