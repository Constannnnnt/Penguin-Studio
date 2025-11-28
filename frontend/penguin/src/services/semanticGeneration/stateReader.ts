import { useConfigStore } from '@/store/configStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import type { CombinedState } from './types';
import { MissingFieldError } from './types';

/**
 * Read current state from stores and combine into CombinedState
 * @returns Combined state from configStore and segmentationStore
 * @throws MissingFieldError if required state is missing
 */
export const readCurrentState = (): CombinedState => {
  const configState = useConfigStore.getState();
  const segmentationState = useSegmentationStore.getState();

  // Validate that we have the required state
  if (!configState.sceneConfig) {
    throw new MissingFieldError('sceneConfig', false);
  }

  // Create combined state
  const combinedState: CombinedState = {
    sceneConfig: configState.sceneConfig,
    results: segmentationState.results,
    maskManipulation: segmentationState.maskManipulation,
  };

  return combinedState;
};

/**
 * Check if the current state is complete enough for generation
 * @returns Object with isComplete flag and missing fields list
 */
export const validateStateCompleteness = (): {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
} => {
  const configState = useConfigStore.getState();
  const segmentationState = useSegmentationStore.getState();

  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!configState.sceneConfig) {
    missingFields.push('sceneConfig');
  }

  // Check for warnings (optional but recommended fields)
  if (!segmentationState.results || segmentationState.results.masks.length === 0) {
    warnings.push('No segmentation results available - objects array will be empty');
  }

  if (!configState.sceneConfig?.background_setting) {
    warnings.push('Background setting is empty');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    warnings,
  };
};

/**
 * Get a safe copy of the current state
 * Returns a deep copy to prevent mutations
 */
export const getSafeStateCopy = (): CombinedState => {
  const state = readCurrentState();

  // Create a deep copy to prevent mutations
  return {
    sceneConfig: JSON.parse(JSON.stringify(state.sceneConfig)),
    results: state.results ? JSON.parse(JSON.stringify(state.results)) : null,
    maskManipulation: new Map(state.maskManipulation),
  };
};
