import React from 'react';
import type { GenerationDraft } from '@/core/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { PerformantInput } from '@/shared/components/ui/performant-input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Sparkles } from 'lucide-react';
import { buildPolishedPrompt } from '../lib/generationDraft';

interface GenerationClarificationEditorProps {
  draft: GenerationDraft;
  onUpdate: (draft: GenerationDraft) => void;
  onRethink: () => void;
  onReset: () => void;
  onGenerate: () => void;
  disabled?: boolean;
  status?: string;
}

const STYLE_OPTIONS = [
  'realistic product photograph',
  'cinematic photography',
  'studio commercial photography',
  'editorial fashion photography',
  'lifestyle photography',
  'minimalist photography',
];

const LIGHTING_OPTIONS = [
  'natural soft directional light',
  'golden hour sunlight',
  'dramatic side lighting',
  'studio key and fill lighting',
  'high-key bright lighting',
  'moody low-key lighting',
];

const COMPOSITION_OPTIONS = [
  'centered with balanced negative space',
  'rule of thirds',
  'symmetrical framing',
  'diagonal composition',
  'close-up hero framing',
];

const ensureCurrentOption = (options: string[], value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return options;
  if (options.some((opt) => opt.toLowerCase() === trimmed.toLowerCase())) {
    return options;
  }
  return [trimmed, ...options];
};

export const GenerationClarificationEditor: React.FC<GenerationClarificationEditorProps> = ({
  draft,
  onUpdate,
  onRethink,
  onReset,
  onGenerate,
  disabled = false,
  status,
}) => {
  const isLocked = disabled || status === 'executing';

  const updateField = <K extends keyof GenerationDraft>(key: K, value: GenerationDraft[K]) => {
    const nextDraft: GenerationDraft = {
      ...draft,
      [key]: value,
    };
    nextDraft.polished_prompt = buildPolishedPrompt(nextDraft);
    onUpdate(nextDraft);
  };

  const styleOptions = ensureCurrentOption(STYLE_OPTIONS, draft.style_or_medium);
  const lightingOptions = ensureCurrentOption(LIGHTING_OPTIONS, draft.lighting);
  const compositionOptions = ensureCurrentOption(
    COMPOSITION_OPTIONS,
    draft.composition || ''
  );

  return (
    <Card className="w-full border-primary/25 bg-background/25 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-black uppercase tracking-[0.14em] text-primary flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          Generation Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Main Subject</label>
          <PerformantInput
            value={draft.main_subject}
            onValueCommit={(value) => updateField('main_subject', value)}
            className="h-8 bg-background/40 text-[11px]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Background / Setting</label>
          <Textarea
            value={draft.background_setting}
            onChange={(event) => updateField('background_setting', event.target.value)}
            className="min-h-[60px] bg-background/40 text-[11px]"
            disabled={isLocked}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Style / Medium</label>
            <Select
              value={draft.style_or_medium}
              onValueChange={(value) => updateField('style_or_medium', value)}
              disabled={isLocked}
            >
              <SelectTrigger className="h-9 bg-background/40 text-[11px]">
                <SelectValue placeholder="Pick a style" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lighting</label>
            <Select
              value={draft.lighting}
              onValueChange={(value) => updateField('lighting', value)}
              disabled={isLocked}
            >
              <SelectTrigger className="h-9 bg-background/40 text-[11px]">
                <SelectValue placeholder="Pick lighting" />
              </SelectTrigger>
              <SelectContent>
                {lightingOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Composition</label>
          <Select
            value={draft.composition || ''}
            onValueChange={(value) => updateField('composition', value)}
            disabled={isLocked}
          >
            <SelectTrigger className="h-9 bg-background/40 text-[11px]">
              <SelectValue placeholder="Pick composition" />
            </SelectTrigger>
            <SelectContent>
              {compositionOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Extra Details</label>
          <Textarea
            value={draft.extra_details || ''}
            onChange={(event) => updateField('extra_details', event.target.value)}
            className="min-h-[54px] bg-background/40 text-[11px]"
            disabled={isLocked}
          />
        </div>

        <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {draft.polished_prompt || buildPolishedPrompt(draft)}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
            disabled={isLocked}
          >
            Reset Values
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onRethink}
            disabled={isLocked}
          >
            Rethink My Prompt
          </Button>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={onGenerate}
          disabled={isLocked}
        >
          Generate With This Prompt
        </Button>
      </CardContent>
    </Card>
  );
};
