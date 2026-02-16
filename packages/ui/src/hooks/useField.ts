import { useCallback, useMemo } from 'react';
import get from 'lodash/get';
import { useFormContext } from '../context/FormContext';
import { FieldSchema, TextEncoder } from '@fibo-ui/core';

interface UseFieldOptions {
  path: string;
  schema?: FieldSchema;
}

interface UseFieldResult {
  value: any;
  error: string | undefined;
  touched: boolean;
  setValue: (value: any) => void;
  onChange: (value: any) => void;
  onBlur: () => void;
  onFocus: () => void;
  toText: () => string;
}

export function useField(options: UseFieldOptions): UseFieldResult {
  const { path, schema } = options;
  const formState = useFormContext();

  const value = useMemo(() => {
    return get(formState.data, path);
  }, [formState.data, path]);

  const error = useMemo(() => {
    return formState.errors[path];
  }, [formState.errors, path]);

  const touched = useMemo(() => {
    return formState.touched[path] || false;
  }, [formState.touched, path]);

  const setValue = useCallback((newValue: any) => {
    formState.setField(path, newValue);
  }, [formState, path]);

  const onChange = useCallback((newValue: any) => {
    formState.setField(path, newValue);
  }, [formState, path]);

  const onBlur = useCallback(() => {
    formState.touchField(path);
    if (schema) {
      formState.validate();
    }
  }, [formState, path, schema]);

  const onFocus = useCallback(() => {
    // Could track focus state here
  }, []);

  const toText = useCallback(() => {
    const interaction = TextEncoder.createInteraction('change', path, value);
    return TextEncoder.encodeInteraction(interaction);
  }, [path, value]);

  return {
    value,
    error,
    touched,
    setValue,
    onChange,
    onBlur,
    onFocus,
    toText,
  };
}
