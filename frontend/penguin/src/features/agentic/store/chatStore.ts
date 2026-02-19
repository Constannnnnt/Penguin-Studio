import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { wsService } from '@/core/services/wsService';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useFileSystemStore } from '@/core/store/fileSystemStore';
import { useLayoutStore } from '@/core/store/layoutStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { editTracker } from '@/shared/lib/editTracker';
import { env } from '@/shared/lib/env';
import type {
    ColorScheme,
    CompositionType,
    GenerationDraft,
    MoodType,
    PlanStep,
    AgentMessage as Message,
    LightingDirectionValue,
    PenguinConfig,
    SceneConfiguration,
    SceneObject,
} from '@/core/types';
import {
    buildPolishedPrompt,
    normalizeGenerationDraft,
} from '../lib/generationDraft';

type PendingGenerationPolish = Record<
    string,
    { autoGenerate: boolean; fallbackPrompt: string }
>;

interface ChatState {
    messages: Message[];
    isTyping: boolean;
    sessionId: string | null;
    isConnected: boolean;
    awaitingInput: boolean;
    pendingQuery: string | null;
    pendingGenerationPolish: PendingGenerationPolish;

    // Actions
    sendMessage: (query: string) => void;
    executePlan: (msgId: string, overrides?: PlanStep[], stepIdx?: number) => void;
    executeGenerationDraft: (msgId: string) => void;
    polishGenerationDraft: (msgId: string, autoGenerate?: boolean) => void;
    resetGenerationDraft: (msgId: string) => void;
    updatePlanStep: (
        msgId: string,
        stepIdx: number,
        updatedInput: Record<string, unknown>
    ) => void;
    updateGenerationDraft: (msgId: string, updatedDraft: GenerationDraft) => void;
    connect: () => void;
    disconnect: () => void;
}

const parseLightingDirectionInput = (
    input: unknown,
    fallback: LightingDirectionValue
): LightingDirectionValue | null => {
    if (!input) return null;

    if (typeof input === 'object') {
        const value = input as Record<string, unknown>;
        const next = { ...fallback };
        let hasAny = false;
        (['x', 'y', 'rotation', 'tilt'] as const).forEach((key) => {
            const raw = value[key];
            if (raw !== undefined && raw !== null) {
                const num = Number(raw);
                if (Number.isFinite(num)) {
                    next[key] = num;
                    hasAny = true;
                }
            }
        });
        return hasAny ? next : null;
    }

    if (typeof input !== 'string') return null;

    const pattern = /(?:^|[,\s])(?<key>x|y|rotation|tilt)\s*[:=]\s*(?<value>-?\d+(?:\.\d+)?)/gi;
    const next = { ...fallback };
    let match: RegExpExecArray | null;
    let hasAny = false;

    while ((match = pattern.exec(input)) !== null) {
        const key = match.groups?.key as keyof LightingDirectionValue | undefined;
        const rawValue = match.groups?.value;
        if (!key || rawValue === undefined) continue;
        const num = Number(rawValue);
        if (!Number.isNaN(num)) {
            next[key] = num;
            hasAny = true;
        }
    }

    if (hasAny) {
        return next;
    }

    const text = input.toLowerCase();
    let changed = false;
    if (text.includes('above') || text.includes('top') || text.includes('overhead')) {
        next.y = 10;
        next.tilt = -40;
        changed = true;
    } else if (text.includes('below') || text.includes('bottom')) {
        next.y = 85;
        next.tilt = 35;
        changed = true;
    }

    if (text.includes('left')) {
        next.x = 20;
        changed = true;
    } else if (text.includes('right')) {
        next.x = 80;
        changed = true;
    }

    if (text.includes('front') || text.includes('forward')) {
        next.tilt = Math.max(next.tilt, -10);
        changed = true;
    }

    if (text.includes('side')) {
        next.rotation = text.includes('right') ? 90 : 270;
        changed = true;
    }

    return changed ? next : null;
};

const cloneValue = <T>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

const DEFAULT_SCENE_OBJECT: SceneObject = {
    description: '',
    location: 'center',
    relative_size: 'medium',
    shape_and_color: '',
    orientation: 'front-facing',
};

const COMPOSITION_OPTIONS: CompositionType[] = [
    'centered',
    'rule-of-thirds',
    'diagonal',
    'symmetrical',
    'asymmetrical',
];
const COLOR_SCHEME_OPTIONS: ColorScheme[] = [
    'vibrant',
    'muted',
    'monochrome',
    'warm',
    'cool',
    'pastel',
    'cinematic',
];
const MOOD_OPTIONS: MoodType[] = [
    'neutral',
    'cheerful',
    'dramatic',
    'serene',
    'mysterious',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const canonicalizeToolName = (toolName: string): string => {
    const normalized = (toolName || '').trim().toLowerCase();
    const aliases: Record<string, string> = {
        object_selection: 'select_object',
        update_camera: 'update_photographic',
        update_photography: 'update_photographic',
        update_lighting_conditions: 'update_lighting',
        update_scene_background: 'update_background',
    };
    return aliases[normalized] || normalized;
};

const asCompositionType = (
    value: unknown,
    fallback: CompositionType
): CompositionType | string => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    return COMPOSITION_OPTIONS.includes(normalized as CompositionType)
        ? (normalized as CompositionType)
        : normalized;
};

const asColorScheme = (value: unknown, fallback: ColorScheme): ColorScheme | string => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    return COLOR_SCHEME_OPTIONS.includes(normalized as ColorScheme)
        ? (normalized as ColorScheme)
        : value.trim();
};

const asMoodType = (value: unknown, fallback: MoodType): MoodType | string => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    return MOOD_OPTIONS.includes(normalized as MoodType)
        ? (normalized as MoodType)
        : value.trim();
};

type SegmentationMaskLike = {
    mask_id: string;
    promptObject?: string;
    promptText?: string;
    label?: string;
    objectMetadata?: {
        description?: string;
    };
};

const OBJECT_METADATA_FIELDS = new Set([
    'description',
    'location',
    'relationship',
    'relative_size',
    'shape_and_color',
    'texture',
    'appearance_details',
    'orientation',
]);

const normalizeObjectProperty = (rawProperty: unknown): string => {
    const normalized = String(rawProperty || '').trim().toLowerCase();
    if (!normalized) return '';

    const aliases: Record<string, string> = {
        appearance: 'appearance_details',
        details: 'appearance_details',
        color: 'shape_and_color',
        shape: 'shape_and_color',
        size: 'relative_size',
        scale: 'relative_size',
        position: 'location',
        placement: 'location',
        angle: 'orientation',
        direction: 'orientation',
        gender: 'description',
        identity: 'description',
        person: 'description',
        character: 'description',
        subject: 'description',
    };
    return aliases[normalized] || normalized;
};

