import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { wsService } from '@/core/services/wsService';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useFileSystemStore } from '@/core/store/fileSystemStore';
import { useLayoutStore } from '@/core/store/layoutStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { editTracker } from '@/shared/lib/editTracker';
import type { PlanStep, AgentMessage as Message, LightingDirectionValue } from '@/core/types';

interface ChatState {
    messages: Message[];
    isTyping: boolean;
    sessionId: string | null;
    isConnected: boolean;
    awaitingInput: boolean;
    pendingQuery: string | null;

    // Actions
    sendMessage: (query: string) => void;
    executePlan: (msgId: string, overrides?: PlanStep[]) => void;
    updatePlanStep: (msgId: string, stepIdx: number, updatedInput: any) => void;
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

const applyPlanSteps = (steps: PlanStep[]): void => {
    const segmentationStore = useSegmentationStore.getState();
    const imageEditStore = useImageEditStore.getState();

    const results = segmentationStore.results;

    steps.forEach((step) => {
        const input = step.tool_input || {};

        switch (step.tool_name) {
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
                const prompt = String(input.prompt || '').toLowerCase();
                if (!prompt || !results?.masks) break;
                const match = results.masks.find((mask) => {
                    const candidates = [
                        mask.promptObject,
                        mask.promptText,
                        mask.label,
                        mask.objectMetadata?.description,
                    ].filter(Boolean) as string[];
                    return candidates.some((candidate) => candidate.toLowerCase().includes(prompt));
                });
                if (match) {
                    segmentationStore.selectMask(match.mask_id);
                }
                break;
            }
            case 'adjust_object_property': {
                const maskId = String(input.mask_id || '');
                const property = String(input.property || '');
                const value = input.value;
                if (!maskId || !property || value === undefined || !results?.masks) break;
                const index = results.masks.findIndex((mask) => mask.mask_id === maskId);
                if (index >= 0) {
                    const { config } = useConfigStore.getState();
                    const currentObjects = config.objects;
                    const target = currentObjects[index];
                    if (!target) break;

                    const nextObjects = currentObjects.map((obj, idx) =>
                        idx === index ? { ...obj, [property]: value } : obj
                    );
                    useConfigStore.getState().setConfig({ ...config, objects: nextObjects });

                    const objectLabel = results.masks[index]?.promptObject?.trim() || `object ${index + 1}`;
                    editTracker.trackEdit(`objects[${index}].${property}`, target[property as keyof typeof target], value, index, objectLabel);
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

            connect: () => {
                if (get().isConnected) return;
                
                wsService.connect();
                
                const handleAnalysis = (message: any) => {
                    if (message.type === 'analysis') {
                        const payload = message.data || {};
                        const isGeneration = payload.intent === 'generation';
                        const clarificationPrompt = [
                            payload.explanation || 'I can help with a new generation.',
                            'To continue, please clarify the main subject, the background/setting, and the style or lighting you want.'
                        ]
                            .filter(Boolean)
                            .join(' ');

                        set({
                            sessionId: payload.session_id,
                            messages: [
                                ...get().messages,
                                {
                                    id: Date.now().toString(),
                                    role: 'agent',
                                    content: isGeneration ? clarificationPrompt : payload.explanation,
                                    plan: isGeneration ? undefined : payload.plan,
                                    timestamp: new Date(),
                                    status: isGeneration ? 'awaiting_input' : 'suggested'
                                }
                            ],
                            isTyping: false,
                            awaitingInput: isGeneration,
                            pendingQuery: isGeneration ? get().pendingQuery : null
                        });

                    }
                };

                const handleProgress = (message: any) => {
                    if (message.type === 'progress') {
                        console.log('[AgentChat] Progress:', message.data.message);
                    }
                };

                const handleExecutionComplete = (message: any) => {
                    if (message.type === 'execution_complete') {
                        const payload = message.data || {};
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
                        
                        const results = payload.results;
                        const lastResult = results[results.length - 1]?.result;
                        if (lastResult?.image_url) {
                            const configStore = useConfigStore.getState();
                            if (lastResult.structured_prompt) {
                                configStore.updateConfigFromStructuredPrompt(lastResult.structured_prompt);
                            }
                        }
                    }
                };

                const handleError = (message: any) => {
                    if (message.type === 'error') {
                        set({
                            messages: [
                                ...get().messages,
                                {
                                    id: Date.now().toString(),
                                    role: 'agent',
                                    content: `Sorry, I encountered an error: ${message.data.error}`,
                                    timestamp: new Date(),
                                    status: 'failed'
                                }
                            ],
                            isTyping: false
                        });
                    }
                };

                wsService.on('analysis', handleAnalysis);
                wsService.on('progress', handleProgress);
                wsService.on('execution_complete', handleExecutionComplete);
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

                const configStore = useConfigStore.getState();
                const fileSystemStore = useFileSystemStore.getState();
                
                const imageContext = {
                    seed: configStore.sceneConfig.seed || fileSystemStore.currentSeed || 0,
                    structured_prompt: configStore.rawStructuredPrompt || fileSystemStore.originalStructuredPrompt || null
                };

                wsService.send('agentic', {
                    sub_action: 'analyze',
                    query: combinedQuery,
                    session_id: get().sessionId,
                    image_context: imageContext
                });
            },

            executePlan: (msgId: string, overrides?: PlanStep[]) => {
                const { messages } = get();
                const msg = messages.find(m => m.id === msgId);
                const steps = overrides || msg?.plan;
                if (!steps || steps.length === 0) return;

                set({
                    messages: messages.map(m => m.id === msgId ? { ...m, status: 'executing' as const } : m)
                });

                applyPlanSteps(steps);
                const modificationPrompt = editTracker.getModificationPrompt();
                useLayoutStore.getState().workspaceHandlers?.handleRefine?.(modificationPrompt || undefined);

                set({
                    messages: get().messages.map(m => m.id === msgId ? { ...m, status: 'completed' as const } : m),
                    isTyping: false
                });
            },

            updatePlanStep: (msgId: string, stepIdx: number, updatedInput: any) => {
                set({
                    messages: get().messages.map(msg => {
                        if (msg.id === msgId && msg.plan) {
                            const newPlan = [...msg.plan];
                            newPlan[stepIdx] = { ...newPlan[stepIdx], tool_input: updatedInput };
                            return { ...msg, plan: newPlan };
                        }
                        return msg;
                    })
                });
            },
        }),
        { name: 'Penguin Chat Store' }
    )
);
