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
// export const withErrorHandling = <T extends unknown[], R>(
//   fn: (...args: T) => Promise<R>
// ) => {
//   return async (...args: T): Promise<R | undefined> => {
//     try {
//       return await fn(...args);
//     } catch (error) {
//       handleApiError(error);
//       return undefined;
//     }
//   };
// };

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

// ============================================================================
// Loading States and User Feedback
// ============================================================================

/**
 * Loading state interface for operations
 */
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
  error?: string;
  retryCount?: number;
}

/**
 * Creates a loading state manager with progress tracking
 */
export class LoadingStateManager {
  private state: LoadingState = { isLoading: false };
  private listeners: Array<(state: LoadingState) => void> = [];

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current state
   */
  getState(): LoadingState {
    return { ...this.state };
  }

  /**
   * Start loading operation
   */
  startLoading(operation?: string): void {
    this.state = {
      isLoading: true,
      operation,
      progress: 0,
      error: undefined,
      retryCount: 0,
    };
    this.notifyListeners();
  }

  /**
   * Update loading progress
   */
  updateProgress(progress: number, operation?: string): void {
    if (this.state.isLoading) {
      this.state = {
        ...this.state,
        progress: Math.max(0, Math.min(100, progress)),
        operation: operation || this.state.operation,
      };
      this.notifyListeners();
    }
  }

  /**
   * Set error state
   */
  setError(error: string, retryCount?: number): void {
    this.state = {
      ...this.state,
      isLoading: false,
      error,
      retryCount: retryCount || this.state.retryCount,
    };
    this.notifyListeners();
  }

  /**
   * Complete loading operation
   */
  complete(): void {
    this.state = {
      isLoading: false,
      operation: undefined,
      progress: 100,
      error: undefined,
      retryCount: 0,
    };
    this.notifyListeners();
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = { isLoading: false };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

/**
 * Error handling with user-friendly messages and recovery suggestions
 */
export const handleError = (
  error: unknown,
  context: {
    operation?: string;
    userMessage?: string;
    recoveryActions?: Array<{ label: string; action: () => void }>;
    showToast?: boolean;
  } = {}
): void => {
  const {
    operation = 'operation',
    userMessage,
    recoveryActions = [],
    showToast = true,
  } = context;

  let title = 'Error';
  let description = 'An unexpected error occurred';

  if (error instanceof ApiError) {
    title = 'API Error';
    description = userMessage || `Failed to ${operation}: ${error.message}`;
    
    // Add specific handling for common API errors
    if (error.statusCode === 400) {
      description = userMessage || 'Invalid request. Please check your input and try again.';
    } else if (error.statusCode === 401) {
      description = userMessage || 'Authentication required. Please log in and try again.';
    } else if (error.statusCode === 403) {
      description = userMessage || 'Access denied. You do not have permission for this action.';
    } else if (error.statusCode === 404) {
      description = userMessage || 'Resource not found. The requested item may have been removed.';
    } else if (error.statusCode === 429) {
      description = userMessage || 'Too many requests. Please wait a moment and try again.';
    } else if (error.statusCode && error.statusCode >= 500) {
      description = userMessage || 'Server error. Please try again later.';
    }
  } else if (error instanceof NetworkError) {
    title = 'Connection Error';
    description = userMessage || 'Unable to connect to the server. Please check your internet connection.';
  } else if (error instanceof ValidationError) {
    title = 'Validation Error';
    description = userMessage || 'Please correct the highlighted fields and try again.';
    
    if (showToast) {
      showValidationErrors(error.errors);
      return; // Don't show additional toast
    }
  } else if (error instanceof Error) {
    description = userMessage || error.message;
  }

  if (showToast) {
    showError(title, description);
  }

  // Log error with context for debugging
  console.error(`[${operation}] Error:`, error, { context });
};

/**
 * Wraps an async operation with error handling and loading states
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    operation?: string;
    loadingManager?: LoadingStateManager;
    userMessage?: string;
    retryAttempts?: number;
    showProgress?: boolean;
  } = {}
) => {
  return async (...args: T): Promise<R | undefined> => {
    const {
      operation = 'operation',
      loadingManager,
      userMessage,
      retryAttempts = 0,
      showProgress = false,
    } = options;

    try {
      if (loadingManager) {
        loadingManager.startLoading(operation);
      }

      if (showProgress && loadingManager) {
        loadingManager.updateProgress(25, `Starting ${operation}...`);
      }

      let result: R;
      
      if (retryAttempts > 0) {
        result = await retry(() => fn(...args), retryAttempts + 1);
      } else {
        result = await fn(...args);
      }

      if (showProgress && loadingManager) {
        loadingManager.updateProgress(100, `${operation} completed`);
      }

      if (loadingManager) {
        loadingManager.complete();
      }

      return result;
    } catch (error) {
      if (loadingManager) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loadingManager.setError(errorMessage);
      }

      handleError(error, {
        operation,
        userMessage,
        showToast: true,
      });

      return undefined;
    }
  };
};

/**
 * Validates and sanitizes JSON metadata with error handling
 */
export const safeParseJSONMetadata = (
  metadata: unknown
): { success: boolean; data?: Record<string, unknown>; error?: string } => {
  try {
    // Handle null/undefined
    if (metadata === null || metadata === undefined) {
      return {
        success: false,
        error: 'No metadata provided',
      };
    }

    // Handle string JSON
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid JSON format',
        };
      }
    }

    // Validate structure
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        success: false,
        error: 'Metadata must be an object',
      };
    }

    // Sanitize and validate
    const sanitized: Record<string, unknown> = {};
    const metadataObj = metadata as Record<string, unknown>;

    for (const [key, value] of Object.entries(metadataObj)) {
      // Skip invalid keys
      if (typeof key !== 'string' || key.trim().length === 0) {
        continue;
      }

      // Sanitize key
      const sanitizedKey = key.trim().slice(0, 100); // Limit key length

      // Handle different value types
      if (value === null || value === undefined) {
        sanitized[sanitizedKey] = null;
      } else if (typeof value === 'string') {
        // Sanitize string values
        sanitized[sanitizedKey] = value.slice(0, 1000); // Limit string length
      } else if (typeof value === 'number' && !isNaN(value)) {
        sanitized[sanitizedKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        // Handle arrays (limit size and sanitize elements)
        sanitized[sanitizedKey] = value.slice(0, 100).map(item => {
          if (typeof item === 'string') {
            return item.slice(0, 500);
          } else if (typeof item === 'number' && !isNaN(item)) {
            return item;
          } else if (typeof item === 'boolean') {
            return item;
          }
          return null;
        });
      } else if (typeof value === 'object') {
        // Recursively handle nested objects
        const nestedResult = safeParseJSONMetadata(value);
        if (nestedResult.success && nestedResult.data) {
          sanitized[sanitizedKey] = nestedResult.data;
        }
      }
    }

    return {
      success: true,
      data: sanitized,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
