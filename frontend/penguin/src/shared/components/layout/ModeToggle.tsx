import React from 'react';
import { Edit2, MessageSquare } from 'lucide-react';
import { useLayoutStore } from '@/core/store/layoutStore';

export const ModeToggle: React.FC = () => {
    const { activeMode, setActiveMode } = useLayoutStore();

    return (
        <div className="flex h-8 items-center rounded-lg bg-muted/40 p-1 border border-border/40">
            <button
                onClick={() => setActiveMode('edit')}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] uppercase font-black tracking-widest transition-all ${activeMode === 'edit'
                    ? 'bg-background shadow-sm text-primary'
                    : 'text-muted-foreground/60 hover:text-foreground/80'
                    }`}
            >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
            </button>
            <button
                onClick={() => setActiveMode('chat')}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] uppercase font-black tracking-widest transition-all ${activeMode === 'chat'
                    ? 'bg-background shadow-sm text-primary'
                    : 'text-muted-foreground/60 hover:text-foreground/80'
                    }`}
            >
                <MessageSquare className="h-3 w-3" />
                <span>Chat</span>
            </button>
        </div>
    );
};
