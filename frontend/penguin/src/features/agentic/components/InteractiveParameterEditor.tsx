import React from 'react';
import { Slider } from '@/shared/components/ui/slider';
import { Input } from '@/shared/components/ui/input';
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

interface InteractiveParameterEditorProps {
    steps: PlanStep[];
    onUpdateStep: (index: number, updatedInput: Record<string, any>) => void;
    onExecute: () => void;
    disabled?: boolean;
    status?: 'thinking' | 'suggested' | 'executing' | 'completed' | 'failed' | 'awaiting_input';
}

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
    if (!steps || steps.length === 0) return null;

    const masks = useSegmentationStore((state) => state.results?.masks || []);
    const defaultDirection = useConfigStore((state) => state.sceneConfig.lighting.direction);

    const isLocked = disabled || status === 'executing';

    const parseNumber = (value: unknown, fallback: number): number => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

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
        const mask = masks.find((item) => item.mask_id === maskId);
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
                        <Input
                            disabled={isLocked}
                            type="number"
                            value={value}
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onChange={(e) =>
                                updateStep(idx, toolInput, { [key]: Number(e.target.value) })
                            }
                        />
                    ) : (
                        <Input
                            disabled={isLocked}
                            value={coerceString(value)}
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onChange={(e) => updateStep(idx, toolInput, { [key]: e.target.value })}
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
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Background Setting
                        </Label>
                        <Textarea
                            disabled={isLocked}
                            value={backgroundSetting}
                            rows={5}
                            className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onChange={(e) =>
                                updateStep(idx, toolInput, { background_setting: e.target.value })
                            }
                        />
                        {renderGenericFields(idx, toolInput, ['background_setting', 'setting'])}
                    </div>
                );
            }
            case 'update_lighting': {
                const conditions = coerceString(toolInput.conditions ?? '');
                const matchedConditions = matchOption(conditions, LIGHTING_CONDITIONS_OPTIONS);
                const showConditionCustom = !!matchedConditions.custom && matchedConditions.custom !== matchedConditions.selected;
                const shadows = parseNumber(toolInput.shadows, 2);
                const directionValue = parseLightingDirection(toolInput.direction, defaultDirection);
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Conditions
                            </Label>
                            <Select
                                value={matchedConditions.selected || undefined}
                                onValueChange={(value) => {
                                    if (value === 'custom') {
                                        updateStep(idx, toolInput, { conditions: matchedConditions.custom || '' });
                                    } else {
                                        updateStep(idx, toolInput, { conditions: value });
                                    }
                                }}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showConditionCustom ? 'Custom condition' : 'Select lighting condition'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {LIGHTING_CONDITIONS_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
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
                                <Slider
                                    disabled={isLocked}
                                    value={[shadows]}
                                    min={0}
                                    max={5}
                                    step={1}
                                    onValueChange={([val]) => updateStep(idx, toolInput, { shadows: val })}
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
                const depth = parseNumber(toolInput.depth_of_field, 50);
                const focus = parseNumber(toolInput.focus, 75);
                const cameraAngle = coerceString(toolInput.camera_angle ?? '');
                const matchedCamera = matchOption(cameraAngle, CAMERA_ANGLE_OPTIONS);
                const showCameraCustom = !!matchedCamera.custom && matchedCamera.custom !== matchedCamera.selected;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Camera Angle
                            </Label>
                            <Select
                                value={matchedCamera.selected || undefined}
                                onValueChange={(value) => {
                                    if (value === 'custom') {
                                        updateStep(idx, toolInput, { camera_angle: matchedCamera.custom || '' });
                                    } else {
                                        updateStep(idx, toolInput, { camera_angle: value });
                                    }
                                }}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showCameraCustom ? 'Custom angle' : 'Select camera angle'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {CAMERA_ANGLE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {showCameraCustom && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    Custom Angle
                                </Label>
                                <Textarea
                                    disabled={isLocked}
                                    value={matchedCamera.custom}
                                    rows={3}
                                    className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                    onChange={(e) => updateStep(idx, toolInput, { camera_angle: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Depth of Field
                            </Label>
                            <div className="px-1">
                                <Slider
                                    disabled={isLocked}
                                    value={[depth]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([val]) => updateStep(idx, toolInput, { depth_of_field: val })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Focus
                            </Label>
                            <div className="px-1">
                                <Slider
                                    disabled={isLocked}
                                    value={[focus]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([val]) => updateStep(idx, toolInput, { focus: val })}
                                />
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
                const showCompositionCustom = !!matchedComposition.custom && matchedComposition.custom !== matchedComposition.selected;
                const showColorCustom = !!matchedColor.custom && matchedColor.custom !== matchedColor.selected;
                const showMoodCustom = !!matchedMood.custom && matchedMood.custom !== matchedMood.selected;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Composition
                            </Label>
                            <Select
                                value={matchedComposition.selected || undefined}
                                onValueChange={(value) => updateStep(idx, toolInput, { composition: value })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showCompositionCustom ? 'Custom composition' : 'Select composition'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {compositionOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {showCompositionCustom && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    Custom Composition
                                </Label>
                                <Textarea
                                    disabled={isLocked}
                                    value={matchedComposition.custom}
                                    rows={3}
                                    className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                    onChange={(e) => updateStep(idx, toolInput, { composition: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Color Scheme
                            </Label>
                            <Select
                                value={matchedColor.selected || undefined}
                                onValueChange={(value) => updateStep(idx, toolInput, { color_scheme: value })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showColorCustom ? 'Custom color scheme' : 'Select color scheme'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {colorSchemeOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {showColorCustom && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    Custom Color Scheme
                                </Label>
                                <Textarea
                                    disabled={isLocked}
                                    value={matchedColor.custom}
                                    rows={3}
                                    className="resize-none bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                    onChange={(e) => updateStep(idx, toolInput, { color_scheme: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Mood & Atmosphere
                            </Label>
                            <Select
                                value={matchedMood.selected || undefined}
                                onValueChange={(value) =>
                                    updateStep(idx, toolInput, { mood_atmosphere: value })
                                }
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showMoodCustom ? 'Custom mood' : 'Select mood'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {moodOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
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
                const maskOptions = masks.map((mask) => ({
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
                        <Input
                            disabled={isLocked}
                            value={prompt}
                            placeholder="Describe the object to select"
                            className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                            onChange={(e) => updateStep(idx, toolInput, { prompt: e.target.value })}
                        />
                        {maskOptions.length > 0 && (
                            <Select
                                value={selectedPrompt || undefined}
                                onValueChange={(value) => updateStep(idx, toolInput, { prompt: value })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue className="truncate" placeholder="Pick from detected masks" />
                                </SelectTrigger>
                                <SelectContent>
                                    {maskOptions.map((option) => (
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
                                value={maskId || undefined}
                                onValueChange={(val) => updateStep(idx, toolInput, { mask_id: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue className="truncate" placeholder="Select a mask" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masks.map((mask) => (
                                        <SelectItem key={mask.mask_id} value={mask.mask_id}>
                                            {getMaskLabel(mask.mask_id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                disabled={isLocked}
                                value={maskId}
                                placeholder="Mask ID"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onChange={(e) => updateStep(idx, toolInput, { mask_id: e.target.value })}
                            />
                        )}

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Property
                        </Label>
                        <Select
                            value={property || undefined}
                            onValueChange={(val) => updateStep(idx, toolInput, { property: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue className="truncate" placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
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
                                value={matchedValue.selected || undefined}
                                onValueChange={(val) => updateStep(idx, toolInput, { value: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue
                                        className="truncate"
                                        placeholder={showValueCustom ? 'Custom value' : 'Select value'}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {propertyValues.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                disabled={isLocked}
                                value={value}
                                placeholder="Enter value"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onChange={(e) => updateStep(idx, toolInput, { value: e.target.value })}
                            />
                        )}

                        {showValueCustom && (
                            <Input
                                disabled={isLocked}
                                value={matchedValue.custom}
                                placeholder="Custom value"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onChange={(e) => updateStep(idx, toolInput, { value: e.target.value })}
                            />
                        )}

                        {renderGenericFields(idx, toolInput, ['mask_id', 'property', 'value'])}
                    </div>
                );
            }
            case 'adjust_object_image_edit': {
                const maskId = coerceString(toolInput.mask_id ?? '');
                const editType = coerceString(toolInput.edit_type ?? 'brightness');
                const value = parseNumber(toolInput.value, 0);
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
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Mask
                        </Label>
                        {masks.length > 0 ? (
                            <Select
                                value={maskId || undefined}
                                onValueChange={(val) => updateStep(idx, toolInput, { mask_id: val })}
                                disabled={isLocked}
                            >
                                <SelectTrigger className="h-8 text-[11px] truncate">
                                    <SelectValue className="truncate" placeholder="Select a mask" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masks.map((mask) => (
                                        <SelectItem key={mask.mask_id} value={mask.mask_id}>
                                            {getMaskLabel(mask.mask_id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                disabled={isLocked}
                                value={maskId}
                                placeholder="Mask ID"
                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                onChange={(e) => updateStep(idx, toolInput, { mask_id: e.target.value })}
                            />
                        )}

                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Edit Type
                        </Label>
                        <Select
                            value={editType || undefined}
                            onValueChange={(val) => updateStep(idx, toolInput, { edit_type: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue className="truncate" placeholder="Select edit" />
                            </SelectTrigger>
                            <SelectContent>
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
                            <Slider
                                disabled={isLocked}
                                value={[value]}
                                min={range.min}
                                max={range.max}
                                step={1}
                                onValueChange={([val]) => updateStep(idx, toolInput, { value: val })}
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
                const value = parseNumber(toolInput.value, 0);
                return (
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            Value
                        </Label>
                        <div className="px-1">
                            <Slider
                                disabled={isLocked}
                                value={[value]}
                                min={range.min}
                                max={range.max}
                                step={1}
                                onValueChange={([val]) => updateStep(idx, toolInput, { value: val })}
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
                            value={angle || undefined}
                            onValueChange={(val) => updateStep(idx, toolInput, { angle: Number(val) })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue className="truncate" placeholder="Select angle" />
                            </SelectTrigger>
                            <SelectContent>
                                {[0, 90, 180, 270].map((val) => (
                                    <SelectItem key={val} value={String(val)}>
                                        {val}°
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
                            value={axis || undefined}
                            onValueChange={(val) => updateStep(idx, toolInput, { axis: val })}
                            disabled={isLocked}
                        >
                            <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue className="truncate" placeholder="Select axis" />
                            </SelectTrigger>
                            <SelectContent>
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
        <Card className="w-full border-primary/20 bg-primary/5 shadow-md">
            <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80">
                    Proposed Workflow
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
                {steps.map((step, idx) => (
                    <div key={idx} className="relative space-y-3 rounded-lg border border-border/40 bg-background/60 p-4 transition-all hover:border-primary/30">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20">
                                {idx + 1}
                            </span>
                            <div className="space-y-1">
                                <h5 className="text-[13px] font-bold leading-tight text-foreground">{step.step_description}</h5>
                                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">{step.tool_name}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 pl-8">
                            {renderToolInputs(step, idx)}
                        </div>
                    </div>
                ))}

                {!disabled && status !== 'executing' && status !== 'completed' && (
                    <button
                        onClick={onExecute}
                        className="group relative mt-2 w-full overflow-hidden rounded-md bg-primary py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] active:brightness-95"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            <span>Execute Refinement</span>
                        </div>
                        <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    </button>
                )}

                {status === 'executing' && (
                    <div className="flex items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Applying Changes...</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
