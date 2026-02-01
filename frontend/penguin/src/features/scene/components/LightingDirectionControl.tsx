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

  const [isDragging, setIsDragging] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [rotationStart, setRotationStart] = React.useState<{
    angle: number;
    rotation: number;
    tilt: number;
  } | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const pendingValueRef = React.useRef<LightingDirectionValue>(value);

  // Ensure values are within bounds
  const clampValue = React.useCallback((val: LightingDirectionValue): LightingDirectionValue => ({
    x: Math.max(0, Math.min(100, val.x)),
    y: Math.max(0, Math.min(100, val.y)),
    rotation: ((val.rotation % 360) + 360) % 360,
    tilt: Math.max(-90, Math.min(90, val.tilt)),
  }), []);

  const clampedValue = React.useMemo((): LightingDirectionValue => clampValue(value), [value, clampValue]);

  // Schedule updates on the next animation frame for smoother UX
  const scheduleUpdate = React.useCallback((next: LightingDirectionValue) => {
    pendingValueRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      onChange(pendingValueRef.current);
    });
  }, [onChange]);

  React.useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  /**
   * Convert percentage position to pixel coordinates within container
   */
  const getPercentPosition = React.useCallback((pixelX: number, pixelY: number): { x: number; y: number } => {
    const rect = containerRectRef.current ?? containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    const { width, height, left, top } = rect;
    containerRectRef.current = rect ? { left, top, width, height } : null;

    const localX = pixelX - (left ?? 0);
    const localY = pixelY - (top ?? 0);

    const percentX = Math.max(0, Math.min(100, (localX / width) * 100));
    const percentY = Math.max(0, Math.min(100, (localY / height) * 100));

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
    setDragStart({ x: startX, y: startY });

    // Focus for keyboard navigation
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
    setRotationStart({
      angle,
      rotation: clampedValue.rotation,
      tilt: clampedValue.tilt,
    });
  }, [disabled, getAngleFromCenter, clampedValue.rotation, clampedValue.tilt]);

  /**
   * Handle mouse move during drag
   */
  const handlePointerMove = React.useCallback((event: PointerEvent): void => {
    if (!containerRef.current) return;

    if (isDragging && dragStart) {
      containerRectRef.current = containerRectRef.current ?? containerRef.current.getBoundingClientRect();
      const currentX = event.clientX;
      const currentY = event.clientY;

      const { x: percentX, y: percentY } = getPercentPosition(currentX, currentY);

      scheduleUpdate(clampValue({
        ...pendingValueRef.current,
        x: percentX,
        y: percentY,
      }));
    } else if (isRotating && rotationStart) {
      const currentAngle = getAngleFromCenter(event.clientX, event.clientY);
      const angleDelta = currentAngle - rotationStart.angle;

      // Update rotation
      const newRotation = ((rotationStart.rotation + angleDelta) % 360 + 360) % 360;

      // Calculate tilt based on distance from center (simple approximation)
      if (flashlightRef.current) {
        const flashlightRect = flashlightRef.current.getBoundingClientRect();
        const centerX = flashlightRect.left + flashlightRect.width / 2;
        const centerY = flashlightRect.top + flashlightRect.height / 2;

        const distance = Math.sqrt(
          Math.pow(event.clientX - centerX, 2) +
          Math.pow(event.clientY - centerY, 2)
        );

        // Map distance to tilt (-90 to 90 degrees)
        const maxDistance = 100; // pixels
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const newTilt = (normalizedDistance - 0.5) * 180; // -90 to 90

        scheduleUpdate(clampValue({
          ...pendingValueRef.current,
          rotation: newRotation,
          tilt: newTilt,
        }));
      }
    }
  }, [isDragging, isRotating, dragStart, rotationStart, getPercentPosition, getAngleFromCenter, clampValue, scheduleUpdate]);

  /**
   * Handle mouse up to end drag/rotation
   */
  const handlePointerUp = React.useCallback((): void => {
    setIsDragging(false);
    setIsRotating(false);
    setDragStart(null);
    setRotationStart(null);
  }, []);

  /**
   * Handle touch events for mobile support
   */
  // Wheel to push/pull light (maps to tilt and visual scale)
  const handleWheel = React.useCallback((event: WheelEvent) => {
    if (disabled) return;
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -5; // up = forward, down = back
    const nextTilt = Math.max(-70, Math.min(70, pendingValueRef.current.tilt + delta));
    scheduleUpdate(clampValue({
      ...pendingValueRef.current,
      tilt: nextTilt,
    }));
  }, [disabled, scheduleUpdate, clampValue]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent): void => {
    if (disabled) return;

    let newValue = { ...clampedValue };
    let handled = true;
    const step = event.shiftKey ? 10 : 1; // Larger steps with Shift

    switch (event.key) {
      case 'ArrowRight':
        newValue.x = Math.min(100, clampedValue.x + step);
        break;
      case 'ArrowLeft':
        newValue.x = Math.max(0, clampedValue.x - step);
        break;
      case 'ArrowUp':
        newValue.y = Math.max(0, clampedValue.y - step);
        break;
      case 'ArrowDown':
        newValue.y = Math.min(100, clampedValue.y + step);
        break;
      case 'r':
      case 'R':
        // Rotate clockwise/counterclockwise
        newValue.rotation = ((clampedValue.rotation + (event.shiftKey ? -15 : 15)) % 360 + 360) % 360;
        break;
      case 't':
      case 'T':
        // Adjust tilt
        newValue.tilt = Math.max(-90, Math.min(90, clampedValue.tilt + (event.shiftKey ? -15 : 15)));
        break;
      case 'Home':
        newValue = { x: 50, y: 50, rotation: 0, tilt: 0 };
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
      scheduleUpdate(clampValue(newValue));
    }
  }, [clampedValue, scheduleUpdate, disabled, clampValue]);

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
    <div className={cn('space-y-4', className)}>
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
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="font-medium text-foreground">
          {directionSummary}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>Angle: {Math.round(clampedValue.rotation)}°</div>
          <div>Depth: {Math.round(clampedValue.tilt)}</div>
          <div>Horizontal: {Math.round(clampedValue.x)}%</div>
          <div>Vertical: {Math.round(clampedValue.y)}%</div>
        </div>
      </div>

      {/* Instructions */}
      {isFocused && 
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
