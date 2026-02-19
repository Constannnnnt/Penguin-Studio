import React from 'react';
import { FieldRenderer, defaultWidgets } from '@fibo-ui/ui';
import type { WidgetRegistry } from '@fibo-ui/ui';
import type { FieldSchema } from '@fibo-ui/core';
import { getToolSchema } from './agentToolSchemas';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { LightingDirectionControl } from '@/features/scene/components/LightingDirectionControl';
import { CameraGuideViewport } from '@/shared/components/camera/CameraGuideViewport';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanSlider } from './PlanSlider';
import type { LightingDirectionValue, PlanStep } from '@/core/types';

type ToolInput = Record<string, unknown>;

interface WidgetAdapterProps {
  value: unknown;
  onChange: (value: unknown) => void;
  schema: FieldSchema;
  label?: string;
}

const DEFAULT_LIGHTING_DIRECTION: LightingDirectionValue = {
  x: 50,
  y: 50,
  rotation: 0,
  tilt: 0,
};

const canonicalizeToolName = (toolName: string): string => {
  const normalizedToolName = (toolName || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    update_camera: 'update_photographic',
    update_photography: 'update_photographic',
    update_lighting_conditions: 'update_lighting',
    update_scene_background: 'update_background',
  };
  return aliases[normalizedToolName] || normalizedToolName;
};

const TOOL_TITLES: Record<string, string> = {
  update_background: 'Background Settings',
  update_lighting: 'Lighting Settings',
  update_photographic: 'Camera Settings',
  update_aesthetics: 'Aesthetic Settings',
  select_object: 'Object Selection',
  adjust_object_property: 'Object Properties',
  adjust_object_image_edit: 'Object Image Edit',
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  update_lighting: 'Set lighting condition, direction, and shadow intensity.',
  update_photographic: 'Set angle, lens, depth of field, and focus sharpness.',
};

const toTitleCase = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getToolTitle = (toolName: string): string => {
  const canonicalToolName = canonicalizeToolName(toolName);
  return TOOL_TITLES[canonicalToolName] || toTitleCase(canonicalToolName);
};

const getToolDescription = (toolName: string): string | null => {
  const canonicalToolName = canonicalizeToolName(toolName);
  return TOOL_DESCRIPTIONS[canonicalToolName] || null;
};

const getFieldTitle = (key: string, fieldSchema: FieldSchema): string => {
  const schemaLabel = (fieldSchema as unknown as { label?: unknown }).label;
  if (typeof schemaLabel === 'string' && schemaLabel.trim()) {
    return schemaLabel;
  }
  return toTitleCase(key);
};