const matchMaskByText = (
    query: string,
    masks: SegmentationMaskLike[]
): number => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || !Array.isArray(masks) || masks.length === 0) return -1;

    const STOP_WORDS = new Set([
        'the',
        'a',
        'an',
        'of',
        'to',
        'in',
        'on',
        'at',
        'and',
        'or',
        'with',
        'for',
    ]);

    const tokenize = (text: string): string[] =>
        text
            .toLowerCase()
            .split(/[^a-z0-9#]+/)
            .map((part) => part.trim())
            .filter((part) => part.length >= 2 && !STOP_WORDS.has(part));

    const hintTokens = tokenize(normalizedQuery);
    if (hintTokens.length === 0) return -1;

    const scoreCandidate = (mask: SegmentationMaskLike): number => {
        const weightedCandidates: Array<{ text: string; weight: number }> = [
            { text: String(mask.promptObject || '').trim().toLowerCase(), weight: 1.0 },
            { text: String(mask.label || '').trim().toLowerCase(), weight: 0.9 },
            { text: String(mask.objectMetadata?.description || '').trim().toLowerCase(), weight: 0.75 },
            { text: String(mask.promptText || '').trim().toLowerCase(), weight: 0.65 },
        ].filter((item) => item.text.length > 0);

        let best = 0;
        weightedCandidates.forEach(({ text, weight }) => {
            if (text === normalizedQuery) {
                best = Math.max(best, 1.2 * weight);
                return;
            }
            if (text.includes(normalizedQuery) || normalizedQuery.includes(text)) {
                best = Math.max(best, 0.95 * weight);
            }

            const candidateTokens = new Set(tokenize(text));
            if (candidateTokens.size === 0) return;
            const overlap = hintTokens.filter((token) => candidateTokens.has(token)).length;
            if (overlap <= 0) return;
            const tokenScore = overlap / Math.max(hintTokens.length, candidateTokens.size);
            best = Math.max(best, tokenScore * weight);
        });

        return best;
    };

    const scored = masks
        .map((mask, index) => ({ index, score: scoreCandidate(mask) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return -1;

    const best = scored[0];
    const second = scored[1];
    const ambiguous =
        second && best.score < 0.72 && Math.abs(best.score - second.score) < 0.08;

    if (ambiguous) return -1;
    if (best.score < 0.34) return -1;
    return best.index;
};

const resolveMaskDisplayLabel = (mask?: SegmentationMaskLike): string => {
    if (!mask) return '';
    const candidates = [
        mask.label,
        mask.promptObject,
        mask.objectMetadata?.description,
        mask.promptText,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string') {
            const cleaned = candidate.trim();
            if (cleaned) return cleaned;
        }
    }
    return '';
};

const resolveMaskIndex = (
    input: Record<string, unknown>,
    masks: SegmentationMaskLike[],
    selectedMaskId?: string | null,
    preferSelectedMask = false
): number => {
    if (!Array.isArray(masks) || masks.length === 0) return -1;

    const objectIndexRaw = input.object_index;
    const indexRaw = input.index;
    if (typeof objectIndexRaw === 'number' && Number.isInteger(objectIndexRaw)) {
        return objectIndexRaw >= 0 && objectIndexRaw < masks.length ? objectIndexRaw : -1;
    }
    if (typeof indexRaw === 'number' && Number.isInteger(indexRaw)) {
        return indexRaw >= 0 && indexRaw < masks.length ? indexRaw : -1;
    }

    const maskId = String(input.mask_id || '').trim();
    if (maskId) {
        const fromMaskId = masks.findIndex((mask) => mask.mask_id === maskId);
        if (fromMaskId >= 0) return fromMaskId;
    }

    if (preferSelectedMask && selectedMaskId) {
        const fromSelected = masks.findIndex((mask) => mask.mask_id === selectedMaskId);
        if (fromSelected >= 0) return fromSelected;
    }

    const objectHints = [
        input.object_name,
        input.prompt,
        input.target_object,
        input.subject,
        input.object,
    ];
    for (const hint of objectHints) {
        if (typeof hint !== 'string' || !hint.trim()) continue;
        const matchIndex = matchMaskByText(hint, masks);
        if (matchIndex >= 0) return matchIndex;
    }

    if (selectedMaskId) {
        const fromSelected = masks.findIndex((mask) => mask.mask_id === selectedMaskId);
        if (fromSelected >= 0) return fromSelected;
    }

    return masks.length === 1 ? 0 : -1;
};

const toPromptValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const buildPlanModificationPrompt = (steps: PlanStep[]): string => {
    const phrases: string[] = [];

    steps.forEach((step) => {
        const input = step.tool_input || {};
        const tool = canonicalizeToolName(step.tool_name);

        if (tool === 'update_aesthetics') {
            if (input.color_scheme !== undefined) {
                phrases.push(`change color palette to ${toPromptValue(input.color_scheme)}`);
            }
            if (input.composition !== undefined) {
                phrases.push(`use ${toPromptValue(input.composition)} composition`);
            }
            const mood = input.mood_atmosphere ?? input.mood;
            if (mood !== undefined) {
                phrases.push(`set mood to ${toPromptValue(mood)}`);
            }
            if (input.style_medium !== undefined) {
                phrases.push(`change style medium to ${toPromptValue(input.style_medium)}`);
            }
            const style = input.aesthetic_style ?? input.artistic_style;
            if (style !== undefined) {
                phrases.push(`make style ${toPromptValue(style)}`);
            }
            return;
        }

        if (tool === 'adjust_object_property') {
            const property = toPromptValue(input.property);
            const value = toPromptValue(input.value);
            if (property && value) {
                const segmentationState = useSegmentationStore.getState();
                const masks = (segmentationState.results?.masks || []) as SegmentationMaskLike[];
                const selectedMask = segmentationState.selectedMaskId
                    ? masks.find((mask) => mask.mask_id === segmentationState.selectedMaskId)
                    : undefined;
                const targetMask = toPromptValue(input.mask_id)
                    ? masks.find((mask) => mask.mask_id === toPromptValue(input.mask_id))
                    : selectedMask;
                const objectName =
                    toPromptValue(input.object_name) ||
                    toPromptValue(input.prompt) ||
                    toPromptValue(input.target_object) ||
                    resolveMaskDisplayLabel(targetMask) ||
                    'the selected object';
                phrases.push(`change ${objectName} ${property.replace(/_/g, ' ')} to ${value}`);
            }
            return;
        }

        if (tool === 'update_background') {
            const background = toPromptValue(input.background_setting ?? input.setting);
            if (background) {
                phrases.push(`change background to ${background}`);
            }
            return;
        }

        if (tool === 'update_lighting') {
            if (input.conditions !== undefined) {
                phrases.push(`change lighting to ${toPromptValue(input.conditions)}`);
            }
            if (input.shadows !== undefined) {
                phrases.push(`set shadows to ${toPromptValue(input.shadows)}`);
            }
            return;
        }

        if (tool === 'update_photographic') {
            if (input.camera_angle !== undefined) {
                phrases.push(`change camera angle to ${toPromptValue(input.camera_angle)}`);
            }
            if (input.lens_focal_length !== undefined) {
                phrases.push(`use ${toPromptValue(input.lens_focal_length)} lens`);
            }
            if (input.depth_of_field !== undefined) {
                phrases.push(`set depth of field to ${toPromptValue(input.depth_of_field)}`);
            }
            if (input.focus !== undefined) {
                phrases.push(`set focus to ${toPromptValue(input.focus)}`);
            }
            return;
        }

        if (step.step_description && step.step_description.trim()) {
            phrases.push(step.step_description.trim());
        }
    });

    const unique = Array.from(new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean)));
    return unique.join(', ');
};

const toUiOptions = (input: unknown): Record<string, string[]> | undefined => {
    if (!isRecord(input)) return undefined;

    const options: Record<string, string[]> = {};
    for (const [rawKey, rawValue] of Object.entries(input)) {
        const key = String(rawKey || '').trim();
        if (!key) continue;

        const candidates: string[] = [];
        if (Array.isArray(rawValue)) {
            rawValue.forEach((item) => {
                if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
                    const text = String(item).trim();
                    if (text) candidates.push(text);
                }
            });
        } else if (typeof rawValue === 'string') {
            rawValue
                .split(/[\n,;]+/)
                .map((part) => part.trim())
                .filter(Boolean)
                .forEach((part) => candidates.push(part));
        }

        if (candidates.length > 0) {
            const deduped = Array.from(
                new Set(candidates.map((value) => value.toLowerCase()))
            ).map((value) => {
                const original = candidates.find((item) => item.toLowerCase() === value);
                return original || value;
            });
            options[key] = deduped.slice(0, 12);
        }
    }

    return Object.keys(options).length > 0 ? options : undefined;
};

