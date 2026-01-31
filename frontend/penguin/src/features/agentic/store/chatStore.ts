import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { wsService } from '@/core/services/wsService';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useFileSystemStore } from '@/core/store/fileSystemStore';
import type { PlanStep, AgentMessage as Message } from '@/core/types';

interface ChatState {
    messages: Message[];
    isTyping: boolean;
    sessionId: string | null;
    isConnected: boolean;

    // Actions
    sendMessage: (query: string) => void;
    executePlan: (msgId: string, overrides?: PlanStep[]) => void;
    updatePlanStep: (msgId: string, stepIdx: number, updatedInput: any) => void;
    connect: () => void;
    disconnect: () => void;
}

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

            connect: () => {
                if (get().isConnected) return;
                
                wsService.connect();
                
                const handleAnalysis = (message: any) => {
                    if (message.type === 'analysis') {
                        set({
                            sessionId: message.session_id,
                            messages: [
                                ...get().messages,
                                {
                                    id: Date.now().toString(),
                                    role: 'agent',
                                    content: message.explanation,
                                    plan: message.plan,
                                    timestamp: new Date(),
                                    status: 'suggested'
                                }
                            ],
                            isTyping: false
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
                        
                        const results = message.results;
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
                const userMsg: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: query,
                    timestamp: new Date(),
                };
                
                set({
                    messages: [...get().messages, userMsg],
                    isTyping: true
                });

                const configStore = useConfigStore.getState();
                const fileSystemStore = useFileSystemStore.getState();
                
                const imageContext = {
                    seed: configStore.sceneConfig.seed || fileSystemStore.currentSeed || 0,
                    structured_prompt: configStore.rawStructuredPrompt || fileSystemStore.originalStructuredPrompt || null
                };

                wsService.send('agentic', {
                    sub_action: 'analyze',
                    query,
                    session_id: get().sessionId,
                    image_context: imageContext
                });
            },

            executePlan: (msgId: string, overrides?: PlanStep[]) => {
                const { messages, sessionId } = get();
                const msg = messages.find(m => m.id === msgId);
                if (!sessionId) return;

                set({
                    messages: messages.map(m => m.id === msgId ? { ...m, status: 'executing' as const } : m)
                });
                
                wsService.send('agentic', {
                    sub_action: 'execute',
                    session_id: sessionId,
                    overrides: overrides || msg?.plan
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