const getFieldDescription = (fieldSchema: FieldSchema): string | null => {
  const schemaDescription = (fieldSchema as unknown as { description?: unknown }).description;
  if (typeof schemaDescription === 'string' && schemaDescription.trim()) {
    return schemaDescription;
  }
  return null;
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

const parseLightingDirectionString = (value: string): LightingDirectionValue | null => {
  const pattern = /(?:^|[,\s])(?<key>x|y|rotation|tilt)\s*[:=]\s*(?<value>-?\d+(?:\.\d+)?)/gi;
  const next: LightingDirectionValue = { ...DEFAULT_LIGHTING_DIRECTION };
  let match: RegExpExecArray | null;
  let hasAny = false;
  while ((match = pattern.exec(value)) !== null) {
    const key = match.groups?.key as keyof LightingDirectionValue | undefined;
    const rawValue = match.groups?.value;
    if (!key || rawValue === undefined) continue;
    const num = Number(rawValue);
    if (!Number.isNaN(num)) {
      next[key] = num;
      hasAny = true;
    }
  }
  return hasAny ? next : null;
};

const normalizePlanToolInput = (toolName: string, toolInput: ToolInput): ToolInput => {
  const canonicalToolName = canonicalizeToolName(toolName);
  const next: ToolInput = { ...(toolInput || {}) };

  if (canonicalToolName === 'update_lighting') {
    if (typeof next.conditions === 'string') {
      next.conditions = next.conditions.trim().toLowerCase();
    }

    if (typeof next.shadows === 'string') {
      const parsed = Number(next.shadows);
      if (Number.isFinite(parsed)) {
        next.shadows = parsed;
      }
    }

    if (typeof next.direction === 'string') {
      const parsed = parseLightingDirectionString(next.direction);
      if (parsed) {
        next.direction = parsed;
      }
    }

    if (!next.direction && (
      next.direction_x !== undefined ||
      next.direction_y !== undefined ||
      next.rotation !== undefined ||
      next.tilt !== undefined
    )) {
      next.direction = {
        x: toNumber(next.direction_x, DEFAULT_LIGHTING_DIRECTION.x),
        y: toNumber(next.direction_y, DEFAULT_LIGHTING_DIRECTION.y),
        rotation: toNumber(next.rotation, DEFAULT_LIGHTING_DIRECTION.rotation),
        tilt: toNumber(next.tilt, DEFAULT_LIGHTING_DIRECTION.tilt),
      };
    }
  }

  if (canonicalToolName === 'update_photographic') {
    const cameraMap: Record<string, string> = {
      'eye level': 'eye-level',
      'eye-level': 'eye-level',
      'bird\'s eye': 'overhead',
      overhead: 'overhead',
      'low angle': 'low-angle',
      'low-angle': 'low-angle',
      'high angle': 'high-angle',
      'high-angle': 'high-angle',
      'worm\'s eye': 'low-angle',
    };
    if (typeof next.camera_angle === 'string') {
      const key = next.camera_angle.trim().toLowerCase();
      next.camera_angle = cameraMap[key] || key;
    }

    if (typeof next.lens_focal_length === 'string') {
      const lens = next.lens_focal_length.trim().toLowerCase();
      next.lens_focal_length = lens;
    }
  }

  if (canonicalToolName === 'update_aesthetics') {
    if (typeof next.composition === 'string') {
      next.composition = next.composition.trim().toLowerCase().replace(/\s+/g, '-');
    }
    if (typeof next.color_scheme === 'string') {
      const trimmed = next.color_scheme.trim();
      const looksLikePalette =
        trimmed.includes('#') ||
        /(?:rgb|hsl)a?\(/i.test(trimmed) ||
        (trimmed.includes(',') && /[0-9a-f]/i.test(trimmed));
      next.color_scheme = looksLikePalette ? trimmed : trimmed.toLowerCase();
    }
    if (typeof next.mood_atmosphere === 'string') {
      next.mood_atmosphere = next.mood_atmosphere.trim();
    }
    if (typeof next.mood === 'string' && !next.mood_atmosphere) {
      next.mood_atmosphere = next.mood.trim();
    }
    if (typeof next.style_medium === 'string') {
      next.style_medium = next.style_medium.trim();
    }
    if (typeof next.aesthetic_style === 'string') {
      next.aesthetic_style = next.aesthetic_style.trim();
    }
    if (typeof next.artistic_style === 'string') {
      next.artistic_style = next.artistic_style.trim();
    }
  }

  if (canonicalToolName === 'adjust_object_property') {
    if (typeof next.property === 'string') {
      next.property = next.property.trim().toLowerCase().replace(/\s+/g, '_');
    }
    if (typeof next.value === 'string') {
      next.value = next.value.trim();
    }
  }

  return next;
};

const SliderAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => {
  const defaultValue =
    schema && typeof schema.default === 'number' ? schema.default : 0;
  const min =
    schema && schema.type === 'number' && typeof schema.min === 'number'
      ? schema.min
      : undefined;
  const max =
    schema && schema.type === 'number' && typeof schema.max === 'number'
      ? schema.max
      : undefined;
  const step =
    schema && schema.type === 'number' && typeof schema.step === 'number'
      ? schema.step
      : undefined;

  return (
  <div className="space-y-2 mb-4">
    <PlanSlider
      value={toNumber(value, defaultValue)}
      onValueChange={(nextValue) => onChange(nextValue)}
      min={min}
      max={max}
      step={step}
    />
  </div>
  );
};

const TextInputWithSuggestionsAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => {
  const currentValue = toStringValue(value).trim();
  const suggestions =
    schema && schema.type === 'string' && Array.isArray(schema.enum)
      ? schema.enum.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
      : [];

  return (
    <div className="space-y-2 mb-4">
      <PerformantInput
        value={toStringValue(value)}
        onValueCommit={(nextValue) => onChange(nextValue)}
        className="h-8 bg-background/40 text-[11px]"
      />
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((option) => {
            const active = option.trim().toLowerCase() === currentValue.toLowerCase();
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                  active
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const TextareaAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange }) => (
  <div className="space-y-2 mb-4">
    <Textarea
      value={toStringValue(value)}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background/40 text-[11px]"
    />
  </div>
);

const SelectAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange, schema }) => {
  const rawOptions =
    schema && schema.type === 'string' && Array.isArray(schema.enum) ? schema.enum : [];
  const currentValue = toStringValue(value).trim();
  const options = [...rawOptions];
  if (
    currentValue &&
    !options.some((opt) => String(opt).toLowerCase() === currentValue.toLowerCase())
  ) {
    options.unshift(currentValue);
  }

  return (
  <div className="space-y-2 mb-4">
    <Select value={toStringValue(value)} onValueChange={(nextValue) => onChange(nextValue)}>
      <SelectTrigger className="h-9 text-[11px] studio-blur bg-background/40">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent className="industrial-panel">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  );
};

const LightingDirectionAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange }) => (
  <div className="space-y-2 mb-4">
    <LightingDirectionControl
      value={asLightingDirection(value)}
      onChange={(nextDirection) => onChange(nextDirection)}
      compact
    />
  </div>
);

