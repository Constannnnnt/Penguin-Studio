import React from 'react';
import { FormProvider, useForm, FieldRenderer, defaultWidgets } from '@fibo-ui/ui';
import type { WidgetRegistry } from '@fibo-ui/ui';
import { getToolSchema } from './agentToolSchemas';
import type { EditorSchema, FormConfig } from '@fibo-ui/core';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanSlider } from './PlanSlider';

const SliderAdapter = ({ value, onChange, schema, label }: any) => (
  <div className="space-y-2 mb-4">
    {label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</label>}
    <PlanSlider
      value={value ?? schema.default ?? 0}
      onValueChange={onChange}
      min={schema.min}
      max={schema.max}
      step={schema.step}
    />
  </div>
);

const InputAdapter = ({ value, onChange, schema, label }: any) => (
  <div className="space-y-2 mb-4">
    {label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</label>}
    <PerformantInput value={value} onValueCommit={onChange} className="h-8 bg-background/40 text-[11px]" />
  </div>
);

const TextareaAdapter = ({ value, onChange, schema, label }: any) => (
  <div className="space-y-2 mb-4">
    {label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">{label}</label>}
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-background/40 text-[11px]" />
  </div>
);

const SelectAdapter = ({ value, onChange, schema, label }: any) => (
  <div className="space-y-2 mb-4">
    {label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</label>}
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent className="industrial-panel">
        {schema.enum?.map((opt: string) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const LightingDirectionAdapter = ({ value, onChange, schema, label }: any) => (
  <div className="space-y-2 mb-4">
    {label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</label>}
    <LightingDirectionControl value={value} onChange={onChange} compact />
  </div>
);

const BackgroundPickerAdapter = ({ value, onChange, schema, label }: any) => {
  const options = ['studio', 'outdoor', 'urban', 'interior'];
  const safeValue = value || '';

  return (
    <div className="space-y-4 mb-4">
      {label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">{label}</label>}
      <div className="grid grid-cols-4 gap-2">
        {options.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`overflow-hidden rounded-md border-2 transition-all ${safeValue.toLowerCase().includes(s) ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'}`}
          >
            <div className="h-10 w-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground uppercase">{s}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const customWidgets: WidgetRegistry = {
  'slider': SliderAdapter,
  'text': InputAdapter,
  'textarea': TextareaAdapter,
  'select': SelectAdapter,
  'lighting-direction': LightingDirectionAdapter,
  'background-picker': BackgroundPickerAdapter,
};

const registry = { ...defaultWidgets, ...customWidgets };

interface InteractiveParameterEditorProps {
  steps: any[];
  onUpdateStep: (idx: number, toolInput: any) => void;
  onExecute: (idx: number) => void;
  disabled?: boolean;
  status?: string;
}

export const InteractiveParameterEditor: React.FC<InteractiveParameterEditorProps> = ({
  steps,
  onUpdateStep,
  onExecute,
  disabled = false,
  status
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [expandedSteps, setExpandedSteps] = React.useState<Record<number, boolean>>(() =>
    steps.reduce((acc, _, i) => ({ ...acc, [i]: i === 0 }), {})
  );

  if (!steps || steps.length === 0) return null;

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const isLocked = disabled || status === 'executing';

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
                        className="rounded-lg border border-border/40 bg-background/20 overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-background/30 transition-colors"
                          onClick={() => toggleStep(idx)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary/80">
                              {idx + 1}.
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {step.tool_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExecute(idx);
                                }}
                                className="text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                              >
                                Run
                              </button>
                            )}
                            {isStepExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          {isStepExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-3 pb-3 border-t border-border/20">
                                <ToolParameterEditor
                                  key={`editor-${idx}`}
                                  toolName={step.tool_name}
                                  toolInput={step.tool_input || {}}
                                  onUpdate={(updatedInput) => onUpdateStep(idx, updatedInput)}
                                  disabled={isLocked}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

interface ToolParameterEditorProps {
  toolName: string;
  toolInput: any;
  onUpdate: (toolInput: any) => void;
  disabled?: boolean;
}

const ToolParameterEditor: React.FC<ToolParameterEditorProps> = ({
  toolName,
  toolInput,
  onUpdate,
  disabled = false,
}) => {
  const schema = getToolSchema(toolName);

  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-background/50 px-3 py-2 text-[11px] text-muted-foreground">
        No parameters for {toolName}
      </div>
    );
  }

  const config: FormConfig = {
    initialData: toolInput,
    onChange: onUpdate,
  };

  const form = useForm(config);

  return (
    <div className="space-y-4 mt-3">
      {Object.entries(schema).map(([key, fieldSchema]) => (
        <FieldRenderer
          key={key}
          path={key}
          schema={fieldSchema}
          value={form.data[key as keyof typeof form.data]}
          onChange={(value) => form.setField(key, value)}
          registry={registry}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
