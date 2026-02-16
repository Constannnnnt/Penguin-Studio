import * as React from 'react';
import { cn } from '@/shared/lib/utils';

type CanonicalCameraAngle = 'eye-level' | 'overhead' | 'low-angle' | 'high-angle' | 'custom';
type CanonicalLens = 'wide-angle' | 'standard' | 'portrait' | 'macro' | 'custom';

interface CameraGuideViewportProps {
  cameraAngle: unknown;
  lensFocalLength: unknown;
  depthOfField: unknown;
  focus: unknown;
  compact?: boolean;
  className?: string;
}

interface OptionDescriptor {
  label: string;
  description: string;
}

const CAMERA_DESCRIPTORS: Record<CanonicalCameraAngle, OptionDescriptor> = {
  'eye-level': {
    label: 'Eye Level',
    description: 'Natural perspective. Subject feels relatable and balanced.',
  },
  'overhead': {
    label: 'Overhead',
    description: 'Top-down framing. Emphasizes layout, patterns, and environment.',
  },
  'low-angle': {
    label: 'Low Angle',
    description: 'Camera looks up. Subject appears dominant, heroic, or dramatic.',
  },
  'high-angle': {
    label: 'High Angle',
    description: 'Camera looks down. Subject appears smaller or more vulnerable.',
  },
  custom: {
    label: 'Custom Angle',
    description: 'Custom camera perspective from your prompt.',
  },
};

const LENS_DESCRIPTORS: Record<CanonicalLens, OptionDescriptor> = {
  'wide-angle': {
    label: 'Wide Lens',
    description: 'Shows more environment and stronger perspective stretch.',
  },
  standard: {
    label: 'Standard Lens',
    description: 'Balanced framing with natural proportions.',
  },
  portrait: {
    label: 'Portrait / Tele',
    description: 'Tighter framing with flatter perspective and more subject emphasis.',
  },
  macro: {
    label: 'Macro Lens',
    description: 'Extreme close-up detail and very tight framing.',
  },
  custom: {
    label: 'Custom Lens',
    description: 'Custom focal behavior from your prompt.',
  },
};

const normalizeToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const canonicalizeCameraAngle = (value: unknown): CanonicalCameraAngle => {
  const token = normalizeToken(value);
  if (!token) return 'eye-level';

  if (
    token.includes('overhead') ||
    token.includes('top-down') ||
    token.includes('bird-eye') ||
    token.includes("bird's-eye")
  ) {
    return 'overhead';
  }
  if (token.includes('worm-eye') || token.includes("worm's-eye")) {
    return 'low-angle';
  }
  if (token === 'eye-level' || token === 'eye level') {
    return 'eye-level';
  }
  if (token === 'low-angle' || token === 'low angle') {
    return 'low-angle';
  }
  if (token === 'high-angle' || token === 'high angle') {
    return 'high-angle';
  }
  return 'custom';
};

const canonicalizeLens = (value: unknown): CanonicalLens => {
  const token = normalizeToken(value);
  if (!token) return 'standard';

  if (token.includes('wide')) return 'wide-angle';
  if (token.includes('macro')) return 'macro';
  if (
    token.includes('portrait') ||
    token.includes('telephoto') ||
    token.includes('super-telephoto')
  ) {
    return 'portrait';
  }
  if (token.includes('standard') || token.includes('50mm')) return 'standard';
  return 'custom';
};

const getDepthDescriptor = (value: number): OptionDescriptor => {
  if (value <= 20) {
    return {
      label: 'Very Shallow DOF',
      description: 'Strong background blur. Subject isolation is strongest.',
    };
  }
  if (value <= 40) {
    return {
      label: 'Shallow DOF',
      description: 'Noticeable blur behind the subject.',
    };
  }
  if (value <= 60) {
    return {
      label: 'Balanced DOF',
      description: 'A moderate amount of scene remains sharp.',
    };
  }
  if (value <= 80) {
    return {
      label: 'Deep DOF',
      description: 'Most of the scene appears in focus.',
    };
  }
  return {
    label: 'Very Deep DOF',
    description: 'Foreground and background are mostly sharp.',
  };
};

const getFocusDescriptor = (value: number): OptionDescriptor => {
  if (value <= 20) {
    return {
      label: 'Soft Focus',
      description: 'Lower edge definition for a dreamy look.',
    };
  }
  if (value <= 40) {
    return {
      label: 'Slight Soft Focus',
      description: 'Gentle softness while retaining clarity.',
    };
  }
  if (value <= 60) {
    return {
      label: 'Sharp Focus',
      description: 'Balanced clarity and detail.',
    };
  }
  if (value <= 80) {
    return {
      label: 'Very Sharp Focus',
      description: 'High detail and clear edges.',
    };
  }
  return {
    label: 'Hyper Sharp Focus',
    description: 'Maximum crispness and texture detail.',
  };
};

