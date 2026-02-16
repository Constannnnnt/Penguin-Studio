import { useCallback } from 'react';
import { useFormContext } from '../context/FormContext';
import { TextEncoder, TextDecoder, Interaction, InteractionType } from '@fibo-ui/core';

export function useInteraction() {
  const formState = useFormContext();

  const encodeToText = useCallback((interaction: Interaction): string => {
    return TextEncoder.encodeInteraction(interaction);
  }, []);

  const decodeFromText = useCallback((text: string): boolean => {
    const action = TextDecoder.decode(text);
    if (!action) return false;

    const path = (action.payload as any)?.path;
    const value = (action.payload as any)?.value;

    if (action.type === 'SET_FIELD' && path !== undefined) {
      formState.setField(path, value);
      return true;
    }

    if (action.type === 'RESET') {
      formState.reset();
      return true;
    }

    return false;
  }, [formState]);

  const createInteraction = useCallback((
    type: InteractionType,
    path: string,
    value?: any,
    previousValue?: any
  ): Interaction => {
    return TextEncoder.createInteraction(type, path, value, previousValue);
  }, []);

  const describeAll = useCallback((): string => {
    const interactions: Interaction[] = [];
    for (const path of Object.keys(formState.touched)) {
      const value = formState.data[path as keyof typeof formState.data];
      interactions.push(
        TextEncoder.createInteraction('change', path, value)
      );
    }
    return TextEncoder.encodeInteractions(interactions);
  }, [formState.data, formState.touched]);

  const describeField = useCallback((path: string): string => {
    const value = formState.data[path as keyof typeof formState.data];
    const interaction = TextEncoder.createInteraction('change', path, value);
    return TextEncoder.encodeInteraction(interaction);
  }, [formState.data]);

  return {
    encodeToText,
    decodeFromText,
    createInteraction,
    describeAll,
    describeField,
  };
}