const toPlanSteps = (input: unknown): PlanStep[] => {
    if (!Array.isArray(input)) return [];

    const steps: PlanStep[] = [];
    for (const rawStep of input) {
        if (!isRecord(rawStep)) continue;
        const toolName = typeof rawStep.tool_name === 'string' ? rawStep.tool_name : '';
        if (!toolName) continue;

        const toolInput = isRecord(rawStep.tool_input) ? rawStep.tool_input : {};
        const uiOptions = toUiOptions(rawStep.ui_options);
        const stepDescription =
            typeof rawStep.step_description === 'string' && rawStep.step_description.trim()
                ? rawStep.step_description
                : `Apply ${toolName.replace(/_/g, ' ')}.`;

        steps.push({
            tool_name: canonicalizeToolName(toolName),
            tool_input: toolInput,
            step_description: stepDescription,
            ui_options: uiOptions,
        });
    }

    return steps;
};

const derivePlanConfig = (
    steps: PlanStep[],
    baseConfig: PenguinConfig,
    baseSceneConfig: SceneConfiguration
): { config: PenguinConfig; sceneConfig: SceneConfiguration } => {
    const config = cloneValue(baseConfig);
    const sceneConfig = cloneValue(baseSceneConfig);
    const segmentationResults = useSegmentationStore.getState().results;

    const ensureObject = (index: number): void => {
        if (!config.objects[index]) {
            config.objects[index] = { ...DEFAULT_SCENE_OBJECT };
        }
    };

    let selectedMaskId: string | null = useSegmentationStore.getState().selectedMaskId;

    steps.forEach((step) => {
        const input = step.tool_input || {};
        const canonicalToolName = canonicalizeToolName(step.tool_name);

        switch (canonicalToolName) {
            case 'update_lighting': {
                if (input.conditions !== undefined) {
                    sceneConfig.lighting.conditions = String(input.conditions);
                }
                if (input.shadows !== undefined) {
                    const next = Number(input.shadows);
                    if (!Number.isNaN(next)) {
                        sceneConfig.lighting.shadows = next as SceneConfiguration['lighting']['shadows'];
                    }
                }
                const currentDirection = sceneConfig.lighting.direction;
                const parsedDirection = parseLightingDirectionInput(input.direction, currentDirection);
                if (parsedDirection) {
                    sceneConfig.lighting.direction = parsedDirection;
                } else if (
                    input.direction_x !== undefined ||
                    input.direction_y !== undefined ||
                    input.rotation !== undefined ||
                    input.tilt !== undefined
                ) {
                    sceneConfig.lighting.direction = {
                        ...currentDirection,
                        x:
                            input.direction_x !== undefined
                                ? Number(input.direction_x)
                                : currentDirection.x,
                        y:
                            input.direction_y !== undefined
                                ? Number(input.direction_y)
                                : currentDirection.y,
                        rotation:
                            input.rotation !== undefined
                                ? Number(input.rotation)
                                : currentDirection.rotation,
                        tilt:
                            input.tilt !== undefined ? Number(input.tilt) : currentDirection.tilt,
                    };
                }
                break;
            }
            case 'update_photographic': {
                if (input.depth_of_field !== undefined) {
                    sceneConfig.photographic_characteristics.depth_of_field = Number(
                        input.depth_of_field
                    );
                }
                if (input.focus !== undefined) {
                    sceneConfig.photographic_characteristics.focus = Number(input.focus);
                }
                if (input.camera_angle !== undefined) {
                    sceneConfig.photographic_characteristics.camera_angle = String(input.camera_angle);
                }
                if (input.lens_focal_length !== undefined) {
                    sceneConfig.photographic_characteristics.lens_focal_length = String(
                        input.lens_focal_length
                    );
                }
                break;
            }
            case 'update_aesthetics': {
                if (input.composition !== undefined) {
                    sceneConfig.aesthetics.composition = asCompositionType(
                        input.composition,
                        sceneConfig.aesthetics.composition
                    ) as SceneConfiguration['aesthetics']['composition'];
                }
                if (input.color_scheme !== undefined) {
                    sceneConfig.aesthetics.color_scheme = asColorScheme(
                        input.color_scheme,
                        sceneConfig.aesthetics.color_scheme
                    ) as SceneConfiguration['aesthetics']['color_scheme'];
                }
                if (input.mood_atmosphere !== undefined) {
                    sceneConfig.aesthetics.mood_atmosphere = asMoodType(
                        input.mood_atmosphere,
                        sceneConfig.aesthetics.mood_atmosphere
                    ) as SceneConfiguration['aesthetics']['mood_atmosphere'];
                } else if (input.mood !== undefined) {
                    sceneConfig.aesthetics.mood_atmosphere = asMoodType(
                        input.mood,
                        sceneConfig.aesthetics.mood_atmosphere
                    ) as SceneConfiguration['aesthetics']['mood_atmosphere'];
                }
                if (input.style_medium !== undefined) {
                    sceneConfig.aesthetics.style_medium = String(input.style_medium);
                }
                const nextAestheticStyle = input.aesthetic_style ?? input.artistic_style;
                if (nextAestheticStyle !== undefined) {
                    sceneConfig.aesthetics.aesthetic_style = String(nextAestheticStyle);
                }
                break;
            }
            case 'update_background': {
                if (input.background_setting !== undefined) {
                    sceneConfig.background_setting = String(input.background_setting);
                } else if (input.setting !== undefined) {
                    sceneConfig.background_setting = String(input.setting);
                }
                break;
            }
            case 'adjust_object_property': {
                const property = normalizeObjectProperty(input.property);
                if (!property) break;
                const index = resolveMaskIndex(
                    input,
                    (segmentationResults?.masks || []) as SegmentationMaskLike[],
                    selectedMaskId,
                    true
                );

                if (index < 0) break;
                ensureObject(index);
                const objectEntry = config.objects[index] as unknown as Record<string, unknown>;
                objectEntry[property] = input.value;
                const matchedMask = segmentationResults?.masks?.[index];
                if (matchedMask?.mask_id) {
                    selectedMaskId = matchedMask.mask_id;
                }
                break;
            }
            case 'select_object': {
                if (!segmentationResults?.masks || segmentationResults.masks.length === 0) break;
                const prompt = String(input.prompt || input.object_name || '').toLowerCase();
                if (!prompt) break;
                const matchIndex = matchMaskByText(
                    prompt,
                    segmentationResults.masks as SegmentationMaskLike[]
                );
                if (matchIndex >= 0) {
                    selectedMaskId = segmentationResults.masks[matchIndex].mask_id;
                }
                break;
            }
            default:
                break;
        }
    });

    config.background_setting = sceneConfig.background_setting;
    config.aspect_ratio = sceneConfig.aspect_ratio || config.aspect_ratio;
    config.lighting = { ...config.lighting, ...sceneConfig.lighting };
    config.photographic_characteristics = {
        ...config.photographic_characteristics,
        ...sceneConfig.photographic_characteristics,
    };
    config.aesthetics = { ...config.aesthetics, ...sceneConfig.aesthetics };

    if (sceneConfig.aesthetics?.style_medium) {
        config.style_medium = sceneConfig.aesthetics.style_medium;
    }
    if (sceneConfig.aesthetics?.aesthetic_style) {
        config.artistic_style =
            sceneConfig.aesthetics.aesthetic_style as PenguinConfig['artistic_style'];
    }

    return { config, sceneConfig };
};

