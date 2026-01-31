import React from 'react';
import { Slider } from '@/shared/components/ui/slider';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { PlanStep } from '@/core/types';

interface InteractiveParameterEditorProps {
    steps: PlanStep[];
    onUpdateStep: (index: number, updatedInput: Record<string, any>) => void;
    onExecute: () => void;
    disabled?: boolean;
    status?: 'thinking' | 'suggested' | 'executing' | 'completed' | 'failed';
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
                            {Object.entries(step.tool_input).map(([key, value]) => {
                                const isNumeric = typeof value === 'number';
                                return (
                                    <div key={key} className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                {key.replace(/_/g, ' ')}
                                            </Label>
                                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-black text-primary border border-primary/5">
                                                {value}
                                            </span>
                                        </div>

                                        {isNumeric ? (
                                            <Slider
                                                disabled={disabled}
                                                value={[value as number]}
                                                min={0}
                                                max={key === 'shadows' ? 5 : 100}
                                                step={1}
                                                onValueChange={([val]) => onUpdateStep(idx, { ...step.tool_input, [key]: val })}
                                                className="py-1"
                                            />
                                        ) : (
                                            <Input
                                                disabled={disabled}
                                                value={value as string}
                                                className="h-8 bg-background/40 text-[11px] focus-visible:ring-primary/30"
                                                onChange={(e) => onUpdateStep(idx, { ...step.tool_input, [key]: e.target.value })}
                                            />
                                        )}
                                    </div>
                                );
                            })}
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
