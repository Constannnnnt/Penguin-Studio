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
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Selected Object
                </p>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                  {selectedMask.promptText || selectedMask.label}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All adjustments apply to this object only
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 border border-muted rounded-md">
            <div className="flex items-start gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-1">
                  Global Image Edits
                </p>
                <p className="text-xs text-muted-foreground">
                  Select an object to edit it individually, or adjust the entire image
                </p>
              </div>
            </div>
          </div>
        )}
      
      <CollapsibleSection title="Basic Adjustments" defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label htmlFor="brightness-slider" className="text-sm cursor-help">
                  Brightness
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {selectedMask 
                    ? `Adjust brightness for ${selectedMask.promptText || selectedMask.label}` 
                    : 'Adjust brightness for the entire image'}
                </p>
              </TooltipContent>
            </Tooltip>
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
