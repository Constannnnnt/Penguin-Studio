import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { useDebouncedCallback } from '@/shared/lib/performance';
import { ASPECT_RATIO_OPTIONS } from '@/core/types';
import { cn } from '@/shared/lib/utils';

const MIN_RATIO = 1;
const MAX_RATIO = 32;
const PREVIEW_BOX_SIZE = 32;

export const BackgroundSection: React.FC = () => {
  const backgroundSetting = useConfigStore(
    (state) => state.sceneConfig.background_setting
  );
  const aspectRatio = useConfigStore((state) => state.sceneConfig.aspect_ratio);
  const updateSceneConfig = useConfigStore((state) => state.updateSceneConfig);

  const [localValue, setLocalValue] = React.useState(backgroundSetting);
  const [customWidth, setCustomWidth] = useState('1');
  const [customHeight, setCustomHeight] = useState('1');
  const isInitialMount = useRef(true);

  const debouncedUpdate = useDebouncedCallback(
    (value: string) => {
      updateSceneConfig('background_setting', value);
    },
    500,
    [updateSceneConfig]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setLocalValue(backgroundSetting);
    }
  }, [backgroundSetting]);

  useEffect(() => {
    if (!isInitialMount.current && localValue !== backgroundSetting) {
      debouncedUpdate(localValue);
    }
  }, [localValue, backgroundSetting, debouncedUpdate]);

  // Check if current ratio is a preset or custom
  const isCustomSelected = useMemo(() => {
    return !ASPECT_RATIO_OPTIONS.slice(0, -1).some(
      (opt) => opt.value === aspectRatio
    );
  }, [aspectRatio]);

  // Parse current custom ratio for display
  useEffect(() => {
    if (isCustomSelected && aspectRatio) {
      const parts = aspectRatio.split(':');
      if (parts.length === 2) {
        setCustomWidth(parts[0]);
        setCustomHeight(parts[1]);
      }
    }
  }, [isCustomSelected, aspectRatio]);

  const handleAspectRatioChange = (value: string): void => {
    updateSceneConfig('aspect_ratio', value);
  };

  const clampValue = (val: string): number => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return MIN_RATIO;
    return Math.max(MIN_RATIO, Math.min(MAX_RATIO, num));
  };

  const handleCustomWidthChange = (val: string): void => {
    setCustomWidth(val);
  };

  const handleCustomHeightChange = (val: string): void => {
    setCustomHeight(val);
  };

  const applyCustomRatio = (): void => {
    const w = clampValue(customWidth);
    const h = clampValue(customHeight);
    setCustomWidth(w.toString());
    setCustomHeight(h.toString());
    updateSceneConfig('aspect_ratio', `${w}:${h}`);
  };

  // Calculate preview dimensions for custom ratio
  const customPreviewDimensions = useMemo(() => {
    const w = clampValue(customWidth);
    const h = clampValue(customHeight);
    const maxDim = Math.max(w, h);
    const scale = PREVIEW_BOX_SIZE / maxDim;
    return {
      width: Math.round(w * scale),
      height: Math.round(h * scale),
    };
  }, [customWidth, customHeight]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="background-setting" className="text-base font-medium">
          Background Setting
        </Label>
        <Textarea
          id="background-setting"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Describe the background environment..."
          rows={10}
          className="mt-3 resize-none"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Image Dimension</Label>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {ASPECT_RATIO_OPTIONS.slice(0, -1).map((option) => (
            <button
              key={option.value}
              onClick={() => handleAspectRatioChange(option.value)}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-md border transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                aspectRatio === option.value
                  ? 'border-primary bg-accent'
                  : 'border-border bg-background'
              )}
            >
              <div
                className="flex items-center justify-center mb-1"
                style={{ width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE }}
              >
                <div
                  className={cn(
                    'border-2 rounded-sm',
                    aspectRatio === option.value
                      ? 'border-primary'
                      : 'border-muted-foreground/50'
                  )}
                  style={{
                    width: `${Math.round((option.width / Math.max(option.width, option.height)) * PREVIEW_BOX_SIZE)}px`,
                    height: `${Math.round((option.height / Math.max(option.width, option.height)) * PREVIEW_BOX_SIZE)}px`,
                  }}
                />
              </div>
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}

          {/* Custom ratio option - same style as presets */}
          <div
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-md border transition-all',
              isCustomSelected
                ? 'border-primary bg-accent'
                : 'border-border bg-background'
            )}
          >
            <div
              className="flex items-center justify-center mb-1"
              style={{ width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE }}
            >
              <div
                className={cn(
                  'border-2 rounded-sm transition-all',
                  isCustomSelected
                    ? 'border-primary'
                    : 'border-muted-foreground/50'
                )}
                style={{
                  width: `${customPreviewDimensions.width}px`,
                  height: `${customPreviewDimensions.height}px`,
                }}
              />
            </div>
            <div className="flex items-center gap-0.5">
              <Input
                type="number"
                min={MIN_RATIO}
                max={MAX_RATIO}
                value={customWidth}
                onChange={(e) => handleCustomWidthChange(e.target.value)}
                onBlur={applyCustomRatio}
                onKeyDown={(e) => e.key === 'Enter' && applyCustomRatio()}
                className="w-8 h-5 text-xs text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs font-medium">:</span>
              <Input
                type="number"
                min={MIN_RATIO}
                max={MAX_RATIO}
                value={customHeight}
                onChange={(e) => handleCustomHeightChange(e.target.value)}
                onBlur={applyCustomRatio}
                onKeyDown={(e) => e.key === 'Enter' && applyCustomRatio()}
                className="w-8 h-5 text-xs text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
