import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import type { PlanStep, AgentMessage as Message } from '@/core/types';

export type { PlanStep, Message };

export const useAgentChat = () => {
    const {
        messages,
        isTyping,
        sendMessage,
        executePlan,
        executeGenerationDraft,
        polishGenerationDraft,
        resetGenerationDraft,
        updatePlanStep,
        updateGenerationDraft,
        connect
    } = useChatStore();
    
    // Connect to WebSocket on initial hook use
    useEffect(() => {
        connect();
    }, [connect]);

    return {
        messages,
        isTyping,
        sendMessage,
        executePlan,
        executeGenerationDraft,
        polishGenerationDraft,
        resetGenerationDraft,
        updatePlanStep,
        updateGenerationDraft
    };
};