const BackgroundPickerAdapter: React.FC<WidgetAdapterProps> = ({ value, onChange }) => {
  const options = ['studio', 'outdoor', 'urban', 'interior'];
  const safeValue = toStringValue(value);

  return (
    <div className="space-y-4 mb-4">
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
  'text': asWidget(TextInputWithSuggestionsAdapter),
  'textarea': asWidget(TextareaAdapter),
  'select': asWidget(SelectAdapter),
  'lighting-direction': asWidget(LightingDirectionAdapter),
  'background-picker': asWidget(BackgroundPickerAdapter),
};

const registry = { ...defaultWidgets, ...customWidgets };

interface InteractiveParameterEditorProps {
  steps: PlanStep[];
  onUpdateStep: (idx: number, toolInput: ToolInput) => void;
  onExecute: (idx?: number) => void;
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
                    const stepTitle = getToolTitle(step.tool_name);
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
                              {stepTitle}
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
                                  toolSuggestions={step.ui_options || {}}
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
              {!isLocked && (
                <div className="pt-1">
                  <button
                    onClick={() => onExecute()}
                    className="w-full rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary/15"
                  >
                    Execute Full Plan
                  </button>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

interface ToolParameterEditorProps {
  toolName: string;
  toolInput: ToolInput;
  toolSuggestions?: Record<string, string[]>;
  onUpdate: (toolInput: ToolInput) => void;
  disabled?: boolean;
}

const ToolParameterEditor: React.FC<ToolParameterEditorProps> = ({
  toolName,
  toolInput,
  toolSuggestions = {},
  onUpdate,
  disabled = false,
}) => {
  const canonicalToolName = canonicalizeToolName(toolName);
  const toolTitle = getToolTitle(toolName);
  const toolDescription = getToolDescription(toolName);
  const schema = getToolSchema(toolName, toolInput, toolSuggestions);
  const safeInput = React.useMemo(
    () => normalizePlanToolInput(toolName, toolInput || {}),
    [toolInput, toolName]
  );
  const schemaEntries = Object.entries(schema || {});
  const visibleSchemaEntries = schemaEntries.filter(([, fieldSchema]) => {
    return !(fieldSchema as unknown as { hidden?: boolean }).hidden;
  });

  const hydratedInput = React.useMemo(() => {
    const next: ToolInput = { ...safeInput };
    visibleSchemaEntries.forEach(([key, fieldSchema]) => {
      const schemaWithDefault = fieldSchema as unknown as { default?: unknown };
      if (next[key] === undefined && schemaWithDefault.default !== undefined) {
        next[key] = schemaWithDefault.default;
      }
    });
    return next;
  }, [safeInput, visibleSchemaEntries]);

  if (visibleSchemaEntries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-background/50 px-3 py-2 text-[11px] text-muted-foreground">
        No parameters for {toolName}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {(canonicalToolName === 'update_photographic' || canonicalToolName === 'update_lighting') ? (
        <div
          className="rounded-md border border-primary/15 bg-primary/5 px-3 py-2"
          aria-label={`${toolTitle} section`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary/80">
            {toolTitle}
          </p>
          {toolDescription ? (
            <p className="mt-1 text-[10px] text-muted-foreground">{toolDescription}</p>
          ) : null}
        </div>
      ) : null}

      {canonicalToolName === 'update_photographic' ? (
        <CameraGuideViewport
          cameraAngle={hydratedInput.camera_angle}
          lensFocalLength={hydratedInput.lens_focal_length}
          depthOfField={hydratedInput.depth_of_field}
          focus={hydratedInput.focus}
          compact
        />
      ) : null}
      {visibleSchemaEntries.map(([key, fieldSchema]) => {
        const fieldTitle = getFieldTitle(key, fieldSchema);
        const fieldDescription = getFieldDescription(fieldSchema);
        return (
          <div
            key={key}
            className="rounded-md border border-border/40 bg-background/25 px-3 py-2"
            aria-label={`${fieldTitle} control`}
          >
            <div className="mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                {fieldTitle}
              </p>
              {fieldDescription ? (
                <p className="mt-1 text-[10px] text-muted-foreground/80">{fieldDescription}</p>
              ) : null}
            </div>
            <FieldRenderer
              path={key}
              schema={fieldSchema}
              value={hydratedInput[key as keyof typeof hydratedInput]}
              onChange={(value) => {
                const nextInput: ToolInput = { ...hydratedInput, [key]: value };
                if (canonicalToolName === 'adjust_object_property' && key === 'property') {
                  const previous = toStringValue(hydratedInput.property).trim().toLowerCase().replace(/\s+/g, '_');
                  const nextProperty = toStringValue(value).trim().toLowerCase().replace(/\s+/g, '_');
                  if (nextProperty && previous !== nextProperty) {
                    delete nextInput.value;
                  }
                }
                onUpdate(normalizePlanToolInput(toolName, nextInput));
              }}
              registry={registry}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
};
