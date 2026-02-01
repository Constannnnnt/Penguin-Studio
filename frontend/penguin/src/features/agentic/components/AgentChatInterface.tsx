import React, { useRef, useEffect } from 'react';
import { User, Bot } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { InteractiveParameterEditor } from './InteractiveParameterEditor';
import { useAgentChat, type Message } from '../hooks/useAgentChat';
import { PanelHeader } from '@/shared/components/layout/PanelHeader';
import { ModeToggle } from '@/shared/components/layout/ModeToggle';

export const AgentChatInterface: React.FC = () => {
    const {
        messages,
        isTyping,
        executePlan,
        updatePlanStep
    } = useAgentChat();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleExecutePlan = (msgId: string) => {
        executePlan(msgId);
    };

    return (
        <div className="flex h-full flex-col bg-background/40 backdrop-blur-sm">
            <PanelHeader
                title=""
                position="right"
                actions={<ModeToggle />}
            />

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-3 py-10" ref={scrollRef}>
                <div className="flex flex-col gap-5 pt-4">
                    {messages.map((msg: Message) => (
                        <div
                            key={msg.id}
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${msg.role === 'user' ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'
                                }`}>
                                {msg.role === 'user' ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
                            </div>

                            <div className={`flex flex-col gap-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-card border border-border/50 text-card-foreground rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>

                                {msg.plan && (
                                    <InteractiveParameterEditor
                                        steps={msg.plan}
                                        onUpdateStep={(idx, input) => updatePlanStep(msg.id, idx, input)}
                                        onExecute={() => handleExecutePlan(msg.id)}
                                        status={msg.status}
                                    />
                                )}

                                <div className="flex items-center gap-2 px-2 text-[10px] font-medium text-muted-foreground opacity-50">
                                    <span>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.status === 'awaiting_input' && (
                                        <span className="rounded bg-muted/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Awaiting Input
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                                <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-1 rounded-2xl bg-card border border-border/50 px-4 py-3">
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" />
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="h-4" />
        </div>
    );
};
