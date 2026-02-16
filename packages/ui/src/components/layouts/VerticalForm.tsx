import React from 'react';
import { EditorSchema, FormConfig } from '@fibo-ui/core';
import { FormProvider } from '../../context/FormContext';
import { useForm } from '../../hooks/useForm';
import { FieldRenderer } from '../FieldRenderer';
import { RotateCcw, Undo2, Redo2 } from 'lucide-react';

const IconRotateCcw = RotateCcw as any;
const IconUndo2 = Undo2 as any;
const IconRedo2 = Redo2 as any;

export interface VerticalFormProps<T extends Record<string, any>> {
  schema: EditorSchema;
  config: FormConfig<T>;
  className?: string;
  showActions?: boolean;
  onSubmit?: (data: T) => void;
}

export function VerticalForm<T extends Record<string, any>>({
  schema,
  config,
  className,
  showActions = true,
  onSubmit,
}: VerticalFormProps<T>) {
  const form = useForm<T>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validate()) {
      onSubmit?.(form.data);
    }
  };

  return (
    <FormProvider config={config}>
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex flex-col gap-4">
          {Object.entries(schema).map(([key, fieldSchema]) => (
            <FieldRenderer
              key={key}
              path={key}
              schema={fieldSchema}
              value={form.data[key]}
              onChange={(value) => form.setField(key, value)}
              error={form.errors[key]}
            />
          ))}
        </div>

        {showActions && (
          <div className="flex items-center gap-2 mt-6 pt-4 border-t">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Submit
            </button>
            
            <button
              type="button"
              onClick={form.reset}
              className="px-4 py-2 border border-border rounded hover:bg-muted flex items-center gap-2"
            >
              <IconRotateCcw size={16} />
              Reset
            </button>

            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={form.undo}
                disabled={!form.canUndo}
                className="p-2 border border-border rounded hover:bg-muted disabled:opacity-50"
              >
                <IconUndo2 size={16} />
              </button>
              <button
                type="button"
                onClick={form.redo}
                disabled={!form.canRedo}
                className="p-2 border border-border rounded hover:bg-muted disabled:opacity-50"
              >
                <IconRedo2 size={16} />
              </button>
            </div>
          </div>
        )}
      </form>
    </FormProvider>
  );
}

export default VerticalForm;
