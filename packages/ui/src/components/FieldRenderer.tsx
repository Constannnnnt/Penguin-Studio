import React, { useMemo } from 'react';
import { FieldSchema, StringFieldSchema, NumberFieldSchema, ObjectFieldSchema, ArrayFieldSchema } from '@fibo-ui/core';
import { StringField } from './widgets/StringField';
import { NumberField } from './widgets/NumberField';
import { BooleanField } from './widgets/BooleanField';
import { ObjectField } from './widgets/ObjectField';
import { ArrayField } from './widgets/ArrayField';
import { ColorPaletteField } from './widgets/ColorPaletteField';
import { WidgetRegistry } from './widgets';

export interface FieldRendererProps {
  path: string;
  schema: FieldSchema;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  registry?: WidgetRegistry;
  error?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  path,
  schema,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
  registry = {},
}) => {
  const widgetKey = useMemo(() => {
    if (schema.widget) return schema.widget;
    return schema.type;
  }, [schema.widget, schema.type]);

  if (schema.hidden) {
    return null;
  }

  if (registry[widgetKey]) {
    const CustomWidget = registry[widgetKey];
    return (
      <CustomWidget
        path={path}
        value={value}
        onChange={onChange}
        schema={schema}
        disabled={disabled}
        readOnly={readOnly}
        className={className}
      />
    );
  }

  switch (widgetKey) {
    case 'string':
      return (
        <StringField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema as StringFieldSchema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    case 'number':
      return (
        <NumberField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema as NumberFieldSchema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    case 'object':
      return (
        <ObjectField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema as ObjectFieldSchema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    case 'array':
      return (
        <ArrayField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema as ArrayFieldSchema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    case 'color-palette':
      return (
        <ColorPaletteField
          path={path}
          value={value}
          onChange={onChange}
          schema={schema as StringFieldSchema}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
        />
      );

    default:
      return (
        <div className="text-destructive text-xs p-2 border border-destructive rounded">
          Unknown field type: {schema.type} (widget: {widgetKey})
        </div>
      );
  }
};

export default FieldRenderer;
