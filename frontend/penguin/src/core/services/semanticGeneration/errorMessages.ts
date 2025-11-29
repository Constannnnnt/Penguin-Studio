import type {
  ValidationError,
  MissingFieldError,
  ConversionError,
  SemanticGenerationError,
} from './types';

// ============================================================================
// Error Message Generator
// ============================================================================

/**
 * Generates a user-friendly error message from a ValidationError
 */
export function generateValidationErrorMessage(error: ValidationError): string {
  const { field, expectedType, actualValue } = error;
  
  const actualType = actualValue === null ? 'null' :
                     actualValue === undefined ? 'undefined' :
                     Array.isArray(actualValue) ? 'array' :
                     typeof actualValue;
  
  let message = `Field "${field}" validation failed:\n`;
  message += `  Expected: ${expectedType}\n`;
  message += `  Actual type: ${actualType}\n`;
  
  // Include actual value if it's not too long
  if (typeof actualValue === 'string' && actualValue.length <= 100) {
    message += `  Actual value: "${actualValue}"\n`;
  } else if (typeof actualValue === 'number' || typeof actualValue === 'boolean') {
    message += `  Actual value: ${actualValue}\n`;
  } else if (actualValue === null || actualValue === undefined) {
    message += `  Actual value: ${actualValue}\n`;
  }
  
  return message;
}

/**
 * Generates a user-friendly error message from a MissingFieldError
 */
export function generateMissingFieldErrorMessage(error: MissingFieldError): string {
  const { field, canProvideDefault } = error;
  
  let message = `Required field "${field}" is missing.\n`;
  
  if (canProvideDefault) {
    message += `  A default value will be provided.\n`;
  } else {
    message += `  This field must be provided by the user.\n`;
  }
  
  return message;
}

/**
 * Generates a user-friendly error message from a ConversionError
 */
export function generateConversionErrorMessage(error: ConversionError): string {
  const { field, value, reason } = error;
  
  let message = `Failed to convert field "${field}":\n`;
  message += `  Reason: ${reason}\n`;
  
  // Include value if it's not too long
  if (typeof value === 'string' && value.length <= 100) {
    message += `  Value: "${value}"\n`;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    message += `  Value: ${value}\n`;
  } else if (value === null || value === undefined) {
    message += `  Value: ${value}\n`;
  }
  
  return message;
}

/**
 * Generates a user-friendly error message from any SemanticGenerationError
 */
export function generateErrorMessage(error: SemanticGenerationError): string {
  if (error.name === 'ValidationError') {
    return generateValidationErrorMessage(error as ValidationError);
  } else if (error.name === 'MissingFieldError') {
    return generateMissingFieldErrorMessage(error as MissingFieldError);
  } else if (error.name === 'ConversionError') {
    return generateConversionErrorMessage(error as ConversionError);
  } else {
    return `Error: ${error.message}\n  Code: ${error.code}\n`;
  }
}

/**
 * Generates a summary error message from multiple errors
 */
export function generateErrorSummary(errors: SemanticGenerationError[]): string {
  if (errors.length === 0) {
    return 'No errors found.';
  }
  
  let summary = `Found ${errors.length} validation error${errors.length > 1 ? 's' : ''}:\n\n`;
  
  errors.forEach((error, index) => {
    summary += `${index + 1}. ${generateErrorMessage(error)}\n`;
  });
  
  return summary;
}

/**
 * Generates a specific error message with field name, expected type/value, and actual value
 */
