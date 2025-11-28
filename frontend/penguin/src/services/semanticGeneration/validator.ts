import type {
  SemanticJSON,
  ValidationResult,
  ValidationError as ValidationErrorType,
} from './types';
import { ValidationError } from './types';
import {
  semanticJSONSchema,
  objectDescriptionSchema,
  lightingDescriptionSchema,
  aestheticsDescriptionSchema,
  photographicDescriptionSchema,
  textRenderSchema,
  type FieldSchema,
  type SchemaDefinition,
} from './schema';

// ============================================================================
// Schema Validator
// ============================================================================

/**
 * Validates a value against a field schema
 */
function validateField(
  fieldName: string,
  value: unknown,
  schema: FieldSchema,
  errors: ValidationErrorType[]
): void {
  // Check if field is required
  if (schema.required && (value === null || value === undefined)) {
    errors.push(
      new ValidationError(fieldName, schema.type, value)
    );
    return;
  }

  // If field is optional and not provided, skip validation
  if (!schema.required && (value === null || value === undefined)) {
    return;
  }

  // Validate type
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== schema.type) {
    errors.push(
      new ValidationError(fieldName, schema.type, value)
    );
    return;
  }

  // Type-specific validations
  if (schema.type === 'string' && typeof value === 'string') {
    validateStringField(fieldName, value, schema, errors);
  } else if (schema.type === 'number' && typeof value === 'number') {
    validateNumberField(fieldName, value, schema, errors);
  } else if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    validateObjectField(fieldName, value as Record<string, unknown>, schema, errors);
  } else if (schema.type === 'array' && Array.isArray(value)) {
    validateArrayField(fieldName, value, schema, errors);
  }
}

/**
 * Validates a string field
 */
function validateStringField(
  fieldName: string,
  value: string,
  schema: FieldSchema,
  errors: ValidationErrorType[]
): void {
  // Check minimum length
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(
      new ValidationError(
        fieldName,
        `string with minimum length ${schema.minLength}`,
        value
      )
    );
  }

  // Check maximum length
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push(
      new ValidationError(
        fieldName,
        `string with maximum length ${schema.maxLength}`,
        value
      )
    );
  }

  // Check pattern
  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(
      new ValidationError(
        fieldName,
        `string matching pattern ${schema.pattern}`,
        value
      )
    );
  }
}

/**
 * Validates a number field
 */
function validateNumberField(
  fieldName: string,
  value: number,
  schema: FieldSchema,
  errors: ValidationErrorType[]
): void {
  // Check minimum value
  if (schema.min !== undefined && value < schema.min) {
    errors.push(
      new ValidationError(
        fieldName,
        `number >= ${schema.min}`,
        value
      )
    );
  }

  // Check maximum value
  if (schema.max !== undefined && value > schema.max) {
    errors.push(
      new ValidationError(
        fieldName,
        `number <= ${schema.max}`,
        value
      )
    );
  }
}

/**
 * Validates an object field
 */
function validateObjectField(
  fieldName: string,
  value: Record<string, unknown>,
  schema: FieldSchema,
  errors: ValidationErrorType[]
): void {
  if (!schema.properties) {
    return;
  }

  // Validate each property in the schema
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const propValue = value[propName];
    const fullFieldName = `${fieldName}.${propName}`;
    validateField(fullFieldName, propValue, propSchema, errors);
  }
}

/**
 * Validates an array field
 */
function validateArrayField(
  fieldName: string,
  value: unknown[],
  schema: FieldSchema,
  errors: ValidationErrorType[]
): void {
  if (!schema.items) {
    return;
  }

  // Validate each item in the array
  value.forEach((item, index) => {
    const itemFieldName = `${fieldName}[${index}]`;
    validateField(itemFieldName, item, schema.items!, errors);
  });
}

/**
 * Validates a semantic JSON object against the schema
 * Collects all validation errors before returning
 */
