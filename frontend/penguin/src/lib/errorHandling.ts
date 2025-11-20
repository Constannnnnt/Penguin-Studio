import { toast } from 'sonner';

// ============================================================================
// Error Types
// ============================================================================

export class ApiError extends Error {
  statusCode?: number;
  response?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class ValidationError extends Error {
  errors: string[];

  constructor(
    message: string,
    errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Error Display Utilities
// ============================================================================

/**
 * Displays validation errors as toast notifications
 * Provide immediate feedback for user actions
 */
export const showValidationErrors = (errors: string[]): void => {
  errors.forEach((error) => {
    toast.error('Validation Error', {
      description: error,
    });
  });
};

/**
 * Displays a single error message as a toast notification
 * Provide immediate feedback for user actions
 */
export const showError = (title: string, description: string): void => {
  toast.error(title, {
    description,
  });
};

/**
 * Displays a success message as a toast notification
 * Provide immediate feedback for user actions
 */
export const showSuccess = (title: string, description?: string): void => {
  toast.success(title, {
    description,
  });
};

/**
 * Displays an info message as a toast notification
 */
export const showInfo = (title: string, description?: string): void => {
  toast.info(title, {
    description,
  });
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Handles API errors and displays appropriate user feedback
 * Error handling with user-friendly messages
 */
export const handleApiError = (error: unknown): void => {
  if (error instanceof ApiError) {
    showError('API Error', error.message);
  } else if (error instanceof NetworkError) {
    showError('Network Error', 'Unable to connect to the server. Please check your connection.');
  } else if (error instanceof ValidationError) {
    showValidationErrors(error.errors);
  } else if (error instanceof Error) {
    showError('Error', error.message);
  } else {
    showError('Unknown Error', 'An unexpected error occurred');
  }

  // Log error to console for debugging
  console.error('Error:', error);
};

/**
 * Wraps an async function with error handling
 * Automatically displays errors via toast notifications
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error);
      return undefined;
    }
  };
};

/**
 * Creates a timeout promise that rejects after specified milliseconds
 * Used for implementing request timeouts
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new NetworkError(`Request timed out after ${ms}ms`));
    }, ms);
  });
};

/**
 * Retries a function a specified number of times with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
