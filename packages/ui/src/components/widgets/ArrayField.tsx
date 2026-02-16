import React from 'react';
import { FieldSchema, ArrayFieldSchema } from '@fibo-ui/core';
import { FieldRenderer } from '../FieldRenderer';
import { BaseWidgetProps } from './types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const IconPlus = Plus as any;
const IconTrash2 = Trash2 as any;
const IconGripVertical = GripVertical as any;

export interface ArrayWidgetProps extends BaseWidgetProps {
  schema: ArrayFieldSchema;
}

export const ArrayField: React.FC<ArrayWidgetProps> = ({
  path,
  value = [],
  onChange,
  schema,
  disabled,
  readOnly,
  className,
}) => {
  const isReadOnly = readOnly || schema.readOnly;
  const isDisabled = disabled || schema.hidden;
  const items = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const defaultValue = schema.items.default ?? null;
    onChange([...items, defaultValue]);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleChange = (index: number, newValue: any) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [item] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, item);
    onChange(newItems);
  };

  return (
    <div className={`border border-border rounded-md p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          {schema.label && (
            <h3 className="font-medium">{schema.label}</h3>
          )}
          {schema.description && (
            <p className="text-sm text-muted-foreground">{schema.description}</p>
          )}
        </div>
        {!isDisabled && !isReadOnly && (
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <IconPlus size={14} />
            Add
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No items</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 border border-border rounded bg-background"
            >
              {!isDisabled && !isReadOnly && (
                <button
                  type="button"
                  className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
                  disabled={isDisabled}
                >
                  <IconGripVertical size={16} />
                </button>
              )}
              
              <div className="flex-1">
                <FieldRenderer
                  path={`${path}[${index}]`}
                  schema={schema.items}
                  value={item}
                  onChange={(newValue) => handleChange(index, newValue)}
                  disabled={isDisabled}
                  readOnly={isReadOnly}
                />
              </div>

              {!isDisabled && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="mt-2 text-muted-foreground hover:text-destructive"
                  disabled={isDisabled}
                >
                  <IconTrash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {schema.minItems && items.length < schema.minItems && (
        <p className="text-xs text-destructive mt-2">
          Minimum {schema.minItems} items required
        </p>
      )}

      {schema.maxItems && items.length > schema.maxItems && (
        <p className="text-xs text-destructive mt-2">
          Maximum {schema.maxItems} items allowed
        </p>
      )}
    </div>
  );
};

export default ArrayField;