export function validateSemanticJSON(json: SemanticJSON): ValidationResult {
  const errors: ValidationErrorType[] = [];

  // Validate each top-level field
  for (const [fieldName, fieldSchema] of Object.entries(semanticJSONSchema)) {
    const value = (json as Record<string, unknown>)[fieldName];
    validateField(fieldName, value, fieldSchema, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a partial semantic JSON object (for incremental validation)
 */
export function validatePartialSemanticJSON(
  json: Partial<SemanticJSON>
): ValidationResult {
  const errors: ValidationErrorType[] = [];

  // Only validate fields that are present
  for (const [fieldName, value] of Object.entries(json)) {
    const fieldSchema = semanticJSONSchema[fieldName];
    if (fieldSchema) {
      validateField(fieldName, value, fieldSchema, errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Field-Specific Validators
// ============================================================================

/**
 * Validates short description field
 */
export function validateShortDescription(description: string): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.short_description;
  
  validateField('short_description', description, schema, errors);
  
  // Additional validation: check sentence count (2-4 sentences)
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2 || sentences.length > 4) {
    errors.push(
      new ValidationError(
        'short_description',
        '2-4 sentences',
        `${sentences.length} sentences`
      )
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates objects array
 */
export function validateObjects(objects: unknown[]): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.objects;
  
  validateField('objects', objects, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates background setting field
 */
export function validateBackgroundSetting(background: string): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.background_setting;
  
  validateField('background_setting', background, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates lighting object
 */
export function validateLighting(lighting: unknown): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.lighting;
  
  validateField('lighting', lighting, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates aesthetics object
 */
export function validateAesthetics(aesthetics: unknown): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.aesthetics;
  
  validateField('aesthetics', aesthetics, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates photographic characteristics object
 */
export function validatePhotographicCharacteristics(photo: unknown): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.photographic_characteristics;
  
  validateField('photographic_characteristics', photo, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates style medium field
 */
export function validateStyleMedium(styleMedium: string): ValidationResult {
  const errors: ValidationErrorType[] = [];
  const schema = semanticJSONSchema.style_medium;
  
  validateField('style_medium', styleMedium, schema, errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates context field (optional)
 */
export function validateContext(context: string | undefined): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  if (context !== undefined) {
    const schema = semanticJSONSchema.context;
    validateField('context', context, schema, errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates artistic style field (optional)
 */
export function validateArtisticStyle(artisticStyle: string | undefined): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  if (artisticStyle !== undefined) {
    const schema = semanticJSONSchema.artistic_style;
    validateField('artistic_style', artisticStyle, schema, errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates text render array (optional)
 */
export function validateTextRender(textRender: unknown[] | undefined): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  if (textRender !== undefined) {
    const schema = semanticJSONSchema.text_render;
    validateField('text_render', textRender, schema, errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates required fields are present
 */
export function validateRequiredFields(json: Partial<SemanticJSON>): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  const requiredFields = Object.entries(semanticJSONSchema)
    .filter(([_, schema]) => schema.required)
    .map(([fieldName, _]) => fieldName);
  
  for (const fieldName of requiredFields) {
    const value = (json as Record<string, unknown>)[fieldName];
    if (value === null || value === undefined) {
      errors.push(
        new ValidationError(
          fieldName,
          semanticJSONSchema[fieldName].type,
          value
        )
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates field types match expected types
 */
export function validateFieldTypes(json: Partial<SemanticJSON>): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  for (const [fieldName, value] of Object.entries(json)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    const schema = semanticJSONSchema[fieldName];
    if (!schema) {
      continue;
    }
    
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(
        new ValidationError(fieldName, schema.type, value)
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates value ranges for numeric and string fields
 */
export function validateValueRanges(json: Partial<SemanticJSON>): ValidationResult {
  const errors: ValidationErrorType[] = [];
  
  for (const [fieldName, value] of Object.entries(json)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    const schema = semanticJSONSchema[fieldName];
    if (!schema) {
      continue;
    }
    
    // Validate string length ranges
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(
          new ValidationError(
            fieldName,
            `string with minimum length ${schema.minLength}`,
            value
          )
        );
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(
          new ValidationError(
            fieldName,
            `string with maximum length ${schema.maxLength}`,
            value
          )
        );
      }
    }
    
    // Validate numeric ranges
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(
          new ValidationError(
            fieldName,
            `number >= ${schema.min}`,
            value
          )
        );
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(
          new ValidationError(
            fieldName,
            `number <= ${schema.max}`,
            value
          )
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
