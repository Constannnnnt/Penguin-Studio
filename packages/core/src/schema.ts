export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface BaseFieldSchema {
  type: FieldType;
  label?: string;
  description?: string;
  /**
   * UI widget hint. Maps to a component in the registry.
   */
  widget?: string;
  /**
   * Default value for the field
   */
  default?: any;
  /**
   * Whether the field is read-only
   */
  readOnly?: boolean;
  /**
   * Whether the field is hidden
   */
  hidden?: boolean;
}

export interface StringFieldSchema extends BaseFieldSchema {
  type: 'string';
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberFieldSchema extends BaseFieldSchema {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface BooleanFieldSchema extends BaseFieldSchema {
  type: 'boolean';
}

export interface ObjectFieldSchema extends BaseFieldSchema {
  type: 'object';
  properties: Record<string, FieldSchema>;
  required?: string[];
}

export interface ArrayFieldSchema extends BaseFieldSchema {
  type: 'array';
  items: FieldSchema;
  minItems?: number;
  maxItems?: number;
}

export type FieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | ObjectFieldSchema
  | ArrayFieldSchema;

export interface EditorSchema {
  [key: string]: FieldSchema;
}
