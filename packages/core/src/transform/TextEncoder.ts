import { Interaction, EncodedDescription, InteractionType } from './types';
import { FieldSchema, EditorSchema } from '../schema';
import get from 'lodash/get';

export class TextEncoder {
  static encodeInteraction(interaction: Interaction): string {
    const { type, path, value, previousValue } = interaction;
    const fieldName = this.formatFieldName(path);

    switch (type) {
      case 'change':
        if (previousValue === undefined) {
          return `Set ${fieldName} to ${this.formatValue(value)}`;
        }
        return `Changed ${fieldName} from ${this.formatValue(previousValue)} to ${this.formatValue(value)}`;
      
      case 'focus':
        return `Focused on ${fieldName}`;
      
      case 'blur':
        return `Left ${fieldName}`;
      
      case 'submit':
        return 'Submitted form';
      
      case 'reset':
        return 'Reset form to initial values';
      
      case 'array_push':
        return `Added item to ${fieldName}`;
      
      case 'array_pop':
        return `Removed last item from ${fieldName}`;
      
      case 'array_insert':
        return `Inserted item at ${fieldName}[${interaction.metadata?.index}]`;
      
      case 'array_remove':
        return `Removed item at ${fieldName}[${interaction.metadata?.index}]`;
      
      default:
        return `Interaction on ${fieldName}: ${type}`;
    }
  }

  static encodeInteractions(interactions: Interaction[]): string {
    if (interactions.length === 0) return '';
    
    if (interactions.length === 1) {
      return this.encodeInteraction(interactions[0]);
    }

    const descriptions = interactions.map(i => this.encodeInteraction(i));
    const last = descriptions.pop();
    return descriptions.join(', ') + ', and ' + last;
  }

  static encodeState(data: any, schema: EditorSchema): string {
    const lines: string[] = [];
    
    for (const [key, fieldSchema] of Object.entries(schema)) {
      const value = get(data, key);
      const label = fieldSchema.label || this.formatFieldName(key);
      
      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        lines.push(`${label}:`);
        lines.push(...this.encodeObjectState(data, fieldSchema.properties, key));
      } else if (fieldSchema.type === 'array') {
        const items = Array.isArray(value) ? value.length : 0;
        lines.push(`${label}: ${items} items`);
      } else {
        lines.push(`${label}: ${this.formatValue(value)}`);
      }
    }
    
    return lines.join('\n');
  }

  private static encodeObjectState(data: any, properties: Record<string, FieldSchema>, prefix: string): string[] {
    const lines: string[] = [];
    
    for (const [key, fieldSchema] of Object.entries(properties)) {
      const path = `${prefix}.${key}`;
      const value = get(data, path);
      const label = fieldSchema.label || this.formatFieldName(key);
      
      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        lines.push(`${label}:`);
        lines.push(...this.encodeObjectState(data, fieldSchema.properties, path));
      } else if (fieldSchema.type === 'array') {
        const items = Array.isArray(value) ? value.length : 0;
        lines.push(`  ${label}: ${items} items`);
      } else {
        lines.push(`  ${label}: ${this.formatValue(value)}`);
      }
    }
    
    return lines;
  }

  static createInteraction(
    type: InteractionType,
    path: string,
    value?: any,
    previousValue?: any,
    metadata?: Record<string, any>
  ): Interaction {
    return {
      type,
      path,
      value,
      previousValue,
      timestamp: Date.now(),
      metadata,
    };
  }

  static describeDelta(before: any, after: any, path: string = ''): string {
    if (before === after) return '';
    
    const fieldName = this.formatFieldName(path);
    
    if (typeof before === 'object' && typeof after === 'object') {
      return `Updated ${fieldName}`;
    }
    
    return `Changed ${fieldName} from ${this.formatValue(before)} to ${this.formatValue(after)}`;
  }

  private static formatFieldName(path: string): string {
    const parts = path.split('.');
    const last = parts[parts.length - 1];
    return last
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  private static formatValue(value: any): string {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'boolean') return value ? 'enabled' : 'disabled';
    if (typeof value === 'string') return `"${value}"`;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }
}
