import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { InteractiveParameterEditor } from './InteractiveParameterEditor';
import { useAgentChat, type Message } from '../hooks/useAgentChat';
import { PanelHeader } from '@/shared/components/layout/PanelHeader';
import { ModeToggle } from '@/shared/components/layout/ModeToggle';

export const AgentChatInterface: React.FC = () => {
    const {
        messages,
        isTyping,
        sendMessage,
        executePlan,
        updatePlanStep
    } = useAgentChat();

    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleExecutePlan = (msgId: string) => {
        executePlan(msgId);
    };

    return (
        <div className="flex h-full flex-col bg-background/40 backdrop-blur-sm">
            <PanelHeader
                title="Penguin Chat"
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

                                <span className="px-2 text-[10px] font-medium text-muted-foreground opacity-50">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
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

            {/* Input Area */}
            <div className="border-t border-border/50 p-3 bg-background/80 backdrop-blur">
                <div className="w-full">
                    <div className="relative flex items-center gap-2 rounded-xl bg-muted/30 p-1 pl-3 transition-all focus-within:ring-2 focus-within:ring-primary/20">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask Penguin to refine your image..."
                            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/50"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim()}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground/40 tracking-tight">
                        Try: <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setInput("Add dramatic lighting with soft shadows")}>"Add dramatic lighting with soft shadows"</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
