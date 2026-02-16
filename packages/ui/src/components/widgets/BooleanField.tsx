import React, { useId } from 'react';
import { FieldSchema } from '@fibo-ui/core';
import { BaseWidgetProps } from './types';

export interface BooleanWidgetProps extends BaseWidgetProps {
  schema: FieldSchema;
}

export const BooleanField: React.FC<BooleanWidgetProps> = ({
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
    onChange(e.target.checked);
  };

  const isReadOnly = readOnly || schema.readOnly;
  const isDisabled = disabled || schema.hidden;

  return (
    <div className={`flex flex-row items-center gap-3 ${className || ''}`}>
      <input
        id={inputId}
        type="checkbox"
        checked={!!value}
        onChange={handleChange}
        disabled={isDisabled || isReadOnly}
        readOnly={isReadOnly}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      {schema.label && (
        <label htmlFor={inputId} className="text-sm font-medium cursor-pointer">
          {schema.label}
        </label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground ml-auto">{description}</p>
      )}
    </div>
  );
};

export default BooleanField;
