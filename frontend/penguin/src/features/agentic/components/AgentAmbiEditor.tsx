import React from 'react';
import { FieldRenderer, defaultWidgets } from '@fibo-ui/ui';
import type { WidgetRegistry } from '@fibo-ui/ui';
import { getToolSchema } from './agentToolSchemas';
import type { EditorSchema, FieldSchema } from '@fibo-ui/core';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';
import type { LightingDirectionValue } from '@/core/types';

type ToolInput = Record<string, unknown>;

interface WidgetAdapterProps {
  value: unknown;
  onChange: (value: unknown) => void;
  schema: FieldSchema;
}

const DEFAULT_LIGHTING_DIRECTION: LightingDirectionValue = {
  x: 50,
  y: 50,
  rotation: 0,
  tilt: 0,
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

const asLightingDirection = (value: unknown): LightingDirectionValue => {
  if (!value || typeof value !== 'object') return DEFAULT_LIGHTING_DIRECTION;
  const raw = value as Partial<LightingDirectionValue>;
  return {
    x: toNumber(raw.x, DEFAULT_LIGHTING_DIRECTION.x),
    y: toNumber(raw.y, DEFAULT_LIGHTING_DIRECTION.y),
    rotation: toNumber(raw.rotation, DEFAULT_LIGHTING_DIRECTION.rotation),
    tilt: toNumber(raw.tilt, DEFAULT_LIGHTING_DIRECTION.tilt),
  };
};

const SliderAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <PerformantSlider
      value={toNumber(value)}
      onValueChange={(nextValue) => onChange(nextValue)}
      min={schema.type === 'number' ? schema.min : undefined}
      max={schema.type === 'number' ? schema.max : undefined}
      step={schema.type === 'number' ? schema.step : undefined}
    />
  </div>
);

const InputAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <PerformantInput
      value={toStringValue(value)}
      onValueCommit={(nextValue) => onChange(nextValue)}
      className="h-8 bg-background/40 text-[11px]"
    />
  </div>
);

const TextareaAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">{schema.label}</label>}
    <Textarea
      value={toStringValue(value)}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background/40 text-[11px]"
    />
  </div>
);

const SelectAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <Select value={toStringValue(value)} onValueChange={(nextValue) => onChange(nextValue)}>
      <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent className="industrial-panel">
        {schema.type === 'string' && schema.enum?.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const LightingDirectionAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => (
  <div className="space-y-2 mb-4">
    {schema.label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{schema.label}</label>}
    <LightingDirectionControl
      value={asLightingDirection(value)}
      onChange={(nextDirection) => onChange(nextDirection)}
      compact
    />
  </div>
);

const BackgroundPickerAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => {
  const options = ['studio', 'outdoor', 'urban', 'interior'];
  const safeValue = toStringValue(value);

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

const asWidget = (component: React.FC<WidgetAdapterProps>) =>
  component as unknown as WidgetRegistry[string];

const customWidgets: WidgetRegistry = {
  'slider': asWidget(SliderAdapter),
  'text': asWidget(InputAdapter),
  'textarea': asWidget(TextareaAdapter),
  'select': asWidget(SelectAdapter),
  'lighting-direction': asWidget(LightingDirectionAdapter),
  'background-picker': asWidget(BackgroundPickerAdapter),
};

const registry = { ...defaultWidgets, ...customWidgets };

export const AgentAmbiEditor: React.FC<{
  toolName: string;
  toolInput: ToolInput;
  onUpdate: (data: ToolInput) => void;
}> = ({ toolName, toolInput, onUpdate }) => {
  const schema = getToolSchema(toolName, toolInput) as EditorSchema;
  const safeInput = toolInput || {};

  return (
    <div className="space-y-6">
      {Object.entries(schema).map(([key, fieldSchema]) => (
        <FieldRenderer
          key={key}
          path={key}
          schema={fieldSchema}
          value={safeInput[key as keyof typeof safeInput]}
          onChange={(value) => onUpdate({ ...safeInput, [key]: value })}
          registry={registry}
        />
      ))}
    </div>
  );
};
