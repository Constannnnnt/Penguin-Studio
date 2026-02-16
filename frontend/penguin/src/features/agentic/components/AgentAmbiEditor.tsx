import React from 'react';
import { FormProvider, useForm, FieldRenderer, defaultWidgets } from '@fibo-ui/ui';
import type { WidgetRegistry } from '@fibo-ui/ui';
import { getToolSchema } from './agentToolSchemas';
import type { EditorSchema, FormConfig } from '@fibo-ui/core';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';

const SliderAdapter = ({ value, onChange, schema }: any) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <PerformantSlider value={value} onValueChange={onChange} min={schema.min} max={schema.max} step={schema.step} />
  </div>
);

const InputAdapter = ({ value, onChange, schema }: any) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <PerformantInput value={value} onValueCommit={onChange} className="h-8 bg-background/40 text-[11px]" />
  </div>
);

const TextareaAdapter = ({ value, onChange, schema }: any) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">{schema.label}</label>}
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-background/40 text-[11px]" />
  </div>
);

const SelectAdapter = ({ value, onChange, schema }: any) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
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

const LightingDirectionAdapter = ({ value, onChange, schema }: any) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <LightingDirectionControl value={value} onChange={onChange} compact />
  </div>
);

const BackgroundPickerAdapter = ({ value, onChange, schema }: any) => {
  const options = ['studio', 'outdoor', 'urban', 'interior'];
  const safeValue = value || '';

  return (
    <div className="space-y-4 mb-4">
      {schema.label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">{schema.label}</label>}
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

export const AgentAmbiEditor: React.FC<{
  toolName: string;
  toolInput: any;
  onUpdate: (data: any) => void;
}> = ({ toolName, toolInput, onUpdate }) => {
  const schema = getToolSchema(toolName) as EditorSchema;

  const config: FormConfig = {
    initialData: toolInput,
    onChange: onUpdate,
  };

  const form = useForm(config);

  return (
    <FormProvider config={config}>
      <div className="space-y-6">
        {Object.entries(schema).map(([key, fieldSchema]) => (
          <FieldRenderer
            key={key}
            path={key}
            schema={fieldSchema}
            value={form.data[key as keyof typeof form.data]}
            onChange={(value) => form.setField(key, value)}
            registry={registry}
          />
        ))}
      </div>
    </FormProvider>
  );
};
