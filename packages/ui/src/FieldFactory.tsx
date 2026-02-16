import React from 'react';
import { useStore } from 'zustand';
import { FieldSchema } from '@fibo-ui/core';
import { useRegistry } from './Registry';

interface FieldFactoryProps {
    path: string;
    schema: FieldSchema;
    store: any; // Zoning in on the specific store type can be tricky with generic creates
}

export const FieldFactory: React.FC<FieldFactoryProps> = ({
    path,
    schema,
    store,
}) => {
    const registry = useRegistry();
    const value = useStore(store, (state: any) => {
        // Basic getter logic using lodash path syntax
        return path.split('.').reduce((obj, key) => obj?.[key], state.data);
    });
    const updateField = useStore(store, (state: any) => state.updateField);

    const handleChange = (newValue: any) => {
        updateField(path, newValue);
    };

    // 1. Check for custom widget in registry
    if (schema.widget && registry[schema.widget]) {
        const Component = registry[schema.widget];
        return (
            <Component
                value={value}
                onChange={handleChange}
                schema={schema}
                path={path}
            />
        );
    }

    // 2. Default rendering based on type
    switch (schema.type) {
        case 'string':
            return (
                <div className="flex flex-col gap-2 mb-4">
                    {schema.label && <label className="text-sm font-medium">{schema.label}</label>}
                    <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={schema.readOnly}
                    />
                </div>
            );

        case 'number':
            return (
                <div className="flex flex-col gap-2 mb-4">
                    {schema.label && <label className="text-sm font-medium">{schema.label}</label>}
                    <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={value || 0}
                        onChange={(e) => handleChange(Number(e.target.value))}
                        disabled={schema.readOnly}
                        min={(schema as any).min}
                        max={(schema as any).max}
                        step={(schema as any).step}
                    />
                </div>
            );

        case 'boolean':
            return (
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={!!value}
                        onChange={(e) => handleChange(e.target.checked)}
                        disabled={schema.readOnly}
                    />
                    {schema.label && <label className="text-sm font-medium">{schema.label}</label>}
                </div>
            );

        case 'object':
            if (!schema.properties) return null;
            return (
                <div className="border border-border rounded-md p-4 mb-4">
                    {schema.label && <h3 className="font-medium mb-4">{schema.label}</h3>}
                    {Object.entries(schema.properties).map(([key, childSchema]) => (
                        <FieldFactory
                            key={key}
                            path={`${path}.${key}`}
                            schema={childSchema}
                            store={store}
                        />
                    ))}
                </div>
            );

        case 'array':
            // TODO: Array implementation
            return <div>Array support coming soon</div>;

        default:
            return <div>Unknown field type: {(schema as any).type}</div>;
    }
};
