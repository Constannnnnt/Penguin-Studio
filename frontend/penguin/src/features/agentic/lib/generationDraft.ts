import type { GenerationDraft } from '@/core/types';

const DEFAULT_DRAFT: GenerationDraft = {
  main_subject: 'a compelling product subject',
  background_setting: 'a visually coherent environment',
  style_or_medium: 'realistic product photograph',
  lighting: 'natural soft directional light',
  composition: 'centered with balanced negative space',
  extra_details: '',
  polished_prompt: '',
};

const asRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return cleaned || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

export const buildPolishedPrompt = (draft: GenerationDraft): string => {
  const subject = asText(draft.main_subject, DEFAULT_DRAFT.main_subject);
  const setting = asText(draft.background_setting, DEFAULT_DRAFT.background_setting);
  const style = asText(draft.style_or_medium, DEFAULT_DRAFT.style_or_medium);
  const lighting = asText(draft.lighting, DEFAULT_DRAFT.lighting);
  const composition = asText(draft.composition, '');
  const extraDetails = asText(draft.extra_details, '');

  const segments = [
    subject,
    `in ${setting}`,
    `style: ${style}`,
    `lighting: ${lighting}`,
  ];

  if (composition) {
    segments.push(`composition: ${composition}`);
  }
  if (extraDetails) {
    segments.push(`details: ${extraDetails}`);
  }

  return segments.join(', ');
};

export const normalizeGenerationDraft = (
  input: unknown,
  fallbackQuery = ''
): GenerationDraft => {
  const source = asRecord(input) ? input : {};

  const normalized: GenerationDraft = {
    main_subject: asText(
      source.main_subject,
      asText(fallbackQuery, DEFAULT_DRAFT.main_subject)
    ),
    background_setting: asText(
      source.background_setting,
      DEFAULT_DRAFT.background_setting
    ),
    style_or_medium: asText(source.style_or_medium, DEFAULT_DRAFT.style_or_medium),
    lighting: asText(source.lighting, DEFAULT_DRAFT.lighting),
    composition: asText(source.composition, DEFAULT_DRAFT.composition),
    extra_details: asText(source.extra_details, ''),
    polished_prompt: asText(source.polished_prompt, ''),
  };

  if (!normalized.polished_prompt) {
    normalized.polished_prompt = buildPolishedPrompt(normalized);
  }

  return normalized;
};
