import { Action, TextIntent } from './types';

const SET_VERBS = ['set', 'changed', 'update', 'modified', 'filled'];
const TOGGLE_VERBS = ['toggle', 'enabled', 'disabled', 'checked', 'unchecked'];
const RESET_VERBS = ['reset', 'clear', 'empty'];
const ADD_VERBS = ['add', 'append', 'push', 'insert'];
const REMOVE_VERBS = ['remove', 'delete', 'pop', 'drop'];

export class TextDecoder {
  private static readonly FIELD_PATTERN = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
  private static readonly VALUE_PATTERN = /to\s+["']?([^"']+)["']?/i;
  private static readonly INDEX_PATTERN = /\[(\d+)\]/;

  static decode(text: string): Action | null {
    const normalized = text.toLowerCase().trim();
    
    if (this.matches(normalized, RESET_VERBS)) {
      return { type: 'RESET', payload: {} };
    }

    if (this.matches(normalized, SET_VERBS)) {
      return this.parseSetAction(text, normalized);
    }

    if (this.matches(normalized, TOGGLE_VERBS)) {
      return this.parseToggleAction(text, normalized);
    }

    if (this.matches(normalized, ADD_VERBS)) {
      return this.parseArrayAction(text, normalized, 'push');
    }

    if (this.matches(normalized, REMOVE_VERBS)) {
      if (normalized.includes('last') || normalized.includes('end')) {
        return this.parseArrayAction(text, normalized, 'pop');
      }
      return this.parseArrayAction(text, normalized, 'remove');
    }

    return null;
  }

  static decodeToIntents(text: string): TextIntent[] {
    const intents: TextIntent[] = [];
    const sentences = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);

    for (const sentence of sentences) {
      const intent = this.parseIntent(sentence);
      if (intent) {
        intents.push(intent);
      }
    }

    return intents;
  }

  static extractFieldPath(text: string): string | null {
    const normalized = text.toLowerCase();
    const match = normalized.match(/([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)/);
    return match ? match[1] : null;
  }

  static extractValue(text: string): any {
    const valueMatch = text.match(/(?:to|as|value\s+is)\s+["']?([^"'\s,;.]+)["']?/i);
    if (!valueMatch) return undefined;

    let value = valueMatch[1];
    
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === 'undefined') return null;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    return value;
  }

  static extractArrayIndex(text: string): number | null {
    const match = text.match(/\[(\d+)\]|at\s+(?:position\s+)?(\d+)/i);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }
    return null;
  }

  private static parseIntent(text: string): TextIntent | null {
    const normalized = text.toLowerCase();
    let verb: string = '';
    let target = this.extractFieldPath(text);
    
    if (!target) {
      return null;
    }

    if (this.matches(normalized, SET_VERBS)) {
      verb = 'set';
    } else if (this.matches(normalized, RESET_VERBS)) {
      verb = 'reset';
    } else if (this.matches(normalized, TOGGLE_VERBS)) {
      verb = 'toggle';
    } else if (this.matches(normalized, ADD_VERBS)) {
      verb = 'add';
    } else if (this.matches(normalized, REMOVE_VERBS)) {
      verb = 'remove';
    } else {
      return null;
    }

    return {
      verb,
      target,
      value: this.extractValue(text),
      conditions: this.extractArrayIndex(text) !== null 
        ? { index: this.extractArrayIndex(text) }
        : undefined,
    };
  }

  private static parseSetAction(text: string, normalized: string): Action {
    const path = this.extractFieldPath(normalized);
    const value = this.extractValue(text);

    return {
      type: 'SET_FIELD',
      payload: {
        path: path || '',
        value,
      },
    };
  }

  private static parseToggleAction(text: string, normalized: string): Action {
    const path = this.extractFieldPath(normalized);
    const normalizedValue = normalized.toLowerCase();
    const isEnable = normalizedValue.includes('enable') || 
                     normalizedValue.includes('check') ||
                     normalizedValue.includes('true');

    return {
      type: 'SET_FIELD',
      payload: {
        path: path || '',
        value: isEnable,
      },
    };
  }

  private static parseArrayAction(text: string, normalized: string, action: string): Action {
    const path = this.extractFieldPath(normalized);
    const index = this.extractArrayIndex(text);
    const value = action === 'push' ? this.extractValue(text) : undefined;

    return {
      type: action === 'push' ? 'ARRAY_PUSH' : action === 'pop' ? 'ARRAY_POP' : 'ARRAY_REMOVE',
      payload: {
        path: path || '',
        index,
        value,
      },
    };
  }

  private static matches(text: string, verbs: string[]): boolean {
    return verbs.some(verb => text.startsWith(verb) || text.includes(` ${verb} `));
  }
}
