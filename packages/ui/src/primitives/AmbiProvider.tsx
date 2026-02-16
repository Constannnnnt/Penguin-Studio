import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { createStore, StoreApi, useStore } from 'zustand';
import { CommandInvoker, UpdateCommand, Command } from '@fibo-ui/core';

interface AmbiState {
    data: any;
    setData: (data: any) => void;
    execute: (command: Command) => void;
}

const AmbiContext = createContext<StoreApi<AmbiState> | null>(null);

export const AmbiProvider: React.FC<{
    initialData: any;
    onChange?: (data: any) => void;
    children: React.ReactNode;
}> = ({ initialData, onChange, children }) => {
    const invoker = useMemo(() => new CommandInvoker(), []);

    const store = useMemo(() => createStore<AmbiState>((set, get) => ({
        data: initialData,
        setData: (data) => set({ data }),
        execute: (command) => {
            const newData = invoker.invoke(get().data, command);
            set({ data: newData });
        }
    })), [initialData]);

    useEffect(() => {
        const unsub = store.subscribe((state) => {
            onChange?.(state.data);
        });
        return unsub;
    }, [store, onChange]);

    return (
        <AmbiContext.Provider value={store}>
            {children}
        </AmbiContext.Provider>
    );
};

export function useAmbiStore<T>(selector: (state: AmbiState) => T): T {
    const store = useContext(AmbiContext);
    if (!store) throw new Error('useAmbiStore must be used within AmbiProvider');
    return useStore(store, selector);
}

export function useAmbiUpdate() {
    const store = useContext(AmbiContext);
    if (!store) throw new Error('useAmbiUpdate must be used within AmbiProvider');

    return (path: string, value: any) => {
        store.getState().execute(new UpdateCommand(path, value));
    };
}
