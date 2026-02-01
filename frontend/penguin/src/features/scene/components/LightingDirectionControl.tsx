import * as React from 'react';
import { Flashlight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { LightingDirectionValue } from '@/core/types';

export interface LightingDirectionControlProps {
  value: LightingDirectionValue;
  onChange: (value: LightingDirectionValue) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export const LightingDirectionControl = React.memo<LightingDirectionControlProps>(({
  value,
  onChange,
  className,
  disabled = false,
  compact = false,
}) => {
  const controlId = React.useId();
  const labelId = `${controlId}-label`;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const flashlightRef = React.useRef<HTMLDivElement>(null);
  const containerRectRef = React.useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  // Refs for stable access in event handlers
  const valueRef = React.useRef<LightingDirectionValue>(value);
  const commitTimeoutRef = React.useRef<NodeJS.Timeout>();

  const [localValue, setLocalValue] = React.useState<LightingDirectionValue>(value);

  const [isDragging, setIsDragging] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [rotationStart, setRotationStart] = React.useState<{
    angle: number;
    rotation: number;
    tilt: number;
  } | null>(null);

  // Sync local value with prop value when not dragging
  // Moved this AFTER state declarations to avoid ReferenceError
  React.useEffect(() => {
    if (!isDragging && !isRotating) {
      setLocalValue(value);
      valueRef.current = value;
    }
  }, [value, isDragging, isRotating]);

  // Ensure values are within bounds
  const clampValue = React.useCallback((val: LightingDirectionValue): LightingDirectionValue => ({
    x: Math.max(0, Math.min(100, val.x)),
    y: Math.max(0, Math.min(100, val.y)),
    rotation: ((val.rotation % 360) + 360) % 360,
    tilt: Math.max(-90, Math.min(90, val.tilt)),
  }), []);

  const clampedValue = React.useMemo((): LightingDirectionValue => clampValue(localValue), [localValue, clampValue]);

  // Update valueRef whenever clampedValue changes
  React.useEffect(() => {
    valueRef.current = clampedValue;
  }, [clampedValue]);

  // Debounced commit for wheel/scroll
  const scheduleCommit = React.useCallback((newValue: LightingDirectionValue) => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    commitTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 200);
  }, [onChange]);

  // Cleanup timeout
  React.useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
  }, []);

  /**
   * Convert percentage position to pixel coordinates within container
   */
  const getPercentPosition = React.useCallback((pixelX: number, pixelY: number): { x: number; y: number } => {
    const rect = containerRectRef.current ?? containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    // Update ref if it wasn't set (e.g. first move)
    if (!containerRectRef.current) {
      const { width, height, left, top } = rect;
      containerRectRef.current = { left, top, width, height };
    }

    const localX = pixelX - rect.left;
    const localY = pixelY - rect.top;

    const percentX = Math.max(0, Math.min(100, (localX / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (localY / rect.height) * 100));

    return { x: percentX, y: percentY };
  }, []);

  /**
   * Calculate angle from center of flashlight to mouse position
   */
  const getAngleFromCenter = React.useCallback((clientX: number, clientY: number): number => {
    if (!flashlightRef.current) return 0;

    const flashlightRect = flashlightRef.current.getBoundingClientRect();
    const centerX = flashlightRect.left + flashlightRect.width / 2;
    const centerY = flashlightRect.top + flashlightRect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  }, []);

  /**
   * Handle mouse down on flashlight for dragging
   */
  const handlePointerDown = React.useCallback((event: React.PointerEvent): void => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    if (!containerRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = containerRef.current.getBoundingClientRect();
    containerRectRef.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x: startX, y: startY }); // Not actually used in calculation logic but keeps state valid

    flashlightRef.current?.focus();
  }, [disabled]);

  /**
   * Handle mouse down on rotation handle
   */
  const handleRotationPointerDown = React.useCallback((event: React.PointerEvent): void => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    const angle = getAngleFromCenter(event.clientX, event.clientY);

    setIsRotating(true);
    // Use ref for current values to avoid dependency
    setRotationStart({
      angle,
      rotation: valueRef.current.rotation,
      tilt: valueRef.current.tilt,
    });
  }, [disabled, getAngleFromCenter]);

  /**
   * Handle mouse move during drag
   */
  const handlePointerMove = React.useCallback((event: PointerEvent): void => {
    if (!containerRef.current) return;

    if (isDragging) {
      // Logic for dragging position
      // We don't necessarily need dragStart.x/y if we just map mouse to % directly
      // But we kept it in state.
      // Re-capture rect if needed (e.g. if we want to support scroll? No, stick to cached)
      // Actually, if we want robust dragging, using ClientX/Y with Cached Rect is standard for "sticky" handle.

      const { x: percentX, y: percentY } = getPercentPosition(event.clientX, event.clientY);

      setLocalValue(prev => clampValue({
        ...prev,
        x: percentX,
        y: percentY,
      }));
    } else if (isRotating && rotationStart) {
      const currentAngle = getAngleFromCenter(event.clientX, event.clientY);
      const angleDelta = currentAngle - rotationStart.angle;

      const newRotation = ((rotationStart.rotation + angleDelta) % 360 + 360) % 360;

      // Calculate tilt based on distance
      let newTilt = valueRef.current.tilt; // Default to current
      if (flashlightRef.current) {
        const flashlightRect = flashlightRef.current.getBoundingClientRect();
        const centerX = flashlightRect.left + flashlightRect.width / 2;
        const centerY = flashlightRect.top + flashlightRect.height / 2;

        const distance = Math.sqrt(
          Math.pow(event.clientX - centerX, 2) +
          Math.pow(event.clientY - centerY, 2)
        );

        const maxDistance = 100;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        newTilt = (normalizedDistance - 0.5) * 180;
      }

      setLocalValue(prev => clampValue({
        ...prev,
        rotation: newRotation,
        tilt: newTilt,
      }));
    }
  }, [isDragging, isRotating, rotationStart, getPercentPosition, getAngleFromCenter, clampValue]);

  /**
   * Handle mouse up to end drag/rotation
   */
  const handlePointerUp = React.useCallback((): void => {
    if (isDragging || isRotating) {
      // Commit the change using fresh ref
      onChange(valueRef.current);
    }

    setIsDragging(false);
    setIsRotating(false);
    setDragStart(null);
    setRotationStart(null);
    // Clear cached rect
    containerRectRef.current = null;
  }, [isDragging, isRotating, onChange]);

  /**
   * Handle touch events for mobile support
   */
  // Wheel to push/pull light (maps to tilt)
  const handleWheel = React.useCallback((event: WheelEvent) => {
    if (disabled) return;
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -5;

    setLocalValue(prev => {
      const nextTilt = Math.max(-90, Math.min(90, prev.tilt + delta));
      const newValue = clampValue({
        ...prev,
        tilt: nextTilt,
      });
      // Schedule commit only if value changed
      if (newValue.tilt !== prev.tilt) {
        scheduleCommit(newValue);
      }
      return newValue;
    });
  }, [disabled, scheduleCommit, clampValue]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent): void => {
    if (disabled) return;

    // Use current value from ref to avoid closure staleness if this handler isn't recreated often
    // (though dependencies below ensure it is created when clampedValue changes? No, let's use functional update or ref)
    // Actually, best to use functional update logic to be safe, BUT we need the RESULT to commit.
    // So let's use valueRef.current as base.

    let baseValue = valueRef.current;
    let newValue = { ...baseValue };
    let handled = true;
    const step = event.shiftKey ? 10 : 1;

    switch (event.key) {
      case 'ArrowRight':
        newValue.x = Math.min(100, baseValue.x + step);
        break;
      case 'ArrowLeft':
        newValue.x = Math.max(0, baseValue.x - step);
        break;
      case 'ArrowUp':
        newValue.y = Math.max(0, baseValue.y - step);
        break;
      case 'ArrowDown':
        newValue.y = Math.min(100, baseValue.y + step);
        break;
      case 'r':
      case 'R':
        newValue.rotation = ((baseValue.rotation + (event.shiftKey ? -15 : 15)) % 360 + 360) % 360;
        break;
      case 't':
      case 'T':
        newValue.tilt = Math.max(-90, Math.min(90, baseValue.tilt + (event.shiftKey ? -15 : 15)));
        break;
      case 'Home':
        newValue = { x: 50, y: 50, rotation: 0, tilt: 0 };
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
      const clamped = clampValue(newValue);
      setLocalValue(clamped);
      onChange(clamped); // Commit immediately for keys
    }
  }, [onChange, disabled, clampValue]);

  /**
   * Set up global mouse/touch event listeners during drag
   */
  React.useEffect(() => {
    if (isDragging || isRotating) {
      const onMove = (e: PointerEvent) => handlePointerMove(e);
      const onUp = () => handlePointerUp();
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);

      return () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };
    }
  }, [isDragging, isRotating, handlePointerMove, handlePointerUp]);

  // Non-passive wheel listener to allow preventDefault
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Calculate pixel position for potential future use
  // const pixelPosition = getPixelPosition(clampedValue.x, clampedValue.y);

  const depthScale = React.useMemo(() => {
    const base = 1 + (clampedValue.tilt / 120);
    return Math.max(0.75, Math.min(1.35, base));
  }, [clampedValue.tilt]);

  const directionSummary = React.useMemo(() => {
    const horiz = clampedValue.x < 33 ? 'left-sourced' : clampedValue.x > 67 ? 'right-sourced' : 'centered';
    const depth = clampedValue.tilt > 5 ? 'forward' : clampedValue.tilt < -5 ? 'back' : 'mid';
    const angle = Math.round(clampedValue.rotation);
    const pitch = clampedValue.y < 33 ? 'high' : clampedValue.y > 67 ? 'low' : 'eye-level';
    const depthLabel = depth === 'forward' ? 'forward, closer light' : depth === 'back' ? 'background light' : 'mid distance';
    return `${depthLabel}, ${horiz} with an angle ${angle}° (${pitch})`;
  }, [clampedValue]);

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-4', className)}>
      {/* Label */}
      {/* <Label
        id={labelId}
        className="block text-sm sm:text-base font-medium"
      >
        {label}
      </Label> */}

      {/* Interactive Area */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full bg-secondary/20 border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden',
          'focus-within:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          aspectRatio: compact ? '4 / 3' : '16 / 9',
          minHeight: compact ? '140px' : '200px',
        }}
        role="application"
        aria-labelledby={labelId}
        aria-describedby={`${controlId}-instructions`}
      >
        {/* Grid lines for visual reference */}
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          {/* Vertical lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-muted-foreground/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-muted-foreground/30" />
          {/* Horizontal lines */}
          <div className="absolute top-1/3 left-0 right-0 h-px bg-muted-foreground/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-muted-foreground/30" />
        </div>

        {/* Flashlight Icon */}
        <div
          ref={flashlightRef}
          className={cn(
            compact ? 'absolute w-8 h-8 cursor-grab will-change-transform' : 'absolute w-10 h-10 cursor-grab will-change-transform',
            !isDragging && !isRotating && 'hover:scale-110',
            isFocused && 'ring-2 ring-ring ring-offset-2 ring-offset-background rounded-full',
            isDragging && 'cursor-grabbing',
            disabled && 'cursor-not-allowed'
          )}
          style={{
            left: `${clampedValue.x}%`,
            top: `${clampedValue.y}%`,
            transform: `translate(-50%, -50%) rotate(${clampedValue.rotation}deg) scale(${depthScale})`,
            transition: (isDragging || isRotating) ? 'none' : 'transform 150ms ease-out',
          }}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={`Lighting direction control. Position: ${Math.round(clampedValue.x)}%, ${Math.round(clampedValue.y)}%. Rotation: ${Math.round(clampedValue.rotation)}°. Tilt: ${Math.round(clampedValue.tilt)}°`}
        >
          <Flashlight
            className={cn(
              'w-full h-full text-primary drop-shadow-lg',
              isDragging && 'text-primary/80'
            )}
            style={{
              filter: `brightness(${1 + (clampedValue.tilt / 180)}) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
            }}
          />

          {/* Rotation Handle - More visible pivot point */}
          <div
            className={cn(
              compact
                ? 'absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5'
                : 'absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5',
              'cursor-grab select-none',
              isRotating && 'cursor-grabbing'
            )}
            onPointerDown={handleRotationPointerDown}
            aria-hidden="true"
          >
            {/* Connecting line */}
            <div className={cn(
              'w-0.5 h-3 rounded-full',
              isRotating ? 'bg-primary' : 'bg-primary/60'
            )} />
            {/* Handle circle */}
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                'shadow-md backdrop-blur-sm',
                isRotating
                  ? 'bg-primary border-primary-foreground scale-125'
                  : 'bg-primary/80 border-primary-foreground/80 hover:bg-primary hover:scale-110',
                'transition-all duration-100'
              )}
            >
              {/* Inner rotation indicator */}
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/90" />
            </div>
          </div>
        </div>
      </div>

      {/* Position and Orientation Summary */}
      <div className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-sm', compact ? 'space-y-0.5' : 'space-y-1')}>
        <div className={cn('font-medium text-foreground', compact ? 'text-[11px]' : '')}>
          {compact
            ? `x ${Math.round(clampedValue.x)} • y ${Math.round(clampedValue.y)} • rot ${Math.round(clampedValue.rotation)}° • tilt ${Math.round(clampedValue.tilt)}°`
            : directionSummary}
        </div>
        {!compact && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>Angle: {Math.round(clampedValue.rotation)}°</div>
            <div>Depth: {Math.round(clampedValue.tilt)}</div>
            <div>Horizontal: {Math.round(clampedValue.x)}%</div>
            <div>Vertical: {Math.round(clampedValue.y)}%</div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!compact && isFocused &&
        <div
          id={`${controlId}-instructions`}
          className="text-xs text-muted-foreground"
        >
          Drag to move • Drag handle to rotate • Scroll to push/pull light
        </div>}

    </div>
  );
});

LightingDirectionControl.displayName = 'LightingDirectionControl';
