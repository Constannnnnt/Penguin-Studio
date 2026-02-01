import React from 'react';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { useConfigStore } from '@/features/scene/store/configStore';
import {
    CAMERA_ANGLE_OPTIONS,
    LIGHTING_CONDITIONS_OPTIONS,
    type LightingDirectionValue,
} from '@/core/types';
import type { PlanStep } from '@/core/types';
import {
    COMPOSITION_PREVIEWS,
} from '@/features/scene/constants/previewImages';
import { COLOR_SCHEME_SWATCHES } from '@/features/scene/constants/colorSchemes';
import { motion, AnimatePresence } from 'framer-motion';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Input } from '@/shared/components/ui/input'; // Keep Input for readonly or non-debounced cases if any

const EMPTY_MASKS: any[] = [];

const PreviewThumbnail: React.FC<{ src?: string; active?: boolean; gradient?: string; label: string }> = ({
    src,
    active,
    gradient,
    label
}) => (
    <div className={`overflow-hidden rounded-md border-2 transition-all ${active ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'}`}>
        {gradient ? (
            <div className="h-10 w-full" style={{ background: gradient }} />
        ) : src ? (
            <img src={src} alt={label} className="h-10 w-full object-cover" />
        ) : (
            <div className="h-10 w-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground uppercase">{label}</div>
        )}
    </div>
);

/**
 * InteractiveParameterEditor renders a list of proposed plan steps with editable parameters.
 * It's designed to be embedded within the AgentChatInterface.
 */
