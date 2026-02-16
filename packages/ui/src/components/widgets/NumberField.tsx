import React, { useId } from 'react';
import { NumberFieldSchema } from '@fibo-ui/core';
import { BaseWidgetProps } from './types';

export interface NumberWidgetProps extends BaseWidgetProps {
  schema: NumberFieldSchema;
}

export const NumberField: React.FC<NumberWidgetProps> = ({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const isReadOnly = readOnly || schema.readOnly;
  const isDisabled = disabled || schema.hidden;

  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
          {schema.label && (
            <label htmlFor={inputId} className="text-sm font-medium">
              {schema.label}
              {(schema as any).required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
      <input
        id={inputId}
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        disabled={isDisabled || isReadOnly}
        readOnly={isReadOnly}
        min={schema.min}
        max={schema.max}
        step={schema.step}
        placeholder={schema.description}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default NumberField;
