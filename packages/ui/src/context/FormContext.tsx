import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { createStore, StoreApi } from 'zustand';
import { StateMachine, FormState, FormConfig, FormAction, EditorSchema, TextEncoder, TextDecoder } from '@fibo-ui/core';

interface FormContextValue<T = any> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  setField: (path: string, value: any) => void;
  setData: (data: T) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  validate: () => boolean;
  touchField: (path: string) => void;
  setError: (path: string, error: string) => void;
  clearError: (path: string) => void;
  interaction: {
    toText: (path?: string) => string;
    fromText: (text: string) => void;
  };
}

const FormContext = createContext<StoreApi<FormContextValue> | null>(null);

interface FormProviderProps<T> {
  schema?: EditorSchema;
  config: FormConfig<T>;
  children: React.ReactNode;
  widgets?: Record<string, React.ComponentType<any>>;
}

export function FormProvider<T extends Record<string, any>>({
  config,
  children,
}: FormProviderProps<T>) {
  const { initialData, validation, onChange, maxHistory } = config;

  const stateMachine = useMemo(() => {
    return new StateMachine<T>({
      initialData,
      validation,
      onChange,
      maxHistory: maxHistory || 50,
    });
  }, [initialData, validation, onChange, maxHistory]);

  const store = useMemo(() => {
    return createStore<FormContextValue<T>>((set, get) => {
      stateMachine.subscribe((state: FormState<T>) => {
        set({
          data: state.data,
          errors: state.errors,
          touched: state.touched,
          dirty: state.dirty,
          canUndo: state.history.past.length > 0,
          canRedo: state.history.future.length > 0,
        });
      });

      return {
        data: initialData,
        errors: {},
        touched: {},
        dirty: false,
        canUndo: false,
        canRedo: false,
        
        setField: (path: string, value: any) => {
          stateMachine.setField(path, value);
        },
        
        setData: (data: T) => {
          stateMachine.setData(data);
        },
        
        reset: () => {
          stateMachine.reset();
        },
        
        undo: () => {
          stateMachine.undo();
        },
        
        redo: () => {
          stateMachine.redo();
        },
        
        validate: () => {
          const errors = stateMachine.validate();
          return errors.length === 0;
        },
        
        touchField: (path: string) => {
          stateMachine.touchField(path);
        },
        
        setError: (path: string, error: string) => {
          stateMachine.setError(path, error);
        },
        
        clearError: (path: string) => {
          stateMachine.clearError(path);
        },
        
        interaction: {
          toText: (path?: string) => {
            const state = stateMachine.getState();
            if (path) {
              const value = state.data[path];
              const interaction = TextEncoder.createInteraction('change', path, value);
              return TextEncoder.encodeInteraction(interaction);
            }
            return TextEncoder.encodeState(state.data, {} as EditorSchema);
          },
          
          fromText: (text: string) => {
            const action = TextDecoder.decode(text);
            if (action) {
              stateMachine.dispatch(action as unknown as FormAction);
            }
          },
        },
      };
    });
  }, [stateMachine, initialData]);

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      onChange?.(state.data as T);
    });
    return unsub;
  }, [store, onChange]);

  return (
    <FormContext.Provider value={store}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext<T = any>(): FormContextValue<T> {
  const store = useContext(FormContext);
  if (!store) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return store.getState() as FormContextValue<T>;
}

export function useFormStore<T>(selector: (state: FormContextValue) => T): T {
  const store = useContext(FormContext);
  if (!store) {
    throw new Error('useFormStore must be used within FormProvider');
  }
  return (store as any)(selector);
}
