import React from 'react';
import { FieldSchema, ObjectFieldSchema } from '@fibo-ui/core';
import { FieldRenderer } from '../FieldRenderer';
import { BaseWidgetProps } from './types';

export interface ObjectWidgetProps extends BaseWidgetProps {
  schema: ObjectFieldSchema;
}

export const ObjectField: React.FC<ObjectWidgetProps> = ({
  path,
  value,
  onChange,
  schema,
  disabled,
  readOnly,
  className,
}) => {
  const isReadOnly = readOnly || schema.readOnly;
  const isDisabled = disabled || schema.hidden;

  if (!schema.properties) {
    return (
      <div className="text-destructive text-xs p-2 border border-destructive rounded">
        Object field missing properties schema
      </div>
    );
  }

  const handleChildChange = (childPath: string, childValue: any) => {
    onChange({ ...value, [childPath]: childValue });
  };

  return (
    <div className={`border border-border rounded-md p-4 ${className || ''}`}>
      {schema.label && (
        <h3 className="font-medium mb-4">{schema.label}</h3>
      )}
      {schema.description && (
        <p className="text-sm text-muted-foreground mb-4">{schema.description}</p>
      )}
      <div className="flex flex-col gap-4">
        {Object.entries(schema.properties).map(([key, childSchema]) => (
          <FieldRenderer
            key={key}
            path={path ? `${path}.${key}` : key}
            schema={childSchema}
            value={value?.[key]}
            onChange={(childValue) => handleChildChange(key, childValue)}
            disabled={isDisabled}
            readOnly={isReadOnly}
          />
        ))}
      </div>
    </div>
  );
};

export default ObjectField;
