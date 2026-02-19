import React, { useId, useMemo, useState } from 'react';
import type { StringFieldSchema } from '@fibo-ui/core';
import type { BaseWidgetProps } from './types';

export interface ColorPaletteWidgetProps extends BaseWidgetProps {
  schema: StringFieldSchema;
}

const DEFAULT_SWATCHES = [
  '#014040',
  '#02735E',
  '#03A678',
  '#F27405',
  '#731702',
  '#E63946',
  '#457B9D',
  '#F4A261',
];

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isHexColor = (value: string): boolean => HEX_COLOR_REGEX.test(value.trim());

const normalizeToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!isHexColor(trimmed)) return trimmed;
  return trimmed.toUpperCase();
};

const parsePalette = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeToken(String(item ?? '')))
      .filter((token) => token.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;]+/)
      .map((token) => normalizeToken(token))
      .filter((token) => token.length > 0);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.colors)) {
      return parsePalette(record.colors);
    }
  }

  return [];
};

const uniqueTokens = (tokens: string[]): string[] =>
  Array.from(new Set(tokens.map((token) => normalizeToken(token)).filter(Boolean)));

const serializePalette = (tokens: string[]): string => uniqueTokens(tokens).join(', ');

const schemaPalettes = (schema: StringFieldSchema): string[] => {
  const schemaRecord = schema as unknown as {
    palette_presets?: unknown;
    presets?: unknown;
  };

  const colorTokens: string[] = [];

  if (Array.isArray(schemaRecord.palette_presets)) {
    schemaRecord.palette_presets.forEach((item) => {
      if (typeof item === 'string' && isHexColor(item)) {
        colorTokens.push(normalizeToken(item));
      }
    });
  }

  if (Array.isArray(schemaRecord.presets)) {
    schemaRecord.presets.forEach((item) => {
      if (typeof item === 'string' && isHexColor(item)) {
        colorTokens.push(normalizeToken(item));
      }
    });
  }

  if (Array.isArray(schema.enum)) {
    schema.enum.forEach((item) => {
      if (typeof item === 'string' && isHexColor(item)) {
        colorTokens.push(normalizeToken(item));
      }
    });
  }

  const deduped = uniqueTokens(colorTokens);
  return deduped.length > 0 ? deduped : DEFAULT_SWATCHES;
};

const schemaNamedOptions = (schema: StringFieldSchema): string[] => {
  if (!Array.isArray(schema.enum)) return [];
  return schema.enum
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !isHexColor(item));
};

export const ColorPaletteField: React.FC<ColorPaletteWidgetProps> = ({
  path,
  value,
  onChange,
  schema,
  disabled,
  readOnly,
  className,
  description,
}) => {
  const id = useId();
  const inputId = `${path}-${id}`;
  const isDisabled = Boolean(disabled || schema.hidden || readOnly || schema.readOnly);

  const [customToken, setCustomToken] = useState('');

  const selectedTokens = useMemo(() => parsePalette(value), [value]);
  const selectedSet = useMemo(() => new Set(selectedTokens), [selectedTokens]);
  const swatches = useMemo(() => schemaPalettes(schema), [schema]);
  const namedOptions = useMemo(() => schemaNamedOptions(schema), [schema]);
  const currentValue = typeof value === 'string' ? value.trim() : '';
  const selectedNamedOption = useMemo(() => {
    if (!currentValue) return '';
    const lowered = currentValue.toLowerCase();
    const match = namedOptions.find((option) => option.toLowerCase() === lowered);
    return match || '';
  }, [currentValue, namedOptions]);

  const setTokens = (tokens: string[]): void => {
    onChange(serializePalette(tokens));
  };

  const removeToken = (token: string): void => {
    const next = selectedTokens.filter((item) => item !== token);
    onChange(serializePalette(next));
  };

  const handleSwatchClick = (token: string): void => {
    if (isDisabled) return;
    // Selecting a swatch should set a clear value, not keep appending.
    setTokens([token]);
  };

  const handleAddCustom = (): void => {
    if (isDisabled) return;
    const tokens = parsePalette(customToken);
    if (tokens.length === 0) return;
    // Custom input may contain a full palette (comma-separated); set it directly.
    setTokens(tokens);
    setCustomToken('');
  };

  const handleNamedOption = (option: string): void => {
    if (isDisabled) return;
    onChange(option);
  };

  const handleColorInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (isDisabled) return;
    const normalized = normalizeToken(event.target.value);
    if (!normalized) return;
    // Color picker should set the primary selected color directly.
    setTokens([normalized]);
  };

  return (
    <div className={`flex flex-col gap-3 ${className || ''}`}>
      {schema.label && (
        <label htmlFor={inputId} className="text-sm font-medium">
          {schema.label}
        </label>
      )}

      {currentValue && (
        <p className="text-xs text-muted-foreground">
          Current value: <span className="font-medium text-foreground">{currentValue}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => {
          const isSelected = selectedSet.has(swatch);
          return (
            <button
              key={swatch}
              type="button"
              onClick={() => handleSwatchClick(swatch)}
              disabled={isDisabled}
              className={`h-8 w-8 rounded-md border transition-all ${
                isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
              } ${
                isDisabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:scale-105 border-foreground/30 shadow-sm'
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch}
              aria-label={`Toggle ${swatch}`}
            />
          );
        })}
      </div>

      {namedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {namedOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleNamedOption(option)}
              disabled={isDisabled}
              className={`rounded-md border px-2 py-1 text-xs capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedNamedOption.toLowerCase() === option.toLowerCase()
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="color"
          disabled={isDisabled}
          onChange={handleColorInput}
          className="h-9 w-11 rounded border border-input bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Pick color"
        />
        <input
          type="text"
          value={customToken}
          onChange={(event) => setCustomToken(event.target.value)}
          disabled={isDisabled}
          placeholder="#RRGGBB or palette text"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={isDisabled}
          className="h-9 rounded-md border border-input px-3 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </div>

      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTokens.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-1 text-xs"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${isHexColor(token) ? '' : 'bg-muted'}`}
                style={isHexColor(token) ? { backgroundColor: token } : undefined}
              />
              {token}
              {!isDisabled && (
                <button
                  type="button"
                  onClick={() => removeToken(token)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${token}`}
                >
                  x
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

export default ColorPaletteField;