const applyPlanSteps = (steps: PlanStep[]): void => {
    const segmentationStore = useSegmentationStore.getState();
    const imageEditStore = useImageEditStore.getState();

    const results = segmentationStore.results;
    let selectedMaskId: string | null = segmentationStore.selectedMaskId;

    steps.forEach((step) => {
        const input = step.tool_input || {};
        const canonicalToolName = canonicalizeToolName(step.tool_name);

        switch (canonicalToolName) {
            case 'update_lighting': {
                const { updateSceneConfig, sceneConfig } = useConfigStore.getState();
                if (input.conditions !== undefined) {
                    updateSceneConfig('lighting.conditions', input.conditions);
                }
                if (input.shadows !== undefined) {
                    updateSceneConfig('lighting.shadows', Number(input.shadows));
                }
                const currentDirection = sceneConfig.lighting.direction;
                const parsedDirection = parseLightingDirectionInput(input.direction, currentDirection);

                if (parsedDirection) {
                    updateSceneConfig('lighting.direction', parsedDirection);
                } else if (
                    input.direction_x !== undefined ||
                    input.direction_y !== undefined ||
                    input.rotation !== undefined ||
                    input.tilt !== undefined
                ) {
                    const nextDirection = {
                        ...currentDirection,
                        x: input.direction_x !== undefined ? Number(input.direction_x) : currentDirection.x,
                        y: input.direction_y !== undefined ? Number(input.direction_y) : currentDirection.y,
                        rotation: input.rotation !== undefined ? Number(input.rotation) : currentDirection.rotation,
                        tilt: input.tilt !== undefined ? Number(input.tilt) : currentDirection.tilt,
                    };
                    updateSceneConfig('lighting.direction', nextDirection);
                }
                break;
            }
            case 'update_photographic': {
                const { updateSceneConfig } = useConfigStore.getState();
                if (input.depth_of_field !== undefined) {
                    updateSceneConfig('photographic_characteristics.depth_of_field', Number(input.depth_of_field));
                }
                if (input.focus !== undefined) {
                    updateSceneConfig('photographic_characteristics.focus', Number(input.focus));
                }
                if (input.camera_angle !== undefined) {
                    updateSceneConfig('photographic_characteristics.camera_angle', input.camera_angle);
                }
                if (input.lens_focal_length !== undefined) {
                    updateSceneConfig('photographic_characteristics.lens_focal_length', input.lens_focal_length);
                }
                break;
            }
            case 'update_aesthetics': {
                const { updateSceneConfig } = useConfigStore.getState();
                if (input.composition !== undefined) {
                    updateSceneConfig('aesthetics.composition', input.composition);
                }
                if (input.color_scheme !== undefined) {
                    updateSceneConfig('aesthetics.color_scheme', input.color_scheme);
                }
                if (input.mood_atmosphere !== undefined) {
                    updateSceneConfig('aesthetics.mood_atmosphere', input.mood_atmosphere);
                } else if (input.mood !== undefined) {
                    updateSceneConfig('aesthetics.mood_atmosphere', input.mood);
                }
                if (input.style_medium !== undefined) {
                    updateSceneConfig('aesthetics.style_medium', input.style_medium);
                }
                const nextAestheticStyle = input.aesthetic_style ?? input.artistic_style;
                if (nextAestheticStyle !== undefined) {
                    updateSceneConfig('aesthetics.aesthetic_style', nextAestheticStyle);
                }
                break;
            }
            case 'update_background': {
                const { updateSceneConfig } = useConfigStore.getState();
                if (input.background_setting !== undefined) {
                    updateSceneConfig('background_setting', input.background_setting);
                } else if (input.setting !== undefined) {
                    updateSceneConfig('background_setting', input.setting);
                }
                break;
            }
            case 'select_object': {
                const prompt = String(input.prompt || input.object_name || '').toLowerCase();
                if (!prompt || !results?.masks) break;
                const index = matchMaskByText(prompt, results.masks as SegmentationMaskLike[]);
                if (index >= 0) {
                    const matchedMask = results.masks[index];
                    selectedMaskId = matchedMask.mask_id;
                    segmentationStore.selectMask(matchedMask.mask_id);
                }
                break;
            }
            case 'adjust_object_property': {
                const property = normalizeObjectProperty(input.property);
                const value = input.value;
                if (!property || value === undefined || !results?.masks) break;
                const index = resolveMaskIndex(
                    input,
                    results.masks as SegmentationMaskLike[],
                    selectedMaskId,
                    true
                );
                if (index >= 0) {
                    const targetMask = results.masks[index];
                    if (targetMask?.mask_id) {
                        selectedMaskId = targetMask.mask_id;
                    }
                    const { config } = useConfigStore.getState();
                    const currentObjects = config.objects;
                    const target = currentObjects[index] || { ...DEFAULT_SCENE_OBJECT };

                    const nextObjects = currentObjects.map((obj, idx) =>
                        idx === index ? { ...obj, [property]: value } : obj
                    );
                    if (!currentObjects[index]) {
                        nextObjects[index] = { ...DEFAULT_SCENE_OBJECT, [property]: value };
                    }
                    useConfigStore.getState().setConfig({ ...config, objects: nextObjects });

                    if (targetMask?.mask_id && OBJECT_METADATA_FIELDS.has(property)) {
                        segmentationStore.updateMaskMetadata(targetMask.mask_id, {
                            [property]: String(value),
                        });
                    }

                    const objectLabel =
                        resolveMaskDisplayLabel(results.masks[index] as SegmentationMaskLike) ||
                        `object ${index + 1}`;
                    editTracker.trackEdit(
                        `objects[${index}].${property}`,
                        target[property as keyof typeof target],
                        value,
                        index,
                        objectLabel
                    );
                }
                break;
            }
            case 'adjust_object_image_edit': {
                const maskId = String(input.mask_id || '');
                const editType = String(input.edit_type || '');
                if (!maskId || !editType) break;
                segmentationStore.applyImageEditToMask(maskId, { [editType]: Number(input.value) });
                break;
            }
            case 'set_global_brightness':
                if (input.value !== undefined) imageEditStore.setBrightness(Number(input.value));
                break;
            case 'set_global_contrast':
                if (input.value !== undefined) imageEditStore.setContrast(Number(input.value));
                break;
            case 'set_global_saturation':
                if (input.value !== undefined) imageEditStore.setSaturation(Number(input.value));
                break;
            case 'set_global_exposure':
                if (input.value !== undefined) imageEditStore.setExposure(Number(input.value));
                break;
            case 'set_global_vibrance':
                if (input.value !== undefined) imageEditStore.setVibrance(Number(input.value));
                break;
            case 'set_global_hue':
                if (input.value !== undefined) imageEditStore.setHue(Number(input.value));
                break;
            case 'set_global_blur':
                if (input.value !== undefined) imageEditStore.setBlur(Number(input.value));
                break;
            case 'set_global_sharpen':
                if (input.value !== undefined) imageEditStore.setSharpen(Number(input.value));
                break;
            case 'set_global_rotation':
                if (input.angle !== undefined) imageEditStore.setRotation(Number(input.angle));
                break;
            case 'toggle_global_flip':
                if (input.axis === 'horizontal') {
                    imageEditStore.toggleFlipHorizontal();
                } else if (input.axis === 'vertical') {
                    imageEditStore.toggleFlipVertical();
                }
                break;
            default:
                break;
        }
    });
};

const areInputsEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (!areInputsEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if (!isRecord(a) || !isRecord(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!areInputsEqual(a[key], b[key])) return false;
    }
    return true;
};

const triggerGenerationFromPrompt = (prompt: string): void => {
    const workspaceHandlers = useLayoutStore.getState().workspaceHandlers;
    if (workspaceHandlers?.handleGenerateFromPrompt) {
        workspaceHandlers.handleGenerateFromPrompt(prompt);
        return;
    }
    workspaceHandlers?.handleGenerate?.(prompt);
};

const toSafeText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const buildLiveStructuredPrompt = (
    configStoreState: ReturnType<typeof useConfigStore.getState>,
    segmentationState: ReturnType<typeof useSegmentationStore.getState>
): Record<string, unknown> | null => {
    const { config, sceneConfig } = configStoreState;
    const shortDescription = toSafeText(config.short_description);
    const backgroundSetting = toSafeText(
        sceneConfig.background_setting ?? config.background_setting
    );

    const objectsFromConfig = Array.isArray(config.objects) ? config.objects : [];
    const objects =
        objectsFromConfig.length > 0
            ? objectsFromConfig.map((obj) => ({
                description: toSafeText(obj.description),
                location: toSafeText(obj.location || 'center'),
                relationship: toSafeText(obj.relationship),
                relative_size: toSafeText(obj.relative_size || 'medium'),
                shape_and_color: toSafeText(obj.shape_and_color),
                texture: toSafeText(obj.texture),
                appearance_details: toSafeText(obj.appearance_details),
                orientation: toSafeText(obj.orientation || 'front-facing'),
                pose: obj.pose ? toSafeText(obj.pose) : undefined,
                expression: obj.expression ? toSafeText(obj.expression) : undefined,
                action: obj.action ? toSafeText(obj.action) : undefined,
                number_of_objects: 1,
            }))
            : (segmentationState.results?.masks || []).map((mask, index) => ({
                description: toSafeText(
                    mask.objectMetadata?.description || mask.promptObject || mask.label || `object ${index + 1}`
                ),
                location: toSafeText(mask.objectMetadata?.location || 'center'),
                relationship: toSafeText(mask.objectMetadata?.relationship),
                relative_size: toSafeText(mask.objectMetadata?.relative_size || 'medium'),
                shape_and_color: toSafeText(mask.objectMetadata?.shape_and_color),
                texture: toSafeText(mask.objectMetadata?.texture),
                appearance_details: toSafeText(mask.objectMetadata?.appearance_details),
                orientation: toSafeText(mask.objectMetadata?.orientation || 'front-facing'),
                number_of_objects: 1,
            }));

    const hasContext =
        shortDescription.length > 0 ||
        backgroundSetting.length > 0 ||
        objects.length > 0;
    if (!hasContext) {
        return null;
    }

    const lightingSource = config.lighting || sceneConfig.lighting;
    const direction = lightingSource?.direction || sceneConfig.lighting.direction;
    const shadows =
        sceneConfig.lighting.shadows ??
        lightingSource?.shadows ??
        2;

    const styleMedium = toSafeText(config.style_medium ?? sceneConfig.aesthetics.style_medium);
    const artisticStyle = toSafeText(config.artistic_style ?? sceneConfig.aesthetics.aesthetic_style);
    const context = toSafeText(config.context);

    const structuredPrompt: Record<string, unknown> = {
        short_description: shortDescription,
        objects,
        background_setting: backgroundSetting,
        lighting: {
            conditions: toSafeText(sceneConfig.lighting.conditions ?? lightingSource?.conditions),
            direction: `x:${Number(direction?.x ?? 50)}, y:${Number(direction?.y ?? 50)}, rotation:${Number(direction?.rotation ?? 0)}, tilt:${Number(direction?.tilt ?? 0)}`,
            shadows: String(shadows),
        },
        aesthetics: {
            composition: toSafeText(sceneConfig.aesthetics.composition ?? config.aesthetics.composition),
            color_scheme: toSafeText(sceneConfig.aesthetics.color_scheme ?? config.aesthetics.color_scheme),
            mood_atmosphere: toSafeText(sceneConfig.aesthetics.mood_atmosphere ?? config.aesthetics.mood_atmosphere),
            preference_score: '',
            aesthetic_score: '',
        },
        photographic_characteristics: {
            camera_angle: toSafeText(
                sceneConfig.photographic_characteristics.camera_angle ??
                config.photographic_characteristics.camera_angle
            ),
            lens_focal_length: toSafeText(
                sceneConfig.photographic_characteristics.lens_focal_length ??
                config.photographic_characteristics.lens_focal_length
            ),
            depth_of_field: String(
                sceneConfig.photographic_characteristics.depth_of_field ??
                config.photographic_characteristics.depth_of_field ??
                50
            ),
            focus: String(
                sceneConfig.photographic_characteristics.focus ??
                config.photographic_characteristics.focus ??
                75
            ),
        },
        style_medium: styleMedium,
        artistic_style: artisticStyle,
    };

    if (context) {
        structuredPrompt.context = context;
    }

    return structuredPrompt;
};