const toTitle = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const CameraGuideViewport: React.FC<CameraGuideViewportProps> = ({
  cameraAngle,
  lensFocalLength,
  depthOfField,
  focus,
  compact = false,
  className,
}) => {
  const angleKey = canonicalizeCameraAngle(cameraAngle);
  const lensKey = canonicalizeLens(lensFocalLength);

  const depthValue = clamp(toNumber(depthOfField, 50), 0, 100);
  const focusValue = clamp(toNumber(focus, 75), 0, 100);

  const angleDescriptor = CAMERA_DESCRIPTORS[angleKey];
  const lensDescriptor = LENS_DESCRIPTORS[lensKey];
  const depthDescriptor = getDepthDescriptor(depthValue);
  const focusDescriptor = getFocusDescriptor(focusValue);

  const framingScaleByLens: Record<CanonicalLens, number> = {
    'wide-angle': 0.86,
    standard: 0.72,
    portrait: 0.56,
    macro: 0.42,
    custom: 0.66,
  };

  const perspectiveByAngle: Record<CanonicalCameraAngle, { y: number; horizon: number }> = {
    'eye-level': { y: 58, horizon: 52 },
    overhead: { y: 40, horizon: 36 },
    'low-angle': { y: 70, horizon: 66 },
    'high-angle': { y: 46, horizon: 42 },
    custom: { y: 56, horizon: 50 },
  };

  const framingScale = framingScaleByLens[lensKey];
  const subjectY = perspectiveByAngle[angleKey].y;
  const horizonY = perspectiveByAngle[angleKey].horizon;
  const blurAmountPx = 12 - depthValue * 0.09;
  const focusRingOpacity = 0.2 + focusValue * 0.007;
  const focusRingSize = 16 + focusValue * 0.16;

  const resolvedAngleLabel =
    angleKey === 'custom' && String(cameraAngle ?? '').trim()
      ? `Custom (${toTitle(cameraAngle)})`
      : angleDescriptor.label;
  const resolvedLensLabel =
    lensKey === 'custom' && String(lensFocalLength ?? '').trim()
      ? `Custom (${toTitle(lensFocalLength)})`
      : lensDescriptor.label;

  return (
    <section
      className={cn(
        'industrial-panel border border-primary/20',
        compact ? 'p-3 space-y-3' : 'p-4 space-y-4',
        className
      )}
      aria-label="Camera guidance preview"
    >
      <header className="flex items-center justify-between gap-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading">
          Camera Preview
        </h4>
        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
          {resolvedAngleLabel} | {resolvedLensLabel}
        </p>
      </header>

      <div className={cn('relative overflow-hidden rounded-md border border-primary/20 bg-background/40', compact ? 'h-32' : 'h-40')}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10" />
        <div
          className="absolute left-0 right-0 border-t border-dashed border-primary/30"
          style={{ top: `${horizonY}%` }}
        />
        <div
          className="absolute rounded-md border border-primary/50 bg-primary/5"
          style={{
            width: `${framingScale * 100}%`,
            height: `${framingScale * 72}%`,
            left: `${50 - (framingScale * 100) / 2}%`,
            top: `${50 - (framingScale * 72) / 2}%`,
          }}
        />
        <div
          className="absolute rounded-full bg-primary/60 shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          style={{
            width: compact ? 18 : 20,
            height: compact ? 18 : 20,
            left: '50%',
            top: `${subjectY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          className="absolute rounded-full border-2 border-primary/70"
          style={{
            width: `${focusRingSize}px`,
            height: `${focusRingSize}px`,
            left: '50%',
            top: `${subjectY}%`,
            transform: 'translate(-50%, -50%)',
            opacity: focusRingOpacity,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blurAmountPx.toFixed(2)}px)`,
            maskImage: 'radial-gradient(circle at 50% 58%, transparent 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.8) 45%, black 80%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 58%, transparent 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.8) 45%, black 80%)',
          }}
        />
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <div className="rounded-md border border-border/50 bg-background/30 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/70">Angle</p>
          <p className="mt-1 text-[10px] font-semibold text-foreground">{resolvedAngleLabel}</p>
          <p className="text-[9px] text-muted-foreground">{angleDescriptor.description}</p>
        </div>
        <div className="rounded-md border border-border/50 bg-background/30 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/70">Lens</p>
          <p className="mt-1 text-[10px] font-semibold text-foreground">{resolvedLensLabel}</p>
          <p className="text-[9px] text-muted-foreground">{lensDescriptor.description}</p>
        </div>
        <div className="rounded-md border border-border/50 bg-background/30 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/70">
            Depth ({depthValue})
          </p>
          <p className="mt-1 text-[10px] font-semibold text-foreground">{depthDescriptor.label}</p>
          <p className="text-[9px] text-muted-foreground">{depthDescriptor.description}</p>
        </div>
        <div className="rounded-md border border-border/50 bg-background/30 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/70">
            Focus ({focusValue})
          </p>
          <p className="mt-1 text-[10px] font-semibold text-foreground">{focusDescriptor.label}</p>
          <p className="text-[9px] text-muted-foreground">{focusDescriptor.description}</p>
        </div>
      </div>
    </section>
  );
};
