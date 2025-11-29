import { toast } from 'sonner';
import type { SaveResult, ValidationResult } from './types';

/**
 * Notify user of successful semantic JSON generation and save
 * @param result - Save result from file save operation
 */
export const notifySaveSuccess = (result: SaveResult): void => {
  if (result.success && result.filename) {
    toast.success('Scene exported successfully', {
      description: `Refining the scene`,
      duration: 4000,
    });
  }
};

/**
 * Notify user of failed semantic JSON generation or save
 * @param error - Error message or SaveResult with error
 */
export const notifySaveError = (error: string | SaveResult): void => {
  const errorMessage = typeof error === 'string' ? error : error.error || 'Unknown error occurred';

  toast.error('Failed to export scene', {
    description: errorMessage,
    duration: 6000,
  });
};

/**
 * Notify user of validation errors
 * @param result - Validation result with errors
 */
export const notifyValidationErrors = (result: ValidationResult): void => {
  if (!result.valid && result.errors.length > 0) {
    const errorCount = result.errors.length;
    const firstError = result.errors[0];

    toast.error(`Validation failed (${errorCount} error${errorCount > 1 ? 's' : ''})`, {
      description: firstError.message,
      duration: 6000,
    });
  }
};

/**
 * Notify user that generation is starting
 */
export const notifyGenerationStarted = (): void => {
  toast.info('Generating semantic JSON...', {
    duration: 2000,
  });
};

/**
 * Notify user of missing required state
 * @param missingFields - Array of missing field names
 */
export const notifyMissingState = (missingFields: string[]): void => {
  toast.error('Cannot export scene', {
    description: `Missing required data: ${missingFields.join(', ')}`,
    duration: 6000,
  });
};

/**
 * Notify user with warnings about incomplete state
 * @param warnings - Array of warning messages
 */
export const notifyStateWarnings = (warnings: string[]): void => {
  if (warnings.length > 0) {
    toast.warning('Scene export may be incomplete', {
      description: warnings[0],
      duration: 5000,
    });
  }
};

/**
 * Show a generic notification
 * @param type - Notification type
 * @param title - Notification title
 * @param description - Optional description
 */
export const notify = (
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  description?: string
): void => {
  const options = {
    description,
    duration: type === 'error' ? 6000 : 4000,
  };

  switch (type) {
    case 'success':
      toast.success(title, options);
      break;
    case 'error':
      toast.error(title, options);
      break;
    case 'warning':
      toast.warning(title, options);
      break;
    case 'info':
      toast.info(title, options);
      break;
  }
};