const mergeStructuredPrompt = (
    basePrompt: Record<string, unknown> | null,
    overridePrompt: Record<string, unknown> | null
): Record<string, unknown> | null => {
    if (!basePrompt && !overridePrompt) return null;
    if (!basePrompt) return overridePrompt;
    if (!overridePrompt) return basePrompt;

    const merged: Record<string, unknown> = {
        ...basePrompt,
        ...overridePrompt,
    };

    const nestedKeys = ['lighting', 'aesthetics', 'photographic_characteristics'] as const;
    nestedKeys.forEach((key) => {
        const baseValue = basePrompt[key];
        const overrideValue = overridePrompt[key];
        if (isRecord(baseValue) || isRecord(overrideValue)) {
            merged[key] = {
                ...(isRecord(baseValue) ? baseValue : {}),
                ...(isRecord(overrideValue) ? overrideValue : {}),
            };
        }
    });

    if (Array.isArray(overridePrompt.objects)) {
        merged.objects = overridePrompt.objects;
    } else if (Array.isArray(basePrompt.objects)) {
        merged.objects = basePrompt.objects;
    }

    return merged;
};

const buildAgentImageContext = (): {
    seed: number;
    structured_prompt: Record<string, unknown> | null;
    source_image: string | null;
    mask: string | null;
    generation_id: string | null;
    selected_mask_id: string | null;
    masks_catalog: Array<{ mask_id: string; label: string; prompt_text?: string; description?: string }> | null;
} => {
    const configStore = useConfigStore.getState();
    const fileSystemStore = useFileSystemStore.getState();
    const segmentationState = useSegmentationStore.getState();

    const hasVisualContext = Boolean(
        fileSystemStore.selectedFileUrl ||
        fileSystemStore.currentGenerationId ||
        segmentationState.results?.original_image_url
    );

    const liveStructuredPrompt = buildLiveStructuredPrompt(configStore, segmentationState);
    const baseStructuredPrompt = isRecord(configStore.rawStructuredPrompt)
        ? configStore.rawStructuredPrompt
        : (isRecord(fileSystemStore.originalStructuredPrompt)
            ? fileSystemStore.originalStructuredPrompt
            : null);
    const mergedStructuredPrompt = mergeStructuredPrompt(
        baseStructuredPrompt,
        liveStructuredPrompt
    );

    const sourceImage = (
        segmentationState.results?.original_image_url ||
        fileSystemStore.selectedFileUrl ||
        (fileSystemStore.currentGenerationId
            ? `${env.apiBaseUrl}/outputs/${fileSystemStore.currentGenerationId}/generated.png`
            : null)
    );

    const selectedMaskId = segmentationState.selectedMaskId;
    const selectedMask = selectedMaskId && segmentationState.results
        ? segmentationState.results.masks.find((mask) => mask.mask_id === selectedMaskId)
        : undefined;
    const selectedMaskUrl = selectedMask?.mask_url || null;
    const coerceSeed = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    };
    const fileSeed = coerceSeed(fileSystemStore.currentSeed);
    const sceneSeed = coerceSeed(configStore.sceneConfig.seed);

    return {
        seed: hasVisualContext ? (fileSeed ?? sceneSeed ?? 0) : 0,
        structured_prompt: hasVisualContext ? mergedStructuredPrompt : null,
        source_image: hasVisualContext ? sourceImage : null,
        mask: hasVisualContext ? selectedMaskUrl : null,
        generation_id: hasVisualContext ? fileSystemStore.currentGenerationId : null,
        selected_mask_id: hasVisualContext ? selectedMaskId || null : null,
        masks_catalog: hasVisualContext && segmentationState.results?.masks?.length
            ? segmentationState.results.masks.map((m) => ({
                  mask_id: m.mask_id,
                  label: m.label,
                  prompt_text: m.promptText,
                  description: m.objectMetadata?.description ?? m.promptObject,
              }))
            : null,
    };
};

