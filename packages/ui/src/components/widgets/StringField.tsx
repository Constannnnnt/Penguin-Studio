import React, { useId } from 'react';
import { FieldSchema, StringFieldSchema } from '@fibo-ui/core';
import { BaseWidgetProps } from './types';

export interface StringWidgetProps extends BaseWidgetProps {
  schema: StringFieldSchema;
}

export const StringField: React.FC<StringWidgetProps> = ({
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
    onChange(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const isReadOnly = readOnly || schema.readOnly;
  const isDisabled = disabled || schema.hidden;

  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className={`flex flex-col gap-2 ${className || ''}`}>
        {schema.label && (
          <label htmlFor={inputId} className="text-sm font-medium">
            {schema.label}
          </label>
        )}
        <select
          id={inputId}
          value={value || ''}
          onChange={handleSelectChange}
          disabled={isDisabled || isReadOnly}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select...</option>
          {schema.enum.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

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
        type="text"
        value={value || ''}
        onChange={handleChange}
        disabled={isDisabled || isReadOnly}
        readOnly={isReadOnly}
        minLength={schema.minLength}
        maxLength={schema.maxLength}
        pattern={schema.pattern}
        placeholder={schema.description}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default StringField;