export const InteractiveParameterEditor: React.FC<InteractiveParameterEditorProps> = ({
    steps,
    onUpdateStep,
    onExecute,
    disabled = false,
    status
}) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [expandedSteps, setExpandedSteps] = React.useState<Record<number, boolean>>(() =>
        steps.reduce((acc, _, i) => ({ ...acc, [i]: i === 0 }), {}) // Expand first step by default
    );

    if (!steps || steps.length === 0) return null;

    const toggleStep = (idx: number) => {
        setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const masks = useSegmentationStore((state) => state.results?.masks ?? EMPTY_MASKS);
    const defaultDirection = useConfigStore((state) => state.sceneConfig.lighting.direction);

    const isLocked = disabled || status === 'executing';

    const parseNumber = (value: unknown, fallback: number): number => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const clampNumber = (value: number, min: number, max: number): number =>
        Math.min(max, Math.max(min, value));

    const coerceString = (value: unknown, fallback = ''): string => {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (value && typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return fallback;
    };

    const parseLightingDirection = (input: unknown, fallback: LightingDirectionValue): LightingDirectionValue => {
        if (!input) return { ...fallback };
        if (typeof input === 'object') {
            const value = input as Record<string, unknown>;
            return {
                x: parseNumber(value.x, fallback.x),
                y: parseNumber(value.y, fallback.y),
                rotation: parseNumber(value.rotation, fallback.rotation),
                tilt: parseNumber(value.tilt, fallback.tilt),
            };
        }
        if (typeof input === 'string') {
            const next = { ...fallback };
            const pattern = /(?:^|[,\\s])(?<key>x|y|rotation|tilt)\\s*[:=]\\s*(?<value>-?\\d+(?:\\.\\d+)?)/gi;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(input)) !== null) {
                const key = match.groups?.key as keyof LightingDirectionValue | undefined;
                const raw = match.groups?.value;
                if (!key || raw === undefined) continue;
                const num = Number(raw);
                if (!Number.isNaN(num)) {
                    next[key] = num;
                }
            }
            return next;
        }
        return { ...fallback };
    };

    const compositionOptions = [
        'centered',
        'rule-of-thirds',
        'diagonal',
        'symmetrical',
        'asymmetrical',
    ];
    const colorSchemeOptions = [
        'vibrant',
        'muted',
        'monochrome',
        'warm',
        'cool',
        'pastel',
        'cinematic',
    ];
    const moodOptions = [
        'neutral',
        'cheerful',
        'dramatic',
        'serene',
        'mysterious',
    ];
    const locationOptions = [
        'center',
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'center-left',
        'center-right',
    ];
    const sizeOptions = ['small', 'medium', 'large', 'very large'];
    const orientationOptions = ['front-facing', 'left', 'right', 'back', 'angled'];
    const objectPropertyOptions = [
        { value: 'location', label: 'Location' },
        { value: 'relative_size', label: 'Relative Size' },
        { value: 'orientation', label: 'Orientation' },
    ];
    const objectEditOptions = [
        'brightness',
        'contrast',
        'saturation',
        'hue',
        'blur',
        'exposure',
        'vibrance',
    ];

    const getMaskLabel = (maskId: string): string => {
        const mask = masks.find((item: any) => item.mask_id === maskId);
        return mask?.promptObject || mask?.label || maskId;
    };

    const updateStep = (idx: number, toolInput: Record<string, any>, updates: Record<string, any>) => {
        onUpdateStep(idx, { ...toolInput, ...updates });
    };

    const normalizeOption = (value: string): string =>
        value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const matchOption = (value: string, options: readonly string[]) => {
        const trimmed = value.trim();
        if (!trimmed) return { selected: '', custom: '' };
        const normalizedValue = normalizeOption(trimmed);
        const exact = options.find((opt) => normalizeOption(opt) === normalizedValue);
        if (exact) return { selected: exact, custom: '' };
        const partial = options.find((opt) => {
            const normalizedOpt = normalizeOption(opt);
            if (!normalizedOpt) return false;
            return normalizedValue.includes(normalizedOpt) || normalizedOpt.includes(normalizedValue);
        });
        if (partial && partial !== 'custom') return { selected: partial, custom: '' };
        if (options.includes('custom')) return { selected: 'custom', custom: trimmed };
        return { selected: '', custom: trimmed };
    };

    const renderGenericFields = (
        idx: number,
        toolInput: Record<string, any>,
        usedKeys: string[] = [],
        showEmptyState = false
    ): React.ReactNode => {
        const entries = Object.entries(toolInput).filter(
            ([key, value]) => !usedKeys.includes(key) && value !== undefined
        );
        if (entries.length === 0) {
            if (!showEmptyState) return null;
            return (
                <div className="rounded-md border border-dashed border-border/60 bg-background/50 px-3 py-2 text-[11px] text-muted-foreground">
                    No adjustable parameters provided.
                </div>
            );
        }

        return entries.map(([key, value]) => {
            const label = key.replace(/_/g, ' ');
            const isNumber = typeof value === 'number';
            const displayValue = typeof value === 'string' ? value : JSON.stringify(value);

            return (
                <div key={key} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            {label}
                        </Label>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-black text-primary border border-primary/5">
                            {displayValue}
                        </span>
                    </div>

                    {isNumber ? (
                        <PerformantInput
                            disabled={isLocked}
                            type="number"
                            value={value}
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onValueCommit={(val) =>
                                updateStep(idx, toolInput, { [key]: Number(val) })
                            }
                        />
                    ) : (
                        <PerformantInput
                            disabled={isLocked}
                            value={coerceString(value)}
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onValueCommit={(val) => updateStep(idx, toolInput, { [key]: val })}
                        />
                    )}
                </div>
            );
        });
    };

    const renderToolInputs = (step: PlanStep, idx: number): React.ReactNode => {
        const toolInput = step.tool_input || {};

        switch (step.tool_name) {
            case 'update_background': {
                const backgroundSetting = coerceString(
                    toolInput.background_setting ?? toolInput.setting ?? ''
                );
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
                                Environment Set
                            </Label>
                            <div className="grid grid-cols-4 gap-2">
                                {['studio', 'outdoor', 'urban', 'interior'].map((s) => (
                                    <button
                                        key={s}
                                        disabled={isLocked}
                                        onClick={() => updateStep(idx, toolInput, { background_setting: s })}
                                        className="focus:outline-none"
                                    >
                                        <PreviewThumbnail
                                            label={s}
                                            active={backgroundSetting.toLowerCase().includes(s)}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
                                Detailed Prompt
                            </Label>
                            <div className="rounded-md border border-border/40 overflow-hidden bg-background/20 relative group/bg">
                                <Textarea
                                    disabled={isLocked}
                                    value={backgroundSetting}
                                    rows={3}
                                    className="resize-none bg-transparent border-none text-[11px] focus-visible:ring-0 p-3 leading-relaxed"
                                    onChange={(e) =>
                                        updateStep(idx, toolInput, { background_setting: e.target.value })
                                    }
                                />
                                <div className="absolute bottom-2 right-2 opacity-20 group-hover/bg:opacity-40 transition-opacity">
                                    <div className="h-1 w-8 bg-primary/30 rounded-full" />
                                </div>
                            </div>
                        </div>
                        {renderGenericFields(idx, toolInput, ['background_setting', 'setting'])}
                    </div>
                );
            }
            case 'update_lighting': {
                const conditions = coerceString(toolInput.conditions ?? '');
                const matchedConditions = matchOption(conditions, LIGHTING_CONDITIONS_OPTIONS);
                const showConditionCustom = !!matchedConditions.custom && matchedConditions.custom !== matchedConditions.selected;
                const shadows = clampNumber(parseNumber(toolInput.shadows, 2), 0, 5);
                const directionValue = parseLightingDirection(toolInput.direction, defaultDirection);
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Conditions
                            </Label>

                            <Select
                                value={matchedConditions.selected || ""}
                                onValueChange={(value) => {
                                    if (value === 'custom') {
                                        updateStep(idx, toolInput, { conditions: matchedConditions.custom || '' });
                                    } else {
                                        updateStep(idx, toolInput, { conditions: value });
                                    }
                                }}
                            >

                                <SelectTrigger className="h-9 text-[11px] truncate studio-blur bg-background/40">
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        <SelectValue placeholder={showConditionCustom ? 'Custom condition' : 'Select lighting condition'} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {LIGHTING_CONDITIONS_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-3 bg-primary/20 rounded-full" />
                                                {option}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                        </div>

                        {showConditionCustom && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    Custom Condition
                                </Label>
                                <Textarea
                                    disabled={isLocked}
                                    value={matchedConditions.custom}
                                    rows={3}
                                    className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                    onChange={(e) => updateStep(idx, toolInput, { conditions: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Shadows
                            </Label>
                            <div className="px-1">
                                <PerformantSlider
                                    disabled={isLocked}
                                    value={shadows}
                                    min={0}
                                    max={5}
                                    step={1}
                                    onValueChange={(val) => updateStep(idx, toolInput, { shadows: val })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Direction
                            </Label>
                            <LightingDirectionControl
                                value={directionValue}
                                onChange={(value) => updateStep(idx, toolInput, { direction: value })}
                                compact
                                disabled={isLocked}
                            />
                        </div>

                        {renderGenericFields(idx, toolInput, ['conditions', 'shadows', 'direction'])}
                    </div>
                );
            }
            case 'update_photographic': {
                const depth = clampNumber(parseNumber(toolInput.depth_of_field, 50), 0, 100);
                const focus = clampNumber(parseNumber(toolInput.focus, 75), 0, 100);
                const cameraAngle = coerceString(toolInput.camera_angle ?? '');
                const matchedCamera = matchOption(cameraAngle, CAMERA_ANGLE_OPTIONS);
                const showCameraCustom = !!matchedCamera.custom && matchedCamera.custom !== matchedCamera.selected;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
                                Camera Control
                            </Label>
                            <Select
                                value={matchedCamera.selected || ""}
                                onValueChange={(value) => {
                                    if (value === 'custom') {
                                        updateStep(idx, toolInput, { camera_angle: matchedCamera.custom || '' });
                                    } else {
                                        updateStep(idx, toolInput, { camera_angle: value });
                                    }
                                }}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <SelectValue placeholder={showCameraCustom ? 'Custom angle' : 'Select angle'} />
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {CAMERA_ANGLE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">Optical Settings</Label>
                            <div className="space-y-4 rounded-md border border-border/20 bg-background/20 p-3">
                                <div className="space-y-1">
                                    <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Depth of Field</Label>
                                    <PerformantSlider disabled={isLocked} value={depth} min={0} max={100} step={1} onValueChange={(val) => updateStep(idx, toolInput, { depth_of_field: val })} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Focus Shift</Label>
                                    <PerformantSlider disabled={isLocked} value={focus} min={0} max={100} step={1} onValueChange={(val) => updateStep(idx, toolInput, { focus: val })} />
                                </div>
                            </div>
                        </div>
                        {renderGenericFields(idx, toolInput, ['camera_angle', 'depth_of_field', 'focus'])}
                    </div>
                );
            }
            case 'update_aesthetics': {
                const composition = coerceString(toolInput.composition ?? '');
                const colorScheme = coerceString(toolInput.color_scheme ?? '');
                const mood = coerceString(toolInput.mood_atmosphere ?? toolInput.mood ?? '');
                const matchedComposition = matchOption(composition, compositionOptions);
                const matchedColor = matchOption(colorScheme, colorSchemeOptions);
                const matchedMood = matchOption(mood, moodOptions);
                const showMoodCustom = !!matchedMood.custom && matchedMood.custom !== matchedMood.selected;
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">Composition</Label>
                                <Select
                                    value={matchedComposition.selected || ""}
                                    onValueChange={(value) => updateStep(idx, toolInput, { composition: value })}
                                    disabled={isLocked}
                                >
                                    <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="industrial-panel">
                                        {compositionOptions.map((option: string) => (
                                            <SelectItem key={option} value={option}>
                                                <div className="flex flex-col gap-1 py-1">
                                                    {COMPOSITION_PREVIEWS[option] && (
                                                        <img src={COMPOSITION_PREVIEWS[option]} alt="" className="h-8 w-12 object-cover rounded-sm border border-border/20 shadow-sm" />
                                                    )}
                                                    <span className="text-[10px]">{option}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">Color Palette</Label>
                                <Select
                                    value={matchedColor.selected || ""}
                                    onValueChange={(value) => updateStep(idx, toolInput, { color_scheme: value })}
                                    disabled={isLocked}
                                >
                                    <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="industrial-panel">
                                        {colorSchemeOptions.map((option: string) => (
                                            <SelectItem key={option} value={option}>
                                                <div className="flex flex-col gap-1 py-1">
                                                    <div className="h-5 w-12 rounded-sm border border-border/20 shadow-sm" style={{ background: COLOR_SCHEME_SWATCHES[option] || 'var(--muted)' }} />
                                                    <span className="text-[10px]">{option}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Mood & Atmosphere
                            </Label>
                            <Select
                                value={matchedMood.selected || ""}
                                onValueChange={(value) =>
                                    updateStep(idx, toolInput, { mood_atmosphere: value })
                                }
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="h-2 w-2 rounded-full" style={{ background: COLOR_SCHEME_SWATCHES[matchedMood.selected || ''] || 'var(--muted)' }} />
                                        <SelectValue placeholder={showMoodCustom ? 'Custom mood' : 'Select mood'} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {moodOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full border border-border" style={{ background: COLOR_SCHEME_SWATCHES[option] || 'var(--muted)' }} />
                                                {option}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {showMoodCustom && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    Custom Mood
                                </Label>
                                <Textarea
                                    disabled={isLocked}
                                    value={matchedMood.custom}
                                    rows={3}
                                    className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                    onChange={(e) =>
                                        updateStep(idx, toolInput, { mood_atmosphere: e.target.value })
                                    }
                                />
                            </div>
                        )}

                        {renderGenericFields(idx, toolInput, ['composition', 'color_scheme', 'mood_atmosphere', 'mood'])}
                    </div>
                );
            }
            case 'select_object': {
                const prompt = coerceString(toolInput.prompt ?? '');
                const maskOptions = masks.map((mask: any) => ({
                    value: mask.promptObject || mask.label || mask.mask_id,
                    label: mask.promptObject || mask.label || mask.mask_id,
                }));
                const selectedPrompt = maskOptions.some((option) => option.value === prompt)
                    ? prompt
                    : '';
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Object Prompt
                        </Label>
                        <PerformantInput
                            disabled={isLocked}
                            value={prompt}
                            placeholder="Describe the object to select"
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onValueCommit={(val) => updateStep(idx, toolInput, { prompt: val })}
                        />
                        {maskOptions.length > 0 && (
                            <Select
                                value={selectedPrompt || ""}
                                onValueChange={(value) => updateStep(idx, toolInput, { prompt: value })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <SelectValue placeholder="Pick from detected masks" />
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {maskOptions.map((option: { value: string; label: string }) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {renderGenericFields(idx, toolInput, ['prompt'])}
                    </div>
                );
            }
            case 'adjust_object_property': {
                const maskId = coerceString(toolInput.mask_id ?? '');
                const property = coerceString(toolInput.property ?? 'location');
                const value = coerceString(toolInput.value ?? '');
                const propertyValues =
                    property === 'location'
                        ? locationOptions
                        : property === 'relative_size'
                            ? sizeOptions
                            : property === 'orientation'
                                ? orientationOptions
                                : [];
                const matchedValue = matchOption(value, propertyValues);
                const showValueCustom = propertyValues.length > 0 && !!matchedValue.custom && matchedValue.custom !== matchedValue.selected;

                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Mask
                        </Label>
                        {masks.length > 0 ? (
                            <Select
                                value={maskId || ""}
                                onValueChange={(val) => updateStep(idx, toolInput, { mask_id: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <SelectValue placeholder="Select a mask" />
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {masks.map((mask: any) => (
                                        <SelectItem key={mask.mask_id} value={mask.mask_id}>
                                            {getMaskLabel(mask.mask_id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <PerformantInput
                                disabled={isLocked}
                                value={maskId}
                                placeholder="Mask ID"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onValueCommit={(val) => updateStep(idx, toolInput, { mask_id: val })}
                            />
                        )}

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Property
                        </Label>
                        <Select
                            value={property || ""}
                            onValueChange={(val) => updateStep(idx, toolInput, { property: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent className="industrial-panel">
                                {objectPropertyOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Value
                        </Label>
                        {propertyValues.length > 0 ? (
                            <Select
                                value={matchedValue.selected || ""}
                                onValueChange={(val) => updateStep(idx, toolInput, { value: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <SelectValue
                                        placeholder={showValueCustom ? 'Custom value' : 'Select value'}
                                    />
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {propertyValues.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <PerformantInput
                                disabled={isLocked}
                                value={value}
                                placeholder="Enter value"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onValueCommit={(val) => updateStep(idx, toolInput, { value: val })}
                            />
                        )}

                        {showValueCustom && (
                            <PerformantInput
                                disabled={isLocked}
                                value={matchedValue.custom}
                                placeholder="Custom value"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onValueCommit={(val) => updateStep(idx, toolInput, { value: val })}
                            />
                        )}

                        {renderGenericFields(idx, toolInput, ['mask_id', 'property', 'value'])}
                    </div>
                );
            }
            case 'adjust_object_image_edit': {
                const maskId = coerceString(toolInput.mask_id ?? '');
                const editType = coerceString(toolInput.edit_type ?? 'brightness');
                const ranges: Record<string, { min: number; max: number }> = {
                    brightness: { min: -100, max: 100 },
                    contrast: { min: -100, max: 100 },
                    saturation: { min: -100, max: 100 },
                    hue: { min: -180, max: 180 },
                    blur: { min: 0, max: 100 },
                    exposure: { min: -100, max: 100 },
                    vibrance: { min: -100, max: 100 },
                };
                const range = ranges[editType] || { min: -100, max: 100 };
                const value = clampNumber(parseNumber(toolInput.value, 0), range.min, range.max);
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Mask
                        </Label>
                        {masks.length > 0 ? (
                            <Select
                                value={maskId || ""}
                                onValueChange={(val) => updateStep(idx, toolInput, { mask_id: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                    <SelectValue placeholder="Select a mask" />
                                </SelectTrigger>
                                <SelectContent className="industrial-panel">
                                    {masks.map((mask: any) => (
                                        <SelectItem key={mask.mask_id} value={mask.mask_id}>
                                            {getMaskLabel(mask.mask_id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <PerformantInput
                                disabled={isLocked}
                                value={maskId}
                                placeholder="Mask ID"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onValueCommit={(val) => updateStep(idx, toolInput, { mask_id: val })}
                            />
                        )}

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Edit Type
                        </Label>
                        <Select
                            value={editType || ""}
                            onValueChange={(val) => updateStep(idx, toolInput, { edit_type: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                <SelectValue placeholder="Select edit" />
                            </SelectTrigger>
                            <SelectContent className="industrial-panel">
                                {objectEditOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Value
                        </Label>
                        <div className="px-1">
                            <PlanSlider
                                disabled={isLocked}
                                value={value}
                                min={range.min}
                                max={range.max}
                                step={1}
                                onValueChange={(val) => updateStep(idx, toolInput, { value: val })}
                            />
                        </div>

                        {renderGenericFields(idx, toolInput, ['mask_id', 'edit_type', 'value'])}
                    </div>
                );
            }
            case 'set_global_brightness':
            case 'set_global_contrast':
            case 'set_global_saturation':
            case 'set_global_exposure':
            case 'set_global_vibrance':
            case 'set_global_hue':
            case 'set_global_blur':
            case 'set_global_sharpen': {
                const ranges: Record<string, { min: number; max: number }> = {
                    set_global_brightness: { min: -100, max: 100 },
                    set_global_contrast: { min: -100, max: 100 },
                    set_global_saturation: { min: -100, max: 100 },
                    set_global_exposure: { min: -100, max: 100 },
                    set_global_vibrance: { min: -100, max: 100 },
                    set_global_hue: { min: -180, max: 180 },
                    set_global_blur: { min: 0, max: 100 },
                    set_global_sharpen: { min: 0, max: 100 },
                };
                const range = ranges[step.tool_name] || { min: -100, max: 100 };
                const value = clampNumber(parseNumber(toolInput.value, 0), range.min, range.max);
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Value
                        </Label>
                        <div className="px-1">
                            <PlanSlider
                                disabled={isLocked}
                                value={value}
                                min={range.min}
                                max={range.max}
                                step={1}
                                onValueChange={(val) => updateStep(idx, toolInput, { value: val })}
                            />
                        </div>
                        {renderGenericFields(idx, toolInput, ['value'])}
                    </div>
                );
            }
            case 'set_global_rotation': {
                const angle = coerceString(toolInput.angle ?? '0');
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Rotation Angle
                        </Label>
                        <Select
                            value={angle || ""}
                            onValueChange={(val) => updateStep(idx, toolInput, { angle: Number(val) })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                <SelectValue placeholder="Select angle" />
                            </SelectTrigger>
                            <SelectContent className="industrial-panel">
                                {[0, 90, 180, 270].map((val) => (
                                    <SelectItem key={val} value={String(val)}>
                                        {val}掳
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {renderGenericFields(idx, toolInput, ['angle'])}
                    </div>
                );
            }
            case 'toggle_global_flip': {
                const axis = coerceString(toolInput.axis ?? '');
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Flip Axis
                        </Label>
                        <Select
                            value={axis || ""}
                            onValueChange={(val: string) => updateStep(idx, toolInput, { axis: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
                                <SelectValue placeholder="Select axis" />
                            </SelectTrigger>
                            <SelectContent className="industrial-panel">
                                <SelectItem value="horizontal">Horizontal</SelectItem>
                                <SelectItem value="vertical">Vertical</SelectItem>
                            </SelectContent>
                        </Select>
                        {renderGenericFields(idx, toolInput, ['axis'])}
                    </div>
                );
            }
            default:
                return <div className="space-y-3">{renderGenericFields(idx, toolInput, [], true)}</div>;
        }
    };

    return (
        <Card className="w-full border-primary/20 bg-background/30 backdrop-blur-xl shadow-2xl overflow-hidden industrial-panel">
            <CardHeader
                className="pb-3 px-4 pt-4 relative cursor-pointer hover:bg-background/20 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                        <Settings2 className="h-3 w-3" />
                        Refinement Plan
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                            {steps.length} {steps.length === 1 ? 'Action' : 'Actions'}
                        </span>
                        {isExpanded ? <ChevronDown className="h-3 w-3 text-primary/60" /> : <ChevronRight className="h-3 w-3 text-primary/60" />}
                    </div>
                </div>
            </CardHeader>
            <AnimatePresence mode="wait">
                {isExpanded && (
                    <motion.div
                        key="refinement-plan-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <CardContent className="space-y-4 px-4 pb-4">
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {steps.map((step, idx) => {
                                        const isStepExpanded = expandedSteps[idx];
                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="relative space-y-3 rounded-lg border border-border/40 bg-background/60 p-0 transition-all hover:border-primary/30 safety-accent-border group/step overflow-hidden"
                                            >
                                                {/* Step Header */}
                                                <div
                                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background/40 transition-colors"
                                                    onClick={() => toggleStep(idx)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-black text-primary border border-primary/5">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-heading">
                                                                {step.tool_name.replace(/_/g, ' ')}
                                                            </h4>
                                                            <p className="text-[8px] text-muted-foreground/60 line-clamp-1">{step.step_description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isStepExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                                                    </div>
                                                </div>

                                                {/* Step Content */}
                                                <AnimatePresence initial={false}>
                                                    {isStepExpanded && (
                                                        <motion.div
                                                            key={`step-content-${idx}`}
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-4">
                                                                {renderToolInputs(step, idx)}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Global Action Button */}
                            {!disabled && status !== 'executing' && status !== 'completed' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 flex items-center justify-between gap-4 border-t border-border/20 pt-6"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80">
                                            Plan Ready
                                        </span>
                                    </div>
                                    <button
                                        disabled={isLocked}
                                        onClick={onExecute}
                                        className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded bg-primary px-8 text-[11px] font-black uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
                                        Execute Refinement Plan
                                    </button>
                                </motion.div>
                            )}

                            {status === 'executing' && (
                                <div className="mt-6 flex items-center justify-center gap-3 rounded-md border border-primary/20 bg-primary/5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span className="animate-pulse">Applying Changes...</span>
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};