export const useChatStore = create<ChatState>()(
    devtools(
        (set, get) => ({
            messages: [
                {
                    id: '1',
                    role: 'agent',
                    content: 'Hello! I am Penguin AI. How can I help you refine your product photography today?',
                    timestamp: new Date(),
                }
            ],
            isTyping: false,
            sessionId: null,
            isConnected: false,
            awaitingInput: false,
            pendingQuery: null,
            pendingGenerationPolish: {},

            connect: () => {
                if (get().isConnected) return;
                
                wsService.connect();
                
                const handleAnalysis = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'analysis') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                    const suggestedPlan = toPlanSteps(payload.plan);
                    const hasSuggestedPlan = suggestedPlan.length > 0;
                    const isGeneration = payload.intent === 'generation' && !hasSuggestedPlan;
                    const pendingQuery = get().pendingQuery || '';
                    const generationDraft = isGeneration
                        ? normalizeGenerationDraft(payload.generation_draft, pendingQuery)
                        : undefined;

                    const generationMessage = [
                        typeof payload.explanation === 'string'
                            ? payload.explanation
                            : 'I prepared an initial generation draft from your request.',
                        'Adjust the values, then click "Rethink My Prompt" to reconstruct the final prompt.'
                    ]
                        .filter(Boolean)
                        .join(' ');

                    set({
                        sessionId:
                            typeof payload.session_id === 'string'
                                ? payload.session_id
                                : null,
                        messages: [
                            ...get().messages,
                            {
                                id: Date.now().toString(),
                                role: 'agent',
                                content:
                                    isGeneration
                                        ? generationMessage
                                        : (
                                            typeof payload.explanation === 'string'
                                                ? payload.explanation
                                                : 'I prepared a refinement plan for your request.'
                                        ),
                                plan: hasSuggestedPlan ? suggestedPlan : undefined,
                                generation_draft: generationDraft,
                                initial_generation_draft: generationDraft
                                    ? { ...generationDraft }
                                    : undefined,
                                source_query: isGeneration ? pendingQuery : undefined,
                                timestamp: new Date(),
                                status: isGeneration ? 'awaiting_input' : 'suggested'
                            }
                        ],
                        isTyping: false,
                        awaitingInput: isGeneration,
                        pendingQuery: isGeneration ? pendingQuery : null
                    });
                };

                const handleProgress = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'progress') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                    const progressMessage =
                        typeof payload.message === 'string' ? payload.message : '';
                    if (progressMessage) {
                        console.log('[AgentChat] Progress:', progressMessage);
                    }
                };

                const handleExecutionComplete = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'execution_complete') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                        set({
                            messages: [
                                ...get().messages,
                                {
                                    id: Date.now().toString(),
                                    role: 'agent',
                                    content: "Execution complete. I've applied the changes to your workspace.",
                                    timestamp: new Date(),
                                    status: 'completed'
                                }
                            ]
                        });

                        const results = Array.isArray(payload.results) ? payload.results : [];
                        const lastEntry = results.length > 0 ? results[results.length - 1] : null;
                        const lastResult = isRecord(lastEntry) && isRecord(lastEntry.result)
                            ? lastEntry.result
                            : null;

                        if (lastResult && typeof lastResult.image_url === 'string') {
                            const configStore = useConfigStore.getState();
                            if (isRecord(lastResult.structured_prompt)) {
                                configStore.updateConfigFromStructuredPrompt(lastResult.structured_prompt);
                            }
                        }
                };

                const handleGenerationPolished = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'generation_polished') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                    const msgId = typeof payload.msg_id === 'string' ? payload.msg_id : '';
                    if (!msgId) return;

                    const state = get();
                    const target = state.messages.find((item) => item.id === msgId);
                    const fallbackQuery =
                        (typeof target?.source_query === 'string' && target.source_query.trim())
                            ? target.source_query
                            : (state.pendingQuery || '');

                    const polishedDraft = normalizeGenerationDraft(payload.generation_draft, fallbackQuery);
                    const polishedPrompt = polishedDraft.polished_prompt || buildPolishedPrompt(polishedDraft);
                    const autoGenerate = Boolean(payload.auto_generate);

                    const nextPending = { ...state.pendingGenerationPolish };
                    delete nextPending[msgId];

                    set({
                        pendingGenerationPolish: nextPending,
                        awaitingInput: !autoGenerate,
                        isTyping: false,
                        messages: state.messages.map((item) =>
                            item.id === msgId
                                ? {
                                    ...item,
                                    generation_draft: { ...polishedDraft, polished_prompt: polishedPrompt },
                                    status: autoGenerate ? ('executing' as const) : ('awaiting_input' as const),
                                }
                                : item
                        ),
                    });

                    if (autoGenerate) {
                        triggerGenerationFromPrompt(polishedPrompt);
                        set({
                            messages: get().messages.map((item) =>
                                item.id === msgId ? { ...item, status: 'completed' as const } : item
                            ),
                        });
                    }
                };

                const handleGenerationPolishFailed = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'generation_polish_failed') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                    const msgId = typeof payload.msg_id === 'string' ? payload.msg_id : '';
                    if (!msgId) return;

                    const state = get();
                    const pending = state.pendingGenerationPolish[msgId];
                    const autoGenerate = pending?.autoGenerate ?? Boolean(payload.auto_generate);
                    const target = state.messages.find((item) => item.id === msgId);
                    const draft = target?.generation_draft;
                    const fallbackPrompt =
                        pending?.fallbackPrompt ||
                        (draft ? buildPolishedPrompt(draft) : '');

                    const nextPending = { ...state.pendingGenerationPolish };
                    delete nextPending[msgId];

                    if (autoGenerate && fallbackPrompt) {
                        triggerGenerationFromPrompt(fallbackPrompt);
                    }

                    set({
                        pendingGenerationPolish: nextPending,
                        awaitingInput: !autoGenerate,
                        isTyping: false,
                        messages: state.messages.map((item) =>
                            item.id === msgId
                                ? {
                                    ...item,
                                    generation_draft: item.generation_draft
                                        ? { ...item.generation_draft, polished_prompt: fallbackPrompt }
                                        : item.generation_draft,
                                    status: autoGenerate ? ('completed' as const) : ('awaiting_input' as const),
                                }
                                : item
                        ),
                    });
                };

                const handleError = (message: unknown) => {
                    if (!isRecord(message) || message.type !== 'error') {
                        return;
                    }

                    const payload = isRecord(message.data) ? message.data : {};
                    const errorText =
                        typeof payload.error === 'string' ? payload.error : 'Unknown error';

                    if (
                        errorText.toLowerCase().includes('unknown agentic sub_action') &&
                        errorText.toLowerCase().includes('polish_generation')
                    ) {
                        const state = get();
                        const pendingEntries = Object.entries(state.pendingGenerationPolish);
                        const lastPending = pendingEntries[pendingEntries.length - 1];
                        if (lastPending) {
                            const [msgId, pending] = lastPending;
                            const fallbackPrompt = pending.fallbackPrompt;
                            const nextPending = { ...state.pendingGenerationPolish };
                            delete nextPending[msgId];

                            if (pending.autoGenerate && fallbackPrompt) {
                                triggerGenerationFromPrompt(fallbackPrompt);
                            }

                            set({
                                pendingGenerationPolish: nextPending,
                                awaitingInput: !pending.autoGenerate,
                                isTyping: false,
                                messages: state.messages.map((item) =>
                                    item.id === msgId
                                        ? {
                                            ...item,
                                            generation_draft: item.generation_draft
                                                ? {
                                                    ...item.generation_draft,
                                                    polished_prompt: fallbackPrompt,
                                                }
                                                : item.generation_draft,
                                            status: pending.autoGenerate
                                                ? ('completed' as const)
                                                : ('awaiting_input' as const),
                                        }
                                        : item
                                ),
                            });
                            return;
                        }
                    }

                    set({
                        messages: [
                            ...get().messages,
                            {
                                id: Date.now().toString(),
                                role: 'agent',
                                content: `Sorry, I encountered an error: ${errorText}`,
                                timestamp: new Date(),
                                status: 'failed'
                            }
                        ],
                        isTyping: false
                    });
                };

                wsService.on('analysis', handleAnalysis);
                wsService.on('progress', handleProgress);
                wsService.on('execution_complete', handleExecutionComplete);
                wsService.on('generation_polished', handleGenerationPolished);
                wsService.on('generation_polish_failed', handleGenerationPolishFailed);
                wsService.on('error', handleError);

                set({ isConnected: true });
            },

            disconnect: () => {
                // In a real app we might not want to fully disconnect if we want persistence
                // but let's at least mark it
                set({ isConnected: false });
            },

            sendMessage: (query: string) => {
                if (!get().isConnected) {
                    get().connect();
                }

                const awaitingInput = get().awaitingInput;
                const pendingQuery = get().pendingQuery;
                const combinedQuery = awaitingInput && pendingQuery
                    ? `${pendingQuery}\n\nClarification: ${query}`
                    : query;

                const userMsg: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: query,
                    timestamp: new Date(),
                };
                
                set({
                    messages: [...get().messages, userMsg],
                    isTyping: true,
                    awaitingInput: false,
                    pendingQuery: combinedQuery
                });
                const imageContext = buildAgentImageContext();

                wsService.send('agentic', {
                    sub_action: 'analyze',
                    query: combinedQuery,
                    session_id: get().sessionId,
                    image_context: imageContext
                });
            },

            executePlan: (msgId: string, overrides?: PlanStep[], stepIdx?: number) => {
                const { messages } = get();
                const msg = messages.find(m => m.id === msgId);
                const sourceSteps = overrides || msg?.plan;
                if (!sourceSteps || sourceSteps.length === 0) return;

                const hasSingleStepRequest = typeof stepIdx === 'number' && Number.isInteger(stepIdx);
                const selectedStep = hasSingleStepRequest ? sourceSteps[stepIdx as number] : undefined;
                const steps = selectedStep ? [selectedStep] : sourceSteps;
                if (steps.length === 0) return;

                set({
                    messages: messages.map(m => m.id === msgId ? { ...m, status: 'executing' as const } : m)
                });

                const configStore = useConfigStore.getState();
                const baseConfig = configStore.config;
                const { config: planConfig } = derivePlanConfig(
                    steps,
                    baseConfig,
                    configStore.sceneConfig
                );

                // Build modification prompt strictly from this execution's edits.
                editTracker.clearEdits();
                applyPlanSteps(steps);
                const trackedModificationPrompt = editTracker.getModificationPrompt();
                const planDerivedPrompt = buildPlanModificationPrompt(steps);
                const modificationPrompt = trackedModificationPrompt || planDerivedPrompt;
                const hasConfigDelta = !areInputsEqual(baseConfig, planConfig);
                const serverRefineTools = new Set([
                    'update_background',
                    'update_lighting',
                    'update_photographic',
                    'update_aesthetics',
                    'adjust_object_property',
                ]);
                const needsServerRefine = steps.some((step) =>
                    serverRefineTools.has(canonicalizeToolName(String(step.tool_name || '')))
                );
                const hasModificationPrompt =
                    typeof modificationPrompt === 'string' && modificationPrompt.trim().length > 0;
                const workspaceHandlers = useLayoutStore.getState().workspaceHandlers;
                if (needsServerRefine && (hasConfigDelta || hasModificationPrompt)) {
                    if (workspaceHandlers?.handleRefineWithConfig) {
                        workspaceHandlers.handleRefineWithConfig(planConfig, modificationPrompt || undefined);
                    } else {
                        workspaceHandlers?.handleRefine?.(modificationPrompt || undefined);
                    }
                }

                set({
                    messages: get().messages.map(m => m.id === msgId ? { ...m, status: 'completed' as const } : m),
                    isTyping: false
                });
            },

            polishGenerationDraft: (msgId: string, autoGenerate = false) => {
                if (!get().isConnected) {
                    get().connect();
                }
                const { messages } = get();
                const msg = messages.find((item) => item.id === msgId);
                const draft = msg?.generation_draft;
                if (!draft) return;

                const polishedPrompt = buildPolishedPrompt(draft);
                const query =
                    (typeof msg.source_query === 'string' && msg.source_query.trim())
                        ? msg.source_query.trim()
                        : (get().pendingQuery || '').trim();
                const imageContext = buildAgentImageContext();

                // Sync generation draft fields into the structured prompt
                // so the backend sees a consistent view of user adjustments
                if (imageContext.structured_prompt || draft) {
                    const sp = (imageContext.structured_prompt ?? {}) as Record<string, unknown>;
                    sp.short_description = draft.main_subject ?? sp.short_description;
                    sp.background_setting = draft.background_setting ?? sp.background_setting;
                    sp.style_medium = draft.style_or_medium ?? sp.style_medium;
                    if (draft.lighting && typeof sp.lighting === 'object' && sp.lighting) {
                        (sp.lighting as Record<string, unknown>).conditions = draft.lighting;
                    } else if (draft.lighting) {
                        sp.lighting = { conditions: draft.lighting };
                    }
                    if (draft.extra_details) {
                        sp.context = draft.extra_details;
                    }
                    imageContext.structured_prompt = sp;
                }

                const safeQuery = query || polishedPrompt;

                set({
                    messages: messages.map((item) =>
                        item.id === msgId
                            ? {
                                ...item,
                                generation_draft: { ...draft, polished_prompt: polishedPrompt },
                                status: 'executing' as const,
                            }
                            : item
                    ),
                    awaitingInput: false,
                    isTyping: false,
                    pendingGenerationPolish: {
                        ...get().pendingGenerationPolish,
                        [msgId]: {
                            autoGenerate,
                            fallbackPrompt: polishedPrompt,
                        },
                    },
                });

                wsService.send('agentic', {
                    sub_action: 'polish_generation',
                    query: safeQuery,
                    generation_draft: draft,
                    image_context: imageContext,
                    msg_id: msgId,
                    auto_generate: autoGenerate,
                });
            },

            executeGenerationDraft: (msgId: string) => {
                const { messages } = get();
                const msg = messages.find((item) => item.id === msgId);
                const draft = msg?.generation_draft;
                if (!draft) return;

                const polishedPrompt = draft.polished_prompt || buildPolishedPrompt(draft);

                set({
                    messages: messages.map((item) =>
                        item.id === msgId
                            ? {
                                ...item,
                                generation_draft: { ...draft, polished_prompt: polishedPrompt },
                                status: 'executing' as const,
                            }
                            : item
                    ),
                    awaitingInput: false,
                    isTyping: false,
                });

                triggerGenerationFromPrompt(polishedPrompt);

                set({
                    messages: get().messages.map((item) =>
                        item.id === msgId ? { ...item, status: 'completed' as const } : item
                    ),
                });
            },

            resetGenerationDraft: (msgId: string) => {
                set((state) => {
                    let changed = false;
                    const nextMessages = state.messages.map((msg) => {
                        if (msg.id !== msgId || !msg.generation_draft) {
                            return msg;
                        }

                        const resetTo = msg.initial_generation_draft
                            ? { ...msg.initial_generation_draft }
                            : normalizeGenerationDraft(msg.generation_draft, msg.source_query || '');

                        const nextDraft = {
                            ...resetTo,
                            polished_prompt: buildPolishedPrompt(resetTo),
                        };

                        if (areInputsEqual(msg.generation_draft, nextDraft)) {
                            return msg;
                        }

                        changed = true;
                        return {
                            ...msg,
                            generation_draft: nextDraft,
                            status: 'awaiting_input' as const,
                        };
                    });

                    if (!changed) {
                        return state;
                    }

                    return {
                        messages: nextMessages,
                        awaitingInput: true,
                    };
                });
            },

            updatePlanStep: (
                msgId: string,
                stepIdx: number,
                updatedInput: Record<string, unknown>
            ) => {
                set((state) => {
                    let didChange = false;
                    const nextMessages = state.messages.map((msg) => {
                        if (msg.id === msgId && msg.plan) {
                            const existing = msg.plan[stepIdx];
                            if (existing && areInputsEqual(existing.tool_input, updatedInput)) {
                                return msg;
                            }
                            const newPlan = [...msg.plan];
                            newPlan[stepIdx] = { ...newPlan[stepIdx], tool_input: updatedInput };
                            didChange = true;
                            return { ...msg, plan: newPlan };
                        }
                        return msg;
                    });
                    if (!didChange) return state;
                    return { messages: nextMessages };
                });
            },

            updateGenerationDraft: (msgId: string, updatedDraft: GenerationDraft) => {
                set((state) => {
                    let didChange = false;
                    const nextMessages = state.messages.map((msg) => {
                        if (msg.id !== msgId) {
                            return msg;
                        }
                        const nextDraft = {
                            ...updatedDraft,
                            polished_prompt: buildPolishedPrompt(updatedDraft),
                        };
                        if (areInputsEqual(msg.generation_draft, nextDraft)) {
                            return msg;
                        }
                        didChange = true;
                        return { ...msg, generation_draft: nextDraft };
                    });
                    if (!didChange) return state;
                    return { messages: nextMessages };
                });
            },
        }),
        { name: 'Penguin Chat Store' }
    )
);
