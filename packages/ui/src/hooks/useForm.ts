import { useCallback } from 'react';
import { useFormStore, useFormContext } from '../context/FormContext';
import { FormConfig } from '@fibo-ui/core';

export function useForm<T extends Record<string, any>>(
  config?: FormConfig<T>
) {
  const storeState = useFormContext<T>();

  const setField = useCallback((path: string, value: any) => {
    storeState.setField(path, value);
  }, [storeState]);

  const setData = useCallback((data: T) => {
    storeState.setData(data);
  }, [storeState]);

  const reset = useCallback(() => {
    storeState.reset();
  }, [storeState]);

  const undo = useCallback(() => {
    storeState.undo();
  }, [storeState]);

  const redo = useCallback(() => {
    storeState.redo();
  }, [storeState]);

  const validate = useCallback(() => {
    return storeState.validate();
  }, [storeState]);

  const touchField = useCallback((path: string) => {
    storeState.touchField(path);
  }, [storeState]);

  const setError = useCallback((path: string, error: string) => {
    storeState.setError(path, error);
  }, [storeState]);

  const clearError = useCallback((path: string) => {
    storeState.clearError(path);
  }, [storeState]);

  const toText = useCallback((path?: string) => {
    return storeState.interaction.toText(path);
  }, [storeState]);

  const fromText = useCallback((text: string) => {
    return storeState.interaction.fromText(text);
  }, [storeState]);

  return {
    data: storeState.data,
    errors: storeState.errors,
    touched: storeState.touched,
    dirty: storeState.dirty,
    canUndo: storeState.canUndo,
    canRedo: storeState.canRedo,
    setField,
    setData,
    reset,
    undo,
    redo,
    validate,
    touchField,
    setError,
    clearError,
    interaction: {
      toText,
      fromText,
    },
  };
}
