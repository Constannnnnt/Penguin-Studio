export type SegmentationErrorCode =
  | 'NETWORK_ERROR'
  | 'INVALID_IMAGE'
  | 'BACKEND_ERROR'
  | 'TIMEOUT'
  | 'INVALID_METADATA'
  | 'FILE_TOO_LARGE'
  | 'UNKNOWN_ERROR';

export class SegmentationError extends Error {
  code: SegmentationErrorCode;
  details?: unknown;
  
  constructor(
    message: string,
    code: SegmentationErrorCode,
    details?: unknown
  ) {
    super(message);
    this.name = 'SegmentationError';
    this.code = code;
    this.details = details;
  }
}

export const handleSegmentationError = (error: unknown): { message: string; code: SegmentationErrorCode } => {
  if (error instanceof SegmentationError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Unable to connect to segmentation service',
      code: 'NETWORK_ERROR',
    };
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network')) {
      return {
        message: error.message,
        code: 'NETWORK_ERROR',
      };
    }
    
    if (error.message.toLowerCase().includes('timeout')) {
      return {
        message: error.message,
        code: 'TIMEOUT',
      };
    }
    
    if (error.message.toLowerCase().includes('invalid image') || 
        error.message.toLowerCase().includes('image format')) {
      return {
        message: error.message,
        code: 'INVALID_IMAGE',
      };
    }
    
    if (error.message.toLowerCase().includes('metadata')) {
      return {
        message: error.message,
        code: 'INVALID_METADATA',
      };
    }
    
    if (error.message.toLowerCase().includes('too large') || 
        error.message.toLowerCase().includes('file size')) {
      return {
        message: error.message,
        code: 'FILE_TOO_LARGE',
      };
    }

    return {
      message: error.message,
      code: 'BACKEND_ERROR',
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};

export const createNetworkError = (message?: string): SegmentationError => {
  return new SegmentationError(
    message || 'Network connection failed',
    'NETWORK_ERROR'
  );
};

export const createTimeoutError = (message?: string): SegmentationError => {
  return new SegmentationError(
    message || 'Request timed out',
    'TIMEOUT'
  );
};

export const createInvalidImageError = (message?: string): SegmentationError => {
  return new SegmentationError(
    message || 'Invalid image format',
    'INVALID_IMAGE'
  );
};

export const createBackendError = (message?: string, details?: unknown): SegmentationError => {
  return new SegmentationError(
    message || 'Backend processing failed',
    'BACKEND_ERROR',
    details
  );
};
