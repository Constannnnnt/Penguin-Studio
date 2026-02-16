import React, { useEffect, useMemo, useCallback } from 'react';
import { createStore, useStore } from 'zustand';
import {
    EditorSchema,
    HistoryTracker,
    Transformer
} from '@fibo-ui/core';
import { RegistryProvider, ControlRegistry } from '../Registry';
import { FieldFactory } from '../FieldFactory';

interface EditorState {
    data: any;
    setData: (data: any) => void;
    updateField: (path: string, value: any) => void;
}

interface AmbiEditorProps {
    schema: EditorSchema;
    data: any;
    onChange?: (data: any) => void;
    registry?: ControlRegistry;
    className?: string;
}

export const AmbiEditor: React.FC<AmbiEditorProps> = ({
    schema,
    data,
    onChange,
    registry = {},
    className,
}) => {
    // Create internal store for performance
    const store = useMemo(() => createStore<EditorState>((set) => ({
        data,
        setData: (newData) => set({ data: newData }),
        updateField: (path, value) => set((state) => {
            const newData = Transformer.update(state.data, path, value);
            return { data: newData };
        }),
    })), []); // Store is created once

    // Sync prop data to store
    useEffect(() => {
        store.getState().setData(data);
    }, [data, store]);

    // Sync store changes to parent
    useEffect(() => {
        const unsub = store.subscribe((state) => {
            onChange?.(state.data);
        });
        return unsub;
    }, [store, onChange]);

    return (
        <RegistryProvider registry={registry}>
            <div className={className}>
                {Object.entries(schema).map(([key, fieldSchema]) => (
                    <FieldFactory
                        key={key}
                        path={key}
                        schema={fieldSchema}
                        store={store}
                    />
                ))}
            </div>
        </RegistryProvider>
    );
};