export function generateSpecificErrorMessage(
  fieldName: string,
  expectedType: string,
  actualValue: unknown,
  additionalInfo?: string
): string {
  const actualType = actualValue === null ? 'null' :
                     actualValue === undefined ? 'undefined' :
                     Array.isArray(actualValue) ? 'array' :
                     typeof actualValue;
  
  let message = `Validation error in field "${fieldName}":\n`;
  message += `  Expected: ${expectedType}\n`;
  message += `  Actual type: ${actualType}\n`;
  
  // Include actual value if appropriate
  if (typeof actualValue === 'string') {
    const truncated = actualValue.length > 100 ? 
                     `${actualValue.substring(0, 100)}...` : 
                     actualValue;
    message += `  Actual value: "${truncated}"\n`;
  } else if (typeof actualValue === 'number' || typeof actualValue === 'boolean') {
    message += `  Actual value: ${actualValue}\n`;
  } else if (actualValue === null || actualValue === undefined) {
    message += `  Actual value: ${actualValue}\n`;
  } else if (Array.isArray(actualValue)) {
    message += `  Array length: ${actualValue.length}\n`;
  } else if (typeof actualValue === 'object') {
    message += `  Object keys: ${Object.keys(actualValue).join(', ')}\n`;
  }
  
  if (additionalInfo) {
    message += `  Note: ${additionalInfo}\n`;
  }
  
  return message;
}

/**
 * Generates error messages for missing required fields
 */
export function generateMissingFieldsMessage(missingFields: string[]): string {
  if (missingFields.length === 0) {
    return '';
  }
  
  let message = `Missing required field${missingFields.length > 1 ? 's' : ''}:\n`;
  missingFields.forEach(field => {
    message += `  - ${field}\n`;
  });
  
  return message;
}

/**
 * Generates error messages for invalid field types
 */
export function generateInvalidTypesMessage(
  invalidFields: Array<{ field: string; expected: string; actual: string }>
): string {
  if (invalidFields.length === 0) {
    return '';
  }
  
  let message = `Invalid field type${invalidFields.length > 1 ? 's' : ''}:\n`;
  invalidFields.forEach(({ field, expected, actual }) => {
    message += `  - ${field}: expected ${expected}, got ${actual}\n`;
  });
  
  return message;
}

/**
 * Generates error messages for out-of-range values
 */
export function generateOutOfRangeMessage(
  outOfRangeFields: Array<{ field: string; value: unknown; constraint: string }>
): string {
  if (outOfRangeFields.length === 0) {
    return '';
  }
  
  let message = `Value${outOfRangeFields.length > 1 ? 's' : ''} out of range:\n`;
  outOfRangeFields.forEach(({ field, value, constraint }) => {
    message += `  - ${field}: ${value} (${constraint})\n`;
  });
  
  return message;
}

/**
 * Formats validation errors into a user-friendly message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Validation passed successfully.';
  }
  
  const grouped: {
    missing: string[];
    invalidTypes: Array<{ field: string; expected: string; actual: string }>;
    outOfRange: Array<{ field: string; value: unknown; constraint: string }>;
    other: ValidationError[];
  } = {
    missing: [],
    invalidTypes: [],
    outOfRange: [],
    other: [],
  };
  
  // Group errors by type
  errors.forEach(error => {
    if (error.actualValue === null || error.actualValue === undefined) {
      grouped.missing.push(error.field);
    } else if (error.expectedType.includes('length') || error.expectedType.includes('>=') || error.expectedType.includes('<=')) {
      grouped.outOfRange.push({
        field: error.field,
        value: error.actualValue,
        constraint: error.expectedType,
      });
    } else {
      const actualType = Array.isArray(error.actualValue) ? 'array' : typeof error.actualValue;
      grouped.invalidTypes.push({
        field: error.field,
        expected: error.expectedType,
        actual: actualType,
      });
    }
  });
  
  let message = 'Validation failed:\n\n';
  
  if (grouped.missing.length > 0) {
    message += generateMissingFieldsMessage(grouped.missing) + '\n';
  }
  
  if (grouped.invalidTypes.length > 0) {
    message += generateInvalidTypesMessage(grouped.invalidTypes) + '\n';
  }
  
  if (grouped.outOfRange.length > 0) {
    message += generateOutOfRangeMessage(grouped.outOfRange) + '\n';
  }
  
  if (grouped.other.length > 0) {
    message += 'Other errors:\n';
    grouped.other.forEach(error => {
      message += `  - ${error.message}\n`;
    });
  }
  
  return message.trim();
}
